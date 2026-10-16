/**
 * Blog category URL helper, shared by the content source (the category
 * archive's getStaticPaths in src/sanity/lib/page-data.ts) and the blog
 * index's category links, so the two can never disagree on a slug.
 * Backend-neutral: it knows nothing about where categories come from.
 */

/** URL slug for a category display name, e.g. "Case Notes" becomes "case-notes". */
export function categoryToSlug(category: string): string {
  return String(category).toLowerCase().replace(/\s+/g, "-");
}
