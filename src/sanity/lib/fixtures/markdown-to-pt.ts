/**
 * Markdown → Portable Text, for the "sample" parity fixtures (./sample.ts)
 * ONLY. It converts exactly the Markdown and MDX subset the starter's
 * sample content uses, and throws on anything else (naming the file and
 * line), so new sample content cannot make the two sources silently
 * describe different things:
 *
 * - blocks: paragraphs (soft-wrapped lines joined by a space), ## to ####
 *   headings, > quotes (consecutive lines join into one), - and 1. list
 *   items (one line each; a nested item indents to its parent's text, so
 *   two spaces under "- " and three under "1. "; a new numbered list
 *   starts at 1), ``` fenced code at the line start, a lone ![alt](./path)
 *   image line;
 * - MDX: <Callout type>…</Callout>, <VideoEmbed url caption />,
 *   <BlogCta id /> — each tag on its own line(s), attributes as literal
 *   "double-quoted" strings only; a self-closing tag may wrap its
 *   attributes over several lines;
 * - inline: **bold**, *em* / _em_, `code`, [text](href) (marks may nest).
 *
 * Rejected because Markdown/MDX would render them differently from this
 * converter: list or quote continuation lines, thematic breaks, setext
 * and other heading levels, ~~~ / indented fences and indented code,
 * raw HTML (lowercase tags, <br>), backslash escapes, ~~strikethrough~~,
 * reference-style links, bare URLs (GFM autolinks), entities, hard
 * breaks (trailing double space), intraword _ and inline images.
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
  /** Where the Markdown came from, for error messages (a file, or a file and field). */
  source?: string;
  /** The source line of the Markdown's first line. @default 1 */
  line?: number;
}

/** The attributes each MDX tag accepts; `true` marks a required one. */
const TAG_ATTRS: Record<string, Record<string, boolean>> = {
  Callout: { type: false },
  VideoEmbed: { url: true, caption: false },
  BlogCta: { id: true },
};

/** The start of any block other than a paragraph. */
const BLOCK_START =
  /^(?:```|<\/?[A-Z]|!\[|#{1,6}\s|>|\s*(?:[-*]|\d+\.)\s|\s*\|)/;

const LIST_ITEM = /^( *)([-*]|\d+\.) (\S.*)$/;

export function markdownToPortableText(
  markdown: string,
  ctx: PtContext,
): Doc[] {
  const firstLine = ctx.line ?? 1;
  const unsupported = (what: string, index: number) =>
    new Error(
      `[sample fixtures] ${ctx.source ?? "Markdown"}, line ${firstLine + index}: Unsupported Markdown: ${what}. Extend src/sanity/lib/fixtures/markdown-to-pt.ts, or keep the sample content inside its subset.`,
    );

  /** Parse an MDX tag's attribute string: literal "double-quoted" values only. */
  const tagAttrs = (tag: string, raw: string, index: number) => {
    const allowed = TAG_ATTRS[tag];
    const attrs: Record<string, string> = {};
    const rest = raw.replace(/\s+([A-Za-z]+)="([^"]*)"/g, (_, name, value) => {
      if (!(name in allowed))
        throw unsupported(`the attribute ${name} on <${tag}>`, index);
      attrs[name] = value;
      return "";
    });
    if (rest.trim())
      throw unsupported(
        `<${tag}> attributes "${rest.trim()}" (only literal name="value" pairs)`,
        index,
      );
    for (const [name, required] of Object.entries(allowed))
      if (required && attrs[name] === undefined)
        throw unsupported(`<${tag}> without a literal ${name}="…"`, index);
    return attrs;
  };

  /** Throw on inline constructs this converter would render differently. */
  const checkInline = (text: string, index: number) => {
    if (/ {2,}$/.test(text))
      throw unsupported("a hard line break (trailing spaces)", index);
    const prose = text.replace(/`[^`]*`/g, "");
    const fail = (what: string) => {
      throw unsupported(`${what} in "${text.trim()}"`, index);
    };
    if (prose.includes("\\")) fail("a backslash escape");
    if (prose.includes("~~")) fail("~~strikethrough~~");
    if (/<br\b/i.test(prose)) fail("<br>");
    if (/<\/?[A-Za-z!]/.test(prose)) fail("inline HTML or JSX");
    if (/\]\[/.test(prose)) fail("a reference-style link");
    if (/!\[/.test(prose)) fail("an inline image");
    if (/&(?:#\d+|#x[\da-f]+|[a-z]+);/i.test(prose)) fail("an HTML entity");
    const outsideHrefs = prose.replace(/\]\([^)\s]*\)/g, "]");
    if (/https?:\/\/|www\./.test(outsideHrefs))
      fail("a bare URL (GFM would autolink it)");
    if (/[\p{L}\p{N}]_[\p{L}\p{N}]/u.test(outsideHrefs)) fail("an intraword _");
  };

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
  /** Text columns and kinds (numbered or not) of the open list levels. */
  let listColumns: number[] = [];
  let listOrdered: boolean[] = [];
  /** Whether the last block was a list followed by a blank line. */
  let blankAfterList = false;
  let i = 0;
  while (i < lines.length) {
    let line = lines[i];
    if (!line.trim()) {
      if (listColumns.length) blankAfterList = true;
      listColumns = [];
      i++;
      continue;
    }
    const listBefore = blankAfterList;
    blankAfterList = false;
    const start = i;
    let m: RegExpExecArray | null;

    if (/^\s*~~~/.test(line)) throw unsupported("a ~~~ fence", i);
    if (/^\s+```/.test(line)) throw unsupported("an indented code fence", i);
    if (/^ {0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line))
      throw unsupported(`a thematic break "${line.trim()}"`, i);
    if (/^=+\s*$/.test(line)) throw unsupported("a setext heading", i);
    if (/^\s*<[a-z!/]/.test(line))
      throw unsupported(`raw HTML "${line.trim()}"`, i);
    if (/^\s*\[[^\]]+\]:/.test(line))
      throw unsupported("a reference-style link definition", i);

    /* A self-closing MDX tag wrapped over several lines: join it into one
       line (consumed up to its closing line) before matching. */
    if (/^<(?:VideoEmbed|BlogCta)\b/.test(line) && !line.includes("/>")) {
      let end = i;
      while (end + 1 < lines.length && !lines[end].includes("/>")) end++;
      if (!lines[end].includes("/>"))
        throw unsupported(`an unclosed "${line}"`, i);
      line = lines
        .slice(i, end + 1)
        .map((part) => part.trim())
        .join(" ");
      i = end;
    }

    if (!LIST_ITEM.test(line)) {
      listColumns = [];
      listOrdered = [];
    }

    if ((m = /^```(\S*)\s*$/.exec(line))) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i]))
        code.push(lines[i++]);
      if (i >= lines.length) throw unsupported("an unclosed code fence", start);
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
      const attrs = tagAttrs("Callout", m[1], i);
      const inner: string[] = [];
      i++;
      while (i < lines.length && !/^<\/Callout>\s*$/.test(lines[i]))
        inner.push(lines[i++]);
      if (i >= lines.length) throw unsupported("an unclosed <Callout>", start);
      i++;
      const calloutKey = key();
      out.push({
        _type: "callout",
        _key: calloutKey,
        type: attrs.type ?? "tip",
        body: markdownToPortableText(inner.join("\n"), {
          ...ctx,
          keyPrefix: `${calloutKey}-`,
          line: firstLine + start + 1,
        }),
      });
      continue;
    }
    if ((m = /^<VideoEmbed\b(.*?)\/>\s*$/.exec(line))) {
      const attrs = tagAttrs("VideoEmbed", m[1], start);
      out.push({
        _type: "videoEmbed",
        _key: key(),
        url: attrs.url,
        caption: attrs.caption ?? null,
      });
      i++;
      continue;
    }
    if ((m = /^<BlogCta\b(.*?)\/>\s*$/.exec(line))) {
      const attrs = tagAttrs("BlogCta", m[1], start);
      if (!ctx.cta) throw unsupported(`"${line}" here`, start);
      out.push({ _type: "blogCtaInline", _key: key(), cta: ctx.cta(attrs.id) });
      i++;
      continue;
    }
    if ((m = /^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/.exec(line))) {
      if (!ctx.image) throw unsupported(`an image here ("${line}")`, i);
      out.push({ _type: "image", _key: key(), ...ctx.image(m[2]), alt: m[1] });
      i++;
      continue;
    }
    if ((m = /^(#{2,4})\s+(.*)$/.exec(line))) {
      if (/\s#+\s*$/.test(m[2]))
        throw unsupported("a closing # sequence on a heading", i);
      checkInline(m[2], i);
      out.push(textBlock(m[2], { style: `h${m[1].length}` }));
      i++;
      continue;
    }
    if (/^>/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>/.test(lines[i])) {
        const part = /^>\s?(.*)$/.exec(lines[i])![1];
        if (!part.trim() || BLOCK_START.test(part))
          throw unsupported(
            "a quote holding anything but one paragraph of text",
            i,
          );
        checkInline(part, i);
        quote.push(part.trim());
        i++;
      }
      if (i < lines.length && lines[i].trim() && !BLOCK_START.test(lines[i]))
        throw unsupported("a lazy continuation line after a quote", i);
      out.push(textBlock(quote.join(" "), { style: "blockquote" }));
      continue;
    }
    if ((m = LIST_ITEM.exec(line))) {
      const indent = m[1].length;
      const ordered = /\d/.test(m[2]);
      let level = listColumns.findIndex((column, l) =>
        l === 0 ? indent === 0 : indent === listColumns[l - 1],
      );
      if (level === -1 && indent === (listColumns.at(-1) ?? 0))
        level = listColumns.length;
      if (level === -1 || (listColumns.length === 0 && indent !== 0))
        throw unsupported(
          `a list item indented ${indent} spaces (nest under the parent's text column)`,
          i,
        );
      const prev = out.at(-1);
      if (
        listBefore &&
        indent === 0 &&
        prev?.listItem === (ordered ? "number" : "bullet")
      )
        throw unsupported("a loose list (a blank line between items)", i);
      const continues =
        listColumns.length > level && listOrdered[level] === ordered;
      if (ordered && !continues && m[2] !== "1.")
        throw unsupported(`a numbered list starting at ${m[2]}`, i);
      listColumns = [...listColumns.slice(0, level), indent + m[2].length + 1];
      listOrdered = [...listOrdered.slice(0, level), ordered];
      checkInline(m[3], i);
      out.push(
        textBlock(m[3], {
          listItem: ordered ? "number" : "bullet",
          level: level + 1,
        }),
      );
      i++;
      if (i < lines.length && lines[i].trim() && !BLOCK_START.test(lines[i]))
        throw unsupported(
          /^\s/.test(lines[i])
            ? "an indented continuation line after a list item"
            : "a lazy continuation line after a list item",
          i,
        );
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s/.test(line))
      throw unsupported(`a list item not written as "- text" or "1. text"`, i);
    if (BLOCK_START.test(line)) throw unsupported(`"${line}"`, i);
    if (/^ {4,}/.test(line)) throw unsupported("an indented code block", i);
    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !BLOCK_START.test(lines[i])) {
      if (/^\s*(?:=+|-+)\s*$/.test(lines[i]))
        throw unsupported("a setext heading underline", i);
      checkInline(lines[i], i);
      paragraph.push(lines[i++].trim());
    }
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
