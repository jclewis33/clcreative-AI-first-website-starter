import { getCollection, type CollectionEntry } from "astro:content";

/**
 * Service-page helpers over the `services` content collection
 * (src/content/services/*.json — see src/content.config.ts).
 *
 * The nav/footer/PAGES view of the same files is synchronous and lives in
 * src/lib/service-nav.ts, because site-structure.ts can't await a
 * collection query.
 */

export type Service = CollectionEntry<"services">;

/** Where the Services breadcrumb points (there is no /services index yet). */
export const SERVICES_INDEX_PATH = "/#services";

export function servicePath(id: string): string {
  return `/services/${id}`;
}

/** A town as a URL segment: "Round Rock" → "round-rock". */
export function citySlug(city: string): string {
  return city
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * A service's page for one town (only built when SITE.cityPages is on):
 * /services/<service>/<town>.
 */
export function serviceCityPath(id: string, city: string): string {
  return `${servicePath(id)}/${citySlug(city)}`;
}

/** Every service, sorted by `order`, then title. */
export async function getServices(): Promise<Service[]> {
  const all = await getCollection("services");
  return all.sort(
    (a, b) =>
      a.data.order - b.data.order || a.data.title.localeCompare(b.data.title),
  );
}

/**
 * The next `count` services after this one, wrapping round so every page
 * links onward. Never includes the service itself; with only one service
 * there is nothing related, so it returns [].
 */
export function relatedServices(
  all: Service[],
  id: string,
  count = 3,
): Service[] {
  const others = all.filter((s) => s.id !== id);
  if (others.length === 0) return [];
  const start = Math.max(
    0,
    all.findIndex((s) => s.id === id),
  );
  const ordered = [...all.slice(start + 1), ...all.slice(0, start)].filter(
    (s) => s.id !== id,
  );
  return ordered.slice(0, Math.min(count, others.length));
}
