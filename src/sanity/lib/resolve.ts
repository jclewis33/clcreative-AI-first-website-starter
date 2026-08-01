import { defineLocations } from "sanity/presentation";
import type { PresentationPluginOptions } from "sanity/presentation";

/**
 * STUDIO-ONLY module: the per-document URLs Sanity's Presentation tool
 * iframes for draft preview. They point at the SSR `/preview/*` twins — the
 * public routes are prerendered static files, so middleware (and therefore
 * the draft cookie) never runs for them.
 *
 * ⚠️ Do NOT import this file from site code. It pulls in `sanity/presentation`
 * (the Studio dependency tree, including CSS-importing packages that the
 * prerender step cannot load). Public content links use
 * `resolveInternalLinkHref` in ./internal-links.ts, which is deliberately
 * kept free of Studio imports. The two URL maps are easy to conflate —
 * public links go to /blog/…, preview locations go to /preview/blog/….
 *
 * Note: this file is compiled into the HOSTED Studio bundle. Changing
 * locations requires `npx sanity deploy` (a Studio deploy) — a site deploy
 * alone won't update Presentation. Deploy order: site first (so /preview/*
 * exists), then the Studio.
 */
export const resolve: PresentationPluginOptions["resolve"] = {
  locations: {
    blogPost: defineLocations({
      select: { title: "title", slug: "slug.current" },
      resolve: (doc) => ({
        locations: [
          {
            title: doc?.title || "Untitled",
            href: `/preview/blog/${doc?.slug}`,
          },
        ],
      }),
    }),
    caseStudy: defineLocations({
      select: { title: "title", slug: "slug.current" },
      resolve: (doc) => ({
        locations: [
          {
            title: doc?.title || "Untitled",
            href: `/preview/case-studies/${doc?.slug}`,
          },
        ],
      }),
    }),
    glossaryTerm: defineLocations({
      select: { title: "title", slug: "slug.current" },
      resolve: (doc) => ({
        locations: [
          {
            title: doc?.title || "Untitled",
            href: `/preview/glossary/${doc?.slug}`,
          },
        ],
      }),
    }),
  },
};
