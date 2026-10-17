#!/usr/bin/env node
// @ts-check
/**
 * check-setup — runs `npm run setup` non-interactively (--config … --yes)
 * in scratch copies of this repo (scripts/lib/scratch.mjs) and checks both
 * content-source branches and the refusals. No network: setup and the
 * add-on installer have no dependencies.
 *
 * Usage: npm run check:setup
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { git, scratchCopy } from "./lib/scratch.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const answersDir = fs.mkdtempSync(path.join(os.tmpdir(), "setup-answers-"));
/** @type {string[]} */
const temps = [answersDir];
let runs = 0;

/**
 * Run setup in `dir` with these --config answers.
 * @param {string} dir
 * @param {Record<string, string>} answers
 * @param {...string} flags
 */
function setup(dir, answers, ...flags) {
  const file = path.join(answersDir, `answers-${runs++}.json`);
  fs.writeFileSync(file, JSON.stringify(answers));
  return spawnSync(
    process.execPath,
    ["scripts/setup.mjs", "--config", file, "--yes", ...flags],
    {
      cwd: dir,
      encoding: "utf8",
    },
  );
}
const copy = () => {
  const dir = scratchCopy(REPO);
  temps.push(dir);
  return dir;
};
const read = (/** @type {string} */ dir, /** @type {string} */ rel) =>
  fs.readFileSync(path.join(dir, rel), "utf8");
const exists = (/** @type {string} */ dir, /** @type {string} */ rel) =>
  fs.existsSync(path.join(dir, rel));
const out = (/** @type {{ stdout: string, stderr: string }} */ r) =>
  `${r.stdout}\n${r.stderr}`;

// Files: identity written, no Sanity anywhere, addons/ gone.
{
  const dir = copy();
  const r = setup(dir, {
    contentSource: "files",
    siteName: "Acme Roofing",
    workerName: "acme-roofing",
  });
  assert.equal(r.status, 0, out(r));
  assert.match(read(dir, "src/config/site.ts"), /name: "Acme Roofing"/);
  assert.match(read(dir, "wrangler.jsonc"), /"name": "acme-roofing"/);
  assert.doesNotMatch(read(dir, "wrangler.jsonc"), /SANITY/);
  assert.doesNotMatch(read(dir, ".env"), /SANITY/);
  assert.ok(!exists(dir, "src/sanity"));
  assert.ok(!exists(dir, "addons"));
}

// Sanity: the add-on installed first, then its ids written; addons/ gone.
{
  const dir = copy();
  const r = setup(dir, {
    contentSource: "sanity",
    siteName: "Acme Roofing",
    workerName: "acme-roofing",
    sanityProjectId: "abc123xy",
    studioHost: "acme-roofing",
  });
  assert.equal(r.status, 0, out(r));
  assert.match(r.stdout, /Sanity add-on installed/);
  assert.match(
    read(dir, "src/lib/content/source.ts"),
    /@\/sanity\/lib\/source/,
  );
  assert.match(
    read(dir, "src/config/sanity.shared.mjs"),
    /SANITY_PROJECT_ID = "abc123xy"/,
  );
  assert.match(
    read(dir, "wrangler.jsonc"),
    /"PUBLIC_SANITY_PROJECT_ID": "abc123xy"/,
  );
  assert.match(read(dir, "sanity.cli.ts"), /studioHost: "acme-roofing"/);
  assert.match(read(dir, ".env"), /^PUBLIC_SANITY_PROJECT_ID=abc123xy$/m);
  assert.ok(!exists(dir, "addons"));

  // Re-running on the installed project: Files is refused, nothing written…
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "installed");
  const files = setup(dir, { contentSource: "files" });
  assert.equal(files.status, 1);
  assert.match(
    files.stderr,
    /Sanity add-on is installed[\s\S]*Nothing was written/,
  );
  assert.equal(git(dir, "status", "--porcelain"), "");
  // …and leaving the answer out keeps Sanity.
  const again = setup(dir, { siteName: "Acme Roofing Co" });
  assert.equal(again.status, 0, out(again));
  assert.match(read(dir, "src/config/site.ts"), /name: "Acme Roofing Co"/);
}

// Sanity on a dirty tree: the installer refuses and setup writes nothing.
{
  const dir = copy();
  fs.appendFileSync(path.join(dir, "README.md"), "\nA local note.\n");
  const siteBefore = read(dir, "src/config/site.ts");
  const r = setup(dir, { contentSource: "sanity", siteName: "Acme Roofing" });
  assert.equal(r.status, 1);
  assert.match(
    r.stderr,
    /addon:sanity: the working tree has uncommitted changes/,
  );
  assert.match(r.stderr, /installer stopped/);
  assert.ok(!exists(dir, "src/sanity"));
  assert.equal(read(dir, "src/config/site.ts"), siteBefore);
}

// A dry run on the Sanity branch changes nothing, and shows the ids it would write.
{
  const dir = copy();
  const r = setup(
    dir,
    { contentSource: "sanity", sanityProjectId: "abc123xy" },
    "--dry-run",
  );
  assert.equal(r.status, 0, out(r));
  assert.match(r.stdout, /Would install the Sanity add-on/);
  assert.match(
    r.stdout,
    /src\/config\/sanity\.shared\.mjs[^\n]*→ SANITY_PROJECT_ID/,
  );
  assert.equal(git(dir, "status", "--porcelain"), "");
}

// Sanity without the add-on folder, and an unknown source.
{
  const dir = copy();
  fs.rmSync(path.join(dir, "addons"), { recursive: true, force: true });
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "no add-on");
  const r = setup(dir, { contentSource: "sanity" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /addons\/sanity\/ is missing/);
  const unknown = setup(dir, { contentSource: "wordpress" });
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /contentSource must be "files" or "sanity"/);
}

for (const dir of temps) fs.rmSync(dir, { recursive: true, force: true });
console.log("check-setup: ok");
