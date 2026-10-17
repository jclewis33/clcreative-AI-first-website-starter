#!/usr/bin/env node
/**
 * check-content-text — unit checks for the pure text helpers behind the
 * Files content source: build-time Markdown rendering for rich text inside
 * JSON (src/lib/content/markdown.ts), and the MDX body helpers behind read
 * time, llms-full.txt and the sync-time body checks
 * (src/lib/content/files/mdx-text.ts), and the video URL rule
 * (src/lib/video.ts).
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
import {
  inlineCtaIds,
  mdxImages,
  mdxToMarkdown,
  mdxWords,
  videoEmbedUrls,
} from "../src/lib/content/files/mdx-text.ts";
import { videoEmbedUrl } from "../src/lib/video.ts";

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

const BODY = [
  "Intro with a [link](/x) and **bold**.",
  "",
  "## A heading",
  "",
  "- one item",
  "1. two item",
  "",
  "```js",
  "const skipped = true;",
  "```",
  "",
  '<Callout type="tip">',
  "Skipped callout text.",
  "</Callout>",
  "",
  '<VideoEmbed url="https://youtu.be/abc" caption="A demo" />',
  "",
  '<BlogCta id="free-site-review" />',
  "",
  "![An image](./images/x.webp)",
].join("\n");

// Read time counts what the Portable Text source counts: prose blocks only,
// no code, callouts, embeds or image alt text.
assert.deepEqual(mdxWords(BODY).trim().split(/\s+/), [
  "Intro",
  "with",
  "a",
  "link",
  "and",
  "**bold**.",
  "A",
  "heading",
  "one",
  "item",
  "two",
  "item",
]);
// llms-full.txt: videos become links, CTA and callout tags drop out, local
// image paths are hidden (the Portable Text exporter's `![alt]`).
assert.equal(
  mdxToMarkdown(BODY),
  [
    "Intro with a [link](/x) and **bold**.",
    "",
    "## A heading",
    "",
    "- one item",
    "1. two item",
    "",
    "```js",
    "const skipped = true;",
    "```",
    "",
    "Skipped callout text.",
    "",
    "[Video: A demo](https://youtu.be/abc)",
    "",
    "![An image]",
  ].join("\n"),
);
assert.deepEqual(inlineCtaIds(BODY), ["free-site-review"]);
// A tag shown as a code sample inside fenced code is not a real CTA.
assert.deepEqual(
  inlineCtaIds(
    [
      "```mdx",
      '<BlogCta id="demo" />',
      "```",
      "",
      '<BlogCta id="real-one" />',
    ].join("\n"),
  ),
  ["real-one"],
);

// Body images: plain, bare (no ./), titled, angle-bracketed, empty alt;
// fenced code skipped.
assert.deepEqual(
  mdxImages(
    [
      "![One](./images/a.webp)",
      "![Two](images/b.webp)",
      '![Three](./images/c.webp "A title")',
      "![Four](<./images/d e.webp>)",
      "![](./images/e.webp)",
      "```md",
      "![Code](./images/skipped.webp)",
      "```",
    ].join("\n\n"),
  ),
  [
    { alt: "One", src: "./images/a.webp" },
    { alt: "Two", src: "images/b.webp" },
    { alt: "Three", src: "./images/c.webp" },
    { alt: "Four", src: "./images/d e.webp" },
    { alt: "", src: "./images/e.webp" },
  ],
);

// VideoEmbed urls: one-line and wrapped tags; fenced code skipped.
assert.deepEqual(
  videoEmbedUrls(
    [
      '<VideoEmbed url="https://youtu.be/abc" />',
      "<VideoEmbed",
      '  url="https://vimeo.com/123"',
      '  caption="A video"',
      "/>",
      "```mdx",
      '<VideoEmbed url="https://example.com/skipped" />',
      "```",
    ].join("\n"),
  ),
  ["https://youtu.be/abc", "https://vimeo.com/123"],
);
assert.equal(
  videoEmbedUrl("https://www.youtube.com/watch?v=abc"),
  "https://www.youtube.com/embed/abc",
);
assert.equal(
  videoEmbedUrl("https://youtube.com/shorts/xyz"),
  "https://www.youtube.com/embed/xyz",
);
assert.equal(
  videoEmbedUrl("https://vimeo.com/76979871"),
  "https://player.vimeo.com/video/76979871",
);
assert.equal(videoEmbedUrl("https://example.com/video"), null);
assert.equal(videoEmbedUrl("not a url"), null);

// Inline code spans are code samples too: a tag or an image written inside
// backticks in prose is not a real CTA, image or video. A lone backtick is
// not a span, so the real tags after it still count.
const PROSE_WITH_CODE_SPANS = [
  'Write `<BlogCta id="demo" />` on its own line.',
  "Images look like ``![Alt](./images/skipped.webp)`` in Markdown.",
  'Embed one with `<VideoEmbed url="https://example.com/skipped" />`.',
  "A lone ` backtick opens nothing, so these still count:",
  '<BlogCta id="real-one" />',
  "![Real](./images/real.webp)",
  '<VideoEmbed url="https://youtu.be/real" />',
].join("\n\n");
assert.deepEqual(inlineCtaIds(PROSE_WITH_CODE_SPANS), ["real-one"]);
assert.deepEqual(mdxImages(PROSE_WITH_CODE_SPANS), [
  { alt: "Real", src: "./images/real.webp" },
]);
assert.deepEqual(videoEmbedUrls(PROSE_WITH_CODE_SPANS), [
  "https://youtu.be/real",
]);

console.log("check-content-text: ok");
