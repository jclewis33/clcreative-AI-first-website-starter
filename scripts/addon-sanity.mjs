#!/usr/bin/env node
// @ts-check
/**
 * npm run addon:sanity — installs the Sanity add-on (addons/sanity/):
 * copies its overlay over the project and merges its manifest into
 * package.json, wrangler.jsonc, tsconfig.json, .env.example and
 * .gitignore. What it adds and how to remove it: addons/sanity/README.md.
 *
 *   npm run addon:sanity                 install
 *   npm run addon:sanity -- --dry-run    list what would change; write nothing
 *   npm run addon:sanity -- --force      install on a dirty or non-git tree
 *
 * Refuses when the add-on is already installed and, without --force, when
 * the git tree has uncommitted changes (so `git diff` afterwards shows
 * exactly what changed). Zero dependencies.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AddonError, applyPlan, planInstall } from "./lib/addon-install.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const flags = new Set(process.argv.slice(2));
const dryRun = flags.has("--dry-run");

try {
  const plan = planInstall({
    root: ROOT,
    addonDir: path.join(ROOT, "addons", "sanity"),
    force: flags.has("--force"),
  });
  console.log(
    `${dryRun ? "Would install" : "Installing"} the ${plan.manifest.name} add-on:`,
  );
  for (const write of plan.writes)
    console.log(`  ${write.action.padEnd(9)} ${write.path}`);
  for (const rel of plan.deletes) console.log(`  delete    ${rel}`);
  for (const note of plan.notes) console.log(`  · ${note}`);
  if (dryRun) {
    console.log("\n(dry run) Nothing written.");
  } else {
    applyPlan(ROOT, plan);
    console.log(`\n✓ ${plan.manifest.name} add-on installed. Next:`);
    (plan.manifest.nextSteps ?? []).forEach((step, i) =>
      console.log(`  ${i + 1}. ${step}`),
    );
  }
} catch (err) {
  if (err instanceof AddonError) {
    console.error(`✗ addon:sanity: ${err.message}`);
    process.exit(1);
  }
  throw err;
}
