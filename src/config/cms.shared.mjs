// @ts-check
/**
 * CMS seam — runtime values, safe for the Worker bundle (no integration
 * imports). Read by src/config/headers.shared.mjs (the CSP) and
 * src/middleware.ts. With content in local files there is no editor to
 * frame the site and no draft session. A CMS add-on's installer
 * overwrites this file wholesale.
 */

/**
 * Origins allowed to frame site pages (CSP `frame-ancestors`). Empty
 * means only the site itself ('self').
 * @type {readonly string[]}
 */
export const FRAME_ANCESTORS = [];

/**
 * The cookie that marks a draft-preview session; middleware never caches
 * a response to a request that carries it. Null: no draft preview.
 * @type {string | null}
 */
export const PREVIEW_COOKIE = null;
