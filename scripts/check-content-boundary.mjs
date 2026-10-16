#!/usr/bin/env node
/**
 * check-content-boundary — keeps the CMS behind the content interface.
 *
 * Pages, templates, sections and components get content ONLY from
 * `@/lib/content` (src/lib/content). This fails when any other file under
 * src/ imports Sanity code:
 *
 *   @/sanity/…          the Sanity backend (loaders, queries, urlFor, types)
 *   @sanity/…  sanity   Sanity packages (stegaClean, the client, …)
 *   sanity:…            @sanity/astro virtual modules
 *   astro-portabletext  the Portable Text renderer
 *   ./…/sanity/…        a relative path into src/sanity
 *
 * ALLOW lists the files that are Sanity-only by nature — they move into the
 * Sanity add-on wholesale (docs/superpowers/specs/2026-10-16-files-first-
 * content-design.md). Add to it only for a file with no meaning without
 * Sanity. Comments count: a doc example importing Sanity in a consumer is a
 * stale instruction, so it fails too.
 *
 * RESTRICTED lists modules only some files may import: the node-only
 * content-sync helpers (src/lib/content/markdown.ts, checks.ts — importing
 * them from a page would ship them to the Worker), and later the Files
 * backend itself. A restricted rule applies to every file, allow-listed or
 * not.
 *
 * Usage: npm run check:boundary   (exit 1 on any violation)
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const SANITY_DIR = path.join(SRC, "sanity") + path.sep;

const ALLOW = [
  "src/sanity/", // the Sanity backend itself
  "src/lib/content/source.ts", // the one-line backend selector
  "src/pages/preview/", // draft-preview SSR twins (Presentation)
  "src/pages/api/draft-mode/", // draft-mode enable/disable endpoints
  "src/components/portabletext/", // Portable Text renderers
  "src/components/blog/BlogBody.astro", // renders Portable Text bodies
  "src/components/SanityVisualEditing.tsx", // visual-editing island
  "src/components/DisableDraftMode.tsx", // visual-editing island
  "src/layouts/BaseLayout.astro", // mounts visual editing (perspective cookie)
  "src/middleware.ts", // Studio frame-ancestors on /preview
  "src/env.d.ts", // @sanity/astro module types
];

/**
 * Modules only some files may import. `target` is a repo path without its
 * extension (a folder covers everything inside it); `allow` lists importer
 * paths (a trailing "/" covers a folder).
 */
const RESTRICTED = [
  {
    target: "src/lib/content/markdown",
    allow: ["src/content.config.ts"],
    why: "node-only: rich text is rendered at content sync by src/content.config.ts",
  },
  {
    target: "src/lib/content/checks",
    allow: ["src/content.config.ts"],
    why: "node-only: content-sync checks that read the filesystem",
  },
];

const allowedBy = (rel, list) =>
  list.some((a) => rel === a || (a.endsWith("/") && rel.startsWith(a)));

/** The repo path (no extension) a specifier points at; null for a package. */
function targetOf(spec, file) {
  const abs = spec.startsWith("@/")
    ? path.join(SRC, spec.slice(2))
    : spec.startsWith(".")
      ? path.resolve(path.dirname(file), spec)
      : null;
  return abs
    ? path
        .relative(ROOT, abs)
        .split(path.sep)
        .join("/")
        .replace(/\.(ts|tsx|mjs|js|astro)$/, "")
    : null;
}

const EXTENSIONS = new Set([".astro", ".ts", ".tsx", ".mjs", ".js"]);
const SPECIFIER =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|<reference\s+types=)["']([^"']+)["']/g;

function forbidden(spec, file) {
  if (
    spec.startsWith("@/sanity/") ||
    spec.startsWith("@sanity/") ||
    spec.startsWith("sanity:") ||
    spec === "sanity" ||
    spec.startsWith("sanity/") ||
    spec === "astro-portabletext" ||
    spec.startsWith("astro-portabletext/")
  )
    return true;
  if (spec.startsWith("."))
    return (path.resolve(path.dirname(file), spec) + path.sep).startsWith(
      SANITY_DIR,
    );
  return false;
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
}

const violations = [];
for (const file of walk(SRC)) {
  if (!EXTENSIONS.has(path.extname(file))) continue;
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  const sanityAllowed = allowedBy(rel, ALLOW);
  const lines = fs.readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const [, spec] of line.matchAll(SPECIFIER)) {
      if (!sanityAllowed && forbidden(spec, file))
        violations.push(`${rel}:${i + 1}  ${spec}`);
      const to = targetOf(spec, file);
      for (const rule of RESTRICTED) {
        const hit =
          to && (to === rule.target || to.startsWith(`${rule.target}/`));
        if (hit && !allowedBy(rel, rule.allow))
          violations.push(`${rel}:${i + 1}  ${spec}  (${rule.why})`);
      }
    }
  });
}

if (violations.length) {
  console.error(
    `Content boundary violations (get content from @/lib/content; see the rules in scripts/check-content-boundary.mjs):\n${violations
      .map((v) => `  ${v}`)
      .join("\n")}`,
  );
  process.exit(1);
}
console.log(
  "Content boundary OK: no Sanity imports outside the allow list, no restricted imports.",
);
