#!/usr/bin/env node

/**
 * Webflow → Sanity Glossary Migration Script
 *
 * Reads a Webflow glossary CSV export and creates glossaryTerm documents in
 * Sanity. Skips draft/archived rows and converts the Expanded Definition HTML
 * to Portable Text. Uses createOrReplace (id = glossaryTerm-<slug>), so it is
 * safe to re-run.
 *
 * Usage:
 *   SANITY_TOKEN=<token> node scripts/migrate-webflow-glossary.mjs <path-to.csv>
 *   node scripts/migrate-webflow-glossary.mjs <path-to.csv> --dry-run
 *
 * Config (projectId / dataset) is read from PUBLIC_SANITY_PROJECT_ID and
 * PUBLIC_SANITY_DATASET — exported in the environment or present in .env.
 *
 * NOTE: CATEGORY_RULES below classify terms into this project's glossaryTerm
 * category enum (Development | SEO | CSS | Design | Business | Performance) —
 * adjust them for your own schema.
 */

import { createClient } from "@sanity/client";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { parse as parseHtml } from "node-html-parser";
import { randomUUID } from "crypto";
import { SANITY_DATASET } from "../src/config/site.shared.mjs";

/* ── Config (resolved from CLI args + env / .env) ── */

// Migration scripts run under plain Node (outside Astro), so .env isn't
// auto-loaded. Read the same PUBLIC_SANITY_* vars the app uses, falling back
// to the project's .env file when they aren't already exported.
function readEnv(name) {
  if (process.env[name]) return process.env[name];
  try {
    const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
    const match = env.match(new RegExp(`^${name}=(.*)$`, "m"));
    if (match) return match[1].trim().replace(/^["']|["']$/g, "");
  } catch {
    /* no .env file — fall through */
  }
  return undefined;
}

const PROJECT_ID = readEnv("PUBLIC_SANITY_PROJECT_ID");
const DATASET = readEnv("PUBLIC_SANITY_DATASET") || SANITY_DATASET;
const API_VERSION = "2024-01-01";

const DRY_RUN = process.env.DRY_RUN === "1" || process.argv.includes("--dry-run");

const CSV_PATH = process.argv.slice(2).find((a) => a.toLowerCase().endsWith(".csv"));

const TOKEN = process.env.SANITY_TOKEN;

if (!PROJECT_ID) {
  console.error(
    "Missing PUBLIC_SANITY_PROJECT_ID.\n" +
      "Set it in the project's .env (PUBLIC_SANITY_PROJECT_ID=...) or export it before running."
  );
  process.exit(1);
}
if (!CSV_PATH) {
  console.error(
    "Missing CSV path.\n" +
      "Usage: SANITY_TOKEN=<token> node scripts/migrate-webflow-glossary.mjs <path-to.csv> [--dry-run]"
  );
  process.exit(1);
}
if (!TOKEN && !DRY_RUN) {
  console.error(
    "Missing SANITY_TOKEN env var.\n" +
      "Create a token at https://www.sanity.io/manage → Project → API → Tokens (Editor or above).\n" +
      "Then run: SANITY_TOKEN=<token> node scripts/migrate-webflow-glossary.mjs <path-to.csv>\n" +
      "(or run with --dry-run / DRY_RUN=1 to preview without writing)"
  );
  process.exit(1);
}

const client = DRY_RUN
  ? null
  : createClient({
      projectId: PROJECT_ID,
      dataset: DATASET,
      apiVersion: API_VERSION,
      token: TOKEN,
      useCdn: false,
    });

/* ── Category mapping ──
 * Schema enum: Development | SEO | CSS | Design | Business | Performance
 * Heuristic: keyword match against the term and short definition.
 */

const CATEGORY_RULES = [
  {
    category: "CSS",
    patterns: [
      /\bflex\b/i, /\bgrid\b/i, /\baxis\b/i, /\bcss\b/i, /\bem\b/i, /\brem\b/i,
      /\bvw\b/i, /\bvh\b/i, /\bvmin\b/i, /\bvmax\b/i, /\bch\b/i, /\blh\b/i,
      /\bpx\b/i, /\bfr\b/i, /minmax/i, /opacity/i, /z-index/i, /aspect ratio/i,
      /align /i, /justify /i, /place /i, /column reverse/i, /row reverse/i,
      /baseline/i, /center/i, /stretch/i, /space (around|between|evenly)/i,
      /subgrid/i, /repeat\(/i, /auto placement/i, /percentage/i, /pixel/i,
      /hex code/i, /\bgap\b/i, /\bcolumn\b/i, /\brow\b/i,
    ],
  },
  {
    category: "SEO",
    patterns: [
      /\bseo\b/i, /backlink/i, /anchor (text|link)/i, /alt text/i, /canonical/i,
      /meta tag/i, /metadata/i, /sitemap/i, /\bdomain authority\b/i,
      /microdata/i, /open graph/i, /404 error/i, /breadcrumb/i,
    ],
  },
  {
    category: "Performance",
    patterns: [
      /cache/i, /cdn/i, /content delivery/i, /lazy load/i, /load time/i,
      /page speed/i, /minif/i, /\bssl\b/i, /\bdns\b/i, /web hosting/i,
      /resolution/i, /pixel density/i, /retina/i,
    ],
  },
  {
    category: "Business",
    patterns: [
      /\bcta\b/i, /call to action/i, /conversion/i, /a\/b test/i, /analytics/i,
      /clickthrough/i, /bounce rate/i, /content (strategy|curation|management)/i,
      /\bcms\b/i, /e-commerce/i, /\bkpi\b/i, /\bmvp\b/i, /\bsaas\b/i,
      /key performance/i, /journey mapping/i, /usability test/i,
    ],
  },
  {
    category: "Design",
    patterns: [
      /design/i, /color theory/i, /color/i, /typography/i, /kerning/i,
      /\bui\b/i, /\bux\b/i, /user (interface|experience|flow)/i, /wireframe/i,
      /mockup/i, /prototype/i, /gestalt/i, /hero/i, /banner/i, /carousel/i,
      /modal/i, /tooltip/i, /lightbox/i, /callout/i, /placeholder/i,
      /micro-?interaction/i, /microcopy/i, /flat design/i, /dark mode/i,
      /information architecture/i, /interaction design/i, /favicon/i,
      /white space/i, /\bfold\b/i, /aspect/i, /sprite/i, /raster/i, /\bgif\b/i,
      /\bpng\b/i, /\bsvg\b/i, /vector/i, /image/i, /multimedia/i,
      /web safe/i, /typography hierarchy/i, /screen reader/i, /accessibility/i,
      /adaptive/i, /responsive/i,
    ],
  },
];

function categorizeFor(term, shortDef) {
  const haystack = `${term} ${shortDef}`;
  for (const { category, patterns } of CATEGORY_RULES) {
    if (patterns.some((p) => p.test(haystack))) return category;
  }
  return "Development";
}

/* ── HTML → Portable Text ── */

const INLINE_TAGS = new Set(["strong", "b", "em", "i", "code", "a"]);

function uid() {
  return randomUUID().replace(/-/g, "").slice(0, 12);
}

function newBlock(style = "normal", listItem, level) {
  const block = {
    _type: "block",
    _key: uid(),
    style,
    markDefs: [],
    children: [],
  };
  if (listItem) block.listItem = listItem;
  if (level) block.level = level;
  return block;
}

function pushSpan(block, text, marks = []) {
  if (!text) return;
  block.children.push({
    _type: "span",
    _key: uid(),
    text,
    marks,
  });
}

/**
 * Walk inline children of an element, accumulating spans into the given block.
 * Mark stack lets nested decorators (e.g. <strong><em>) work.
 */
function walkInline(node, block, marks) {
  for (const child of node.childNodes || []) {
    if (child.nodeType === 3) {
      // text
      const text = child.rawText
        .replace(/\u00a0/g, " ")
        .replace(/&nbsp;/g, " ");
      if (text) pushSpan(block, text, marks);
      continue;
    }
    if (child.nodeType !== 1) continue;
    const tag = child.tagName?.toLowerCase();
    if (!tag) continue;

    if (tag === "br") {
      pushSpan(block, "\n", marks);
      continue;
    }

    if (tag === "strong" || tag === "b") {
      walkInline(child, block, [...marks, "strong"]);
    } else if (tag === "em" || tag === "i") {
      walkInline(child, block, [...marks, "em"]);
    } else if (tag === "code") {
      walkInline(child, block, [...marks, "code"]);
    } else if (tag === "a") {
      const href = child.getAttribute("href");
      if (href) {
        const linkKey = uid();
        block.markDefs.push({
          _type: "link",
          _key: linkKey,
          href,
        });
        walkInline(child, block, [...marks, linkKey]);
      } else {
        walkInline(child, block, marks);
      }
    } else {
      // unknown inline → walk through
      walkInline(child, block, marks);
    }
  }
}

/**
 * Convert an HTML string to a Portable Text block array.
 * Supported: h2/h3/h4, p, ul/ol/li (one level), strong/em/code/a inline.
 * Anything unknown is flattened into a normal paragraph.
 */
function htmlToPortableText(html) {
  if (!html || !html.trim()) return [];
  const root = parseHtml(html, { lowerCaseTagName: true });
  const blocks = [];

  for (const node of root.childNodes) {
    if (node.nodeType === 3) {
      const text = node.rawText.trim();
      if (text) {
        const block = newBlock("normal");
        pushSpan(block, text);
        blocks.push(block);
      }
      continue;
    }
    if (node.nodeType !== 1) continue;
    const tag = node.tagName?.toLowerCase();
    if (!tag) continue;

    if (tag === "h2" || tag === "h3" || tag === "h4") {
      const block = newBlock(tag);
      walkInline(node, block, []);
      if (block.children.length) blocks.push(block);
    } else if (tag === "p") {
      const block = newBlock("normal");
      walkInline(node, block, []);
      if (block.children.length) blocks.push(block);
    } else if (tag === "ul" || tag === "ol") {
      const listItem = tag === "ul" ? "bullet" : "number";
      for (const li of node.childNodes) {
        if (li.nodeType !== 1 || li.tagName?.toLowerCase() !== "li") continue;
        const block = newBlock("normal", listItem, 1);
        walkInline(li, block, []);
        if (block.children.length) blocks.push(block);
      }
    } else if (tag === "pre") {
      // Treat <pre> contents as a normal block with code mark
      const text = node.text?.trim();
      if (text) {
        const block = newBlock("normal");
        pushSpan(block, text, ["code"]);
        blocks.push(block);
      }
    } else {
      // Fallback: flatten as a paragraph
      const block = newBlock("normal");
      walkInline(node, block, []);
      if (block.children.length) blocks.push(block);
    }
  }

  return blocks;
}

/* ── CSV processing ── */

function loadRows() {
  const csv = readFileSync(CSV_PATH, "utf8");
  return parse(csv, { columns: true, skip_empty_lines: true });
}

function isTrue(v) {
  return String(v).toLowerCase() === "true";
}

/* ── Main ── */

async function main() {
  const rows = loadRows();
  console.log(`Loaded ${rows.length} rows from CSV`);

  // Filter: skip drafts and archived
  const eligible = rows.filter(
    (r) => !isTrue(r.Draft) && !isTrue(r.Archived) && r.Term && r.Slug
  );
  console.log(`${eligible.length} rows eligible for import (drafts skipped)`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of eligible) {
    const term = row.Term.trim();
    const slug = row.Slug.trim();
    const shortDefinition = (row["Short Definition"] || "").trim();
    const html = row["Expanded Definition"] || "";
    const category = categorizeFor(term, shortDefinition);

    if (!shortDefinition) {
      console.warn(`  ⚠ ${term}: missing short definition, skipping`);
      skipped++;
      continue;
    }

    // Truncate to 200 chars (schema validation max)
    const trimmedShort =
      shortDefinition.length > 200
        ? shortDefinition.slice(0, 197) + "..."
        : shortDefinition;

    const body = htmlToPortableText(html);

    const doc = {
      // Note: dots in _id are reserved by Sanity (drafts., versions., _.system).
      // Use a hyphen-safe prefix so the public Content Lake query API returns
      // these documents.
      _id: `glossaryTerm-${slug}`,
      _type: "glossaryTerm",
      term,
      slug: { _type: "slug", current: slug },
      shortDefinition: trimmedShort,
      category,
      body,
    };

    try {
      if (DRY_RUN) {
        console.log(`  • ${term} [${category}] (${body.length} blocks)`);
      } else {
        await client.createOrReplace(doc);
        console.log(`  ✓ ${term} [${category}] (${body.length} blocks)`);
      }
      created++;
    } catch (err) {
      failed++;
      console.error(`  ✗ ${term}: ${err.message}`);
    }
  }

  // Category breakdown
  const byCategory = {};
  for (const row of eligible) {
    const c = categorizeFor(
      (row.Term || "").trim(),
      (row["Short Definition"] || "").trim()
    );
    byCategory[c] = (byCategory[c] || 0) + 1;
  }
  console.log("\nCategory breakdown:");
  for (const [c, n] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${c}: ${n}`);
  }

  const verb = DRY_RUN ? "Would create" : "Created";
  console.log(`\nDone. ${verb}: ${created}, Skipped: ${skipped}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
