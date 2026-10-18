#!/usr/bin/env node
// @ts-check
/**
 * check-demo — runs `npm run demo` on the fictional fixture prospect
 * (presets/local-service/fixture) in a scratch copy of this repo
 * (scripts/lib/scratch.mjs), builds it, and checks the result:
 *
 *   - a second run writes the identical tree (the script is re-runnable)
 *   - the whole site is noindex: the meta on every page, robots.txt
 *     `Disallow: /`, no sitemap, X-Robots-Tag in the built _headers, stub
 *     llms.txt
 *   - the banner, the prospect's name and services are on the page, the
 *     starter's sample services and the hidden nav links are gone
 *   - bad input fails naming the field: one caught by the preset schema,
 *     one by the content schema (via astro sync)
 *
 * node_modules is linked from this repo, so no install and no network. The
 * normal (DEMO = null) build is what CI already builds, so it isn't
 * repeated here.
 *
 * Usage: npm run check:demo
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { git, requireGitRepo, scratchCopy } from "./lib/scratch.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
requireGitRepo(REPO, "npm run check:demo");
const FIXTURE = "presets/local-service/fixture/demo.json";
const SLUG = "brightline-electric";

const dir = scratchCopy(REPO);
const defaults = path.join(dir, "..", `demo-defaults-${process.pid}.json`);
const read = (/** @type {string} */ rel) =>
  fs.readFileSync(path.join(dir, rel), "utf8");
const out = (
  /** @type {import("node:child_process").SpawnSyncReturns<string>} */ r,
) => `${r.stdout}\n${r.stderr}`;

/** @param {string} config @param {...string} flags */
function demo(config, ...flags) {
  return spawnSync(
    process.execPath,
    [
      "scripts/demo.mjs",
      "--config",
      config,
      "--defaults",
      defaults,
      "--allow-public",
      "--no-check",
      ...flags,
    ],
    { cwd: dir, encoding: "utf8" },
  );
}
/** The tree git would commit — equal ids mean byte-identical files. */
const tree = () => {
  git(dir, "add", "-A");
  return git(dir, "write-tree").trim();
};

try {
  fs.symlinkSync(
    path.join(REPO, "node_modules"),
    path.join(dir, "node_modules"),
  );
  // .gitignore's `node_modules/` matches a folder, not this link.
  fs.appendFileSync(
    path.join(dir, ".git", "info", "exclude"),
    "node_modules\n",
  );
  fs.writeFileSync(defaults, JSON.stringify({ workersSubdomain: "example" }));
  // A demos repo has its Worker named; the starter's placeholder is refused.
  const wrangler = path.join(dir, "wrangler.jsonc");
  fs.writeFileSync(
    wrangler,
    fs
      .readFileSync(wrangler, "utf8")
      .replace('"your-worker-name"', '"cl-demos"'),
  );
  git(dir, "commit", "-qam", "name the Worker");

  // Refuses the wrong branch, before writing anything.
  {
    const r = demo(FIXTURE);
    assert.equal(r.status, 1, out(r));
    assert.match(r.stderr, /switch to demo\/brightline-electric first/);
    assert.equal(git(dir, "status", "--porcelain").trim(), "");
  }
  git(dir, "switch", "-qc", `demo/${SLUG}`);

  // Writes the demo, and a second run changes nothing.
  {
    const r = demo(FIXTURE);
    assert.equal(r.status, 0, out(r));
    assert.match(r.stdout, /Demo written for Brightline Electric/);
    const first = tree();
    const again = demo(FIXTURE);
    assert.equal(again.status, 0, out(again));
    assert.equal(tree(), first, "a second run changed the tree");
  }
  assert.match(
    read("src/config/demo.shared.mjs"),
    /prospect: "Brightline Electric"/,
  );
  assert.match(read("src/config/site.ts"), /name: "Brightline Electric"/);
  assert.match(read("src/config/site.ts"), /email: ""/);
  assert.match(
    read("src/styles/variables/colors.css"),
    /--color-brand-500: #1a4fd8;/,
  );
  assert.ok(
    !fs.existsSync(
      path.join(dir, "src/content/services/kitchen-remodeling.json"),
    ),
  );

  // Builds, and the build is a demo.
  {
    const r = spawnSync("npm", ["run", "build"], {
      cwd: dir,
      encoding: "utf8",
    });
    assert.equal(r.status, 0, out(r).slice(-4000));
  }
  const client = path.join(dir, "dist", "client");
  const html = (/** @type {string} */ rel) =>
    fs.readFileSync(path.join(client, rel), "utf8");
  const pages = fs
    .readdirSync(client, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".html"));
  assert.ok(pages.length > 5, `only ${pages.length} pages built`);
  for (const page of pages)
    assert.match(
      html(page),
      /<meta name="robots" content="noindex, nofollow">/,
      page,
    );
  assert.match(html("robots.txt"), /^Disallow: \/$/m);
  assert.ok(!fs.existsSync(path.join(client, "sitemap-index.xml")));
  assert.match(
    html("_headers"),
    /^\/\*\n {2}X-Robots-Tag: noindex, nofollow$/m,
  );
  assert.match(html("llms.txt"), /not for indexing/);
  const home = html("index.html");
  assert.match(home, /Built for Brightline Electric by CL Creative/);
  assert.match(
    home,
    /see-how-it-works\?from=demo&amp;demo=brightline-electric/,
  );
  assert.match(home, /Electrical work done/);
  assert.match(home, /href="\/services\/panel-upgrades"/);
  assert.doesNotMatch(home, /href="\/blog"/);
  assert.match(html("contact/index.html"), /Contact \| Brightline Electric/);
  assert.ok(
    fs.existsSync(path.join(client, "services", "ev-chargers", "index.html")),
  );
  assert.ok(
    !fs.existsSync(path.join(client, "services", "kitchen-remodeling")),
  );

  // Bad input names the field.
  const fixture = JSON.parse(read(FIXTURE));
  const bad = (/** @type {(d: any) => void} */ edit) => {
    const copy = structuredClone(fixture);
    edit(copy);
    const file = path.join(dir, "presets/local-service/fixture/bad.json");
    fs.writeFileSync(file, JSON.stringify(copy));
    return demo(file);
  };
  {
    const r = bad((d) => (d.home.hero.imageAlt = ""));
    assert.equal(r.status, 1, out(r));
    assert.match(r.stderr, /demo\.json › home\.hero\.imageAlt/);
  }
  {
    const r = bad((d) => d.services[0].highlights.pop());
    assert.equal(r.status, 1, out(r));
    assert.match(out(r), /panel-upgrades[\s\S]*highlights/);
  }

  console.log(
    "check-demo: ok (fixture demo written twice, built, noindex, bad input named)",
  );
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.rmSync(defaults, { force: true });
}
