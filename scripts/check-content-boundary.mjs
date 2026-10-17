#!/usr/bin/env node
// @ts-check
/**
 * check-content-boundary — keeps content behind the content interface.
 *
 * Pages, templates, sections and components get content ONLY from
 * `@/lib/content` (src/lib/content). Each rule names modules (repo paths
 * and/or packages) and the files allowed to import them; importing a
 * rule's module from any other file under src/ is a violation.
 *
 * Core rules (RESTRICTED below): the node-only content-sync helpers
 * (src/lib/content/markdown.ts, checks.ts — importing them from a page
 * would ship them to the Worker), and the Files backend
 * (src/lib/content/files/), reached only through the content interface, except by
 * the MDX body components (src/components/blog/mdx/: `<BlogCta id>` looks
 * its CTA up by id).
 *
 * Add-on rules: a content add-on that brings its own backend ships
 * scripts/boundary/<name>.json, loaded when present:
 *
 *   {
 *     "why": "…",                    printed with each violation
 *     "packages": ["@sanity/*", …],  a trailing * matches a prefix; a bare
 *                                    name matches itself and name/…
 *     "paths": ["src/sanity"],       repo paths without extension; a
 *                                    folder covers everything inside
 *     "allow": ["src/sanity/", …]    importers exempt from the rule (a
 *                                    trailing "/" covers a folder)
 *   }
 *
 * The default site (content in src/content) ships none. Comments count: a
 * doc example importing a forbidden module is a stale instruction, so it
 * fails too.
 *
 * Usage: npm run check:boundary   (`--root <dir>` checks another tree, as
 * scripts/check-boundary-rules.mjs does). Exit 1 on any violation.
 */
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const rootAt = args.indexOf("--root");
const ROOT = path.resolve(rootAt >= 0 ? args[rootAt + 1] : process.cwd());
const SRC = path.join(ROOT, "src");

/** @typedef {{ why: string, paths: string[], packages: string[], allow: string[] }} Rule */

/** @type {Rule[]} */
const RESTRICTED = [
  {
    paths: ["src/lib/content/markdown"],
    packages: [],
    allow: ["src/content.config.ts"],
    why: "node-only: rich text is rendered at content sync by src/content.config.ts",
  },
  {
    paths: ["src/lib/content/checks"],
    packages: [],
    allow: ["src/content.config.ts"],
    why: "node-only: content-sync checks that read the filesystem",
  },
  {
    paths: ["src/lib/content/files"],
    packages: [],
    allow: ["src/lib/content/", "src/components/blog/mdx/"],
    why: "the Files backend is reached through @/lib/content; only the MDX body components (src/components/blog/mdx/) read it directly",
  },
];

/** @returns {Rule[]} */
function addonRules() {
  const dir = path.join(ROOT, "scripts", "boundary");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => {
      const rule = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
      return {
        why: rule.why ?? `scripts/boundary/${file}`,
        paths: rule.paths ?? [],
        packages: rule.packages ?? [],
        allow: rule.allow ?? [],
      };
    });
}
const RULES = [...RESTRICTED, ...addonRules()];

/** @param {string} rel @param {string[]} list */
const allowedBy = (rel, list) =>
  list.some((a) => rel === a || (a.endsWith("/") && rel.startsWith(a)));

/** @param {string} spec @param {string} pattern */
const packageMatch = (spec, pattern) =>
  pattern.endsWith("*")
    ? spec.startsWith(pattern.slice(0, -1))
    : spec === pattern || spec.startsWith(`${pattern}/`);

/**
 * The repo path (no extension) a specifier points at; null for a package.
 * @param {string} spec
 * @param {string} file
 */
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

/** @param {Rule} rule @param {string} spec @param {string | null} to */
const hits = (rule, spec, to) =>
  to
    ? rule.paths.some((p) => to === p || to.startsWith(`${p}/`))
    : rule.packages.some((p) => packageMatch(spec, p));

const EXTENSIONS = new Set([".astro", ".ts", ".tsx", ".mjs", ".js"]);
const SPECIFIER =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|<reference\s+types=)["']([^"']+)["']/g;

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
}

/** @type {string[]} */
const violations = [];
for (const file of walk(SRC)) {
  if (!EXTENSIONS.has(path.extname(file))) continue;
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  fs.readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      for (const [, spec] of line.matchAll(SPECIFIER)) {
        const to = targetOf(spec, file);
        for (const rule of RULES)
          if (hits(rule, spec, to) && !allowedBy(rel, rule.allow))
            violations.push(`${rel}:${i + 1}  ${spec}  (${rule.why})`);
      }
    });
}

if (violations.length) {
  console.error(
    `Content boundary violations (get content from @/lib/content; rules in scripts/check-content-boundary.mjs and scripts/boundary/):\n${violations
      .map((v) => `  ${v}`)
      .join("\n")}`,
  );
  process.exit(1);
}
console.log(
  `Content boundary OK: ${RULES.length} rules (${RULES.length - RESTRICTED.length} from add-ons), no violations.`,
);
