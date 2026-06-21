#!/usr/bin/env node
/**
 * Fork setup CLI — `npm run setup`
 * ════════════════════════════════════════════════════════════════════════════
 * Rewrites the per-fork identity/config files when this repo is forked for a new
 * project. This is the DETERMINISTIC engine: it only edits files, with no AI and
 * no network. It is safe to re-run (idempotent — it replaces values in place).
 *
 * The companion `/setup` Claude Code skill ([.claude/skills/setup/SKILL.md])
 * orchestrates the parts a script can't do — creating the new Sanity project,
 * deploying its schema, adding CORS origins, and verifying with a build — and
 * calls THIS script (via `--config`) for the file writes so the literal values
 * always land deterministically.
 *
 * Files this touches:
 *   • src/config/site.shared.mjs       — Sanity projectId/dataset/apiVersion + URL (regenerated)
 *   • src/config/site.ts               — scalar identity fields (keyed replace)
 *   • wrangler.jsonc                   — worker `name` + the two PUBLIC_SANITY_* vars
 *   • src/styles/variables/colors.css  — --color-brand-500 (the canonical brand hue)
 *   • sanity.cli.ts                    — studioHost (+ clears appId for the new project)
 *   • .env                             — created from .env.example (token left blank)
 *
 * It intentionally does NOT touch the content scaffolding (areaServed, social,
 * sameAs, location pages, FAQs, site-structure) — those stay as a working
 * skeleton for the new site to edit, per the starter design.
 *
 * Usage:
 *   node scripts/setup.mjs                      # interactive prompts
 *   node scripts/setup.mjs --config answers.json --yes   # non-interactive (skill)
 *   node scripts/setup.mjs --dry-run            # show what would change, write nothing
 *
 * Zero dependencies — uses only node: built-ins (keeps the supply-chain surface
 * small, matching this repo's security posture).
 */

import { readFile, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout, argv, exit } from "node:process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const p = (rel) => join(ROOT, rel);

// ── ANSI helpers ────────────────────────────────────────────────────────────
const c = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m", red: "\x1b[31m",
};
const heading = (s) => console.log(`\n${c.bold}${c.cyan}${s}${c.reset}`);
const ok = (s) => console.log(`${c.green}✓${c.reset} ${s}`);
const warn = (s) => console.log(`${c.yellow}!${c.reset} ${s}`);
const info = (s) => console.log(`${c.dim}${s}${c.reset}`);

// ── CLI flags ─────────────────────────────────────────────────────────────
const FLAGS = new Set(argv.slice(2).filter((a) => a.startsWith("--")));
const getFlagValue = (name) => {
  const i = argv.indexOf(name);
  return i !== -1 ? argv[i + 1] : undefined;
};
const DRY_RUN = FLAGS.has("--dry-run");
const ASSUME_YES = FLAGS.has("--yes") || FLAGS.has("-y");
const CONFIG_PATH = getFlagValue("--config");

// ── Field definitions ───────────────────────────────────────────────────────
// Each prompt maps an answer key to where it gets written. `extract` pulls the
// current value from a source file so we can show it as the default.
const SHARED = "src/config/site.shared.mjs";
const SITE = "src/config/site.ts";
const WRANGLER = "wrangler.jsonc";
const COLORS = "src/styles/variables/colors.css";
const THEMES = "src/styles/variables/themes.css";
const TYPOGRAPHY = "src/styles/variables/typography.css";
const LOGO_PATHS = "src/config/logo-paths.ts";
const CLI = "sanity.cli.ts";

// Fluid type tiers whose size is driven by a --{tier}-min / --{tier}-max pair.
// (eyebrow is fixed; tiny/small are fixed but still expose min/max.)
const FLUID_TIERS = new Set([
  "display-xl", "display-lg", "display-md", "display-sm",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "text-tiny", "text-small", "text-regular", "text-large", "text-xlarge",
]);

/** Replace a `--var: ...;` declaration (any value) — first occurrence. */
function replaceCssDecl(src, varName, value) {
  const re = new RegExp(`(${varName.replace(/[-]/g, "\\$&")}\\s*:\\s*)[^;]+;`);
  if (!re.test(src)) return { src, changed: false };
  const next = src.replace(re, `$1${value};`);
  return { src: next, changed: next !== src };
}

/** Replace an `export const NAME = "...";` string assignment. */
function replaceAssignedString(src, name, value) {
  const re = new RegExp(`(\\b${name}\\s*=\\s*)(["'])(?:\\\\.|(?!\\2).)*\\2`);
  if (!re.test(src)) return { src, changed: false };
  return { src: src.replace(re, `$1${JSON.stringify(value)}`), changed: true };
}

// Maps a `themeColors` key to the selector that opens that theme's block in
// themes.css. Blocks contain no nested braces, so "from this selector to the
// next }" is a safe, unambiguous slice.
const THEME_BLOCK_MARKER = {
  light: '[data-theme="light"],',
  dark: '[data-theme="dark"],',
  brand: '[data-theme="brand"],',
};

/** Replace `varName: ...;` only within the given theme block of themes.css. */
function replaceInThemeBlock(src, marker, varName, value) {
  const mIdx = src.indexOf(marker);
  if (mIdx === -1) return { src, changed: false };
  const braceIdx = src.indexOf("{", mIdx);
  const closeIdx = src.indexOf("}", braceIdx);
  if (braceIdx === -1 || closeIdx === -1) return { src, changed: false };
  const re = new RegExp(`(${varName.replace(/[-]/g, "\\$&")}\\s*:\\s*)[^;]+;`);
  const block = src.slice(braceIdx, closeIdx);
  if (!re.test(block)) return { src, changed: false };
  const next = block.replace(re, `$1${value};`);
  return { src: src.slice(0, braceIdx) + next + src.slice(closeIdx), changed: true };
}

/** Replace the FIRST `key: "..."` (or `key: '...'`) string literal in `src`. */
function replaceKeyedString(src, key, value) {
  const re = new RegExp(`(\\b${key}\\s*:\\s*)(["'])(?:\\\\.|(?!\\2).)*\\2`);
  if (!re.test(src)) return { src, changed: false };
  return { src: src.replace(re, `$1${JSON.stringify(value)}`), changed: true };
}

/** Replace a JSON `"key": "..."` value (wrangler.jsonc). */
function replaceJsonString(src, key, value) {
  const re = new RegExp(`("${key}"\\s*:\\s*)"(?:\\\\.|[^"])*"`);
  if (!re.test(src)) return { src, changed: false };
  return { src: src.replace(re, `$1${JSON.stringify(value)}`), changed: true };
}

const currentString = (src, key) => {
  const m = src.match(new RegExp(`\\b${key}\\s*:\\s*"((?:\\\\.|[^"])*)"`));
  return m ? m[1].replace(/\\"/g, '"') : "";
};
const currentJson = (src, key) => {
  const m = src.match(new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"])*)"`));
  return m ? m[1] : "";
};
const currentCssVar = (src, name) => {
  const m = src.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  return m ? m[1].trim() : "";
};

// Prompt list. `target` describes where the value is written (handled below).
const PROMPTS = [
  // ── Identity ──────────────────────────────────────────────────────────────
  { key: "siteName", q: "Site / brand name", from: [SITE, "name"] },
  { key: "siteUrl", q: "Site URL (no trailing slash)", from: [SHARED, "SITE_URL"], validate: (v) => /^https?:\/\/[^/]+$/.test(v) || "Must be an absolute origin like https://www.example.com (no trailing slash)" },
  { key: "email", q: "Primary contact email", from: [SITE, "email"] },
  { key: "founder", q: "Founder / person name", from: [SITE, "founder"] },
  { key: "tagline", q: "Tagline (appended to <title>)", from: [SITE, "tagline"] },
  { key: "defaultDescription", q: "Fallback meta description", from: [SITE, "defaultDescription"] },
  { key: "summary", q: "One-line summary (JSON-LD / llms.txt)", from: [SITE, "summary"] },
  { key: "localBusinessDescription", q: "LocalBusiness description (JSON-LD)", from: [SITE, "localBusinessDescription"] },
  { key: "xHandle", q: "X / Twitter handle (@form)", from: [SITE, "xHandle"] },
  // ── Contact / address ─────────────────────────────────────────────────────
  { key: "phoneDisplay", q: "Phone — display, e.g. (555) 123-4567", from: [SITE, "display"] },
  { key: "phoneE164", q: "Phone — E.164, e.g. +1-555-123-4567", from: [SITE, "e164"] },
  { key: "phoneTel", q: "Phone — digits only", from: [SITE, "tel"] },
  { key: "hours", q: "Visible business hours", from: [SITE, "hours"] },
  { key: "addressLocality", q: "City / locality", from: [SITE, "locality"] },
  { key: "addressRegion", q: "State / region", from: [SITE, "region"] },
  { key: "addressCountry", q: "Country code", from: [SITE, "country"] },
  { key: "priceRange", q: "Price range (schema.org)", from: [SITE, "priceRange"] },
  // ── Brand ─────────────────────────────────────────────────────────────────
  { key: "brandColor", q: "Brand color (hex, e.g. #f35423)", from: [COLORS, "--color-brand-500"], css: true, validate: (v) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) || "Must be a hex color like #1a73e8" },
  // ── Sanity ────────────────────────────────────────────────────────────────
  { key: "sanityProjectId", q: "Sanity project id", from: [SHARED, "SANITY_PROJECT_ID"] },
  { key: "sanityDataset", q: "Sanity dataset", from: [SHARED, "SANITY_DATASET"] },
  { key: "sanityApiVersion", q: "Sanity API version (date)", from: [SHARED, "SANITY_API_VERSION"] },
  { key: "studioHost", q: "Sanity studioHost (the <host>.sanity.studio subdomain)", from: [CLI, "studioHost"] },
  { key: "workerName", q: "Cloudflare Worker name", from: [WRANGLER, "name"], json: true },
  // ── Integrations (optional — blank to leave as-is) ─────────────────────────
  { key: "gtmId", q: "Google Tag Manager id (blank = keep)", from: [SITE, "gtmId"], optional: true },
  { key: "mailerLiteAccount", q: "MailerLite account id (blank = keep)", from: [SITE, "mailerLiteAccount"], optional: true },
  { key: "usercentricsId", q: "Usercentrics CMP id (blank = keep)", from: [SITE, "usercentricsId"], optional: true },
  { key: "honeybookPlacementId", q: "HoneyBook placement id (blank = keep)", from: [SITE, "honeybookPlacementId"], optional: true },
];

async function readSrc(rel) {
  return readFile(p(rel), "utf8");
}
async function fileExists(rel) {
  try { await access(p(rel), constants.F_OK); return true; } catch { return false; }
}

async function resolveDefault(prompt, cache) {
  const [file, key] = prompt.from;
  if (!cache[file]) cache[file] = await readSrc(file);
  const src = cache[file];
  if (prompt.css) return currentCssVar(src, key);
  if (prompt.json) return currentJson(src, key);
  return currentString(src, key);
}

async function gatherInteractive() {
  const rl = createInterface({ input: stdin, output: stdout });
  const cache = {};
  const answers = { _cssColors: {}, _themeColors: {}, _fluidType: {} };
  heading("Fork setup — identity & config");
  info("Press Enter to keep the current value shown in [brackets]. Ctrl-C to abort.\n");
  for (const prompt of PROMPTS) {
    const def = await resolveDefault(prompt, cache);
    let value;
    while (true) {
      const raw = (await rl.question(`${prompt.q}${def ? ` ${c.dim}[${def}]${c.reset}` : ""}: `)).trim();
      value = raw || def;
      if (prompt.optional && !raw) { value = def; break; }
      if (prompt.validate && value) {
        const res = prompt.validate(value);
        if (res !== true) { warn(typeof res === "string" ? res : "Invalid value"); continue; }
      }
      break;
    }
    answers[prompt.key] = value;
  }
  rl.close();
  return answers;
}

async function gatherFromConfig(path) {
  const json = JSON.parse(await readFile(path, "utf8"));
  const cache = {};
  const answers = {};
  // Fill from JSON, falling back to the current file value for anything omitted.
  for (const prompt of PROMPTS) {
    answers[prompt.key] =
      json[prompt.key] !== undefined && json[prompt.key] !== ""
        ? json[prompt.key]
        : await resolveDefault(prompt, cache);
  }
  // Optional raw swatch map, e.g. pulled from Figma:
  //   { "--color-brand-500": "#1a73e8", "--color-dark-900": "#0c111d", ... }
  // Keys must be CSS custom properties already declared in colors.css.
  answers._cssColors =
    json.cssColors && typeof json.cssColors === "object" ? json.cssColors : {};
  // Optional per-theme overrides for themes.css, scoped by theme block:
  //   { "light": { "--heading-accent": "#123" }, "brand": { "--background": "var(--color-brand-600)" } }
  // Most forks won't need this — themes.css references the swatches above, so
  // changing cssColors usually re-skins the themes automatically. Use this only
  // to point a theme alias at a different value/swatch.
  answers._themeColors =
    json.themeColors && typeof json.themeColors === "object" ? json.themeColors : {};
  // Optional fluid type scale — only the min/max (rem) knobs per tier; the
  // clamp() expressions reference them, so the fluid size recomputes itself:
  //   { "h1": { "min": 2.5, "max": 4 }, "text-regular": { "min": 1, "max": 1.2 } }
  answers._fluidType =
    json.fluidType && typeof json.fluidType === "object" ? json.fluidType : {};
  return answers;
}

// ── Writers ─────────────────────────────────────────────────────────────────
// Principle: every writer REPLACES the value of a declaration that already
// exists. None of them add new variables, exports, rules, or restructure a
// file — if a target isn't found, the change is skipped (with a warning), never
// invented. This keeps a fork mechanically identical to the starter; only values
// differ.

async function buildChanges(a) {
  const changes = []; // { rel, before, after, edits: [labels] }

  // Resolve the canonical brand hue. A `cssColors["--color-brand-500"]` (e.g.
  // pulled from Figma) wins over the scalar `brandColor`; either way the same
  // value feeds both the CSS swatch and the SITE.brand.color mirror in site.ts.
  const cssColors = a._cssColors || {};
  const brand500 = cssColors["--color-brand-500"] || a.brandColor;

  // 1. site.shared.mjs — replace the four exported constants in place.
  {
    const before = await readSrc(SHARED);
    let src = before;
    const edits = [];
    for (const [name, value] of [
      ["SANITY_PROJECT_ID", a.sanityProjectId],
      ["SANITY_DATASET", a.sanityDataset],
      ["SANITY_API_VERSION", a.sanityApiVersion],
      ["SITE_URL", a.siteUrl],
    ]) {
      const r = replaceAssignedString(src, name, value);
      if (r.changed && r.src !== src) { src = r.src; edits.push(name); }
    }
    changes.push({ rel: SHARED, before, after: src, edits });
  }

  // 2. site.ts — keyed scalar replacements
  {
    let src = await readSrc(SITE);
    const edits = [];
    const map = {
      name: a.siteName, email: a.email, founder: a.founder, tagline: a.tagline,
      defaultDescription: a.defaultDescription, summary: a.summary,
      localBusinessDescription: a.localBusinessDescription, xHandle: a.xHandle,
      display: a.phoneDisplay, e164: a.phoneE164, tel: a.phoneTel, hours: a.hours,
      locality: a.addressLocality, region: a.addressRegion, country: a.addressCountry,
      priceRange: a.priceRange, color: brand500,
      gtmId: a.gtmId, mailerLiteAccount: a.mailerLiteAccount,
      usercentricsId: a.usercentricsId, honeybookPlacementId: a.honeybookPlacementId,
    };
    for (const [key, value] of Object.entries(map)) {
      if (value === undefined) continue;
      const r = replaceKeyedString(src, key, value);
      if (r.changed) { src = r.src; edits.push(key); }
    }
    changes.push({ rel: SITE, before: await readSrc(SITE), after: src, edits });
  }

  // 3. wrangler.jsonc — name + the two public vars
  {
    let src = await readSrc(WRANGLER);
    const edits = [];
    for (const [key, value] of [
      ["name", a.workerName],
      ["PUBLIC_SANITY_PROJECT_ID", a.sanityProjectId],
      ["PUBLIC_SANITY_DATASET", a.sanityDataset],
    ]) {
      const r = replaceJsonString(src, key, value);
      if (r.changed) { src = r.src; edits.push(key); }
    }
    changes.push({ rel: WRANGLER, before: await readSrc(WRANGLER), after: src, edits });
  }

  // 4. colors.css — the canonical brand hue + any extra swatches (e.g. Figma).
  //    The brand-100..900 scale derives from --color-brand-500 via color-mix,
  //    so only the base swatches are set here; the scale follows automatically.
  {
    const before = await readSrc(COLORS);
    let after = before;
    const edits = [];
    const swatches = { "--color-brand-500": brand500, ...cssColors };
    for (const [name, value] of Object.entries(swatches)) {
      if (!value) continue;
      const re = new RegExp(`(${name.replace(/[-]/g, "\\$&")}\\s*:\\s*)[^;]+;`);
      if (re.test(after)) {
        const next = after.replace(re, `$1${value};`);
        if (next !== after) { after = next; edits.push(name); }
      } else {
        warn(`colors.css has no ${name} declaration — skipped`);
      }
    }
    changes.push({ rel: COLORS, before, after, edits });
  }

  // 4b. themes.css — optional per-theme alias overrides (scoped by block).
  {
    const themeColors = a._themeColors || {};
    const before = await readSrc(THEMES);
    let after = before;
    const edits = [];
    for (const [theme, vars] of Object.entries(themeColors)) {
      const marker = THEME_BLOCK_MARKER[theme];
      if (!marker) { warn(`themes.css: unknown theme "${theme}" — skipped`); continue; }
      for (const [name, value] of Object.entries(vars || {})) {
        if (!value) continue;
        const r = replaceInThemeBlock(after, marker, name, value);
        if (r.changed) { after = r.src; edits.push(`${theme}/${name}`); }
        else warn(`themes.css: ${theme} block has no ${name} — skipped`);
      }
    }
    if (after !== before) changes.push({ rel: THEMES, before, after, edits });
  }

  // 4c. typography.css — fluid type min/max knobs (the clamp()s follow).
  {
    const fluid = a._fluidType || {};
    const before = await readSrc(TYPOGRAPHY);
    let after = before;
    const edits = [];
    for (const [tier, bounds] of Object.entries(fluid)) {
      if (!FLUID_TIERS.has(tier)) { warn(`typography.css: unknown type tier "${tier}" — skipped`); continue; }
      for (const bound of ["min", "max"]) {
        const value = bounds?.[bound];
        if (value === undefined || value === "") continue;
        const r = replaceCssDecl(after, `--${tier}-${bound}`, value);
        if (r.changed) { after = r.src; edits.push(`--${tier}-${bound}`); }
      }
    }
    if (after !== before) changes.push({ rel: TYPOGRAPHY, before, after, edits });
  }

  // 4d. logo-paths.ts — keep the logo's accessible label in sync with the name.
  {
    const before = await readSrc(LOGO_PATHS);
    const r = replaceAssignedString(before, "LOGO_LABEL", a.siteName);
    if (r.changed && r.src !== before) {
      changes.push({ rel: LOGO_PATHS, before, after: r.src, edits: ["LOGO_LABEL"] });
    }
  }

  // 5. sanity.cli.ts — studioHost (+ clear appId; the new project issues its own on first deploy)
  {
    let src = await readSrc(CLI);
    const edits = [];
    const r1 = replaceKeyedString(src, "studioHost", a.studioHost);
    if (r1.changed) { src = r1.src; edits.push("studioHost"); }
    const r2 = replaceKeyedString(src, "appId", "");
    if (r2.changed) { src = r2.src; edits.push("appId (cleared — set after first `sanity deploy`)"); }
    changes.push({ rel: CLI, before: await readSrc(CLI), after: src, edits });
  }

  return changes;
}

async function ensureEnv(a) {
  if (await fileExists(".env")) {
    warn(".env already exists — leaving it untouched.");
    return;
  }
  const example = await readSrc(".env.example");
  const filled = example
    .replace(/^SITE_URL=.*$/m, `SITE_URL=${a.siteUrl}`)
    .replace(/^PUBLIC_SANITY_PROJECT_ID=.*$/m, `PUBLIC_SANITY_PROJECT_ID=${a.sanityProjectId}`)
    .replace(/^PUBLIC_SANITY_DATASET=.*$/m, `PUBLIC_SANITY_DATASET=${a.sanityDataset}`);
  if (DRY_RUN) { info("(dry-run) would create .env from .env.example"); return; }
  await writeFile(p(".env"), filled, "utf8");
  ok("Created .env (fill in SANITY_API_READ_TOKEN — it's intentionally blank)");
}

async function confirm(question) {
  if (ASSUME_YES) return true;
  const rl = createInterface({ input: stdin, output: stdout });
  const ans = (await rl.question(`${question} ${c.dim}(y/N)${c.reset} `)).trim().toLowerCase();
  rl.close();
  return ans === "y" || ans === "yes";
}

async function main() {
  if (FLAGS.has("--help") || FLAGS.has("-h")) {
    console.log(`
${c.bold}Fork setup${c.reset} — rewrite per-fork identity/config files.

  node scripts/setup.mjs               interactive
  node scripts/setup.mjs --config a.json --yes   non-interactive (used by /setup skill)
  node scripts/setup.mjs --dry-run     preview changes, write nothing

Writes: ${SHARED}, ${SITE}, ${WRANGLER}, ${COLORS}, ${THEMES}, ${CLI}, .env
Leaves content scaffolding (areaServed, social, location pages, FAQs) intact.

Color maps (--config only; e.g. pulled from Figma by the /setup skill):
  "cssColors":   { "--color-brand-500": "#1a73e8", "--color-dark-900": "#0c111d" }
  "themeColors": { "brand": { "--background": "var(--color-brand-600)" } }
cssColors sets the raw swatches in colors.css (the brand scale + themes follow
via var() references). themeColors overrides a theme alias only when needed.

Fluid type (--config only) — sets only the min/max rem knobs; the clamp()s follow:
  "fluidType":   { "h1": { "min": 2.5, "max": 4 }, "text-regular": { "min": 1, "max": 1.2 } }

Not handled here (binary assets — the /setup skill guides these): font files
(src/assets/fonts/ + astro.config.mjs fonts array), the OG image / favicon /
webclip (public/images/), and the inline SVG logo paths (src/config/logo-paths.ts).
`);
    return;
  }

  const answers = CONFIG_PATH ? await gatherFromConfig(CONFIG_PATH) : await gatherInteractive();
  const changes = await buildChanges(answers);

  heading("Planned changes");
  let totalEdits = 0;
  for (const ch of changes) {
    if (ch.after === ch.before) { info(`  ${ch.rel} — no change`); continue; }
    totalEdits += ch.edits.length;
    ok(`${ch.rel} ${c.dim}→ ${ch.edits.join(", ") || "rewritten"}${c.reset}`);
  }
  if (totalEdits === 0) warn("Nothing changed (values already match).");

  if (DRY_RUN) {
    await ensureEnv(answers);
    info("\n(dry-run) No files written.");
    return;
  }

  if (!ASSUME_YES && !(await confirm("\nWrite these changes?"))) {
    warn("Aborted. No files written.");
    exit(1);
  }

  for (const ch of changes) {
    if (ch.after === ch.before) continue;
    await writeFile(p(ch.rel), ch.after, "utf8");
    ok(`Wrote ${ch.rel}`);
  }
  await ensureEnv(answers);

  heading("Next steps");
  console.log(`  1. ${c.bold}npm run check:config${c.reset}   verify wrangler ↔ site.shared.mjs agree
  2. ${c.bold}npm run build${c.reset}          confirm the site still builds
  3. Fill ${c.bold}SANITY_API_READ_TOKEN${c.reset} in .env (Sanity → API → Tokens, Viewer role)
  4. Finish the dashboard steps in ${c.bold}docs/new-project-checklist.md${c.reset}
     (Sanity CORS, Cloudflare secrets + WAF + domain, GitHub Dependabot).
${c.dim}  The /setup Claude skill automates steps 1–2 and the Sanity project creation.${c.reset}
`);
}

main().catch((err) => {
  console.error(`${c.red}✗ setup failed:${c.reset}`, err.message);
  exit(1);
});
