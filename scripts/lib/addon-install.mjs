// @ts-check
/**
 * The add-on installer's engine. scripts/addon-sanity.mjs is its CLI and
 * scripts/check-addon-installer.mjs its tests. Zero dependencies.
 *
 * An add-on is a folder, addons/<name>/, holding:
 *   manifest.json — what to merge into the project's own files (the
 *                   Manifest typedef below)
 *   files/        — an overlay that mirrors repo paths, copied over the
 *                   top: a file already there is overwritten (the CMS
 *                   seams are designed to be)
 *
 * planInstall() decides every write before anything is written, so a
 * refusal leaves the tree untouched; applyPlan() then writes.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setMembers } from "./jsonc.mjs";

/** A refusal or bad input: the CLI prints the message and exits 1. */
export class AddonError extends Error {}

/**
 * @typedef {object} Manifest
 * @property {string} name  Shown in messages, e.g. "Sanity".
 * @property {string} marker  A repo path that exists once installed.
 * @property {Record<string, string>} [dependencies]
 * @property {Record<string, string>} [devDependencies]
 * @property {Record<string, string>} [scripts]  npm scripts.
 * @property {{ vars: Record<string, string>, comment?: string }} [wrangler]  Set in wrangler.jsonc `vars`.
 * @property {Record<string, unknown>} [tsconfig]  Set in tsconfig.json `compilerOptions`.
 * @property {string[]} [env]  Appended to .env.example unless its first `NAME=` line is already there.
 * @property {string[]} [gitignore]  Appended to .gitignore: each missing rule, with the block's comments.
 * @property {string[]} [delete]  Repo paths removed.
 * @property {string[]} [nextSteps]  Printed after installing.
 */

/** @typedef {{ path: string, content: string | Buffer, action: "add" | "overwrite" | "update" }} Write */
/** @typedef {{ manifest: Manifest, writes: Write[], deletes: string[], notes: string[] }} Plan */

/** Never copied from an overlay. */
const SKIP = new Set(["node_modules", ".DS_Store"]);
/** Merged from the manifest, so an overlay must not carry them. */
const MERGED = [
  "package.json",
  "wrangler.jsonc",
  "tsconfig.json",
  ".env.example",
  ".gitignore",
];

/**
 * Every file under `dir` as a POSIX path relative to it.
 * @param {string} dir
 * @param {string} [prefix]
 * @returns {string[]}
 */
function overlayFiles(dir, prefix = "") {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIP.has(entry.name)) return [];
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory()
      ? overlayFiles(path.join(dir, entry.name), rel)
      : [rel];
  });
}

/**
 * Refuse unless `root` is a clean git checkout.
 * @param {string} root
 */
function assertClean(root) {
  let status;
  try {
    status = execFileSync("git", ["status", "--porcelain"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new AddonError(
      "can't confirm the working tree is clean: this is not a git repository (or git is not installed). Back the project up, then run again with --force.",
    );
  }
  if (status.trim())
    throw new AddonError(
      `the working tree has uncommitted changes:\n${status
        .trimEnd()
        .split("\n")
        .slice(0, 10)
        .map((line) => `    ${line}`)
        .join(
          "\n",
        )}\n  Commit or stash them first, so \`git diff\` afterwards shows exactly what the installer changed, or run again with --force.`,
    );
}

/**
 * @param {string} current
 * @param {string[]} block
 */
const appendBlock = (current, block) =>
  current
    ? `${current.replace(/\n*$/, "\n")}\n${block.join("\n")}\n`
    : `${block.join("\n")}\n`;

/**
 * @param {{ root: string, addonDir: string, force?: boolean }} options
 * @returns {Plan}
 */
export function planInstall({ root, addonDir, force = false }) {
  const manifestPath = path.join(addonDir, "manifest.json");
  if (!fs.existsSync(manifestPath))
    throw new AddonError(
      `${path.relative(root, manifestPath)} not found. Copy the add-on folder from the starter repo (addons/<name>/) into this project, commit it, then run again.`,
    );
  /** @type {Manifest} */
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (fs.existsSync(path.join(root, manifest.marker)))
    throw new AddonError(
      `the ${manifest.name} add-on is already installed (${manifest.marker} exists). Nothing to do.`,
    );
  if (!force) assertClean(root);

  const filesDir = path.join(addonDir, "files");
  const overlay = overlayFiles(filesDir);
  const clash = overlay.find((rel) => MERGED.includes(rel));
  if (clash)
    throw new AddonError(
      `the add-on overlay must not contain ${clash}: put those changes in manifest.json.`,
    );

  const exists = (/** @type {string} */ rel) =>
    fs.existsSync(path.join(root, rel));
  const read = (/** @type {string} */ rel) => {
    if (!exists(rel)) throw new AddonError(`${rel} not found in the project.`);
    return fs.readFileSync(path.join(root, rel), "utf8");
  };
  /** @type {Write[]} */
  const writes = [];
  /** @type {string[]} */
  const notes = [];

  // 1. The overlay.
  for (const rel of overlay) {
    const content = fs.readFileSync(path.join(filesDir, rel));
    if (!exists(rel)) writes.push({ path: rel, content, action: "add" });
    else if (!fs.readFileSync(path.join(root, rel)).equals(content))
      writes.push({ path: rel, content, action: "overwrite" });
  }

  // 2. package.json: dependencies (kept sorted, as npm does) and scripts.
  if (manifest.dependencies || manifest.devDependencies || manifest.scripts) {
    const pkg = JSON.parse(read("package.json"));
    /** @type {string[]} */
    const changes = [];
    for (const field of /** @type {const} */ ([
      "dependencies",
      "devDependencies",
      "scripts",
    ])) {
      const add = manifest[field];
      if (!add) continue;
      const target = (pkg[field] ??= {});
      for (const [name, value] of Object.entries(add)) {
        if (target[name] === value) continue;
        changes.push(
          name in target ? `${name} ${target[name]} → ${value}` : name,
        );
        target[name] = value;
      }
      if (field !== "scripts")
        pkg[field] = Object.fromEntries(
          Object.entries(target).sort(([a], [b]) => a.localeCompare(b, "en")),
        );
    }
    if (changes.length) {
      writes.push({
        path: "package.json",
        content: `${JSON.stringify(pkg, null, 2)}\n`,
        action: "update",
      });
      notes.push(`package.json: ${changes.join(", ")}`);
    }
  }

  // 3. wrangler.jsonc vars and 4. tsconfig.json compilerOptions — edited in place.
  for (const [file, key, entries, options] of /** @type {const} */ ([
    [
      "wrangler.jsonc",
      "vars",
      manifest.wrangler?.vars,
      { trailingCommas: true, comment: manifest.wrangler?.comment },
    ],
    [
      "tsconfig.json",
      "compilerOptions",
      manifest.tsconfig,
      { trailingCommas: false },
    ],
  ])) {
    if (!entries) continue;
    const { text, changed } = setMembers(read(file), key, entries, options);
    if (changed.length) {
      writes.push({ path: file, content: text, action: "update" });
      notes.push(`${file} ${key}: ${changed.join(", ")}`);
    }
  }

  // 5. .env.example: the block, unless its first variable is already there.
  if (manifest.env?.length) {
    const current = exists(".env.example") ? read(".env.example") : "";
    const names = manifest.env.flatMap(
      (line) => /^([A-Z][A-Z0-9_]*)=/.exec(line)?.[1] ?? [],
    );
    if (names.length && !new RegExp(`^${names[0]}=`, "m").test(current)) {
      writes.push({
        path: ".env.example",
        content: appendBlock(current, manifest.env),
        action: current ? "update" : "add",
      });
      notes.push(`.env.example: ${names.join(", ")}`);
    }
  }

  // 6. .gitignore: the missing rules, with the block's comments.
  if (manifest.gitignore?.length) {
    const current = exists(".gitignore") ? read(".gitignore") : "";
    const have = new Set(current.split("\n").map((line) => line.trim()));
    const isRule = (/** @type {string} */ line) =>
      line.trim() !== "" && !line.trim().startsWith("#");
    const missing = manifest.gitignore.filter(
      (line) => isRule(line) && !have.has(line.trim()),
    );
    if (missing.length) {
      const block = manifest.gitignore.filter(
        (line) => !isRule(line) || !have.has(line.trim()),
      );
      writes.push({
        path: ".gitignore",
        content: appendBlock(current, block),
        action: current ? "update" : "add",
      });
      notes.push(`.gitignore: ${missing.join(", ")}`);
    }
  }

  // 7. Deletions.
  const deletes = (manifest.delete ?? []).filter(exists);

  return { manifest, writes, deletes, notes };
}

/**
 * Carry out a plan from planInstall().
 * @param {string} root
 * @param {Plan} plan
 */
export function applyPlan(root, plan) {
  for (const rel of plan.deletes)
    fs.rmSync(path.join(root, rel), { recursive: true, force: true });
  for (const write of plan.writes) {
    const abs = path.join(root, write.path);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, write.content);
  }
}
