/**
 * Case study content block types — re-exported from the content interface
 * (src/lib/content/blocks.ts), which owns them so the interface never
 * depends on this component folder. The block components import from here.
 */
import type { PaddingSize } from "@/components/ui/Section.astro";
import type { SectionSpacing } from "@/lib/content/blocks";

export type {
  ContentBlock,
  ImageEntry,
  SectionSpacing,
} from "@/lib/content/blocks";

/* Compile-time drift check: SectionSpacing is spelled out in
   src/lib/content/blocks.ts (no component import there), and must stay
   equal to Section's PaddingSize minus "page-top". `npm run check` fails
   on this line if either side changes without the other. */
type Expected = Exclude<PaddingSize, "page-top">;
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type AssertTrue<T extends true> = T;
type SectionSpacingInSync = AssertTrue<Same<SectionSpacing, Expected>>;
