/**
 * Image helpers for ContentImage — the only way consumers turn a content
 * image into a `src`. A CMS image carries a `url()` builder (resized on its
 * CDN); a local image is ImageMetadata and Astro's pipeline sizes it, so a
 * size request is ignored and the metadata is returned unchanged.
 */
import type { ImageMetadata } from "astro";
import type { ContentImage, ImageUrlOptions } from "./types";

const wantsSize = (o: ImageUrlOptions) =>
  Boolean(o.width || o.height || o.format);

/** A `src` for `<Visual>` and the cards: a sized CDN URL, or the local metadata as-is. */
export function imageSrc(
  image: ContentImage,
  options?: ImageUrlOptions,
): ImageMetadata | string;
export function imageSrc(
  image: ContentImage | null | undefined,
  options?: ImageUrlOptions,
): ImageMetadata | string | undefined;
export function imageSrc(
  image: ContentImage | null | undefined,
  options: ImageUrlOptions = {},
): ImageMetadata | string | undefined {
  if (!image) return undefined;
  return image.url && wantsSize(options) ? image.url(options) : image.src;
}

/** A URL string — for a raw img tag, an OG tag, JSON-LD or a lightbox. */
export function imageUrl(
  image: ContentImage,
  options?: ImageUrlOptions,
): string;
export function imageUrl(
  image: ContentImage | null | undefined,
  options?: ImageUrlOptions,
): string | undefined;
export function imageUrl(
  image: ContentImage | null | undefined,
  options: ImageUrlOptions = {},
): string | undefined {
  const src = imageSrc(image, options);
  return src === undefined || typeof src === "string" ? src : src.src;
}

/**
 * The image re-sized to `width`, with the height that keeps its intrinsic
 * ratio — the shape cards, tiles and lightboxes pass straight to `<Visual>`.
 * The ratio comes from the image's own `width`/`height`, else (for a local
 * image) from its ImageMetadata dimensions; when neither is known the height
 * is two-thirds of the width.
 */
export function sizedImage(image: ContentImage, width: number): ContentImage {
  const local = typeof image.src === "string" ? undefined : image.src;
  const w = image.width ?? local?.width;
  const h = image.height ?? local?.height;
  const height =
    w && h ? Math.round((width * h) / w) : Math.round(width * 0.66);
  return {
    ...image,
    src: image.url ? image.url({ width }) : image.src,
    width,
    height,
  };
}
