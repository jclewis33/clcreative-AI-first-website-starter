/**
 * Build-time Markdown → HTML for rich text inside JSON content: case-study
 * block bodies, project write-ups and blog FAQ answers.
 *
 * NODE-ONLY. Imported by src/content.config.ts alone, where the `richText`
 * schema transform renders each field once, at content sync; Astro stores
 * the result in its data store, so pages read finished HTML and the
 * Markdown engine (a native binding) never ships to the Cloudflare Worker.
 * `npm run check:boundary` fails any other importer.
 *
 * Same engine and defaults as MDX blog bodies — Astro's own Sätteri
 * processor (GFM, smart punctuation) — minus syntax highlighting, and with
 * heading ids removed: rich-text blocks have no table of contents, and the
 * Portable Text serializer emits none, so both sources match.
 */
import { createSatteriMarkdownProcessor } from "@astrojs/markdown-satteri";

/** A rich-text field after the schema transform. */
export interface RichText {
  /** The Markdown as written (llms-full.txt, and the parity fixtures). */
  markdown: string;
  /** Rendered HTML, ready for set:html inside a .u-rich-text wrapper. */
  html: string;
  /** Plain text (JSON-LD answers, SEO fallbacks). */
  text: string;
}

let renderer: ReturnType<typeof createSatteriMarkdownProcessor> | undefined;

/** Markdown → HTML, with the defaults above. */
export async function markdownToHtml(markdown: string): Promise<string> {
  renderer ??= createSatteriMarkdownProcessor({ syntaxHighlight: false });
  const { code } = await (await renderer).render(markdown);
  return code.replace(/<(h[1-6]) id="[^"]*">/g, "<$1>").trim();
}

/** Block-level tags whose boundaries separate words. */
const BLOCK_BOUNDARY =
  /<\/?(?:p|li|ul|ol|h[1-6]|blockquote|pre|div|table|tr|td|th|figure|figcaption)\b[^>]*>|<br\s*\/?>/gi;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(text: string): string {
  return text.replace(
    /&(?:#(\d+)|#x([0-9a-f]+)|(amp|lt|gt|quot|apos|nbsp));/gi,
    (_, dec: string, hex: string, name: string) =>
      dec
        ? String.fromCodePoint(Number(dec))
        : hex
          ? String.fromCodePoint(parseInt(hex, 16))
          : NAMED_ENTITIES[name.toLowerCase()],
  );
}

/** HTML → plain text: block boundaries become spaces, inline tags vanish. */
export function htmlToPlainText(html: string): string {
  return decodeEntities(
    html.replace(BLOCK_BOUNDARY, " ").replace(/<[^>]+>/g, ""),
  )
    .replace(/\s+/g, " ")
    .trim();
}

/** The `richText` schema transform: Markdown → { markdown, html, text }. */
export async function renderRichText(markdown: string): Promise<RichText> {
  const html = await markdownToHtml(markdown);
  return { markdown, html, text: htmlToPlainText(html) };
}
