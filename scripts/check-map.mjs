#!/usr/bin/env node
// @ts-check
/**
 * check-map — proves `npm run map` builds the service-area map files from
 * SITE without touching the network, in a scratch copy of this repo (so the
 * real generated files and cache are never changed):
 *
 *   - with a cache holding the three default towns, MAP_OFFLINE=1 exits 0
 *     and writes 3 outlines to src/data/service-area-geo.json
 *   - SITE.serviceRadius is resolved from the same cache into
 *     src/data/service-radius.json (centre of the town's outline)
 *   - one extra town that is not in the cache prints a warning naming it,
 *     still exits 0, and the 3 outlines stay
 *
 * Usage: npm run check:map
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildMap } from "./lib/service-area-geo.mjs";
import { requireGitRepo, scratchCopy } from "./lib/scratch.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
requireGitRepo(REPO, "npm run check:map");

const dir = scratchCopy(REPO);
const file = (/** @type {string} */ rel) => path.join(dir, rel);
const json = (/** @type {string} */ rel) =>
  JSON.parse(fs.readFileSync(file(rel), "utf8"));
const map = () =>
  spawnSync(process.execPath, ["scripts/map.mjs"], {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, MAP_OFFLINE: "1" },
  });
const out = (
  /** @type {import("node:child_process").SpawnSyncReturns<string>} */ r,
) => `${r.stdout}\n${r.stderr}`;

try {
  const site = fs.readFileSync(file("src/config/site.ts"), "utf8");
  const region = /region: "([^"]+)"/.exec(site)?.[1];
  const towns = /serviceAreas: \[([^\]]*)\]/
    .exec(site)?.[1]
    .match(/"([^"]+)"/g)
    ?.map((t) => t.slice(1, -1));
  assert.ok(region && towns?.length === 3, "expected 3 default towns in SITE");

  // A cache holding the three default towns, each a square.
  const cache = Object.fromEntries(
    towns.map((town, i) => [
      `${town}, ${region}`,
      {
        type: "Polygon",
        coordinates: [
          [
            [-97 + i, 30],
            [-96.9 + i, 30],
            [-96.9 + i, 30.1],
            [-97 + i, 30.1],
            [-97 + i, 30],
          ],
        ],
      },
    ]),
  );
  fs.writeFileSync(
    file("src/data/service-area-geo.cache.json"),
    `${JSON.stringify(cache)}\n`,
  );

  // The three cached towns: exit 0, three outlines, no radius.
  {
    const r = map();
    assert.equal(r.status, 0, out(r));
    assert.equal(json("src/data/service-area-geo.json").length, 3);
    assert.equal(json("src/data/service-radius.json"), null);
    console.log("ok    three cached towns build three outlines offline");
  }

  // A radius whose centre is a cached town resolves to its outline's middle.
  {
    fs.writeFileSync(
      file("src/config/site.ts"),
      site.replace(
        /(\n  serviceRadius: )null( as \{)/,
        `$1{ center: ${JSON.stringify(towns[0])}, miles: 25 }$2`,
      ),
    );
    const r = map();
    assert.equal(r.status, 0, out(r));
    assert.deepEqual(json("src/data/service-radius.json"), {
      lat: 30.05,
      lng: -96.95,
      miles: 25,
    });
    console.log("ok    SITE.serviceRadius resolves from the cache");
  }

  // One town the cache lacks: a warning naming it, exit 0, the 3 stay.
  {
    fs.writeFileSync(
      file("src/config/site.ts"),
      site.replace(/(serviceAreas: \[[^\]]*)\]/, `$1, "Zz Uncached Town"]`),
    );
    const r = map();
    assert.equal(r.status, 0, out(r));
    assert.match(r.stderr, /Zz Uncached Town/);
    assert.equal(json("src/data/service-area-geo.json").length, 3);
    console.log("ok    an uncached town warns by name and keeps the other 3");
  }

  // A lookup that fails (lost connection): exit 0, a warning, files untouched.
  {
    fs.writeFileSync(file("src/config/site.ts"), site);
    const names = [
      "src/data/service-area-geo.json",
      "src/data/service-radius.json",
      "src/data/service-area-geo.cache.json",
    ];
    const before = names.map((n) => fs.readFileSync(file(n), "utf8"));
    fs.writeFileSync(
      file("src/config/site.ts"),
      site.replace(/(serviceAreas: \[[^\]]*)\]/, `$1, "Zz Uncached Town"]`),
    );
    const r = spawnSync(process.execPath, ["scripts/map.mjs"], {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, MAP_FAIL_LOOKUP: "1" },
    });
    assert.equal(r.status, 0, out(r));
    assert.match(r.stderr, /lookup forced to fail/);
    assert.match(r.stderr, /Map files left as they were/);
    assert.deepEqual(
      names.map((n) => fs.readFileSync(file(n), "utf8")),
      before,
    );
    console.log("ok    a failed lookup keeps the map files and exits 0");
  }

  // A failed lookup warns by name and leaves the other result intact
  // (in-process, with a stub in place of the network).
  {
    const cacheFile = file("zz-map-cache.json");
    const square = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
        ],
      ],
    };
    fs.writeFileSync(
      cacheFile,
      JSON.stringify({ "A, ST": square, "Hub, ST": square }),
    );
    const boom = async () => {
      throw new Error("stub network down");
    };
    const base = { areas: ["A"], region: "ST", cacheFile, fetchGeometry: boom };

    // Radius centre uncached: outlines survive, the warning names the radius.
    let warnings = /** @type {string[]} */ ([]);
    let r = await buildMap({
      ...base,
      radius: { center: "Elsewhere", miles: 5 },
      warn: (m) => warnings.push(m),
    });
    assert.equal(r.geo.length, 1);
    assert.equal(r.radius, null);
    assert.equal(r.failed, true);
    assert.match(warnings.join("\n"), /Service radius skipped.*stub network/);

    // An area uncached: the radius survives, the warning names the outlines.
    warnings = [];
    r = await buildMap({
      ...base,
      areas: ["Elsewhere"],
      radius: { center: "Hub", miles: 5 },
      warn: (m) => warnings.push(m),
    });
    assert.equal(r.geo.length, 0);
    assert.deepEqual(r.radius, { lat: 0.5, lng: 0.5, miles: 5 });
    assert.match(warnings.join("\n"), /outlines skipped.*stub network/);
    console.log("ok    a failed lookup warns by name; the other result stays");
  }
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log("\nAll map cases pass.");
