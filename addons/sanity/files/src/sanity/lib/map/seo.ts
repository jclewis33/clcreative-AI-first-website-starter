/**
 * Sanity `seo` object → SeoFields. Every field is cleaned: these only land
 * in meta tags, where Presentation draws no overlays.
 */
import { stegaClean } from "@sanity/client/stega";
import type { SeoFields } from "@/lib/content/types";
import { sanityImage, type SanityImageSource } from "./image";

/** The `seo { … }` projection BLOG_POST_QUERY and CASE_STUDY_QUERY share. */
export interface RawSeo {
  metaTitle: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: SanityImageSource;
}

export function toSeo(seo: RawSeo | null | undefined): SeoFields | null {
  if (!seo) return null;
  return {
    metaTitle: stegaClean(seo.metaTitle),
    metaDescription: stegaClean(seo.metaDescription),
    ogTitle: stegaClean(seo.ogTitle),
    ogDescription: stegaClean(seo.ogDescription),
    ogImage: sanityImage(seo.ogImage, ""),
  };
}
