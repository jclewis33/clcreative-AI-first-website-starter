/**
 * Helpers the Files backend's per-type modules share.
 */
import type { ImageMetadata } from "astro";
import type { ContentImage, SeoFields } from "@/lib/content/types";

/**
 * A local image as a ContentImage: Astro's metadata plus its intrinsic size
 * (so sizedImage() keeps the ratio). Files content has no focal point, so
 * the image renders centred.
 */
export function localImage(src: ImageMetadata, alt: string): ContentImage {
  return { src, alt, width: src.width, height: src.height };
}

/** The optional `seo` object page-level collections share. */
interface SeoInput {
  metaTitle?: string;
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: ImageMetadata;
}

export function toSeo(seo: SeoInput | undefined): SeoFields | null {
  if (!seo) return null;
  return {
    metaTitle: seo.metaTitle ?? null,
    metaDescription: seo.metaDescription ?? null,
    ogTitle: seo.ogTitle ?? null,
    ogDescription: seo.ogDescription ?? null,
    // og:image:alt comes from the page, not the image.
    ogImage: seo.ogImage ? localImage(seo.ogImage, "") : null,
  };
}

/**
 * Newest first by a "YYYY-MM-DD" field, undated entries last, ties by id —
 * so equal dates always list in the same order.
 */
export function newestFirst<T extends { id: string }>(
  dateOf: (entry: T) => string | undefined,
): (a: T, b: T) => number {
  return (a, b) =>
    (dateOf(b) ?? "").localeCompare(dateOf(a) ?? "") ||
    a.id.localeCompare(b.id);
}
