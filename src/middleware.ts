import { defineMiddleware } from "astro:middleware";
import { isNoindexRoute } from "@/config/seo.shared.mjs";
import { PREVIEW_COOKIE } from "@/config/cms.shared.mjs";
import { SECURITY_HEADERS } from "@/config/headers.shared.mjs";
import { SITE } from "@/config/site";
import { SMS_OFF_COPY_SWAPS } from "@/config/sms-consent";
import { checkToolsAuth, isToolsPath } from "@/lib/tools-auth";

// Security headers for every SSR response come from
// src/config/headers.shared.mjs. Static assets bypass the worker entirely
// (no run_worker_first in wrangler.jsonc), so public/_headers repeats the
// same list for the assets binding; `npm run check:config` fails when the
// two drift.

// Runs for every SSR route — with the content routes prerendered, that means
// only /api/* (plus the /preview/* draft-preview tree when the Sanity add-on
// is installed). Prerendered pages are served as static assets by the
// assets binding and get their headers from public/_headers instead; Astro still invokes middleware during the
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

  // A draft-preview session, when the content source has one (the CMS
  // seam's PREVIEW_COOKIE; null for content in files).
  const isDraftMode =
    PREVIEW_COOKIE !== null && context.cookies.has(PREVIEW_COOKIE);
  const isPreviewRoute = context.url.pathname.startsWith("/preview");
  /* Same list the sitemap, robots.txt and the noindex meta read. */
  const isNoindex = isNoindexRoute(context.url.pathname);

  // /preview is never cached — REGARDLESS of whether the draft cookie is
  // present. Cloudflare's edge cache does not vary on cookies: if a
  // cookie-less request ever populated the cache with a published render of
  // /preview/blog/x, that stale non-draft HTML would be served back to an
  // editor who DOES have the cookie — the CMS preview silently shows stale
  // content with nothing in the logs. Forcing
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
