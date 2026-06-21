/**
 * Portable Text to HTML serializer for Sanity content.
 *
 * Converts Sanity's Portable Text blocks into HTML strings that work
 * with the existing u-rich-text CSS styling. Used by blog posts,
 * case studies, and glossary term detail pages.
 */

import { resolveInternalLinkHref, type InternalLinkTarget } from "./resolve";
import { urlFor } from "./image";
import { SITE_URL } from "../../config/site";

interface PortableTextSpan {
  _type: "span";
  text: string;
  marks?: string[];
}

interface MarkDef {
  _key: string;
  _type: string;
  href?: string;
  newTab?: boolean;
  target?: InternalLinkTarget;
}

interface PortableTextBlock {
  _type: "block";
  _key?: string;
  style?: string;
  children?: PortableTextSpan[];
  listItem?: "bullet" | "number";
  level?: number;
  markDefs?: MarkDef[];
}

interface PortableTextImage {
  _type: "image";
  asset: { _ref: string };
  alt?: string;
  caption?: string;
}

interface PortableTextVideoEmbed {
  _type: "videoEmbed";
  url: string;
  caption?: string;
}

type PortableTextNode =
  | PortableTextBlock
  | PortableTextImage
  | PortableTextVideoEmbed;

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
  target: InternalLinkTarget
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
      `<span class="internal-link_preview_media"><img src="${escapeAttr(imageUrl)}" alt="" loading="lazy"></span>`
    );
  }
  parts.push(`<span class="internal-link_preview_content">`);
  if (title) {
    parts.push(`<span class="internal-link_preview_title">${escapeHtml(title)}</span>`);
  }
  if (description) {
    parts.push(`<span class="internal-link_preview_text">${escapeHtml(description)}</span>`);
  }
  parts.push(`</span></span></span>`);

  return parts.join("");
}

/**
 * Convert a Portable Text span's marks to HTML.
 */
function renderSpan(span: PortableTextSpan, markDefs: PortableTextBlock["markDefs"]): string {
  let html = escapeHtml(span.text);

  if (!span.marks?.length) return html;

  for (const mark of span.marks) {
    switch (mark) {
      case "strong":
        html = `<strong>${html}</strong>`;
        break;
      case "em":
        html = `<em>${html}</em>`;
        break;
      case "code":
        html = `<code>${html}</code>`;
        break;
      case "underline":
        html = `<u>${html}</u>`;
        break;
      case "strike-through":
        html = `<s>${html}</s>`;
        break;
      default: {
        // Annotation mark — look up in markDefs
        const def = markDefs?.find((d) => d._key === mark);
        if (def?._type === "link" && def.href) {
          const attrs = def.newTab
            ? ` target="_blank" rel="noopener noreferrer"`
            : "";
          html = `<a href="${escapeAttr(def.href)}"${attrs}>${html}</a>`;
        } else if (def?._type === "internalLink") {
          const href = resolveInternalLinkHref(def.target);
          if (href) {
            const attrs = def.newTab
              ? ` target="_blank" rel="noopener noreferrer"`
              : "";
            html = renderInternalLinkWithPreview(html, href, attrs, def.target);
          }
        }
      }
    }
  }

  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str: string): string {
  return str.replace(/"/g, "&quot;").replace(/&/g, "&amp;");
}

/**
 * Convert an array of Portable Text blocks to an HTML string.
 *
 * Supports: paragraphs, headings (h2-h4), blockquotes, bullet/numbered lists,
 * bold, italic, code, links, and inline images.
 *
 * The output is designed to be rendered inside a `.u-rich-text` wrapper.
 */
export function portableTextToHtml(
  blocks: PortableTextNode[] | null | undefined,
  imageUrlFn?: (ref: string) => string
): string {
  if (!blocks?.length) return "";

  const parts: string[] = [];
  let currentListType: string | null = null;

  for (let i = 0; i < blocks.length; i++) {
    const node = blocks[i];

    // Handle video embeds
    if (node._type === "videoEmbed") {
      if (currentListType) {
        parts.push(currentListType === "bullet" ? "</ul>" : "</ol>");
        currentListType = null;
      }

      const video = node as PortableTextVideoEmbed;
      const embedUrl = resolveVideoEmbedUrl(video.url);
      if (embedUrl) {
        const title = video.caption ? escapeAttr(video.caption) : "Video";
        parts.push(`<figure class="video-embed_wrap">`);
        parts.push(`<div class="video-embed_frame">`);
        parts.push(
          `<iframe src="${escapeAttr(embedUrl)}" title="${title}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`
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
      // Close any open list
      if (currentListType) {
        parts.push(currentListType === "bullet" ? "</ul>" : "</ol>");
        currentListType = null;
      }

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

    const children = block.children ?? [];
    const innerHtml = children
      .map((child) => renderSpan(child, block.markDefs))
      .join("");

    // Handle list items
    if (block.listItem) {
      const listTag = block.listItem === "bullet" ? "ul" : "ol";
      if (currentListType !== block.listItem) {
        if (currentListType) {
          parts.push(currentListType === "bullet" ? "</ul>" : "</ol>");
        }
        parts.push(`<${listTag}>`);
        currentListType = block.listItem;
      }
      parts.push(`<li>${innerHtml}</li>`);
      continue;
    }

    // Close any open list before non-list content
    if (currentListType) {
      parts.push(currentListType === "bullet" ? "</ul>" : "</ol>");
      currentListType = null;
    }

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

  // Close trailing list
  if (currentListType) {
    parts.push(currentListType === "bullet" ? "</ul>" : "</ol>");
  }

  return parts.join("\n");
}

/* ── Markdown serializer (for llms-full.txt) ───────────────────────────────── */

/** Convert a span's marks to inline markdown. */
function renderSpanMarkdown(
  span: PortableTextSpan,
  markDefs: PortableTextBlock["markDefs"]
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
  blocks: PortableTextNode[] | null | undefined
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
