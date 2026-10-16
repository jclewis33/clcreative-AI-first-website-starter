#!/usr/bin/env node
/**
 * check-content-text — unit checks for the pure text helpers behind the
 * Files content source: build-time Markdown rendering for rich text inside
 * JSON (src/lib/content/markdown.ts). Task 5 adds the MDX body helpers
 * (src/lib/content/files/mdx-text.ts).
 *
 * Runs under plain Node (22.18+ strips TypeScript types on import):
 *   node scripts/check-content-text.mjs
 */
import assert from "node:assert/strict";
import {
  htmlToPlainText,
  markdownToHtml,
  renderRichText,
} from "../src/lib/content/markdown.ts";

// Heading ids are removed: rich-text blocks have no table of contents, and
// the Portable Text serializer emits none.
assert.equal(
  await markdownToHtml("## The challenge\n\nIt’s *fine*."),
  "<h2>The challenge</h2>\n<p>It’s <em>fine</em>.</p>",
);
// Same engine and defaults as MDX bodies: smart punctuation is on.
assert.equal(await markdownToHtml(`It's "quoted"`), "<p>It’s “quoted”</p>");
// A nested list sits inside its parent item, as the Portable Text
// serializer nests it.
assert.equal(
  await markdownToHtml("- One\n  - Two\n- Three"),
  "<ul>\n<li>One\n<ul>\n<li>Two</li>\n</ul>\n</li>\n<li>Three</li>\n</ul>",
);
// Plain text: inline tags vanish without a gap, block boundaries become one
// space, entities decode.
assert.equal(
  htmlToPlainText(
    '<p>Read <a href="/x">the <strong>bold</strong> guide</a>.</p>\n<ul>\n<li>One</li>\n<li>Two &amp; three</li>\n</ul>',
  ),
  "Read the bold guide. One Two & three",
);
assert.deepEqual(await renderRichText("Start with **one** step."), {
  markdown: "Start with **one** step.",
  html: "<p>Start with <strong>one</strong> step.</p>",
  text: "Start with one step.",
});

console.log("check-content-text: ok");
