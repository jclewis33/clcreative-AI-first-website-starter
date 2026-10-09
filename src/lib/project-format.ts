/**
 * Pure formatting helpers for project and gallery content. No Astro or
 * Sanity imports, so scripts/check-projects.mjs can exercise them under
 * plain Node.
 */

/**
 * Gallery caption line, e.g. "Springfield, IL · Smith kitchen". Either part
 * may be missing — an empty location, or a project reference whose document
 * was deleted — and no dangling separator is left behind.
 */
export function galleryCaptionMeta(
  location: string | null | undefined,
  projectTitle: string | null | undefined,
): string {
  return [location, projectTitle]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" · ");
}
