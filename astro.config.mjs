// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";
import sanity from "@sanity/astro";
import { createClient } from "@sanity/client";
import react from "@astrojs/react";
import cloudflare from "@astrojs/cloudflare";
import { loadEnv } from "vite";
import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  SANITY_PROJECT_ID,
  SANITY_DATASET,
  SANITY_API_VERSION,
  SITE_URL,
} from "./src/config/site.shared.mjs";

const env = loadEnv(process.env.NODE_ENV ?? "", process.cwd(), "");
// Fallbacks come from the shared leaf module (src/config/site.shared.mjs) —
// CI (Cloudflare Workers Builds) has no root .env, so env-only lookup silently
// bakes empty strings into the sanity:client module. The shared module is the
// single source for these values (site.ts imports it too); no hand-syncing.
const PUBLIC_SANITY_PROJECT_ID =
  env.PUBLIC_SANITY_PROJECT_ID || SANITY_PROJECT_ID;
const PUBLIC_SANITY_DATASET = env.PUBLIC_SANITY_DATASET || SANITY_DATASET;

/**
 * Fetch every Sanity slug at build time and return fully-qualified URLs for
 * `@astrojs/sitemap`'s `customPages` option. Without this, SSR routes
 * (`/blog/[slug]`, `/case-studies/[slug]`, `/glossary/[slug]`) are invisible
 * to the sitemap crawler because Astro only enumerates prerendered paths.
 *
 * `blog/category/[category]` is driven off the `categories[]` array on every
 * blogPost, so we also enumerate unique categories and emit
 * `/blog/category/<slug>` entries.
 */
async function getSanityUrls() {
  const client = createClient({
    projectId: PUBLIC_SANITY_PROJECT_ID,
    dataset: PUBLIC_SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    useCdn: true,
  });

  try {
    const [posts, caseStudies, glossary, categories] = await Promise.all([
      client.fetch(
        `*[_type == "blogPost" && defined(slug.current)]{ "slug": slug.current }`,
      ),
      client.fetch(
        `*[_type == "caseStudy" && defined(slug.current) && comingSoon != true]{ "slug": slug.current }`,
      ),
      client.fetch(
        `*[_type == "glossaryTerm" && defined(slug.current)]{ "slug": slug.current }`,
      ),
      client.fetch(
        `array::unique(*[_type == "blogPost" && defined(categories)].categories[])`,
      ),
    ]);

    const categorySlugs = [
      "all",
      .../** @type {string[]} */ (categories ?? []).map((c) =>
        String(c).toLowerCase().replace(/\s+/g, "-"),
      ),
    ];

    return [
      .../** @type {{ slug: string }[]} */ (posts).map(
        (p) => `${SITE_URL}/blog/${p.slug}`,
      ),
      .../** @type {{ slug: string }[]} */ (caseStudies).map(
        (c) => `${SITE_URL}/case-studies/${c.slug}`,
      ),
      .../** @type {{ slug: string }[]} */ (glossary).map(
        (g) => `${SITE_URL}/glossary/${g.slug}`,
      ),
      ...categorySlugs.map((s) => `${SITE_URL}/blog/category/${s}`),
    ];
  } catch (err) {
    // A fresh fork (before `/setup` provisions Sanity) or a network-restricted
    // build environment can't reach the dataset. Don't hard-fail the build —
    // the sitemap just omits dynamic CMS URLs until Sanity is reachable.
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[astro.config] Skipping Sanity sitemap URLs — could not reach the dataset: ${message}`,
    );
    return [];
  }
}

const sanityCustomPages = await getSanityUrls();

/**
 * Dev-only pages — visible on `astro dev` so they can be referenced while
 * building, but stripped from production builds so they never ship and never
 * appear in the sitemap. The `excludeDevOnlyPages` integration deletes the
 * built directories from `dist/client` after build completes.
 */
const DEV_ONLY_PATHS = ["/style-guide", "/components"];

/**
 * Pages that should ship to production but stay out of `sitemap-index.xml`
 * (also disallowed in robots.txt). Form confirmation pages, etc.
 */
const SITEMAP_EXCLUDE_PATHS = [...DEV_ONLY_PATHS, "/thank-you"];

function excludeDevOnlyPages() {
  return {
    name: "exclude-dev-only-pages",
    hooks: {
      /** @param {{ dir: URL, logger: { info: (msg: string) => void } }} ctx */
      "astro:build:done": async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        for (const p of DEV_ONLY_PATHS) {
          await rm(`${root}${p}`, { recursive: true, force: true });
        }
        logger.info(
          `Removed dev-only pages from build: ${DEV_ONLY_PATHS.join(", ")}`,
        );
      },
    },
  };
}

/**
 * 301 redirects from the old Webflow site URL structure to the new Astro
 * routes. Keep this map in sync with anything you rename or remove so existing
 * Google index entries and external backlinks don't 404.
 */
const redirects = {
  // Example one-to-one redirects. Add old → new path pairs here as the site
  // grows so existing index entries and external backlinks don't 404.
  "/portfolio": "/case-studies",
};

// https://astro.build/config
export default defineConfig({
  // Static by default. Individual routes opt into SSR with
  // `export const prerender = false;` in their frontmatter:
  //   - `src/pages/blog/**`, `src/pages/case-studies/**`, `src/pages/glossary/**`
  //     — so the Presentation tool can show drafts via the sanity-preview-mode
  //     cookie (per-request fetch with `drafts` perspective).
  //   - `src/pages/api/draft-mode/*` — cookie set/clear routes (called by the
  //     hosted Studio's Presentation tool to toggle draft mode cross-origin).
  // Every other page (index, about, contact, services, legal, etc.) stays
  // prerendered. New pages default to static automatically.
  output: "static",
  adapter: cloudflare({
    inspectorPort: false,
    prerenderEnvironment: "node",
    // Pre-optimize images at build time with sharp, serve them via a
    // passthrough endpoint at runtime. Without this the adapter defaults to
    // `cloudflare-binding` mode, which requires a paid Cloudflare Images
    // binding for SSR pages — any <Image> on /blog, /case-studies, or
    // /glossary would otherwise fail to render.
    imageService: "compile",
  }),
  redirects,
  integrations: [
    excludeDevOnlyPages(),
    sitemap({
      filter: (page) => !SITEMAP_EXCLUDE_PATHS.some((p) => page.includes(p)),
      customPages: sanityCustomPages,
    }),
    // React must be registered BEFORE Sanity — the visual-editing islands
    // (SanityVisualEditing / DisableDraftMode) are React components that need
    // the React renderer available when draft mode mounts them.
    react(),
    sanity({
      projectId: PUBLIC_SANITY_PROJECT_ID,
      dataset: PUBLIC_SANITY_DATASET,
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
  ],
  // This is the URL of your live site. Astro uses this for generating canonical URLs and your sitemap.
  site: SITE_URL,
  image: {
    /* Valid: "constrained" | "full-width" | "fixed"

    Override on a per image basis.

    EX: Full width hero set: layout="full-width" to override constrained

    DEFINITIONS:
    - constrained: responsive, but capped at the image’s max size. Great for images sitting inside text/content columns.

    - full-width: responsive and stretches to the container width (can grow as wide as the container, even beyond the original pixel size if you let it). Best for hero/banner images.

    - fixed: sticks to a fixed width/height (no responsive resizing).
    */

    layout: "constrained",
    // Adds small global styles so images resize correctly

    responsiveStyles: true,

    // Sharp codec-specific encoder defaults (Astro 6.1+). Applied to every
    // locally processed image at build time. Per-image `quality` props on
    // <Image />, <Picture />, getImage(), and the Visual component still
    // override these defaults.
    service: {
      entrypoint: "astro/assets/services/sharp",
      config: {
        jpeg: { mozjpeg: true, quality: 80 },
        webp: { effort: 6, quality: 80 },
        avif: { effort: 4, quality: 65 },
        png: { compressionLevel: 9 },
      },
    },

    // Allow Sanity CDN images without requiring width/height
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
    ],
  },

  fonts: [
    {
      provider: fontProviders.local(),
      name: "BDO Grotesk",
      cssVariable: "--font-bdo-grotesk",
      options: {
        variants: [
          {
            weight: "100 900",
            style: "normal",
            src: ["./src/assets/fonts/BDOGrotesk-Variable.woff2"],
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: "Inter",
      cssVariable: "--font-inter",
      options: {
        variants: [
          {
            weight: 400,
            style: "normal",
            src: ["./src/assets/fonts/inter-v12-latin-regular.woff2"],
          },
          {
            weight: 500,
            style: "normal",
            src: ["./src/assets/fonts/inter-v12-latin-500.woff2"],
          },
          {
            weight: 700,
            style: "normal",
            src: ["./src/assets/fonts/inter-v12-latin-700.woff2"],
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: "IBM Plex Mono",
      cssVariable: "--font-ibm-plex-mono",
      options: {
        variants: [
          {
            weight: 400,
            style: "normal",
            src: ["./src/assets/fonts/IBMPlexMono-Regular.woff2"],
          },
        ],
      },
    },
  ],

  vite: {
    optimizeDeps: {
      // Astro 6 + @sanity/visual-editing compat workaround:
      // Several transitive deps are CJS modules that Vite doesn't pre-bundle
      // automatically. Without this, the VisualEditing component fails to
      // hydrate. Per the official Sanity + Astro guide.
      // (Production builds use Rollup which handles this; the issue is
      // primarily dev-server, but harmless to include for both.)
      include: [
        "react/compiler-runtime",
        "lodash/isObject.js",
        "lodash/groupBy.js",
        "lodash/keyBy.js",
        "lodash/partition.js",
        "lodash/sortedIndex.js",
      ],
      exclude: ["@sanity/astro"],
    },
  },

  // Optional: If your site is hosted in a subdirectory, specify the base path.
  // base: '/your-subdirectory/',

  // Optional: Control whether URLs have trailing slashes. Options are "always", "never", or "ignore".
  trailingSlash: "never",
});
