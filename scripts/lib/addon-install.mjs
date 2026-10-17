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
 * planInstall() validates the manifest and decides every write before
 * anything is written, so a refusal leaves the tree untouched; applyPlan()
 * then writes. Every path it touches must sit strictly inside the project,
 * outside any .git folder, and never reach through a symlink.
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

/** @param {unknown} v */
const isRecord = (v) => !!v && typeof v === "object" && !Array.isArray(v);
/** @param {unknown} v */
const isStringRecord = (v) =>
  isRecord(v) &&
  Object.values(/** @type {object} */ (v)).every((x) => typeof x === "string");
/** @param {unknown} v */
const isStringArray = (v) =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

/**
 * Refuse a manifest whose fields have the wrong shape.
 * @param {any} m
 * @param {string} where
 * @returns {Manifest}
 */
function validateManifest(m, where) {
  /** @type {string[]} */
  const bad = [];
  if (!isRecord(m)) bad.push("the top level must be an object");
  else {
    if (typeof m.name !== "string" || !m.name.trim())
      bad.push("name must be a non-empty string");
    if (typeof m.marker !== "string" || !m.marker.trim())
      bad.push("marker must be a non-empty string");
    for (const field of ["dependencies", "devDependencies", "scripts"])
      if (m[field] !== undefined && !isStringRecord(m[field]))
        bad.push(`${field} must map names to strings`);
    if (
      m.wrangler !== undefined &&
      (!isRecord(m.wrangler) ||
        !isStringRecord(m.wrangler.vars) ||
        (m.wrangler.comment !== undefined &&
          typeof m.wrangler.comment !== "string"))
    )
      bad.push("wrangler must be { vars: { NAME: string }, comment?: string }");
    if (m.tsconfig !== undefined && !isRecord(m.tsconfig))
      bad.push("tsconfig must be an object of compilerOptions");
    for (const field of ["env", "gitignore", "delete", "nextSteps"])
      if (m[field] !== undefined && !isStringArray(m[field]))
        bad.push(`${field} must be an array of strings`);
  }
  if (bad.length)
    throw new AddonError(`${where} is invalid: ${bad.join("; ")}.`);
  return m;
}

/**
 * `rel` as a POSIX path strictly inside `root` (not root itself, not
 * in a .git folder), with no symlink among the directories between them; the
 * path itself may be a symlink only when `linkOk` (deleting a link
 * removes the link, not its target).
 * @param {string} root
 * @param {string} rel
 * @param {string} what  Names the path in the refusal.
 * @param {boolean} [linkOk]
 * @returns {string}
 */
function insideRoot(root, rel, what, linkOk = false) {
  const relative = path.relative(root, path.resolve(root, rel));
  const parts = relative.split(path.sep);
  if (
    !rel.trim() ||
    !relative ||
    parts[0] === ".." ||
    path.isAbsolute(relative)
  )
    throw new AddonError(
      `${what} "${rel}" is not a path inside the project. Refusing to touch it.`,
    );
  if (parts.some((part) => part.toLowerCase() === ".git"))
    throw new AddonError(
      `${what} "${rel}" is inside .git. Refusing to touch it.`,
    );
  let current = root;
  for (const [i, part] of parts.entries()) {
    current = path.join(current, part);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch {
      break; // Nothing further exists, so nothing further is a link.
    }
    if (stat.isSymbolicLink() && (i < parts.length - 1 || !linkOk))
      throw new AddonError(
        `${what} "${rel}" goes through a symlink (${parts.slice(0, i + 1).join("/")}). Refusing to write through it.`,
      );
  }
  return parts.join("/");
}

/**
 * Every file under `dir` as a POSIX path relative to it, sorted.
 * @param {string} dir
 * @param {string} [prefix]
 * @returns {string[]}
 */
function overlayFiles(dir, prefix = "") {
  if (!fs.existsSync(dir)) return [];
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return entries.flatMap((entry) => {
    if (SKIP.has(entry.name)) return [];
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink())
      throw new AddonError(
        `the add-on overlay contains a symlink (files/${rel}). Replace it with a real file.`,
      );
    return entry.isDirectory()
      ? overlayFiles(path.join(dir, entry.name), rel)
      : [rel];
  });
}

/**
 * Refuse unless `root` is the top level of a clean git checkout.
 * @param {string} root
 */
function assertClean(root) {
  const git = (/** @type {string[]} */ ...args) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  let top;
  let status;
  try {
    top = git("rev-parse", "--show-toplevel").trim();
    status = git("status", "--porcelain");
  } catch {
    throw new AddonError(
      "can't confirm the working tree is clean: this is not a git repository (or git is not installed). Back the project up, then run again with --force.",
    );
  }
  if (fs.realpathSync(top) !== fs.realpathSync(root))
    throw new AddonError(
      `can't confirm the working tree is clean: the project is not the top level of its git repository (that is ${top}). Make the project its own repository, or back it up and run again with --force.`,
    );
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
 * `out` (written with LF) in the line endings `original` uses.
 * @param {string} original
 * @param {string} out
 */
const sameEol = (original, out) =>
  original.includes("\r\n") ? out.replace(/\r?\n/g, "\r\n") : out;

/**
 * @param {string} current
 * @param {string[]} block
 */
const appendBlock = (current, block) => {
  const lf = current.replace(/\r\n/g, "\n");
  return sameEol(
    current,
    lf
      ? `${lf.replace(/\n*$/, "\n")}\n${block.join("\n")}\n`
      : `${block.join("\n")}\n`,
  );
};

/**
 * @param {{ root: string, addonDir: string, force?: boolean }} options
 * @returns {Plan}
 */
export function planInstall({ root, addonDir, force = false }) {
  const manifestPath = path.join(addonDir, "manifest.json");
  const manifestRel = path.relative(root, manifestPath);
  if (!fs.existsSync(manifestPath))
    throw new AddonError(
      `${manifestRel} not found. Copy the add-on folder from the starter repo (addons/<name>/, at the version this project was created from) into this project, commit it, then run again.`,
    );
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (err) {
    throw new AddonError(
      `${manifestRel} is not valid JSON: ${/** @type {Error} */ (err).message}`,
    );
  }
  const manifest = validateManifest(raw, manifestRel);
  const marker = insideRoot(root, manifest.marker, "the manifest's marker");
  if (fs.existsSync(path.join(root, marker)))
    throw new AddonError(
      `the ${manifest.name} add-on is already installed (${manifest.marker} exists). Nothing to do.`,
    );
  if (!force) assertClean(root);

  const filesDir = path.join(addonDir, "files");
  const overlay = overlayFiles(filesDir);
  // Lower-cased: on a case-insensitive filesystem Package.json IS package.json.
  const clash = overlay.find((rel) => MERGED.includes(rel.toLowerCase()));
  if (clash)
    throw new AddonError(
      `the add-on overlay must not contain ${clash}: put those changes in manifest.json.`,
    );

  const exists = (/** @type {string} */ rel) =>
    fs.existsSync(path.join(root, rel));
  const read = (/** @type {string} */ rel) => {
    if (!exists(rel)) throw new AddonError(`${rel} not found in the project.`);
    insideRoot(root, rel, "the project file");
    return fs.readFileSync(path.join(root, rel), "utf8");
  };
  /** @type {Write[]} */
  const writes = [];
  /** @type {string[]} */
  const notes = [];

  // 1. The overlay.
  for (const rel of overlay) {
    insideRoot(root, rel, "the overlay file");
    if (exists(rel) && fs.lstatSync(path.join(root, rel)).isDirectory())
      throw new AddonError(
        `the overlay file ${rel} would replace a directory in the project. Move or remove that directory first.`,
      );
    const content = fs.readFileSync(path.join(filesDir, rel));
    if (!exists(rel)) writes.push({ path: rel, content, action: "add" });
    else if (!fs.readFileSync(path.join(root, rel)).equals(content))
      writes.push({ path: rel, content, action: "overwrite" });
  }

  // 2. package.json: dependencies (kept sorted, as npm does) and scripts.
  if (manifest.dependencies || manifest.devDependencies || manifest.scripts) {
    const original = read("package.json");
    let pkg;
    try {
      pkg = JSON.parse(original);
    } catch (err) {
      throw new AddonError(
        `package.json is not valid JSON: ${/** @type {Error} */ (err).message}`,
      );
    }
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
        content: sameEol(original, `${JSON.stringify(pkg, null, 2)}\n`),
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
    let result;
    try {
      result = setMembers(read(file), key, entries, options);
    } catch (err) {
      if (err instanceof AddonError) throw err;
      throw new AddonError(
        `${file} could not be merged: ${/** @type {Error} */ (err).message}`,
      );
    }
    if (result.changed.length) {
      writes.push({ path: file, content: result.text, action: "update" });
      notes.push(`${file} ${key}: ${result.changed.join(", ")}`);
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

  // 7. Deletions (a symlink is removed itself, never followed).
  const deletes = (manifest.delete ?? [])
    .map((rel) => insideRoot(root, rel, "the manifest's delete entry", true))
    .filter((rel) => {
      try {
        fs.lstatSync(path.join(root, rel));
        return true;
      } catch {
        return false;
      }
    });

  // Every write target, re-checked as a whole (merged files included): no
  // symlink on the way, no existing file where a directory must go, and
  // no delete entry that would remove it (deletes run first).
  for (const write of writes) {
    insideRoot(root, write.path, "the write target");
    const parts = write.path.split("/");
    for (let i = 1; i < parts.length; i++) {
      const dir = parts.slice(0, i).join("/");
      if (exists(dir) && !fs.statSync(path.join(root, dir)).isDirectory())
        throw new AddonError(
          `${write.path} can't be written: ${dir} is a file in the project, not a directory.`,
        );
    }
    const lower = write.path.toLowerCase();
    const removed = deletes.find(
      (rel) =>
        lower === rel.toLowerCase() ||
        lower.startsWith(`${rel.toLowerCase()}/`),
    );
    if (removed)
      throw new AddonError(
        `the manifest deletes ${removed}, which the install also writes (${write.path}). Drop one of them.`,
      );
  }

  return { manifest, writes, deletes, notes };
}

/**
 * Carry out a plan from planInstall(). Planning already refused anything
 * it could foresee; if the filesystem fails part-way, the AddonError names
 * the step that failed and every step already applied (`git status` shows
 * them too).
 * @param {string} root
 * @param {Plan} plan
 */
export function applyPlan(root, plan) {
  /** @type {string[]} */
  const done = [];
  /** @type {Array<[string, () => void]>} */
  const steps = [
    ...plan.deletes.map(
      (rel) =>
        /** @type {[string, () => void]} */ ([
          `delete ${rel}`,
          () =>
            fs.rmSync(path.join(root, rel), { recursive: true, force: true }),
        ]),
    ),
    ...plan.writes.map(
      (write) =>
        /** @type {[string, () => void]} */ ([
          `${write.action} ${write.path}`,
          () => {
            const abs = path.join(root, write.path);
            fs.mkdirSync(path.dirname(abs), { recursive: true });
            fs.writeFileSync(abs, write.content);
          },
        ]),
    ),
  ];
  for (const [label, run] of steps) {
    try {
      run();
    } catch (err) {
      throw new AddonError(
        `the install failed at ${label}: ${/** @type {Error} */ (err).message}\n  Already applied:${
          done.length ? done.map((d) => `\n    ${d}`).join("") : " nothing"
        }\n  \`git status\` shows them; restore what you need (\`git restore <path>\`, and remove added files), fix the cause, then run again.`,
      );
    }
    done.push(label);
  }
}
