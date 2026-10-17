// @ts-check
/**
 * CMS seam — build-time config. astro.config.mjs spreads these into its
 * integrations, image and vite settings, and never names a CMS itself.
 * Imported only by astro.config.mjs: integration packages must never reach
 * the Worker bundle (runtime values live in cms.shared.mjs).
 *
 * The Sanity add-on's version, installed over the Files one by
 * `npm run addon:sanity`.
 */
import { loadEnv } from "vite";
import react from "@astrojs/react";
import sanity from "@sanity/astro";
import {
  SANITY_API_VERSION,
  SANITY_DATASET,
  SANITY_PROJECT_ID,
} from "./sanity.shared.mjs";

const env = loadEnv(process.env.NODE_ENV ?? "", process.cwd(), "");
// Fallbacks come from the shared leaf module (src/config/sanity.shared.mjs)
// — CI (Cloudflare Workers Builds) has no root .env, so env-only lookup
// silently bakes empty strings into the sanity:client module.
const projectId = env.PUBLIC_SANITY_PROJECT_ID || SANITY_PROJECT_ID;
const dataset = env.PUBLIC_SANITY_DATASET || SANITY_DATASET;

/** @type {import("astro").AstroIntegration[]} */
export const integrations = [
  // React must be registered BEFORE Sanity — the visual-editing islands
  // (SanityVisualEditing / DisableDraftMode) are React components that need
  // the React renderer available when draft mode mounts them.
  react(),
  sanity({
    projectId,
    dataset,
    useCdn: true,
    apiVersion: SANITY_API_VERSION,
    // No `studioBasePath` — the Studio is hosted by Sanity at
    // <studioHost>.sanity.studio (deployed via `npx sanity deploy`), not
    // embedded in this app. The integration still provides the
    // `sanity:client` virtual module used by src/sanity/lib/load-query.ts.
    stega: {
      // Required for Visual Editing overlays — when stega encoding is on,
      // text fields rendered from Sanity contain hidden source links that
      // the overlay reads to map clicks back to the corresponding Studio
      // field. The studioUrl tells the overlay which Studio to deep-link —
      // the hosted Studio origin (cross-origin from the site).
      studioUrl: "https://your-studio.sanity.studio",
    },
  }),
];

/**
 * Remote image hosts Astro may optimise: Sanity's CDN, without requiring
 * width/height.
 * @type {import("astro").RemotePattern[]}
 */
export const remotePatterns = [
  { protocol: "https", hostname: "cdn.sanity.io" },
];

/**
 * Build-time constants (`vite.define`). Parity fixtures switch
 * (src/sanity/lib/load-query.ts): baked in at build time so a normal build
 * dead-code-eliminates the fixture import and no runtime variable can turn
 * it on. Never set in production.
 * @type {Record<string, string>}
 */
export const viteDefine = {
  __PARITY_FIXTURES__: JSON.stringify(process.env.PARITY_FIXTURES ?? ""),
};

/**
 * Vite dependency pre-bundling. Astro 6 + @sanity/visual-editing compat
 * workaround: several transitive deps are CJS modules that Vite doesn't
 * pre-bundle automatically. Without this, the VisualEditing component fails
 * to hydrate. Per the official Sanity + Astro guide. (Production builds use
 * Rollup, which handles this; the issue is primarily dev-server, but
 * harmless to include for both.)
 * @type {import("vite").DepOptimizationOptions}
 */
export const optimizeDeps = {
  include: [
    "react/compiler-runtime",
    "lodash/isObject.js",
    "lodash/groupBy.js",
    "lodash/keyBy.js",
    "lodash/partition.js",
    "lodash/sortedIndex.js",
  ],
  exclude: ["@sanity/astro"],
};
