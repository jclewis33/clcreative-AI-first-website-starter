// @ts-check
/**
 * Minimal JSONC — JSON with comments and trailing commas — for the config
 * files the scripts read and edit (wrangler.jsonc, tsconfig.json). Zero
 * dependencies.
 *
 *   tokenize(text)    strings, punctuation and bare literals with their
 *                     offsets; whitespace and comments are skipped, so a
 *                     `//` or `{` inside a string can't confuse anything
 *   parseJsonc(text)  the value, as JSON.parse would return it
 *   setMembers(text, key, entries, options)
 *                     sets entries inside the top-level object member
 *                     `key` (creating it), editing only the text it must:
 *                     comments and formatting elsewhere are untouched
 *
 * Output follows Prettier (measured on 3.6, printWidth 80): a .jsonc file
 * ends every member with a comma (`trailingCommas: true`); a .json file
 * never does. Values are printed as Prettier prints them (printValue), a
 * one-line object that gains a member is expanded, and CRLF files stay
 * CRLF. scripts/check-addon-installer.mjs checks all of it against
 * Prettier itself.
 */

/**
 * @typedef {"string" | "literal" | "{" | "}" | "[" | "]" | ":" | ","} TokenType
 * @typedef {{ type: TokenType, start: number, end: number, value?: unknown }} Token
 * @typedef {{ start: number, end: number, text: string }} Edit
 * @typedef {{ trailingCommas: boolean, comment?: string }} SetOptions
 */

/**
 * @param {string} text
 * @returns {Token[]}
 */
export function tokenize(text) {
  /** @type {Token[]} */
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      i++;
    } else if (ch === "/" && text[i + 1] === "/") {
      const end = text.indexOf("\n", i);
      i = end === -1 ? text.length : end;
    } else if (ch === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      if (end === -1) throw new Error(`Unterminated comment at offset ${i}`);
      i = end + 2;
    } else if (ch === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j += text[j] === "\\" ? 2 : 1;
      if (j >= text.length)
        throw new Error(`Unterminated string at offset ${i}`);
      tokens.push({
        type: "string",
        start: i,
        end: j + 1,
        value: JSON.parse(text.slice(i, j + 1)),
      });
      i = j + 1;
    } else if ("{}[]:,".includes(ch)) {
      tokens.push({
        type: /** @type {TokenType} */ (ch),
        start: i,
        end: i + 1,
      });
      i++;
    } else {
      let j = i;
      while (j < text.length && !/[\s{}[\]:,"/]/.test(text[j])) j++;
      if (j === i) throw new Error(`Unexpected "${ch}" at offset ${i}`);
      tokens.push({
        type: "literal",
        start: i,
        end: j,
        value: JSON.parse(text.slice(i, j)),
      });
      i = j;
    }
  }
  return tokens;
}

/**
 * Index of the token that closes the bracket at tokens[open].
 * @param {Token[]} tokens
 * @param {number} open
 */
function closing(tokens, open) {
  let depth = 0;
  for (let k = open; k < tokens.length; k++) {
    const type = tokens[k].type;
    if (type === "{" || type === "[") depth++;
    else if (type === "}" || type === "]") {
      depth--;
      if (depth === 0) return k;
    }
  }
  throw new Error(
    `Unclosed "${tokens[open].type}" at offset ${tokens[open].start}`,
  );
}

/**
 * Last token index of the value that starts at tokens[k].
 * @param {Token[]} tokens
 * @param {number} k
 */
const valueEnd = (tokens, k) =>
  tokens[k].type === "{" || tokens[k].type === "[" ? closing(tokens, k) : k;

/**
 * tokens[from..to] as strict JSON: comments gone, trailing commas dropped.
 * @param {string} text
 * @param {Token[]} tokens
 * @param {number} from
 * @param {number} to
 */
function toJson(text, tokens, from, to) {
  let json = "";
  for (let k = from; k <= to; k++) {
    const next = tokens[k + 1]?.type;
    if (tokens[k].type === "," && (next === "}" || next === "]")) continue;
    json += text.slice(tokens[k].start, tokens[k].end);
  }
  return json;
}

/**
 * @param {string} text
 * @returns {any}
 */
export function parseJsonc(text) {
  const tokens = tokenize(text);
  if (tokens.length === 0) throw new Error("Empty document");
  return JSON.parse(toJson(text, tokens, 0, tokens.length - 1));
}

/**
 * The object at tokens[open]: each member's key → its value's first token.
 * @param {Token[]} tokens
 * @param {number} open
 */
function members(tokens, open) {
  const close = closing(tokens, open);
  /** @type {Map<string, number>} */
  const out = new Map();
  let k = open + 1;
  while (k < close) {
    if (tokens[k].type !== "string" || tokens[k + 1]?.type !== ":")
      throw new Error(`Expected "key": at offset ${tokens[k].start}`);
    out.set(String(tokens[k].value), k + 2);
    k = valueEnd(tokens, k + 2) + 1;
    if (tokens[k]?.type === ",") k++;
  }
  return out;
}

/**
 * The whitespace that starts the line containing `offset`.
 * @param {string} text
 * @param {number} offset
 */
function lineIndent(text, offset) {
  const start = text.lastIndexOf("\n", offset - 1) + 1;
  return /^[ \t]*/.exec(text.slice(start))?.[0] ?? "";
}

/* ── Printing values the way Prettier prints JSON ─────────────────────── */

/** Prettier's default printWidth; the repo's config doesn't change it for JSON. */
const WIDTH = 80;

/** @param {unknown} v */
const isObject = (v) => !!v && typeof v === "object" && !Array.isArray(v);

/**
 * Entry count of an array or object; -1 for anything else.
 * @param {unknown} v
 */
const size = (v) =>
  Array.isArray(v)
    ? v.length
    : isObject(v)
      ? Object.keys(/** @type {object} */ (v)).length
      : -1;

/**
 * `value` as Prettier would print it, starting at `column` on a line
 * indented `indent`, with `suffix` characters (a comma) after it on the
 * same line. Non-empty objects always open their own block — Prettier
 * keeps an object expanded when its source breaks after the `{`, so that
 * form is stable. Arrays stay on one line when they fit and nothing in
 * them forces a break; otherwise one element per line, or, for an
 * all-number array, as many per line as fit (Prettier's "fill"). An array
 * of two or more arrays, or of two or more objects, each with two or more
 * entries, always breaks (measured on Prettier 3.6).
 * @param {unknown} value
 * @param {number} column
 * @param {string} indent
 * @param {number} suffix
 * @param {boolean} trailingCommas
 * @returns {string}
 */
function printValue(value, column, indent, suffix, trailingCommas) {
  if (isObject(value)) {
    const entries = Object.entries(/** @type {object} */ (value));
    if (entries.length === 0) return "{}";
    const inner = `${indent}  `;
    const lines = entries.map(([k, v], i) => {
      const last = i === entries.length - 1;
      const comma = trailingCommas || !last ? "," : "";
      const head = `${inner}${JSON.stringify(k)}: `;
      return `${head}${printValue(v, head.length, inner, comma.length, trailingCommas)}${comma}`;
    });
    return `{\n${lines.join("\n")}\n${indent}}`;
  }
  if (!Array.isArray(value)) return JSON.stringify(value);
  if (value.length === 0) return "[]";
  const inner = `${indent}  `;
  const forced =
    value.some((v) => isObject(v) && size(v) > 0) ||
    (value.length > 1 &&
      (value.every((v) => Array.isArray(v) && v.length > 1) ||
        value.every((v) => isObject(v) && size(v) > 1)));
  if (!forced) {
    const flat = `[${value
      .map((v) => printValue(v, 0, "", 0, trailingCommas))
      .join(", ")}]`;
    if (!flat.includes("\n") && column + flat.length + suffix <= WIDTH)
      return flat;
  }
  const end = trailingCommas ? "," : "";
  if (value.every((v) => typeof v === "number")) {
    /** @type {string[]} */
    const rows = [];
    let row = "";
    value.forEach((v, i) => {
      const item = `${JSON.stringify(v)}${i === value.length - 1 ? end : ","}`;
      if (row && inner.length + row.length + 1 + item.length > WIDTH) {
        rows.push(row);
        row = item;
      } else row = row ? `${row} ${item}` : item;
    });
    rows.push(row);
    return `[\n${rows.map((r) => `${inner}${r}`).join("\n")}\n${indent}]`;
  }
  const lines = value.map((v, i) => {
    const comma = i === value.length - 1 ? end : ",";
    return `${inner}${printValue(v, inner.length, inner, comma.length, trailingCommas)}${comma}`;
  });
  return `[\n${lines.join("\n")}\n${indent}]`;
}

/**
 * `"key": value` as lines.
 * @param {string} key
 * @param {unknown} value
 * @param {string} indent
 * @param {boolean} trailingCommas
 * @param {boolean} last
 * @returns {string[]}
 */
function renderMember(key, value, indent, trailingCommas, last) {
  const comma = trailingCommas || !last ? "," : "";
  const head = `${indent}${JSON.stringify(key)}: `;
  return `${head}${printValue(value, head.length, indent, comma.length, trailingCommas)}${comma}`.split(
    "\n",
  );
}

/**
 * The text between tokens[from] and tokens[to] holds a comment.
 * @param {string} text
 * @param {Token[]} tokens
 * @param {number} from
 * @param {number} to
 */
function hasComment(text, tokens, from, to) {
  for (let k = from; k < to; k++)
    if (text.slice(tokens[k].end, tokens[k + 1].start).trim()) return true;
  return false;
}

/**
 * A plain object as Prettier prints it, opening on its own line indented
 * `outer`. `comment` becomes `//` lines above the member `commentKey`;
 * with `child`, the member `child.key` is printed by this same function
 * and the comment goes inside it, above `child.commentKey`.
 * @param {Record<string, unknown>} obj
 * @param {string} outer
 * @param {boolean} trailingCommas
 * @param {string | undefined} comment
 * @param {string | undefined} commentKey
 * @param {{ key: string, commentKey: string | undefined }} [child]
 * @returns {string}
 */
function renderObject(obj, outer, trailingCommas, comment, commentKey, child) {
  const keys = Object.keys(obj);
  if (keys.length === 0) return "{}";
  const indent = `${outer}  `;
  /** @type {string[]} */
  const lines = [];
  keys.forEach((k, i) => {
    const last = i === keys.length - 1;
    if (comment && k === commentKey)
      lines.push(...comment.split("\n").map((line) => `${indent}// ${line}`));
    if (child && k === child.key) {
      const comma = trailingCommas || !last ? "," : "";
      const value = renderObject(
        /** @type {Record<string, unknown>} */ (obj[k]),
        indent,
        trailingCommas,
        comment,
        child.commentKey,
      );
      lines.push(`${indent}${JSON.stringify(k)}: ${value}${comma}`);
    } else lines.push(...renderMember(k, obj[k], indent, trailingCommas, last));
  });
  return `{\n${lines.join("\n")}\n${outer}}`;
}

/**
 * Edits that add `entries` before the closing brace of the multi-line
 * object at tokens[open], one per line, indented one level past the line
 * that opens it. (setMembers re-prints one-line objects whole instead.)
 * @param {string} text
 * @param {Token[]} tokens
 * @param {number} open
 * @param {Array<[string, unknown]>} entries
 * @param {SetOptions} options
 * @returns {Edit[]}
 */
function insertInto(text, tokens, open, entries, { trailingCommas, comment }) {
  const close = closing(tokens, open);
  const outer = lineIndent(text, tokens[open].start);
  const indent = `${outer}  `;
  const lines = [
    ...(comment
      ? comment.split("\n").map((line) => `${indent}// ${line}`)
      : []),
    ...entries.flatMap(([k, v], i) =>
      renderMember(k, v, indent, trailingCommas, i === entries.length - 1),
    ),
  ].join("\n");
  if (close === open + 1)
    return [
      {
        start: tokens[open].end,
        end: tokens[close].start,
        text: `\n${lines}\n${outer}`,
      },
    ];
  /** @type {Edit[]} */
  const edits = [];
  const last = tokens[close - 1];
  if (last.type !== ",")
    edits.push({ start: last.end, end: last.end, text: "," });
  const lineStart = text.lastIndexOf("\n", tokens[close].start - 1) + 1;
  if (/^[ \t]*$/.test(text.slice(lineStart, tokens[close].start)))
    edits.push({ start: lineStart, end: lineStart, text: `${lines}\n` });
  else
    edits.push({
      start: tokens[close].start,
      end: tokens[close].start,
      text: `\n${lines}\n${outer}`,
    });
  return edits;
}

/**
 * Set `entries` inside the top-level object member `key`, creating the
 * member when it is absent. An entry whose value is already equal is left
 * alone; a different value is replaced in place, printed as Prettier
 * would; a missing entry is added before the object's closing brace, with
 * `comment` as `//` lines above the first added entry (above the new
 * member itself when `key` is created). When the object — or the root
 * holding it — is written on one line, that container is re-printed whole,
 * one member per line, as Prettier prints it once it grows; a one-line
 * container holding a comment is refused rather than losing it. CRLF line
 * endings are kept. The result is re-parsed and must equal the intended
 * merge, or this throws.
 * @param {string} text
 * @param {string} key
 * @param {Record<string, unknown>} entries
 * @param {SetOptions} options
 * @returns {{ text: string, changed: string[] }}
 */
export function setMembers(text, key, entries, options) {
  const { trailingCommas, comment } = options;
  const crlf = text.includes("\r\n");
  const src = crlf ? text.replace(/\r\n/g, "\n") : text;
  const tokens = tokenize(src);
  if (tokens[0]?.type !== "{")
    throw new Error("The top level must be an object");
  const rootClose = closing(tokens, 0);
  /** @type {Record<string, unknown>} */
  const root = JSON.parse(toJson(src, tokens, 0, rootClose));
  const at = members(tokens, 0).get(key);
  if (at !== undefined && tokens[at].type !== "{")
    throw new Error(`"${key}" is not an object`);
  /** @type {Record<string, unknown>} */
  const current =
    at === undefined ? {} : /** @type {Record<string, unknown>} */ (root[key]);

  /** @type {string[]} */
  const changed = [];
  /** @type {string[]} */
  const added = [];
  for (const [k, value] of Object.entries(entries)) {
    if (!Object.hasOwn(current, k)) {
      added.push(k);
      changed.push(`added ${k}`);
    } else if (JSON.stringify(current[k]) !== JSON.stringify(value))
      changed.push(`updated ${k}`);
  }
  if (changed.length === 0) return { text, changed };
  const merged = { ...current, ...entries };
  const expected = { ...root, [key]: merged };

  const oneLine = (/** @type {number} */ open) =>
    !src
      .slice(tokens[open].start, tokens[closing(tokens, open)].end)
      .includes("\n");
  /** @type {Edit[]} */
  const edits = [];
  const reprint = oneLine(0) ? 0 : at !== undefined && oneLine(at) ? at : -1;
  if (reprint !== -1) {
    const close = closing(tokens, reprint);
    if (hasComment(src, tokens, reprint, close))
      throw new Error(
        `Can't edit the one-line object at offset ${tokens[reprint].start}: it holds a comment`,
      );
    const outer = lineIndent(src, tokens[reprint].start);
    edits.push({
      start: tokens[reprint].start,
      end: tokens[close].end,
      text:
        reprint === 0
          ? at === undefined
            ? renderObject(expected, outer, trailingCommas, comment, key)
            : renderObject(
                expected,
                outer,
                trailingCommas,
                comment,
                undefined,
                {
                  key,
                  commentKey: added[0],
                },
              )
          : renderObject(merged, outer, trailingCommas, comment, added[0]),
    });
  } else if (at === undefined) {
    edits.push(...insertInto(src, tokens, 0, [[key, entries]], options));
  } else {
    const positions = members(tokens, at);
    for (const [k, value] of Object.entries(entries)) {
      const v = positions.get(k);
      if (v === undefined || !changed.includes(`updated ${k}`)) continue;
      const end = valueEnd(tokens, v);
      const lineStart = src.lastIndexOf("\n", tokens[v].start - 1) + 1;
      edits.push({
        start: tokens[v].start,
        end: tokens[end].end,
        text: printValue(
          value,
          tokens[v].start - lineStart,
          lineIndent(src, tokens[v].start),
          tokens[end + 1]?.type === "," ? 1 : 0,
          trailingCommas,
        ),
      });
    }
    if (added.length)
      edits.push(
        ...insertInto(
          src,
          tokens,
          at,
          added.map((k) => [k, entries[k]]),
          options,
        ),
      );
  }

  let out = src;
  for (const edit of edits.sort((a, b) => b.start - a.start))
    out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
  let result;
  try {
    result = parseJsonc(out);
  } catch (err) {
    throw new Error(
      `setMembers produced unparsable output (a bug): ${/** @type {Error} */ (err).message}`,
    );
  }
  if (JSON.stringify(result) !== JSON.stringify(expected))
    throw new Error(
      `setMembers produced output that does not match the intended merge of "${key}" (a bug); nothing was written`,
    );
  return { text: crlf ? out.replace(/\n/g, "\r\n") : out, changed };
}
