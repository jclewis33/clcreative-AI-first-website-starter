#!/usr/bin/env node
// @ts-check
/**
 * npm run map — rebuilds the service-area street map's data from SITE:
 * each town in SITE.serviceAreas gets its real boundary from OpenStreetMap,
 * and SITE.serviceRadius its circle's centre. Writes
 *
 *   src/data/service-area-geo.json    the town outlines
 *   src/data/service-radius.json      the radius circle, or null
 *   src/data/service-area-geo.cache.json   lookups already made (commit it)
 *
 * Run it after changing `serviceAreas`, `serviceRadius` or the address
 * region in src/config/site.ts, and commit the three files. Only towns
 * missing from the cache hit the network (one request a second, per
 * Nominatim's policy). `MAP_OFFLINE=1` uses the cache only: a town it
 * lacks is skipped with a warning. A lookup that fails (no connection)
 * warns and leaves the existing files untouched, exit 0.
 *
 * Reads site.ts directly: Node 26 strips its types, and site.ts imports
 * nothing at runtime but site.shared.mjs (check:config enforces that).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SITE } from "../src/config/site.ts";
import { buildMap } from "./lib/service-area-geo.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "src", "data");

const { geo, radius, failed } = await buildMap({
  areas: [...SITE.serviceAreas],
  radius: SITE.serviceRadius,
  region: SITE.address.region,
  cacheFile: path.join(DATA, "service-area-geo.cache.json"),
  warn: (message) => console.warn(`! ${message}`),
  offline: process.env.MAP_OFFLINE === "1",
  // Test seam (scripts/check-map.mjs): every network lookup fails.
  fetchGeometry:
    process.env.MAP_FAIL_LOOKUP === "1"
      ? async () => {
          throw new Error("lookup forced to fail");
        }
      : undefined,
});
if (failed) {
  // A lost connection is "offline": keep what's there, don't fail.
  console.warn(
    "! Map files left as they were (src/data/service-area-geo*.json, service-radius.json): a lookup failed, see above. Run `npm run map` again when online.",
  );
  process.exit(0);
}
await fs.writeFile(
  path.join(DATA, "service-area-geo.json"),
  `${JSON.stringify(geo)}\n`,
);
await fs.writeFile(
  path.join(DATA, "service-radius.json"),
  `${JSON.stringify(radius)}\n`,
);
console.log(
  `Map: ${geo.length} of ${SITE.serviceAreas.length} towns outlined${radius ? `, ${radius.miles}-mile radius` : ""}.`,
);
