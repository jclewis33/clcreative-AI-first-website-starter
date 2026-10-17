/**
 * Sanity image → ContentImage. Consumers get a plain ContentImage whose
 * `url()` closes over the cleaned source, so
 * `imageSrc(image, { width: 600 })` builds exactly the CDN URL
 * `urlFor(image).width(600).url()` always did.
 */
import { stegaClean } from "@sanity/client/stega";
import type { ContentImage, ImageUrlOptions } from "@/lib/content/types";
import { urlFor, hotspotPosition } from "../image";

/** Any image object a query returns (asset reference + optional hotspot/crop). */
export type SanityImageSource =
  { asset?: unknown; hotspot?: unknown } | null | undefined;

/** `asset->metadata{ dimensions }`, as the project and gallery queries project it. */
export type SanityImageMeta =
  | { dimensions: { width?: number | null; height?: number | null } | null }
  | null
  | undefined;

/**
 * A ContentImage, or null when the image has no asset yet (a half-filled
 * draft) — callers render nothing instead of handing urlFor() an empty
 * source, which throws. `meta` supplies intrinsic dimensions for
 * `sizedImage()`; omit it where no query projects them.
 */
export function sanityImage(
  source: SanityImageSource,
  alt: string | null | undefined,
  meta?: SanityImageMeta,
): ContentImage | null {
  const clean = stegaClean(source);
  if (!clean?.asset) return null;
  const url = ({ width, height, format }: ImageUrlOptions) => {
    let builder = urlFor(clean);
    if (width) builder = builder.width(width);
    if (height) builder = builder.height(height);
    if (format) builder = builder.format(format);
    return builder.url();
  };
  const width = meta?.dimensions?.width ?? undefined;
  const height = meta?.dimensions?.height ?? undefined;
  return {
    src: url({}),
    alt: stegaClean(alt) ?? "",
    ...(width && height ? { width, height } : {}),
    position: hotspotPosition(clean),
    url,
  };
}
