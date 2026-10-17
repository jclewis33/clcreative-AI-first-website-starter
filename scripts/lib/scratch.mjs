// @ts-check
/**
 * Scratch copies of this repo for end-to-end checks (check-addon-sanity.mjs,
 * check-setup.mjs): the working tree as git sees it — tracked files plus
 * untracked ones that aren't ignored, uncommitted edits included —
 * committed in a fresh repository, so tools that insist on a clean tree
 * (the add-on installer) run unforced. node_modules, dist and .parity are
 * ignored, so they are not copied. Zero dependencies.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * git with a throwaway identity (CI runners have none).
 * @param {string} cwd
 * @param {...string} args
 */
export function git(cwd, ...args) {
  return execFileSync(
    "git",
    [
      "-c",
      "user.name=scratch",
      "-c",
      "user.email=scratch@example.invalid",
      ...args,
    ],
    {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    },
  );
}

/**
 * Exit with a one-line message, not a stack trace, when `dir` is not inside
 * a git repository (or git is missing): the scratch copy lists files with
 * git. A downloaded ZIP of the starter has no .git folder.
 * @param {string} dir
 * @param {string} command the npm script, for the message
 */
export function requireGitRepo(dir, command) {
  try {
    git(dir, "rev-parse", "--is-inside-work-tree");
  } catch {
    console.error(
      `${command} needs a git repository: run \`git init && git add -A && git commit -m "Start"\` in ${dir}, then try again.`,
    );
    process.exit(1);
  }
}

/**
 * Copy the repo at `from` into a new temp dir and commit it there. A copy
 * that fails part-way is removed before the error is rethrown; once this
 * returns, removing the copy is the caller's job.
 * @param {string} from
 * @returns {string} the copy's root
 */
export function scratchCopy(from) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "starter-scratch-"));
  try {
    const files = git(
      from,
      "ls-files",
      "-z",
      "--cached",
      "--others",
      "--exclude-standard",
    )
      .split("\0")
      .filter(Boolean);
    for (const rel of files) {
      const source = path.join(from, rel);
      // Skip what isn't a regular file here: deleted in the working tree, or
      // a symlink (lstat does not follow it).
      if (!fs.existsSync(source) || !fs.lstatSync(source).isFile()) continue;
      const target = path.join(dir, rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(source, target);
    }
    git(dir, "init", "-q");
    git(dir, "add", "-A");
    git(dir, "commit", "-qm", "scratch copy");
    return dir;
  } catch (err) {
    fs.rmSync(dir, { recursive: true, force: true });
    throw err;
  }
}
