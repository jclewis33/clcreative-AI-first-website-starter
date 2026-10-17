#!/usr/bin/env node
// @ts-check
/**
 * check-addon-installer — tests for scripts/lib/jsonc.mjs and the add-on
 * installer (scripts/lib/addon-install.mjs and its CLI,
 * scripts/addon-sanity.mjs), against throwaway fixture projects in the OS
 * temp dir. Merged config files must come out Prettier-clean under this
 * repo's config, so format:check stays green after an install. The real
 * Sanity add-on is exercised end to end by scripts/check-addon-sanity.mjs.
 *
 * Usage: npm run check:addon-installer   (needs git)
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as prettier from "prettier";
import { parseJsonc, setMembers, tokenize } from "./lib/jsonc.mjs";
import { AddonError, applyPlan, planInstall } from "./lib/addon-install.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/** @type {string[]} */
const temps = [];

/** Prettier-clean under the repo's config, as `format:check` would see it. */
async function assertPrettier(
  /** @type {string} */ text,
  /** @type {string} */ filepath,
) {
  const config =
    (await prettier.resolveConfig(path.join(REPO, filepath))) ?? {};
  assert.ok(
    await prettier.check(text, { ...config, filepath }),
    `${filepath} is not Prettier-formatted:\n${text}`,
  );
}

/* ── jsonc ─────────────────────────────────────────────────────────────── */

// Comments, trailing commas, and strings holding comment and bracket characters.
assert.deepEqual(
  parseJsonc(
    '{ "url": "https://x.dev/{a}//b", /* c */ "n": 1, // d\n "list": [1, 2,], }',
  ),
  { url: "https://x.dev/{a}//b", n: 1, list: [1, 2] },
);
assert.throws(() => tokenize('{ "a": "unterminated }'), /Unterminated string/);

const WRANGLER = `{
  // Worker name.
  "name": "site",
  // Public vars.
  "vars": {},
  "assets": { "directory": "./dist" },
}
`;

// Into an empty object: own lines, comment above, a comma after each (.jsonc).
{
  const { text, changed } = setMembers(
    WRANGLER,
    "vars",
    { PUBLIC_A: "a", PUBLIC_B: "b" },
    { trailingCommas: true, comment: "Added by the demo add-on." },
  );
  assert.deepEqual(changed, ["added PUBLIC_A", "added PUBLIC_B"]);
  assert.equal(
    text,
    `{
  // Worker name.
  "name": "site",
  // Public vars.
  "vars": {
    // Added by the demo add-on.
    "PUBLIC_A": "a",
    "PUBLIC_B": "b",
  },
  "assets": { "directory": "./dist" },
}
`,
  );
  await assertPrettier(text, "wrangler.jsonc");
  // A second merge changes nothing.
  assert.deepEqual(
    setMembers(
      text,
      "vars",
      { PUBLIC_A: "a", PUBLIC_B: "b" },
      { trailingCommas: true },
    ),
    { text, changed: [] },
  );
  // A different value is replaced in place; everything else stays.
  const updated = setMembers(
    text,
    "vars",
    { PUBLIC_A: "z" },
    { trailingCommas: true },
  );
  assert.deepEqual(updated.changed, ["updated PUBLIC_A"]);
  assert.equal(parseJsonc(updated.text).vars.PUBLIC_A, "z");
  assert.equal(
    updated.text,
    text.replace('"PUBLIC_A": "a"', '"PUBLIC_A": "z"'),
  );
}

// After a last member with no comma and a trailing comment.
{
  const src = `{\n  "vars": {\n    "KEEP": "1" // kept\n  },\n}\n`;
  const { text } = setMembers(
    src,
    "vars",
    { NEW: "2" },
    { trailingCommas: true },
  );
  assert.equal(
    text,
    `{\n  "vars": {\n    "KEEP": "1", // kept\n    "NEW": "2",\n  },\n}\n`,
  );
}

// A missing member is created before the root's closing brace.
{
  const src = `{\n  "name": "site",\n}\n`;
  const { text, changed } = setMembers(
    src,
    "vars",
    { A: "a" },
    { trailingCommas: true },
  );
  assert.deepEqual(changed, ["added A"]);
  assert.equal(
    text,
    `{\n  "name": "site",\n  "vars": {\n    "A": "a",\n  },\n}\n`,
  );
  await assertPrettier(text, "wrangler.jsonc");
}

// .json (tsconfig.json): no trailing commas; arrays on one line.
{
  const src = `{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "types": [],
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
`;
  const { text, changed } = setMembers(
    src,
    "compilerOptions",
    { jsx: "react-jsx", types: ["demo/module"] },
    { trailingCommas: false },
  );
  assert.deepEqual(changed, ["added jsx", "updated types"]);
  assert.equal(
    text,
    `{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "types": ["demo/module"],
    "paths": {
      "@/*": ["./src/*"]
    },
    "jsx": "react-jsx"
  }
}
`,
  );
  await assertPrettier(text, "tsconfig.json");
}

/* ── installer ─────────────────────────────────────────────────────────── */

const git = (/** @type {string} */ cwd, /** @type {string[]} */ ...args) =>
  execFileSync(
    "git",
    [
      "-c",
      "user.name=check",
      "-c",
      "user.email=check@example.invalid",
      ...args,
    ],
    { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );

/**
 * A committed fixture project with a demo add-on at addons/sanity/ (the
 * folder the CLI reads).
 * @param {{ withCli?: boolean }} [options]
 */
function fixture({ withCli = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "addon-installer-"));
  temps.push(root);
  const write = (/** @type {string} */ rel, /** @type {string} */ text) => {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  };
  const json = (/** @type {unknown} */ value) =>
    `${JSON.stringify(value, null, 2)}\n`;
  write(
    "package.json",
    json({
      name: "fixture",
      scripts: { build: "astro build" },
      dependencies: { astro: "^7.0.0", gsap: "^3.0.0" },
      devDependencies: { prettier: "^3.0.0" },
    }),
  );
  write("wrangler.jsonc", WRANGLER);
  write(
    "tsconfig.json",
    `{\n  "compilerOptions": {\n    "types": []\n  }\n}\n`,
  );
  write(".env.example", "SITE_URL=https://www.example.com\n");
  write(".gitignore", "node_modules/\n");
  write("public/_headers", "files version\n");
  write("src/old.txt", "remove me\n");
  write(
    "addons/sanity/manifest.json",
    json({
      name: "Demo",
      marker: "src/demo/marker.ts",
      dependencies: { react: "^19.0.0" },
      devDependencies: { "csv-parse": "^6.0.0" },
      scripts: { studio: "demo dev" },
      wrangler: { vars: { PUBLIC_DEMO_ID: "demo" }, comment: "Demo add-on." },
      tsconfig: { jsx: "react-jsx", types: ["demo/module"] },
      env: ["# Demo add-on", "PUBLIC_DEMO_ID=", "DEMO_TOKEN="],
      gitignore: ["# Demo add-on", ".demo/", "node_modules/"],
      delete: ["src/old.txt"],
      nextSteps: ["npm install"],
    }),
  );
  write("addons/sanity/files/src/demo/marker.ts", "export {};\n");
  write("addons/sanity/files/public/_headers", "demo version\n");
  write("addons/sanity/files/node_modules/skip.js", "skipped\n");
  write("addons/sanity/files/.DS_Store", "skipped\n");
  if (withCli)
    for (const rel of [
      "scripts/addon-sanity.mjs",
      "scripts/lib/addon-install.mjs",
      "scripts/lib/jsonc.mjs",
    ])
      write(rel, fs.readFileSync(path.join(REPO, rel), "utf8"));
  git(root, "init", "-q");
  git(root, "add", "-A");
  git(root, "commit", "-qm", "fixture");
  return { root, addonDir: path.join(root, "addons", "sanity") };
}
const refused =
  (/** @type {RegExp} */ pattern) => (/** @type {unknown} */ err) =>
    err instanceof AddonError && pattern.test(err.message);

// Planning lists every write and touches nothing.
{
  const { root, addonDir } = fixture();
  const plan = planInstall({ root, addonDir });
  assert.deepEqual(plan.writes.map((w) => `${w.action} ${w.path}`).sort(), [
    "add src/demo/marker.ts",
    "overwrite public/_headers",
    "update .env.example",
    "update .gitignore",
    "update package.json",
    "update tsconfig.json",
    "update wrangler.jsonc",
  ]);
  assert.deepEqual(plan.deletes, ["src/old.txt"]);
  assert.equal(git(root, "status", "--porcelain"), "");
}

// Installing produces the expected merge.
{
  const { root, addonDir } = fixture();
  applyPlan(root, planInstall({ root, addonDir }));
  const read = (/** @type {string} */ rel) =>
    fs.readFileSync(path.join(root, rel), "utf8");
  const pkg = JSON.parse(read("package.json"));
  assert.deepEqual(pkg.dependencies, {
    astro: "^7.0.0",
    gsap: "^3.0.0",
    react: "^19.0.0",
  });
  assert.deepEqual(Object.keys(pkg.dependencies), ["astro", "gsap", "react"]);
  assert.deepEqual(Object.keys(pkg.devDependencies), ["csv-parse", "prettier"]);
  assert.deepEqual(pkg.scripts, { build: "astro build", studio: "demo dev" });
  await assertPrettier(read("package.json"), "package.json");
  const wrangler = read("wrangler.jsonc");
  assert.deepEqual(parseJsonc(wrangler).vars, { PUBLIC_DEMO_ID: "demo" });
  assert.match(wrangler, /\/\/ Worker name\.\n[\s\S]*\/\/ Demo add-on\.\n/);
  await assertPrettier(wrangler, "wrangler.jsonc");
  assert.deepEqual(parseJsonc(read("tsconfig.json")).compilerOptions, {
    types: ["demo/module"],
    jsx: "react-jsx",
  });
  await assertPrettier(read("tsconfig.json"), "tsconfig.json");
  assert.equal(
    read(".env.example"),
    "SITE_URL=https://www.example.com\n\n# Demo add-on\nPUBLIC_DEMO_ID=\nDEMO_TOKEN=\n",
  );
  assert.equal(read(".gitignore"), "node_modules/\n\n# Demo add-on\n.demo/\n");
  assert.equal(read("public/_headers"), "demo version\n");
  assert.equal(read("src/demo/marker.ts"), "export {};\n");
  assert.ok(!fs.existsSync(path.join(root, "src/old.txt")));
  assert.ok(!fs.existsSync(path.join(root, "node_modules/skip.js")));
  assert.ok(!fs.existsSync(path.join(root, ".DS_Store")));
  // A second run refuses (before the clean-tree check: the tree is dirty now).
  assert.throws(
    () => planInstall({ root, addonDir }),
    refused(/already installed/),
  );
}

// A dirty tree refuses, naming the change; force proceeds.
{
  const { root, addonDir } = fixture();
  fs.appendFileSync(path.join(root, ".env.example"), "LOCAL=1\n");
  assert.throws(
    () => planInstall({ root, addonDir }),
    refused(/uncommitted changes:[\s\S]*\.env\.example[\s\S]*--force/),
  );
  assert.ok(planInstall({ root, addonDir, force: true }).writes.length > 0);
}

// Not a git repository (a zip download): refuses unless forced.
{
  const { root, addonDir } = fixture();
  fs.rmSync(path.join(root, ".git"), { recursive: true, force: true });
  assert.throws(
    () => planInstall({ root, addonDir }),
    refused(/not a git repository[\s\S]*--force/),
  );
  assert.ok(planInstall({ root, addonDir, force: true }).writes.length > 0);
}

// No add-on folder (a fork that deleted addons/).
{
  const { root } = fixture();
  assert.throws(
    () => planInstall({ root, addonDir: path.join(root, "addons", "missing") }),
    refused(/manifest\.json not found[\s\S]*Copy the add-on folder/),
  );
}

// An overlay must not carry a file the manifest merges.
{
  const { root, addonDir } = fixture();
  fs.writeFileSync(path.join(addonDir, "files", "package.json"), "{}\n");
  git(root, "add", "-A");
  git(root, "commit", "-qm", "bad overlay");
  assert.throws(
    () => planInstall({ root, addonDir }),
    refused(/must not contain package\.json/),
  );
}

// The CLI: a dry run writes nothing; install; a second run exits 1.
{
  const { root } = fixture({ withCli: true });
  const run = (/** @type {string[]} */ ...args) =>
    spawnSync(process.execPath, ["scripts/addon-sanity.mjs", ...args], {
      cwd: root,
      encoding: "utf8",
    });
  const dry = run("--dry-run");
  assert.equal(dry.status, 0, dry.stderr);
  assert.match(dry.stdout, /overwrite\s+public\/_headers/);
  assert.match(dry.stdout, /Nothing written/);
  assert.equal(git(root, "status", "--porcelain"), "");
  const first = run();
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /Demo add-on installed[\s\S]*1\. npm install/);
  const second = run();
  assert.equal(second.status, 1);
  assert.match(
    second.stderr,
    /^✗ addon:sanity: the Demo add-on is already installed/,
  );
}

for (const dir of temps) fs.rmSync(dir, { recursive: true, force: true });
console.log("check-addon-installer: ok");
