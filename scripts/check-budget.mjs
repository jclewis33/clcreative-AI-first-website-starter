#!/usr/bin/env node
/**
 * check-budget — a page-weight budget for a built site. Run after
 * `npm run build`:
 *
 *   node scripts/check-budget.mjs [dist/client]
 *
 * For every built HTML page it measures what the browser downloads before
 * the page is usable, gzipped (what actually crosses the network):
 *
 *   - html:  the page itself
 *   - css:   every stylesheet the page links, plus its inline <style>
 *   - js:    every script and module preload the page loads (imports of
 *            those modules are followed, so a chunk pulled in by a
 *            component script counts too)
 *
 * and, across the whole build, the largest single image file (images are
 * already compressed, so they are measured as stored).
 *
 * This is a weight budget, not a Lighthouse score: it is deterministic,
 * runs offline in a second, and catches the usual regressions — a library
 * imported site-wide, an unoptimised image, a page that inlines a huge SVG.
 *
 * Budgets live in `scripts/budget.json`. Over budget fails the check;
 * within 10% of a budget is reported as a warning. Writes a Markdown table
 * to $GITHUB_STEP_SUMMARY when it is set.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { parse } from "node-html-parser";

const DIST = process.argv[2] ?? "dist/client";
const BUDGET_FILE = "scripts/budget.json";
const budget = JSON.parse(fs.readFileSync(BUDGET_FILE, "utf8"));
const KB = 1024;

if (!fs.existsSync(DIST)) {
  console.error(
    `[check-budget] ${DIST} does not exist — run npm run build first.`,
  );
  process.exit(1);
}

function walk(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, base));
    else out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out;
}

const files = walk(DIST);
const gzipCache = new Map();
const gz = (rel) => {
  if (!gzipCache.has(rel)) {
    gzipCache.set(
      rel,
      zlib.gzipSync(fs.readFileSync(path.join(DIST, rel))).length,
    );
  }
  return gzipCache.get(rel);
};
/** A same-site absolute or root-relative URL → its built file, or null. */
const localFile = (url) => {
  if (!url || /^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith("//"))
    return null;
  const rel = decodeURIComponent(url.split(/[?#]/)[0]).replace(/^\/+/, "");
  return fs.existsSync(path.join(DIST, rel)) ? rel : null;
};

/** A JS file plus every module it statically imports, followed transitively. */
function jsClosure(entry, seen = new Set()) {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  const source = fs.readFileSync(path.join(DIST, entry), "utf8");
  const dir = path.posix.dirname(`/${entry}`);
  // Static imports only (`import … from "./x.js"`, `import "./x.js"`):
  // a dynamic import() loads later, on demand, so it is not page weight.
  const re = /\bimport\s*(?:[\w*{}\s,$]+\s*from\s*)?["']([^"']+\.m?js)["']/g;
  for (const [, spec] of source.matchAll(re)) {
    const url = spec.startsWith("/") ? spec : path.posix.join(dir, spec);
    const rel = localFile(url);
    if (rel) jsClosure(rel, seen);
  }
  return seen;
}

const pageName = (file) =>
  file === "index.html"
    ? "/"
    : `/${file.replace(/index\.html$/, "").replace(/\.html$/, "")}`;

const rows = [];
for (const file of files.filter((f) => f.endsWith(".html")).sort()) {
  const html = fs.readFileSync(path.join(DIST, file), "utf8");
  const root = parse(html);
  const css = new Set();
  const js = new Set();
  for (const el of root.querySelectorAll('link[rel~="stylesheet"]')) {
    const rel = localFile(el.getAttribute("href"));
    if (rel) css.add(rel);
  }
  for (const el of root.querySelectorAll(
    'script[src], link[rel="modulepreload"]',
  )) {
    const rel = localFile(el.getAttribute("src") ?? el.getAttribute("href"));
    if (rel) for (const f of jsClosure(rel)) js.add(f);
  }
  // Inline module scripts can import chunks too.
  for (const el of root.querySelectorAll("script:not([src])")) {
    const re = /\bimport\s*(?:[\w*{}\s,$]+\s*from\s*)?["']([^"']+\.m?js)["']/g;
    for (const [, spec] of el.textContent.matchAll(re)) {
      const rel = localFile(spec);
      if (rel) for (const f of jsClosure(rel)) js.add(f);
    }
  }
  const sum = (set) => [...set].reduce((n, f) => n + gz(f), 0);
  const inlineCss = root
    .querySelectorAll("style")
    .map((el) => el.textContent)
    .join("\n");
  rows.push({
    page: pageName(file),
    html: zlib.gzipSync(html).length,
    css: sum(css) + (inlineCss ? zlib.gzipSync(inlineCss).length : 0),
    js: sum(js),
  });
}

const IMAGE = /\.(avif|webp|png|jpe?g|gif|svg)$/i;
const images = files
  .filter((f) => IMAGE.test(f))
  .map((f) => ({ file: f, bytes: fs.statSync(path.join(DIST, f)).size }))
  .sort((a, b) => b.bytes - a.bytes);

/* -------------------------------- judge -------------------------------- */

const failures = [];
const warnings = [];
const fmt = (bytes) => `${(bytes / KB).toFixed(1)} KB`;
const judge = (what, bytes, limitKb) => {
  const limit = limitKb * KB;
  if (bytes > limit)
    failures.push(`${what}: ${fmt(bytes)} (budget ${limitKb} KB)`);
  else if (bytes > limit * 0.9) {
    warnings.push(
      `${what}: ${fmt(bytes)} is within 10% of the ${limitKb} KB budget`,
    );
  }
};

for (const r of rows) {
  judge(`${r.page} html`, r.html, budget.htmlKb);
  judge(`${r.page} css`, r.css, budget.cssKb);
  judge(`${r.page} js`, r.js, budget.jsKb);
}
const imageLimit = budget.imageKb * KB;
for (const img of images.filter((i) => i.bytes > imageLimit * 0.9)) {
  judge(`/${img.file}`, img.bytes, budget.imageKb);
}

/* ------------------------------- report -------------------------------- */

const heaviest = (key) => rows.reduce((a, b) => (b[key] > a[key] ? b : a));
const table = [
  `### Page weight (gzipped)`,
  "",
  `| | Heaviest page | Size | Budget |`,
  `| --- | --- | --- | --- |`,
  ...["html", "css", "js"].map((key) => {
    const r = heaviest(key);
    return `| ${key.toUpperCase()} | \`${r.page}\` | ${fmt(r[key])} | ${budget[`${key}Kb`]} KB |`;
  }),
  `| Largest image | \`/${images[0]?.file ?? "—"}\` | ${images[0] ? fmt(images[0].bytes) : "—"} | ${budget.imageKb} KB |`,
  "",
  failures.length
    ? `**Over budget:**\n\n${failures.map((f) => `- ${f}`).join("\n")}`
    : `All ${rows.length} pages are within budget.`,
  "",
  ...(warnings.length
    ? [`Close to budget:\n\n${warnings.map((w) => `- ${w}`).join("\n")}`, ""]
    : []),
].join("\n");

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${table}\n`);
}

for (const w of warnings) console.warn(`[check-budget] warning: ${w}`);
if (failures.length) {
  console.error(`[check-budget] ${failures.length} over budget:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
const h = { html: heaviest("html"), css: heaviest("css"), js: heaviest("js") };
console.log(
  `[check-budget] OK — ${rows.length} pages. Heaviest: html ${fmt(h.html.html)} (${h.html.page}), ` +
    `css ${fmt(h.css.css)} (${h.css.page}), js ${fmt(h.js.js)} (${h.js.page}); ` +
    `largest image ${images[0] ? fmt(images[0].bytes) : "none"}.`,
);
