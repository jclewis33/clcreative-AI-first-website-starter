/**
 * Case study content block types.
 *
 * Discriminated union that maps directly to Sanity's "array of objects"
 * field type. Each case study's body is an ordered array of these blocks,
 * allowing unique layouts per case study.
 */
import type { ImageMetadata } from "astro";

export interface ImageEntry {
  src: ImageMetadata | string;
  alt: string;
  transparent?: boolean;
  position?: { x: number; y: number } | "center";
}

/** Section spacing values matching the Section component's PaddingSize type. */
export type SectionSpacing = "none" | "xsmall" | "small" | "main" | "large";

/** Shared spacing props present on every content block. */
interface BlockSpacing {
  sectionSpacing?: SectionSpacing;
  sectionSpacingTop?: SectionSpacing;
  sectionSpacingBottom?: SectionSpacing;
}

export type ContentBlock =
  | ({ type: "fullWidthImage"; image: ImageMetadata | string; imageAlt: string; aspectRatio?: string; transparent?: boolean; position?: { x: number; y: number } | "center" } & BlockSpacing)
  | ({ type: "imageGrid"; images: ImageEntry[]; aspectRatio?: string } & BlockSpacing)
  | ({ type: "richText"; html: string; maxWidth?: string } & BlockSpacing)
  | ({ type: "richTextLeft"; html: string; maxWidth?: string } & BlockSpacing)
  | ({ type: "richTextColumns"; html: string } & BlockSpacing)
  | ({
      type: "richTextWithImage";
      html: string;
      image: ImageMetadata | string;
      imageAlt: string;
      aspectRatio?: string;
      transparent?: boolean;
      objectFit?: "cover" | "contain";
      position?: { x: number; y: number } | "center";
    } & BlockSpacing)
  | ({ type: "stats"; items: { value: string; label: string }[] } & BlockSpacing);
