import { defineLocations } from "sanity/presentation";
import type { PresentationPluginOptions } from "sanity/presentation";

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
            href: `/blog/${doc?.slug}`,
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
            href: `/case-studies/${doc?.slug}`,
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
            href: `/glossary/${doc?.slug}`,
          },
        ],
      }),
    }),
  },
};
