#!/usr/bin/env node
/**
 * check-stega-leaks — run after `PARITY_FIXTURES=preview npm run build`.
 *
 * The preview fixtures stand in for Presentation draft mode: every display
 * string carries invisible stega characters, and one half-filled document
 * per detail type is added. This scans the pages a /preview twin renders
 * (the detail templates) plus the homepage's self-fetching sections. The listing pages (blog,
 * case-studies, projects, gallery) have no /preview twin, but they are
 * scanned defensively: their cards carry search/filter data attributes. Fails when stega reaches an attribute that carries logic — an encoded
 * slug, class, style, URL or search value breaks only inside Presentation,
 * where nothing else would notice. EVERY attribute is checked, plus <title>
 * and the JSON-LD blocks: only visible text (element content) may stay
 * encoded, because Presentation's click-to-edit overlays read it. That
 * includes alt, title and aria-label, which screen readers would read out.
 *
 * Usage: node scripts/check-stega-leaks.mjs [dist/client]
 */
import fs from "node:fs";
import path from "node:path";
import { parse } from "node-html-parser";

const ROOT = process.argv[2] ?? "dist/client";
const PAGES = [
  "",
  "blog/fixture-post-one",
  "blog/fixture-post-two",
  "blog/fixture-post-incomplete",
  "case-studies/case-study-one",
  "case-studies/case-study-incomplete",
  "projects/fixture-kitchen",
  "projects/fixture-incomplete",
  // Listing pages: their cards carry search/filter data attributes.
  "blog",
  "case-studies",
  "projects",
  "gallery",
];
/* The alphabet @vercel/stega encodes with (its VERCEL_STEGA_REGEX matches runs
   of 4+; a single character is enough to flag here). @vercel/stega is only a
   transitive dependency, so the class is spelled out. */
const STEGA = /[\u200b-\u200d\u2060-\u2063\ufeff\u{1d173}-\u{1d17a}]/u;
const STEGA_ALL = /[\u200b-\u200d\u2060-\u2063\ufeff\u{1d173}-\u{1d17a}]/gu;

let leaks = 0;
let encodedPages = 0;
for (const page of PAGES) {
  const file = path.join(ROOT, page, "index.html");
  if (!fs.existsSync(file)) {
    console.error(`MISSING ${file} — the page did not build.`);
    process.exit(1);
  }
  const html = fs.readFileSync(file, "utf8");
  if (STEGA.test(html)) encodedPages++;
  const report = (what, value) => {
    leaks++;
    console.log(
      `LEAK /${page}  ${what}  ${value.replace(STEGA_ALL, "·").slice(0, 140)}`,
    );
  };
  for (const el of parse(html).querySelectorAll("*")) {
    for (const [name, value] of Object.entries(el.attributes)) {
      if (STEGA.test(value)) report(`<${el.rawTagName} ${name}>`, value);
    }
    const isTitle = el.rawTagName === "title";
    const isJsonLd =
      el.rawTagName === "script" &&
      el.getAttribute("type") === "application/ld+json";
    if ((isTitle || isJsonLd) && STEGA.test(el.text))
      report(isTitle ? "<title>" : "<script ld+json>", el.text);
  }
}

if (encodedPages === 0) {
  console.error(
    "No stega characters anywhere — was the build run with PARITY_FIXTURES=preview?",
  );
  process.exit(1);
}
if (
  !fs
    .readFileSync(path.join(ROOT, "index.html"), "utf8")
    .includes("single_testimonial")
) {
  console.error(
    'SingleTestimonial did not render on / — getTestimonialByName("Marcus Bell") failed against an encoded name.',
  );
  process.exit(1);
}
console.log(
  leaks
    ? `\n${leaks} stega leak(s) in attributes, <title> or JSON-LD.`
    : `No stega in attributes, <title> or JSON-LD across ${PAGES.length} pages.`,
);
process.exit(leaks ? 1 : 0);
