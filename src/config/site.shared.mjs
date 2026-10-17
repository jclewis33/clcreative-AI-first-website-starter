/**
 * Shared primitive constants — the ONE place the site origin is defined.
 *
 * Why this file exists (and why it's plain `.mjs` with zero imports):
 * `src/config/site.ts` is the canonical site config, but a few files are
 * evaluated OUTSIDE the app's module graph and can't import a `.ts` that
 * pulls in app code — `astro.config.mjs` and the `scripts/*.mjs`. This leaf
 * module has no dependencies, so every one of those contexts CAN import it
 * instead of carrying its own literal copy. `site.ts` imports it too — so
 * there is exactly one source of truth. (A content add-on keeps its own ids
 * the same way, in its own `src/config/<name>.shared.mjs`.)
 *
 * When forking for a new site: `npm run setup` writes SITE_URL here, and it
 * propagates to every config and to `SITE` in site.ts.
 */

/**
 * Absolute site origin, no trailing slash.
 *
 * Env-overridable: set `SITE_URL` in the Cloudflare build environment to target
 * a staging `*.workers.dev` URL before the real domain exists. At launch, change
 * that build var to the production origin (or unset it to use the literal below).
 * The literal is the template default fallback.
 */
export const SITE_URL = process.env.SITE_URL || "https://www.example.com";
