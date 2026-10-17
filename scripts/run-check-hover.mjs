/**
 * run-check-hover — runs scripts/check-hover.mjs, retrying ONCE when the
 * language server itself failed (check-hover exits 3).
 *
 * The Astro language server bundles the Astro compiler as a Go WebAssembly
 * program, and on CI runners it occasionally dies mid-run with "Go program has
 * already exited" — unrelated to the code being checked (the same commit
 * passes on the next run). A real tooltip failure exits 1 and is never
 * retried; a server that fails twice in a row still fails the check.
 *
 * Usage: npm run check:hover
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "check-hover.mjs",
);
const EXIT_SERVER_FAILED = 3;
const ATTEMPTS = 2;

let status = 1;
for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
  status =
    spawnSync(process.execPath, [SCRIPT], { stdio: "inherit" }).status ?? 1;
  if (status !== EXIT_SERVER_FAILED) break;
  if (attempt < ATTEMPTS)
    console.error(
      `\ncheck-hover: the language server failed (attempt ${attempt} of ${ATTEMPTS}) — retrying once with a fresh server.\n`,
    );
}
process.exit(status);
