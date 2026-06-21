import { createImageUrlBuilder } from "@sanity/image-url";
import { sanityClient } from "sanity:client";

const builder = createImageUrlBuilder(sanityClient);

export function urlFor(source: any) {
  return builder.image(source).auto("format").quality(90).dpr(2);
}

/**
 * Map a Sanity image's hotspot (x/y as 0–1 fractions) to the Visual
 * component's `position` prop (0–100). `urlFor` applies the crop rectangle
 * automatically, but the hotspot only drives the final cover-crop — which
 * the Visual does in CSS via object-position — so it must be forwarded
 * explicitly. Returns "center" when no hotspot is set.
 */
export function hotspotPosition(
  source: any,
): { x: number; y: number } | "center" {
  return source?.hotspot
    ? { x: source.hotspot.x * 100, y: source.hotspot.y * 100 }
    : "center";
}
