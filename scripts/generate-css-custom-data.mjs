#!/usr/bin/env node
/**
 * Generates .vscode/css.custom-data.json from the design tokens.
 *
 * VS Code autocompletes CSS custom properties only for files it has parsed,
 * which leaves `var(--…)` inside .astro <style> blocks with no suggestions.
 * Pointing `css.customData` at a generated manifest fixes that — the same
 * trick .vscode/html.custom-data.json already does for data-* attributes.
 *
 * Generated, never hand-edited: 300+ tokens kept in sync by hand is exactly
 * the drift `scripts/check-config-sync.mjs` exists to prevent. Re-run with
 * `npm run css-data` after adding or renaming a token.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";

const VARS_DIR = "src/styles/variables";
const OUT = ".vscode/css.custom-data.json";

/** `--name: value; /* comment *\/` → { name, value, comment } */
/* `[^\S\n]*` not `\s*` before the comment: \s matches newlines, so a plain
   \s* happily reached down and attached the NEXT line's section header to
   this token (--background-skeleton came out described as "Text"). */
const DECL =
  /^[^\S\n]*(--[a-z0-9-]+)[^\S\n]*:[^\S\n]*([^;\n]+);(?:[^\S\n]*\/\*[^\S\n]*(.*?)[^\S\n]*\*\/)?/gim;

const properties = new Map();

for (const file of readdirSync(VARS_DIR).filter((f) => f.endsWith(".css"))) {
  const css = readFileSync(join(VARS_DIR, file), "utf8");
  for (const m of css.matchAll(DECL)) {
    const [, name, rawValue, comment] = m;
    // First definition wins — later ones are theme overrides of the same token.
    if (properties.has(name)) continue;
    const value = rawValue.trim().replace(/\s+/g, " ");
    const note = comment?.trim();
    properties.set(name, {
      name,
      description: [note, `\`${value}\``, `— ${basename(file)}`]
        .filter(Boolean)
        .join("  \n"),
    });
  }
}

const sorted = [...properties.values()].sort((a, b) =>
  a.name.localeCompare(b.name),
);

writeFileSync(
  OUT,
  JSON.stringify({ version: 1.1, properties: sorted }, null, 2) + "\n",
);
console.log(`${OUT}: ${sorted.length} custom properties`);
