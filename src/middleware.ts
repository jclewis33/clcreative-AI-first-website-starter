import { defineMiddleware } from "astro:middleware";
import { perspectiveCookieName } from "@sanity/preview-url-secret/constants";

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

// Runs for every SSR route (prerendered pages are served as static assets and
// skip middleware at request time, but Astro still invokes middleware during
// the prerender build phase — guard against that to avoid touching cookies).
// Sets Cache-Control so Cloudflare's edge caches public responses while
// editors in draft mode always get fresh content.
export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();

  // At build time `context.cookies` exists but reading it would trigger
  // "Astro.request.headers was used" warnings on prerendered routes. Skip
  // those — Cache-Control has no effect on prerendered static assets anyway.
  if (context.isPrerendered) return response;

  const isDraftMode = context.cookies.has(perspectiveCookieName);

  // Editors inside the Presentation iframe: never cache — draft edits must
  // reflect immediately on the next fetch.
  //
  // Public traffic: cache the rendered HTML at the CF edge for 5 minutes,
  // then serve stale for 24 hours while revalidating in the background.
  // Publish visibility: updates become visible to the public within ~5 min.
  // After that window, the first visitor gets the stale cached version
  // instantly while CF fetches fresh in the background; visitor #2 onwards
  // sees the new content. SWR=24hr keeps the cache "warm" for a full day
  // even with no traffic, so sparse visits never pay cold-cache costs.
  const cacheControl = isDraftMode
    ? "private, no-cache"
    : "public, s-maxage=300, stale-while-revalidate=86400";

  // `wrangler dev` occasionally returns responses with sealed Headers objects,
  // which throws "Can't modify immutable headers" on `.set()`. Production CF
  // Workers don't hit this. Try the direct mutation, fall back to cloning the
  // response when headers are immutable.
  const headersToSet: Record<string, string> = {
    ...SECURITY_HEADERS,
    "Cache-Control": cacheControl,
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
