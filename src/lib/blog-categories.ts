/**
 * Blog category URL helper, shared by the content source (each backend's
 * category-archive getStaticPaths) and the blog index's category links, so
 * the two can never disagree on a slug.
 * Backend-neutral: it knows nothing about where categories come from.
 */

/** URL slug for a category display name, e.g. "Case Notes" becomes "case-notes". */
export function categoryToSlug(category: string): string {
  return String(category).toLowerCase().replace(/\s+/g, "-");
}
