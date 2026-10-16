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
 * `--layers` compares each HTML file's inlined `<style>` CSS layer by layer
 * instead of byte for byte. The style text is split into top-level rules;
 * each `@layer <name> {…}` block is filed under its layer (unlayered rules
 * under "(unlayered)"), and per layer the ORDERED sequence of blocks must
 * match. Everything outside `<style>` must still be byte-identical. Use it
 * when re-baselining after Astro reorders inlined CSS chunks (it sums import
 * positions, so removing an import can move one layer's block ahead of
 * another's): reordering across layers is harmless because the cascade layer
 * order decides precedence, while a swap within one layer is not. Non-HTML
 * files are still compared exactly.
 *
 *   node scripts/compare-dist.mjs --layers <old-dist> <new-dist>
 *
 * Exits 1 on any difference and prints a window around the first
 * difference in each file. Zero dependencies beyond node-html-parser, which
 * check-schema.mjs already uses.
 */
import fs from "node:fs";
import path from "node:path";
import { parse } from "node-html-parser";

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith("--"));
const [baseDir, candDir] = args.filter((a) => !a.startsWith("--"));
if (!baseDir || !candDir) {
  console.error(
    "Usage: node scripts/compare-dist.mjs [--canonical | --layers] <baseline-dir> <candidate-dir>",
  );
  process.exit(2);
}
const canonical = flags.includes("--canonical");
const layers = flags.includes("--layers");

const STYLE_RE = /<style[^>]*>([\s\S]*?)<\/style>/g;

/** Split CSS into top-level rules and file each under its @layer name. */
function layerSequences(css) {
  const seqs = new Map();
  let depth = 0;
  let start = 0;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        const rule = css.slice(start, i + 1);
        const m = /^\s*@layer\s+([^{,;\s]+)\s*\{/.exec(rule);
        const name = m ? m[1] : "(unlayered)";
        if (!seqs.has(name)) seqs.set(name, []);
        seqs.get(name).push(rule.trim());
        start = i + 1;
      }
    } else if (c === ";" && depth === 0) {
      // Statement at-rule such as `@layer a, b;` — keep it in the sequence.
      const rule = css.slice(start, i + 1).trim();
      if (!seqs.has("(statements)")) seqs.set("(statements)", []);
      seqs.get("(statements)").push(rule);
      start = i + 1;
    }
  }
  return seqs;
}

/** Why two HTML files differ under --layers, or null when they pass. */
function layerDiff(a, b) {
  const styles = (t) => [...t.matchAll(STYLE_RE)].map((m) => m[1]).join("");
  const rest = (t) => t.replace(STYLE_RE, "<style></style>");
  if (rest(a) !== rest(b)) return "non-style HTML differs";
  const sa = layerSequences(styles(a));
  const sb = layerSequences(styles(b));
  for (const name of new Set([...sa.keys(), ...sb.keys()])) {
    const x = JSON.stringify(sa.get(name) ?? []);
    const y = JSON.stringify(sb.get(name) ?? []);
    if (x !== y) return `layer "${name}" blocks differ or are reordered`;
  }
  return null;
}

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
  if (layers && file.endsWith(".html")) {
    const why = layerDiff(a, b);
    if (why) {
      failures++;
      console.log(`LAYERS   ${file}: ${why}`);
    } else if (a !== b) {
      console.log(
        `ok       ${file} (inlined CSS reordered across layers only)`,
      );
    }
    continue;
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
