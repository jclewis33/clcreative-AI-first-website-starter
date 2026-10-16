#!/usr/bin/env node
/**
 * check-fixture-markdown — unit checks for the Markdown → Portable Text
 * converter behind the "sample" parity fixtures
 * (src/sanity/lib/fixtures/markdown-to-pt.ts). Plain Node:
 *   node scripts/check-fixture-markdown.mjs
 */
import assert from "node:assert/strict";
import { markdownToPortableText } from "../src/sanity/lib/fixtures/markdown-to-pt.ts";

const blocks = markdownToPortableText(
  [
    "## Getting started",
    "",
    "Read [the **bold** guide](https://example.com).",
    "",
    "- one",
    "  - nested",
    "1. step",
    "",
    "```html",
    "<a></a>",
    "```",
    "",
    '<Callout type="tip">',
    "Mind the gap.",
    "</Callout>",
    "",
    '<VideoEmbed url="https://youtu.be/x" caption="Demo" />',
    "",
    '<BlogCta id="cta-1" />',
    "",
    "![Alt text](./images/a.webp)",
    "",
    "> Quoted",
  ].join("\n"),
  {
    keyPrefix: "t-",
    image: (src) => ({ asset: { _ref: `ref:${src}` } }),
    cta: (id) => ({ _id: id }),
  },
);

assert.deepEqual(
  blocks.map((b) => [
    b._type,
    b._type === "block" ? (b.listItem ?? b.style) : null,
  ]),
  [
    ["block", "h2"],
    ["block", "normal"],
    ["block", "bullet"],
    ["block", "bullet"],
    ["block", "number"],
    ["code", null],
    ["callout", null],
    ["videoEmbed", null],
    ["blogCtaInline", null],
    ["image", null],
    ["block", "blockquote"],
  ],
);
// A link whose text has a bold word: one markDef, the bold span carries both marks.
const para = blocks[1];
const link = para.markDefs[0];
assert.deepEqual(link, {
  _type: "link",
  _key: link._key,
  href: "https://example.com",
});
assert.deepEqual(
  para.children.map((s) => [s.text, s.marks]),
  [
    ["Read ", []],
    ["the ", [link._key]],
    ["bold", [link._key, "strong"]],
    [" guide", [link._key]],
    [".", []],
  ],
);
assert.deepEqual(
  blocks.slice(2, 5).map((b) => b.level),
  [1, 2, 1],
);
assert.deepEqual([blocks[5].code, blocks[5].language], ["<a></a>", "html"]);
assert.equal(blocks[6].type, "tip");
assert.equal(blocks[6].body[0].children[0].text, "Mind the gap.");
assert.deepEqual(
  [blocks[7].url, blocks[7].caption],
  ["https://youtu.be/x", "Demo"],
);
assert.equal(blocks[8].cta._id, "cta-1");
assert.deepEqual(
  [blocks[9].asset._ref, blocks[9].alt],
  ["ref:./images/a.webp", "Alt text"],
);
// Every key is unique and deterministic.
const keys = blocks.map((b) => b._key);
assert.equal(new Set(keys).size, keys.length);
// A self-closing tag wrapped over several lines (as Prettier formats it).
assert.deepEqual(
  markdownToPortableText(
    [
      "<VideoEmbed",
      '  url="https://youtu.be/y"',
      '  caption="Wrapped"',
      "/>",
    ].join("\n"),
    { keyPrefix: "w-" },
  ).map((b) => [b._type, b.url, b.caption]),
  [["videoEmbed", "https://youtu.be/y", "Wrapped"]],
);
// Anything outside the supported subset throws instead of diverging silently.
assert.throws(
  () => markdownToPortableText("| a | b |", { keyPrefix: "x-" }),
  /Unsupported/,
);
assert.throws(
  () => markdownToPortableText("<Gallery />", { keyPrefix: "x-" }),
  /Unsupported/,
);

console.log("check-fixture-markdown: ok");
