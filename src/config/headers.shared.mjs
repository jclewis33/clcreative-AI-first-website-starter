// @ts-check
/**
 * Security headers — the ONE list. src/middleware.ts sets them on every
 * SSR response, and public/_headers repeats them for prerendered pages and
 * assets, which the assets binding serves without running the Worker.
 * _headers is plain text, so `npm run check:config` (and every build)
 * fails when it drifts from this list.
 *
 * The CSP's frame-ancestors come from the CMS seam
 * (src/config/cms.shared.mjs): only the origins a content source names may
 * frame the site's pages, and with none, only the site itself.
 */
import { FRAME_ANCESTORS } from "./cms.shared.mjs";

/** @type {Readonly<Record<string, string>>} */
export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  // CSP frame-ancestors (not X-Frame-Options): it can name the origins allowed.
  "Content-Security-Policy": `frame-ancestors ${
    FRAME_ANCESTORS.length > 0 ? FRAME_ANCESTORS.join(" ") : "'self'"
  }`,
};
