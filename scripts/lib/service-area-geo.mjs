// @ts-check
/**
 * Town boundaries for the service-area map (src/components/ui/ServiceMap.astro).
 *
 * Looks each town up on OpenStreetMap's Nominatim (`polygon_geojson`) and
 * returns its outline, simplified and rounded so a handful of towns stays a
 * few kilobytes. A town Nominatim only knows as a point comes back as a
 * point (the map draws a circle). Not found = left out, with a warning; the
 * town's chip still shows.
 *
 * Nominatim's usage policy: an identifying User-Agent and at most one request
 * a second — so this runs once, when a demo is generated, and results are
 * cached in a JSON file beside demo.json. The live site never calls it.
 *
 * Zero dependencies (fetch + fs).
 */
import fs from "node:fs/promises";
import { existsSync } from "node:fs";

const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "clcreative-website-starter (service-area map generator)";

/**
 * @typedef {{ type: "Polygon" | "MultiPolygon" | "Point", coordinates: any }} Geometry
 * @typedef {{ name: string, geometry: Geometry }} AreaGeo
 */

/**
 * Round every number in a coordinate tree to 4 decimals (about 10 m).
 * @param {any} c
 * @returns {any}
 */
function round(c) {
  return Array.isArray(c) ? c.map(round) : Math.round(c * 1e4) / 1e4;
}

/**
 * @param {string} town
 * @param {string} region  e.g. "TX"
 * @returns {Promise<Geometry | null>}
 */
async function lookUp(town, region) {
  const url = new URL(ENDPOINT);
  // A structured city search for a settlement: a free-text "Terrell, TX"
  // matched Terrell County, 300 miles from the city of Terrell.
  url.search = new URLSearchParams({
    city: town,
    state: region,
    country: "USA",
    featureType: "settlement",
    format: "jsonv2",
    polygon_geojson: "1",
    polygon_threshold: "0.003",
    limit: "1",
  }).toString();
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Nominatim: HTTP ${res.status} for "${town}"`);
  const [hit] = await res.json();
  if (!hit) return null;
  const geo = hit.geojson;
  // Outer edges only: a town outline needs no holes (annexation gaps, lakes),
  // and slivers of a few points are noise at this zoom.
  if (geo?.type === "Polygon")
    return { type: "Polygon", coordinates: round([geo.coordinates[0]]) };
  if (geo?.type === "MultiPolygon") {
    const parts = geo.coordinates
      .map((/** @type {any[]} */ poly) => [poly[0]])
      .filter((/** @type {any[]} */ poly) => poly[0].length >= 8);
    if (parts.length)
      return { type: "MultiPolygon", coordinates: round(parts) };
  }
  return {
    type: "Point",
    coordinates: round([Number(hit.lon), Number(hit.lat)]),
  };
}

/**
 * The outlines for `towns`, reusing `cacheFile` (written back with anything
 * new). Throws only on a network/HTTP failure; a town that isn't found is
 * skipped with a warning.
 *
 * @param {string[]} towns
 * @param {string} region
 * @param {string} cacheFile
 * @param {(message: string) => void} [warn]
 * @returns {Promise<AreaGeo[]>}
 */
export async function serviceAreaGeo(
  towns,
  region,
  cacheFile,
  warn = console.warn,
) {
  /** @type {Record<string, Geometry | null>} */
  const cache = existsSync(cacheFile)
    ? JSON.parse(await fs.readFile(cacheFile, "utf8"))
    : {};
  let fetched = false;
  for (const town of towns) {
    const key = `${town}, ${region}`;
    if (key in cache) continue;
    if (fetched) await new Promise((r) => setTimeout(r, 1100));
    cache[key] = await lookUp(town, region);
    fetched = true;
  }
  if (fetched) await fs.writeFile(cacheFile, `${JSON.stringify(cache)}\n`);
  return towns.flatMap((town) => {
    const geometry = cache[`${town}, ${region}`];
    if (!geometry) {
      warn(
        `Service-area map: "${town}, ${region}" wasn't found on OpenStreetMap — its chip shows, the map skips it.`,
      );
      return [];
    }
    return [{ name: town, geometry }];
  });
}
