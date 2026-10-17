#!/usr/bin/env node
// @ts-check
/**
 * check-config-sync — guards the config files that can't import the
 * shared constants because they aren't JavaScript, so a fork (or an edit
 * to one side only) can't silently drift them apart:
 *
 *   wrangler.jsonc `vars` — every `WRANGLER_VARS` export of a
 *     src/config/*.shared.mjs module (a content add-on's project ids, for
 *     one) must be there with the same value. Other vars are the fork's
 *     own and are left alone. When the file has a `previews` block (Worker
 *     Previews, which inherit nothing from the top level), the same vars
 *     must be in `previews.vars` too.
 *   public/_headers — its `/*` block must send every header in
 *     SECURITY_HEADERS (src/config/headers.shared.mjs) with the same
 *     value, so prerendered pages (served straight from the assets
 *     binding) and SSR responses (src/middleware.ts) carry the same set.
 *
 * Run: npm run check:config (and automatically as `prebuild`).
 * `--root <dir>` checks another project tree (check-config-sync-cases.mjs).
 * Exits 1 naming every mismatch.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseJsonc } from "./lib/jsonc.mjs";

const args = process.argv.slice(2);
const rootAt = args.indexOf("--root");
const ROOT = path.resolve(rootAt >= 0 ? args[rootAt + 1] : process.cwd());
const CONFIG = path.join(ROOT, "src", "config");
/** @type {string[]} */
const problems = [];

/**
 * The headers under one path-pattern line (e.g. "/*") of a _headers file,
 * keyed by lower-cased name.
 * @param {string} text
 * @param {string} pattern
 */
function headerBlock(text, pattern) {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.trimEnd() === pattern);
  if (start === -1) return null;
  /** @type {Map<string, string>} */
  const block = new Map();
  for (const line of lines.slice(start + 1)) {
    if (!/^\s+\S/.test(line)) break;
    const colon = line.indexOf(":");
    block.set(
      line.slice(0, colon).trim().toLowerCase(),
      line.slice(colon + 1).trim(),
    );
  }
  return block;
}

/* 1. wrangler.jsonc vars against every WRANGLER_VARS export. */
/** @type {Map<string, { value: string, from: string }>} */
const expectedVars = new Map();
const sharedModules = fs
  .readdirSync(CONFIG)
  .filter((f) => f.endsWith(".shared.mjs"))
  .sort();
for (const file of sharedModules) {
  const mod = await import(pathToFileURL(path.join(CONFIG, file)).href);
  for (const [name, value] of Object.entries(mod.WRANGLER_VARS ?? {}))
    expectedVars.set(name, {
      value: String(value),
      from: `src/config/${file}`,
    });
}
/** @type {Array<[string, Record<string, unknown>]>} */
const varBlocks = [];
try {
  const wrangler = parseJsonc(
    fs.readFileSync(path.join(ROOT, "wrangler.jsonc"), "utf8"),
  );
  varBlocks.push(["vars", wrangler.vars ?? {}]);
  if (wrangler.previews)
    varBlocks.push(["previews.vars", wrangler.previews.vars ?? {}]);
} catch (err) {
  problems.push(
    `wrangler.jsonc could not be parsed: ${/** @type {Error} */ (err).message}`,
  );
}
for (const [label, vars] of varBlocks)
  for (const [name, { value, from }] of expectedVars)
    if (vars[name] !== value)
      problems.push(
        `wrangler.jsonc ${label}.${name}: "${vars[name] ?? "(unset)"}", expected "${value}" (from ${from})`,
      );

/* 2. public/_headers against SECURITY_HEADERS. */
const { SECURITY_HEADERS } = await import(
  pathToFileURL(path.join(CONFIG, "headers.shared.mjs")).href
);
const block = headerBlock(
  fs.readFileSync(path.join(ROOT, "public", "_headers"), "utf8"),
  "/*",
);
if (!block) problems.push('public/_headers has no "/*" block');
else
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    const got = block.get(name.toLowerCase());
    if (got !== value)
      problems.push(
        `public/_headers ${name}: "${got ?? "(missing)"}", expected "${value}" (from src/config/headers.shared.mjs)`,
      );
  }

if (problems.length) {
  console.error(
    "✗ check-config-sync: config files out of sync with src/config:",
  );
  for (const problem of problems) console.error(`    ${problem}`);
  console.error(
    "  Fix: copy the expected value into the file named. The .mjs module is the source of truth.",
  );
  process.exit(1);
}
console.log(
  `✓ check-config-sync: wrangler.jsonc vars (${expectedVars.size}) and public/_headers (${Object.keys(SECURITY_HEADERS).length} headers) match src/config`,
);
