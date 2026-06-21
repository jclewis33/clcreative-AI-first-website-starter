#!/usr/bin/env node
/**
 * Schema validation check for location/SEO pages.
 *
 * Usage:
 *   1. Start the dev server in one terminal:    npm run dev
 *      (or build + preview:                     npm run build && npm run preview)
 *   2. In another terminal, run:                node scripts/check-schema.mjs
 *
 * Override the base URL with --base (default http://localhost:4321):
 *   node scripts/check-schema.mjs --base https://www.clcreative.co
 *
 * What it checks per page:
 *   - Every <script type="application/ld+json"> parses as valid JSON
 *   - Each top-level node has @context and @type
 *   - @id values are URLs and unique within the page
 *   - provider/{ "@id": "..." } references resolve to an @id defined somewhere
 *     across all scripts on the page (catches dangling refs)
 *   - FAQPage entries have non-empty question + answer text
 *   - Service nodes have a provider, name, and areaServed or audience
 *   - LocalBusiness/ProfessionalService has name, address, areaServed
 */

import { parse } from "node-html-parser";
import { createClient } from "@sanity/client";
import {
  SANITY_PROJECT_ID,
  SANITY_DATASET,
  SANITY_API_VERSION,
} from "../src/config/site.shared.mjs";

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : "http://localhost:4321";

// Static pages to validate the automatic baseline (WebPage / Breadcrumb /
// LocalBusiness) schema. Add pages here that ship per-page Service/FAQ JSON-LD
// (via serviceFaqJsonLd) as the starter grows.
const STATIC_PAGES = ["/", "/contact"];

// Pull one sample slug from each Sanity content type so we also validate
// the JsonLd helper output on blog / case-study / glossary templates.
async function getSampleSanityPaths() {
  const client = createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    useCdn: true,
  });

  const [post, caseStudy, glossary] = await Promise.all([
    client.fetch(
      `*[_type == "blogPost" && defined(slug.current)][0]{ "slug": slug.current }`,
    ),
    client.fetch(
      `*[_type == "caseStudy" && defined(slug.current)][0]{ "slug": slug.current }`,
    ),
    client.fetch(
      `*[_type == "glossaryTerm" && defined(slug.current)][0]{ "slug": slug.current }`,
    ),
  ]);

  const paths = [];
  if (post?.slug) paths.push(`/blog/${post.slug}`);
  if (caseStudy?.slug) paths.push(`/case-studies/${caseStudy.slug}`);
  if (glossary?.slug) paths.push(`/glossary/${glossary.slug}`);
  return paths;
}

let sanityPaths = [];
try {
  sanityPaths = await getSampleSanityPaths();
} catch (err) {
  console.error(
    `\x1b[33mwarn: could not fetch sample Sanity slugs (${err.message}); skipping CMS pages\x1b[0m`,
  );
}

const PAGES = [...STATIC_PAGES, ...sanityPaths];

const COLORS = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};
const c = (color, s) => `${COLORS[color]}${s}${COLORS.reset}`;

let pageFailures = 0;

for (const path of PAGES) {
  const url = `${BASE}${path}`;
  console.log(`\n${c("bold", c("cyan", `→ ${url}`))}`);

  let html;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(c("red", `  ✗ fetch failed: HTTP ${res.status}`));
      pageFailures++;
      continue;
    }
    html = await res.text();
  } catch (err) {
    console.log(
      c(
        "red",
        `  ✗ fetch failed: ${err.message} — is the dev server running?`
      )
    );
    pageFailures++;
    continue;
  }

  const root = parse(html);
  const scripts = root.querySelectorAll('script[type="application/ld+json"]');

  if (scripts.length === 0) {
    console.log(c("red", "  ✗ no JSON-LD scripts found"));
    pageFailures++;
    continue;
  }

  console.log(c("dim", `  found ${scripts.length} JSON-LD script(s)`));

  const allNodes = [];
  const definedIds = new Set();
  const referencedIds = new Set();
  const issues = [];

  scripts.forEach((script, scriptIdx) => {
    const raw = script.text.trim();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      issues.push(`script #${scriptIdx + 1}: invalid JSON — ${err.message}`);
      return;
    }

    // Normalize into a flat list of nodes: handle @graph and single objects
    const nodes = parsed["@graph"] ?? [parsed];

    for (const node of nodes) {
      allNodes.push({ node, scriptIdx });

      if (!node["@context"] && !parsed["@context"]) {
        issues.push(
          `script #${scriptIdx + 1} → ${node["@type"] ?? "(no type)"}: missing @context`
        );
      }
      if (!node["@type"]) {
        issues.push(`script #${scriptIdx + 1}: node missing @type`);
        continue;
      }

      if (node["@id"]) {
        if (definedIds.has(node["@id"])) {
          issues.push(`duplicate @id: ${node["@id"]}`);
        }
        definedIds.add(node["@id"]);
        if (!/^https?:\/\//.test(node["@id"])) {
          issues.push(
            `${node["@type"]} @id is not an absolute URL: ${node["@id"]}`
          );
        }
      }

      // Per-type checks
      const type = node["@type"];
      if (type === "Service") {
        if (!node.name) issues.push(`Service missing name`);
        if (!node.provider) issues.push(`Service "${node.name}" missing provider`);
        // Location pages scope a Service geographically (areaServed); industry
        // pages scope it by audience (BusinessAudience) instead. Either is valid.
        if (!node.areaServed && !node.audience)
          issues.push(
            `Service "${node.name}" missing areaServed or audience`
          );
        if (node.provider?.["@id"]) referencedIds.add(node.provider["@id"]);
      }
      if (type === "FAQPage") {
        const entries = node.mainEntity ?? [];
        if (entries.length === 0)
          issues.push(`FAQPage has no mainEntity questions`);
        entries.forEach((q, i) => {
          if (!q.name)
            issues.push(`FAQPage question #${i + 1} missing name`);
          if (!q.acceptedAnswer?.text)
            issues.push(
              `FAQPage question #${i + 1} ("${q.name ?? "?"}") missing acceptedAnswer.text`
            );
        });
      }
      if (type === "LocalBusiness" || type === "ProfessionalService") {
        if (!node.name) issues.push(`${type} missing name`);
        if (!node.address) issues.push(`${type} "${node.name}" missing address`);
        if (!node.areaServed)
          issues.push(`${type} "${node.name}" missing areaServed`);
        if (!node["@id"])
          issues.push(
            `${type} "${node.name}" has no @id — Service.provider refs will dangle`
          );
      }
    }
  });

  // Cross-script @id resolution
  for (const ref of referencedIds) {
    if (!definedIds.has(ref)) {
      issues.push(
        `dangling provider reference: "${ref}" — no node on this page defines that @id`
      );
    }
  }

  // Report
  const typesFound = allNodes
    .map(({ node }) => node["@type"])
    .filter(Boolean);
  console.log(
    c("dim", `  types: ${typesFound.join(", ") || "(none)"}`)
  );

  if (issues.length === 0) {
    console.log(c("green", "  ✓ all checks passed"));
  } else {
    pageFailures++;
    console.log(c("red", `  ✗ ${issues.length} issue(s):`));
    issues.forEach((i) => console.log(c("red", `    • ${i}`)));
  }
}

console.log("");
if (pageFailures > 0) {
  console.log(
    c("red", c("bold", `✗ ${pageFailures} page(s) had issues`))
  );
  process.exit(1);
} else {
  console.log(c("green", c("bold", "✓ all pages passed schema checks")));
  console.log(
    c(
      "dim",
      "  Note: this catches structural issues, not every Google rich-result rule.\n  For Google-specific validation, paste each script into:\n    https://search.google.com/test/rich-results (Test code tab)\n  Or after deploy, point Rich Results Test at the live URL."
    )
  );
}
