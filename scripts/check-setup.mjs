#!/usr/bin/env node
// @ts-check
/**
 * check-setup — runs `npm run setup` non-interactively (--config … --yes)
 * in scratch copies of this repo (scripts/lib/scratch.mjs) and checks both
 * content-source branches and the refusals. No network: setup and the
 * add-on installer have no dependencies.
 *
 * It runs the cases that apply to the project it's in. The starter (with
 * addons/sanity/, not installed) runs them all, plus this check itself
 * inside a fork set up as Files and one set up as Sanity. A Files fork
 * (setup deleted addons/) runs the Files cases and the refusals; a project
 * with the add-on installed runs the re-run cases. Scratch copies are
 * removed however the run ends.
 *
 * Usage: npm run check:setup
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { git, requireGitRepo, scratchCopy } from "./lib/scratch.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
requireGitRepo(REPO, "npm run check:setup");
/** The starter: the add-on folder is here to install from. */
const HAS_ADDON = fs.existsSync(
  path.join(REPO, "addons", "sanity", "manifest.json"),
);
/** The add-on's marker: the project has the add-on installed. */
const INSTALLED = fs.existsSync(
  path.join(REPO, "src", "sanity", "lib", "source.ts"),
);
const answersDir = fs.mkdtempSync(path.join(os.tmpdir(), "setup-answers-"));
/** @type {string[]} */
const temps = [answersDir];
let runs = 0;

/**
 * Run setup in `dir` with these --config answers.
 * @param {string} dir
 * @param {Record<string, unknown>} answers
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

/** Commit everything in `dir` (a scratch copy), if there is anything. */
const commitAll = (/** @type {string} */ dir, /** @type {string} */ msg) => {
  git(dir, "add", "-A");
  if (git(dir, "status", "--porcelain")) git(dir, "commit", "-qm", msg);
};
/** Run this check inside `dir`; it must pass. */
const checkSetupIn = (/** @type {string} */ dir) => {
  const r = spawnSync(process.execPath, ["scripts/check-setup.mjs"], {
    cwd: dir,
    encoding: "utf8",
  });
  assert.equal(r.status, 0, out(r));
  assert.match(r.stdout, /check-setup: ok/);
  return r.stdout;
};

/**
 * On a project with the add-on installed: Files is refused with nothing
 * written, and leaving the answer out keeps Sanity.
 * @param {string} dir a committed copy
 */
function installedCases(dir) {
  const files = setup(dir, { contentSource: "files" });
  assert.equal(files.status, 1);
  assert.match(
    files.stderr,
    /Sanity add-on is installed[\s\S]*Nothing was written/,
  );
  assert.equal(git(dir, "status", "--porcelain"), "");
  const again = setup(dir, { siteName: "Acme Roofing Co" });
  assert.equal(again.status, 0, out(again));
  assert.match(read(dir, "src/config/site.ts"), /name: "Acme Roofing Co"/);
}

/** @type {string[]} */
const ran = [];
try {
  if (!INSTALLED) {
    // Files: identity written, no Sanity anywhere, addons/ gone.
    {
      const dir = copy();
      const r = setup(dir, {
        contentSource: "files",
        siteName: "Acme Roofing",
        workerName: "acme-roofing",
        // The structured --config-only fields (npm run demo uses them).
        serviceAreas: ["Austin", "Round Rock"],
        founded: 2004,
        utilityBar: { text: "24/7 emergency service" },
        reviewsUrl: "https://g.page/acme",
        social: { Facebook: "https://facebook.com/acme" },
        logoImage: { src: "/images/logo.png", width: 320, height: 96 },
      });
      assert.equal(r.status, 0, out(r));
      const site = read(dir, "src/config/site.ts");
      assert.match(site, /name: "Acme Roofing"/);
      assert.match(site, /serviceAreas: \[\s*"Austin",\s*"Round Rock"\s*\]/);
      assert.match(site, /founded: 2004 as number \| null/);
      assert.match(site, /utilityBar: \{\s*"text": "24\/7 emergency service"/);
      assert.match(site, /reviewsUrl: "https:\/\/g\.page\/acme"/);
      assert.match(site, /href: "https:\/\/facebook\.com\/acme"/);
      // Profiles not given are hidden ("#"), never left as placeholders.
      assert.doesNotMatch(site, /www\.example\.com",\s*viewBox/);
      assert.match(
        read(dir, "src/config/logo-paths.ts"),
        /\| null = \{\s*"src": "\/images\/logo\.png"/,
      );
      assert.match(read(dir, "wrangler.jsonc"), /"name": "acme-roofing"/);
      assert.doesNotMatch(read(dir, "wrangler.jsonc"), /SANITY/);
      assert.doesNotMatch(read(dir, ".env"), /SANITY/);
      assert.ok(!exists(dir, "src/sanity"));
      assert.ok(!exists(dir, "addons"));
    }
    ran.push("Files");
  }
  if (HAS_ADDON && !INSTALLED) {
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

      // Re-running on the installed project.
      commitAll(dir, "installed");
      installedCases(dir);
      // …and this check passes in the set-up Sanity fork.
      commitAll(dir, "renamed");
      assert.match(
        checkSetupIn(dir),
        /\(add-on installed: installed re-runs\)/,
      );
    }
    // Sanity on a dirty tree: the installer refuses and setup writes nothing.
    {
      const dir = copy();
      fs.appendFileSync(path.join(dir, "README.md"), "\nA local note.\n");
      const siteBefore = read(dir, "src/config/site.ts");
      const r = setup(dir, {
        contentSource: "sanity",
        siteName: "Acme Roofing",
      });
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
      assert.match(r.stdout, /installer adds PUBLIC_SANITY_PROJECT_ID/);
      assert.equal(git(dir, "status", "--porcelain"), "");
    }
    // A minimal Sanity config keeps every current id and the API version
    // (the *.shared.mjs constants resolve as defaults), dry-run and real.
    {
      const dir = copy();
      const SHARED = "src/config/sanity.shared.mjs";
      const lines = () =>
        [
          read(dir, "src/config/site.shared.mjs").match(/SITE_URL = [^\n]*/),
          ...["SANITY_PROJECT_ID", "SANITY_DATASET", "SANITY_API_VERSION"].map(
            (name) =>
              read(dir, `addons/sanity/files/${SHARED}`).match(
                new RegExp(`${name} = [^\\n]*`),
              ),
          ),
        ].map((m) => m?.[0] ?? "");
      const before = lines();
      for (const line of before) assert.ok(line && !/= ""/.test(line));
      const dry = setup(dir, { contentSource: "sanity" }, "--dry-run");
      assert.equal(dry.status, 0, out(dry));
      assert.equal(git(dir, "status", "--porcelain"), "");
      const r = setup(dir, { contentSource: "sanity" });
      assert.equal(r.status, 0, out(r));
      const names = [
        "SITE_URL",
        "SANITY_PROJECT_ID",
        "SANITY_DATASET",
        "SANITY_API_VERSION",
      ];
      const rels = ["src/config/site.shared.mjs", SHARED, SHARED, SHARED];
      names.forEach((name, i) => {
        const got = read(dir, rels[i]).match(new RegExp(`${name} = [^\\n]*`));
        assert.equal(got?.[0], before[i]);
      });
    }
    // An explicit empty string for a required key is refused, nothing written.
    {
      const dir = copy();
      const r = setup(dir, { contentSource: "sanity", sanityApiVersion: "" });
      assert.equal(r.status, 1);
      assert.match(r.stderr, /sanityApiVersion is required/);
      assert.equal(git(dir, "status", "--porcelain"), "");
      const u = setup(dir, { contentSource: "files", siteUrl: "" });
      assert.equal(u.status, 1);
      assert.match(u.stderr, /siteUrl is required/);
      assert.equal(git(dir, "status", "--porcelain"), "");
    }
    // A fork set up as Files has no addons/: this check must still pass there.
    {
      const dir = copy();
      const r = setup(dir, {
        contentSource: "files",
        siteName: "Acme Roofing",
      });
      assert.equal(r.status, 0, out(r));
      commitAll(dir, "set up as Files");
      assert.match(
        checkSetupIn(dir),
        /\(Files fork, no addons\/: Files, missing add-on \/ unknown source\)/,
      );
    }
    ran.push("Sanity install", "Sanity refusals", "nested forks");
  }
  if (!INSTALLED) {
    // Sanity without the add-on folder, and an unknown source.
    {
      const dir = copy();
      fs.rmSync(path.join(dir, "addons"), { recursive: true, force: true });
      commitAll(dir, "no add-on");
      const r = setup(dir, { contentSource: "sanity" });
      assert.equal(r.status, 1);
      assert.match(r.stderr, /addons\/sanity\/ is missing/);
      const unknown = setup(dir, { contentSource: "wordpress" });
      assert.equal(unknown.status, 1);
      assert.match(unknown.stderr, /contentSource must be "files" or "sanity"/);
    }
    ran.push("missing add-on / unknown source");
  }
  if (INSTALLED) {
    installedCases(copy());
    ran.push("installed re-runs");
  }
} finally {
  for (const dir of temps) fs.rmSync(dir, { recursive: true, force: true });
}
console.log(
  `check-setup: ok (${INSTALLED ? "add-on installed" : HAS_ADDON ? "starter" : "Files fork, no addons/"}: ${ran.join(", ")})`,
);
