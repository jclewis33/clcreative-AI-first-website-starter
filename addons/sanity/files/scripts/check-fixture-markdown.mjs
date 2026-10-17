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
// A self-closing tag wrapped over several lines (as an author may write it).
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

// Consecutive quote lines join into ONE blockquote, as Markdown renders them.
{
  const quote = markdownToPortableText("> One line\n> and its wrap.", {
    keyPrefix: "q-",
  });
  assert.equal(quote.length, 1);
  assert.equal(quote[0].style, "blockquote");
  assert.equal(quote[0].children[0].text, "One line and its wrap.");
}
// A nested item under "1. " indents three spaces (its parent's text column).
assert.deepEqual(
  markdownToPortableText("1. step\n   - detail\n2. next", {
    keyPrefix: "n-",
  }).map((b) => [b.listItem, b.level]),
  [
    ["number", 1],
    ["bullet", 2],
    ["number", 1],
  ],
);

/** Each construct Markdown/MDX would render differently must throw, naming
    the source and the line. */
const rejects = (markdown, what, line = 1) =>
  assert.throws(
    () =>
      markdownToPortableText(markdown, {
        keyPrefix: "x-",
        source: "test.mdx",
        cta: (id) => ({ _id: id }),
      }),
    (err) =>
      /Unsupported/.test(err.message) &&
      err.message.includes(`test.mdx, line ${line}:`),
    what,
  );
rejects("- item\n  continued", "indented list continuation", 2);
rejects("- item\ncontinued", "lazy list continuation", 2);
rejects("> quote\ncontinued", "lazy quote continuation", 2);
rejects("- a\n\n- b", "loose list", 3);
rejects(
  "1. a\n  - not nested under the text column",
  "2-space nest under 1.",
  2,
);
rejects("3. starts at three", "numbered list not starting at 1");
rejects("Text\n\n---\n\nMore", "thematic break ---", 3);
rejects("***", "thematic break ***");
rejects("Title\n---", "setext heading", 2);
rejects("~~~js\nx\n~~~", "~~~ fence");
rejects("  ```js\n  x\n  ```", "indented code fence");
rejects("    indented code", "indented code block");
rejects("<div>raw</div>", "lowercase raw HTML");
rejects("<!-- comment -->", "HTML comment");
rejects("Line one<br>line two", "<br>");
rejects("A snake_case_word here", "intraword _");
rejects("Not \\*emphasis\\*", "backslash escape");
rejects("Some ~~struck~~ text", "strikethrough");
rejects("See [the docs][docs].", "reference link");
rejects("[docs]: https://example.com", "reference definition");
rejects("Visit https://example.com today", "bare URL");
rejects("Fish &amp; chips", "HTML entity");
rejects("Hard break  \nnext", "trailing double space");
rejects("Look ![x](./a.webp) inline", "inline image");
rejects("# Title", "h1");
rejects("## Title ##", "closing # sequence");
rejects("<VideoEmbed url={video} />", "JSX expression url");
rejects("<VideoEmbed url='https://youtu.be/x' />", "single-quoted url");
rejects('<VideoEmbed caption="No url" />', "missing url");
rejects(
  '<VideoEmbed url="https://youtu.be/x" autoplay="1" />',
  "unknown attribute",
);
rejects("<Callout type={kind}>\nText\n</Callout>", "JSX expression type");
rejects("<BlogCta id={ctaId} />", "JSX expression id");
// Errors inside a Callout keep the outer file's line numbers.
rejects(
  'Intro.\n\n<Callout type="tip">\nA ~~struck~~ word.\n</Callout>',
  "nested line",
  4,
);

console.log("check-fixture-markdown: ok");
