#!/usr/bin/env node
/**
 * compare-dist — parity check between two builds of the site.
 *
 * Refactors that must not change rendered output copy `dist/client` aside
 * before the change, rebuild after it, and compare:
 *
 *   node scripts/compare-dist.mjs .parity/empty dist/client
 *   node scripts/compare-dist.mjs .parity/fixtures dist/client --canonical
 *
 * Compares every .html / .xml / .txt file plus `_headers` and `_redirects`
 * (the `_astro/` asset folder is skipped). Hashed asset names
 * (`/_astro/name.HASH.ext`, plain or URL-encoded) and `data-astro-cid-*`
 * hashes are normalised first: they change whenever the module graph
 * changes, without changing what renders.
 *
 * `--canonical` compares HTML as a DOM instead of bytes: attributes sorted,
 * entities decoded, whitespace runs collapsed, whitespace-only text nodes
 * dropped. Use it where the same markup legitimately arrives through a
 * different serializer (an Astro component versus an HTML string).
 *
 * Exits 1 on any difference and prints a window around the first
 * difference in each file. Zero dependencies beyond node-html-parser, which
 * check-schema.mjs already uses.
 */
import fs from "node:fs";
import path from "node:path";
import { parse } from "node-html-parser";

const [baseDir, candDir, ...flags] = process.argv.slice(2);
if (!baseDir || !candDir) {
  console.error(
    "Usage: node scripts/compare-dist.mjs <baseline-dir> <candidate-dir> [--canonical]",
  );
  process.exit(2);
}
const canonical = flags.includes("--canonical");

const TEXT_EXT = new Set([".html", ".xml", ".txt"]);
const TEXT_NAMES = new Set(["_headers", "_redirects"]);
const PARSE_OPTIONS = {
  comment: false,
  blockTextElements: { script: true, style: true, pre: true, noscript: true },
};

function list(dir) {
  const out = [];
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "_astro") walk(full);
        continue;
      }
      if (TEXT_EXT.has(path.extname(entry.name)) || TEXT_NAMES.has(entry.name))
        out.push(path.relative(dir, full));
    }
  };
  walk(dir);
  return out.sort();
}

function normalize(text) {
  return text
    .replace(/\/_astro\/[^"'\s)&?#,]+/g, "/_astro/ASSET")
    .replace(/%2F_astro%2F[^"'\s)&]+/g, "%2F_astro%2FASSET")
    .replace(/data-astro-cid-[a-z0-9]+/g, "data-astro-cid-X");
}

/** Serialize a parsed node as a canonical DOM string (one tag per line). */
function canon(node) {
  if (node.nodeType === 3) {
    const text = node.text.replace(/\s+/g, " ");
    return text.trim() ? text : "";
  }
  if (node.nodeType !== 1) return "";
  const inner = node.childNodes.map(canon).join("");
  if (!node.rawTagName) return inner;
  const tag = node.rawTagName.toLowerCase();
  const attrs = Object.entries(node.attributes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => ` ${k}="${v}"`)
    .join("");
  return `<${tag}${attrs}>\n${inner}</${tag}>\n`;
}

const base = list(baseDir);
const cand = list(candDir);
const candSet = new Set(cand);
const baseSet = new Set(base);
let failures = 0;

for (const file of base.filter((f) => !candSet.has(f))) {
  console.log(`MISSING  ${file}`);
  failures++;
}
for (const file of cand.filter((f) => !baseSet.has(f))) {
  console.log(`EXTRA    ${file}`);
  failures++;
}
for (const file of base.filter((f) => candSet.has(f))) {
  let a = normalize(fs.readFileSync(path.join(baseDir, file), "utf8"));
  let b = normalize(fs.readFileSync(path.join(candDir, file), "utf8"));
  if (canonical && file.endsWith(".html")) {
    a = canon(parse(a, PARSE_OPTIONS));
    b = canon(parse(b, PARSE_OPTIONS));
  }
  if (a === b) continue;
  failures++;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  const from = Math.max(0, i - 120);
  console.log(
    `DIFF     ${file} @ char ${i}\n  - …${a.slice(from, i + 160)}\n  + …${b.slice(from, i + 160)}\n`,
  );
}

console.log(
  failures
    ? `\n${failures} difference(s) across ${base.length} baseline files.`
    : `Identical: ${base.length} files.`,
);
process.exit(failures ? 1 : 0);
