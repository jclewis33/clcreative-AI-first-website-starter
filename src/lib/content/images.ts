/**
 * Image helpers for ContentImage — the only way consumers turn a content
 * image into a `src` or a URL. A CMS image carries a `url()` builder
 * (resized on its CDN); a local image is ImageMetadata, sized by Astro:
 * <Visual> does it for `imageSrc()` results, and `resolveImageUrl()` asks
 * getImage() for a sized file when a plain URL string is needed.
 */
import type { ImageMetadata } from "astro";
import { getImage } from "astro:assets";
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

/**
 * A URL string for a raw img tag, an OG tag, JSON-LD or a lightbox, sized
 * either way:
 * - CMS image: its CDN URL at this size (the same URL `imageSrc()` builds);
 * - local image: a file Astro writes at build time with getImage(), at
 *   `width` (else the image's own `width`, e.g. from `sizedImage()`), and
 *   cropped to cover when both `width` and `height` are given.
 * A local result is root-relative ("/_astro/…"): Head resolves og:image
 * against the site URL, and jsonld.ts makes JSON-LD URLs absolute.
 */
export async function resolveImageUrl(
  image: ContentImage,
  options?: ImageUrlOptions,
): Promise<string>;
export async function resolveImageUrl(
  image: ContentImage | null | undefined,
  options?: ImageUrlOptions,
): Promise<string | undefined>;
export async function resolveImageUrl(
  image: ContentImage | null | undefined,
  options: ImageUrlOptions = {},
): Promise<string | undefined> {
  if (!image) return undefined;
  if (typeof image.src === "string")
    return image.url && wantsSize(options) ? image.url(options) : image.src;
  const width = options.width ?? image.width;
  const { height, format } = options;
  const result = await getImage({
    src: image.src,
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...(width && height ? { fit: "cover" as const } : {}),
    ...(format ? { format } : {}),
  });
  return result.src;
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
