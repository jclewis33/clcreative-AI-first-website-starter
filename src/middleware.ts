import { defineMiddleware } from "astro:middleware";
import { isNoindexRoute } from "@/config/seo.shared.mjs";
import { perspectiveCookieName } from "@sanity/preview-url-secret/constants";
import { SITE } from "@/config/site";
import { SMS_OFF_COPY_SWAPS } from "@/config/sms-consent";
import { checkToolsAuth, isToolsPath } from "@/lib/tools-auth";

// Security headers for every SSR response. Static assets bypass the worker
// entirely (no run_worker_first in wrangler.jsonc), so the same set is
// duplicated in public/_headers for the assets binding — keep both in sync.
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  // The Studio is hosted by Sanity. Its Presentation tool iframes site pages
  // for draft preview, but in the Core-app/dashboard model the Studio app is
  // sandboxed under *.sanity.studio (nested inside the www.sanity.io shell), so
  // BOTH families must be allowed — *.sanity.io (dashboard) + *.sanity.studio
  // (the sandboxed Studio app, the actual immediate framing origin), plus
  // localhost:3333 for local `sanity dev`. This is Sanity's documented set.
  // CSP frame-ancestors (not X-Frame-Options) blocks every other origin.
  // Keep in sync with public/_headers.
  "Content-Security-Policy":
    "frame-ancestors https://*.sanity.io https://*.sanity.studio http://localhost:3333",
};

// Runs for every SSR route — with the content routes prerendered, that means
// only /api/* and the /preview/* draft-preview tree (prerendered pages are
// served as static assets by the assets binding and get their headers from
// public/_headers instead; Astro still invokes middleware during the
// prerender build phase — guard against that to avoid touching cookies).
/* While texting is off, swap call-back promises for message wording. */
const swapCopy = !SITE.smsOptIn && SMS_OFF_COPY_SWAPS.length > 0;

export const onRequest = defineMiddleware(async (context, next) => {
  // Client tools (/tools/*) sit behind Cloudflare Access or a shared
  // password (src/lib/tools-auth.ts). Checked before the route runs at all.
  const isTools = !context.isPrerendered && isToolsPath(context.url.pathname);
  if (isTools) {
    const denied = await checkToolsAuth(context.request);
    if (denied) return denied;
  }

  let response = await next();

  // SMS_OFF_COPY_SWAPS (src/config/sms-consent.ts) while SITE.smsOptIn is
  // false. Before the prerender early-return, so it's baked into the static
  // HTML at build time.
  if (swapCopy && response.headers.get("content-type")?.includes("text/html")) {
    const html = SMS_OFF_COPY_SWAPS.reduce(
      (out, [from, to]) => out.replaceAll(from, to),
      await response.text(),
    );
    response = new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }

  // At build time `context.cookies` exists but reading it would trigger
  // "Astro.request.headers was used" warnings on prerendered routes. Skip
  // those — Cache-Control has no effect on prerendered static assets anyway.
  if (context.isPrerendered) return response;

  const isDraftMode = context.cookies.has(perspectiveCookieName);
  const isPreviewRoute = context.url.pathname.startsWith("/preview");
  /* Same list the sitemap, robots.txt and the noindex meta read. */
  const isNoindex = isNoindexRoute(context.url.pathname);

  // /preview is never cached — REGARDLESS of whether the draft cookie is
  // present. Cloudflare's edge cache does not vary on cookies: if a
  // cookie-less request ever populated the cache with a published render of
  // /preview/blog/x, that stale non-draft HTML would be served back to an
  // editor who DOES have the cookie — Presentation silently shows stale
  // content and "preview looks broken" with nothing in the logs. Forcing
  // private,no-cache on the whole tree closes that hole.
  //
  // Other SSR responses (i.e. /api/*): cache for 5 minutes at the edge,
  // serve stale for 24h while revalidating in the background.
  // The client tools are private — never cached anywhere. Form posts carry
  // personal data — never cacheable either.
  const cacheControl = isTools
    ? "private, no-store"
    : isDraftMode || isPreviewRoute
      ? "private, no-cache"
      : context.request.method !== "GET"
        ? "no-store"
        : "public, s-maxage=300, stale-while-revalidate=86400";

  // `wrangler dev` occasionally returns responses with sealed Headers objects,
  // which throws "Can't modify immutable headers" on `.set()`. Production CF
  // Workers don't hit this. Try the direct mutation, fall back to cloning the
  // response when headers are immutable.
  const headersToSet: Record<string, string> = {
    ...SECURITY_HEADERS,
    "Cache-Control": cacheControl,
    // /preview must never be indexed. robots.txt's Disallow only stops
    // crawling — a URL discovered elsewhere (a shared link, a stray mention)
    // can still be indexed without it. noindex closes that gap; the third
    // layer is the sitemap exclusion in astro.config.mjs.
    ...(isNoindex ? { "X-Robots-Tag": "noindex, nofollow" } : {}),
  };
  try {
    for (const [name, value] of Object.entries(headersToSet)) {
      response.headers.set(name, value);
    }
    return response;
  } catch {
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(headersToSet)) {
      headers.set(name, value);
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
});
