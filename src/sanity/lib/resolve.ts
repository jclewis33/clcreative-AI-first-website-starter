import { defineLocations } from "sanity/presentation";
import type { PresentationPluginOptions } from "sanity/presentation";

/**
 * ⚠️ Two different URL maps live in this file — do NOT conflate them:
 *
 * 1. `resolveInternalLinkHref` — hrefs for REAL links rendered inside
 *    published content (internal-link marks in portable text). These must
 *    stay PUBLIC URLs (/blog/…, /case-studies/…, /glossary/…).
 *
 * 2. `resolve.locations` — the URLs Sanity Presentation iframes for draft
 *    preview. These must point at the SSR /preview/* twins; the public
 *    routes are prerendered static files, so middleware (and therefore the
 *    draft cookie) never runs for them.
 *
 * Note: this file is compiled into the HOSTED Studio bundle. Changing
 * locations requires `npx sanity deploy` (a Studio deploy) — a site deploy
 * alone won't update Presentation. Deploy order: site first (so /preview/*
 * exists), then the Studio.
 */
export type InternalLinkTarget =
  | {
      _type?: string;
      slug?: string;
      title?: string;
      description?: string;
      image?: any;
    }
  | null
  | undefined;

export function resolveInternalLinkHref(target: InternalLinkTarget): string | null {
  if (!target?.slug || !target._type) return null;
  switch (target._type) {
    case "blogPost":
      return `/blog/${target.slug}`;
    case "caseStudy":
      return `/case-studies/${target.slug}`;
    case "glossaryTerm":
      return `/glossary/${target.slug}`;
    default:
      return null;
  }
}

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
