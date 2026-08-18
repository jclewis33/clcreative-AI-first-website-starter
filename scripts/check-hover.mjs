/**
 * check-hover — guards the editor tooltips that the component JSDoc exists for.
 *
 * Every `ui/` and `sections/` component documents its props in JSDoc so that
 * hovering a prop in the editor shows what it does. That contract is fragile in
 * ways nothing else in the toolchain notices: `astro check`, `npm run build`
 * and a pixel diff all pass while every tooltip in a file is silently gone.
 *
 * Two failure modes have actually happened here, both invisible without this
 * script:
 *
 *   1. A stray `<` or `>` in a FRONTMATTER COMMENT detaches the whole file's
 *      Props type at the call site — every prop loses its tooltip AND invalid
 *      props stop erroring. Write comparisons in words, never with the literal
 *      character. (The comment that used to warn about this contained the very
 *      characters it warned about, and broke four components.)
 *
 *   2. In a component whose props are `BaseProps extends HTMLAttributes<…>`
 *      INTERSECTED WITH A UNION, a prop typed with an inline union
 *      (`variant?: "a" | "b"`) or an alias-plus-string (`ratio?: Preset |
 *      string`) loses its tooltip, while the identical type behind a NAMED
 *      ALIAS keeps it. Name the type and the tooltip comes back.
 *
 * Neither rule is worth reasoning about at the keyboard — this measures it.
 * It drives the real Astro language server over LSP and asks for the same
 * hover the editor would show.
 *
 * Usage: npm run check:hover
 * Exits 1 if any prop documented in source shows no description on hover.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const PROBE_PAGE = "src/pages/_hover-probe.astro";

/* ── Collect props + their declared types from each component ─────────────── */

const walk = (d) =>
  fs
    .readdirSync(d, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)],
    );

/** Pick an attribute value that matches the declared type, so a value mismatch
    is never confused with a lost tooltip. A prop's own `@example` is the best
    source — it is real, valid usage written by whoever declared the prop. */
function probeValue(name, doc, type) {
  /* Prefer an @example for THIS prop whose value is self-contained (a quoted
     string, number, boolean or literal). Examples referencing an imported
     variable — `src={myImage}` — would not resolve here. */
  const examples = [...doc.matchAll(/@example\s+([^\n]+)/g)].map((m) =>
    m[1].trim(),
  );
  for (const ex of examples) {
    const own = new RegExp(`^${name}(=|\\s|$)`).exec(ex);
    if (!own) continue;
    if (ex === name) return ""; // bare boolean keyword
    const value = ex.slice(name.length + 1);
    if (/^"[^"]*"$/.test(value)) return `="${value.slice(1, -1)}"`;
    if (/^\{[^{}]*\}$/.test(value) && !/[A-Za-z_$]/.test(value))
      return `=${value}`;
    if (/^\{\{.*\}\}$/.test(value)) return `=${value}`;
    if (/^\{\[.*\]\}$/.test(value)) return `=${value}`;
  }
  /* Otherwise pick a value from the declared type, following named aliases
     (`variant?: ButtonVariant`) to the literals they stand for. */
  let t = type.replace(/\s+/g, " ").trim();
  for (const [alias, def] of aliases) {
    if (new RegExp(`\\b${alias}\\b`).test(t)) t += " | " + def;
  }
  const literal = /"([^"]+)"/.exec(t);
  if (literal) return `="${literal[1]}"`;
  if (/\bboolean\b/.test(t)) return "";
  if (/\bnumber\b/.test(t)) return "={1}";
  return '="x"';
}

/** `type X = …` declarations in this file, so a prop typed by alias can be
    probed with a literal the alias actually permits. */
let aliases = [];
function collectAliases(fm) {
  aliases = [...fm.matchAll(/\btype\s+([A-Za-z_$][\w$]*)\s*=([^;]+);/g)].map(
    (m) => [m[1], m[2].replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\s+/g, " ")],
  );
}

/** Slice out only the regions that actually declare COMPONENT props: the
    `Props` / `BaseProps` interfaces and the `export type Props = …` union.
    Item-shape interfaces in the same file (ScrollRevealItem, BlogPost, …) are
    documented too, but they are never attributes — probing them would report
    failures that no editor tooltip depends on. */
function propRegions(fm) {
  const regions = [];
  const anchors =
    /(?:export\s+)?(?:interface\s+(?:Base)?Props\b|type\s+Props\b)/g;
  let m;
  while ((m = anchors.exec(fm))) {
    let i = fm.indexOf("{", m.index);
    const stop = fm.indexOf(";", m.index);
    if (i === -1) continue;
    if (stop !== -1 && stop < i && /type\s+Props/.test(m[0])) continue;
    let depth = 0;
    let j = i;
    for (; j < fm.length; j++) {
      if (fm[j] === "{") depth++;
      else if (fm[j] === "}" && --depth === 0) break;
    }
    regions.push(fm.slice(i, j + 1));
  }
  return regions.join("\n");
}

const components = [];
for (const file of walk("src/components").filter((f) => f.endsWith(".astro"))) {
  const src = fs.readFileSync(file, "utf8");
  const end = src.indexOf("\n---", 3);
  if (end === -1) continue;
  collectAliases(src.slice(0, end));
  const scope = propRegions(src.slice(0, end));

  /* Props declared with a JSDoc block immediately above them. Only these are
     guarded — an undocumented prop has no tooltip to lose. */
  const props = [];
  const re = /\/\*\*([\s\S]*?)\*\/\s*\n\s*([A-Za-z_$][\w$]*)(\??):\s*([^;]+);/g;
  let m;
  while ((m = re.exec(scope))) {
    const [, doc, name, , type] = m;
    const text = doc
      .replace(/^\s*\*/gm, "")
      .replace(/@\w+[^\n]*/g, "")
      .trim();
    if (!text) continue; // tag-only JSDoc carries no description
    if (/never/.test(type)) continue; // union-branch exclusion marker
    if (props.some((p) => p.name === name)) continue;
    props.push({ name, type, value: probeValue(name, doc, type) });
  }
  if (props.length) components.push({ file, props });
}

/* ── Generate a probe page ────────────────────────────────────────────────── */

let imports = "---\n";
const body = [];
components.forEach((c, i) => {
  const tag = `C${i}`;
  imports += `import ${tag} from "@/${c.file.replace(/^src\//, "")}";\n`;
  for (const p of c.props) {
    body.push(`{/* @probe ${tag}|${c.file}|${p.name} ${p.name} */}`);
    body.push(`<${tag} ${p.name}${p.value} />`);
  }
});
fs.writeFileSync(PROBE_PAGE, imports + "---\n" + body.join("\n") + "\n");

/* ── Drive the language server ────────────────────────────────────────────── */

const server = spawn(
  process.execPath,
  [
    path.join(ROOT, "node_modules/@astrojs/language-server/bin/nodeServer.js"),
    "--stdio",
  ],
  { cwd: ROOT, stdio: ["pipe", "pipe", "pipe"] },
);

let buf = Buffer.alloc(0);
const pending = new Map();
let nextId = 1;
server.stdout.on("data", (chunk) => {
  buf = Buffer.concat([buf, chunk]);
  for (;;) {
    const h = buf.indexOf("\r\n\r\n");
    if (h === -1) return;
    const len = Number(/Content-Length: (\d+)/.exec(buf.subarray(0, h))[1]);
    if (buf.length < h + 4 + len) return;
    const msg = JSON.parse(buf.subarray(h + 4, h + 4 + len).toString());
    buf = buf.subarray(h + 4 + len);
    if (msg.id !== undefined && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  }
});
server.stderr.on("data", () => {});
const send = (m) => {
  const s = JSON.stringify({ jsonrpc: "2.0", ...m });
  server.stdin.write(`Content-Length: ${Buffer.byteLength(s)}\r\n\r\n${s}`);
};
const request = (method, params) =>
  new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    send({ id, method, params });
  });

await request("initialize", {
  processId: process.pid,
  rootUri: pathToFileURL(ROOT).href,
  workspaceFolders: [{ uri: pathToFileURL(ROOT).href, name: "root" }],
  initializationOptions: {
    typescript: { tsdk: path.join(ROOT, "node_modules/typescript/lib") },
  },
  capabilities: {
    textDocument: { hover: { contentFormat: ["markdown", "plaintext"] } },
  },
});
send({ method: "initialized", params: {} });

const abs = path.resolve(PROBE_PAGE);
const text = fs.readFileSync(abs, "utf8");
const uri = pathToFileURL(abs).href;
send({
  method: "textDocument/didOpen",
  params: { textDocument: { uri, languageId: "astro", version: 1, text } },
});
await new Promise((r) => setTimeout(r, 8000));

const lines = text.split("\n");
const failures = [];
let checked = 0;
for (let i = 0; i < lines.length; i++) {
  const marker = /@probe (\S+)\|(\S+)\|(\S+) (\S+) \*\/\}/.exec(lines[i]);
  if (!marker) continue;
  const [, , file, prop, attr] = marker;
  const col = lines[i + 1].indexOf(attr);
  if (col === -1) continue;
  checked++;
  const res = await request("textDocument/hover", {
    textDocument: { uri },
    position: { line: i + 1, character: col + 1 },
  });
  const hover = res?.result?.contents?.value ?? "";
  const description = hover.replace(/```[\s\S]*?```/, "").trim();
  if (!description) failures.push({ file, prop, hover: hover.split("\n")[1] });
}

server.kill();
fs.unlinkSync(PROBE_PAGE);

console.log(`check-hover: ${checked} documented props probed`);
if (failures.length) {
  console.error(`\n✗ ${failures.length} prop(s) lost their editor tooltip:\n`);
  for (const f of failures) {
    console.error(`  ${f.file}  →  ${f.prop}`);
    console.error(`      hover shows: ${f.hover || "(nothing)"}`);
  }
  console.error(
    "\nSee the header of scripts/check-hover.mjs for the two known causes.",
  );
  process.exit(1);
}
console.log("✓ every documented prop shows its JSDoc on hover");
