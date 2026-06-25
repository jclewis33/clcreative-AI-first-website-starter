/**
 * Shared primitive constants — the ONE place the Sanity project id/dataset and
 * the site origin are defined.
 *
 * Why this file exists (and why it's plain `.mjs` with zero imports):
 * `src/config/site.ts` is the canonical site config, but a few files are
 * evaluated OUTSIDE the app's module graph and can't import a `.ts` that pulls
 * in app code — `astro.config.mjs`, `sanity.config.ts`, `sanity.cli.ts`, and the
 * `scripts/*.mjs`. They used to each carry a hand-synced literal copy of these
 * values (5 copies that silently drifted). This leaf module has no dependencies,
 * so every one of those contexts CAN import it. `site.ts` imports it too — so
 * there is exactly one source of truth.
 *
 * The only file that still can't import this is `wrangler.jsonc` (it's JSON).
 * `scripts/check-config-sync.mjs` validates that its `vars` match these values.
 *
 * When forking for a new site: edit THIS file (project id/dataset/url) — it
 * propagates to every config and to `SITE` in site.ts.
 */

/** Sanity project id (public — appears in every Sanity API URL). */
export const SANITY_PROJECT_ID = "your-sanity-project-id";

/** Sanity dataset. */
export const SANITY_DATASET = "production";

/** Sanity API version (date-pinned). Keep in sync with Studio/Vision. */
export const SANITY_API_VERSION = "2025-03-15";

/**
 * Absolute site origin, no trailing slash.
 *
 * Env-overridable: set `SITE_URL` in the Cloudflare build environment to target
 * a staging `*.workers.dev` URL before the real domain exists. At launch, change
 * that build var to the production origin (or unset it to use the literal below).
 * The literal is the template default fallback.
 */
export const SITE_URL = process.env.SITE_URL || "https://www.example.com";
