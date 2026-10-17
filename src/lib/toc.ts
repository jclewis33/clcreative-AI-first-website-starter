/**
 * Table-of-contents types and the heading slugger, shared by every content
 * source. (The Sanity add-on's Portable Text walker, buildToc, lives in its
 * src/sanity/lib/portable-text.ts.)
 */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface TocItem {
  slug: string;
  text: string;
}
