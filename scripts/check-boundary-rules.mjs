#!/usr/bin/env node
// @ts-check
/**
 * check-boundary-rules — proves scripts/check-content-boundary.mjs applies
 * its core rules and any add-on rule file (scripts/boundary/*.json), by
 * running it (`--root`) against fixture trees in the OS temp dir.
 *
 * Usage: node scripts/check-boundary-rules.mjs (part of npm run check:boundary)
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GUARD = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "check-content-boundary.mjs",
);
/** @type {string[]} */
const roots = [];
const RULE = {
  why: "demo add-on",
  packages: ["sanity", "@sanity/*", "sanity:*"],
  paths: ["src/sanity"],
  allow: ["src/sanity/", "src/config/cms.mjs"],
};

/**
 * @param {Record<string, string>} files
 * @param {Record<string, unknown>} [rules]  scripts/boundary/<name>.json
 */
function tree(files, rules = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "boundary-"));
  roots.push(root);
  const all = {
    ...files,
    ...Object.fromEntries(
      Object.entries(rules).map(([name, rule]) => [
        `scripts/boundary/${name}.json`,
        JSON.stringify(rule),
      ]),
    ),
  };
  for (const [rel, text] of Object.entries(all)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  }
  return root;
}
const guard = (/** @type {string} */ root) =>
  spawnSync(process.execPath, [GUARD, "--root", root], { encoding: "utf8" });
const ok = (/** @type {string} */ root) => {
  const r = guard(root);
  assert.equal(r.status, 0, r.stderr);
};
const bad = (/** @type {string} */ root, /** @type {RegExp} */ pattern) => {
  const r = guard(root);
  assert.equal(r.status, 1, `expected a violation matching ${pattern}`);
  assert.match(r.stderr, pattern);
};
const astro = (/** @type {string} */ line) => `---\n${line}\n---\n`;

// No add-on rule: a CMS import is not this guard's business (and the
// package would not even be installed).
ok(
  tree({ "src/components/A.astro": astro('import x from "@sanity/client";') }),
);

// With the add-on's rule: forbidden outside its allow list, by package…
bad(
  tree(
    {
      "src/components/A.astro": astro(
        'import { stegaClean } from "@sanity/client/stega";',
      ),
    },
    { demo: RULE },
  ),
  /src\/components\/A\.astro:2\s+@sanity\/client\/stega\s+\(demo add-on\)/,
);
bad(
  tree(
    {
      "src/components/A.astro": astro(
        'import { sanityClient } from "sanity:client";',
      ),
    },
    { demo: RULE },
  ),
  /sanity:client/,
);
bad(
  tree(
    { "src/components/A.astro": astro('import { defineType } from "sanity";') },
    { demo: RULE },
  ),
  /A\.astro:2\s+sanity\s/,
);
// …by path, through the alias or relatively…
bad(
  tree(
    {
      "src/components/A.astro": astro(
        'import { q } from "@/sanity/lib/queries";',
      ),
    },
    { demo: RULE },
  ),
  /@\/sanity\/lib\/queries/,
);
bad(
  tree(
    { "src/lib/x.ts": 'import { q } from "../sanity/lib/queries";\n' },
    { demo: RULE },
  ),
  /src\/lib\/x\.ts:1/,
);
// …and in comments (a stale doc example is a stale instruction).
bad(
  tree(
    {
      "src/components/A.astro": astro('// e.g. import x from "@sanity/client"'),
    },
    { demo: RULE },
  ),
  /@sanity\/client/,
);
// Allowed where the rule allows it; a lookalike package name is not "sanity".
ok(
  tree(
    {
      "src/sanity/lib/a.ts": 'import { createClient } from "@sanity/client";\n',
      "src/config/cms.mjs": 'import sanity from "@sanity/astro";\n',
      "src/components/B.astro": astro('import x from "sanity-like-package";'),
    },
    { demo: RULE },
  ),
);

// Core rules apply with or without add-ons: the Files backend from a page.
bad(
  tree({
    "src/pages/x.astro": astro(
      'import { getBlogCtaById } from "@/lib/content/files/ctas";',
    ),
  }),
  /the Files backend is reached through @\/lib\/content/,
);

for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
console.log("check-boundary-rules: ok");
