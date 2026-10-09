/**
 * Fixture check for the project/gallery formatting helpers — the edge cases
 * the templates rely on (renamed categories, missing locations, deleted
 * project references). Pure modules only, so it runs under plain Node:
 *   node scripts/check-projects.mjs
 */
import assert from "node:assert/strict";
import { categoryTitle } from "../src/config/projects.ts";
import { galleryCaptionMeta, photoAlt } from "../src/lib/project-format.ts";

assert.equal(categoryTitle("remodel"), "Remodel");
// A category renamed in config after content used it: show the raw value.
assert.equal(categoryTitle("renamed-old-value"), "renamed-old-value");
assert.equal(categoryTitle(null), "");
assert.equal(categoryTitle(undefined), "");

assert.equal(
  galleryCaptionMeta("Springfield, IL", "Smith kitchen"),
  "Springfield, IL · Smith kitchen",
);
assert.equal(galleryCaptionMeta("Springfield, IL", null), "Springfield, IL");
// Deleted project reference + empty location: no dangling separator.
assert.equal(galleryCaptionMeta("", "Smith kitchen"), "Smith kitchen");
assert.equal(galleryCaptionMeta("   ", undefined), "");
assert.equal(galleryCaptionMeta(null, undefined), "");

// Images never ship alt="": an editor-set alt wins, else a real fallback.
assert.equal(
  photoAlt("Tiled shower wall", "Bathroom photo"),
  "Tiled shower wall",
);
assert.equal(photoAlt("", "Signage install"), "Signage install");
assert.equal(photoAlt("   ", "Kitchen remodel photo"), "Kitchen remodel photo");
assert.equal(photoAlt(null, "Kitchen remodel photo"), "Kitchen remodel photo");

console.log("check-projects: ok");
