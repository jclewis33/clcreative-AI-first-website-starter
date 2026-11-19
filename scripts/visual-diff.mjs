#!/usr/bin/env node
/**
 * visual-diff — screenshots the same pages in two builds of the site and
 * reports which ones look different. CI runs it on every pull request with
 * the base branch's build and the PR's build, so the reviewer sees what
 * changed without clicking through the preview.
 *
 *   node scripts/visual-diff.mjs --base <dist> --head <dist> [--out visual-report]
 *
 * Which pages: the key pages in `scripts/visual-pages.json` (CSS changes
 * don't show in the HTML, so these are always shot), plus up to
 * `maxChangedPages` whose built HTML differs between the two builds once
 * asset hashes are normalised (the same normalisation as compare-dist).
 * New pages are shot on the PR side only.
 *
 * How: each build is served from a local static server and loaded in
 * headless Chromium at each width in `widths`, full page, with
 * `prefers-reduced-motion: reduce` (the GSAP system then reveals every
 * element in its final state), transitions and animations switched off,
 * lazy images forced to load and fonts awaited. Pixels are compared with
 * pixelmatch; a page counts as changed when at least `minChangedPixels`
 * pixels differ or its height changed. Both builds render on the same
 * machine, so an unchanged page differs by zero pixels; the floor only
 * absorbs the odd anti-aliasing speck. It is a pixel count, not a
 * percentage, so a one-word change on a long page still shows.
 *
 * Output in --out: `report.md` (also appended to $GITHUB_STEP_SUMMARY) and,
 * for every changed page and width, `<name>-<width>-base.png`, `-head.png`
 * and `-diff.png` (changed pixels in red). It reports; it never fails the
 * build — a PR is supposed to change things. The reviewer decides.
 *
 * Needs Chromium once: `npx playwright install chromium`.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => {
    if (arg.startsWith("--")) pairs.push([arg.slice(2), all[i + 1]]);
    return pairs;
  }, []),
);
const BASE = args.base;
const HEAD = args.head ?? "dist/client";
const OUT = args.out ?? "visual-report";
const CONFIG = JSON.parse(
  fs.readFileSync(args.pages ?? "scripts/visual-pages.json", "utf8"),
);

if (!BASE || !fs.existsSync(BASE) || !fs.existsSync(HEAD)) {
  console.error(
    "[visual-diff] usage: --base <built dist> --head <built dist> (both must exist)",
  );
  process.exit(1);
}

/* ------------------------------ page list ------------------------------ */

function walk(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, base));
    else out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out;
}

const htmlIn = (dir) =>
  new Set(walk(dir).filter((f) => f.endsWith(".html") && f !== "404.html"));
const toPath = (file) =>
  file === "index.html" ? "/" : `/${file.replace(/index\.html$/, "")}`;
const toFile = (page) =>
  page === "/"
    ? "index.html"
    : `${page.replace(/^\//, "").replace(/\/?$/, "/")}index.html`;

/** Built HTML with the parts that change without changing the page removed. */
const normalize = (text) =>
  text
    .replace(/\/_astro\/[^"'\s)&?#,]+/g, "/_astro/ASSET")
    .replace(/%2F_astro%2F[^"'\s)&]+/g, "%2F_astro%2FASSET")
    .replace(/data-astro-cid-[a-z0-9]+/g, "data-astro-cid-X");

const baseFiles = htmlIn(BASE);
const headFiles = htmlIn(HEAD);
const read = (dir, f) => normalize(fs.readFileSync(path.join(dir, f), "utf8"));

const keyPages = CONFIG.pages.filter((p) => headFiles.has(toFile(p)));
const changed = [...headFiles]
  .filter((f) => baseFiles.has(f) && read(BASE, f) !== read(HEAD, f))
  .map(toPath)
  .filter((p) => !keyPages.includes(p))
  .sort();
const added = [...headFiles]
  .filter((f) => !baseFiles.has(f))
  .map(toPath)
  .sort();
const removed = [...baseFiles]
  .filter((f) => !headFiles.has(f))
  .map(toPath)
  .sort();

const extra = [...changed, ...added].slice(0, CONFIG.maxChangedPages);
const skipped = changed.length + added.length - extra.length;
const pages = [...keyPages, ...extra];

/* ---------------------------- static server ---------------------------- */

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".txt": "text/plain",
  ".xml": "application/xml",
};

function serve(root) {
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (rel.endsWith("/")) rel += "index.html";
    const top = path.resolve(root);
    let file = path.resolve(top, `.${rel}`);
    if (file !== top && !file.startsWith(`${top}${path.sep}`)) {
      res.writeHead(403).end();
      return;
    }
    if (!fs.existsSync(file) && fs.existsSync(`${file}/index.html`)) {
      file = `${file}/index.html`;
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {
      "content-type":
        TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream",
    });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () =>
      resolve({ server, origin: `http://127.0.0.1:${server.address().port}` }),
    ),
  );
}

/* ----------------------------- screenshots ----------------------------- */

const FREEZE_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
  }
`;

async function shoot(context, url) {
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
    await page.addStyleTag({ content: FREEZE_CSS });
    await page.evaluate(async () => {
      for (const img of document.querySelectorAll('img[loading="lazy"]')) {
        img.loading = "eager";
      }
      // Walk down the page so scroll-triggered content runs, then back up.
      const step = window.innerHeight;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 50));
      }
      window.scrollTo(0, 0);
      await document.fonts.ready;
      await Promise.all(
        [...document.images]
          .filter((img) => !img.complete)
          .map(
            (img) =>
              new Promise((done) => {
                img.addEventListener("load", done, { once: true });
                img.addEventListener("error", done, { once: true });
              }),
          ),
      );
    });
    // Lazy images switched to eager start new requests: let them finish,
    // then make sure every image is decoded (a loaded but undecoded image
    // can still paint as an empty box in the screenshot).
    await page.waitForLoadState("networkidle");
    await page.evaluate(() =>
      Promise.all(
        [...document.images].map((img) => img.decode().catch(() => {})),
      ),
    );
    await page
      .waitForFunction(
        () => [...document.images].every((img) => img.complete),
        null,
        { timeout: 15_000 },
      )
      .catch(() => {});
    await page.waitForTimeout(300);
    return PNG.sync.read(await page.screenshot({ fullPage: true }));
  } finally {
    await page.close();
  }
}

/** Copy `img` onto a white canvas of the given size. */
function pad(img, width, height) {
  if (img.width === width && img.height === height) return img;
  const out = new PNG({ width, height });
  out.data.fill(255);
  PNG.bitblt(img, out, 0, 0, img.width, img.height, 0, 0);
  return out;
}

const slug = (page) =>
  page === "/"
    ? "home"
    : page.replace(/^\/|\/$/g, "").replace(/[^a-z0-9]+/gi, "-");

/* --------------------------------- run --------------------------------- */

fs.mkdirSync(OUT, { recursive: true });
const base = await serve(BASE);
const head = await serve(HEAD);
const browser = await chromium.launch();
const results = [];

try {
  for (const width of CONFIG.widths) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    for (const page of pages) {
      const isNew = added.includes(page);
      const headShot = await shoot(context, `${head.origin}${page}`);
      if (isNew) {
        fs.writeFileSync(
          path.join(OUT, `${slug(page)}-${width}-head.png`),
          PNG.sync.write(headShot),
        );
        results.push({ page, width, status: "new" });
        continue;
      }
      const baseShot = await shoot(context, `${base.origin}${page}`);
      const w = Math.max(baseShot.width, headShot.width);
      const h = Math.max(baseShot.height, headShot.height);
      const a = pad(baseShot, w, h);
      const b = pad(headShot, w, h);
      const diff = new PNG({ width: w, height: h });
      const differing = pixelmatch(a.data, b.data, diff.data, w, h, {
        threshold: 0.1,
      });
      const ratio = differing / (w * h);
      const heightChanged = baseShot.height !== headShot.height;
      const isChanged = heightChanged || differing >= CONFIG.minChangedPixels;
      if (isChanged) {
        const name = `${slug(page)}-${width}`;
        fs.writeFileSync(
          path.join(OUT, `${name}-base.png`),
          PNG.sync.write(baseShot),
        );
        fs.writeFileSync(
          path.join(OUT, `${name}-head.png`),
          PNG.sync.write(headShot),
        );
        fs.writeFileSync(
          path.join(OUT, `${name}-diff.png`),
          PNG.sync.write(diff),
        );
      }
      results.push({
        page,
        width,
        status: isChanged ? "changed" : "same",
        ratio,
        differing,
        heights: [baseShot.height, headShot.height],
      });
    }
    await context.close();
  }
} finally {
  await browser.close();
  base.server.close();
  head.server.close();
}

/* -------------------------------- report ------------------------------- */

const cell = (r) => {
  if (!r) return "—";
  if (r.status === "new") return "🆕 New page";
  if (r.status === "same") return "No change";
  const share =
    r.ratio < 0.001 ? "under 0.1%" : `${(r.ratio * 100).toFixed(1)}%`;
  const parts = [
    `**Changed** (${r.differing.toLocaleString("en-US")} px, ${share})`,
  ];
  if (r.heights[0] !== r.heights[1])
    parts.push(`height ${r.heights[0]} → ${r.heights[1]}px`);
  return parts.join(", ");
};

const changedCount = results.filter((r) => r.status !== "same").length;
const header = `| Page | ${CONFIG.widths.map((w) => `${w}px`).join(" | ")} |`;
const rule = `| --- | ${CONFIG.widths.map(() => "---").join(" | ")} |`;
const rows = pages.map(
  (p) =>
    `| \`${p}\` | ${CONFIG.widths
      .map((w) => cell(results.find((r) => r.page === p && r.width === w)))
      .join(" | ")} |`,
);

const report = [
  "<!-- visual-diff -->",
  "### Visual changes",
  "",
  changedCount
    ? `${changedCount === 1 ? "1 screenshot differs" : `${changedCount} screenshots differ`} from the base branch. Open the **visual-diff** artifact on this run for the before, after and diff images (changed pixels in red).`
    : "No visual changes on the pages checked.",
  "",
  header,
  rule,
  ...rows,
  "",
  ...(removed.length
    ? [`Removed pages: ${removed.map((p) => `\`${p}\``).join(", ")}`, ""]
    : []),
  ...(skipped > 0
    ? [
        `${skipped} more changed page${skipped === 1 ? "" : "s"} not shot (limit ${CONFIG.maxChangedPages}).`,
        "",
      ]
    : []),
  "_Key pages are always checked; other pages are checked when their HTML changed._",
  "",
].join("\n");

fs.writeFileSync(path.join(OUT, "report.md"), report);
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`);
}
console.log(report);
