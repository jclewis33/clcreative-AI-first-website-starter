#!/usr/bin/env node
// @ts-check
/**
 * check-config-sync-cases — proves scripts/check-config-sync.mjs catches
 * drift, by running it (`--root`) against small fixture projects in the
 * OS temp dir: wrangler.jsonc vars against the WRANGLER_VARS exports, and
 * public/_headers against SECURITY_HEADERS.
 *
 * Usage: node scripts/check-config-sync-cases.mjs (part of npm run check:config)
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = path.join(REPO, "scripts", "check-config-sync.mjs");
const HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": "frame-ancestors https://editor.example",
};
/** @type {string[]} */
const roots = [];

/**
 * A fixture project: the real headers.shared.mjs, a stand-in CMS seam and
 * a stand-in add-on module that exports WRANGLER_VARS.
 * `previews` (when given) is the Worker Previews block's `vars`.
 * @param {{ frameAncestors?: string[], vars?: Record<string, string>, previews?: Record<string, string>, headers?: Record<string, string> }} [options]
 */
function project({
  frameAncestors = ["https://editor.example"],
  vars = { PUBLIC_DEMO_ID: "demo" },
  previews,
  headers = HEADERS,
} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "config-sync-"));
  roots.push(root);
  const write = (/** @type {string} */ rel, /** @type {string} */ text) => {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, text);
  };
  write(
    "src/config/headers.shared.mjs",
    fs.readFileSync(path.join(REPO, "src/config/headers.shared.mjs"), "utf8"),
  );
  write(
    "src/config/cms.shared.mjs",
    `export const FRAME_ANCESTORS = ${JSON.stringify(frameAncestors)};\nexport const PREVIEW_COOKIE = null;\n`,
  );
  write(
    "src/config/addon.shared.mjs",
    `export const WRANGLER_VARS = { PUBLIC_DEMO_ID: "demo" };\n`,
  );
  write(
    "wrangler.jsonc",
    `{\n  // Fixture.\n  "name": "fixture",\n  "vars": ${JSON.stringify(vars)},\n${
      previews ? `  "previews": { "vars": ${JSON.stringify(previews)} },\n` : ""
    }}\n`,
  );
  write(
    "public/_headers",
    `# Fixture.\n/*\n${Object.entries(headers)
      .map(([k, v]) => `  ${k}: ${v}`)
      .join("\n")}\n`,
  );
  return root;
}

const check = (/** @type {string} */ root) =>
  spawnSync(process.execPath, [CHECK, "--root", root], { encoding: "utf8" });
const passes = (/** @type {string} */ root) => {
  const r = check(root);
  assert.equal(r.status, 0, r.stderr);
};
const fails = (/** @type {string} */ root, /** @type {RegExp} */ pattern) => {
  const r = check(root);
  assert.equal(r.status, 1, `expected a failure matching ${pattern}`);
  assert.match(r.stderr, pattern);
};

// In sync. A var of the fork's own (in no WRANGLER_VARS) is fine.
passes(project({ vars: { PUBLIC_DEMO_ID: "demo", CF_ACCESS_AUD: "x" } }));
// No frame ancestors means only the site itself may frame its pages.
passes(
  project({
    frameAncestors: [],
    headers: {
      ...HEADERS,
      "Content-Security-Policy": "frame-ancestors 'self'",
    },
  }),
);
// A var that drifted, and one that is missing.
fails(
  project({ vars: { PUBLIC_DEMO_ID: "other" } }),
  /vars\.PUBLIC_DEMO_ID: "other", expected "demo" \(from src\/config\/addon\.shared\.mjs\)/,
);
fails(project({ vars: {} }), /vars\.PUBLIC_DEMO_ID: "\(unset\)"/);
// Worker Previews inherit nothing: with a previews block, its vars must match too.
passes(project({ previews: { PUBLIC_DEMO_ID: "demo" } }));
fails(
  project({ previews: {} }),
  /previews\.vars\.PUBLIC_DEMO_ID: "\(unset\)", expected "demo"/,
);
// public/_headers drifting from the code: another source's CSP, a dropped header.
fails(
  project({
    headers: {
      ...HEADERS,
      "Content-Security-Policy": "frame-ancestors 'self'",
    },
  }),
  /Content-Security-Policy: "frame-ancestors 'self'", expected "frame-ancestors https:\/\/editor\.example"/,
);
const { "Permissions-Policy": _dropped, ...withoutOne } = HEADERS;
fails(project({ headers: withoutOne }), /Permissions-Policy: "\(missing\)"/);

for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
console.log("check-config-sync-cases: ok");
