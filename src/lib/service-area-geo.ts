/**
 * The service area's town outlines — every town in SITE.serviceAreas with
 * its real boundary, for the street map (ServiceMap, via ServiceArea's
 * `geo`). Generated, not written: `npm run demo` fetches them from
 * OpenStreetMap (scripts/lib/service-area-geo.mjs) into
 * src/data/service-area-geo.json. Empty in the starter, so ServiceArea
 * falls back to its SVG map, photos or chips.
 */
import geo from "@/data/service-area-geo.json";

export type AreaGeo = {
  name: string;
  geometry: {
    type: "Polygon" | "MultiPolygon" | "Point";
    coordinates: unknown;
  };
};

export const SERVICE_AREA_GEO = geo as AreaGeo[];

/** The outlines for `towns`, in their order (towns without one are left out). */
export function geoFor(towns: readonly string[]): AreaGeo[] {
  return towns.flatMap((town) => {
    const hit = SERVICE_AREA_GEO.find((area) => area.name === town);
    return hit ? [hit] : [];
  });
}
