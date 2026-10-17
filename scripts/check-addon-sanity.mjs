#!/usr/bin/env node
// @ts-check
/**
 * check-addon-sanity — proves the Sanity add-on (addons/sanity/) installs
 * into this starter and works. In a scratch copy of the repo
 * (scripts/lib/scratch.mjs) it:
 *
 *   1. npm ci, then builds the Files site: the reference for step 5
 *   2. runs `npm run addon:sanity`; a second run must refuse
 *   3. checks the merge: package.json and wrangler.jsonc vars are exactly
 *      the starter's plus addons/sanity/manifest.json
 *   4. npm install, then check, check:hover, check:boundary, check:config
 *      and format:check
 *   5. builds the placeholder project (an empty site), then
 *      PARITY_FIXTURES=sample, which must be equivalent to step 1
 *      (compare-dist --equivalent) and pass check:schema
 *   6. builds PARITY_FIXTURES=1 (the edge fixtures) and
 *      PARITY_FIXTURES=preview + check-stega-leaks; runs
 *      check-fixture-markdown
 *
 * Every build sets KEEP_DEV_PAGES=1, so /components is covered.
 *
 *   --baselines <dir>  also compare exactly: Files vs <dir>/files, the
 *                      placeholder build vs <dir>/empty, sample vs
 *                      <dir>/sample, PARITY_FIXTURES=1 vs <dir>/fixtures
 *   --lockfile <path>  use this package-lock.json for the install after
 *                      the add-on (pins its packages, e.g. to the
 *                      resolution the baselines were built with)
 *   --keep             keep the scratch copy (path printed at the end),
 *                      whether the check passes or fails
 *
 * Without --keep the scratch copy is removed however the run ends: pass,
 * failure, or Ctrl-C / SIGTERM (the running command is stopped first). A
 * failure names its step and the command or assertion that failed.
 *
 * A project without addons/sanity/ (a fork that deleted it) has nothing to
 * check: exit 0. Needs the network (npm). CI: the `addon-sanity` job.
 */
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseJsonc } from "./lib/jsonc.mjs";
import { scratchCopy } from "./lib/scratch.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (/** @type {string} */ name) => {
  const i = args.indexOf(name);
  if (i < 0) return null;
  const value = args[i + 1];
  if (!value || value.startsWith("--")) {
    console.error(`check-addon-sanity: ${name} needs a path.`);
    process.exit(2);
  }
  return path.resolve(value);
};
const BASELINES = option("--baselines");
const LOCKFILE = option("--lockfile");
const KEEP = args.includes("--keep");

if (!fs.existsSync(path.join(REPO, "addons", "sanity", "manifest.json"))) {
  console.log(
    "check-addon-sanity: no addons/sanity/ in this project, nothing to check.",
  );
  process.exit(0);
}
for (const [flag, file] of [
  ["--baselines", BASELINES],
  ["--lockfile", LOCKFILE],
])
  if (file && !fs.existsSync(file)) {
    console.error(`check-addon-sanity: ${flag} ${file} does not exist.`);
    process.exit(2);
  }

/** A failure with its step attached, reported without a stack trace. */
class StepFailure extends Error {}

/** The step running now, for failure messages. */
let step = "setup";
/** @type {import("node:child_process").ChildProcess | null} */
let child = null;
/** @type {NodeJS.Signals | null} */
let interrupted = null;
/** @type {string[]} temp dirs to remove at exit (the scratch copy unless --keep) */
const temps = [];

function cleanup() {
  for (const dir of temps.splice(0))
    fs.rmSync(dir, { recursive: true, force: true });
}

// Ctrl-C / SIGTERM: stop the running command; its exit then fails the step
// and the finally block below cleans up. With nothing running, clean up now.
for (const signal of /** @type {NodeJS.Signals[]} */ (["SIGINT", "SIGTERM"]))
  process.on(signal, () => {
    if (interrupted) return;
    interrupted = signal;
    console.error(`\ncheck-addon-sanity: ${signal}, stopping.`);
    if (child && child.exitCode === null) child.kill(signal);
    else {
      cleanup();
      process.exit(130);
    }
  });

/**
 * @param {string} name
 * @param {() => Promise<void> | void} body
 */
async function stage(name, body) {
  step = name;
  console.log(`\n── ${name} ──`);
  await body();
}

/**
 * Run a command in the scratch copy; fail the step on a non-zero exit.
 * @param {string} cwd
 * @param {string} cmd
 * @param {string[]} cmdArgs
 * @param {Record<string, string>} [env]
 */
function run(cwd, cmd, cmdArgs, env = {}) {
  const prefix = Object.entries(env)
    .map(([k, v]) => `${k}=${v} `)
    .join("");
  const line = `${prefix}${cmd} ${cmdArgs.join(" ")}`;
  console.log(`\n$ ${line}`);
  return /** @type {Promise<void>} */ (
    new Promise((resolve, reject) => {
      child = spawn(cmd, cmdArgs, {
        cwd,
        stdio: "inherit",
        env: { ...process.env, ...env },
      });
      child.on("error", (err) =>
        reject(new StepFailure(`\`${line}\` could not start: ${err.message}`)),
      );
      child.on("close", (code, signal) => {
        child = null;
        if (code === 0 && !interrupted) resolve();
        else
          reject(
            new StepFailure(
              `\`${line}\` ${signal ? `was stopped by ${signal}` : `exited ${code}`}`,
            ),
          );
      });
    })
  );
}

let ok = false;
/** @type {string | null} */
let dir = null;
try {
  step = "copy the repo to a scratch dir";
  dir = scratchCopy(REPO);
  if (!KEEP) temps.push(dir);
  const refs = fs.mkdtempSync(path.join(os.tmpdir(), "addon-refs-"));
  temps.push(refs);
  console.log(`Scratch copy: ${dir}`);

  const cwd = dir;
  const read = (/** @type {string} */ rel) =>
    fs.readFileSync(path.join(cwd, rel), "utf8");
  const DIST = path.join(cwd, "dist", "client");
  const build = (/** @type {Record<string, string>} */ env = {}) =>
    run(cwd, "npm", ["run", "build"], { KEEP_DEV_PAGES: "1", ...env });
  /** Exact comparison against a baseline, when --baselines is given. */
  const againstBaseline = async (/** @type {string} */ name) => {
    if (BASELINES)
      await run(cwd, "node", [
        "scripts/compare-dist.mjs",
        path.join(BASELINES, name),
        DIST,
      ]);
  };
  const filesRef = path.join(refs, "files");
  /** @type {Record<string, any>} */
  let pkgBefore = {};
  /** @type {Record<string, any>} */
  let varsBefore = {};

  await stage("1. the Files site, before the add-on", async () => {
    await run(cwd, "npm", ["ci", "--no-audit", "--no-fund"]);
    await build();
    await againstBaseline("files");
    fs.cpSync(DIST, filesRef, { recursive: true });
  });

  await stage("2. install the add-on; a second run must refuse", async () => {
    pkgBefore = JSON.parse(read("package.json"));
    varsBefore = parseJsonc(read("wrangler.jsonc")).vars ?? {};
    await run(cwd, "npm", ["run", "addon:sanity"]);
    const again = spawnSync("npm", ["run", "addon:sanity"], {
      cwd,
      encoding: "utf8",
    });
    const output = `${again.stdout}${again.stderr}`;
    if (again.status === 0 || !/already installed/.test(output))
      throw new StepFailure(
        `a second \`npm run addon:sanity\` did not refuse as already installed (exit ${again.status}):\n${output}`,
      );
    console.log("second `npm run addon:sanity` refused: OK");
  });

  await stage(
    "3. the merge is exactly the starter's files plus the manifest",
    () => {
      const manifest = JSON.parse(read("addons/sanity/manifest.json"));
      const pkg = JSON.parse(read("package.json"));
      for (const field of ["dependencies", "devDependencies", "scripts"])
        assert.deepEqual(
          pkg[field],
          { ...pkgBefore[field], ...manifest[field] },
          `package.json ${field}`,
        );
      assert.deepEqual(
        parseJsonc(read("wrangler.jsonc")).vars,
        { ...varsBefore, ...manifest.wrangler.vars },
        "wrangler.jsonc vars",
      );
      console.log("package.json and wrangler.jsonc vars: OK");
    },
  );

  await stage("4. packages, then the static checks", async () => {
    if (LOCKFILE)
      fs.copyFileSync(LOCKFILE, path.join(cwd, "package-lock.json"));
    await run(cwd, "npm", ["install", "--no-audit", "--no-fund"]);
    for (const script of [
      "check",
      "check:hover",
      "check:boundary",
      "check:config",
      "format:check",
    ])
      await run(cwd, "npm", ["run", script]);
  });

  await stage(
    "5. the placeholder project, then the sample content from both sources",
    async () => {
      await build();
      await againstBaseline("empty");
      await build({ PARITY_FIXTURES: "sample" });
      await againstBaseline("sample");
      await run(cwd, "node", [
        "scripts/compare-dist.mjs",
        "--equivalent",
        DIST,
        filesRef,
      ]);
      await run(cwd, "node", ["scripts/check-schema.mjs", "--dist", DIST]);
    },
  );

  await stage(
    "6. edge fixtures, preview safety, the fixture converter",
    async () => {
      await build({ PARITY_FIXTURES: "1" });
      await againstBaseline("fixtures");
      await build({ PARITY_FIXTURES: "preview" });
      await run(cwd, "node", ["scripts/check-stega-leaks.mjs", DIST]);
      await run(cwd, "node", ["scripts/check-fixture-markdown.mjs"]);
    },
  );
  ok = true;
} catch (err) {
  const message =
    err instanceof StepFailure || err instanceof assert.AssertionError
      ? err.message
      : err instanceof Error
        ? (err.stack ?? err.message)
        : String(err);
  console.error(`\n✗ check-addon-sanity failed at step "${step}":\n${message}`);
} finally {
  cleanup();
}

if (ok) {
  console.log(
    "\n✓ check-addon-sanity: the Sanity add-on installs, type-checks and builds, and renders the sample content like the Files site.",
  );
}
if (dir && KEEP) console.log(`Scratch copy kept: ${dir}`);
else if (dir && !ok)
  console.error("Scratch copy removed; rerun with --keep to inspect it.");
process.exit(ok ? 0 : interrupted ? 130 : 1);
