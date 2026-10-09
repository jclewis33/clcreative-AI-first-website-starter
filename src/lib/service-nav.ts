/**
 * The nav / footer / page-registry view of the service files — synchronous,
 * so src/data/site-structure.ts can use it. It reads the same JSON files as
 * the `services` content collection (src/content.config.ts). Both use the
 * raw filename as the slug — the collection's generateId rejects anything
 * but lowercase-kebab, so the nav link and the page URL always match. The
 * collection is what validates the files.
 *
 * Only the fields the menus need are read here. `import.meta.glob` is a
 * Vite feature: this module (and site-structure.ts) are only ever loaded
 * through Vite — pages, components and the llms endpoints.
 */

interface ServiceNavFile {
  title: string;
  navLabel?: string;
  order?: number;
  seoDescription: string;
}

export interface ServiceNavItem {
  /** Filename without .json — the URL slug. */
  id: string;
  path: string;
  title: string;
  navLabel: string;
  order: number;
  description: string;
}

const files = import.meta.glob<ServiceNavFile>("/src/content/services/*.json", {
  eager: true,
  import: "default",
});

/** Every service, sorted by `order` (default 100), then title. */
export const SERVICE_NAV: ServiceNavItem[] = Object.entries(files)
  .map(([file, data]) => {
    const id = file
      .split("/")
      .pop()!
      .replace(/\.json$/, "");
    return {
      id,
      path: `/services/${id}`,
      title: data.title,
      navLabel: data.navLabel ?? data.title,
      order: data.order ?? 100,
      description: data.seoDescription,
    };
  })
  .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
