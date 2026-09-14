/**
 * Which routes must stay out of search results — the single source of truth.
 *
 * Four surfaces need this same fact. Duplicated facts drift — the same
 * reasoning behind scripts/check-config-sync.mjs — so they all read from
 * here instead of carrying their own copy:
 *
 *   - astro.config.mjs  → sitemap `filter`
 *   - src/pages/robots.txt.ts → generated Disallow lines (no static file)
 *   - src/components/global/Head.astro → <meta name="robots">
 *   - src/middleware.ts → X-Robots-Tag header on SSR routes
 *
 * `.mjs` so astro.config.mjs and application code can both import it, the
 * same reason site.shared.mjs is .mjs.
 *
 * TWO matching modes, deliberately. A single loose `includes()` check gets
 * this wrong in both directions: it silently drops real content whose slug
 * contains an excluded word (a post at /blog/components-in-astro matching
 * "/components"), and "fixing" that with exact matching pushes variant pages
 * like /thank-you-call INTO the sitemap while robots.txt still disallows them.
 */

/** Pages that exist only for local development; stripped from the build. */
export const DEV_ONLY_PATHS = ["/style-guide", "/components"];

/**
 * Whole path segments: matches `/x` and `/x/...`, never `/blog/x-something`.
 * `/preview` is the editor-only SSR draft tree.
 */
export const NOINDEX_PATHS = [...DEV_ONLY_PATHS, "/preview"];

/**
 * Literal prefixes, mirroring how a robots.txt `Disallow` behaves: one
 * `/thank-you` entry covers /thank-you, /thank-you-call, /thank-you-worksheet.
 */
export const NOINDEX_PREFIXES = ["/thank-you"];

/**
 * Should this route be kept out of search results?
 *
 * @param {string} pathname A URL pathname, e.g. "/thank-you-call".
 * @returns {boolean}
 */
export function isNoindexRoute(pathname) {
  if (typeof pathname !== "string" || pathname === "") return false;

  // Normalise a trailing slash so "/preview/" matches "/preview".
  const path =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  if (NOINDEX_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;

  return NOINDEX_PATHS.some(
    (segment) => path === segment || path.startsWith(`${segment}/`),
  );
}

/**
 * The `Disallow` lines for robots.txt, derived from the lists above so the
 * file can never fall out of step with the sitemap filter.
 *
 * @returns {string[]}
 */
export function robotsDisallowPaths() {
  return [...new Set([...NOINDEX_PATHS, ...NOINDEX_PREFIXES])].sort();
}
