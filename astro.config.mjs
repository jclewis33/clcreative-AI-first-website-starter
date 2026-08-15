// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";
import sanity from "@sanity/astro";
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
 * NOTE: the sitemap deliberately has NO `customPages` option and no
 * `getSanityUrls()`-style helper. A customPages list is only ever needed for
 * SSR routes (which are invisible to `@astrojs/sitemap`), and every content
 * route here is PRERENDERED via `getStaticPaths` (see
 * src/sanity/lib/page-data.ts) — the sitemap enumerates them automatically
 * from the route table. When adding a new content type, add a getStaticPaths
 * helper, never a customPages list.
 */

/**
 * Dev-only pages — visible on `astro dev` so they can be referenced while
 * building, but stripped from production builds so they never ship and never
 * appear in the sitemap. The `excludeDevOnlyPages` integration deletes the
 * built directories from `dist/client` after build completes.
 */
const DEV_ONLY_PATHS = ["/style-guide", "/components"];

/**
 * Sitemap exclusions — TWO lists with TWO different matching modes, both
 * mirrored in public/robots.txt (keep them in sync). A single loose
 * `page.includes(path)` check gets this wrong in both directions: it silently
 * drops real content whose slug contains an excluded word (e.g. a blog post
 * at /blog/components-in-... matching the "/components" exclusion), and
 * naively "fixing" it with exact matching pushes variant pages like
 * /thank-you-call INTO the sitemap while robots.txt still disallows them.
 *
 * SITEMAP_EXCLUDE_PATHS — whole path segments: excludes `/x` and `/x/...`
 * but never `/blog/x-something`. `/preview` is the editor-only SSR draft
 * tree (SSR routes never appear in the sitemap anyway — this is belt and
 * braces should any part of it ever prerender).
 *
 * SITEMAP_EXCLUDE_PREFIXES — literal prefixes, mirroring how robots.txt
 * Disallow works: one `/thank-you` entry covers /thank-you, /thank-you-call,
 * /thank-you-worksheet, etc.
 */
const SITEMAP_EXCLUDE_PATHS = [...DEV_ONLY_PATHS, "/preview"];
const SITEMAP_EXCLUDE_PREFIXES = ["/thank-you"];

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
 * Static one-to-one 301 redirects. Empty by default — a new project starts with
 * no redirects. Add `"old-path": "/new-path"` pairs here as you rename or remove
 * routes so existing index entries and external backlinks don't 404, e.g.:
 *   const redirects = { "/portfolio": "/case-studies" };
 * (Wildcard/splat redirects go in public/_redirects instead.)
 *
 * @type {Record<string, string>}
 */
const redirects = {};

// https://astro.build/config
export default defineConfig({
  // Static by default — INCLUDING the CMS content routes (blog, case
  // studies, glossary), which enumerate their slugs with `getStaticPaths`
  // (helpers in src/sanity/lib/page-data.ts) and ship as prerendered HTML at
  // zero Worker CPU. Only two kinds of routes opt into SSR with
  // `export const prerender = false;`:
  //   - `src/pages/preview/**` — the draft-preview twins that Sanity's
  //     Presentation tool iframes (per-request fetch, drafts perspective via
  //     the sanity-preview-mode cookie). Drafts CANNOT be served on the
  //     prerendered public URLs: the Cloudflare adapter returns static
  //     assets before Astro middleware ever runs, so a cookie-keyed rewrite
  //     there is impossible — hence the parallel /preview tree.
  //   - `src/pages/api/**` — the scorecard endpoint and the draft-mode
  //     cookie set/clear routes.
  // Publishing content triggers a rebuild via the rebuild-debounce Worker
  // (workers/rebuild-debounce/) — prerendered content ships on the next build.
  output: "static",
  adapter: cloudflare({
    inspectorPort: false,
    prerenderEnvironment: "node",
    // Pre-optimize images at build time with sharp, serve them via a
    // passthrough endpoint at runtime. Without this the adapter defaults to
    // `cloudflare-binding` mode, which requires a paid Cloudflare Images
    // binding for SSR pages — any <Image> on the /preview draft-preview
    // routes would otherwise fail to render.
    imageService: "compile",
  }),
  redirects,
  integrations: [
    excludeDevOnlyPages(),
    sitemap({
      filter: (page) => {
        const { pathname } = new URL(page);
        if (SITEMAP_EXCLUDE_PREFIXES.some((p) => pathname.startsWith(p))) {
          return false;
        }
        return !SITEMAP_EXCLUDE_PATHS.some(
          (p) => pathname === p || pathname.startsWith(`${p}/`),
        );
      },
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

    /* Astro's image styles are injected into the page UNLAYERED, as
       `:where([data-astro-image]) { … }`. The zero-specificity `:where()` is
       deliberate on Astro's side — it means any author rule outranks them.
       That holds right up until the author CSS moves into a cascade layer:
       unlayered declarations beat every layer regardless of selector, so
       Astro's defaults suddenly win over the entire design system.

       Concretely, with these on, `:where([data-astro-image]) { height: auto }`
       beat both `img, picture { height: 100% }` in reset.css and `.u-image` in
       base/visual-utilities.css, and images stopped filling .u-image-wrapper.

       Turning them off is safe here because the design system already provides
       the equivalent defaults deliberately — see the comment above the
       `img, picture` rule in reset.css, and the .u-image / .u-image-wrapper
       rules in base/visual-utilities.css, whose comments state outright that
       they are written to out-specify these very styles. */
    responsiveStyles: false,

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
