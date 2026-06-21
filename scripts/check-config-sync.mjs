#!/usr/bin/env node
/**
 * Guards the one config file that CAN'T import the shared constants.
 *
 * `src/config/site.shared.mjs` is the single source of truth for the Sanity
 * project id / dataset, and every config file imports it — except
 * `wrangler.jsonc`, which is JSON and can't import. Its `vars` block therefore
 * carries literal copies. This script asserts those literals still match the
 * shared module, so a fork (or an edit to one and not the other) can't silently
 * drift the Worker's runtime env away from the build/app config.
 *
 * Run: `node scripts/check-config-sync.mjs` (wired into `npm run check:config`).
 * Exits non-zero with a clear message on any mismatch.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  SANITY_PROJECT_ID,
  SANITY_DATASET,
} from "../src/config/site.shared.mjs";

const wranglerPath = fileURLToPath(new URL("../wrangler.jsonc", import.meta.url));
const raw = readFileSync(wranglerPath, "utf8");

// Strip // line comments and /* */ block comments so JSON.parse accepts JSONC.
// (Naive but sufficient: wrangler.jsonc has no string literals containing `//`.)
const stripped = raw
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1")
  .replace(/,(\s*[}\]])/g, "$1"); // tolerate trailing commas

let wrangler;
try {
  wrangler = JSON.parse(stripped);
} catch (err) {
  console.error(`✗ check-config-sync: could not parse wrangler.jsonc — ${err.message}`);
  process.exit(1);
}

const vars = wrangler.vars ?? {};

const expected = {
  PUBLIC_SANITY_PROJECT_ID: SANITY_PROJECT_ID,
  PUBLIC_SANITY_DATASET: SANITY_DATASET,
};

const mismatches = Object.entries(expected).filter(
  ([key, want]) => vars[key] !== want,
);

if (mismatches.length) {
  console.error(
    "✗ check-config-sync: wrangler.jsonc `vars` are out of sync with src/config/site.shared.mjs:",
  );
  for (const [key, want] of mismatches) {
    console.error(`    ${key}: wrangler="${vars[key] ?? "(unset)"}" expected="${want}"`);
  }
  console.error(
    "  Fix: update the `vars` block in wrangler.jsonc to match site.shared.mjs (the canonical source).",
  );
  process.exit(1);
}

console.log("✓ check-config-sync: wrangler.jsonc matches site.shared.mjs");
