#!/usr/bin/env node
/**
 * check-links — checks a built site for broken internal links and bad
 * redirects. Run after `npm run build`:
 *
 *   node scripts/check-links.mjs [dist/client]
 *
 * Links: every internal `href` / `src` / `srcset` / `poster` in every built
 * HTML page must resolve to something the site serves — a built file, a
 * page (`/x/` → `x/index.html`), a redirect source in the built
 * `_redirects`, or an SSR route (a `src/pages` file with
 * `export const prerender = false`, found automatically, so the Sanity
 * add-on's `/preview/*` twins count too). An in-page fragment (`#faq`,
 * `/blog/post/#intro`) must name an element id on the target page.
 *
 * Redirects: every line in the built `_redirects` (the hand-written
 * `public/_redirects` plus the static `redirects` the Cloudflare adapter
 * writes from astro.config.mjs) must have a valid status, an internal
 * destination that resolves, and a source that is not also a built page —
 * a page at the source path would be shadowed or would shadow the redirect,
 * depending on the rule.
 *
 * External links are not fetched: the check runs offline and must not fail
 * a PR because someone else's site is down.
 *
 * Known problems you have decided to live with for now go in
 * `scripts/check-links.allow.json` — `[{ "link": "/x", "page": "/y/",
 * "reason": "…" }]` (`page` optional). They are reported as warnings, not
 * failures, and an entry that no longer matches anything is flagged so the
 * list doesn't go stale. Fix the link instead whenever you can.
 *
 * Writes a Markdown summary to $GITHUB_STEP_SUMMARY when it is set.
 */
import fs from "node:fs";
import path from "node:path";
import { parse } from "node-html-parser";
import { SITE_URL } from "../src/config/site.shared.mjs";

const DIST = process.argv[2] ?? "dist/client";
const PAGES_DIR = "src/pages";
const SITE_ORIGIN = new URL(SITE_URL).origin;
const VALID_STATUS = new Set(["200", "301", "302", "303", "307", "308"]);

if (!fs.existsSync(DIST)) {
  console.error(
    `[check-links] ${DIST} does not exist — run npm run build first.`,
  );
  process.exit(1);
}

const ALLOW_FILE = "scripts/check-links.allow.json";
const allowList = fs.existsSync(ALLOW_FILE)
  ? JSON.parse(fs.readFileSync(ALLOW_FILE, "utf8"))
  : [];
const allowUsed = new Set();

const failures = [];
const allowed = [];
const fail = (message) => failures.push(message);

/** A link problem — a warning when the allow list names it, else a failure. */
function linkProblem(page, link, message) {
  const i = allowList.findIndex(
    (a) => a.link === link && (!a.page || a.page === page),
  );
  if (i === -1) return fail(message);
  allowUsed.add(i);
  allowed.push(`${message} (allowed: ${allowList[i].reason})`);
}

/** Every file under a directory, as paths relative to it with `/` separators. */
function walk(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, base));
    else out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out;
}

const builtFiles = new Set(walk(DIST));
const htmlFiles = [...builtFiles].filter((f) => f.endsWith(".html")).sort();

/** The built file a URL path is served from, or null. */
function resolveFile(urlPath) {
  const clean = urlPath.replace(/^\/+/, "");
  const candidates = [
    clean,
    clean.endsWith("/") || clean === ""
      ? `${clean}index.html`
      : `${clean}/index.html`,
    `${clean}.html`,
  ];
  return candidates.find((c) => builtFiles.has(c)) ?? null;
}

/** The URL path a built HTML file is served at. */
function pagePath(file) {
  if (file === "index.html") return "/";
  if (file.endsWith("/index.html"))
    return `/${file.slice(0, -"index.html".length)}`;
  return `/${file.replace(/\.html$/, "")}`;
}

/**
 * Route patterns for SSR routes: every src/pages file that opts out of
 * prerendering. `[slug]` matches one segment, `[...rest]` any remainder.
 */
function ssrRoutes() {
  if (!fs.existsSync(PAGES_DIR)) return [];
  return walk(PAGES_DIR)
    .filter((f) => /\.(astro|ts|js|mjs|md|mdx)$/.test(f))
    .filter((f) =>
      /export\s+const\s+prerender\s*=\s*false/.test(
        fs.readFileSync(path.join(PAGES_DIR, f), "utf8"),
      ),
    )
    .map((f) => {
      const route = f
        .replace(/\.(astro|ts|js|mjs|md|mdx)$/, "")
        .replace(/(^|\/)index$/, "");
      const pattern = route
        .split("/")
        .filter(Boolean)
        .map((seg) =>
          /^\[\.\.\..+\]$/.test(seg)
            ? ".*"
            : /^\[.+\]$/.test(seg)
              ? "[^/]+"
              : seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        )
        .join("/");
      return new RegExp(`^/${pattern}/?$`);
    });
}

/** Redirect rules from the built `_redirects`. */
function readRedirects() {
  if (!builtFiles.has("_redirects")) return [];
  return fs
    .readFileSync(path.join(DIST, "_redirects"), "utf8")
    .split("\n")
    .map((line, i) => ({ line: line.trim(), number: i + 1 }))
    .filter(({ line }) => line && !line.startsWith("#"))
    .map(({ line, number }) => {
      const [source, destination, status = "302"] = line.split(/\s+/);
      const pattern = new RegExp(
        `^${source
          .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
          .replace(/\*/g, ".*")
          .replace(/:[A-Za-z]\w*/g, "[^/]+")}/?$`,
      );
      return { source, destination, status, number, pattern };
    });
}

const ssr = ssrRoutes();
const redirects = readRedirects();

/** Parsed pages, cached: path → element ids on that page. */
const idCache = new Map();
function idsOn(file) {
  if (!idCache.has(file)) {
    const root = parse(fs.readFileSync(path.join(DIST, file), "utf8"));
    const ids = new Set(
      root
        .querySelectorAll("[id], a[name]")
        .map((el) => el.getAttribute("id") ?? el.getAttribute("name")),
    );
    idCache.set(file, ids);
  }
  return idCache.get(file);
}

/**
 * The internal path of a URL found on `fromPage`, or null when it is
 * external or not a page link (mailto:, tel:, data:, javascript:).
 */
function internalUrl(raw, fromPage) {
  const value = raw.trim();
  if (!value || /^(mailto|tel|sms|data|javascript|blob):/i.test(value))
    return null;
  let url;
  try {
    url = new URL(value, `${SITE_ORIGIN}${fromPage}`);
  } catch {
    return { error: `unparseable URL "${value}"` };
  }
  if (url.origin !== SITE_ORIGIN) return null;
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    pathname = url.pathname;
  }
  return {
    pathname,
    hash: url.hash ? decodeURIComponent(url.hash.slice(1)) : "",
  };
}

const isRedirectSource = (p) => redirects.some((r) => r.pattern.test(p));
const isSsr = (p) => ssr.some((re) => re.test(p));

/** Why `pathname#hash` doesn't resolve, or null when it does. */
function problemWith({ pathname, hash }, fromFile) {
  const target = pathname === "" ? fromFile : resolveFile(pathname);
  if (!target) {
    if (isRedirectSource(pathname) || isSsr(pathname)) return null;
    return "nothing is built at this path";
  }
  if (hash && target.endsWith(".html") && !idsOn(target).has(hash)) {
    return `no element with id="${hash}" on ${pagePath(target)}`;
  }
  return null;
}

let linksChecked = 0;
const ATTRS = [
  ["a[href]", "href"],
  ["area[href]", "href"],
  ["link[href]", "href"],
  ["img[src]", "src"],
  ["source[src]", "src"],
  ["video[src]", "src"],
  ["video[poster]", "poster"],
  ["audio[src]", "src"],
  ["iframe[src]", "src"],
  ["script[src]", "src"],
];

for (const file of htmlFiles) {
  const from = pagePath(file);
  const root = parse(fs.readFileSync(path.join(DIST, file), "utf8"));
  const seen = new Set();
  const check = (raw, what) => {
    const key = `${what}|${raw}`;
    if (seen.has(key)) return;
    seen.add(key);
    // Preconnect / dns-prefetch / alternate feeds point at origins, not files.
    const target = internalUrl(raw, from);
    if (!target) return;
    if (target.error) return fail(`${from}: ${what} — ${target.error}`);
    linksChecked++;
    const pageLocal = raw.trim().startsWith("#");
    const problem = problemWith(
      pageLocal ? { pathname: "", hash: target.hash } : target,
      file,
    );
    if (problem) {
      linkProblem(
        from,
        raw.trim(),
        `${from}: ${what} "${raw.trim()}" — ${problem}`,
      );
    }
  };

  for (const [selector, attr] of ATTRS) {
    for (const el of root.querySelectorAll(selector)) {
      if (el.tagName === "LINK") {
        const rel = (el.getAttribute("rel") ?? "").toLowerCase();
        if (/preconnect|dns-prefetch|alternate|canonical/.test(rel)) continue;
      }
      check(el.getAttribute(attr), `<${el.tagName.toLowerCase()} ${attr}>`);
    }
  }
  for (const el of root.querySelectorAll("img[srcset], source[srcset]")) {
    for (const candidate of el.getAttribute("srcset").split(",")) {
      const url = candidate.trim().split(/\s+/)[0];
      if (url) check(url, `<${el.tagName.toLowerCase()} srcset>`);
    }
  }
}

/* ------------------------------ redirects ------------------------------ */

for (const r of redirects) {
  const where = `_redirects line ${r.number} (${r.source} → ${r.destination})`;
  if (!VALID_STATUS.has(r.status)) {
    fail(`${where}: status ${r.status} is not one Cloudflare supports`);
  }
  if (!r.source.startsWith("/")) {
    fail(`${where}: the source must be a path starting with "/"`);
  }
  if (
    !r.source.includes("*") &&
    !r.source.includes(":") &&
    resolveFile(r.source)
  ) {
    fail(
      `${where}: a page is also built at ${r.source}, so one of them never shows`,
    );
  }
  const dest = internalUrl(
    r.destination.replace(/:splat|:[A-Za-z]\w*/g, "x"),
    "/",
  );
  if (dest && !dest.error && !/:splat|:[A-Za-z]\w*/.test(r.destination)) {
    const problem = problemWith(dest, "index.html");
    if (problem) fail(`${where}: the destination is broken — ${problem}`);
  }
  if (r.destination === r.source) fail(`${where}: redirects to itself`);
}

/* ------------------------------- report -------------------------------- */

const stale = allowList
  .map((a, i) => ({ ...a, i }))
  .filter(({ i }) => !allowUsed.has(i))
  .map(
    ({ link, page }) =>
      `${ALLOW_FILE}: "${link}"${page ? ` on ${page}` : ""} no longer occurs — remove the entry`,
  );

const list = (items) => items.map((f) => `- ${f}`).join("\n");
const summary = [
  `### Links and redirects`,
  "",
  `${htmlFiles.length} pages, ${linksChecked} internal links, ${redirects.length} redirect rules checked.`,
  "",
  failures.length
    ? `**${failures.length} problem${failures.length === 1 ? "" : "s"}:**\n\n${list(failures)}`
    : "No broken links or redirects.",
  "",
  ...(allowed.length
    ? [`Known issues (allow list):\n\n${list(allowed)}`, ""]
    : []),
  ...(stale.length ? [`Stale allow-list entries:\n\n${list(stale)}`, ""] : []),
].join("\n");

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
}

for (const a of allowed) console.warn(`[check-links] known issue: ${a}`);
for (const s of stale) console.warn(`[check-links] ${s}`);

if (failures.length) {
  console.error(`[check-links] ${failures.length} problem(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  `[check-links] OK — ${htmlFiles.length} pages, ${linksChecked} internal links, ${redirects.length} redirects.`,
);
