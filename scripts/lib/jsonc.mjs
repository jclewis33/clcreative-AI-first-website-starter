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
 * Output follows Prettier (measured on 3.6): a .jsonc file ends every
 * member with a comma (`trailingCommas: true`); a .json file never does.
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

/**
 * `"key": value` as lines; a plain-object value opens its own block.
 * @param {string} key
 * @param {unknown} value
 * @param {string} indent
 * @param {boolean} trailingCommas
 * @param {boolean} last
 * @returns {string[]}
 */
function renderMember(key, value, indent, trailingCommas, last) {
  const comma = trailingCommas || !last ? "," : "";
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value);
    return [
      `${indent}${JSON.stringify(key)}: {`,
      ...entries.flatMap(([k, v], i) =>
        renderMember(
          k,
          v,
          `${indent}  `,
          trailingCommas,
          i === entries.length - 1,
        ),
      ),
      `${indent}}${comma}`,
    ];
  }
  return [`${indent}${JSON.stringify(key)}: ${JSON.stringify(value)}${comma}`];
}

/**
 * Edits that add `entries` before the closing brace of the object at
 * tokens[open], one per line, indented one level past the line that opens
 * it.
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
 * alone; a different value is replaced in place (on one line); a missing
 * entry is added before the object's closing brace, with `comment` as
 * `//` lines above the first added entry.
 * @param {string} text
 * @param {string} key
 * @param {Record<string, unknown>} entries
 * @param {SetOptions} options
 * @returns {{ text: string, changed: string[] }}
 */
export function setMembers(text, key, entries, options) {
  const tokens = tokenize(text);
  if (tokens[0]?.type !== "{")
    throw new Error("The top level must be an object");
  const at = members(tokens, 0).get(key);
  /** @type {Edit[]} */
  let edits = [];
  /** @type {string[]} */
  const changed = [];
  if (at === undefined) {
    if (Object.keys(entries).length === 0) return { text, changed };
    edits = insertInto(text, tokens, 0, [[key, entries]], options);
    changed.push(...Object.keys(entries).map((k) => `added ${k}`));
  } else {
    if (tokens[at].type !== "{") throw new Error(`"${key}" is not an object`);
    const current = members(tokens, at);
    /** @type {Array<[string, unknown]>} */
    const missing = [];
    for (const [k, value] of Object.entries(entries)) {
      const v = current.get(k);
      if (v === undefined) {
        missing.push([k, value]);
        changed.push(`added ${k}`);
        continue;
      }
      const end = valueEnd(tokens, v);
      const existing = JSON.parse(toJson(text, tokens, v, end));
      if (JSON.stringify(existing) === JSON.stringify(value)) continue;
      edits.push({
        start: tokens[v].start,
        end: tokens[end].end,
        text: JSON.stringify(value),
      });
      changed.push(`updated ${k}`);
    }
    if (missing.length)
      edits.push(...insertInto(text, tokens, at, missing, options));
  }
  let out = text;
  for (const edit of edits.sort((a, b) => b.start - a.start))
    out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
  return { text: out, changed };
}
