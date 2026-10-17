// @ts-check
/**
 * The Sanity project's shared constants — the ONE place its id, dataset and
 * API version are defined. Plain .mjs with zero imports (like
 * site.shared.mjs), so every context can import it: src/config/cms.mjs
 * (Astro's config), sanity.config.ts, sanity.cli.ts and the scripts.
 *
 * wrangler.jsonc is JSON and can't import, so it carries literal copies of
 * WRANGLER_VARS; `npm run check:config` (and every build) fails when they
 * drift. `npm run setup` writes these values on the Sanity branch.
 */

/** Sanity project id (public — appears in every Sanity API URL). */
export const SANITY_PROJECT_ID = "your-sanity-project-id";

/** Sanity dataset. */
export const SANITY_DATASET = "production";

/** Sanity API version (date-pinned). Keep in sync with Studio/Vision. */
export const SANITY_API_VERSION = "2025-03-15";

/** The public runtime vars wrangler.jsonc must carry, by name. */
export const WRANGLER_VARS = {
  PUBLIC_SANITY_PROJECT_ID: SANITY_PROJECT_ID,
  PUBLIC_SANITY_DATASET: SANITY_DATASET,
};
