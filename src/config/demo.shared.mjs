/**
 * Demo mode — `null` on every real site.
 *
 * A prospect demo (a `demo/<slug>` branch of the private demos repo, written
 * by `npm run demo`) sets this to describe itself. That one committed value
 * switches on everything a demo needs, wherever it is read:
 *
 *   - the whole site is noindex (src/config/seo.shared.mjs → SITE_NOINDEX)
 *   - its banner ("Built for <prospect> by …") on every page
 *     (src/data/site-structure.ts → resolveBanner)
 *   - nav and footer links in `hiddenPaths` are dropped (same file)
 *   - lead forms always answer success, and tag the lead source with the
 *     prospect's name (src/lib/leads.ts)
 *
 * A committed file, not an env var: `process.env` inside the Worker is read
 * at REQUEST time, where Cloudflare build variables do not exist, so an env
 * flag would disagree between the prerendered pages and the SSR routes. A
 * branch that carries its own DEMO is always a demo, whatever the dashboard
 * says — and promoting a demo to a real site is setting this back to `null`.
 *
 * `.mjs` with no imports so astro.config.mjs, scripts and the Worker can all
 * read it — the same reason site.shared.mjs is .mjs.
 *
 * @typedef {object} DemoConfig
 * @property {string} slug        kebab-case id; matches the `demo/<slug>` branch
 * @property {string} prospect    the business the demo is built for
 * @property {string} preset      the preset it was generated from
 * @property {string[]} hiddenPaths  nav/footer links to drop, e.g. "/blog"
 * @property {string} bannerText  the banner shown on every page
 * @property {string} bannerHref  where the demo banner links
 */

/** @type {DemoConfig | null} */
export const DEMO = null;
