// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import cloudflare from "@astrojs/cloudflare";
import { readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import * as cms from "./src/config/cms.mjs";
import { SITE_URL } from "./src/config/site.shared.mjs";
import {
  DEV_ONLY_PATHS,
  SITE_NOINDEX,
  isNoindexRoute,
} from "./src/config/seo.shared.mjs";

/**
 * NOTE: the sitemap deliberately has NO `customPages` option. A
 * customPages list is only ever needed for SSR routes (which are invisible
 * to `@astrojs/sitemap`), and every content route here is PRERENDERED via
 * `getStaticPaths` (helpers from src/lib/content) — the sitemap
 * enumerates them automatically from the route table. When adding a new
 * content type, add a getStaticPaths helper, never a customPages list.
 */

/**
 * Dev-only pages — visible on `astro dev` so they can be referenced while
 * building, but stripped from production builds so they never ship and never
 * appear in the sitemap. The `excludeDevOnlyPages` integration deletes the
 * built directories from `dist/client` after build completes.
 */

/* Sitemap exclusions live in src/config/seo.shared.mjs, alongside the
   robots.txt route and the noindex meta tag that must agree with them. */

function excludeDevOnlyPages() {
  return {
    name: "exclude-dev-only-pages",
    hooks: {
      /** @param {{ dir: URL, logger: { info: (msg: string) => void } }} ctx */
      "astro:build:done": async ({ dir, logger }) => {
        // Parity builds (scripts/compare-dist.mjs) keep the dev-only demo
        // pages so /components is compared too. Never set in production.
        if (process.env.KEEP_DEV_PAGES === "1") {
          logger.info("KEEP_DEV_PAGES=1 — dev-only pages left in the build.");
          return;
        }
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
 * SITE_NOINDEX builds (prospect demos, staging) also send
 * `X-Robots-Tag: noindex, nofollow` on every static asset. Prerendered pages
 * and images are served straight from the assets binding, so the middleware
 * never sees them — only `_headers` reaches them. The line is added to the
 * BUILT copy, never public/_headers: that file must match SECURITY_HEADERS
 * (`npm run check:config`) on every site, noindex or not.
 */
function noindexHeaders() {
  return {
    name: "noindex-headers",
    hooks: {
      /** @param {{ dir: URL, logger: { info: (msg: string) => void } }} ctx */
      "astro:build:done": async ({ dir, logger }) => {
        if (!SITE_NOINDEX) return;
        const file = new URL("_headers", dir);
        const headers = await readFile(file, "utf8");
        if (!/^\/\*$/m.test(headers)) {
          throw new Error("[noindex-headers] _headers has no `/*` block.");
        }
        await writeFile(
          file,
          headers.replace(/^\/\*$/m, "/*\n  X-Robots-Tag: noindex, nofollow"),
        );
        logger.info("SITE_NOINDEX — X-Robots-Tag added to the built _headers.");
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
  // Static by default — INCLUDING the content routes (blog, case studies,
  // projects), which enumerate their slugs with `getStaticPaths` (helpers
  // from @/lib/content) and ship as prerendered HTML at zero Worker CPU.
  // Only `src/pages/api/**` opts into SSR (`export const prerender =
  // false;`), plus any draft-preview routes a CMS add-on brings.
  output: "static",
  adapter: cloudflare({
    inspectorPort: false,
    prerenderEnvironment: "node",
    // Pre-optimize images at build time with sharp, serve them via a
    // passthrough endpoint at runtime. Without this the adapter defaults to
    // `cloudflare-binding` mode, which requires a paid Cloudflare Images
    // binding for SSR pages — any <Image> on an SSR route would otherwise
    // fail to render.
    imageService: "compile",
  }),
  redirects,
  integrations: [
    excludeDevOnlyPages(),
    noindexHeaders(),
    // A SITE_NOINDEX build has nothing to list, so it ships no sitemap.
    ...(SITE_NOINDEX
      ? []
      : [
          sitemap({
            filter: (page) => !isNoindexRoute(new URL(page).pathname),
          }),
        ]),
    mdx(),
    // The content source's integrations (src/config/cms.mjs): none for
    // content in local files; a CMS add-on supplies its own.
    ...cms.integrations,
  ],
  // This is the URL of your live site. Astro uses this for generating canonical URLs and your sitemap.
  site: SITE_URL,
  image: {
    /* Valid: "constrained" | "full-width" | "fixed"

    NOTE: this default governs raw <Image /> usage only. The <Visual>
    component — which renders essentially every image on the site — sets
    layout="full-width" itself, because it always wraps the image in an
    aspect-ratio box and lets CSS object-fit do the cropping. So `constrained`
    below applies to the handful of direct <Image /> calls, not to <Visual>.

    Layout decides the srcset CANDIDATES. Which candidate the browser picks is
    decided by `sizes`, and <Visual> emits sizes="auto" on lazy images so the
    browser measures the real laid-out box. That pairing is what keeps a
    three-up grid from downloading a 1668px source for a 427px slot.

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

    // Remote image hosts the content source serves from (src/config/cms.mjs).
    remotePatterns: cms.remotePatterns,
  },

  /* Fenced code in MDX blog bodies is highlighted at build time with these
     settings. A CMS add-on that renders its own code blocks passes the same
     theme and wrapping to <Code>, so a code block looks the same from
     either content source. */
  markdown: {
    shikiConfig: { theme: "github-dark", wrap: true },
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
    // The home-service looks' display faces (src/config/looks.ts picks
    // which ones a page preloads; unused ones are never requested).
    {
      provider: fontProviders.local(),
      name: "Barlow Condensed",
      cssVariable: "--font-barlow-condensed",
      options: {
        variants: [
          {
            weight: 600,
            style: "normal",
            src: ["./src/assets/fonts/barlow-condensed-latin-600-normal.woff2"],
          },
          {
            weight: 700,
            style: "normal",
            src: ["./src/assets/fonts/barlow-condensed-latin-700-normal.woff2"],
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: "Montserrat",
      cssVariable: "--font-montserrat",
      options: {
        variants: [
          {
            weight: "100 900",
            style: "normal",
            src: ["./src/assets/fonts/montserrat-latin-wght-normal.woff2"],
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: "Archivo",
      cssVariable: "--font-archivo",
      options: {
        variants: [
          {
            weight: "100 900",
            style: "normal",
            src: ["./src/assets/fonts/archivo-latin-wght-normal.woff2"],
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: "Fraunces",
      cssVariable: "--font-fraunces",
      options: {
        variants: [
          {
            weight: "100 900",
            style: "normal",
            src: ["./src/assets/fonts/fraunces-latin-wght-normal.woff2"],
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
    // Build-time constants and dependency pre-bundling hints the content
    // source needs (src/config/cms.mjs).
    // SITE_NOINDEX's env half is baked in here: the Worker's own
    // `process.env` has no build variables (src/config/seo.shared.mjs).
    define: {
      ...cms.viteDefine,
      "process.env.SITE_NOINDEX": JSON.stringify(
        process.env.SITE_NOINDEX ?? "",
      ),
    },
    optimizeDeps: cms.optimizeDeps,
  },

  // Optional: If your site is hosted in a subdirectory, specify the base path.
  // base: '/your-subdirectory/',

  // HTML-aware whitespace compression, pinned on purpose. Astro 7 changed the
  // default to "jsx", which strips whitespace between elements the way React
  // does — including the newline Prettier inserts between an inline element
  // and its neighbour (`Full Name` + `<span>*</span>`, `©` + `<span>2026</span>`).
  // Those newlines are a rendered space under HTML rules and NOTHING under JSX
  // rules, so Prettier's line-wrapping silently deletes visible spaces. Measured
  // on the 7.3.2 upgrade: 308 sibling boundaries lost their space in "jsx" mode
  // (footer copyright, required-field markers, tag + button rows); `true`
  // reproduced the Astro 6 output byte-for-byte apart from asset hashes.
  compressHTML: true,

  // Optional: Control whether URLs have trailing slashes. Options are "always", "never", or "ignore".
  trailingSlash: "never",
});
