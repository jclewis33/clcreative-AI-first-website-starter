// @ts-check
/**
 * CMS seam — build-time config. astro.config.mjs spreads these into its
 * integrations, image and vite settings, and never names a CMS itself.
 * With content in local files (src/content) there is nothing to add.
 *
 * A CMS add-on's installer overwrites this file wholesale (the Sanity
 * add-on: addons/sanity/). Imported only by astro.config.mjs: integration
 * packages must never reach the Worker bundle, so runtime values live in
 * cms.shared.mjs.
 */

/** @type {import("astro").AstroIntegration[]} */
export const integrations = [];

/**
 * Remote image hosts Astro may optimise.
 * @type {import("astro").RemotePattern[]}
 */
export const remotePatterns = [];

/**
 * Build-time constants (`vite.define`).
 * @type {Record<string, string>}
 */
export const viteDefine = {};

/**
 * Vite dependency pre-bundling hints.
 * @type {import("vite").DepOptimizationOptions}
 */
export const optimizeDeps = {};
