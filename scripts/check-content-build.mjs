#!/usr/bin/env node
/**
 * check-content-build — checks a built Files-mode site against src/content.
 * Run after `npm run build`:
 *
 * - coming-soon case studies: no page, not in the sitemap or llms-full.txt,
 *   and a /case-studies card links to the live URL instead;
 * - every blog post: an absolute og:image and JSON-LD image, a FAQPage node
 *   exactly when the post has FAQs, and every in-page "#id" link (the table
 *   of contents) pointing at an element that exists;
 * - local images that need a plain URL are served resized, not as the
 *   original: the author photo (at most 128px) and project lightbox photos
 *   (at most 1600px; the originals are wider).
 *
 * Generic over whatever is in src/content, so it keeps working after a fork
 * replaces the sample content.
 *
 * Usage: node scripts/check-content-build.mjs [dist/client]
 */
import fs from "node:fs";
import path from "node:path";
import { parse } from "node-html-parser";
import sharp from "sharp";

const DIST = process.argv[2] ?? "dist/client";
const CONTENT = "src/content";
const failures = [];
const fail = (message) => failures.push(message);
const exists = (rel) => fs.existsSync(path.join(DIST, rel));
const read = (rel) => fs.readFileSync(path.join(DIST, rel), "utf8");
const filesIn = (dir, ext) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(ext))
        .sort()
    : [];
/**
 * The pixel width of a built image, by its src. An image it can't read (a
 * remote URL, a path not in DIST, a file sharp can't decode) records a
 * named failure for `what` and returns null, so the caller skips its own
 * size check instead of crashing the run.
 */
const widthOf = async (src, what) => {
  if (/^[a-z][a-z\d+.-]*:/i.test(src)) {
    fail(`${what}: "${src}" is not a local built file, so it is not resized`);
    return null;
  }
  try {
    const file = path.join(DIST, decodeURIComponent(src));
    return (await sharp(file).metadata()).width ?? null;
  } catch (error) {
    fail(`${what}: can't read "${src}" in ${DIST} (${error.message})`);
    return null;
  }
};
const ABSOLUTE = /^https?:\/\//;

/* ── Case studies ── */
const sitemap = fs
  .readdirSync(DIST)
  .filter((f) => /^sitemap-\d+\.xml$/.test(f))
  .map(read)
  .join("\n");
const llmsFull = exists("llms-full.txt") ? read("llms-full.txt") : "";
const studiesIndex = exists("case-studies/index.html")
  ? parse(read("case-studies/index.html"))
  : null;
const studyFiles = filesIn(path.join(CONTENT, "case-studies"), ".json");
for (const file of studyFiles) {
  const slug = file.slice(0, -".json".length);
  const study = JSON.parse(
    fs.readFileSync(path.join(CONTENT, "case-studies", file), "utf8"),
  );
  const page = `case-studies/${slug}/index.html`;
  if (!study.comingSoon) {
    if (!exists(page)) fail(`case study ${slug}: no page was built`);
    continue;
  }
  /* The slug as a whole path segment: "/case-studies/x" or "/case-studies/x/",
     never the start of "/case-studies/x-two". */
  const url = new RegExp(`/case-studies/${slug}(?![\\w-])`);
  if (exists(page)) fail(`coming-soon case study ${slug}: a page was built`);
  if (url.test(sitemap)) fail(`coming-soon case study ${slug}: in the sitemap`);
  if (url.test(llmsFull))
    fail(`coming-soon case study ${slug}: in llms-full.txt`);
  if (!studiesIndex?.querySelector(`a[href="${study.liveUrl}"]`))
    fail(`coming-soon case study ${slug}: no card links to ${study.liveUrl}`);
}

/* ── Blog posts ── */
const postFiles = filesIn(path.join(CONTENT, "blog"), ".mdx");
for (const file of postFiles) {
  const slug = file.slice(0, -".mdx".length);
  const page = `blog/${slug}/index.html`;
  if (!exists(page)) {
    fail(`blog post ${slug}: no page was built`);
    continue;
  }
  const source = fs.readFileSync(path.join(CONTENT, "blog", file), "utf8");
  const frontmatter = source.split(/^---$/m)[1] ?? "";
  const hasFaqs = /^faqs:[ \t]*\n[ \t]+- /m.test(frontmatter);
  const authorId = /^author:\s*"?([a-z0-9-]+)"?/m.exec(frontmatter)?.[1];
  const root = parse(read(page));

  const og =
    root.querySelector('meta[property="og:image"]')?.getAttribute("content") ??
    "";
  if (!ABSOLUTE.test(og))
    fail(`blog post ${slug}: og:image is not absolute ("${og}")`);

  const nodes = root
    .querySelectorAll('script[type="application/ld+json"]')
    .flatMap((script) => {
      const data = JSON.parse(script.text);
      return data["@graph"] ?? [data];
    });
  const posting = nodes.find((node) => node["@type"] === "BlogPosting");
  if (!ABSOLUTE.test(posting?.image ?? ""))
    fail(`blog post ${slug}: the BlogPosting image is not an absolute URL`);
  const hasFaqNode = nodes.some((node) => node["@type"] === "FAQPage");
  if (hasFaqNode !== hasFaqs)
    fail(
      `blog post ${slug}: FAQPage JSON-LD ${hasFaqNode ? "present without FAQs" : "missing although the post has FAQs"}`,
    );

  const ids = new Set(root.querySelectorAll("[id]").map((el) => el.id));
  for (const link of root.querySelectorAll('a[href^="#"]')) {
    const id = decodeURIComponent(link.getAttribute("href").slice(1));
    if (id && !ids.has(id))
      fail(`blog post ${slug}: the link to "#${id}" has no target`);
  }

  const authorFile = path.join(CONTENT, "authors", `${authorId}.json`);
  if (authorId && fs.existsSync(authorFile)) {
    const author = JSON.parse(fs.readFileSync(authorFile, "utf8"));
    if (author.avatar) {
      const src = root
        .querySelector(".blog_post_avatar img")
        ?.getAttribute("src");
      const what = `blog post ${slug}: the author photo`;
      if (!src) fail(`${what} is missing`);
      else {
        const width = await widthOf(src, what);
        if (width !== null && width > 128)
          fail(`${what} is ${width}px wide, not resized`);
      }
    }
  }
}

/* ── Project lightboxes ── */
const projectFiles = filesIn(path.join(CONTENT, "projects"), ".json");
for (const file of projectFiles) {
  const slug = file.slice(0, -".json".length);
  const page = `projects/${slug}/index.html`;
  if (!exists(page)) {
    fail(`project ${slug}: no page was built`);
    continue;
  }
  for (const tile of parse(read(page)).querySelectorAll(
    "[data-lightbox-src]",
  )) {
    const what = `project ${slug}: a lightbox photo`;
    const width = await widthOf(tile.getAttribute("data-lightbox-src"), what);
    if (width !== null && width > 1600)
      fail(`${what} is ${width}px wide, not resized`);
  }
}

if (failures.length) {
  console.error(
    `check-content-build: ${failures.length} problem(s)\n${failures.map((f) => `  - ${f}`).join("\n")}`,
  );
  process.exit(1);
}
console.log(
  `check-content-build: ok (${postFiles.length} posts, ${studyFiles.length} case studies, ${projectFiles.length} projects)`,
);
