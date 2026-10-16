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
