/**
 * Project + gallery categories — plain data (no `sanity` import), read by the
 * Sanity schema AND the site, so the Studio dropdown and the public filters
 * can never disagree. REPLACE THESE PER CLIENT: they are placeholders.
 *
 * Renaming a value orphans documents that use the old one — they still
 * render (categoryTitle falls back to the raw value) but drop out of the
 * matching Studio list until re-saved with a current category.
 */
export const PROJECT_CATEGORIES = [
  { title: "Residential", value: "residential" },
  { title: "Commercial", value: "commercial" },
  { title: "Remodel", value: "remodel" },
  { title: "Repair", value: "repair" },
];

/** Display title for a category value; the raw value when unknown. */
export function categoryTitle(value: string | null | undefined): string {
  if (!value) return "";
  return PROJECT_CATEGORIES.find((c) => c.value === value)?.title ?? value;
}
