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
 * a second — so this runs only from `npm run map` (and `npm run demo`), and
 * results are cached in a JSON file (src/data/service-area-geo.cache.json).
 * The live site never calls it.
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
  // A structured search: a free-text "Terrell, TX" matched Terrell County,
  // 300 miles from the city of Terrell. A name ending in "County" (a
  // business that lists its counties, not towns) is searched as a county.
  const county = /\scounty$/i.test(town);
  url.search = new URLSearchParams({
    ...(county ? { county: town } : { city: town, featureType: "settlement" }),
    state: region,
    country: "USA",
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
 * @param {boolean} [offline] never call the network: a town missing from the cache is skipped with a warning
 * @returns {Promise<AreaGeo[]>}
 */
export async function serviceAreaGeo(
  towns,
  region,
  cacheFile,
  warn = console.warn,
  offline = false,
) {
  /** @type {Record<string, Geometry | null>} */
  const cache = existsSync(cacheFile)
    ? JSON.parse(await fs.readFile(cacheFile, "utf8"))
    : {};
  let fetched = false;
  for (const town of towns) {
    const key = `${town}, ${region}`;
    if (key in cache || offline) continue;
    if (fetched) await new Promise((r) => setTimeout(r, 1100));
    cache[key] = await lookUp(town, region);
    fetched = true;
  }
  if (fetched) await fs.writeFile(cacheFile, `${JSON.stringify(cache)}\n`);
  return towns.flatMap((town) => {
    const geometry = cache[`${town}, ${region}`];
    if (!geometry) {
      warn(
        `Service-area map: "${town}, ${region}" ${
          offline && !(`${town}, ${region}` in cache)
            ? "isn't in the cache (offline)"
            : "wasn't found on OpenStreetMap"
        } — its chip shows, the map skips it.`,
      );
      return [];
    }
    return [{ name: town, geometry }];
  });
}

/**
 * The middle of an outline's bounding box, rounded like the outlines.
 * @param {Geometry} geometry
 * @returns {{ lat: number, lng: number }}
 */
function middleOf(geometry) {
  /** @type {number[][]} */
  const points = [];
  const walk = (/** @type {any} */ c) =>
    Array.isArray(c) && typeof c[0] === "number"
      ? points.push(c)
      : Array.isArray(c) && c.forEach(walk);
  walk(geometry.coordinates);
  const mid = (/** @type {number[]} */ v) =>
    Math.round(((Math.min(...v) + Math.max(...v)) / 2) * 1e4) / 1e4;
  return {
    lat: mid(points.map((p) => p[1])),
    lng: mid(points.map((p) => p[0])),
  };
}

/**
 * Everything the street map needs: each area's outline, and the radius
 * circle's centre when `radius` is set. Shared by `npm run map` (reads SITE)
 * and `npm run demo`. Throws on a network failure, like `serviceAreaGeo`;
 * a town that isn't found is skipped with a warning.
 *
 * @param {object} options
 * @param {string[]} options.areas  town names (SITE.serviceAreas)
 * @param {{ center: string, miles: number } | null} options.radius  SITE.serviceRadius
 * @param {string} options.region  e.g. "TX" (SITE.address.region)
 * @param {string} options.cacheFile
 * @param {(message: string) => void} [options.warn]
 * @param {boolean} [options.offline]  never call the network (cache only)
 * @returns {Promise<{ geo: AreaGeo[], radius: { lat: number, lng: number, miles: number } | null }>}
 */
export async function buildMap({
  areas,
  radius,
  region,
  cacheFile,
  warn = console.warn,
  offline = false,
}) {
  const geo = await serviceAreaGeo(areas, region, cacheFile, warn, offline);
  if (!radius) return { geo, radius: null };
  // The centre town is looked up like the others (same cache).
  const [hit] = await serviceAreaGeo(
    [radius.center],
    region,
    cacheFile,
    warn,
    offline,
  );
  return {
    geo,
    radius: hit ? { ...middleOf(hit.geometry), miles: radius.miles } : null,
  };
}
