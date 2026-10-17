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

try {
  /* ── jsonc ─────────────────────────────────────────────────────────────── */

  // Comments, trailing commas, and strings holding comment and bracket characters.
  assert.deepEqual(
    parseJsonc(
      '{ "url": "https://x.dev/{a}//b", /* c */ "n": 1, // d\n "list": [1, 2,], }',
    ),
    { url: "https://x.dev/{a}//b", n: 1, list: [1, 2] },
  );
  assert.throws(
    () => tokenize('{ "a": "unterminated }'),
    /Unterminated string/,
  );

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

  // Values print as Prettier prints them, in .jsonc and .json alike.
  for (const [file, trailingCommas] of /** @type {const} */ ([
    ["wrangler.jsonc", true],
    ["tsconfig.json", false],
  ])) {
    const src = trailingCommas
      ? WRANGLER
      : `{\n  "name": "site",\n  "vars": {},\n  "assets": { "directory": "./dist" }\n}\n`;
    const values = {
      LIST: ["a", "b"],
      LONG: [
        "aaaaaaaaaaaaaaaaaaaa",
        "bbbbbbbbbbbbbbbbbbbbbbb",
        "cccccccccccccccccccccc",
        "dddd",
      ],
      NUMBERS: Array.from({ length: 40 }, (_, i) => i + 1),
      PAIRS: [
        [1, 2],
        [3, 4],
      ],
      OBJECTS: [{ a: 1 }, { b: 2 }],
      NESTED: { "@/*": ["./src/*"], deep: { x: [1, "y"] } },
      EMPTY: { list: [], object: {} },
    };
    const added = setMembers(src, "vars", values, { trailingCommas });
    assert.deepEqual(parseJsonc(added.text).vars, values);
    await assertPrettier(added.text, file);
    if (trailingCommas)
      assert.match(added.text, /\n    "LIST": \["a", "b"\],\n/);
    // Updating each in place prints the same way.
    const reversed = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [
        k,
        Array.isArray(v) ? [...v].reverse() : { ...v, extra: [true, null] },
      ]),
    );
    const updated = setMembers(added.text, "vars", reversed, {
      trailingCommas,
    });
    assert.deepEqual(parseJsonc(updated.text).vars, reversed);
    await assertPrettier(updated.text, file);
    // Into a one-line object: expanded, one member per line.
    const inline = setMembers(
      src,
      "assets",
      { binding: "ASSETS", list: ["x", "y"] },
      { trailingCommas },
    );
    assert.equal(
      inline.text,
      src.replace(
        '"assets": { "directory": "./dist" }',
        trailingCommas
          ? '"assets": {\n    "directory": "./dist",\n    "binding": "ASSETS",\n    "list": ["x", "y"],\n  }'
          : '"assets": {\n    "directory": "./dist",\n    "binding": "ASSETS",\n    "list": ["x", "y"]\n  }',
      ),
    );
    await assertPrettier(inline.text, file);
  }

  // A one-line root object gains a member.
  {
    const { text } = setMembers(
      `{ "name": "site" }\n`,
      "vars",
      { A: "a" },
      { trailingCommas: true },
    );
    assert.equal(
      text,
      `{\n  "name": "site",\n  "vars": {\n    "A": "a",\n  },\n}\n`,
    );
    await assertPrettier(text, "wrangler.jsonc");
  }

  // Updating and adding in one call inside a one-line object.
  {
    const src = `{\n  "vars": { "A": "1", "C": "3" },\n  "name": "site",\n}\n`;
    const { text, changed } = setMembers(
      src,
      "vars",
      { A: "changed-longer-value", B: "2" },
      { trailingCommas: true },
    );
    assert.deepEqual(changed, ["updated A", "added B"]);
    assert.equal(
      text,
      `{\n  "vars": {\n    "A": "changed-longer-value",\n    "C": "3",\n    "B": "2",\n  },\n  "name": "site",\n}\n`,
    );
    await assertPrettier(text, "wrangler.jsonc");
  }

  // One-line containers, re-printed whole: Prettier-clean in both formats.
  for (const [file, trailingCommas] of /** @type {const} */ ([
    ["wrangler.jsonc", true],
    ["tsconfig.json", false],
  ])) {
    // Sources already Prettier-clean for their format.
    const c = trailingCommas ? "," : "";
    for (const [src, entries] of /** @type {const} */ ([
      [
        `{\n  "vars": { "A": "1", "C": "3" },\n  "name": "site"${c}\n}\n`,
        { A: "x", B: "2" },
      ],
      [`{ "vars": { "A": "1" } }\n`, { A: "1", B: "2" }],
      [`{ "vars": { "A": "1" } }\n`, { A: "2" }],
      [`{ "vars": {} }\n`, { B: "2" }],
      [`{ "name": "site", "assets": { "dir": "./d" } }\n`, { B: ["x", "y"] }],
      [`{\n  "vars": { "A": "1" }${c}\n}\n`, { A: { deep: [1, 2] }, B: "2" }],
      [`{ "vars": { "A": "1" } }\n`, { A: { deep: { x: "y" } } }],
    ])) {
      const { text } = setMembers(src, "vars", entries, {
        trailingCommas,
        comment: "Added.",
      });
      assert.deepEqual(parseJsonc(text).vars, {
        ...parseJsonc(src).vars,
        ...entries,
      });
      await assertPrettier(text, file);
    }
  }

  // A one-line object holding a comment is refused, not mangled.
  assert.throws(
    () =>
      setMembers(
        `{\n  "vars": { "A": "a" /* why */ },\n}\n`,
        "vars",
        { B: "b" },
        { trailingCommas: true },
      ),
    /holds a comment/,
  );

  // CRLF files stay CRLF.
  {
    const crlf = WRANGLER.replace(/\n/g, "\r\n");
    const { text } = setMembers(
      crlf,
      "vars",
      { PUBLIC_A: "a" },
      { trailingCommas: true },
    );
    assert.ok(!/[^\r]\n/.test(text), "a bare LF crept into a CRLF file");
    assert.equal(
      text,
      setMembers(
        WRANGLER,
        "vars",
        { PUBLIC_A: "a" },
        { trailingCommas: true },
      ).text.replace(/\n/g, "\r\n"),
    );
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
        "-c",
        "core.autocrlf=false",
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
    assert.deepEqual(Object.keys(pkg.devDependencies), [
      "csv-parse",
      "prettier",
    ]);
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
    assert.equal(
      read(".gitignore"),
      "node_modules/\n\n# Demo add-on\n.demo/\n",
    );
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
      () =>
        planInstall({ root, addonDir: path.join(root, "addons", "missing") }),
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

  /**
   * A fixture whose manifest is changed by `patch`, committed.
   * @param {(manifest: any) => void} patch
   */
  function fixtureWith(patch) {
    const made = fixture();
    const file = path.join(made.addonDir, "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
    patch(manifest);
    fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
    git(made.root, "add", "-A");
    git(made.root, "commit", "-qm", "patched manifest");
    return made;
  }

  // Paths that leave the project, are the project, or enter .git refuse.
  for (const [rel, pattern] of /** @type {const} */ ([
    ["", /not a path inside the project/],
    [".", /not a path inside the project/],
    ["./", /not a path inside the project/],
    ["../outside", /not a path inside the project/],
    ["src/../../outside", /not a path inside the project/],
    ["/etc/hosts", /not a path inside the project/],
    [".git", /inside \.git/],
    [".git/config", /inside \.git/],
    ["src/.GIT/x", /inside \.git/],
  ])) {
    const { root, addonDir } = fixtureWith((m) => {
      m.delete = [rel];
    });
    assert.throws(
      () => planInstall({ root, addonDir }),
      refused(pattern),
      `delete ${JSON.stringify(rel)}`,
    );
    assert.ok(fs.existsSync(path.join(root, ".git", "HEAD")));
  }
  {
    const { root, addonDir } = fixtureWith((m) => {
      m.marker = "../outside.ts";
    });
    assert.throws(
      () => planInstall({ root, addonDir }),
      refused(/marker "\.\.\/outside\.ts" is not a path inside/),
    );
  }
  {
    const { root, addonDir } = fixture();
    fs.mkdirSync(path.join(addonDir, "files", ".git"), { recursive: true });
    fs.writeFileSync(path.join(addonDir, "files", ".git", "config"), "x\n");
    // git won't track a folder named .git, so the tree stays dirty: --force.
    assert.throws(
      () => planInstall({ root, addonDir, force: true }),
      refused(/overlay file "\.git\/config" is inside \.git/),
    );
  }

  // Symlinks: in the overlay, as a project directory, as a project file.
  {
    const { root, addonDir } = fixture();
    fs.symlinkSync(
      path.join(root, "package.json"),
      path.join(addonDir, "files", "src", "link.ts"),
    );
    git(root, "add", "-A");
    git(root, "commit", "-qm", "symlinked overlay file");
    assert.throws(
      () => planInstall({ root, addonDir }),
      refused(/overlay contains a symlink \(files\/src\/link\.ts\)/),
    );
  }
  {
    const { root, addonDir } = fixture();
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "addon-outside-"));
    temps.push(outside);
    fs.symlinkSync(outside, path.join(root, "src", "demo"));
    git(root, "add", "-A");
    git(root, "commit", "-qm", "symlinked project dir");
    assert.throws(
      () => planInstall({ root, addonDir }),
      refused(/"src\/demo\/marker\.ts" goes through a symlink \(src\/demo\)/),
    );
    assert.deepEqual(fs.readdirSync(outside), []);
  }
  {
    const { root, addonDir } = fixture();
    const outside = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), "addon-outside-")),
      "headers",
    );
    temps.push(path.dirname(outside));
    fs.writeFileSync(outside, "outside\n");
    fs.rmSync(path.join(root, "public", "_headers"));
    fs.symlinkSync(outside, path.join(root, "public", "_headers"));
    git(root, "add", "-A");
    git(root, "commit", "-qm", "symlinked project file");
    assert.throws(
      () => planInstall({ root, addonDir }),
      refused(/"public\/_headers" goes through a symlink/),
    );
    assert.equal(fs.readFileSync(outside, "utf8"), "outside\n");
  }

  // A malformed manifest or config file refuses with a message, not a stack.
  for (const [patch, pattern] of /** @type {const} */ ([
    [
      (/** @type {any} */ m) => delete m.name,
      /name must be a non-empty string/,
    ],
    [
      (/** @type {any} */ m) => (m.marker = 3),
      /marker must be a non-empty string/,
    ],
    [
      (/** @type {any} */ m) => (m.env = "A="),
      /env must be an array of strings/,
    ],
    [
      (/** @type {any} */ m) => (m.dependencies = { react: 19 }),
      /dependencies must map names to strings/,
    ],
    [
      (/** @type {any} */ m) => (m.wrangler = { comment: "x" }),
      /wrangler must be/,
    ],
  ])) {
    const { root, addonDir } = fixtureWith(patch);
    assert.throws(() => planInstall({ root, addonDir }), refused(pattern));
  }
  {
    const { root, addonDir } = fixture();
    fs.writeFileSync(path.join(addonDir, "manifest.json"), "{ nope\n");
    git(root, "add", "-A");
    git(root, "commit", "-qm", "bad manifest");
    assert.throws(
      () => planInstall({ root, addonDir }),
      refused(/manifest\.json is not valid JSON/),
    );
  }
  {
    const { root, addonDir } = fixture();
    fs.writeFileSync(path.join(root, "wrangler.jsonc"), '{ "vars": [ }\n');
    git(root, "add", "-A");
    git(root, "commit", "-qm", "bad wrangler");
    assert.throws(
      () => planInstall({ root, addonDir }),
      refused(/wrangler\.jsonc could not be merged/),
    );
  }

  // A project nested inside another repository is not a checkout of its own.
  {
    const outer = fs.mkdtempSync(path.join(os.tmpdir(), "addon-outer-"));
    temps.push(outer);
    const root = path.join(outer, "project");
    const addonDir = path.join(root, "addons", "sanity");
    fs.mkdirSync(addonDir, { recursive: true });
    fs.writeFileSync(
      path.join(addonDir, "manifest.json"),
      JSON.stringify({ name: "Demo", marker: "marker.ts" }),
    );
    git(outer, "init", "-q");
    git(outer, "add", "-A");
    git(outer, "commit", "-qm", "outer");
    assert.throws(
      () => planInstall({ root, addonDir }),
      refused(/not the top level of its git repository[\s\S]*--force/),
    );
    assert.ok(planInstall({ root, addonDir, force: true }));
  }

  // CRLF files keep CRLF through every merge.
  {
    const { root, addonDir } = fixture();
    for (const rel of [
      "package.json",
      "wrangler.jsonc",
      "tsconfig.json",
      ".env.example",
      ".gitignore",
    ]) {
      const file = path.join(root, rel);
      fs.writeFileSync(
        file,
        fs.readFileSync(file, "utf8").replace(/\n/g, "\r\n"),
      );
    }
    git(root, "add", "-A");
    git(root, "commit", "-qm", "crlf");
    const plan = planInstall({ root, addonDir });
    for (const write of plan.writes)
      if (typeof write.content === "string")
        assert.ok(
          !/[^\r]\n/.test(write.content),
          `${write.path} gained a bare LF`,
        );
    applyPlan(root, plan);
    assert.deepEqual(
      parseJsonc(fs.readFileSync(path.join(root, "wrangler.jsonc"), "utf8"))
        .vars,
      { PUBLIC_DEMO_ID: "demo" },
    );
  }

  // An overlay file over a project directory refuses (no EISDIR mid-apply).
  {
    const { root, addonDir } = fixture();
    fs.mkdirSync(path.join(root, "docs"));
    fs.writeFileSync(path.join(root, "docs", "a.md"), "a\n");
    fs.writeFileSync(path.join(addonDir, "files", "docs"), "a file\n");
    git(root, "add", "-A");
    git(root, "commit", "-qm", "overlay file over a dir");
    assert.throws(
      () => planInstall({ root, addonDir }),
      refused(/overlay file docs would replace a directory/),
    );
  }

  // A write under a path that is a file in the project refuses up front.
  {
    const { root, addonDir } = fixture();
    fs.writeFileSync(path.join(root, "src", "demo"), "a file\n");
    git(root, "add", "-A");
    git(root, "commit", "-qm", "file where a dir goes");
    assert.throws(
      () => planInstall({ root, addonDir }),
      refused(/src\/demo\/marker\.ts can't be written: src\/demo is a file/),
    );
  }

  // The merged-file clash check ignores case (Package.json is package.json
  // on a case-insensitive filesystem).
  {
    const { root, addonDir } = fixture();
    fs.writeFileSync(path.join(addonDir, "files", "Package.json"), "{}\n");
    git(root, "add", "-A");
    git(root, "commit", "-qm", "case clash");
    assert.throws(
      () => planInstall({ root, addonDir }),
      refused(/must not contain Package\.json/),
    );
  }

  // A delete entry that is, or holds, a write target refuses.
  for (const rel of ["public", "public/_headers", "PUBLIC"]) {
    const { root, addonDir } = fixtureWith((m) => {
      m.delete = [rel];
    });
    if (rel === "PUBLIC" && !fs.existsSync(path.join(root, "PUBLIC"))) continue;
    assert.throws(
      () => planInstall({ root, addonDir }),
      refused(/the manifest deletes [\s\S]*also writes \(public\/_headers\)/),
      `delete ${rel}`,
    );
  }

  // A filesystem failure part-way names the failed step and what was applied.
  {
    const { root, addonDir } = fixture();
    const plan = planInstall({ root, addonDir });
    fs.writeFileSync(path.join(root, "src", "demo"), "in the way\n");
    assert.throws(
      () => applyPlan(root, plan),
      refused(
        /failed at add src\/demo\/marker\.ts[\s\S]*Already applied:[\s\S]*delete src\/old\.txt[\s\S]*overwrite public\/_headers/,
      ),
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
  {
    const { root, addonDir } = fixture({ withCli: true });
    fs.writeFileSync(path.join(addonDir, "manifest.json"), "{ nope\n");
    const bad = spawnSync(process.execPath, ["scripts/addon-sanity.mjs"], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(bad.status, 1);
    assert.match(
      bad.stderr,
      /^✗ addon:sanity: addons\/sanity\/manifest\.json is not valid JSON/,
    );
    assert.doesNotMatch(bad.stderr, /\n\s+at /);
  }

  console.log("check-addon-installer: ok");
} finally {
  for (const dir of temps) fs.rmSync(dir, { recursive: true, force: true });
}
