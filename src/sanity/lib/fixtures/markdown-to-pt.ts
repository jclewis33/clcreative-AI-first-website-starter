/**
 * Markdown → Portable Text, for the "sample" parity fixtures (./sample.ts)
 * ONLY. It converts exactly the Markdown and MDX subset the starter's
 * sample content uses, and throws on anything else, so new sample content
 * cannot make the two sources silently describe different things:
 *
 * - blocks: paragraphs (soft-wrapped lines joined by a space), ## to ####
 *   headings, > quotes, - and 1. list items (two spaces of indent per
 *   level), fenced code, a lone ![alt](./path) image line;
 * - MDX: <Callout type>…</Callout>, <VideoEmbed url caption />,
 *   <BlogCta id /> — each tag on its own line(s); a self-closing tag may
 *   wrap its attributes over several lines, as Prettier formats it;
 * - inline: **bold**, *em* / _em_, `code`, [text](href) (marks may nest).
 *
 * Keys are `${keyPrefix}${n}`, deterministic, because the parity diff
 * compares builds byte for byte.
 */

type Doc = Record<string, any>;

export interface PtContext {
  /** Prefix for every `_key` in this document — unique per field. */
  keyPrefix: string;
  /** A body image path ("./images/x.webp") → a projected Sanity image. */
  image?: (src: string) => Doc;
  /** A blog CTA id → its dereferenced projection (BLOG_CTA_PROJECTION). */
  cta?: (id: string) => Doc;
}

const unsupported = (what: string) =>
  new Error(
    `[sample fixtures] Unsupported Markdown: ${what}. Extend src/sanity/lib/fixtures/markdown-to-pt.ts, or keep the sample content inside its subset.`,
  );

const attr = (attrs: string, name: string) =>
  new RegExp(`\\b${name}="([^"]*)"`).exec(attrs)?.[1];

/** The start of any block other than a paragraph. */
const BLOCK_START =
  /^(?:```|<\/?[A-Z]|!\[|#{1,6}\s|>|\s*(?:[-*]|\d+\.)\s|\s*\|)/;

export function markdownToPortableText(
  markdown: string,
  ctx: PtContext,
): Doc[] {
  let n = 0;
  const key = () => `${ctx.keyPrefix}${++n}`;
  const textBlock = (text: string, extra: Doc = {}): Doc => {
    const markDefs: Doc[] = [];
    const children = inline(text, [], markDefs, key);
    return {
      _type: "block",
      _key: key(),
      style: "normal",
      markDefs,
      children,
      ...extra,
    };
  };

  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out: Doc[] = [];
  let i = 0;
  while (i < lines.length) {
    let line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    let m: RegExpExecArray | null;

    /* A self-closing MDX tag wrapped over several lines: join it into one
       line (consumed up to its closing line) before matching. */
    if (/^<(?:VideoEmbed|BlogCta)\b/.test(line) && !line.includes("/>")) {
      let end = i;
      while (end + 1 < lines.length && !lines[end].includes("/>")) end++;
      if (!lines[end].includes("/>"))
        throw unsupported(`an unclosed "${line}"`);
      line = lines
        .slice(i, end + 1)
        .map((part) => part.trim())
        .join(" ");
      i = end;
    }

    if ((m = /^```(\S*)\s*$/.exec(line))) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i]))
        code.push(lines[i++]);
      if (i >= lines.length) throw unsupported("an unclosed code fence");
      i++;
      out.push({
        _type: "code",
        _key: key(),
        code: code.join("\n"),
        language: m[1] || "plaintext",
      });
      continue;
    }
    if ((m = /^<Callout\b([^>]*)>\s*$/.exec(line))) {
      const inner: string[] = [];
      i++;
      while (i < lines.length && !/^<\/Callout>\s*$/.test(lines[i]))
        inner.push(lines[i++]);
      if (i >= lines.length) throw unsupported("an unclosed <Callout>");
      i++;
      const calloutKey = key();
      out.push({
        _type: "callout",
        _key: calloutKey,
        type: attr(m[1], "type") ?? "tip",
        body: markdownToPortableText(inner.join("\n"), {
          ...ctx,
          keyPrefix: `${calloutKey}-`,
        }),
      });
      continue;
    }
    if ((m = /^<VideoEmbed\b([^>]*)\/>\s*$/.exec(line))) {
      out.push({
        _type: "videoEmbed",
        _key: key(),
        url: attr(m[1], "url") ?? "",
        caption: attr(m[1], "caption") ?? null,
      });
      i++;
      continue;
    }
    if ((m = /^<BlogCta\b([^>]*)\/>\s*$/.exec(line))) {
      const id = attr(m[1], "id");
      if (!ctx.cta || !id) throw unsupported(`"${line}" here`);
      out.push({ _type: "blogCtaInline", _key: key(), cta: ctx.cta(id) });
      i++;
      continue;
    }
    if ((m = /^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/.exec(line))) {
      if (!ctx.image) throw unsupported(`an image here ("${line}")`);
      out.push({ _type: "image", _key: key(), ...ctx.image(m[2]), alt: m[1] });
      i++;
      continue;
    }
    if ((m = /^(#{2,4})\s+(.*)$/.exec(line))) {
      out.push(textBlock(m[2], { style: `h${m[1].length}` }));
      i++;
      continue;
    }
    if ((m = /^>\s?(.*)$/.exec(line))) {
      out.push(textBlock(m[1], { style: "blockquote" }));
      i++;
      continue;
    }
    if ((m = /^( *)([-*]|\d+\.)\s+(.*)$/.exec(line))) {
      out.push(
        textBlock(m[3], {
          listItem: /\d/.test(m[2]) ? "number" : "bullet",
          level: Math.floor(m[1].length / 2) + 1,
        }),
      );
      i++;
      continue;
    }
    if (BLOCK_START.test(line)) throw unsupported(`"${line}"`);
    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !BLOCK_START.test(lines[i]))
      paragraph.push(lines[i++].trim());
    out.push(textBlock(paragraph.join(" ")));
  }
  return out;
}

/** Inline Markdown → spans; link definitions are pushed onto `markDefs`. */
function inline(
  text: string,
  marks: string[],
  markDefs: Doc[],
  key: () => string,
): Doc[] {
  const spans: Doc[] = [];
  let plain = "";
  const flush = () => {
    if (plain) spans.push({ _type: "span", _key: key(), text: plain, marks });
    plain = "";
  };
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    let m: RegExpExecArray | null;
    if ((m = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(rest))) {
      flush();
      const linkKey = key();
      markDefs.push({ _type: "link", _key: linkKey, href: m[2] });
      spans.push(...inline(m[1], [...marks, linkKey], markDefs, key));
    } else if ((m = /^\*\*(.+?)\*\*/.exec(rest))) {
      flush();
      spans.push(...inline(m[1], [...marks, "strong"], markDefs, key));
    } else if ((m = /^\*(.+?)\*/.exec(rest)) || (m = /^_(.+?)_/.exec(rest))) {
      flush();
      spans.push(...inline(m[1], [...marks, "em"], markDefs, key));
    } else if ((m = /^`([^`]+)`/.exec(rest))) {
      flush();
      spans.push({
        _type: "span",
        _key: key(),
        text: m[1],
        marks: [...marks, "code"],
      });
    } else {
      plain += text[i];
      i++;
      continue;
    }
    i += m[0].length;
  }
  flush();
  return spans;
}
