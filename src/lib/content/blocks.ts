/**
 * Case study content blocks — the flexible body a case study renders, one
 * block per layout. A discriminated union on `type`: each backend maps its
 * own block shapes onto these (Sanity's "array of objects" field today, the
 * local samples in src/data/case-studies.ts), and the block components in
 * src/components/case-study/ render them.
 *
 * Lives in the content interface, not the component folder, so the
 * interface never depends on a component file.
 */
import type { ImageMetadata } from "astro";

/** One image in an image-grid block. */
export interface ImageEntry {
  src: ImageMetadata | string;
  alt: string;
  transparent?: boolean;
  position?: { x: number; y: number } | "center";
}

/**
 * Section spacing for content blocks — the Section padding sizes
 * (PaddingSize in src/components/ui/Section.astro, the single source)
 * minus 'page-top', which is nav plumbing, not block spacing. Spelled out
 * here so this module never imports a component; a compile-time check in
 * src/components/case-study/types.ts fails if the two drift apart.
 */
export type SectionSpacing = "none" | "xsmall" | "small" | "main" | "large";

/** Shared spacing props present on every content block. */
interface BlockSpacing {
  sectionSpacing?: SectionSpacing;
  sectionSpacingTop?: SectionSpacing;
  sectionSpacingBottom?: SectionSpacing;
}

export type ContentBlock =
  | ({
      type: "fullWidthImage";
      image: ImageMetadata | string;
      imageAlt: string;
      aspectRatio?: string;
      transparent?: boolean;
      position?: { x: number; y: number } | "center";
    } & BlockSpacing)
  | ({
      type: "imageGrid";
      images: ImageEntry[];
      aspectRatio?: string;
    } & BlockSpacing)
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
  | ({
      type: "stats";
      /* Nullable: a stat row exists in Sanity as soon as an editor adds it,
         before either field is filled in. */
      items: { value: string | null; label: string | null }[];
    } & BlockSpacing);
