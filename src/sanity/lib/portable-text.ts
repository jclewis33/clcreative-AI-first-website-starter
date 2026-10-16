/**
 * Portable Text to HTML serializer for Sanity content.
 *
 * Converts Sanity's Portable Text blocks into HTML strings that work
 * with the existing u-rich-text CSS styling. Used by the Sanity mappers
 * (case study blocks, project write-ups, blog FAQ answers and their plain
 * text, read-time words) and by llms-full.txt (Markdown).
 */

import {
  resolveInternalLinkHref,
  type InternalLinkTarget,
} from "./internal-links";
import { urlFor } from "./image";
import { SITE_URL } from "@/config/site";

/* These describe what this serializer READS, so every field a Sanity query can
   return as null is nullable here — the walker already guards each access. */
interface PortableTextSpan {
  _type: "span";
  text?: string | null;
  marks?: string[] | null;
}

interface MarkDef {
  _key: string;
  _type: string;
  href?: string | null;
  newTab?: boolean | null;
  target?: InternalLinkTarget | null;
}

interface PortableTextBlock {
  _type: "block";
  _key?: string;
  style?: string | null;
  children?: PortableTextSpan[] | null;
  listItem?: "bullet" | "number" | null;
  level?: number | null;
  markDefs?: MarkDef[] | null;
}

interface PortableTextImage {
  _type: "image";
  asset?: { _ref?: string } | null;
  alt?: string | null;
  caption?: string | null;
}

interface PortableTextVideoEmbed {
  _type: "videoEmbed";
  url?: string | null;
  caption?: string | null;
}

type PortableTextNode =
  PortableTextBlock | PortableTextImage | PortableTextVideoEmbed;

function resolveVideoEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (u.pathname.startsWith("/shorts/")) {
        return `https://www.youtube.com/embed/${u.pathname.split("/")[2]}`;
      }
    }
    if (host === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    if (host === "player.vimeo.com") return url;
  } catch {
    return null;
  }
  return null;
}

/**
 * Render an internalLink anchor with an optional preview card (image, title,
 * description) that appears on hover/focus. Falls back to a plain anchor if
 * the target has no preview data.
 */
function renderInternalLinkWithPreview(
  innerHtml: string,
  href: string,
  anchorAttrs: string,
  target: InternalLinkTarget,
): string {
  const title = target?.title;
  const description = target?.description;
  const imageUrl = target?.image
    ? urlFor(target.image).width(480).height(270).url()
    : null;

  const hasPreview = !!(title || description || imageUrl);
  const anchor = `<a href="${escapeAttr(href)}"${anchorAttrs} class="internal-link_anchor">${innerHtml}</a>`;

  if (!hasPreview) return anchor;

  const parts: string[] = [`<span class="internal-link_wrap">`, anchor];
  parts.push(`<span class="internal-link_preview" aria-hidden="true">`);
  if (imageUrl) {
    parts.push(
      `<span class="internal-link_preview_media"><img src="${escapeAttr(imageUrl)}" alt="" loading="lazy"></span>`,
    );
  }
  parts.push(`<span class="internal-link_preview_content">`);
  if (title) {
    parts.push(
      `<span class="internal-link_preview_title">${escapeHtml(title)}</span>`,
    );
  }
  if (description) {
    parts.push(
      `<span class="internal-link_preview_text">${escapeHtml(description)}</span>`,
    );
  }
  parts.push(`</span></span></span>`);

  return parts.join("");
}

/* ── Mark grouping ─────────────────────────────────────────────────────── */

/* Adjacent spans that share a mark render inside ONE element for it — a link
   whose text has a bold word is one <a> with a <strong> inside, not three
   anchors. This ports @portabletext/toolkit's buildMarksTree (what
   astro-portabletext renders the blog body with), so both paths nest marks
   the same way. */

const KNOWN_DECORATORS = [
  "strong",
  "em",
  "code",
  "underline",
  "strike-through",
];

/** A mark wrapping its children, or a run of text. */
type MarkNode =
  | { kind: "mark"; markKey: string; children: MarkNode[] }
  | { kind: "text"; text: string };

/** A span's marks, outermost first: the mark that runs over the most
    following spans wraps the others; ties go to decorator order, then name. */
function sortMarks(spans: PortableTextSpan[], index: number): string[] {
  const marks = spans[index]?.marks ?? [];
  if (!marks.length) return [];
  const runs: Record<string, number> = {};
  for (const mark of marks) {
    runs[mark] = 1;
    for (let next = index + 1; next < spans.length; next++) {
      if (spans[next]?.marks?.includes(mark)) runs[mark]++;
      else break;
    }
  }
  return [...marks].sort((a, b) => {
    if (runs[a] !== runs[b]) return runs[b] - runs[a];
    const aPos = KNOWN_DECORATORS.indexOf(a);
    const bPos = KNOWN_DECORATORS.indexOf(b);
    return aPos === bPos ? a.localeCompare(b) : aPos - bPos;
  });
}

/** Group a block's spans into a tree of shared marks. */
function buildMarksTree(spans: PortableTextSpan[]): MarkNode[] {
  const root: MarkNode[] = [];
  /* The open marks, outermost first, each with the child list new nodes
     append to. */
  let stack: Array<{ markKey: string; children: MarkNode[] }> = [];
  spans.forEach((span, i) => {
    const needed = sortMarks(spans, i);
    // Keep the open marks this span still has, in order; close the rest.
    let keep = 0;
    while (keep < stack.length) {
      const at = needed.indexOf(stack[keep].markKey);
      if (at === -1) break;
      needed.splice(at, 1);
      keep++;
    }
    stack = stack.slice(0, keep);
    let target = stack.length ? stack[stack.length - 1].children : root;
    for (const markKey of needed) {
      const node: MarkNode = { kind: "mark", markKey, children: [] };
      target.push(node);
      stack.push(node);
      target = node.children;
    }
    target.push({ kind: "text", text: span.text ?? "" });
  });
  return root;
}

/** Wrap rendered children in one mark's element (unknown marks add none). */
function wrapMark(
  markKey: string,
  html: string,
  markDefs: PortableTextBlock["markDefs"],
): string {
  switch (markKey) {
    case "strong":
      return `<strong>${html}</strong>`;
    case "em":
      return `<em>${html}</em>`;
    case "code":
      return `<code>${html}</code>`;
    case "underline":
      return `<u>${html}</u>`;
    case "strike-through":
      return `<s>${html}</s>`;
  }
  // Annotation mark — look up in markDefs
  const def = markDefs?.find((d) => d._key === markKey);
  const attrs = def?.newTab ? ` target="_blank" rel="noopener noreferrer"` : "";
  if (def?._type === "link" && def.href) {
    return `<a href="${escapeAttr(def.href)}"${attrs}>${html}</a>`;
  }
  if (def?._type === "internalLink") {
    const href = resolveInternalLinkHref(def.target);
    if (href) {
      return renderInternalLinkWithPreview(html, href, attrs, def.target);
    }
  }
  return html;
}

function renderMarkNodes(
  nodes: MarkNode[],
  markDefs: PortableTextBlock["markDefs"],
): string {
  return nodes
    .map((node) =>
      node.kind === "text"
        ? escapeHtml(node.text)
        : wrapMark(
            node.markKey,
            renderMarkNodes(node.children, markDefs),
            markDefs,
          ),
    )
    .join("");
}

/** A text block's children as inline HTML, with marks grouped. */
function renderInline(block: PortableTextBlock): string {
  const spans = (block.children ?? []).filter(
    (child) => child?._type === "span",
  );
  return renderMarkNodes(buildMarksTree(spans), block.markDefs);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** `&` first, so the entities added after it are not escaped again. */
function escapeAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/**
 * Convert an array of Portable Text blocks to an HTML string.
 *
 * Supports: paragraphs, headings (h2-h4), blockquotes, bullet/numbered lists
 * (nested by `level`), bold, italic, code, links (adjacent spans sharing a
 * mark grouped into one element), and inline images.
 *
 * The output is designed to be rendered inside a `.u-rich-text` wrapper.
 */
export function portableTextToHtml(
  blocks: PortableTextNode[] | null | undefined,
  imageUrlFn?: (ref: string) => string,
): string {
  if (!blocks?.length) return "";

  const parts: string[] = [];
  /* Open lists, outermost first. Each list's newest <li> stays open until
     the next item at its level (or a shallower one) arrives, so a deeper
     item's list nests inside it — the HTML shape @portabletext/toolkit's
     nestLists gives astro-portabletext. */
  const openLists: Array<{ listItem: string; level: number }> = [];
  const listTag = (listItem: string) => (listItem === "number" ? "ol" : "ul");
  // Close the newest open <li> by appending to the part that holds it.
  const closeItem = () => {
    parts[parts.length - 1] += "</li>";
  };
  const closeList = () => {
    const list = openLists.pop();
    if (!list) return;
    closeItem();
    parts.push(`</${listTag(list.listItem)}>`);
  };
  const closeAllLists = () => {
    while (openLists.length) closeList();
  };

  for (let i = 0; i < blocks.length; i++) {
    const node = blocks[i];

    // Handle video embeds
    if (node._type === "videoEmbed") {
      closeAllLists();

      const video = node as PortableTextVideoEmbed;
      const embedUrl = video.url ? resolveVideoEmbedUrl(video.url) : null;
      if (embedUrl) {
        const title = video.caption ? escapeAttr(video.caption) : "Video";
        parts.push(`<figure class="video-embed_wrap">`);
        parts.push(`<div class="video-embed_frame">`);
        parts.push(
          `<iframe src="${escapeAttr(embedUrl)}" title="${title}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`,
        );
        parts.push(`</div>`);
        if (video.caption) {
          parts.push(`<figcaption>${escapeHtml(video.caption)}</figcaption>`);
        }
        parts.push(`</figure>`);
      }
      continue;
    }

    // Handle images
    if (node._type === "image") {
      closeAllLists();

      const img = node as PortableTextImage;
      if (imageUrlFn && img.asset?._ref) {
        const src = imageUrlFn(img.asset._ref);
        const alt = img.alt ? escapeAttr(img.alt) : "";
        parts.push(`<figure><img src="${src}" alt="${alt}" loading="lazy" />`);
        if (img.caption) {
          parts.push(`<figcaption>${escapeHtml(img.caption)}</figcaption>`);
        }
        parts.push(`</figure>`);
      }
      continue;
    }

    // Handle text blocks
    const block = node as PortableTextBlock;
    if (block._type !== "block") continue;

    const innerHtml = renderInline(block);

    // Handle list items, nesting by level
    if (block.listItem) {
      const level = block.level ?? 1;
      // Close lists deeper than this item.
      while (openLists.length && openLists[openLists.length - 1].level > level)
        closeList();
      const top = openLists[openLists.length - 1];
      if (top && top.level === level && top.listItem === block.listItem) {
        closeItem(); // A sibling item in the same list.
      } else {
        // Same level but the other list type: end that list first.
        if (top && top.level === level) closeList();
        // A new list. Nested inside the open <li> when one is open, and
        // joined to its part so no whitespace trails the item's text.
        const open = `<${listTag(block.listItem)}>`;
        if (openLists.length) parts[parts.length - 1] += open;
        else parts.push(open);
        openLists.push({ listItem: block.listItem, level });
      }
      parts.push(`<li>${innerHtml}`);
      continue;
    }

    // Close any open list before non-list content
    closeAllLists();

    // Render block by style
    switch (block.style) {
      case "h2":
        parts.push(`<h2>${innerHtml}</h2>`);
        break;
      case "h3":
        parts.push(`<h3>${innerHtml}</h3>`);
        break;
      case "h4":
        parts.push(`<h4>${innerHtml}</h4>`);
        break;
      case "blockquote":
        parts.push(`<blockquote><p>${innerHtml}</p></blockquote>`);
        break;
      default:
        if (innerHtml.trim()) {
          parts.push(`<p>${innerHtml}</p>`);
        }
    }
  }

  // Close trailing lists
  closeAllLists();

  return parts.join("\n");
}

/* ── Markdown serializer (for llms-full.txt) ───────────────────────────────── */

/** Convert a span's marks to inline markdown. */
function renderSpanMarkdown(
  span: PortableTextSpan,
  markDefs: PortableTextBlock["markDefs"],
): string {
  let text = span.text;
  if (!text) return "";
  if (!span.marks?.length) return text;

  for (const mark of span.marks) {
    switch (mark) {
      case "strong":
        text = `**${text}**`;
        break;
      case "em":
        text = `_${text}_`;
        break;
      case "code":
        text = `\`${text}\``;
        break;
      case "strike-through":
        text = `~~${text}~~`;
        break;
      case "underline":
        // Markdown has no underline — leave text as-is.
        break;
      default: {
        const def = markDefs?.find((d) => d._key === mark);
        if (def?._type === "link" && def.href) {
          text = `[${text}](${def.href})`;
        } else if (def?._type === "internalLink") {
          const href = resolveInternalLinkHref(def.target);
          if (href) {
            const abs = href.startsWith("/") ? `${SITE_URL}${href}` : href;
            text = `[${text}](${abs})`;
          }
        }
      }
    }
  }

  return text;
}

/**
 * Convert an array of Portable Text blocks to a Markdown string.
 *
 * Mirrors `portableTextToHtml` but emits Markdown for LLM ingestion
 * (`llms-full.txt`). Standard blocks (headings, paragraphs, blockquotes,
 * lists, bold/italic/code/links) are converted faithfully; non-text custom
 * nodes (images, video embeds) get a concise text fallback so the output
 * stays readable rather than pixel-perfect.
 */
export function portableTextToMarkdown(
  blocks: PortableTextNode[] | null | undefined,
): string {
  if (!blocks?.length) return "";

  const parts: string[] = [];

  for (const node of blocks) {
    if (node._type === "videoEmbed") {
      const video = node as PortableTextVideoEmbed;
      parts.push(`[Video: ${video.caption || "embedded video"}](${video.url})`);
      continue;
    }

    if (node._type === "image") {
      const img = node as PortableTextImage;
      const alt = img.alt || img.caption || "image";
      parts.push(`![${alt}]`);
      continue;
    }

    const block = node as PortableTextBlock;
    if (block._type !== "block") continue;

    const inner = (block.children ?? [])
      .map((child) => renderSpanMarkdown(child, block.markDefs))
      .join("");

    if (block.listItem) {
      const indent = "  ".repeat(Math.max(0, (block.level ?? 1) - 1));
      const marker = block.listItem === "bullet" ? "-" : "1.";
      parts.push(`${indent}${marker} ${inner}`);
      continue;
    }

    switch (block.style) {
      case "h2":
        parts.push(`## ${inner}`);
        break;
      case "h3":
        parts.push(`### ${inner}`);
        break;
      case "h4":
        parts.push(`#### ${inner}`);
        break;
      case "blockquote":
        parts.push(`> ${inner}`);
        break;
      default:
        if (inner.trim()) parts.push(inner);
    }
  }

  return parts.join("\n\n");
}

/**
 * Plain text of Portable Text blocks: each text block's spans joined, blocks
 * separated by a space. Non-text nodes are skipped. Used for FAQ answers in
 * JSON-LD (and, from the content source, wherever rich text must become a
 * plain string).
 */
export function portableTextToPlainText(
  blocks: readonly unknown[] | null | undefined,
): string {
  return (blocks ?? [])
    .map((node) => {
      const block = node as PortableTextBlock | null;
      if (block?._type !== "block") return "";
      return (block.children ?? []).map((s) => s.text ?? "").join("");
    })
    .filter(Boolean)
    .join(" ");
}

/**
 * Every span's text in text blocks, each preceded by a space — the word
 * source for read time (estimateReadTime in src/lib/read-time.ts). Joining
 * spans with a space (not "") is deliberate: it is how read time has
 * always been counted.
 */
export function portableTextWords(
  blocks: readonly unknown[] | null | undefined,
): string {
  let text = "";
  for (const node of blocks ?? []) {
    const block = node as PortableTextBlock | null;
    if (block?._type !== "block" || !Array.isArray(block.children)) continue;
    for (const child of block.children) {
      if (child?._type === "span" && typeof child.text === "string")
        text += " " + child.text;
    }
  }
  return text;
}
