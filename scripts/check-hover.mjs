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
 * Exits 3 if the language server itself fails (crashes, hangs, never gets
 * ready). `npm run check:hover` runs this through scripts/run-check-hover.mjs,
 * which probes the props in batches (`--batch=I/N`, a fresh server each — one
 * page of every prop ran the server's Go/WASM Astro compiler out of memory on
 * CI) and retries a batch once on exit 3.
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

/* ── Pick this run's batch ────────────────────────────────────────────────── */

/* `--batch=I/N` probes every Nth component starting at I (run-check-hover.mjs
   runs all N batches, each in its own process with a fresh language server).
   One page holding every documented prop made the server's bundled Astro
   compiler (Go WebAssembly, ~2 GB memory ceiling) run out of memory on CI:
   "runtime: out of memory … fatal error: out of memory". */
const batchArg = process.argv.find((a) => a.startsWith("--batch="));
const [BATCH, BATCHES] = batchArg
  ? batchArg.slice("--batch=".length).split("/").map(Number)
  : [0, 1];
if (
  !Number.isInteger(BATCH) ||
  !Number.isInteger(BATCHES) ||
  BATCHES < 1 ||
  BATCH < 0 ||
  BATCH >= BATCHES
) {
  console.error(
    `check-hover: bad --batch value "${batchArg}" (want I/N, 0 ≤ I < N)`,
  );
  process.exit(2);
}
const batch = components.filter((_, i) => i % BATCHES === BATCH);

/* ── Generate a probe page ────────────────────────────────────────────────── */

let imports = "---\n";
const body = [];
batch.forEach((c, i) => {
  const tag = `C${i}`;
  imports += `import ${tag} from "@/${c.file.replace(/^src\//, "")}";\n`;
  for (const p of c.props) {
    body.push(`{/* @probe ${tag}|${c.file}|${p.name} ${p.name} */}`);
    body.push(`<${tag} ${p.name}${p.value} />`);
  }
});
fs.writeFileSync(PROBE_PAGE, imports + "---\n" + body.join("\n") + "\n");

/* ── Drive the language server ────────────────────────────────────────────── */

/* The server is a separate process, and every way it can go wrong has to end
   this script loudly: a server that exits, never answers or never gets ready
   would otherwise leave a request awaiting forever, and Node then quits with
   a bare "unsettled top-level await" (exit 13) that names no cause. */

/** How long one request may take before the run fails. */
const REQUEST_TIMEOUT_MS = 30_000;
/** How long the server may take to return its first hover. */
const READY_TIMEOUT_MS = 60_000;
/** How much of the server's stderr to keep for a failure report: the start
    (where a crash's first message, e.g. a Go panic, usually is) and the end. */
const STDERR_HEAD_CHARS = 4_000;
const STDERR_TAIL_CHARS = 8_000;
/** Exit code for "the language server failed", distinct from 1 ("a tooltip
    is missing") so the runner can retry only the former. */
const EXIT_SERVER_FAILED = 3;

let stderrHead = "";
let stderrTail = "";
let finished = false;

/** Stop the server, remove the probe page, explain, exit (default 3: the
    server failed; tooltip failures exit 1 at the end of the script). */
function fail(message, exitCode = EXIT_SERVER_FAILED) {
  if (finished) return;
  finished = true;
  if (server.exitCode === null && server.signalCode === null) server.kill();
  fs.rmSync(PROBE_PAGE, { force: true });
  console.error(`\n✗ check-hover: ${message}`);
  const head = stderrHead.trim();
  const tail = stderrTail.trim();
  if (!head && !tail)
    console.error("\n(The language server wrote nothing to stderr.)");
  if (head)
    console.error(
      `\nLanguage server stderr (first ${STDERR_HEAD_CHARS} characters):\n${head}`,
    );
  if (tail && tail !== head)
    console.error(
      `\nLanguage server stderr (last ${STDERR_TAIL_CHARS} characters):\n${tail}`,
    );
  process.exit(exitCode);
}

const server = spawn(
  process.execPath,
  [
    path.join(ROOT, "node_modules/@astrojs/language-server/bin/nodeServer.js"),
    "--stdio",
  ],
  { cwd: ROOT, stdio: ["pipe", "pipe", "pipe"] },
);

let buf = Buffer.alloc(0);
/** id → { resolve, reject, timer, method } */
const pending = new Map();
let nextId = 1;
const send = (m) => {
  const s = JSON.stringify({ jsonrpc: "2.0", ...m });
  server.stdin.write(`Content-Length: ${Buffer.byteLength(s)}\r\n\r\n${s}`);
};
server.stdout.on("data", (chunk) => {
  buf = Buffer.concat([buf, chunk]);
  for (;;) {
    const h = buf.indexOf("\r\n\r\n");
    if (h === -1) return;
    const header = /Content-Length: (\d+)/.exec(buf.subarray(0, h).toString());
    if (!header)
      return fail(
        `unreadable message header from the language server: ${JSON.stringify(buf.subarray(0, h).toString())}`,
      );
    const len = Number(header[1]);
    if (buf.length < h + 4 + len) return;
    const msg = JSON.parse(buf.subarray(h + 4, h + 4 + len).toString());
    buf = buf.subarray(h + 4 + len);
    if (msg.method !== undefined && msg.id !== undefined) {
      /* A request FROM the server (workspace/configuration,
         client/registerCapability, …). Answer it, so the server never waits
         on us; null is what a client without that feature replies. */
      const items = msg.params?.items;
      send({
        id: msg.id,
        result: Array.isArray(items) ? items.map(() => null) : null,
      });
    } else if (msg.id !== undefined && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      clearTimeout(p.timer);
      if (msg.error)
        p.reject(
          new Error(
            `${p.method} returned an error: ${JSON.stringify(msg.error)}`,
          ),
        );
      else p.resolve(msg);
    }
  }
});
server.stderr.on("data", (chunk) => {
  const text = chunk.toString();
  if (stderrHead.length < STDERR_HEAD_CHARS)
    stderrHead = (stderrHead + text).slice(0, STDERR_HEAD_CHARS);
  stderrTail = (stderrTail + text).slice(-STDERR_TAIL_CHARS);
});
server.on("error", (err) =>
  fail(`the language server could not be started: ${err.message}`),
);
server.on("exit", (code, signal) => {
  if (finished) return;
  const how = signal ? `was killed by ${signal}` : `exited with code ${code}`;
  const waiting = [...pending.values()].map((p) => p.method);
  fail(
    `the language server ${how} before the check finished` +
      (waiting.length ? ` (waiting on: ${waiting.join(", ")})` : "") +
      ".\nA SIGKILL (code 137), or a SIGABRT with 'heap out of memory' in the stderr below, means it ran out of memory.",
  );
});
/* Writing to a server that has just died raises EPIPE on stdin; the 'exit'
   handler above reports the real cause. */
server.stdin.on("error", () => {});

const request = (method, params) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(
        new Error(
          `${method} got no answer within ${REQUEST_TIMEOUT_MS / 1000}s — the language server is hung or overloaded`,
        ),
      );
    }, REQUEST_TIMEOUT_MS);
    pending.set(id, { resolve, reject, timer, method });
    send({ id, method, params });
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hoverText = (res) => res?.result?.contents?.value ?? "";

try {
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

  const lines = text.split("\n");
  const probes = [];
  for (let i = 0; i < lines.length; i++) {
    const marker = /@probe (\S+)\|(\S+)\|(\S+) (\S+) \*\/\}/.exec(lines[i]);
    if (!marker) continue;
    const [, , file, prop, attr] = marker;
    const col = lines[i + 1].indexOf(attr);
    if (col === -1) continue;
    probes.push({ file, prop, position: { line: i + 1, character: col + 1 } });
  }
  const hover = (position) =>
    request("textDocument/hover", { textDocument: { uri }, position });

  /* Ready when the first probe's hover has any content (a type signature at
     least — its description is what the loop below judges). Until the
     TypeScript project has loaded, hovers come back empty. */
  if (probes.length) {
    const started = Date.now();
    let attempts = 0;
    for (;;) {
      attempts++;
      if (hoverText(await hover(probes[0].position))) break;
      if (Date.now() - started > READY_TIMEOUT_MS)
        throw new Error(
          `the language server returned no hover for ${probes[0].file} → ${probes[0].prop} in ${READY_TIMEOUT_MS / 1000}s (${attempts} attempts) — it never finished loading the project`,
        );
      await sleep(1000);
    }
  }

  const failures = [];
  for (const p of probes) {
    const hoverMd = hoverText(await hover(p.position));
    const description = hoverMd.replace(/```[\s\S]*?```/, "").trim();
    if (!description)
      failures.push({
        file: p.file,
        prop: p.prop,
        hover: hoverMd.split("\n")[1],
      });
  }

  finished = true;
  server.kill();
  fs.unlinkSync(PROBE_PAGE);

  console.log(
    `check-hover: ${probes.length} documented props probed` +
      (BATCHES > 1 ? ` (batch ${BATCH + 1} of ${BATCHES})` : ""),
  );
  if (failures.length) {
    console.error(
      `\n✗ ${failures.length} prop(s) lost their editor tooltip:\n`,
    );
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
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}
