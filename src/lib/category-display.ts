/**
 * Display mapping for blog category names.
 *
 * The stored Sanity value is kept untouched (so URLs, queries, and existing
 * documents continue to work) — this map only affects what readers see.
 * Add new entries here when a category needs a different label on the site.
 */

const BLOG_CATEGORY_DISPLAY_MAP: Record<string, string> = {
  SEO: "SEO & AEO",
};

export function displayCategory(name: string | undefined | null): string {
  if (!name) return "";
  return BLOG_CATEGORY_DISPLAY_MAP[name] ?? name;
}
