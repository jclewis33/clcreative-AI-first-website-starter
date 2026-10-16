/**
 * Plain-string helpers over an MDX post's raw body (`entry.body`). Pure (no
 * Astro imports), so scripts/check-content-text.mjs runs them under Node.
 * They read a body the way the Sanity source reads Portable Text, so both
 * sources count the same words and export comparable Markdown:
 *
 * - mdxWords — the prose a reader reads: no code, callouts, embeds or images.
 * - mdxToMarkdown — the llms-full.txt copy: components converted or dropped.
 * - inlineCtaIds — the ids that `<BlogCta id="…" />` tags name outside
 *   fenced code.
 * - mdxImages — the Markdown images (`![alt](src "title")`) outside fenced
 *   code, for the sync-time image checks.
 * - videoEmbedUrls — the literal `url="…"` of each `<VideoEmbed>` outside
 *   fenced code, for the sync-time video check.
 *
 * Component tags are matched on their own lines — the way the content guide
 * (.claude/skills/content-files/SKILL.md) tells authors to write them.
 */

/** A fenced code block, fences included. */
const FENCE = /^```[^\n]*\n[\s\S]*?^```[ \t]*$/gm;
/** A whole `<Callout>` block. */
const CALLOUT = /^<Callout\b[^>]*>[\s\S]*?^<\/Callout>[ \t]*$/gm;
/** A self-closing component on its own line (`<VideoEmbed … />`). */
const SELF_CLOSING_TAG = /^<[A-Z]\w*\b[^>]*\/>[ \t]*$/gm;
const IMAGE = /!\[([^\]]*)\]\([^)]*\)/g;
const LINK = /\[([^\]]*)\]\([^)]*\)/g;
/** Heading, quote and list markers at the start of a line. */
const LINE_MARKER = /^[ \t]*(?:#{1,6}|>|[-*+]|\d+\.)[ \t]+/gm;

/** The words a reader reads, for estimateReadTime(). */
export function mdxWords(body: string): string {
  return body
    .replace(FENCE, " ")
    .replace(CALLOUT, " ")
    .replace(SELF_CLOSING_TAG, " ")
    .replace(IMAGE, " ")
    .replace(LINK, "$1")
    .replace(LINE_MARKER, "");
}

const attr = (attrs: string, name: string): string =>
  new RegExp(`\\b${name}="([^"]*)"`).exec(attrs)?.[1] ?? "";

/**
 * The body as Markdown for llms-full.txt: a video becomes a link, inline
 * CTAs and the callout tags drop out (the callout's text stays), and local
 * image paths are hidden.
 */
export function mdxToMarkdown(body: string): string {
  return body
    .replace(
      /^<VideoEmbed\b([^>]*)\/>[ \t]*$/gm,
      (_, attrs: string) =>
        `[Video: ${attr(attrs, "caption") || "embedded video"}](${attr(attrs, "url")})`,
    )
    .replace(/^<BlogCta\b[^>]*\/>[ \t]*$/gm, "")
    .replace(/^<\/?Callout\b[^>]*>[ \t]*$/gm, "")
    .replace(IMAGE, "![$1]")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Every id an inline `<BlogCta />` names with a literal `id="…"` (double
 * quotes). Fenced code is skipped, so a post that shows the tag as a code
 * sample is not checked as a real CTA. Any other form (`id='…'`,
 * `id={…}`) is not found here, so content sync cannot check it.
 */
export function inlineCtaIds(body: string): string[] {
  return [
    ...body.replace(FENCE, " ").matchAll(/<BlogCta\b[^>]*\bid="([^"]+)"/g),
  ].map((m) => m[1]);
}

/** A body image: its alt text and its path or URL (title dropped). */
export interface MdxImage {
  alt: string;
  src: string;
}

/**
 * Every inline Markdown image outside fenced code: `![alt](src)`,
 * `![alt](<src with spaces>)` and `![alt](src "title")`. Reference-style
 * images (`![alt][ref]`) are not found.
 */
export function mdxImages(body: string): MdxImage[] {
  const image =
    /!\[([^\]]*)\]\(\s*(?:<([^>]*)>|([^)\s]+))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;
  return [...body.replace(FENCE, " ").matchAll(image)].map((m) => ({
    alt: m[1],
    src: m[2] ?? m[3],
  }));
}

/**
 * The `url` of every `<VideoEmbed>` written with a literal, double-quoted
 * `url="…"` (on one line or wrapped), outside fenced code. Any other form
 * (`url={…}`) is not found here, so content sync cannot check it.
 */
export function videoEmbedUrls(body: string): string[] {
  return [
    ...body.replace(FENCE, " ").matchAll(/<VideoEmbed\b[^>]*?\burl="([^"]*)"/g),
  ].map((m) => m[1]);
}
