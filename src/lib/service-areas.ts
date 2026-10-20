import { getCollection, type CollectionEntry } from "astro:content";

/**
 * Service-area helpers over the `serviceAreas` content collection
 * (src/content/service-areas/*.json — see src/content.config.ts). The
 * synchronous menu view of the same files is src/lib/area-nav.ts.
 */

export type ServiceAreaRegion = CollectionEntry<"serviceAreas">;

export { SERVICE_AREAS_PATH, TOWN_LINKS } from "@/lib/area-nav";

export function areaPath(id: string): string {
  return `/service-areas/${id}`;
}

/** Every region, sorted by `order`, then title. */
export async function getServiceAreas(): Promise<ServiceAreaRegion[]> {
  const all = await getCollection("serviceAreas");
  return all.sort(
    (a, b) =>
      a.data.order - b.data.order || a.data.title.localeCompare(b.data.title),
  );
}
