#!/usr/bin/env node

/**
 * Webflow → Sanity Blog Migration Script
 *
 * Reads a Webflow blog CSV export and creates, in Sanity:
 *   1. An author document (name from --author / AUTHOR_NAME, default "Author")
 *   2. Blog post documents — featured + inline images uploaded to Sanity, and
 *      the Post Body HTML converted to Portable Text.
 *
 * Existing posts (matched by slug) and draft rows are skipped, so the script
 * is safe to re-run.
 *
 * Usage:
 *   SANITY_TOKEN=<token> node scripts/migrate-webflow-blog.mjs <path-to.csv> [--author "Author Name"]
 *
 * Config (projectId / dataset) is read from PUBLIC_SANITY_PROJECT_ID and
 * PUBLIC_SANITY_DATASET — either exported in the environment or present in
 * the project's .env file (the same vars the app uses).
 *
 * Prerequisites:
 *   - A write-access token (https://www.sanity.io/manage → API → Tokens)
 *   - Dev deps: csv-parse, node-html-parser
 *
 * NOTE: CATEGORY_MAP below maps this project's Webflow category slugs to the
 * blogPost schema's category strings — adjust it for your own taxonomy.
 */

import { createClient } from "@sanity/client";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { parse as parseHtml } from "node-html-parser";
import https from "https";
import http from "http";
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

const CSV_PATH = process.argv.slice(2).find((a) => a.toLowerCase().endsWith(".csv"));

const authorIdx = process.argv.indexOf("--author");
const AUTHOR_NAME =
  authorIdx !== -1 ? process.argv[authorIdx + 1] : process.env.AUTHOR_NAME || "Author";

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
      'Usage: SANITY_TOKEN=<token> node scripts/migrate-webflow-blog.mjs <path-to.csv> [--author "Name"]'
  );
  process.exit(1);
}
if (!TOKEN) {
  console.error(
    "Missing SANITY_TOKEN env var.\n" +
      "Create a token at https://www.sanity.io/manage → Project → API → Tokens (Editor or above).\n" +
      "Then run: SANITY_TOKEN=<token> node scripts/migrate-webflow-blog.mjs <path-to.csv>"
  );
  process.exit(1);
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: API_VERSION,
  token: TOKEN,
  useCdn: false,
});

/* ── Category mapping ── */

const CATEGORY_MAP = {
  business: "Business",
  photography: "Photography",
  seo: "SEO",
  video: "Video",
  "web-design": "Web Design",
  "webflow-tutorial": "Webflow Tutorial",
  development: "Development",
};

/* ── Image download + upload ── */

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib.get(url, { headers: { "User-Agent": "SanityMigration/1.0" } }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

// Cache: URL → Sanity asset reference
const imageCache = new Map();

async function uploadImage(url) {
  if (!url) return null;

  // Normalize URL
  const cleanUrl = url.trim();
  if (!cleanUrl) return null;

  if (imageCache.has(cleanUrl)) return imageCache.get(cleanUrl);

  try {
    const buffer = await downloadBuffer(cleanUrl);

    // Determine content type from URL
    let contentType = "image/webp";
    if (cleanUrl.includes(".jpg") || cleanUrl.includes(".jpeg")) contentType = "image/jpeg";
    else if (cleanUrl.includes(".png")) contentType = "image/png";
    else if (cleanUrl.includes(".gif")) contentType = "image/gif";
    else if (cleanUrl.includes(".avif")) contentType = "image/avif";
    else if (cleanUrl.includes(".svg")) contentType = "image/svg+xml";

    // Extract filename from URL
    const urlPath = new URL(cleanUrl).pathname;
    const filename = decodeURIComponent(urlPath.split("/").pop() || "image.webp");

    const asset = await client.assets.upload("image", buffer, {
      filename,
      contentType,
    });

    const ref = { _type: "image", asset: { _type: "reference", _ref: asset._id } };
    imageCache.set(cleanUrl, ref);
    return ref;
  } catch (err) {
    console.warn(`  ⚠ Failed to upload image: ${cleanUrl} — ${err.message}`);
    return null;
  }
}

/* ── HTML → Portable Text ── */

function htmlToPortableText(html) {
  if (!html || !html.trim()) return [];

  // Clean up HTML entities before parsing
  const cleaned = html
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  const root = parseHtml(cleaned, { comment: false });
  const blocks = [];
  let listItems = [];
  let currentListType = null;

  function flushList() {
    if (listItems.length > 0) {
      blocks.push(...listItems);
      listItems = [];
    }
    currentListType = null;
  }

  function makeKey() {
    return Math.random().toString(36).slice(2, 10);
  }

  function extractSpans(node, markDefs = [], marks = []) {
    const spans = [];

    if (!node.childNodes || node.childNodes.length === 0) {
      const text = node.text || node.rawText || "";
      if (text) {
        spans.push({
          _type: "span",
          _key: makeKey(),
          text,
          marks: [...marks],
        });
      }
      return { spans, markDefs };
    }

    for (const child of node.childNodes) {
      // Text node
      if (child.nodeType === 3) {
        const text = child.rawText || "";
        if (text) {
          spans.push({
            _type: "span",
            _key: makeKey(),
            text,
            marks: [...marks],
          });
        }
        continue;
      }

      const tag = child.tagName?.toLowerCase();

      if (tag === "strong" || tag === "b") {
        const result = extractSpans(child, markDefs, [...marks, "strong"]);
        spans.push(...result.spans);
        markDefs = result.markDefs;
      } else if (tag === "em" || tag === "i") {
        const result = extractSpans(child, markDefs, [...marks, "em"]);
        spans.push(...result.spans);
        markDefs = result.markDefs;
      } else if (tag === "code") {
        const result = extractSpans(child, markDefs, [...marks, "code"]);
        spans.push(...result.spans);
        markDefs = result.markDefs;
      } else if (tag === "a") {
        const href = child.getAttribute("href") || "";
        const target = child.getAttribute("target") || "";
        const key = makeKey();
        markDefs.push({
          _type: "link",
          _key: key,
          href,
          newTab: target === "_blank",
        });
        const result = extractSpans(child, markDefs, [...marks, key]);
        spans.push(...result.spans);
        markDefs = result.markDefs;
      } else if (tag === "br") {
        spans.push({
          _type: "span",
          _key: makeKey(),
          text: "\n",
          marks: [...marks],
        });
      } else if (tag === "span" || tag === "div" || tag === "label" || tag === "small") {
        const result = extractSpans(child, markDefs, [...marks]);
        spans.push(...result.spans);
        markDefs = result.markDefs;
      } else {
        // Fallback — inline unknown elements as text
        const result = extractSpans(child, markDefs, [...marks]);
        spans.push(...result.spans);
        markDefs = result.markDefs;
      }
    }

    return { spans, markDefs };
  }

  function makeBlock(node, style = "normal") {
    const { spans, markDefs } = extractSpans(node);
    if (spans.length === 0) {
      spans.push({ _type: "span", _key: makeKey(), text: "", marks: [] });
    }
    return {
      _type: "block",
      _key: makeKey(),
      style,
      children: spans,
      markDefs,
    };
  }

  function processNode(node) {
    if (node.nodeType === 3) {
      // Top-level text node
      const text = (node.rawText || "").trim();
      if (text) {
        flushList();
        blocks.push({
          _type: "block",
          _key: makeKey(),
          style: "normal",
          children: [{ _type: "span", _key: makeKey(), text, marks: [] }],
          markDefs: [],
        });
      }
      return;
    }

    const tag = node.tagName?.toLowerCase();
    if (!tag) return;

    // Skip tags that are just escaped HTML (e.g., `<h2 id="1">` inside a <p>)
    // These show up in the Webflow export as encoded HTML

    if (tag === "h2" || tag === "h3" || tag === "h4") {
      flushList();
      // Check if this heading contains another encoded heading — strip it
      let textContent = node.text || "";
      // Clean up encoded heading patterns like "<h2 id="1">(1) Title</h2>"
      textContent = textContent.replace(/^<h[2-4][^>]*>/i, "").replace(/<\/h[2-4]>$/i, "");

      const block = makeBlock(node, tag);
      blocks.push(block);
    } else if (tag === "p") {
      flushList();
      // Check if paragraph contains only an encoded heading tag
      const innerText = node.text || "";
      const encodedHeadingMatch = innerText.match(/^<(h[2-4])[^>]*>(.*)<\/\1>$/s);
      if (encodedHeadingMatch) {
        // This is actually a heading, skip or convert
        return;
      }
      // Skip empty paragraphs or ones that are just encoded tags
      if (innerText.match(/^<\/?(?:h[2-4]|ol|ul|li)[^>]*>$/)) {
        return;
      }
      const block = makeBlock(node, "normal");
      // Skip if only whitespace
      const hasContent = block.children.some(
        (c) => c.text && c.text.trim().length > 0
      );
      if (hasContent) {
        blocks.push(block);
      }
    } else if (tag === "blockquote") {
      flushList();
      blocks.push(makeBlock(node, "blockquote"));
    } else if (tag === "ul" || tag === "ol") {
      const listType = tag === "ul" ? "bullet" : "number";
      if (currentListType !== listType) {
        flushList();
      }
      currentListType = listType;

      for (const li of node.querySelectorAll("li")) {
        const block = makeBlock(li, "normal");
        block.listItem = listType;
        block.level = 1;
        listItems.push(block);
      }
    } else if (tag === "figure") {
      flushList();
      // Check for image
      const img = node.querySelector("img");
      const iframe = node.querySelector("iframe");
      const caption = node.querySelector("figcaption");

      if (img) {
        const src = img.getAttribute("src") || "";
        const alt = img.getAttribute("alt") || "";
        if (src) {
          blocks.push({
            _type: "image",
            _key: makeKey(),
            _sanityAsset: src, // Will be processed in the upload phase
            alt: alt,
            caption: caption ? caption.text : undefined,
          });
        }
      } else if (iframe) {
        // YouTube embed in figure — skip (video field handles this)
        // But add a note as text
        const iframeSrc = iframe.getAttribute("src") || "";
        if (iframeSrc.includes("youtube")) {
          // Skip YouTube embeds — handled by the video field
        }
      }
    } else if (tag === "img") {
      flushList();
      const src = node.getAttribute("src") || "";
      const alt = node.getAttribute("alt") || "";
      if (src) {
        blocks.push({
          _type: "image",
          _key: makeKey(),
          _sanityAsset: src,
          alt: alt,
        });
      }
    } else if (tag === "div") {
      // Process children
      for (const child of node.childNodes) {
        processNode(child);
      }
    } else {
      // For other block-level elements, try to process as paragraph
      flushList();
      const block = makeBlock(node, "normal");
      const hasContent = block.children.some(
        (c) => c.text && c.text.trim().length > 0
      );
      if (hasContent) {
        blocks.push(block);
      }
    }
  }

  for (const child of root.childNodes) {
    processNode(child);
  }
  flushList();

  return blocks;
}

/* ── Process inline images in Portable Text ── */

async function processPortableTextImages(blocks) {
  const processed = [];

  for (const block of blocks) {
    if (block._type === "image" && block._sanityAsset) {
      const imageRef = await uploadImage(block._sanityAsset);
      if (imageRef) {
        processed.push({
          _type: "image",
          _key: block._key,
          asset: imageRef.asset,
          alt: block.alt || "",
          caption: block.caption,
        });
      }
      // Skip if image upload failed
    } else {
      processed.push(block);
    }
  }

  return processed;
}

/* ── Main migration ── */

async function migrate() {
  console.log("🔄 Reading CSV...");
  const csvRaw = readFileSync(CSV_PATH, "utf-8");
  const records = parse(csvRaw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  });

  console.log(`📋 Found ${records.length} blog posts\n`);

  // Step 1: Create or find author
  console.log(`👤 Creating author document for "${AUTHOR_NAME}"...`);
  const existingAuthor = await client.fetch(
    `*[_type == "author" && name == $name][0]._id`,
    { name: AUTHOR_NAME }
  );

  let authorId;
  if (existingAuthor) {
    authorId = existingAuthor;
    console.log(`   Author already exists: ${authorId}`);
  } else {
    const authorDoc = await client.create({
      _type: "author",
      name: AUTHOR_NAME,
    });
    authorId = authorDoc._id;
    console.log(`   Created author: ${authorId}`);
  }

  // Step 2: Process each blog post
  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const slug = row["Slug"]?.trim();
    const title = row["Title"]?.trim() || row["Name"]?.trim();

    if (!slug || !title) {
      console.log(`⏭ Skipping row ${i + 1}: missing slug or title`);
      skipped++;
      continue;
    }

    // Skip drafts
    if (row["Draft"]?.toUpperCase() === "TRUE") {
      console.log(`⏭ Skipping draft: ${title}`);
      skipped++;
      continue;
    }

    console.log(`\n[${i + 1}/${records.length}] ${title}`);

    try {
      // Check if post already exists
      const existing = await client.fetch(
        `*[_type == "blogPost" && slug.current == $slug][0]._id`,
        { slug }
      );
      if (existing) {
        console.log(`   Already exists, skipping.`);
        skipped++;
        continue;
      }

      // Parse categories from semicolon-separated slugs
      const rawCats = row["Cateogries"]?.trim() || row["Categories"]?.trim() || "";
      const categories = rawCats
        .split(";")
        .map((c) => c.trim())
        .filter(Boolean)
        .map((c) => CATEGORY_MAP[c] || c)
        .filter(Boolean);

      if (categories.length === 0) {
        categories.push("Business"); // Default fallback
      }

      // Parse date
      const dateStr = row["Date"]?.trim() || row["Published On"]?.trim() || row["Created On"]?.trim();
      let date = new Date().toISOString().split("T")[0];
      if (dateStr) {
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          date = parsed.toISOString().split("T")[0];
        }
      }

      // Featured
      const featured = row["Featured?"]?.toUpperCase() === "TRUE";

      // Description
      const description =
        row["Meta Description"]?.trim() ||
        row["Post Summary"]?.trim() ||
        "";

      // Image
      const imageUrl = row["Main Image"]?.trim();
      const imageAlt = row["Alt Text Image"]?.trim() || title;

      console.log(`   📸 Uploading featured image...`);
      const imageRef = await uploadImage(imageUrl);
      if (!imageRef) {
        console.log(`   ⚠ No image uploaded, creating post without image...`);
      }

      // Video
      const videoUrl = row["Video"]?.trim() || undefined;

      // Convert HTML body to Portable Text
      console.log(`   📝 Converting body to Portable Text...`);
      const htmlBody = row["Post Body"]?.trim() || "";
      let body = htmlToPortableText(htmlBody);

      // Upload inline images
      const imageBlocks = body.filter(
        (b) => b._type === "image" && b._sanityAsset
      );
      if (imageBlocks.length > 0) {
        console.log(`   🖼 Uploading ${imageBlocks.length} inline image(s)...`);
      }
      body = await processPortableTextImages(body);

      // Build document
      const doc = {
        _type: "blogPost",
        title,
        slug: { _type: "slug", current: slug },
        description: description.slice(0, 300),
        categories,
        date,
        featured,
        author: { _type: "reference", _ref: authorId },
        body,
      };

      if (imageRef) {
        doc.image = imageRef;
        doc.imageAlt = imageAlt;
      }

      if (videoUrl) {
        doc.video = videoUrl;
      }

      // Create in Sanity
      const created = await client.create(doc);
      console.log(`   ✅ Created: ${created._id}`);
      success++;
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
      failed++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`Migration complete!`);
  console.log(`  ✅ Success: ${success}`);
  console.log(`  ⏭ Skipped: ${skipped}`);
  console.log(`  ❌ Failed:  ${failed}`);
  console.log("=".repeat(50));
}

migrate().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
