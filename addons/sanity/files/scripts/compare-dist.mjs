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
 * `--equivalent` compares two builds of the SAME content from DIFFERENT
 * sources (Sanity fixtures derived from src/content against the Files
 * build). On top of `--canonical` it normalises only the differences
 * listed in docs/superpowers/plans/2026-10-16-pr3-files-backend.md
 * ("Expected Files-vs-Sanity differences"): image URLs and <img> sizing
 * attributes (alt is then the only guard against a swapped image), the
 * declaration spacing of a highlighted <pre>'s own style attribute (token
 * markup is still compared), whitespace beside block elements, a body
 * image's <p>/<figure> wrapper, ids on h3–h6, inline <style> split across
 * chunks (compared layer by layer), llms-full.txt bodies (only its outline
 * — headings, URL:, Client: and index lines — is compared), `_headers`
 * (row 16: its CSP frame-ancestors differ by source — the Studio's origins
 * against 'self' — and check:config guards the rest), and (row 15)
 * the position of an inline module <script>. Astro emits a component's
 * hoisted script once, at whichever instance finishes rendering first;
 * local getImage() is slower than a CDN string, so with two instances on a
 * page (Lightbox alone and inside GalleryBrowser on /components) the
 * script lands at a different instance per source. Module scripts are
 * deferred, so behaviour is unchanged. That rule runs only when the page
 * still differs after every other one: inline <script type="module">
 * elements are lifted out and compared (text sorted) at the end of the
 * page; the script text must match exactly, and external scripts and all
 * other markup keep their positions. It ends by counting how often each
 * normalisation fired, so a rule that no longer does anything is visible.
 *
 *   node scripts/compare-dist.mjs --equivalent .parity/sample .parity/files
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
    "Usage: node scripts/compare-dist.mjs [--canonical | --layers | --equivalent] <baseline-dir> <candidate-dir>",
  );
  process.exit(2);
}
const canonical = flags.includes("--canonical");
const layers = flags.includes("--layers");
const equivalent = flags.includes("--equivalent");

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

/* ── --equivalent ──────────────────────────────────────────────────────── */

/** How often each --equivalent normalisation fired (both builds summed). */
const fired = {
  "image URLs → IMAGE": 0,
  "<img> sizing attributes dropped": 0,
  "<pre> style attribute spacing": 0,
  "text trimmed beside a block element": 0,
  "lone-image <p>/<figure> → <img>": 0,
  "id dropped on h3–h6": 0,
  "inline <style> compared by layer": 0,
  "inline module <script> position ignored": 0,
  "llms-full.txt → outline": 0,
  "_headers skipped (frame-ancestors differ by source)": 0,
};

/** Image URLs from either source, matched on the raw file (before
    `normalize()` erases the extension, so scripts, styles and fonts in
    _astro/ are left alone): local image files, optionally absolute, and
    Sanity CDN URLs. A Sanity URL's query may hold commas
    (`rect=0,32,1672,878`); a comma followed by whitespace still ends it,
    as between srcset candidates. */
const IMAGE_URL =
  /(?:https?:\/\/[^"'\s/<>]+)?\/_astro\/[^"'\s)&?#,<>]+\.(?:avif|gif|jpe?g|png|svg|webp)\b|https:\/\/cdn\.sanity\.io\/images\/(?:[^"'\s)<>,]|,(?!\s))+/g;
/** <img> attributes about sizing and loading, not content. The
    data-astro-image* trio is Astro's layout marker on a processed (local)
    image; a remote Sanity URL renders a bare <img> without it, and with
    `image.responsiveStyles: false` no CSS reads any of the three. */
const IMG_SIZING = new Set([
  "src",
  "srcset",
  "sizes",
  "width",
  "height",
  "loading",
  "decoding",
  "fetchpriority",
  "data-astro-image",
  "data-astro-image-fit",
  "data-astro-image-pos",
]);
const BLOCK_TAGS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "body",
  "dd",
  "details",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hr",
  "html",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul",
]);

const tagOf = (node) => node.rawTagName?.toLowerCase() ?? "";
const isElement = (node) => node.nodeType === 1 && Boolean(node.rawTagName);
const isBlock = (node) => isElement(node) && BLOCK_TAGS.has(tagOf(node));
const normStyle = (value) => {
  const out = value
    .split(";")
    .map((decl) => decl.trim())
    .filter(Boolean)
    .map((decl) => decl.replace(/\s*:\s*/, ": "))
    .join("; ");
  if (out !== value) fired["<pre> style attribute spacing"]++;
  return out;
};

/** A <p>, or an attribute-less <figure>, holding one <img> and nothing else. */
function loneImage(node) {
  const tag = tagOf(node);
  if (
    tag !== "p" &&
    !(tag === "figure" && !Object.keys(node.attributes).length)
  )
    return null;
  const elements = node.childNodes.filter(isElement);
  const textless = node.childNodes.every((c) => isElement(c) || !c.text.trim());
  return elements.length === 1 && tagOf(elements[0]) === "img" && textless
    ? elements[0]
    : null;
}

/** Canonical DOM string with the equivalence normalisations applied. */
function canonEq(node) {
  const tag = tagOf(node);
  if (tag) {
    const img = loneImage(node);
    if (img) {
      fired["lone-image <p>/<figure> → <img>"]++;
      return canonEq(img);
    }
  }
  const kids = node.childNodes;
  const blockEdge = !tag || BLOCK_TAGS.has(tag);
  const inner = kids
    .map((kid, i) => {
      if (isElement(kid)) return canonEq(kid);
      if (kid.nodeType !== 3) return "";
      const collapsed = kid.text.replace(/\s+/g, " ");
      let text = collapsed;
      if (i > 0 ? isBlock(kids[i - 1]) : blockEdge) text = text.trimStart();
      if (i < kids.length - 1 ? isBlock(kids[i + 1]) : blockEdge)
        text = text.trimEnd();
      if (text !== collapsed && text)
        fired["text trimmed beside a block element"]++;
      return text;
    })
    .join("");
  if (!tag) return inner;
  const attrs = Object.entries(node.attributes)
    .filter(([name]) => {
      if (tag === "img" && IMG_SIZING.has(name)) {
        fired["<img> sizing attributes dropped"]++;
        return false;
      }
      if (name === "id" && /^h[3-6]$/.test(tag)) {
        fired["id dropped on h3–h6"]++;
        return false;
      }
      return true;
    })
    .map(([name, value]) => [
      name,
      name === "style" && tag === "pre" ? normStyle(value) : value,
    ])
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => ` ${name}="${value}"`)
    .join("");
  return `<${tag}${attrs}>\n${inner}</${tag}>\n`;
}

/** canonEq with every inline module <script> lifted out of its place and
    appended, sorted, at the end. Astro emits a component's hoisted script
    with whichever instance finishes rendering first, and a local image's
    getImage() is slower than a CDN URL string, so with two instances on a
    page (Lightbox, alone and inside GalleryBrowser on /components) the
    script can land at a different instance per source. Module scripts are
    deferred, so the position changes nothing; the scripts' text still
    has to match. */
function canonEqScriptsLifted(html) {
  const root = parse(html, PARSE_OPTIONS);
  const scripts = root
    .querySelectorAll('script[type="module"]')
    .filter((el) => !el.getAttribute("src"));
  for (const el of scripts) el.remove();
  const lifted = scripts.map((el) => el.text).sort();
  return `${canonEq(root)}\n<lifted-module-scripts>\n${lifted.join("\n")}`;
}

/** Why two pages' inlined CSS differ layer by layer, or null. */
function styleLayerDiff(a, b) {
  const styles = (t) => [...t.matchAll(STYLE_RE)].map((m) => m[1]).join("");
  const sa = layerSequences(styles(a));
  const sb = layerSequences(styles(b));
  for (const name of new Set([...sa.keys(), ...sb.keys()])) {
    if (
      JSON.stringify(sa.get(name) ?? []) !== JSON.stringify(sb.get(name) ?? [])
    )
      return `layer "${name}" blocks differ or are reordered`;
  }
  if (styles(a) !== styles(b)) fired["inline <style> compared by layer"]++;
  return null;
}

/** llms-full.txt's outline: headings, URL:/Client: lines, index entries. */
const outline = (text) =>
  text
    .split("\n")
    .filter((line) => /^(#|URL: |Client: |- \[)/.test(line))
    .join("\n");

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
/** Read a build file; under --equivalent, image URLs become IMAGE first. */
function read(dir, file) {
  let text = fs.readFileSync(path.join(dir, file), "utf8");
  if (equivalent)
    text = text.replace(IMAGE_URL, () => {
      fired["image URLs → IMAGE"]++;
      return "IMAGE";
    });
  return normalize(text);
}

for (const file of base.filter((f) => candSet.has(f))) {
  let a = read(baseDir, file);
  let b = read(candDir, file);
  if (equivalent) {
    if (file === "_headers") {
      // Row 16: the CSP frame-ancestors differ by content source; the rest
      // is the one SECURITY_HEADERS list, which check:config guards.
      if (a !== b)
        fired["_headers skipped (frame-ancestors differ by source)"]++;
      continue;
    }
    if (file.endsWith(".html")) {
      const why = styleLayerDiff(a, b);
      if (why) {
        failures++;
        console.log(`STYLES   ${file}: ${why}`);
        continue;
      }
      const noStyles = (t) => t.replace(STYLE_RE, "<style></style>");
      const rawA = noStyles(a);
      const rawB = noStyles(b);
      a = canonEq(parse(rawA, PARSE_OPTIONS));
      b = canonEq(parse(rawB, PARSE_OPTIONS));
      if (a !== b) {
        // The second pass re-fires every other normalisation; keep the
        // counts to one pass.
        const counts = { ...fired };
        const liftedA = canonEqScriptsLifted(rawA);
        const liftedB = canonEqScriptsLifted(rawB);
        Object.assign(fired, counts);
        if (liftedA === liftedB) {
          fired["inline module <script> position ignored"]++;
          a = liftedA;
          b = liftedB;
        }
      }
    } else if (path.basename(file) === "llms-full.txt") {
      if (a !== b) fired["llms-full.txt → outline"]++;
      a = outline(a);
      b = outline(b);
    }
  }
  if (!equivalent && canonical && file.endsWith(".html")) {
    a = canon(parse(a, PARSE_OPTIONS));
    b = canon(parse(b, PARSE_OPTIONS));
  }
  if (!equivalent && layers && file.endsWith(".html")) {
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
    : equivalent
      ? `Equivalent: ${base.length} files.`
      : `Identical: ${base.length} files.`,
);
if (equivalent) {
  console.log("Normalisations fired (both builds):");
  for (const [rule, count] of Object.entries(fired))
    console.log(`  ${String(count).padStart(6)}  ${rule}`);
}
process.exit(failures ? 1 : 0);
