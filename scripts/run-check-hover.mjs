/**
 * run-check-hover — runs scripts/check-hover.mjs in BATCHES, each in its own
 * process with a fresh language server, and retries a batch ONCE when the
 * language server itself failed (check-hover exits 3).
 *
 * Why batches: the Astro language server bundles the Astro compiler as a Go
 * WebAssembly program with a ~2 GB memory ceiling. One probe page holding
 * every documented prop (861 when this was written) pushed it past that on CI
 * ("runtime: out of memory … fatal error: out of memory", then "Go program has
 * already exited"). Smaller pages on fresh servers stay well under it.
 *
 * Why one retry: a server can still fail for reasons unrelated to the code;
 * a real tooltip failure exits 1 and is never retried, and a server that
 * fails twice in a row still fails the check.
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
const BATCHES = 4;
const EXIT_SERVER_FAILED = 3;
const ATTEMPTS = 2;

let worst = 0;
for (let batch = 0; batch < BATCHES; batch++) {
  let status = 1;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    status =
      spawnSync(process.execPath, [SCRIPT, `--batch=${batch}/${BATCHES}`], {
        stdio: "inherit",
      }).status ?? 1;
    if (status !== EXIT_SERVER_FAILED) break;
    if (attempt < ATTEMPTS)
      console.error(
        `\ncheck-hover: the language server failed on batch ${batch + 1} of ${BATCHES} — retrying once with a fresh server.\n`,
      );
  }
  if (status !== 0 && worst === 0) worst = status;
}
if (worst === 0) console.log(`✓ check-hover: all ${BATCHES} batches passed`);
process.exit(worst);
