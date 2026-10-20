/**
 * The nav / footer / page-registry view of the service-area files —
 * synchronous, so src/data/site-structure.ts and the footer can use it. It
 * reads the same JSON files as the `serviceAreas` content collection
 * (src/content.config.ts), which is what validates them; only the fields
 * the menus and town links need are read here.
 */

interface AreaNavFile {
  title: string;
  order?: number;
  seoDescription: string;
  towns: string[];
}

export interface AreaNavItem {
  /** Filename without .json — the URL slug. */
  id: string;
  path: string;
  title: string;
  order: number;
  description: string;
  towns: string[];
}

/** The hub: every region, the radius map, every town. */
export const SERVICE_AREAS_PATH = "/service-areas";

const files = import.meta.glob<AreaNavFile>(
  "/src/content/service-areas/*.json",
  { eager: true, import: "default" },
);

/** Every region, sorted by `order` (default 100), then title. */
export const AREA_NAV: AreaNavItem[] = Object.entries(files)
  .map(([file, data]) => {
    const id = file
      .split("/")
      .pop()!
      .replace(/\.json$/, "");
    return {
      id,
      path: `${SERVICE_AREAS_PATH}/${id}`,
      title: data.title,
      order: data.order ?? 100,
      description: data.seoDescription,
      towns: data.towns,
    };
  })
  .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

/**
 * Each town's region page: `{ "Waxahachie": "/service-areas/ellis-county" }`.
 * A town in no region has no entry (its chip stays plain text).
 */
export const TOWN_LINKS: Record<string, string> = Object.fromEntries(
  AREA_NAV.flatMap((area) => area.towns.map((town) => [town, area.path])),
);
