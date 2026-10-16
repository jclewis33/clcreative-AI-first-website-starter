/**
 * Project URL helper, shared by the content source (src/sanity/lib/map/
 * projects.ts) and the project pages. The project and gallery view models
 * live in src/lib/content/types.ts.
 */

/** Public URL of a project detail page. */
export function projectPath(slug: string): string {
  return `/projects/${slug}`;
}
