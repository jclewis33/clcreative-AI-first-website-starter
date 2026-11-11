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
  group?: string;
  order?: number;
  seoDescription: string;
}

export interface ServiceNavItem {
  /** Filename without .json — the URL slug. */
  id: string;
  path: string;
  title: string;
  navLabel: string;
  /** The menu it sits in ("Residential"); "" when ungrouped. */
  group: string;
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
      group: data.group ?? "",
      order: data.order ?? 100,
      description: data.seoDescription,
    };
  })
  .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

/**
 * The services as menus: one `{ label, paths }` per group, in order of first
 * appearance — or a single "Services" menu when no service has a group.
 * Ungrouped services join "Services" at the end. `extra` adds links at the
 * top of a group (a preset's audience page heads "Commercial").
 */
export function serviceMenus(
  extra: Record<string, string[]> = {},
): { label: string; paths: string[] }[] {
  if (!SERVICE_NAV.length) return [];
  if (!SERVICE_NAV.some((s) => s.group))
    return [{ label: "Services", paths: SERVICE_NAV.map((s) => s.path) }];
  const menus = new Map<string, string[]>();
  for (const s of SERVICE_NAV) {
    const label = s.group || "Services";
    if (!menus.has(label)) menus.set(label, [...(extra[label] ?? [])]);
    menus.get(label)!.push(s.path);
  }
  return [...menus].map(([label, paths]) => ({ label, paths }));
}
