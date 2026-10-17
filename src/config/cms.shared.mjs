// @ts-check
/**
 * CMS seam — runtime values, safe for the Worker bundle (no integration
 * imports). Read by src/config/headers.shared.mjs (the CSP) and
 * src/middleware.ts. This is the Sanity add-on's version; the Files
 * version (no editor, no drafts) is empty, and the add-on installer
 * overwrites one with the other.
 */
import { perspectiveCookieName } from "@sanity/preview-url-secret/constants";

/**
 * Origins allowed to frame site pages (CSP `frame-ancestors`).
 *
 * The Studio is hosted by Sanity. Its Presentation tool iframes site pages
 * for draft preview, but in the Core-app/dashboard model the Studio app is
 * sandboxed under *.sanity.studio (nested inside the www.sanity.io shell),
 * so BOTH families must be allowed — *.sanity.io (dashboard) +
 * *.sanity.studio (the sandboxed Studio app, the actual immediate framing
 * origin), plus localhost:3333 for local `sanity dev`. This is Sanity's
 * documented set.
 * @type {readonly string[]}
 */
export const FRAME_ANCESTORS = [
  "https://*.sanity.io",
  "https://*.sanity.studio",
  "http://localhost:3333",
];

/**
 * The cookie that marks a draft-preview session (set by
 * /api/draft-mode/enable). Middleware never caches a response to a request
 * that carries it.
 * @type {string | null}
 */
export const PREVIEW_COOKIE = perspectiveCookieName;
