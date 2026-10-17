# PR 2 — Introduce the content interface (Sanity-backed): implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every page, template, section and component onto one content
module, `src/lib/content`, backed by the existing Sanity code, without
changing the rendered output of the public build.

**Architecture:** `src/lib/content/` holds named view-model types, the
`ContentSource` interface, image helpers and a one-line `source.ts` that
selects the backend. The Sanity implementation
(`src/sanity/lib/source.ts`, declared `satisfies ContentSource`) composes
the GROQ loaders in `page-data.ts` with new mappers in
`src/sanity/lib/map/`. Those mappers are the only code that touches
`urlFor`, `hotspotPosition`, `stegaClean`, Portable Text serialisation and
the TypeGen types. Parity is proven by building the site twice, once empty
(the placeholder project id) and once from GROQ-shaped fixtures served
through `loadQuery`. Both builds run before the refactor and again after
every task, and the outputs are diffed.

**Tech Stack:** Astro 7 (static output, Cloudflare adapter), Sanity v6 /
`@sanity/client` 7, `@sanity/image-url` 2, astro-portabletext 0.13,
TypeScript 5.9, node-html-parser (an existing devDependency).

**Spec:** [docs/superpowers/specs/2026-10-16-files-first-content-design.md](../specs/2026-10-16-files-first-content-design.md) — "The content interface" and "Delivery" item 2.

## Global Constraints

- **Pure refactor.** The public build's HTML, XML and TXT output stays
  identical once asset hashes are normalised. The only allowed output
  changes are the ones this plan names: the Task 1 pre-baseline fixes
  (captured into the baseline), the two dev-only `/components` sentences in
  Tasks 4 and 5 (re-baselined), and the FAQ-answer serialiser in Task 6
  (DOM-identical, then re-baselined).
- **The boundary.** After this PR, no file under `src/` outside the Task 9
  allow list imports `@/sanity/*`, `@sanity/*`, `sanity`, `sanity:*`,
  `astro-portabletext`, or a relative path into `src/sanity`. That rules out
  `urlFor`, `hotspotPosition`, `stegaClean`, `@/sanity/sanity.types`, the
  loaders and the queries in consumers.
- Modules under `src/sanity/` import `@/lib/content/types` and
  `@/lib/content/images`. They never import the `@/lib/content` index,
  because the index imports the Sanity source, so that would be a cycle. The
  same rule applies to `src/lib/projects.ts`, which the Sanity mappers import.
- `src/lib/content/source.ts` is a header comment plus exactly one
  re-export line.
- Every content function takes an optional trailing
  `opts?: ContentOptions` (`{ perspectiveCookie? }`). Only the three
  `/preview/*` twins pass it (`getDraftModeProps(Astro)`). Public routes,
  sections, endpoints and `components.astro` call without it.
- **Stega policy** (written into the `src/sanity/lib/source.ts` header in
  Task 2). The mappers apply `stegaClean` to these values:
  - slugs, URLs and hrefs
  - enums and categories
  - dates, numbers and booleans
  - image sources and alt text
  - CSS-ish values: aspect ratios, spacing, max widths, object-fit
  - SEO fields and derived text (FAQ answer text, read time, Markdown, the
    project write-up's plain text)
  - every string the mapper trims (trimming corrupts the invisible payload)
  - every field of a CTA section

  Visible display strings stay encoded: titles, descriptions, names,
  captions, quotes, labels and rich text.

- Listing functions follow the existing placeholder policy: on the
  placeholder project id they warn and return empty, and on a real project
  they throw. Callers that used to swallow errors keep their `.catch`:
  `CaseStudyFeatured`, `SingleTestimonial`, `TestimonialShowcase`,
  `components.astro` and both `llms*.txt` routes.
- CLAUDE.md conventions apply to every touched component:
  - a `docs` prop with JSDoc
  - named prop types
  - prop order: `docs`, `render`, content, variant, settings, then `class`
    and `...rest`
  - no stray `<` or `>` in frontmatter comments
  - `npm run check:hover` passes
- **Do not edit any query string in `src/sanity/lib/queries.ts`.** The
  fixtures key on them, and the TypeGen types must stay valid. Edits to
  comments in that file are fine.
- **Renames:** grep the old name before finishing (the CLAUDE.md rule). The
  names this PR removes are `SanityPhoto`, `sanityPhoto`, `toProjectCards`,
  `photoUrl`, `SanityCtaSection` and `src/sanity/lib/testimonials.ts`.
- **Per-task gate:** `npm run check` (0 errors), `npm run check:hover`, and
  both parity comparisons green. Task 10 adds `format`, `format:check`,
  `check:config` and `check:boundary`.
- **Commits:** end the message with a blank line, then
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Don't push.

## Review Focus

1. **Draft data on `/preview/*` is stega-encoded.** A logic value left
   encoded breaks a URL, a CSS class, a GROQ param or a comparison, and only
   inside Presentation. Expected: hrefs, srcs, classes, styles, ids and
   search data-attributes on the preview-rendered pages carry no invisible
   characters. Pinned by Task 9's `PARITY_FIXTURES=preview` build and
   `scripts/check-stega-leaks.mjs`.
2. **Half-filled drafts.** Examples: an image with no asset yet, a missing
   title, a CTA without its image. Several call sites used to throw inside
   `urlFor`. Expected: the preview page renders without the missing piece.
   Pinned by the incomplete documents in Task 9's preview fixtures.
3. **Testimonial lookup by name in draft mode.** `getTestimonialByName`
   compares an encoded name. Expected: `<SingleTestimonial name="Jane Doe">`
   still renders. Pinned in Task 9 (the stega leak check asserts it).
4. **Preview twins lose the draft perspective.** If `opts` stops being
   forwarded, Presentation silently shows published content. Expected: each
   `/preview/*` route passes `getDraftModeProps(Astro)`. Pinned by Task 9's
   grep.
5. **A real project whose dataset is unreachable at build.** Expected: the
   build fails loudly, not a deploy with empty content pages. Pinned by
   Task 9's unreachable-project build.

## Parity procedure (every task runs this)

The baselines live in `.parity/` (git-ignored, local only), and Task 1
captures them:

- `.parity/empty` is the normal build. The project id is the placeholder,
  so there is no CMS content.
- `.parity/fixtures` is the same build with `PARITY_FIXTURES=1`. Every
  query is answered from `src/sanity/lib/fixtures/`.

Both builds set `KEEP_DEV_PAGES=1`, so the dev-only `/components` demo page
stays in `dist/client` and gets compared too.

The gate after each task:

```bash
KEEP_DEV_PAGES=1 npm run build && node scripts/compare-dist.mjs .parity/empty dist/client
KEEP_DEV_PAGES=1 PARITY_FIXTURES=1 npm run build && node scripts/compare-dist.mjs .parity/fixtures dist/client
```

Expected: `Identical: <n> files.` from both comparisons.

**If `.parity/` is lost** (for example, in a fresh worktree), recapture it
from Task 1's commit:

```bash
git worktree add ../pr2-baseline <task-1-sha>
cd ../pr2-baseline && npm ci
```

Then run Task 1 Step 9 there and copy the directories back.

## File map

**Create:**

- `scripts/compare-dist.mjs`: diffs two builds. Strict mode, or DOM-level
  with `--canonical`.
- `scripts/check-content-boundary.mjs`: the import guard, run as
  `npm run check:boundary`.
- `scripts/check-stega-leaks.mjs`: the preview-fixture leak check.
- `src/sanity/lib/fixtures/data.ts` and `index.ts`: GROQ-shaped parity
  fixtures.
- `src/lib/content/types.ts`: view models and `ContentSource`.
- `src/lib/content/images.ts`: `imageSrc`, `imageUrl`, `sizedImage`.
- `src/lib/content/source.ts`: the one-line backend selector.
- `src/lib/content/index.ts`: the public API.
- `src/sanity/lib/source.ts`: the Sanity implementation.
- `src/sanity/lib/map/image.ts`, `cta.ts`, `testimonials.ts`,
  `projects.ts`, `case-studies.ts`, `seo.ts` and `blog.ts`: the mappers.
- `src/components/blog/BlogBody.astro`: renders a post body.

**Rename:** `src/components/sections/SanityCtaSection.astro` becomes
`ContentCtaSection.astro`.

**Delete:** `src/sanity/lib/testimonials.ts`.

**Modify:**

- **Fetching and helpers:**
  - `src/sanity/lib/load-query.ts`
  - `src/sanity/lib/page-data.ts`
  - `src/sanity/lib/portable-text.ts`
  - `src/sanity/lib/queries.ts` (one comment)
  - `src/lib/projects.ts`
  - `src/lib/jsonld.ts`
  - `src/lib/read-time.ts`
  - `src/lib/toc.ts` (comment)
- **Templates:** all three in `src/components/templates/*`.
- **Sections:** `BlogPostGrid`, `CaseStudyFeatured`, `SingleTestimonial`,
  `TestimonialShowcase`, `TestimonialsGrid` and `TestimonialsSlider`.
- **UI:** `BlogCard` (docs only), `CaseStudyCard`, `TestimonialCard`,
  `ProjectCard`, `ProjectBrowser` and `GalleryBrowser`.
- **Blog and Portable Text components:** `src/components/blog/BlogCta.astro`
  and `src/components/portabletext/BlogCtaInline.astro`.
- **Routes:** every file under `src/pages/{blog,case-studies,projects,preview}/**`,
  plus `src/pages/{gallery,components}.astro` and
  `src/pages/llms{,-full}.txt.ts`.
- **Config:** `astro.config.mjs`, `package.json`, `.gitignore`,
  `.prettierignore`, `.github/workflows/ci.yml`.
- **Docs:** `README.md`, `CLAUDE.md`, and the skills `sanity-and-preview`,
  `component-api` (SKILL.md plus `references/layout-and-content.md` and
  `references/local-service.md`), `seo-discoverability` and
  `setup/references/no-cms.md`.

**Unchanged on purpose:**

- `scripts/check-schema.mjs`: a Sanity-only script outside `src/`. It moves
  with the add-on in PR 4.
- `src/data/case-studies.ts` and `CaseStudyGrid`: local samples. PR 3
  deletes them.
- `src/sanity/lib/internal-links.ts`, `resolve.ts`, `draft-mode.ts` and
  `image.ts`.

---

### Task 1: Parity harness, fixtures and baseline

**Files:**

- Create: `scripts/compare-dist.mjs`, `src/sanity/lib/fixtures/data.ts`,
  `src/sanity/lib/fixtures/index.ts`
- Modify:
  - `src/sanity/lib/load-query.ts`: add the fixture hook.
  - `astro.config.mjs` (l.47-62): `excludeDevOnlyPages` honours
    `KEEP_DEV_PAGES`.
  - `.gitignore` and `.prettierignore`: add `.parity/`.
  - `src/sanity/lib/portable-text.ts`: add `portableTextToPlainText`.
  - `src/lib/jsonld.ts` (l.~316-331): FAQ answer text, a pre-baseline fix.
  - `src/components/sections/TestimonialsGrid.astro` (l.187) and
    `TestimonialsSlider.astro` (l.219): pass explicit props, a pre-baseline
    fix.

**Interfaces:**

- Consumes: nothing.
- Produces:
  - `node scripts/compare-dist.mjs <baselineDir> <candidateDir> [--canonical]`.
    It exits 1 on any difference.
  - `fixtureFetch(query: string, params: Record<string, unknown> | undefined, mode: string): Promise<{ result: unknown; resultSourceMap: undefined }>`,
    exported from `src/sanity/lib/fixtures/index.ts`. It accepts mode
    `"1"`; Task 9 adds `"preview"`.
  - `portableTextToPlainText(blocks: readonly unknown[] | null | undefined): string`,
    from `src/sanity/lib/portable-text.ts`.
  - Env flags: `PARITY_FIXTURES=1` and `KEEP_DEV_PAGES=1`.

**Why two pre-baseline fixes.** The view models make two current behaviours
unrepresentable, so both are fixed before the baseline is captured:

1. `blogPostJsonLd` runs `String()` on a Portable Text array. Every FAQ
   answer in the JSON-LD is therefore `"[object Object]"`.
2. `TestimonialsGrid` and `TestimonialsSlider` spread the whole testimonial
   object onto `<TestimonialCard>`. Every data field (`_id`, `website`,
   `featured`, `sortOrder`) then leaks into the card's `...rest` and renders
   as an HTML attribute on its `<div>`.

- [ ] **Step 1: Confirm the branch is green before touching anything**

Run: `npm run check && npm run build 2>&1 | tail -3`

Expected: `0 errors`, and the build completes. If either fails, stop and
report: the failure predates this PR.

- [ ] **Step 2: Write `scripts/compare-dist.mjs`**

```js
#!/usr/bin/env node
/**
 * compare-dist — parity check between two builds of the site.
 *
 * Refactors that must not change rendered output copy `dist/client` aside
 * before the change, rebuild after it, and compare:
 *
 *   node scripts/compare-dist.mjs .parity/empty dist/client
 *   node scripts/compare-dist.mjs .parity/fixtures dist/client --canonical
 *
 * Compares every .html / .xml / .txt file plus `_headers` and `_redirects`
 * (the `_astro/` asset folder is skipped). Hashed asset names
 * (`/_astro/name.HASH.ext`, plain or URL-encoded) and `data-astro-cid-*`
 * hashes are normalised first: they change whenever the module graph
 * changes, without changing what renders.
 *
 * `--canonical` compares HTML as a DOM instead of bytes: attributes sorted,
 * entities decoded, whitespace runs collapsed, whitespace-only text nodes
 * dropped. Use it where the same markup legitimately arrives through a
 * different serializer (an Astro component versus an HTML string).
 *
 * Exits 1 on any difference and prints a window around the first
 * difference in each file. Zero dependencies beyond node-html-parser, which
 * check-schema.mjs already uses.
 */
import fs from "node:fs";
import path from "node:path";
import { parse } from "node-html-parser";

const [baseDir, candDir, ...flags] = process.argv.slice(2);
if (!baseDir || !candDir) {
  console.error(
    "Usage: node scripts/compare-dist.mjs <baseline-dir> <candidate-dir> [--canonical]",
  );
  process.exit(2);
}
const canonical = flags.includes("--canonical");

const TEXT_EXT = new Set([".html", ".xml", ".txt"]);
const TEXT_NAMES = new Set(["_headers", "_redirects"]);
const PARSE_OPTIONS = {
  comment: false,
  blockTextElements: { script: true, style: true, pre: true, noscript: true },
};

function list(dir) {
  const out = [];
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "_astro") walk(full);
        continue;
      }
      if (TEXT_EXT.has(path.extname(entry.name)) || TEXT_NAMES.has(entry.name))
        out.push(path.relative(dir, full));
    }
  };
  walk(dir);
  return out.sort();
}

function normalize(text) {
  return text
    .replace(/\/_astro\/[^"'\s)&?#,]+/g, "/_astro/ASSET")
    .replace(/%2F_astro%2F[^"'\s)&]+/g, "%2F_astro%2FASSET")
    .replace(/data-astro-cid-[a-z0-9]+/g, "data-astro-cid-X");
}

/** Serialize a parsed node as a canonical DOM string (one tag per line). */
function canon(node) {
  if (node.nodeType === 3) {
    const text = node.text.replace(/\s+/g, " ");
    return text.trim() ? text : "";
  }
  if (node.nodeType !== 1) return "";
  const inner = node.childNodes.map(canon).join("");
  if (!node.rawTagName) return inner;
  const tag = node.rawTagName.toLowerCase();
  const attrs = Object.entries(node.attributes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => ` ${k}="${v}"`)
    .join("");
  return `<${tag}${attrs}>\n${inner}</${tag}>\n`;
}

const base = list(baseDir);
const cand = list(candDir);
const candSet = new Set(cand);
const baseSet = new Set(base);
let failures = 0;

for (const file of base.filter((f) => !candSet.has(f))) {
  console.log(`MISSING  ${file}`);
  failures++;
}
for (const file of cand.filter((f) => !baseSet.has(f))) {
  console.log(`EXTRA    ${file}`);
  failures++;
}
for (const file of base.filter((f) => candSet.has(f))) {
  let a = normalize(fs.readFileSync(path.join(baseDir, file), "utf8"));
  let b = normalize(fs.readFileSync(path.join(candDir, file), "utf8"));
  if (canonical && file.endsWith(".html")) {
    a = canon(parse(a, PARSE_OPTIONS));
    b = canon(parse(b, PARSE_OPTIONS));
  }
  if (a === b) continue;
  failures++;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  const from = Math.max(0, i - 120);
  console.log(
    `DIFF     ${file} @ char ${i}\n  - …${a.slice(from, i + 160)}\n  + …${b.slice(from, i + 160)}\n`,
  );
}

console.log(
  failures
    ? `\n${failures} difference(s) across ${base.length} baseline files.`
    : `Identical: ${base.length} files.`,
);
process.exit(failures ? 1 : 0);
```

- [ ] **Step 3: Prove the comparator catches a difference**

Run:

```bash
mkdir -p .parity && npm run build >/dev/null && rm -rf .parity/selftest && cp -R dist/client .parity/selftest
node scripts/compare-dist.mjs .parity/selftest dist/client; echo "exit=$?"
echo "tampered" >> .parity/selftest/robots.txt
node scripts/compare-dist.mjs .parity/selftest dist/client; echo "exit=$?"
rm -rf .parity/selftest
```

Expected: the first run prints `Identical: … files.` and `exit=0`. The
second prints `DIFF     robots.txt @ char …` and `exit=1`.

- [ ] **Step 4: Keep the dev-only pages in parity builds; ignore `.parity/`**

In `astro.config.mjs`, change the `astro:build:done` hook of
`excludeDevOnlyPages()` so it returns early:

```js
      "astro:build:done": async ({ dir, logger }) => {
        // Parity builds (scripts/compare-dist.mjs) keep the dev-only demo
        // pages so /components is compared too. Never set in production.
        if (process.env.KEEP_DEV_PAGES === "1") {
          logger.info("KEEP_DEV_PAGES=1 — dev-only pages left in the build.");
          return;
        }
        const root = fileURLToPath(dir);
```

The rest of the hook is unchanged. Append this to `.gitignore`:

```
# Local parity baselines (scripts/compare-dist.mjs) — never commit
.parity/
```

Append `.parity/` to `.prettierignore` under the "Build output and caches"
block.

- [ ] **Step 5: Write `src/sanity/lib/fixtures/data.ts`**

```ts
/**
 * Parity fixture documents — small, hand-written, and shaped like the GROQ
 * PROJECTIONS in ../queries.ts (not like the schema). Every branch the
 * templates render appears at least once: each Portable Text node type,
 * each case-study block type (plus the empty ones the mapper drops),
 * overrides versus site defaults, missing optional fields, and images with
 * and without a hotspot. Keep keys and values deterministic — the parity
 * check compares two builds byte for byte.
 */

/** Fixtures mirror projections, so they are typed loosely on purpose. */
export type Doc = Record<string, any>;

let assetCount = 0;
/** A projected Sanity image. The asset ref encodes the intrinsic size, as real refs do. */
function img(
  width: number,
  height: number,
  hotspot?: { x: number; y: number },
): Doc {
  assetCount += 1;
  const id = `fixture${String(assetCount).padStart(2, "0")}`;
  return {
    _type: "image",
    asset: { _ref: `image-${id}-${width}x${height}-jpg`, _type: "reference" },
    ...(hotspot
      ? {
          hotspot: { x: hotspot.x, y: hotspot.y, width: 1, height: 1 },
          crop: { top: 0, bottom: 0, left: 0, right: 0 },
        }
      : {}),
  };
}

/** `asset->metadata{ dimensions, lqip }` for an image of this size. */
function meta(width: number, height: number): Doc {
  return { dimensions: { width, height }, lqip: null };
}

let keyCount = 0;
const key = () => `fx${++keyCount}`;
function span(text: string, marks: string[] = []): Doc {
  return { _type: "span", _key: key(), text, marks };
}
function block(children: Doc[], extra: Doc = {}): Doc {
  return {
    _type: "block",
    _key: key(),
    style: "normal",
    markDefs: [],
    children,
    ...extra,
  };
}
const para = (text: string) => block([span(text)]);
const heading = (style: "h2" | "h3" | "h4", text: string) =>
  block([span(text)], { style });

/* ── Shared documents ──────────────────────────────────────────────────── */

const JANE = { name: "Jane Doe", avatar: img(200, 200) };
const JOHN = { name: "John Roe", avatar: null };

const POST_ONE_IMAGE = img(1600, 900);
const CS_ONE_IMAGE = img(1600, 1000, { x: 0.4, y: 0.5 });
const KITCHEN_HERO = img(1600, 1067, { x: 0.5, y: 0.4 });

const BLOG_CTA_PORTRAIT = {
  _id: "blogCta-portrait",
  heading: "Fixture blog CTA",
  body: "A short call to action.",
  image: img(800, 1067),
  imageAlt: "Blog CTA image",
  aspectRatio: "portrait",
  linkUrl: "/contact",
  linkLabel: "Talk to us",
};
const BLOG_CTA_LANDSCAPE = {
  _id: "blogCta-landscape",
  heading: "Landscape CTA",
  body: "An override with no link label.",
  image: img(800, 533, { x: 0.6, y: 0.5 }),
  imageAlt: "",
  aspectRatio: "landscape",
  linkUrl: "/services",
  linkLabel: null,
};
const CTA_SECTION_DEFAULT = {
  _id: "ctaSection-default",
  heading: "Default CTA heading",
  text: "Default CTA text.",
  primaryButtonLabel: "Get started",
  primaryButtonHref: "/contact",
  secondaryButtonLabel: "See services",
  secondaryButtonHref: "/services",
  backgroundImage: img(1920, 1080, { x: 0.3, y: 0.6 }),
  imageAlt: "CTA background",
  overlayStrength: 60,
};
const CTA_SECTION_OVERRIDE = {
  _id: "ctaSection-override",
  heading: "Override CTA heading",
  text: "Override CTA text.",
  primaryButtonLabel: "Book a call",
  primaryButtonHref: "/contact",
  secondaryButtonLabel: null,
  secondaryButtonHref: null,
  backgroundImage: img(1920, 1080),
  imageAlt: "",
  overlayStrength: null,
};

export const SETTINGS: Doc = {
  defaultBlogCta: BLOG_CTA_PORTRAIT,
  defaultCtaSection: CTA_SECTION_DEFAULT,
};

/* ── Blog posts (author is dereferenced: { name, avatar }) ─────────────── */

export const POSTS: Doc[] = [
  {
    title: "Fixture Post One",
    slug: "fixture-post-one",
    description: "The fixture post that exercises every body node.",
    categories: ["Guides", "News"],
    primaryCategory: "Guides",
    image: POST_ONE_IMAGE,
    imageAlt: "Fixture post one hero",
    author: JANE,
    video: null,
    date: "2026-03-01",
    _updatedAt: "2026-03-02T10:00:00Z",
    featured: true,
    body: [
      heading("h2", "Getting started"),
      block(
        [
          span("Plain, "),
          span("bold", ["strong"]),
          span(" and "),
          span("italic", ["em"]),
          span(" text with "),
          span("an external link", ["ext"]),
          span(" and "),
          span("an internal link", ["int"]),
          span("."),
        ],
        {
          markDefs: [
            {
              _type: "link",
              _key: "ext",
              href: "https://example.com",
              newTab: true,
            },
            {
              _type: "internalLink",
              _key: "int",
              target: {
                _type: "caseStudy",
                slug: "case-study-one",
                title: "Case Study One",
                description: "First fixture case study.",
                image: CS_ONE_IMAGE,
              },
            },
          ],
        },
      ),
      block([span("First bullet")], { listItem: "bullet", level: 1 }),
      block([span("Second bullet")], { listItem: "bullet", level: 1 }),
      block([span("Numbered item")], { listItem: "number", level: 1 }),
      block([span("A quoted line")], { style: "blockquote" }),
      heading("h3", "A smaller heading"),
      {
        _type: "code",
        _key: key(),
        code: "const answer = 42;",
        language: "javascript",
        filename: "answer.js",
      },
      {
        _type: "image",
        _key: key(),
        asset: { _ref: "image-fixtureinline-1200x800-jpg", _type: "reference" },
        alt: "Inline body image",
        caption: "An inline caption",
      },
      {
        _type: "videoEmbed",
        _key: key(),
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        caption: "Demo video",
      },
      {
        _type: "callout",
        _key: key(),
        type: "warning",
        body: [para("Mind the gap.")],
      },
      { _type: "blogCtaInline", _key: key(), cta: BLOG_CTA_LANDSCAPE },
      heading("h2", "Getting started"),
      para("A duplicate heading above, so the TOC falls back to section-key."),
    ],
    ctaOverride: null,
    ctaSectionOverride: null,
    faqs: [
      {
        question: "What is a parity fixture?",
        answer: [
          block(
            [
              span("Sample content for "),
              span("parity checks", ["faqlink"]),
              span("."),
            ],
            {
              markDefs: [
                {
                  _type: "link",
                  _key: "faqlink",
                  href: "https://example.com/parity",
                },
              ],
            },
          ),
        ],
      },
      {
        question: "Does an answer keep two paragraphs?",
        answer: [para("Yes, the first one."), para("And the second one.")],
      },
    ],
    relatedSlugs: ["fixture-post-three"],
    seo: {
      metaTitle: "Fixture One SEO title",
      metaDescription: "SEO description for post one.",
      ogTitle: null,
      ogDescription: null,
      ogImage: img(1200, 630),
    },
  },
  {
    title: "Fixture Post Two",
    slug: "fixture-post-two",
    description: "A video post with CTA overrides.",
    categories: ["Guides"],
    primaryCategory: null,
    image: img(1600, 900, { x: 0.2, y: 0.3 }),
    imageAlt: "",
    author: JOHN,
    video: "https://youtu.be/xyz789AbCd",
    date: "2026-02-01",
    _updatedAt: "2026-02-01T09:00:00Z",
    featured: false,
    body: [
      block(
        [span("Read about the "), span("kitchen project", ["proj"]), span(".")],
        {
          markDefs: [
            {
              _type: "internalLink",
              _key: "proj",
              newTab: true,
              target: {
                _type: "project",
                slug: "fixture-kitchen",
                title: "Fixture kitchen remodel",
                description: null,
                image: KITCHEN_HERO,
              },
            },
          ],
        },
      ),
    ],
    ctaOverride: BLOG_CTA_LANDSCAPE,
    ctaSectionOverride: CTA_SECTION_OVERRIDE,
    faqs: null,
    relatedSlugs: [],
    seo: null,
  },
  {
    title: "Fixture Post Three",
    slug: "fixture-post-three",
    description: null,
    categories: ["Insights", "News"],
    primaryCategory: "Insights",
    image: img(1600, 900),
    imageAlt: "Fixture post three hero",
    author: JANE,
    video: null,
    date: "2026-01-15",
    _updatedAt: "2026-01-20T08:30:00Z",
    featured: true,
    body: [
      para("A short post."),
      block([span("Back to "), span("post one", ["back"])], {
        markDefs: [
          {
            _type: "internalLink",
            _key: "back",
            target: {
              _type: "blogPost",
              slug: "fixture-post-one",
              title: "Fixture Post One",
              description: "The fixture post that exercises every body node.",
              image: POST_ONE_IMAGE,
            },
          },
        ],
      }),
      block([span("A dangling link", ["gone"])], {
        markDefs: [{ _type: "internalLink", _key: "gone", target: null }],
      }),
    ],
    ctaOverride: null,
    ctaSectionOverride: null,
    faqs: [],
    relatedSlugs: ["fixture-post-one"],
    seo: {
      metaTitle: null,
      metaDescription: null,
      ogTitle: "OG title three",
      ogDescription: "OG description three",
      ogImage: null,
    },
  },
];

/* ── Case studies ──────────────────────────────────────────────────────── */

const CASE_STUDY_ONE_BLOCKS: Doc[] = [
  {
    _type: "richText",
    _key: key(),
    sectionSpacing: "small",
    maxWidth: "60ch",
    body: [
      heading("h2", "The challenge"),
      para("Rich text body."),
      block([span("See the "), span("first post", ["cslink"])], {
        markDefs: [
          {
            _type: "internalLink",
            _key: "cslink",
            target: { _type: "blogPost", slug: "fixture-post-one" },
          },
        ],
      }),
    ],
  },
  {
    _type: "richTextLeft",
    _key: key(),
    sectionSpacingTop: "none",
    sectionSpacingBottom: "large",
    body: [para("Left-aligned text.")],
  },
  {
    _type: "richTextColumns",
    _key: key(),
    body: [para("Column one."), para("Column two.")],
  },
  {
    _type: "richTextWithImage",
    _key: key(),
    body: [para("Text beside an image.")],
    image: img(1200, 900, { x: 0.5, y: 0.2 }),
    imageAlt: "Beside the text",
    aspectRatio: "square",
    transparent: true,
    objectFit: "contain",
  },
  {
    _type: "fullWidthImage",
    _key: key(),
    image: img(2400, 1000),
    imageAlt: "Full-width image",
    customAspectRatio: "21 / 9",
  },
  { _type: "fullWidthImage", _key: key(), image: null, imageAlt: "" },
  {
    _type: "imageGrid",
    _key: key(),
    aspectRatio: "auto",
    defaultAlt: "Grid default alt",
    images: [
      { ...img(800, 600), alt: "Grid one", transparent: false },
      {
        ...img(800, 600, { x: 0.1, y: 0.9 }),
        alt: "Grid default alt",
        transparent: true,
      },
    ],
  },
  { _type: "imageGrid", _key: key(), images: [] },
  {
    _type: "stats",
    _key: key(),
    items: [
      { value: "40%", label: "Faster launches" },
      { value: null, label: "Pending stat" },
    ],
  },
];

export const CASE_STUDIES: Doc[] = [
  {
    title: "Case Study One",
    slug: "case-study-one",
    description: "First fixture case study.",
    client: "Northwind",
    categories: ["Branding", "Web"],
    industries: ["Logistics"],
    image: CS_ONE_IMAGE,
    imageAlt: "Case study one hero",
    date: "2026-04-01",
    _updatedAt: "2026-04-03T12:00:00Z",
    featured: true,
    comingSoon: false,
    timeline: "6 weeks",
    liveUrl: "https://northwind.example.com",
    galleryImagesAlt: "Gallery fallback alt",
    galleryImages: [
      { ...img(1400, 900), alt: "Gallery one" },
      { ...img(1400, 900, { x: 0.2, y: 0.8 }), alt: "" },
    ],
    content: CASE_STUDY_ONE_BLOCKS,
    ctaSectionOverride: CTA_SECTION_OVERRIDE,
    seo: {
      metaTitle: "Case One SEO",
      metaDescription: null,
      ogTitle: null,
      ogDescription: null,
      ogImage: null,
    },
  },
  {
    title: "Case Study Two",
    slug: "case-study-two",
    description: "Second fixture case study.",
    client: "Harbor Health",
    categories: ["Web"],
    industries: ["Healthcare"],
    image: img(1600, 1000),
    imageAlt: "",
    date: "2026-03-01",
    _updatedAt: "2026-03-01T12:00:00Z",
    featured: false,
    comingSoon: false,
    timeline: null,
    liveUrl: null,
    galleryImagesAlt: null,
    galleryImages: null,
    content: null,
    ctaSectionOverride: null,
    seo: null,
  },
  {
    title: "Case Study Three",
    slug: "case-study-three",
    description: null,
    client: "Initech",
    categories: ["Branding"],
    industries: ["Finance", "Logistics"],
    image: img(1600, 1000),
    imageAlt: "Case study three hero",
    date: "2026-02-01",
    _updatedAt: "2026-02-02T12:00:00Z",
    featured: true,
    comingSoon: false,
    timeline: "3 months",
    liveUrl: null,
    galleryImagesAlt: null,
    galleryImages: [],
    content: [{ _type: "richText", _key: key(), body: [para("One block.")] }],
    ctaSectionOverride: null,
    seo: null,
  },
  {
    title: "Case Study Coming",
    slug: "case-study-coming",
    description: "Not published yet.",
    client: "Globex",
    categories: ["Web"],
    industries: ["Retail"],
    image: img(1600, 1000),
    imageAlt: "Coming soon",
    date: "2026-05-01",
    _updatedAt: "2026-05-01T12:00:00Z",
    featured: false,
    comingSoon: true,
    timeline: null,
    liveUrl: "https://globex.example.com",
    galleryImagesAlt: null,
    galleryImages: null,
    content: null,
    ctaSectionOverride: null,
    seo: null,
  },
];

/* ── Projects (stored in PROJECTS_QUERY order: completed, newest first) ── */

export const PROJECTS: Doc[] = [
  {
    _id: "project-kitchen",
    _updatedAt: "2026-05-02T12:00:00Z",
    title: "Fixture kitchen remodel",
    slug: "fixture-kitchen",
    category: "remodel",
    location: "Springfield, IL",
    service: "Kitchen remodeling",
    completed: "2026-05-01",
    featured: true,
    heroImage: KITCHEN_HERO,
    imageAlt: "The finished kitchen",
    heroImageMeta: meta(1600, 1067),
    photos: [
      {
        _key: key(),
        ...img(1200, 800),
        label: "Before",
        alt: "Kitchen before",
        meta: meta(1200, 800),
      },
      {
        _key: key(),
        ...img(1200, 900, { x: 0.3, y: 0.7 }),
        label: "After",
        alt: "",
        meta: meta(1200, 900),
      },
      {
        _key: key(),
        ...img(1000, 1000),
        label: null,
        alt: "Cabinet detail",
        meta: null,
      },
    ],
    description: [
      para("We rebuilt the kitchen around the island."),
      block([span("A second paragraph with "), span("emphasis", ["em"])]),
    ],
    quote: { text: "Love the new kitchen.", name: "Pat Client" },
    seoDescription: null,
  },
  {
    _id: "project-office",
    _updatedAt: "2026-03-11T12:00:00Z",
    title: "Fixture office refresh",
    slug: "fixture-office",
    category: "commercial",
    location: null,
    service: null,
    completed: "2026-03-10",
    featured: true,
    heroImage: img(1600, 900),
    imageAlt: "",
    heroImageMeta: meta(1600, 900),
    photos: null,
    description: null,
    quote: null,
    seoDescription: "A quick office refresh.",
  },
  {
    _id: "project-porch",
    _updatedAt: "2025-11-21T12:00:00Z",
    title: "Fixture porch repair",
    slug: "fixture-porch",
    category: "repair",
    location: "Decatur, IL",
    service: "Carpentry",
    completed: "2025-11-20",
    featured: false,
    heroImage: img(1600, 1200),
    imageAlt: "Repaired porch",
    heroImageMeta: null,
    photos: [
      {
        _key: key(),
        ...img(1200, 800),
        label: "During",
        alt: "Porch during repair",
        meta: meta(1200, 800),
      },
    ],
    description: [para("New railings and steps.")],
    quote: { text: "Solid work.", name: null },
    seoDescription: null,
  },
];

/* ── Gallery (stored in GALLERY_QUERY order: added, newest first) ────── */

export const GALLERY: Doc[] = [
  {
    _id: "gallery-1",
    image: img(1800, 1200, { x: 0.5, y: 0.5 }),
    imageAlt: "Island under pendant lights",
    imageMeta: meta(1800, 1200),
    caption: "New island lighting",
    category: "remodel",
    location: "Springfield, IL",
    added: "2026-05-02",
    project: { title: "Fixture kitchen remodel", slug: "fixture-kitchen" },
  },
  {
    _id: "gallery-2",
    image: img(1200, 1200),
    imageAlt: "",
    imageMeta: meta(1200, 1200),
    caption: "Storefront signage",
    category: "commercial",
    location: null,
    added: "2026-03-11",
    project: null,
  },
  {
    _id: "gallery-3",
    image: img(1600, 1000),
    imageAlt: "",
    imageMeta: null,
    caption: null,
    category: "repair",
    location: "Decatur, IL",
    added: "2025-11-21",
    project: { title: null, slug: null },
  },
  {
    _id: "gallery-4",
    image: null,
    imageAlt: "",
    imageMeta: null,
    caption: "No image yet",
    category: "repair",
    location: null,
    added: "2025-10-01",
    project: null,
  },
];

/* ── Testimonials (stored in sortOrder) ────────────────────────────────── */

export const TESTIMONIALS: Doc[] = [
  {
    _id: "testimonial-jane",
    name: "Jane Doe",
    role: "CEO",
    company: "Acme",
    quote: "They shipped in half the time we budgeted.",
    avatar: img(256, 256, { x: 0.5, y: 0.3 }),
    website: "https://acme.example.com",
    stars: 5,
    featured: true,
    sortOrder: 1,
  },
  {
    _id: "testimonial-john",
    name: "John Roe",
    role: "CTO",
    company: null,
    quote: "The design system paid for itself.",
    avatar: null,
    website: null,
    stars: 4,
    featured: true,
    sortOrder: 2,
  },
  {
    _id: "testimonial-ada",
    name: "Ada Chen",
    role: null,
    company: "Initech",
    quote: "Clear communication the whole way through.",
    avatar: img(256, 256),
    website: null,
    stars: null,
    featured: false,
    sortOrder: 3,
  },
];
```

- [ ] **Step 6: Write `src/sanity/lib/fixtures/index.ts`**

```ts
/**
 * Parity fixtures — answers every query in ../queries.ts from the documents
 * in ./data.ts, so `PARITY_FIXTURES=1 npm run build` renders a populated
 * site with no Sanity project (hook: loadQuery in ../load-query.ts; diff
 * with scripts/compare-dist.mjs). The filtering mirrors each query's GROQ
 * closely enough for a handful of documents; it is not a GROQ engine.
 * An unknown query throws, so a new query cannot silently render empty in a
 * parity build — add its case here.
 */
import {
  BLOG_POSTS_QUERY,
  BLOG_POST_QUERY,
  BLOG_SLUGS_QUERY,
  RELATED_BLOG_POSTS_QUERY,
  BLOG_POSTS_BY_CATEGORY_QUERY,
  BLOG_CATEGORIES_QUERY,
  SITE_SETTINGS_QUERY,
  CASE_STUDIES_QUERY,
  CASE_STUDY_QUERY,
  CASE_STUDY_SLUGS_QUERY,
  RELATED_CASE_STUDIES_QUERY,
  TESTIMONIALS_QUERY,
  FEATURED_TESTIMONIALS_QUERY,
  FEATURED_CASE_STUDIES_QUERY,
  PROJECTS_QUERY,
  PROJECT_SLUGS_QUERY,
  PROJECT_QUERY,
  RELATED_PROJECTS_QUERY,
  FEATURED_PROJECTS_QUERY,
  GALLERY_QUERY,
} from "../queries";
import {
  CASE_STUDIES,
  GALLERY,
  POSTS,
  PROJECTS,
  SETTINGS,
  TESTIMONIALS,
  type Doc,
} from "./data";

type Params = Record<string, unknown>;

/** One complete fixture dataset. */
interface FixtureDocs {
  posts: Doc[];
  caseStudies: Doc[];
  projects: Doc[];
  gallery: Doc[];
  testimonials: Doc[];
  settings: Doc;
}

const PARITY_DOCS: FixtureDocs = {
  posts: POSTS,
  caseStudies: CASE_STUDIES,
  projects: PROJECTS,
  gallery: GALLERY,
  testimonials: TESTIMONIALS,
  settings: SETTINGS,
};

const newestFirst = (a: Doc, b: Doc) =>
  String(b.date).localeCompare(String(a.date));
const bySortOrder = (a: Doc, b: Doc) => a.sortOrder - b.sortOrder;

/** Card projection shared by BLOG_POSTS / RELATED / BY_CATEGORY / relatedPosts[]. */
function postCard(p: Doc, withPrimaryCategory = false): Doc {
  return {
    title: p.title,
    slug: p.slug,
    description: p.description,
    categories: p.categories,
    ...(withPrimaryCategory ? { primaryCategory: p.primaryCategory } : {}),
    image: p.image,
    imageAlt: p.imageAlt,
    author: p.author.name,
    authorAvatar: p.author.avatar,
    date: p.date,
    featured: p.featured,
  };
}

function postDocument(p: Doc, docs: FixtureDocs): Doc {
  return {
    title: p.title,
    slug: p.slug,
    description: p.description,
    categories: p.categories,
    image: p.image,
    imageAlt: p.imageAlt,
    author: p.author.name,
    authorAvatar: p.author.avatar,
    video: p.video,
    date: p.date,
    _updatedAt: p._updatedAt,
    featured: p.featured,
    body: p.body,
    ctaOverride: p.ctaOverride,
    ctaSectionOverride: p.ctaSectionOverride,
    faqs: p.faqs,
    relatedPosts: p.relatedSlugs.map((slug: string) =>
      postCard(docs.posts.find((x) => x.slug === slug)!),
    ),
    seo: p.seo,
  };
}

function caseStudyCard(c: Doc): Doc {
  return {
    title: c.title,
    slug: c.slug,
    description: c.description,
    client: c.client,
    categories: c.categories,
    industries: c.industries,
    image: c.image,
    imageAlt: c.imageAlt,
    date: c.date,
    featured: c.featured,
    comingSoon: c.comingSoon,
    liveUrl: c.liveUrl,
  };
}

function caseStudyDocument(c: Doc): Doc {
  return {
    ...caseStudyCard(c),
    _updatedAt: c._updatedAt,
    timeline: c.timeline,
    galleryImagesAlt: c.galleryImagesAlt,
    galleryImages: c.galleryImages,
    content: c.content,
    ctaSectionOverride: c.ctaSectionOverride,
    seo: c.seo,
  };
}

function projectCard(p: Doc): Doc {
  return {
    _id: p._id,
    title: p.title,
    slug: p.slug,
    category: p.category,
    location: p.location,
    heroImage: p.heroImage,
    imageAlt: p.imageAlt,
    heroImageMeta: p.heroImageMeta,
    featured: p.featured,
    completed: p.completed,
  };
}

function projectDocument(p: Doc): Doc {
  return {
    ...projectCard(p),
    _updatedAt: p._updatedAt,
    service: p.service,
    photos: p.photos,
    description: p.description,
    quote: p.quote,
    seoDescription: p.seoDescription,
  };
}

export function resolveFixture(
  query: string,
  params: Params,
  docs: FixtureDocs = PARITY_DOCS,
): unknown {
  const slug = params.slug as string | undefined;
  switch (query) {
    case BLOG_POSTS_QUERY:
      return [...docs.posts].sort(newestFirst).map((p) => postCard(p, true));
    case BLOG_POST_QUERY: {
      const post = docs.posts.find((p) => p.slug === slug);
      return post ? postDocument(post, docs) : null;
    }
    case BLOG_SLUGS_QUERY:
      return docs.posts.map((p) => p.slug);
    case RELATED_BLOG_POSTS_QUERY: {
      const wanted = (params.categories as string[]) ?? [];
      const exclude = (params.excludeSlugs as string[]) ?? [];
      return [...docs.posts]
        .filter(
          (p) =>
            p.slug !== slug &&
            !exclude.includes(p.slug) &&
            (p.categories ?? []).some((c: string) =>
              wanted.includes(c.toLowerCase()),
            ),
        )
        .sort(newestFirst)
        .slice(0, 6)
        .map((p) => postCard(p));
    }
    case BLOG_POSTS_BY_CATEGORY_QUERY:
      return [...docs.posts]
        .filter((p) => (p.categories ?? []).includes(params.category))
        .sort(newestFirst)
        .map((p) => postCard(p));
    case BLOG_CATEGORIES_QUERY:
      return [...new Set(docs.posts.flatMap((p) => p.categories ?? []))];
    case SITE_SETTINGS_QUERY:
      return docs.settings;
    case CASE_STUDIES_QUERY:
      return [...docs.caseStudies].sort(newestFirst).map(caseStudyCard);
    case CASE_STUDY_QUERY: {
      const study = docs.caseStudies.find((c) => c.slug === slug);
      return study ? caseStudyDocument(study) : null;
    }
    case CASE_STUDY_SLUGS_QUERY:
      return docs.caseStudies
        .filter((c) => c.comingSoon !== true)
        .map((c) => c.slug);
    case RELATED_CASE_STUDIES_QUERY:
      return [...docs.caseStudies]
        .filter((c) => c.slug !== slug && c.image?.asset)
        .sort(newestFirst)
        .slice(0, 4)
        .map(caseStudyCard);
    case FEATURED_CASE_STUDIES_QUERY: {
      const slugs = (params.slugs as string[]) ?? [];
      return docs.caseStudies
        .filter((c) => slugs.includes(c.slug))
        .map((c) => ({
          slug: c.slug,
          client: c.client,
          description: c.description,
          image: c.image,
          imageAlt: c.imageAlt,
        }));
    }
    case TESTIMONIALS_QUERY:
      return [...docs.testimonials].sort(bySortOrder);
    case FEATURED_TESTIMONIALS_QUERY:
      return docs.testimonials.filter((t) => t.featured).sort(bySortOrder);
    case PROJECTS_QUERY:
      return docs.projects.map(projectCard);
    case PROJECT_SLUGS_QUERY:
      return docs.projects.map((p) => p.slug);
    case PROJECT_QUERY: {
      const project = docs.projects.find((p) => p.slug === slug);
      return project ? projectDocument(project) : null;
    }
    case RELATED_PROJECTS_QUERY: {
      const others = docs.projects.filter((p) => p.slug !== slug);
      return [
        ...others.filter((p) => p.category === params.category),
        ...others.filter((p) => p.category !== params.category),
      ]
        .slice(0, 4)
        .map(projectCard);
    }
    case FEATURED_PROJECTS_QUERY:
      return docs.projects
        .filter((p) => p.featured)
        .slice(0, 3)
        .map(projectCard);
    case GALLERY_QUERY:
      return docs.gallery;
    default:
      throw new Error(
        `[parity fixtures] No fixture for query: ${query.slice(0, 80)}…`,
      );
  }
}

/** Drop-in for `sanityClient.fetch(query, params, { filterResponse: false })`. */
export async function fixtureFetch(
  query: string,
  params: Params | undefined,
  mode: string,
) {
  if (mode !== "1") {
    throw new Error(
      `[parity fixtures] Unknown PARITY_FIXTURES mode "${mode}".`,
    );
  }
  return {
    result: resolveFixture(query, params ?? {}),
    resultSourceMap: undefined,
  };
}
```

- [ ] **Step 7: Hook `loadQuery`**

In `src/sanity/lib/load-query.ts`, add this after the imports:

```ts
/* Parity fixtures (dev-only): `PARITY_FIXTURES=1 npm run build` answers
   every query from ./fixtures instead of the network, so a refactor can be
   diffed against a populated site with no Sanity project (see
   scripts/compare-dist.mjs). Read at build time; never set in production. */
const PARITY_FIXTURES: string | undefined =
  import.meta.env.PARITY_FIXTURES ??
  (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.PARITY_FIXTURES;
```

Then replace the `const { result, resultSourceMap } = await sanityClient.fetch(…);`
statement with:

```ts
const run = () =>
  sanityClient.fetch(query, params ?? {}, {
    filterResponse: false,
    perspective,
    resultSourceMap: draftMode ? "withKeyArraySelector" : false,
    stega: draftMode,
    ...(draftMode ? { token } : {}),
  });
type Fetched = Awaited<ReturnType<typeof run>>;
const { result, resultSourceMap } = PARITY_FIXTURES
  ? ((await (
      await import("./fixtures")
    ).fixtureFetch(query, params, PARITY_FIXTURES)) as unknown as Fetched)
  : await run();
```

The function's return statement is unchanged.

- [ ] **Step 8: Apply the two pre-baseline fixes**

Append to `src/sanity/lib/portable-text.ts`:

```ts
/**
 * Plain text of Portable Text blocks: each text block's spans joined, blocks
 * separated by a space. Non-text nodes are skipped. Used for FAQ answers in
 * JSON-LD (and, from the content source, wherever rich text must become a
 * plain string).
 */
export function portableTextToPlainText(
  blocks: readonly unknown[] | null | undefined,
): string {
  return (blocks ?? [])
    .map((node) => {
      const block = node as PortableTextBlock | null;
      if (block?._type !== "block") return "";
      return (block.children ?? []).map((s) => s.text ?? "").join("");
    })
    .filter(Boolean)
    .join(" ");
}
```

In `src/lib/jsonld.ts`, import `portableTextToPlainText` from
`@/sanity/lib/portable-text`. Add this helper above `blogPostJsonLd`:

```ts
/** FAQ answer as plain text. Sanity answers are Portable Text arrays —
    String() on one produced "[object Object]". */
function faqAnswerText(answer: unknown): string {
  const text = Array.isArray(answer)
    ? portableTextToPlainText(answer)
    : String(answer).replace(/<[^>]+>/g, " ");
  return text.replace(/\s+/g, " ").trim();
}
```

In the `acceptedAnswer` object, replace the `text: String(f.answer).replace(…).replace(…).trim(),`
expression with `text: faqAnswerText(f.answer),`.

In both `TestimonialsGrid.astro` (l.187) and `TestimonialsSlider.astro`
(l.219), replace `<TestimonialCard {...testimonial} theme={invertCards} />`
with:

```astro
<TestimonialCard
  quote={testimonial.quote}
  name={testimonial.name}
  role={testimonial.role}
  company={testimonial.company}
  avatar={testimonial.avatar}
  stars={testimonial.stars}
  theme={invertCards}
/>
```

- [ ] **Step 9: Type-check, then capture both baselines**

Run:

```bash
npm run check 2>&1 | tail -3
rm -rf .parity && mkdir .parity
KEEP_DEV_PAGES=1 npm run build && cp -R dist/client .parity/empty
KEEP_DEV_PAGES=1 PARITY_FIXTURES=1 npm run build && cp -R dist/client .parity/fixtures
```

Expected: `0 errors`, and both builds succeed.

- [ ] **Step 10: Prove the fixtures reached every surface**

Run:

```bash
F=.parity/fixtures
grep -c "Fixture Post One" $F/blog/fixture-post-one/index.html
grep -c "Sample content for parity checks." $F/blog/fixture-post-one/index.html
! grep -q "object Object" $F/blog/fixture-post-one/index.html && echo "faq json-ld fixed"
ls $F/blog/category/guides/index.html $F/case-studies/case-study-one/index.html $F/projects/fixture-kitchen/index.html $F/gallery/index.html $F/components/index.html
test ! -e $F/case-studies/case-study-coming && echo "coming-soon excluded"
grep -c "single_testimonial" $F/index.html
grep -c "case-study-featured_card" $F/index.html
grep -c "Fixture kitchen remodel" $F/llms.txt $F/llms-full.txt
! grep -q 'sortOrder=' $F/components/index.html && echo "no leaked testimonial attributes"
```

Expected: every count is at least 1, every `ls` path exists, and the three
`echo` lines print. If the first grep finds nothing, `import.meta.env` did
not carry the variable. Check that `PARITY_FIXTURES` reached `loadQuery`
(the `globalThis.process` fallback covers Node prerendering) before going
on.

- [ ] **Step 11: Prove the builds are deterministic**

Run:

```bash
KEEP_DEV_PAGES=1 PARITY_FIXTURES=1 npm run build
node scripts/compare-dist.mjs .parity/fixtures dist/client
node scripts/compare-dist.mjs .parity/fixtures dist/client --canonical
```

Expected: `Identical: … files.` from both. If anything differs between two
runs of the same code, find the nondeterminism first (dates, random ids).
The harness is worthless until two identical builds compare equal.

- [ ] **Step 12: Commit**

```bash
git add scripts/compare-dist.mjs src/sanity/lib/fixtures src/sanity/lib/load-query.ts astro.config.mjs .gitignore .prettierignore src/sanity/lib/portable-text.ts src/lib/jsonld.ts src/components/sections/TestimonialsGrid.astro src/components/sections/TestimonialsSlider.astro
git commit -m "$(cat <<'EOF'
Add parity harness and fixtures; fix FAQ JSON-LD and testimonial attrs

compare-dist diffs two builds (strict, or DOM-level with --canonical).
PARITY_FIXTURES=1 serves every GROQ query from GROQ-shaped fixtures so a
populated site builds with no Sanity project; KEEP_DEV_PAGES=1 keeps
/components in the build. Two fixes land before the baseline: FAQ answers
in blog JSON-LD were "[object Object]", and the testimonial grid/slider
leaked data fields as HTML attributes.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Content interface skeleton, images and CTAs

**Files:**

- Create:
  - `src/lib/content/types.ts`
  - `src/lib/content/images.ts`
  - `src/lib/content/source.ts`
  - `src/lib/content/index.ts`
  - `src/sanity/lib/source.ts`
  - `src/sanity/lib/map/image.ts`
  - `src/sanity/lib/map/cta.ts`
- Rename (`git mv`): `src/components/sections/SanityCtaSection.astro` →
  `src/components/sections/ContentCtaSection.astro`
- Modify:
  - `src/components/blog/BlogCta.astro`: rewrite the frontmatter and guard
    the image.
  - `src/components/portabletext/BlogCtaInline.astro`
  - `src/sanity/lib/page-data.ts`: add `loadSiteSettings`.
  - `src/components/templates/{BlogPost,CaseStudy,Project}Template.astro`:
    temporary CTA mapping, removed again in Tasks 4–6.
  - `src/pages/blog/index.astro`, `src/pages/blog/category/[category].astro`
    and `src/pages/case-studies/index.astro`: use `getCtaDefaults()`.
  - `src/lib/projects.ts` and `src/components/ui/GalleryBrowser.astro`:
    `SanityPhoto` becomes `ContentImage`.
  - `src/pages/components.astro`: frontmatter comment only (l.131-133).
  - `.claude/skills/setup/references/no-cms.md` (l.65): rename only.

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces, from `@/lib/content`:
  - Types: `ContentImage`, `ImagePosition`, `ImageFormat`,
    `ImageUrlOptions`, `ContentOptions`, `SlugPath`, `BlogCtaAspectRatio`,
    `BlogCtaData`, `CtaSectionData`, `CtaDefaults` and `ContentSource`.
  - `imageSrc(image, options?): ImageMetadata | string`, which returns
    `| undefined` when given a nullish image.
  - `imageUrl(image, options?): string`, likewise `| undefined` for a
    nullish image.
  - `sizedImage(image: ContentImage, width: number): ContentImage`
  - `plainText<T extends string | null | undefined>(value: T): T`
  - `getCtaDefaults(opts?: ContentOptions): Promise<CtaDefaults>`
- Also produces:
  - `sanityImage(source, alt, meta?): ContentImage | null`, from
    `src/sanity/lib/map/image.ts`.
  - `toBlogCta(raw): BlogCtaData | null`, `toCtaSection(raw): CtaSectionData | null`,
    and the types `RawBlogCta` and `RawCtaSection`, from
    `src/sanity/lib/map/cta.ts`.
  - `loadSiteSettings(draftProps?)` in `page-data.ts`.
  - The `<ContentCtaSection cta={CtaSectionData} />` and
    `<BlogCta cta={BlogCtaData} />` components.

- [ ] **Step 1: Record the hits this task must clear**

Run: `grep -rn "SanityCtaSection\|SanityPhoto" src .claude/skills`

Expected: hits in the three templates, the three listing pages,
`SanityCtaSection.astro`, `components.astro`, `projects.ts`,
`GalleryBrowser.astro` and `no-cms.md`. By Step 10 the same command prints
nothing.

- [ ] **Step 2: Write `src/lib/content/types.ts`**

Later tasks append sections to this file and members to `ContentSource`.

```ts
/**
 * The content interface's types — the view models every page, template,
 * section and component renders from, and the ContentSource contract each
 * backend implements (src/sanity/lib/source.ts today).
 *
 * Nothing in here knows which backend is active. Consumers import these
 * through `@/lib/content`; backend code imports this file directly.
 *
 * Nullability mirrors what a backend can genuinely hand over: Sanity drafts
 * are incomplete until an editor fills them in, so most display fields are
 * `string | null`. Listings drop entries that cannot be linked to.
 */
import type { ImageMetadata } from "astro";

/* ── Images ────────────────────────────────────────────────────────────── */

/** Focal point for object-position: `x` and `y` are 0–100, or centred. */
export type ImagePosition = { x: number; y: number } | "center";

/** Output format a CDN-resized image can be asked for. */
export type ImageFormat = "jpg" | "png" | "webp";

/** A size request for `imageSrc()` / `imageUrl()`. */
export interface ImageUrlOptions {
  width?: number;
  height?: number;
  format?: ImageFormat;
}

/**
 * One image, whichever backend it came from. A local image is
 * `ImageMetadata` (Astro's pipeline sizes it); a CMS image is a URL string
 * plus a `url()` builder that resizes it on the CDN. Never read `src` to get
 * a sized URL — call `imageSrc()` / `imageUrl()` / `sizedImage()`.
 */
export interface ContentImage {
  /** The image: local metadata, or a URL string. */
  src: ImageMetadata | string;
  /** Alt text — always a string, empty only for a genuinely decorative image. */
  alt: string;
  /** Intrinsic width, when known (drives `sizedImage()` heights). */
  width?: number;
  /** Intrinsic height, when known. */
  height?: number;
  /** Focal point, for `<Visual position>`. */
  position?: ImagePosition;
  /** CDN resizer — set by CMS backends; absent for local images. */
  url?: (options: ImageUrlOptions) => string;
}

/* ── Shared ────────────────────────────────────────────────────────────── */

/**
 * Per-call options. `perspectiveCookie` switches a CMS backend to its draft
 * perspective; only the /preview/* twins pass it (getDraftModeProps(Astro)).
 * Backends without drafts ignore it.
 */
export interface ContentOptions {
  perspectiveCookie?: string | undefined;
}

/** One `getStaticPaths` entry for a `[slug]` route. */
export interface SlugPath {
  params: { slug: string };
}

/* ── CTAs ──────────────────────────────────────────────────────────────── */

/** The image shape a blog CTA uses. */
export type BlogCtaAspectRatio = "portrait" | "square" | "landscape";

/** The end-of-post call to action (also used inline in a post body). */
export interface BlogCtaData {
  heading: string | null;
  body: string | null;
  image: ContentImage | null;
  /** Null renders as portrait. */
  aspectRatio: BlogCtaAspectRatio | null;
  linkUrl: string | null;
  /** Null renders as "Learn more". */
  linkLabel: string | null;
}

/** The bottom-of-page CTA section. */
export interface CtaSectionData {
  heading: string | null;
  text: string | null;
  primaryButtonLabel: string | null;
  primaryButtonHref: string | null;
  secondaryButtonLabel: string | null;
  secondaryButtonHref: string | null;
  backgroundImage: ContentImage | null;
  /** 0–100; null renders as 80. */
  overlayStrength: number | null;
}

/** The site-wide CTA defaults a page falls back to. */
export interface CtaDefaults {
  blogCta: BlogCtaData | null;
  ctaSection: CtaSectionData | null;
}

/* ── The contract ──────────────────────────────────────────────────────── */

/**
 * What every content backend implements. Declare an implementation with
 * `satisfies ContentSource` so `npm run check` fails on any drift.
 */
export interface ContentSource {
  /**
   * Strip any invisible editor-tooling encoding from a string (Sanity's
   * stega, present only in draft preview). Identity for other backends.
   * Use it before a display string is compared or written into a search
   * data-attribute.
   */
  plainText<T extends string | null | undefined>(value: T): T;
  /** The site-wide CTA defaults (Site Settings in Sanity). */
  getCtaDefaults(opts?: ContentOptions): Promise<CtaDefaults>;
}
```

- [ ] **Step 3: Write `src/lib/content/images.ts`**

```ts
/**
 * Image helpers for ContentImage — the only way consumers turn a content
 * image into a `src`. A CMS image carries a `url()` builder (resized on its
 * CDN); a local image is ImageMetadata and Astro's pipeline sizes it, so a
 * size request is ignored and the metadata is returned unchanged.
 */
import type { ImageMetadata } from "astro";
import type { ContentImage, ImageUrlOptions } from "./types";

const wantsSize = (o: ImageUrlOptions) =>
  Boolean(o.width || o.height || o.format);

/** A `src` for `<Visual>` and the cards: a sized CDN URL, or the local metadata as-is. */
export function imageSrc(
  image: ContentImage,
  options?: ImageUrlOptions,
): ImageMetadata | string;
export function imageSrc(
  image: ContentImage | null | undefined,
  options?: ImageUrlOptions,
): ImageMetadata | string | undefined;
export function imageSrc(
  image: ContentImage | null | undefined,
  options: ImageUrlOptions = {},
): ImageMetadata | string | undefined {
  if (!image) return undefined;
  return image.url && wantsSize(options) ? image.url(options) : image.src;
}

/** A URL string — for a raw img tag, an OG tag, JSON-LD or a lightbox. */
export function imageUrl(
  image: ContentImage,
  options?: ImageUrlOptions,
): string;
export function imageUrl(
  image: ContentImage | null | undefined,
  options?: ImageUrlOptions,
): string | undefined;
export function imageUrl(
  image: ContentImage | null | undefined,
  options: ImageUrlOptions = {},
): string | undefined {
  const src = imageSrc(image, options);
  return src === undefined || typeof src === "string" ? src : src.src;
}

/**
 * The image re-sized to `width`, with the height that keeps its intrinsic
 * ratio (two-thirds of the width when the ratio is unknown) — the shape
 * cards, tiles and lightboxes pass straight to `<Visual>`.
 */
export function sizedImage(image: ContentImage, width: number): ContentImage {
  const height =
    image.width && image.height
      ? Math.round((width * image.height) / image.width)
      : Math.round(width * 0.66);
  return {
    ...image,
    src: image.url ? image.url({ width }) : image.src,
    width,
    height,
  };
}
```

- [ ] **Step 4: Write `src/lib/content/source.ts` and `index.ts`**

`source.ts`:

```ts
/**
 * Selects the active content backend. Kept to ONE re-export on purpose: a
 * different backend (files, or the Sanity add-on) swaps the target here and
 * nowhere else. Never import a backend from any other file.
 */
export { default } from "@/sanity/lib/source";
```

`index.ts`:

```ts
/**
 * The content interface — the ONLY module pages, templates, sections and
 * components use to get content, content types and image helpers.
 *
 * - View models and the ContentSource contract: ./types.ts
 * - Image helpers (imageSrc, imageUrl, sizedImage): ./images.ts
 * - The active backend: ./source.ts (one line; today the Sanity
 *   implementation in src/sanity/lib/source.ts)
 *
 * Every content function takes an optional trailing `opts`
 * ({ perspectiveCookie }). Only the /preview/* draft twins pass it
 * (getDraftModeProps(Astro)); everything else calls without it and gets
 * published content.
 */
import source from "./source";

export type * from "./types";
export { imageSrc, imageUrl, sizedImage } from "./images";

/* The backend's functions, re-exported by name so call sites read
   `getCtaDefaults()`. They are plain functions — none uses `this`. */
export const { plainText, getCtaDefaults } = source;
```

- [ ] **Step 5: Write the Sanity image and CTA mappers**

`src/sanity/lib/map/image.ts`:

```ts
/**
 * Sanity image → ContentImage. Consumers get a plain ContentImage whose
 * `url()` closes over the cleaned source, so
 * `imageSrc(image, { width: 600 })` builds exactly the CDN URL
 * `urlFor(image).width(600).url()` always did.
 */
import { stegaClean } from "@sanity/client/stega";
import type { ContentImage, ImageUrlOptions } from "@/lib/content/types";
import { urlFor, hotspotPosition } from "../image";

/** Any image object a query returns (asset reference + optional hotspot/crop). */
export type SanityImageSource =
  { asset?: unknown; hotspot?: unknown } | null | undefined;

/** `asset->metadata{ dimensions }`, as the project and gallery queries project it. */
export type SanityImageMeta =
  | { dimensions: { width?: number | null; height?: number | null } | null }
  | null
  | undefined;

/**
 * A ContentImage, or null when the image has no asset yet (a half-filled
 * draft) — callers render nothing instead of handing urlFor() an empty
 * source, which throws. `meta` supplies intrinsic dimensions for
 * `sizedImage()`; omit it where no query projects them.
 */
export function sanityImage(
  source: SanityImageSource,
  alt: string | null | undefined,
  meta?: SanityImageMeta,
): ContentImage | null {
  const clean = stegaClean(source);
  if (!clean?.asset) return null;
  const url = ({ width, height, format }: ImageUrlOptions) => {
    let builder = urlFor(clean);
    if (width) builder = builder.width(width);
    if (height) builder = builder.height(height);
    if (format) builder = builder.format(format);
    return builder.url();
  };
  const width = meta?.dimensions?.width ?? undefined;
  const height = meta?.dimensions?.height ?? undefined;
  return {
    src: url({}),
    alt: stegaClean(alt) ?? "",
    ...(width && height ? { width, height } : {}),
    position: hotspotPosition(clean),
    url,
  };
}
```

`src/sanity/lib/map/cta.ts`:

```ts
/**
 * Sanity `blogCta` / `ctaSection` documents → BlogCtaData / CtaSectionData.
 */
import { stegaClean } from "@sanity/client/stega";
import type { SITE_SETTINGS_QUERY_RESULT } from "@/sanity/sanity.types";
import type { BlogCtaData, CtaSectionData } from "@/lib/content/types";
import { sanityImage } from "./image";

type Settings = NonNullable<SITE_SETTINGS_QUERY_RESULT>;
/** A dereferenced blogCta (BLOG_CTA_PROJECTION in ../queries.ts). */
export type RawBlogCta = NonNullable<Settings["defaultBlogCta"]>;
/** A dereferenced ctaSection (CTA_SECTION_PROJECTION in ../queries.ts). */
export type RawCtaSection = NonNullable<Settings["defaultCtaSection"]>;

export function toBlogCta(
  cta: RawBlogCta | null | undefined,
): BlogCtaData | null {
  if (!cta) return null;
  return {
    heading: cta.heading,
    body: cta.body,
    image: sanityImage(cta.image, cta.imageAlt),
    aspectRatio: stegaClean(cta.aspectRatio),
    linkUrl: stegaClean(cta.linkUrl),
    linkLabel: cta.linkLabel,
  };
}

/**
 * Every CTA-section field is cleaned, display text included — on purpose:
 * ContentCtaSection must render identically to CTASection in draft mode
 * (stega characters change text measurement and wrapping). The cost is no
 * click-to-edit overlays on this section; it stays editable from the
 * Studio form. Carried over from the former SanityCtaSection.
 */
export function toCtaSection(
  cta: RawCtaSection | null | undefined,
): CtaSectionData | null {
  if (!cta) return null;
  return {
    heading: stegaClean(cta.heading),
    text: stegaClean(cta.text),
    primaryButtonLabel: stegaClean(cta.primaryButtonLabel),
    primaryButtonHref: stegaClean(cta.primaryButtonHref),
    secondaryButtonLabel: stegaClean(cta.secondaryButtonLabel),
    secondaryButtonHref: stegaClean(cta.secondaryButtonHref),
    backgroundImage: sanityImage(cta.backgroundImage, cta.imageAlt),
    overlayStrength: stegaClean(cta.overlayStrength),
  };
}
```

- [ ] **Step 6: Add `loadSiteSettings` and write the Sanity source**

In `src/sanity/lib/page-data.ts`, add this after `loadPageQuery`:

```ts
/** Site Settings (default blog CTA + CTA section). Null on a fresh fork. */
export function loadSiteSettings(draftProps: DraftProps = {}) {
  return loadPageQuery({
    query: SITE_SETTINGS_QUERY,
    draftProps,
    fallback: null,
    label: "site settings",
  });
}
```

`src/sanity/lib/source.ts`:

```ts
/**
 * The Sanity implementation of the content interface (src/lib/content).
 * src/lib/content/source.ts selects it; nothing else imports this file.
 *
 * Three layers, one direction:
 *   page-data.ts — GROQ fetching (loaders, placeholder-safe listings,
 *                  getStaticPaths helpers)
 *   map/*.ts     — query results → view models (the only code that uses
 *                  urlFor, hotspotPosition, stegaClean, Portable Text
 *                  serialisation and the TypeGen types)
 *   source.ts    — composes the two into the ContentSource functions
 *
 * Stega (Presentation draft mode). With a perspective cookie, loadQuery
 * stega-encodes strings so Presentation can draw click-to-edit overlays over
 * the text it renders. The mappers therefore clean ONLY values used as logic
 * or plumbing and leave display strings encoded:
 *   cleaned — slugs, URLs/hrefs, enums and categories, dates, numbers,
 *             booleans, image sources and alt text, CSS-ish values (aspect
 *             ratios, spacing, max widths, object-fit), SEO fields, derived
 *             text (FAQ answer text, read time, Markdown, plain-text
 *             fallbacks), and any string the mapper trims (trimming would
 *             corrupt the invisible payload)
 *   encoded — titles, descriptions, names, captions, quotes, labels and
 *             rich text (HTML strings and Portable Text keep their text)
 *   exception — every field of a CTA section is cleaned (see map/cta.ts)
 * Consumers that need a display string as data (a search data-attribute)
 * call `plainText()` from @/lib/content — stegaClean here.
 *
 * Public routes are prerendered with no cookie, so nothing is encoded there;
 * all of this only affects /preview/*.
 */
import { stegaClean } from "@sanity/client/stega";
import type {
  ContentOptions,
  ContentSource,
  CtaDefaults,
} from "@/lib/content/types";
import { loadSiteSettings } from "./page-data";
import { toBlogCta, toCtaSection } from "./map/cta";

/* ── Shared ────────────────────────────────────────────────────────────── */

function plainText<T extends string | null | undefined>(value: T): T {
  return stegaClean(value);
}

/* ── CTAs ──────────────────────────────────────────────────────────────── */

async function getCtaDefaults(opts?: ContentOptions): Promise<CtaDefaults> {
  const settings = await loadSiteSettings(opts);
  return {
    blogCta: toBlogCta(settings?.defaultBlogCta),
    ctaSection: toCtaSection(settings?.defaultCtaSection),
  };
}

/* `satisfies` fails `npm run check` when a ContentSource function is
   missing here or its signature drifts. */
const sanitySource = {
  plainText,
  getCtaDefaults,
} satisfies ContentSource;

export default sanitySource;
```

Run: `npm run check 2>&1 | tail -3`

Expected: `0 errors`.

- [ ] **Step 7: Rename and rewrite the CTA section component**

Run: `git mv src/components/sections/SanityCtaSection.astro src/components/sections/ContentCtaSection.astro`

Replace its frontmatter (everything from the opening `---` to the closing
`---`) with:

```astro
---
import type { HTMLAttributes } from "astro/types";
/**
 * ContentCtaSection — the bottom-of-page CTA whose copy and background come
 * from the content source: a page's override, else the site default
 * (`getCtaDefaults()` and the `ctaSection` of `getBlogPost()`,
 * `getCaseStudy()` and `getProject()` in `@/lib/content`). Used on the blog
 * post, case study and project templates and the blog and case study
 * listing pages.
 *
 * It is a deliberate duplicate of CTASection.astro's composition (same
 * Section + Layout card + Heading/Text/Button/Visual/Overlay primitives and
 * the same data-fade-in hooks), so it renders identically. With a CMS the
 * background is a CDN URL, which renders through Visual's remote image
 * branch and so bypasses the runtime `/_image` Worker endpoint that fails on
 * first load for locally-imported images on SSR routes.
 *
 * The Sanity source hands this section fully cleaned text (no stega) on
 * purpose, so draft-mode rendering matches CTASection — see
 * src/sanity/lib/map/cta.ts.
 *
 * Keep this separate from CTASection.astro: CTASection stays the local-image
 * component for static (industry/location) pages and can diverge
 * independently.
 */
import Section from "@/components/ui/Section.astro";
import Layout from "@/components/ui/Layout.astro";
import Visual from "@/components/ui/Visual.astro";
import Overlay from "@/components/ui/Overlay.astro";
import Button from "@/components/ui/Button.astro";
import ButtonWrapper from "@/components/ui/ButtonWrapper.astro";
import Heading from "@/components/ui/Heading.astro";
import Text from "@/components/ui/Text.astro";
import { imageSrc, type CtaSectionData } from "@/lib/content";

/* Single source for the padding union: Section.astro — never re-declare
   these values locally; the copies this replaced had all drifted. */
type PaddingValue = import("@/components/ui/Section.astro").PaddingSize;

interface Props extends HTMLAttributes<"section"> {
  /**
   * **ContentCtaSection** — bottom-of-page CTA built from content data.
   * Pass `cta` (a `CtaSectionData` from `@/lib/content`). `padding`
   * defaults to `'small'`; `paddingTop` / `paddingBottom` override one side.
   */
  docs?: string;

  /** The CTA section to render: a page's override, else the site default. */
  cta: CtaSectionData;

  /** Section vertical padding. @default 'small' */
  padding?: PaddingValue;

  /** Override top padding only. */
  paddingTop?: PaddingValue;

  /** Override bottom padding only. */
  paddingBottom?: PaddingValue;
}

const {
  docs,
  cta,
  padding = "small",
  paddingTop,
  paddingBottom,
  ...rest
} = Astro.props;

// 1920 matches the project's full-width image convention; the Sanity URL
// builder applies dpr(2) for retina, so the served asset is up to 3840px wide.
const backgroundSrc = imageSrc(cta.backgroundImage, { width: 1920 });
const imagePosition = cta.backgroundImage?.position;
const imageAlt = cta.backgroundImage?.alt ?? "";
const overlayStrength = cta.overlayStrength ?? 80;

/* `?? undefined` because these are nullable until an editor fills them in,
   and Button's href/ariaLabel take undefined rather than null. */
const primaryLabel = cta.primaryButtonLabel ?? undefined;
const primaryHref = cta.primaryButtonHref ?? undefined;
const secondaryLabel = cta.secondaryButtonLabel ?? undefined;
const secondaryHref = cta.secondaryButtonHref ?? undefined;
const hasSecondary = Boolean(secondaryLabel && secondaryHref);
---
```

In the markup, make three changes:

1. `{heading}` → `{cta.heading}`
2. `{text}` → `{cta.text}`
3. Replace the background `<Visual … />` inside
   `<Fragment slot="column2">` with:

```astro
{
  backgroundSrc && (
    <Visual
      src={backgroundSrc}
      alt={imageAlt}
      variant="background"
      position={imagePosition}
    />
  )
}
```

- [ ] **Step 8: Rewrite BlogCta and BlogCtaInline**

Replace the frontmatter of `src/components/blog/BlogCta.astro`:

```astro
---
import type { HTMLAttributes } from "astro/types";
/**
 * Blog CTA — clickable image + text + link block.
 *
 * The whole block is one anchor. The visible "button" inside is a styled
 * span (not a nested anchor). The image bleeds above the colored panel via
 * a negative top margin on `.blog-cta_visual_wrap`. Theme-aware (uses
 * --background-2 etc).
 *
 * Takes a `BlogCtaData` from `@/lib/content`: a post's override or the site
 * default (`getBlogPost().cta`), or an inline CTA from a Portable Text body
 * (BlogCtaInline maps it).
 */
import Visual from "@/components/ui/Visual.astro";
import { imageSrc, type BlogCtaData } from "@/lib/content";

interface Props extends HTMLAttributes<"a"> {
  /**
   * **BlogCta** — a linked image + heading + text panel. Pass `cta` (a
   * `BlogCtaData`). Its `aspectRatio` picks the image shape (portrait when
   * unset) and `linkLabel` defaults to "Learn more".
   */
  docs?: string;

  /** The CTA to render. */
  cta: BlogCtaData;

  /** Extra classes on the link wrapper. */
  class?: string;
}

const { docs, cta, class: className, ...rest } = Astro.props;

const ratio = cta.aspectRatio ?? "portrait";
const linkLabel = cta.linkLabel ?? "Learn more";
const imageAlt = cta.image?.alt ?? "";

const imageWidth = 800;
const imageHeight =
  ratio === "square" ? 800 : ratio === "landscape" ? 533 : 1067;
const imageSource = imageSrc(cta.image, {
  width: imageWidth,
  height: imageHeight,
});
---
```

Make these markup changes:

- On the opening anchor:
  - `href={linkUrl}` → `href={cta.linkUrl}`
  - add `{...rest}` as the last attribute
- Wrap the `<Visual … src={imageUrl} … />` in
  `{imageSource && ( … )}`, with `src={imageSource}`.

Replace the whole frontmatter of
`src/components/portabletext/BlogCtaInline.astro`, and its markup:

```astro
---
/**
 * Blog CTA Inline — Portable Text custom type component.
 *
 * Node shape: { _type: "blogCtaInline", cta: the dereferenced blogCta }.
 * BLOG_POST_QUERY dereferences it server-side; this maps it to the
 * BlogCtaData view model BlogCta renders. Sanity-only (Portable Text), so
 * it imports the Sanity mapper directly.
 */
import type { Props as PortableTextProps } from "astro-portabletext/types";
import BlogCta from "@/components/blog/BlogCta.astro";
import { toBlogCta, type RawBlogCta } from "@/sanity/lib/map/cta";

interface BlogCtaInlineNode {
  _type: "blogCtaInline";
  cta?: RawBlogCta | null;
}

type Props = PortableTextProps<BlogCtaInlineNode>;

const { node } = Astro.props;
const cta = toBlogCta(node.cta);
---

{cta && <BlogCta cta={cta} />}
```

- [ ] **Step 9: Point every CTA consumer at the new shapes**

**Templates.** These temporary imports of `@/sanity/lib/map/cta` are removed
in Tasks 4, 5 and 6.

- `BlogPostTemplate.astro`:
  - Replace the `SanityCtaSection` import with
    `import ContentCtaSection from "@/components/sections/ContentCtaSection.astro";`.
  - Add `import { toBlogCta, toCtaSection } from "@/sanity/lib/map/cta";`.
  - Replace the two `resolved*` consts with:
    ```ts
    const resolvedBlogCta = toBlogCta(post.ctaOverride ?? defaultCta ?? null);
    const resolvedCtaSection = toCtaSection(
      post.ctaSectionOverride ?? defaultCtaSection ?? null,
    );
    ```
  - In the markup, change
    `<SanityCtaSection cta={resolvedCtaSection} />` to
    `<ContentCtaSection cta={resolvedCtaSection} />`.
- `CaseStudyTemplate.astro`:
  - Make the same import swap.
  - Use
    `const resolvedCtaSection = toCtaSection(study.ctaSectionOverride ?? defaultCtaSection ?? null);`.
  - Change `<SanityCtaSection` to `<ContentCtaSection`.
- `ProjectTemplate.astro`:
  - Make the same import swap.
  - Add `const ctaSection = toCtaSection(defaultCtaSection);` after the
    props destructure.
  - Change `{defaultCtaSection && <SanityCtaSection cta={defaultCtaSection} />}`
    to `{ctaSection && <ContentCtaSection cta={ctaSection} />}`.

**Listing pages.** In `blog/index.astro`, `blog/category/[category].astro`
and `case-studies/index.astro`:

- Swap the CTA component import.
- Remove `SITE_SETTINGS_QUERY` from the queries import.
- Add `import { getCtaDefaults } from "@/lib/content";`.
- Replace the second `Promise.all` entry (the `SITE_SETTINGS_QUERY`
  `loadPageQuery`) with `getCtaDefaults()`. In blog/index.astro, for
  example:

```ts
const [allPosts, ctaDefaults] = await Promise.all([
  loadPageQuery({
    query: BLOG_POSTS_QUERY,
    draftProps,
    fallback: [],
    label: "blog index posts",
  }),
  getCtaDefaults(),
]);
const defaultCtaSection = ctaDefaults.ctaSection;
```

Make the same two-line shape in the other two pages, keeping each page's
first entry and label as they are. In all three, change
`{defaultCtaSection && <SanityCtaSection cta={defaultCtaSection} />}` to
`{defaultCtaSection && <ContentCtaSection cta={defaultCtaSection} />}`.

**ContentImage rename.**

- In `src/lib/projects.ts`:
  - Delete the `SanityPhoto` interface and its doc comment.
  - Add `import type { ContentImage } from "@/lib/content/types";`.
  - Change `sanityPhoto(...)`'s return type to `ContentImage | undefined`.
  - Change `ProjectCardData.image` to `ContentImage | undefined`.
  - Change `photoUrl(photo: ContentImage)`.
  - Reword the header sentence "A sized, positioned image ready for
    `<Visual>`" as "Images use ContentImage (src/lib/content/types.ts)".
- In `GalleryBrowser.astro`:
  - Change the import to `import { photoUrl } from "@/lib/projects";`
    plus `import type { ContentImage } from "@/lib/content";`.
  - Change `thumb: SanityPhoto;` / `full: SanityPhoto;` to `ContentImage`.

**Docs.**

- In `components.astro` (frontmatter, l.131-133), replace the
  SanityCtaSection bullet with:
  `• ContentCtaSection — takes a CtaSectionData from @/lib/content; <CTASection /> below is its static twin.`
- In `no-cms.md` l.65, `SanityCtaSection` becomes `ContentCtaSection`.

- [ ] **Step 10: Verify**

Run:

```bash
grep -rn "SanityCtaSection\|SanityPhoto" src .claude/skills
npm run check 2>&1 | tail -3
npm run check:hover
KEEP_DEV_PAGES=1 npm run build && node scripts/compare-dist.mjs .parity/empty dist/client
KEEP_DEV_PAGES=1 PARITY_FIXTURES=1 npm run build && node scripts/compare-dist.mjs .parity/fixtures dist/client
```

Expected:

- The grep prints nothing.
- `npm run check` reports `0 errors`, and `check:hover` exits 0.
- Both comparisons print `Identical: … files.` The fixture build renders
  every CTA through the new path: the blog index, the three blog posts
  (default, landscape override, inline) and case study one's override.

- [ ] **Step 11: Commit**

```bash
git add -A src/lib/content src/sanity src/components src/pages src/lib/projects.ts .claude/skills/setup/references/no-cms.md
git commit -m "$(cat <<'EOF'
Add src/lib/content skeleton; move CTAs and images onto it

The content interface: named view models, ContentSource, image helpers
(imageSrc/imageUrl/sizedImage), a one-line backend selector, and the
Sanity implementation (satisfies ContentSource) with image and CTA
mappers. SanityCtaSection becomes ContentCtaSection and takes
CtaSectionData; BlogCta takes BlogCtaData; SanityPhoto becomes
ContentImage. Rendered output unchanged (parity: empty + fixtures).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Testimonials

**Files:**

- Create: `src/sanity/lib/map/testimonials.ts`
- Delete: `src/sanity/lib/testimonials.ts`
- Modify:
  - `src/lib/content/{types.ts,index.ts}`
  - `src/sanity/lib/{source.ts,page-data.ts}`
  - `src/sanity/lib/queries.ts` (the comment above `TESTIMONIALS_QUERY`)
  - `src/components/ui/TestimonialCard.astro`
  - `src/components/sections/{SingleTestimonial,TestimonialShowcase,TestimonialsGrid,TestimonialsSlider}.astro`
  - `src/pages/components.astro` (frontmatter l.55-56, l.262-267)

**Interfaces:**

- Consumes:
  - `ContentImage`, `ContentOptions` and `ContentSource` (Task 2)
  - `sanityImage(source, alt, meta?)` (Task 2)
  - `imageUrl(image, options)` (Task 2)
- Produces:
  - Types `TestimonialData` and `TestimonialFilter`.
  - `getTestimonials(filter?: TestimonialFilter, opts?: ContentOptions): Promise<TestimonialData[]>`
  - `getTestimonialByName(name: string, opts?: ContentOptions): Promise<TestimonialData | undefined>`
  - `loadTestimonials(featured: boolean, draftProps?)` in `page-data.ts`.
  - `toTestimonial(raw): TestimonialData`
  - `TestimonialCard`'s `avatar` prop becomes `AvatarSource | null`, where
    `AvatarSource = ContentImage | string`.

- [ ] **Step 1: Record the hits this task must clear**

Run:

```bash
grep -rln "sanity/lib/testimonials\|urlFor\|getDraftModeProps" src/components/ui/TestimonialCard.astro src/components/sections/SingleTestimonial.astro src/components/sections/TestimonialShowcase.astro src/pages/components.astro
```

Expected: all four files listed. Step 7 requires no output.

- [ ] **Step 2: Add the types and the contract**

Append to `src/lib/content/types.ts`, before the contract section:

```ts
/* ── Testimonials ──────────────────────────────────────────────────────── */

/** One testimonial. */
export interface TestimonialData {
  id: string;
  name: string | null;
  role: string | null;
  company: string | null;
  quote: string | null;
  avatar: ContentImage | null;
  website: string | null;
  /** 1–5; null hides the stars. */
  stars: number | null;
  featured: boolean;
  order: number | null;
}

/** Which testimonials `getTestimonials()` returns. */
export interface TestimonialFilter {
  /** Only those marked featured. */
  featured?: boolean;
  /** At most this many, after the source's ordering. */
  limit?: number;
}
```

Add these to `interface ContentSource`:

```ts
  /** Testimonials in their editor-set order; filter by `featured`, cap with `limit`. */
  getTestimonials(
    filter?: TestimonialFilter,
    opts?: ContentOptions,
  ): Promise<TestimonialData[]>;
  /** The testimonial whose name matches (case-insensitive), if any. */
  getTestimonialByName(
    name: string,
    opts?: ContentOptions,
  ): Promise<TestimonialData | undefined>;
```

- [ ] **Step 3: Loader, mapper, source**

In `page-data.ts`, import `TESTIMONIALS_QUERY` and
`FEATURED_TESTIMONIALS_QUERY`, then add:

```ts
/** All testimonials, or only featured ones, in sortOrder. Empty on a fresh fork. */
export function loadTestimonials(
  featured: boolean,
  draftProps: DraftProps = {},
) {
  return loadPageQuery({
    query: featured ? FEATURED_TESTIMONIALS_QUERY : TESTIMONIALS_QUERY,
    draftProps,
    fallback: [],
    label: featured ? "featured testimonials" : "testimonials",
  });
}
```

`src/sanity/lib/map/testimonials.ts`:

```ts
/**
 * Sanity testimonial rows → TestimonialData. Name, role, company and quote
 * stay stega-encoded (display); the rest is cleaned. Policy: ../source.ts.
 */
import { stegaClean } from "@sanity/client/stega";
import type { TESTIMONIALS_QUERY_RESULT } from "@/sanity/sanity.types";
import type { TestimonialData } from "@/lib/content/types";
import { sanityImage } from "./image";

type RawTestimonial = TESTIMONIALS_QUERY_RESULT[number];

export function toTestimonial(t: RawTestimonial): TestimonialData {
  return {
    id: t._id,
    name: t.name,
    role: t.role,
    company: t.company,
    quote: t.quote,
    avatar: sanityImage(t.avatar, t.name),
    website: stegaClean(t.website),
    stars: stegaClean(t.stars),
    featured: stegaClean(t.featured) ?? false,
    order: stegaClean(t.sortOrder),
  };
}
```

In `src/sanity/lib/source.ts`:

- Import `loadTestimonials`, `toTestimonial`, and the types
  `TestimonialData` and `TestimonialFilter`.
- Add the two functions below and list `getTestimonials` and
  `getTestimonialByName` in the `sanitySource` object.

```ts
/* ── Testimonials ──────────────────────────────────────────────────────── */

async function getTestimonials(
  filter: TestimonialFilter = {},
  opts?: ContentOptions,
): Promise<TestimonialData[]> {
  const rows = await loadTestimonials(filter.featured ?? false, opts);
  const all = rows.map(toTestimonial);
  return filter.limit ? all.slice(0, filter.limit) : all;
}

async function getTestimonialByName(
  name: string,
  opts?: ContentOptions,
): Promise<TestimonialData | undefined> {
  const wanted = name.toLowerCase();
  // Names stay stega-encoded for display; compare the cleaned text.
  return (await getTestimonials({}, opts)).find(
    (t) => stegaClean(t.name)?.toLowerCase() === wanted,
  );
}
```

In `src/lib/content/index.ts`, extend the destructure to
`export const { plainText, getCtaDefaults, getTestimonials, getTestimonialByName } = source;`.

Delete `src/sanity/lib/testimonials.ts`. In `queries.ts`, change the
`TESTIMONIALS_QUERY` comment's "Prefer using `getTestimonials()` from
`src/sanity/lib/testimonials.ts`…" to "Consumers call `getTestimonials()`
from `@/lib/content`, which wraps this query and the featured variant
below."

- [ ] **Step 4: TestimonialCard**

- Remove the `urlFor` import and add
  `import { imageUrl, type ContentImage } from "@/lib/content";`.
- Above `interface Testimonial`, add:
  `/** An avatar: a URL string or a ContentImage from @/lib/content. */ type AvatarSource = ContentImage | string;`
- Change the `avatar` member to
  `/** Author avatar — a URL string or a ContentImage (optional). */ avatar?: AvatarSource | null;`.
- Change the comment above the interface from "these usually arrive from
  Sanity" to "these usually arrive from the content source".
- Replace the `avatarUrl` expression with:

```ts
const avatarUrl = avatar
  ? typeof avatar === "string"
    ? avatar
    : imageUrl(avatar, { width: 80, height: 80 })
  : undefined;
```

- [ ] **Step 5: The three sections**

**`SingleTestimonial.astro`:**

- Delete the `urlFor`, `getTestimonialByName` and `getDraftModeProps`
  imports and the local `interface TestimonialData`.
- Add:
  ```ts
  import { getTestimonialByName, imageUrl } from "@/lib/content";
  import type { Testimonial } from "@/components/ui/TestimonialCard.astro";
  ```
- Change the prop to
  `/** Pre-fetched testimonial (skips the lookup) */ testimonial?: Testimonial;`.
- Change the `name` prop doc to "Name to look up among the testimonials
  (case-insensitive)".
- In the docs JSDoc, "to fetch from Sanity" becomes "to look up", and
  "skips Sanity fetch" becomes "skips the lookup".
- In the header, "Self-fetches from Sanity by name" becomes "Self-fetches by
  name through `@/lib/content`".
- The fetch becomes:

```ts
const testimonial =
  rawTestimonial ??
  (fetchName
    ? await getTestimonialByName(fetchName).catch(() => undefined)
    : undefined);
```

- The avatar becomes
  `: imageUrl(avatar, { width: 256, height: 256 })` in the same ternary.

**`TestimonialShowcase.astro`:**

- Delete the `urlFor`, `fetchTestimonials` and `getDraftModeProps` imports.
- Add `import { getTestimonials, imageUrl } from "@/lib/content";`.
- The fetch becomes
  `rawTestimonials ?? (await getTestimonials({ featured: true }).catch(() => []))`.
- The avatar becomes `: imageUrl(avatar, { width: 96, height: 96 })`.
- In comments and JSDoc, "from Sanity" becomes "from the content source",
  and "slices after Sanity ordering" becomes "slices after the source's
  ordering".

**`TestimonialsGrid.astro` and `TestimonialsSlider.astro`:** change the doc
line "`avatar` accepts a URL string or Sanity image object" to "`avatar`
accepts a URL string or a ContentImage (`@/lib/content`)". Also change any
"slices after Sanity ordering" the same way.

- [ ] **Step 6: components.astro**

- Lines 55-56 become
  `import { getTestimonials, type TestimonialData } from "@/lib/content";`.
- Lines 262-267 become:

```ts
/* ── Testimonials from the content source (tolerate an empty/unreachable dataset) ── */
import ButtonWrapper from "@/components/ui/ButtonWrapper.astro";
const testimonials = await getTestimonials().catch((): TestimonialData[] => []);
```

- [ ] **Step 7: Verify and commit**

Run:

```bash
grep -rln "sanity/lib/testimonials\|urlFor\|getDraftModeProps" src/components/ui/TestimonialCard.astro src/components/sections/SingleTestimonial.astro src/components/sections/TestimonialShowcase.astro src/pages/components.astro
grep -rn "lib/testimonials" src .claude CLAUDE.md README.md docs --include='*' | grep -v docs/superpowers
npm run check 2>&1 | tail -3
npm run check:hover
KEEP_DEV_PAGES=1 npm run build && node scripts/compare-dist.mjs .parity/empty dist/client
KEEP_DEV_PAGES=1 PARITY_FIXTURES=1 npm run build && node scripts/compare-dist.mjs .parity/fixtures dist/client
```

Expected:

- The first grep prints nothing.
- The second grep shows only the `sanity-and-preview` skill line, which
  Task 10 rewrites.
- `0 errors`; `check:hover` exits 0.
- Both comparisons print `Identical`. Fixture coverage: the homepage
  `SingleTestimonial` (Jane Doe) and `TestimonialShowcase`, plus the
  components-page slider and grid.

```bash
git add -A src
git commit -m "$(cat <<'EOF'
Move testimonials behind the content interface

getTestimonials/getTestimonialByName come from @/lib/content; the
Sanity source maps rows to TestimonialData (avatar as ContentImage) and
matches names on cleaned text. src/sanity/lib/testimonials.ts is gone.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Projects and gallery

**Files:**

- Create: `src/sanity/lib/map/projects.ts`
- Modify:
  - `src/lib/content/{types.ts,index.ts}`
  - `src/sanity/lib/{source.ts,page-data.ts}`
  - `src/lib/projects.ts`
  - `src/components/templates/ProjectTemplate.astro`
  - `src/pages/projects/index.astro`
  - `src/pages/projects/[slug].astro`
  - `src/pages/preview/projects/[slug].astro`
  - `src/pages/gallery.astro`
  - `src/components/ui/{ProjectCard,ProjectBrowser,GalleryBrowser}.astro`
  - `src/pages/components.astro`: the frontmatter comment at l.268-269 and
    the rendered sentence at l.2221.

**Interfaces:**

- Consumes:
  - `sanityImage` and `sizedImage` (Task 2)
  - `toCtaSection` and `CtaSectionData` (Task 2)
  - `imageUrl` (Task 2)
- Produces:
  - Types `ProjectCardData` (moved here, same shape, now `image: ContentImage | undefined`),
    `ProjectPhoto`, `ProjectQuote`, `ProjectDetail`, `ProjectPage` and
    `GalleryEntry`.
  - `getProjects(opts?): Promise<ProjectCardData[]>`
  - `getFeaturedProjects(opts?): Promise<ProjectCardData[]>`
  - `getProject(slug: string, opts?): Promise<ProjectPage | null>`
  - `getGallery(opts?): Promise<GalleryEntry[]>`
  - `getProjectStaticPaths(): Promise<SlugPath[]>`
  - `isPresent<T>(value: T | null): value is T`, inside
    `src/sanity/lib/source.ts`; later tasks reuse it.
  - `src/lib/projects.ts` keeps only `projectPath(slug: string): string`.

- [ ] **Step 1: Record the hits this task must clear**

Run:

```bash
grep -rn "sanityPhoto\|toProjectCards\|toProjectCard\b\|photoUrl\|loadProjectPage\|loadProjects\|loadGallery" src --include='*.astro'
```

Expected: hits in `ProjectTemplate`, `projects/index`, `gallery`, both
project routes, `GalleryBrowser`, `ProjectCard`, `ProjectBrowser` and
`components.astro`. Step 9 requires no output.

- [ ] **Step 2: Types and contract**

Append to `types.ts`:

```ts
/* ── Projects + gallery ────────────────────────────────────────────────── */

/** A project as a card renders it. */
export interface ProjectCardData {
  id: string;
  title: string;
  /** The detail page, e.g. "/projects/smith-kitchen". */
  href: string;
  /** Category value (see src/config/projects.ts); "" when unset. */
  category: string;
  categoryLabel: string;
  /** As the editor wrote it, e.g. "Springfield, IL"; "" when not set. */
  location: string;
  /** Card-size hero photo. */
  image: ContentImage | undefined;
}

/** One project photo and its optional stage label. */
export interface ProjectPhoto {
  image: ContentImage;
  label: string | null;
}

/** The customer quote on a project. */
export interface ProjectQuote {
  text: string;
  name: string | null;
}

/** Everything the project detail page renders. */
export interface ProjectDetail {
  slug: string;
  title: string;
  category: string;
  categoryLabel: string;
  location: string;
  service: string;
  /** ISO date; null when not set. */
  completed: string | null;
  hero: ContentImage | null;
  photos: ProjectPhoto[];
  /** The write-up as HTML ("" when there is none). */
  descriptionHtml: string;
  /** The write-up as plain text — the SEO description fallback. */
  descriptionText: string;
  quote: ProjectQuote | null;
  seoDescription: string | null;
}

/** `getProject()`: the project, related cards and the CTA section. */
export interface ProjectPage {
  project: ProjectDetail;
  relatedProjects: ProjectCardData[];
  ctaSection: CtaSectionData | null;
}

/** One gallery photo. */
export interface GalleryEntry {
  id: string;
  image: ContentImage;
  caption: string;
  category: string;
  categoryLabel: string;
  location: string;
  /** "" when unlinked, or when the linked project was deleted. */
  projectTitle: string;
}
```

Add these to `ContentSource`:

```ts
  /** Every project as a card, newest first. */
  getProjects(opts?: ContentOptions): Promise<ProjectCardData[]>;
  /** Up to three featured projects. */
  getFeaturedProjects(opts?: ContentOptions): Promise<ProjectCardData[]>;
  /** One project with up to three related cards; null when not found. */
  getProject(slug: string, opts?: ContentOptions): Promise<ProjectPage | null>;
  /** Every gallery photo, newest first. */
  getGallery(opts?: ContentOptions): Promise<GalleryEntry[]>;
  /** getStaticPaths for /projects/[slug]. */
  getProjectStaticPaths(): Promise<SlugPath[]>;
```

- [ ] **Step 3: The mappers**

`src/sanity/lib/map/projects.ts`:

```ts
/**
 * Sanity project + gallery rows → ProjectCardData / ProjectDetail /
 * GalleryEntry (src/lib/content/types.ts). Moved here from
 * src/lib/projects.ts, which now holds only projectPath().
 *
 * Stega: slugs, categories, labels, dates, image sources, alt text and
 * every trimmed string (location, service, gallery project title) are
 * cleaned; titles, captions, quotes and the write-up stay encoded. Policy:
 * ../source.ts.
 */
import { stegaClean } from "@sanity/client/stega";
import type {
  GALLERY_QUERY_RESULT,
  PROJECT_QUERY_RESULT,
  PROJECTS_QUERY_RESULT,
} from "@/sanity/sanity.types";
import type {
  GalleryEntry,
  ProjectCardData,
  ProjectDetail,
} from "@/lib/content/types";
import { sizedImage } from "@/lib/content/images";
import { categoryTitle } from "@/config/projects";
import { photoAlt } from "@/lib/project-format";
import { projectPath } from "@/lib/projects";
import { portableTextToHtml } from "../portable-text";
import { sanityImage } from "./image";

/** The card fields the listing, featured and related queries share. */
type RawProjectCard = PROJECTS_QUERY_RESULT[number];
type RawProject = NonNullable<PROJECT_QUERY_RESULT>;
type RawGalleryRow = GALLERY_QUERY_RESULT[number];

/** Project cards have always been served at this width. */
const CARD_WIDTH = 900;

/** A project card, or null when the row has no slug (nothing to link). */
export function toProjectCard(p: RawProjectCard): ProjectCardData | null {
  const slug = stegaClean(p.slug);
  if (!slug) return null;
  const category = stegaClean(p.category) ?? "";
  const title = p.title ?? "Untitled project";
  const image = sanityImage(
    p.heroImage,
    photoAlt(p.imageAlt, title),
    p.heroImageMeta,
  );
  return {
    id: p._id,
    title,
    href: projectPath(slug),
    category,
    categoryLabel: categoryTitle(category),
    location: stegaClean(p.location)?.trim() ?? "",
    image: image ? sizedImage(image, CARD_WIDTH) : undefined,
  };
}

export function toProjectDetail(p: RawProject): ProjectDetail {
  const title = p.title ?? "Project";
  const category = stegaClean(p.category) ?? "";
  return {
    slug: stegaClean(p.slug) ?? "",
    title,
    category,
    categoryLabel: categoryTitle(category),
    location: stegaClean(p.location)?.trim() ?? "",
    service: stegaClean(p.service)?.trim() ?? "",
    completed: stegaClean(p.completed),
    hero: sanityImage(
      p.heroImage,
      photoAlt(p.imageAlt, title),
      p.heroImageMeta,
    ),
    photos: (p.photos ?? []).flatMap((photo) => {
      const image = sanityImage(
        photo,
        photoAlt(photo.alt, `${title} photo`),
        photo.meta,
      );
      return image ? [{ image, label: stegaClean(photo.label) }] : [];
    }),
    descriptionHtml: portableTextToHtml(p.description),
    descriptionText: stegaClean(
      (p.description ?? [])
        .flatMap((block) => block.children ?? [])
        .map((span) => span.text ?? "")
        .join("")
        .trim(),
    ),
    quote: p.quote?.text ? { text: p.quote.text, name: p.quote.name } : null,
    seoDescription: stegaClean(p.seoDescription),
  };
}

/** A gallery photo, or null when it has no image asset yet. */
export function toGalleryEntry(row: RawGalleryRow): GalleryEntry | null {
  const caption = row.caption ?? "";
  const image = sanityImage(
    row.image,
    photoAlt(row.imageAlt, stegaClean(caption) || "Gallery photo"),
    row.imageMeta,
  );
  if (!image) return null;
  const category = stegaClean(row.category) ?? "";
  return {
    id: row._id,
    image,
    caption,
    category,
    categoryLabel: categoryTitle(category),
    location: stegaClean(row.location)?.trim() ?? "",
    projectTitle: stegaClean(row.project?.title)?.trim() ?? "",
  };
}
```

Replace `src/lib/projects.ts` entirely with:

```ts
/**
 * Project URL helper, shared by the content source (src/sanity/lib/map/
 * projects.ts) and the project pages. The project and gallery view models
 * live in src/lib/content/types.ts.
 */

/** Public URL of a project detail page. */
export function projectPath(slug: string): string {
  return `/projects/${slug}`;
}
```

- [ ] **Step 4: Source functions**

In `page-data.ts`, change `loadProjectPage`'s related-query param to
`category: stegaClean(project.category) ?? ""`, and import `stegaClean`
from `@sanity/client/stega`. Without the clean, an encoded category breaks
the GROQ match in preview.

In `src/sanity/lib/source.ts`:

- Import `loadProjects`, `loadFeaturedProjects`, `loadProjectPage`,
  `loadGallery` and `getProjectStaticPaths` from `./page-data`.
- Import `toProjectCard`, `toProjectDetail` and `toGalleryEntry` from
  `./map/projects`.
- Import the types `ProjectCardData`, `ProjectPage` and `GalleryEntry`.
- Add the code below, and add `getProjects`, `getFeaturedProjects`,
  `getProject`, `getGallery` and `getProjectStaticPaths` to `sanitySource`.

```ts
/** Type guard for dropping the nulls a mapper returns for unlinkable rows. */
function isPresent<T>(value: T | null): value is T {
  return value !== null;
}

/* ── Projects + gallery ────────────────────────────────────────────────── */

async function getProjects(opts?: ContentOptions): Promise<ProjectCardData[]> {
  return (await loadProjects(opts)).map(toProjectCard).filter(isPresent);
}

async function getFeaturedProjects(
  opts?: ContentOptions,
): Promise<ProjectCardData[]> {
  return (await loadFeaturedProjects(opts))
    .map(toProjectCard)
    .filter(isPresent);
}

async function getProject(
  slug: string,
  opts?: ContentOptions,
): Promise<ProjectPage | null> {
  const raw = await loadProjectPage(slug, opts);
  if (!raw) return null;
  return {
    project: toProjectDetail(raw.project),
    relatedProjects: raw.relatedProjects.map(toProjectCard).filter(isPresent),
    ctaSection: toCtaSection(raw.defaultCtaSection),
  };
}

async function getGallery(opts?: ContentOptions): Promise<GalleryEntry[]> {
  return (await loadGallery(opts)).map(toGalleryEntry).filter(isPresent);
}
```

Extend the `index.ts` destructure with `getProjects`, `getFeaturedProjects`,
`getProject`, `getGallery` and `getProjectStaticPaths`.

- [ ] **Step 5: ProjectTemplate**

Replace the frontmatter with:

```astro
---
/**
 * ProjectTemplate — the /projects/[slug] page body, shared by the
 * prerendered public route and its SSR /preview twin so the two never
 * drift. Renders the ProjectPage view model from getProject() in
 * @/lib/content.
 */
import "@/styles/pages/projects.css";
import BaseLayout from "@/layouts/BaseLayout.astro";
import Section from "@/components/ui/Section.astro";
import Layout from "@/components/ui/Layout.astro";
import Grid from "@/components/ui/Grid.astro";
import Lightbox from "@/components/ui/Lightbox.astro";
import Heading from "@/components/ui/Heading.astro";
import Button from "@/components/ui/Button.astro";
import Visual from "@/components/ui/Visual.astro";
import FormattedDate from "@/components/ui/FormattedDate.astro";
import Quote from "@/components/ui/Quote.astro";
import SectionHeader from "@/components/ui/SectionHeader.astro";
import SwipeRow from "@/components/ui/SwipeRow.astro";
import ProjectCard from "@/components/ui/ProjectCard.astro";
import ContentCtaSection from "@/components/sections/ContentCtaSection.astro";
import Breadcrumbs from "@/components/ui/Breadcrumbs.astro";
import { SITE } from "@/config/site";
import { projectPath } from "@/lib/projects";
import {
  imageUrl,
  sizedImage,
  type CtaSectionData,
  type ProjectCardData,
  type ProjectDetail,
} from "@/lib/content";

interface Props {
  /**
   * **ProjectTemplate** — the project detail page. Pass the fields of
   * `getProject()`'s ProjectPage: `project`, `relatedProjects`, `ctaSection`.
   */
  docs?: string;

  /** The project to render. */
  project: ProjectDetail;

  /** Up to three "More projects" cards (same category first). */
  relatedProjects: ProjectCardData[];

  /** Bottom CTA section (the site default), or null for none. */
  ctaSection: CtaSectionData | null;
}

const { docs, project, relatedProjects, ctaSection } = Astro.props;

const { title, location, service, completed } = project;
const category = project.categoryLabel;
const path = projectPath(project.slug);
const hero = project.hero && sizedImage(project.hero, 1600);
const photos = project.photos.map(({ image, label }) => ({
  photo: sizedImage(image, 1200),
  large: sizedImage(image, 1600),
  label,
}));

/* The write-up (optional). Its plain text doubles as the SEO fallback. */
const writeUpHtml = project.descriptionHtml;
const quoteText = project.quote?.text;

const description =
  project.seoDescription ||
  project.descriptionText.slice(0, 155) ||
  `${title}${category ? `: a ${category.toLowerCase()} project` : ""} by ${SITE.name}.`;

const facts = [
  location && { label: "Location", value: location },
  service && { label: "Service", value: service },
].filter(Boolean) as { label: string; value: string }[];
/* The story section shows when there is a write-up or any fact to list. */
const hasStory = Boolean(writeUpHtml) || facts.length > 0 || Boolean(completed);
---
```

Make these markup changes:

- `data-lightbox-src={photoUrl(large)}` → `data-lightbox-src={imageUrl(large)}`
- `name={stegaClean(project.quote?.name) ?? undefined}` →
  `name={project.quote?.name ?? undefined}`
- `<Section render={related.length > 0}>` →
  `<Section render={relatedProjects.length > 0}>`
- `{related.map((card) => <ProjectCard project={card} />)}` →
  `{relatedProjects.map((card) => <ProjectCard project={card} />)}`
- `{ctaSection && <ContentCtaSection cta={ctaSection} />}` stays as written
  in Task 2. Delete the Task 2 `toCtaSection` import and the
  `const ctaSection = …` line, since `ctaSection` now comes from the props.

- [ ] **Step 6: Routes, listing pages, components**

Replace `src/pages/projects/[slug].astro` with:

```astro
---
/**
 * Public project page — PRERENDERED; slugs come from
 * getProjectStaticPaths(). Editors preview drafts via the SSR twin at
 * /preview/projects/[slug], which calls the same getProject() and template
 * with the draft perspective.
 */
import ProjectTemplate from "@/components/templates/ProjectTemplate.astro";
import { getProject, getProjectStaticPaths } from "@/lib/content";

// Must be an imported helper: Astro extracts getStaticPaths into its own
// module at build time, so frontmatter siblings are not in scope here.
export const getStaticPaths = getProjectStaticPaths;

const { slug } = Astro.params;
if (!slug) return Astro.redirect("/404");

const data = await getProject(slug);
if (!data) return Astro.redirect("/404");
---

<ProjectTemplate {...data} />
```

Replace `src/pages/preview/projects/[slug].astro` with:

```astro
---
/**
 * SSR PREVIEW twin of /projects/[slug] — iframed by Sanity Presentation for
 * draft preview. Same getProject() and template as the public route; only
 * the perspective differs (getDraftModeProps reads the Presentation cookie).
 *
 * Editor-only surface: robots-disallowed, noindexed, never edge-cached.
 * Keep this file in sync with src/pages/projects/[slug].astro.
 */
export const prerender = false;
import ProjectTemplate from "@/components/templates/ProjectTemplate.astro";
import { getProject } from "@/lib/content";
import { getDraftModeProps } from "@/sanity/lib/draft-mode";

const { slug } = Astro.params;
if (!slug) return Astro.redirect("/404");

const data = await getProject(slug, getDraftModeProps(Astro));
if (!data) return Astro.redirect("/404");
---

<ProjectTemplate {...data} />
```

In `src/pages/projects/index.astro`:

- Change the header to "/projects — every project, searchable and
  filterable by type (getProjects() in @/lib/content). Prerendered at build
  time; publishing in the Studio triggers a rebuild."
- Replace the `@/lib/projects`, `@/lib/project-format`, page-data and
  draft-mode imports with
  `import { getGallery, getProjects, sizedImage } from "@/lib/content";`.
- Replace the fetch block with:

```ts
const [projects, gallery] = await Promise.all([getProjects(), getGallery()]);
const thumbs = gallery.slice(0, 3).map((entry) => sizedImage(entry.image, 240));
```

In `src/pages/gallery.astro`:

- Change the header to "/gallery — every gallery photo (getGallery() in
  @/lib/content), filterable by category, with a click-to-enlarge lightbox.
  Prerendered; publishing in the Studio triggers a rebuild."
- Replace the `stegaClean`, `sanityPhoto`, `photoAlt`, page-data and
  draft-mode imports and the `PROJECT_CATEGORIES, categoryTitle` import with
  `import { PROJECT_CATEGORIES } from "@/config/projects";` and
  `import { getGallery, sizedImage } from "@/lib/content";`.
- Replace the `rows`/`items` block with:

```ts
const entries = await getGallery();

const items: GalleryItem[] = entries.map((entry) => ({
  id: entry.id,
  caption: entry.caption,
  category: entry.category,
  categoryLabel: entry.categoryLabel,
  location: entry.location,
  projectTitle: entry.projectTitle,
  thumb: sizedImage(entry.image, 640),
  full: sizedImage(entry.image, 1800),
}));
```

In `GalleryBrowser.astro`:

- Imports become `import { imageUrl, type ContentImage } from "@/lib/content";`.
- `data-lightbox-src={photoUrl(item.full)}` →
  `data-lightbox-src={imageUrl(item.full)}`.

In `ProjectCard.astro`:

- `import type { ProjectCardData } from "@/lib/projects";` →
  `import type { ProjectCardData } from "@/lib/content";`.
- Every "from `toProjectCard()`" / "`toProjectCard()` in
  src/lib/projects.ts" in the JSDoc becomes "from `getProjects()` /
  `getProject()` in `@/lib/content`".
- The `@example` becomes `<ProjectCard project={card} />`.

In `ProjectBrowser.astro`:

- Make the same type-import swap.
- "the array from `toProjectCards()`" and "already mapped with
  `toProjectCards()`" become "the cards from `getProjects()`".
- The `@example` becomes `<ProjectBrowser projects={projects} categories={PROJECT_CATEGORIES} />`.

In `components.astro`:

- The frontmatter comment at l.268-269 becomes "Hand-built sample data for
  the ProjectBrowser / GalleryBrowser demos — real pages get theirs from
  getProjects() / getGallery() in @/lib/content."
- In the rendered sentence near l.2221, "Real cards are built from Sanity
  with toProjectCards()." becomes "Real cards come from getProjects() in
  @/lib/content."

- [ ] **Step 7: Check, then compare (one expected diff)**

Run:

```bash
npm run check 2>&1 | tail -3 && npm run check:hover
KEEP_DEV_PAGES=1 npm run build && node scripts/compare-dist.mjs .parity/empty dist/client
```

Expected: `0 errors`. The comparison prints exactly one `DIFF
components/index.html`, and its window shows only the "Real cards…"
sentence. Re-baseline that one file:
`cp dist/client/components/index.html .parity/empty/components/index.html`.

Then run:

```bash
KEEP_DEV_PAGES=1 PARITY_FIXTURES=1 npm run build && node scripts/compare-dist.mjs .parity/fixtures dist/client
```

Expected: the same single `components/index.html` diff. Re-baseline:
`cp dist/client/components/index.html .parity/fixtures/components/index.html`,
then re-run the comparison and expect `Identical`. Fixture coverage:

- three project pages: photo labels, an odd photo count, a missing
  location/service/description, a quote without a name, and missing
  `heroImageMeta`
- `/projects` cards and gallery thumbs
- `/gallery`, with a null caption, an unlinked project, and an asset-less
  row that gets dropped
- `llms.txt` (still on raw rows until Task 8)

- [ ] **Step 8: Grep the removed names**

Run:

```bash
grep -rn "sanityPhoto\|toProjectCards\|toProjectCard\b\|photoUrl\|SanityPhoto" src .claude CLAUDE.md README.md docs | grep -v docs/superpowers
```

Expected: hits only in `src/sanity/lib/map/projects.ts` (`toProjectCard`)
and in the `sanity-and-preview` and `component-api` skill lines that Task
10 rewrites.

- [ ] **Step 9: Commit**

```bash
git add -A src
git commit -m "$(cat <<'EOF'
Move projects and gallery behind the content interface

getProjects/getProject/getFeaturedProjects/getGallery and the project
static paths come from @/lib/content. The mapping that lived in
src/lib/projects.ts (sanityPhoto, toProjectCard) moves to
src/sanity/lib/map/projects.ts; pages size images with sizedImage().

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Case studies

**Files:**

- Create: `src/sanity/lib/map/case-studies.ts`, `src/sanity/lib/map/seo.ts`
- Modify:
  - `src/lib/content/{types.ts,index.ts}`
  - `src/sanity/lib/{source.ts,page-data.ts}`
  - `src/components/templates/CaseStudyTemplate.astro`
  - `src/pages/case-studies/index.astro`
  - `src/pages/case-studies/[slug].astro`
  - `src/pages/preview/case-studies/[slug].astro`
  - `src/components/sections/CaseStudyFeatured.astro`
  - `src/components/ui/CaseStudyCard.astro`
  - `src/lib/jsonld.ts`
  - `src/pages/components.astro`: the demo `studies` data (l.3233-3254) and
    the rendered sentence above it.

**Interfaces:**

- Consumes:
  - `sanityImage` and `toCtaSection` (Task 2)
  - `isPresent` (Task 4)
  - `imageSrc` and `imageUrl` (Task 2)
  - `plainText` (Task 2)
- Produces:
  - Types `SeoFields`, `CaseStudySummary`, `CaseStudyDetail`,
    `CaseStudyPage` and `FeaturedCaseStudy`, plus a re-export of
    `ContentBlock`.
  - `getCaseStudies(opts?): Promise<CaseStudySummary[]>`
  - `getCaseStudy(slug, opts?): Promise<CaseStudyPage | null>`
  - `getFeaturedCaseStudies(slugs: readonly string[], opts?): Promise<FeaturedCaseStudy[]>`,
    which returns them in the order of `slugs`.
  - `getCaseStudyStaticPaths(): Promise<SlugPath[]>`
  - `toSeo(raw): SeoFields | null` and `RawSeo` in `map/seo.ts`; Task 6
    reuses them.
  - `contentImageUrl(image: ContentImage | null, siteUrl: string): string | null`,
    private to `jsonld.ts`; Task 6 reuses it.
  - `CaseStudyCard.description` widens to `string | null`.

- [ ] **Step 1: Record the hits**

Run:

```bash
grep -rln "urlFor\|hotspotPosition\|stegaClean\|loadQuery\|page-data\|draft-mode" src/components/templates/CaseStudyTemplate.astro src/pages/case-studies src/components/sections/CaseStudyFeatured.astro src/components/ui/CaseStudyCard.astro
```

Expected: all of them. Step 8 requires no output.

- [ ] **Step 2: Types and contract**

Append to `types.ts`, after the existing `import type { ImageMetadata }`
line:

```ts
import type { ContentBlock } from "@/components/case-study/types";
export type { ContentBlock };
```

Append these sections:

```ts
/* ── SEO ───────────────────────────────────────────────────────────────── */

/** Per-document SEO overrides; every field optional. */
export interface SeoFields {
  metaTitle: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: ContentImage | null;
}

/* ── Case studies ──────────────────────────────────────────────────────── */

/** A case study as a listing card renders it. */
export interface CaseStudySummary {
  slug: string;
  title: string;
  description: string | null;
  client: string | null;
  categories: string[];
  industries: string[];
  image: ContentImage | null;
  date: string | null;
  featured: boolean;
  /** Not published yet: the card links to `liveUrl` instead. */
  comingSoon: boolean;
  liveUrl: string | null;
}

/** Everything the case study detail page renders. */
export interface CaseStudyDetail {
  slug: string;
  /** Null only in an unfinished draft (the page shows a fallback). */
  title: string | null;
  description: string | null;
  client: string | null;
  categories: string[];
  industries: string[];
  image: ContentImage | null;
  date: string | null;
  updatedAt: string | null;
  featured: boolean;
  comingSoon: boolean;
  timeline: string | null;
  liveUrl: string | null;
  /** The hero slider. */
  gallery: ContentImage[];
  /** The flexible body, ready for CaseStudyBlockRenderer. */
  blocks: ContentBlock[];
  seo: SeoFields | null;
}

/** `getCaseStudy()`: the study, up to two "Up next" cards, the CTA section. */
export interface CaseStudyPage {
  study: CaseStudyDetail;
  upNext: CaseStudySummary[];
  ctaSection: CtaSectionData | null;
}

/** A card in the CaseStudyFeatured strip. */
export interface FeaturedCaseStudy {
  slug: string;
  client: string | null;
  description: string | null;
  image: ContentImage | null;
}
```

Add these to `ContentSource`:

```ts
  /** Every case study as a card, newest first (coming-soon included). */
  getCaseStudies(opts?: ContentOptions): Promise<CaseStudySummary[]>;
  /** One case study with "Up next" and its CTA section; null when not found. */
  getCaseStudy(
    slug: string,
    opts?: ContentOptions,
  ): Promise<CaseStudyPage | null>;
  /** The studies with these slugs, in this order (missing ones dropped). */
  getFeaturedCaseStudies(
    slugs: readonly string[],
    opts?: ContentOptions,
  ): Promise<FeaturedCaseStudy[]>;
  /** getStaticPaths for /case-studies/[slug] (coming-soon excluded). */
  getCaseStudyStaticPaths(): Promise<SlugPath[]>;
```

- [ ] **Step 3: Loaders**

In `page-data.ts`, import `CASE_STUDIES_QUERY` and
`FEATURED_CASE_STUDIES_QUERY`, then add:

```ts
/** Every case study (card fields), newest first. Empty on a fresh fork. */
export function loadCaseStudies(draftProps: DraftProps = {}) {
  return loadPageQuery({
    query: CASE_STUDIES_QUERY,
    draftProps,
    fallback: [],
    label: "case studies",
  });
}

/** The case studies with these slugs, in document order. */
export function loadFeaturedCaseStudies(
  slugs: readonly string[],
  draftProps: DraftProps = {},
) {
  return loadPageQuery({
    query: FEATURED_CASE_STUDIES_QUERY,
    params: { slugs: [...slugs] },
    draftProps,
    fallback: [],
    label: "featured case studies",
  });
}
```

- [ ] **Step 4: Mappers**

`src/sanity/lib/map/seo.ts`:

```ts
/**
 * Sanity `seo` object → SeoFields. Every field is cleaned: these only land
 * in meta tags, where Presentation draws no overlays.
 */
import { stegaClean } from "@sanity/client/stega";
import type { SeoFields } from "@/lib/content/types";
import { sanityImage, type SanityImageSource } from "./image";

/** The `seo { … }` projection BLOG_POST_QUERY and CASE_STUDY_QUERY share. */
export interface RawSeo {
  metaTitle: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: SanityImageSource;
}

export function toSeo(seo: RawSeo | null | undefined): SeoFields | null {
  if (!seo) return null;
  return {
    metaTitle: stegaClean(seo.metaTitle),
    metaDescription: stegaClean(seo.metaDescription),
    ogTitle: stegaClean(seo.ogTitle),
    ogDescription: stegaClean(seo.ogDescription),
    ogImage: sanityImage(seo.ogImage, ""),
  };
}
```

`src/sanity/lib/map/case-studies.ts`. The block mapping moves out of
`CaseStudyTemplate` unchanged, except that layout values are now cleaned:

```ts
/**
 * Sanity case-study rows → CaseStudySummary / CaseStudyDetail /
 * FeaturedCaseStudy, including the flexible `content[]` blocks mapped to
 * ContentBlock (the contract the case-study block components render) —
 * moved here from CaseStudyTemplate.
 *
 * Stega: slugs, categories, industries, URLs, dates, booleans, image
 * sources, alt text and every block layout value (spacing, max width,
 * aspect ratio, object-fit) are cleaned — an encoded "wide" is invalid CSS
 * and collapses the image wrapper in Presentation. Titles, descriptions,
 * client names, timelines and rich text stay encoded. Policy: ../source.ts.
 */
import { stegaClean } from "@sanity/client/stega";
import type {
  CASE_STUDIES_QUERY_RESULT,
  CASE_STUDY_QUERY_RESULT,
  FEATURED_CASE_STUDIES_QUERY_RESULT,
} from "@/sanity/sanity.types";
import type {
  CaseStudyDetail,
  CaseStudySummary,
  ContentBlock,
  FeaturedCaseStudy,
} from "@/lib/content/types";
import { urlFor, hotspotPosition } from "../image";
import { portableTextToHtml } from "../portable-text";
import { sanityImage } from "./image";
import { toSeo } from "./seo";

type RawCaseStudyCard = CASE_STUDIES_QUERY_RESULT[number];
type RawCaseStudy = NonNullable<CASE_STUDY_QUERY_RESULT>;
type RawBlock = NonNullable<RawCaseStudy["content"]>[number];
type RawFeatured = FEATURED_CASE_STUDIES_QUERY_RESULT[number];

const cleanList = (values: string[] | null | undefined) =>
  (values ?? []).map((v) => stegaClean(v));

/** A listing card, or null when it has no slug or title (nothing to list). */
export function toCaseStudySummary(
  c: RawCaseStudyCard,
): CaseStudySummary | null {
  const slug = stegaClean(c.slug);
  if (!slug || !c.title) return null;
  return {
    slug,
    title: c.title,
    description: c.description,
    client: c.client,
    categories: cleanList(c.categories),
    industries: cleanList(c.industries),
    image: sanityImage(c.image, c.imageAlt),
    date: stegaClean(c.date),
    featured: stegaClean(c.featured) ?? false,
    comingSoon: stegaClean(c.comingSoon) ?? false,
    liveUrl: stegaClean(c.liveUrl),
  };
}

export function toFeaturedCaseStudy(s: RawFeatured): FeaturedCaseStudy | null {
  const slug = stegaClean(s.slug);
  if (!slug) return null;
  return {
    slug,
    client: s.client,
    description: s.description,
    image: sanityImage(s.image, s.imageAlt),
  };
}

const imageUrlFn = (ref: string) => urlFor({ _ref: ref }).width(1920).url();
const hasImageSource = (value: any) =>
  Boolean(value?.asset?._ref || value?._ref || value?.asset?._id);

const resolveAspectRatio = (block: any, fallback: string) => {
  const custom = stegaClean(block.customAspectRatio);
  if (custom) return custom;
  const ratio = stegaClean(block.aspectRatio);
  if (ratio === "auto") return undefined;
  return ratio || fallback;
};

function toBlock(block: RawBlock): ContentBlock | null {
  const spacingProps = {
    sectionSpacing: stegaClean(block.sectionSpacing) || undefined,
    sectionSpacingTop: stegaClean(block.sectionSpacingTop) || undefined,
    sectionSpacingBottom: stegaClean(block.sectionSpacingBottom) || undefined,
  };

  switch (block._type) {
    case "richText":
      return {
        type: "richText",
        html: portableTextToHtml(block.body, imageUrlFn),
        maxWidth: stegaClean(block.maxWidth) || undefined,
        ...spacingProps,
      };
    case "richTextLeft":
      return {
        type: "richTextLeft",
        html: portableTextToHtml(block.body, imageUrlFn),
        maxWidth: stegaClean(block.maxWidth) || undefined,
        ...spacingProps,
      };
    case "richTextColumns":
      return {
        type: "richTextColumns",
        html: portableTextToHtml(block.body, imageUrlFn),
        ...spacingProps,
      };
    case "richTextWithImage":
      if (!hasImageSource(block.image)) return null;
      return {
        type: "richTextWithImage",
        html: portableTextToHtml(block.body, imageUrlFn),
        image: urlFor(block.image).width(1600).url(),
        imageAlt: stegaClean(block.imageAlt) || "",
        aspectRatio: resolveAspectRatio(block, "landscape"),
        transparent: block.transparent || false,
        objectFit: stegaClean(block.objectFit) || undefined,
        position: hotspotPosition(block.image),
        ...spacingProps,
      };
    case "fullWidthImage":
      if (!hasImageSource(block.image)) return null;
      return {
        type: "fullWidthImage",
        image: urlFor(block.image).width(2400).url(),
        imageAlt: stegaClean(block.imageAlt) || "",
        aspectRatio: resolveAspectRatio(block, "wide"),
        transparent: block.transparent || false,
        position: hotspotPosition(block.image),
        ...spacingProps,
      };
    case "imageGrid":
      return {
        type: "imageGrid",
        images: (block.images ?? [])
          .filter((img) => hasImageSource(img))
          .map((img) => ({
            src: urlFor(img).width(1400).url(),
            alt: stegaClean(img.alt || block.defaultAlt) || "",
            transparent: img.transparent || false,
            position: hotspotPosition(img),
          })),
        aspectRatio: resolveAspectRatio(block, "landscape"),
        ...spacingProps,
      };
    case "stats":
      return { type: "stats", items: block.items ?? [], ...spacingProps };
    default:
      return null;
  }
}

export function toCaseStudyDetail(s: RawCaseStudy): CaseStudyDetail {
  return {
    slug: stegaClean(s.slug) ?? "",
    title: s.title,
    description: s.description,
    client: s.client,
    categories: cleanList(s.categories),
    industries: cleanList(s.industries),
    image: sanityImage(s.image, s.imageAlt),
    date: stegaClean(s.date),
    updatedAt: s._updatedAt,
    featured: stegaClean(s.featured) ?? false,
    comingSoon: stegaClean(s.comingSoon) ?? false,
    timeline: s.timeline,
    liveUrl: stegaClean(s.liveUrl),
    gallery: (s.galleryImages ?? []).flatMap((img) => {
      const image = sanityImage(img, img.alt || s.galleryImagesAlt || "");
      return image ? [image] : [];
    }),
    blocks: (s.content ?? [])
      .map(toBlock)
      .filter(
        (block): block is ContentBlock =>
          block !== null &&
          (block.type !== "imageGrid" || block.images.length > 0),
      ),
    seo: toSeo(s.seo),
  };
}
```

- [ ] **Step 5: Source functions**

In `src/sanity/lib/source.ts`:

- Import `loadCaseStudies`, `loadCaseStudyPage`, `loadFeaturedCaseStudies`
  and `getCaseStudyStaticPaths` from `./page-data`.
- Import the three mappers from `./map/case-studies`.
- Import the types `CaseStudySummary`, `CaseStudyPage` and
  `FeaturedCaseStudy`.
- Add the code below, and list `getCaseStudies`, `getCaseStudy`,
  `getFeaturedCaseStudies` and `getCaseStudyStaticPaths` in `sanitySource`
  and in the `index.ts` destructure.

```ts
/* ── Case studies ──────────────────────────────────────────────────────── */

async function getCaseStudies(
  opts?: ContentOptions,
): Promise<CaseStudySummary[]> {
  return (await loadCaseStudies(opts))
    .map(toCaseStudySummary)
    .filter(isPresent);
}

async function getCaseStudy(
  slug: string,
  opts?: ContentOptions,
): Promise<CaseStudyPage | null> {
  const raw = await loadCaseStudyPage(slug, opts);
  if (!raw) return null;
  const study = toCaseStudyDetail(raw.study);
  const upNext = raw.allStudies
    .map(toCaseStudySummary)
    .filter(isPresent)
    .filter((entry) => entry.slug !== study.slug && entry.image)
    .slice(0, 2);
  return {
    study,
    upNext,
    ctaSection: toCtaSection(
      raw.study.ctaSectionOverride ?? raw.defaultCtaSection,
    ),
  };
}

async function getFeaturedCaseStudies(
  slugs: readonly string[],
  opts?: ContentOptions,
): Promise<FeaturedCaseStudy[]> {
  const found = (await loadFeaturedCaseStudies(slugs, opts))
    .map(toFeaturedCaseStudy)
    .filter(isPresent);
  // GROQ returns document order; the caller asked for this order.
  return slugs
    .map((slug) => found.find((s) => s.slug === slug))
    .filter((s): s is FeaturedCaseStudy => s !== undefined);
}
```

- [ ] **Step 6: CaseStudyTemplate**

Replace the frontmatter with:

```astro
---
/**
 * Case Study Template
 *
 * Renders a case study detail page from the CaseStudyPage view model
 * (getCaseStudy() in @/lib/content): the study, its "Up next" cards and the
 * resolved CTA section. Shared by the prerendered route
 * (src/pages/case-studies/[slug].astro) and its /preview twin.
 */
import BaseLayout from "@/layouts/BaseLayout.astro";
import ContentCtaSection from "@/components/sections/ContentCtaSection.astro";
import Section from "@/components/ui/Section.astro";
import Layout from "@/components/ui/Layout.astro";
import Grid from "@/components/ui/Grid.astro";
import Heading from "@/components/ui/Heading.astro";
import Text from "@/components/ui/Text.astro";
import Visual from "@/components/ui/Visual.astro";
import Button from "@/components/ui/Button.astro";
import Slider from "@/components/ui/Slider.astro";
import CaseStudyCard from "@/components/ui/CaseStudyCard.astro";
import CaseStudyBlockRenderer from "@/components/case-study/CaseStudyBlockRenderer.astro";
import { caseStudyJsonLd } from "@/lib/jsonld";
import JsonLd from "@/components/global/JsonLd.astro";
import {
  imageSrc,
  imageUrl,
  type CaseStudyDetail,
  type CaseStudySummary,
  type CtaSectionData,
} from "@/lib/content";

import "@/styles/pages/case-study-detail.css";

interface Props {
  /**
   * **CaseStudyTemplate** — the case study detail page. Pass the fields of
   * `getCaseStudy()`'s CaseStudyPage: `study`, `upNext`, `ctaSection`.
   */
  docs?: string;

  /** The case study to render. */
  study: CaseStudyDetail;

  /** Up to two "Up next" cards (other studies with an image, newest first). */
  upNext: CaseStudySummary[];

  /** Bottom CTA section (the study's override, else the site default), or null. */
  ctaSection: CtaSectionData | null;
}

const { docs, study, upNext, ctaSection } = Astro.props;

const siteOrigin = Astro.site!.toString().replace(/\/$/, "");
const jsonLd = caseStudyJsonLd(study, siteOrigin);

const seo = study.seo;
const metaTitle = seo?.metaTitle || study.title || "Case Study";
const metaDescription =
  seo?.metaDescription || study.description || "Preview this case study draft.";
const ogTitle = seo?.ogTitle || metaTitle;
const ogDescription = seo?.ogDescription || metaDescription;
const ogImageUrl = imageUrl(seo?.ogImage ?? study.image, {
  width: 1200,
  height: 630,
  format: "jpg",
});
---
```

Make these markup changes:

- `{categories.map((cat: string) => (` → `{study.categories.map((cat) => (`
- In the slider:
  `galleryImages.map((img) => (<Visual src={urlFor(img).width(1400).url()} alt={img.alt || study.galleryImagesAlt || ""} position={hotspotPosition(img)} />))`
  →
  `study.gallery.map((img) => (<Visual src={imageSrc(img, { width: 1400 })} alt={img.alt} position={img.position} />))`
- `{contentBlocks.map((block) => <CaseStudyBlockRenderer block={block} />)}`
  → `{study.blocks.map((block) => <CaseStudyBlockRenderer block={block} />)}`
- `{resolvedCtaSection && <ContentCtaSection cta={resolvedCtaSection} />}`
  → `{ctaSection && <ContentCtaSection cta={ctaSection} />}`
- `upNextStudies.length > 0 &&` → `upNext.length > 0 &&`, and the card map
  becomes:

```astro
{
  upNext.map(
    (entry) =>
      entry.image && (
        <CaseStudyCard
          title={entry.title}
          description={entry.description}
          categories={entry.categories}
          href={`/case-studies/${entry.slug}`}
          image={imageSrc(entry.image, { width: 1200 })}
          imageAlt={entry.image.alt}
          imagePosition={entry.image.position}
          date={entry.date ?? undefined}
        />
      ),
  )
}
```

- [ ] **Step 7: Routes, listing, featured strip, card, JSON-LD, demo**

**`src/pages/case-studies/[slug].astro`** (full file):

```astro
---
/**
 * Public case study page — PRERENDERED. getCaseStudyStaticPaths() already
 * excludes coming-soon studies, so they never build here (no page that
 * redirects to /404). Editors preview them via the SSR twin at
 * /preview/case-studies/[slug], which calls the same getCaseStudy().
 */
import CaseStudyTemplate from "@/components/templates/CaseStudyTemplate.astro";
import { getCaseStudy, getCaseStudyStaticPaths } from "@/lib/content";

// Must be an imported helper: Astro extracts getStaticPaths into its own
// module at build time, so frontmatter siblings are not in scope here.
export const getStaticPaths = getCaseStudyStaticPaths;

const { slug } = Astro.params;
if (!slug) return Astro.redirect("/404");

const data = await getCaseStudy(slug);
if (!data || data.study.comingSoon) return Astro.redirect("/404");
---

<CaseStudyTemplate {...data} />
```

**`src/pages/preview/case-studies/[slug].astro`** (full file):

```astro
---
/**
 * SSR PREVIEW twin of /case-studies/[slug] — iframed by Sanity Presentation
 * for draft preview. Same getCaseStudy() and template as the public route;
 * only the perspective differs. Coming-soon studies ARE viewable here
 * (they're excluded from the public build on purpose) so editors can
 * preview them.
 *
 * Editor-only surface: robots-disallowed, noindexed, never edge-cached.
 * Keep this file in sync with src/pages/case-studies/[slug].astro.
 */
export const prerender = false;
import CaseStudyTemplate from "@/components/templates/CaseStudyTemplate.astro";
import { getCaseStudy } from "@/lib/content";
import { getDraftModeProps } from "@/sanity/lib/draft-mode";

const { slug } = Astro.params;
if (!slug) return Astro.redirect("/404");

const data = await getCaseStudy(slug, getDraftModeProps(Astro));
if (!data) return Astro.redirect("/404");
---

<CaseStudyTemplate {...data} />
```

**`src/pages/case-studies/index.astro`:**

- The header line "Content is fetched from Sanity CMS. Filter dropdown
  options…" becomes "Content comes from getCaseStudies() in @/lib/content.
  Filter dropdown options…".
- Replace the Sanity imports (`loadPageQuery`, `getDraftModeProps`,
  `CASE_STUDIES_QUERY`, `urlFor`, `hotspotPosition`, `stegaClean`) and the
  Task 2 `getCtaDefaults` import with
  `import { getCaseStudies, getCtaDefaults, imageSrc } from "@/lib/content";`.
- Replace the fetch and option blocks with:

```ts
/* ── Content (newest first, as the source returns it) ── */

const [sortedCaseStudies, ctaDefaults] = await Promise.all([
  getCaseStudies(),
  getCtaDefaults(),
]);
const defaultCtaSection = ctaDefaults.ctaSection;

/* ── Derive filter options from actual data ── */

const industryOptions = [
  ...new Set(sortedCaseStudies.flatMap((s) => s.industries)),
].sort((a, b) => a.localeCompare(b));

const categoryOptions = [
  ...new Set(sortedCaseStudies.flatMap((s) => s.categories)),
].sort((a, b) => a.localeCompare(b));
```

The card map becomes:

```astro
sortedCaseStudies.map( (study) => study.image && (
<CaseStudyCard
  data-prevent-flicker="true"
  data-fade-in
  title={study.title}
  description={study.description}
  categories={study.categories}
  industries={study.industries}
  client={study.client ?? undefined}
  href={`/case-studies/${study.slug}`}
  image={imageSrc(study.image, { width: 1200 })}
  imageAlt={study.image.alt}
  imagePosition={study.image.position}
  date={study.date ?? undefined}
  featured={study.featured}
  comingSoon={study.comingSoon}
  externalUrl={study.liveUrl ?? undefined}
/>
), )
```

**`CaseStudyFeatured.astro`:**

- Delete the `loadQuery`, `FEATURED_CASE_STUDIES_QUERY`,
  `getDraftModeProps` and `urlFor` imports.
- Add
  `import { getFeaturedCaseStudies, imageSrc, type FeaturedCaseStudy } from "@/lib/content";`.
- Change the `studies` prop to `studies?: FeaturedCaseStudy[];`. Its JSDoc
  becomes: "Pre-fetched featured studies (`getFeaturedCaseStudies()` from
  `@/lib/content`). With three or more, the component skips its own lookup
  — use this to parallelize fetches at the page level. Each needs `slug`,
  `client`, `description` and `image` (a ContentImage). Must be in display
  order (the first renders as the expanded card)."
- In the docs block, "(skips internal Sanity fetch when provided)" becomes
  "(skips the internal lookup when provided)".
- Replace the whole "Resolve studies" block with:

```ts
/* ── Resolve studies — the prop, or look the slugs up ─────────────────── */

const displayStudies: FeaturedCaseStudy[] =
  studies && studies.length >= 3
    ? studies
    : // Standalone usage. Tolerate an empty/unreachable dataset — the
      // section simply doesn't render when fewer than 3 resolve.
      await getFeaturedCaseStudies(slugs).catch(() => []);
```

- In the markup:
  - `displayStudies.map((study: any, i: number) =>` →
    `displayStudies.map((study, i) =>`
  - Replace the `<Visual src={typeof study.image === "string" ? … } alt={study.imageAlt} … />`
    with:

```astro
{
  study.image && (
    <Visual
      src={imageSrc(study.image, { width: 1200 })}
      alt={study.image.alt}
      width={1200}
      height={800}
      radius="large"
    />
  )
}
```

**`CaseStudyCard.astro`:**

- Replace `import { stegaClean } from "@sanity/client/stega";` with
  `import { plainText } from "@/lib/content";`.
- The `description` member becomes
  `/** Short project excerpt — clamped at 3 lines. Null renders no text. */ description: string | null;`.
- In the markup, replace each of the five `stegaClean(` calls with
  `plainText(`.

**`src/lib/jsonld.ts`:**

- Add `import { imageUrl, type CaseStudyDetail, type ContentImage } from "@/lib/content";`.
- Add this below `toImageUrl`:

```ts
/** Absolute URL of a content image at 1200 wide — CDN URLs pass through,
    local paths get the site origin. */
function contentImageUrl(
  image: ContentImage | null,
  siteUrl: string,
): string | null {
  const url = imageUrl(image, { width: 1200 });
  return url ? absoluteUrl(siteUrl, url) : null;
}
```

- In `caseStudyJsonLd`:
  - Change the signature to `(cs: CaseStudyDetail, siteUrl: string)`.
  - `toImageUrl(cs.image, siteUrl)` → `contentImageUrl(cs.image, siteUrl)`.
  - `toIsoDateTime(cs._updatedAt)` → `toIsoDateTime(cs.updatedAt)`.

**`components.astro`:**

- In each of the three `CaseStudyFeatured` demo `studies` entries, replace
  the two lines `image: "/images/og-image.png",` and
  `imageAlt: "Placeholder — case study",` with
  `image: { src: "/images/og-image.png", alt: "Placeholder — case study" },`.
- In the sentence above the demo, "Pass image as a string URL — an imported
  asset would be handed to urlFor() and throw." becomes "Each image is a
  ContentImage: a URL string or an imported asset as src, plus alt."

- [ ] **Step 8: Verify (one expected diff), then commit**

Run:

```bash
grep -rln "urlFor\|hotspotPosition\|stegaClean\|loadQuery\|page-data\|draft-mode" src/components/templates/CaseStudyTemplate.astro src/pages/case-studies src/components/sections/CaseStudyFeatured.astro src/components/ui/CaseStudyCard.astro
npm run check 2>&1 | tail -3 && npm run check:hover
KEEP_DEV_PAGES=1 npm run build && node scripts/compare-dist.mjs .parity/empty dist/client
```

Expected:

- The grep prints nothing.
- `0 errors`.
- The comparison shows exactly one `DIFF components/index.html`, and its
  window shows only the CaseStudyFeatured sentence.

Re-baseline that one file, then repeat for the fixtures build:

```bash
cp dist/client/components/index.html .parity/empty/components/index.html
KEEP_DEV_PAGES=1 PARITY_FIXTURES=1 npm run build && node scripts/compare-dist.mjs .parity/fixtures dist/client
cp dist/client/components/index.html .parity/fixtures/components/index.html
node scripts/compare-dist.mjs .parity/fixtures dist/client
```

Expected: the fixtures comparison shows the same single `components/index.html`
diff, and after the copy the last comparison prints `Identical`. Fixture
coverage:

- `case-study-one`: every block type plus two dropped ones, gallery alt
  fallback, an override CTA, and Up next including the coming-soon study
- `case-study-two` and `case-study-three`: minimal and null fields
- the index filters
- the homepage `CaseStudyFeatured`

```bash
git add -A src
git commit -m "$(cat <<'EOF'
Move case studies behind the content interface

getCaseStudies/getCaseStudy/getFeaturedCaseStudies and the case-study
static paths come from @/lib/content. The ContentBlock mapping moves
from CaseStudyTemplate into src/sanity/lib/map/case-studies.ts (layout
values now stega-cleaned); CaseStudyCard uses plainText(); JSON-LD reads
CaseStudyDetail.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Blog post detail and BlogBody

**Files:**

- Create: `src/sanity/lib/map/blog.ts`, `src/components/blog/BlogBody.astro`
- Modify:
  - `src/lib/content/{types.ts,index.ts}`
  - `src/sanity/lib/{source.ts,page-data.ts,portable-text.ts}`
  - `src/lib/read-time.ts`
  - `src/lib/toc.ts` (header comment)
  - `src/lib/jsonld.ts`
  - `src/components/templates/BlogPostTemplate.astro`
  - `src/components/sections/BlogPostGrid.astro`
  - `src/pages/blog/[slug].astro`
  - `src/pages/preview/blog/[slug].astro`

**Interfaces:**

- Consumes:
  - `toBlogCta` and `toCtaSection` (Task 2)
  - `toSeo` (Task 5)
  - `sanityImage` (Task 2)
  - `isPresent` (Task 4)
  - `contentImageUrl` (Task 5)
  - `portableTextToPlainText` (Task 1)
- Produces:
  - Types `BlogPostSummary`, `BlogBodyContent`, `FaqItem`,
    `BlogPostDetail` and `BlogPostPage`, plus a re-export of `TocItem`.
  - `getBlogPost(slug, opts?): Promise<BlogPostPage | null>`
  - `getBlogPostStaticPaths(): Promise<SlugPath[]>`
  - `toBlogPostSummary(raw: RawPostCard): BlogPostSummary | null` and
    `toBlogPostDetail(raw: RawPost): BlogPostDetail`
  - `loadBlogPostDocument(slug, draftProps?)` in `page-data.ts`
  - `portableTextWords(blocks): string`
  - `estimateReadTime(text: string, wordsPerMinute?: number): number`.
    This is a new signature: it now takes text.
  - `<BlogBody body={BlogBodyContent} />`
  - `BlogPostGrid.posts` becomes `BlogPostSummary[]`.

- [ ] **Step 1: Record the hits**

Run:

```bash
grep -rln "urlFor\|astro-portabletext\|page-data\|stega\|@/sanity" src/components/templates/BlogPostTemplate.astro src/pages/blog/\[slug\].astro src/lib/jsonld.ts src/lib/read-time.ts
```

Expected: all four. Step 9 requires no output.

- [ ] **Step 2: Types and contract**

Append to `types.ts`, below the `ImageMetadata` import:

```ts
import type { MDXInstance } from "astro";
import type { TocItem } from "@/lib/toc";
export type { TocItem };

/** A compiled MDX body's `Content` component. */
type MdxContent = MDXInstance<Record<string, never>>["Content"];
```

Then append these sections:

```ts
/* ── Blog ──────────────────────────────────────────────────────────────── */

/** A post as a card or listing renders it. */
export interface BlogPostSummary {
  slug: string;
  title: string;
  description: string | null;
  categories: string[];
  /** The listing section a post belongs to; else its first category. */
  primaryCategory: string | null;
  image: ContentImage | null;
  author: string | null;
  authorAvatar: ContentImage | null;
  date: string | null;
  featured: boolean;
}

/**
 * A post body in whatever form its backend keeps it; `<BlogBody>` renders
 * either. Portable Text blocks arrive with each h2 carrying `_slug`.
 */
export type BlogBodyContent =
  | { kind: "portable-text"; blocks: Array<{ _type: string; _key?: string }> }
  | { kind: "mdx"; Content: MdxContent };

/** One FAQ under a post. */
export interface FaqItem {
  question: string | null;
  /** The answer, rendered to HTML. */
  answerHtml: string;
  /** The answer as plain text (JSON-LD). */
  answerText: string;
}

/** Everything the blog post page renders. */
export interface BlogPostDetail {
  slug: string;
  /** Null only in an unfinished draft. */
  title: string | null;
  description: string | null;
  categories: string[];
  image: ContentImage | null;
  author: string | null;
  authorAvatar: ContentImage | null;
  date: string | null;
  updatedAt: string | null;
  featured: boolean;
  /** A YouTube or Vimeo URL shown instead of the hero image. */
  video: string | null;
  body: BlogBodyContent;
  /** The h2s, for the table of contents. */
  headings: TocItem[];
  /** Minutes, at least 1. */
  readTime: number;
  faqs: FaqItem[];
  seo: SeoFields | null;
}

/** `getBlogPost()`: the post, related posts and the resolved CTAs. */
export interface BlogPostPage {
  post: BlogPostDetail;
  /** Same-category posts, newest first (the template takes three). */
  relatedPosts: BlogPostSummary[];
  /** Editor-picked related posts. */
  manualRelatedPosts: BlogPostSummary[];
  /** The post's CTA override, else the site default. */
  cta: BlogCtaData | null;
  /** The post's CTA-section override, else the site default. */
  ctaSection: CtaSectionData | null;
}
```

Add these to `ContentSource`:

```ts
  /** One post with related posts and resolved CTAs; null when not found. */
  getBlogPost(slug: string, opts?: ContentOptions): Promise<BlogPostPage | null>;
  /** getStaticPaths for /blog/[slug]. */
  getBlogPostStaticPaths(): Promise<SlugPath[]>;
```

- [ ] **Step 3: Read time and Portable Text words**

Replace `src/lib/read-time.ts` entirely:

```ts
/**
 * Estimate read time in minutes from a body's plain text, at 225 words per
 * minute (average adult reading pace), rounded up, minimum 1.
 *
 * Each content source extracts the text from its own format and cleans any
 * editor encoding first (the Sanity source joins Portable Text spans with
 * portableTextWords()), so this stays format-agnostic.
 */
export function estimateReadTime(text: string, wordsPerMinute = 225): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return Math.max(1, Math.ceil(words.length / wordsPerMinute));
}
```

Append to `src/sanity/lib/portable-text.ts`:

```ts
/**
 * Every span's text in text blocks, each preceded by a space — the word
 * source for read time (estimateReadTime in src/lib/read-time.ts). Joining
 * spans with a space (not "") is deliberate: it is how read time has
 * always been counted.
 */
export function portableTextWords(
  blocks: readonly unknown[] | null | undefined,
): string {
  let text = "";
  for (const node of blocks ?? []) {
    const block = node as PortableTextBlock | null;
    if (block?._type !== "block" || !Array.isArray(block.children)) continue;
    for (const child of block.children) {
      if (child?._type === "span" && typeof child.text === "string")
        text += " " + child.text;
    }
  }
  return text;
}
```

In `src/lib/toc.ts`, add this header above `slugifyHeading`:

```ts
/**
 * Table-of-contents helpers. `slugifyHeading` and `TocItem` are
 * format-agnostic; `buildToc` walks Portable Text (the Sanity content
 * source calls it to id each h2 and collect the headings).
 */
```

- [ ] **Step 4: page-data, mapper, source**

In `page-data.ts`:

- Delete `mapPostCard`, the `PostCard` type, the `urlFor` import and the
  `RELATED_BLOG_POSTS_QUERY_RESULT` type import.
- Add `loadBlogPostDocument`, and make `loadBlogPostPage` return raw rows:

```ts
/** One blog post document by slug (BLOG_POST_QUERY), or null. */
export async function loadBlogPostDocument(
  slug: string,
  draftProps: DraftProps = {},
) {
  const { data } = await loadQuery({
    query: BLOG_POST_QUERY,
    params: { slug },
    ...draftProps,
  });
  return data;
}

export async function loadBlogPostPage(
  slug: string,
  draftProps: DraftProps = {},
) {
  const post = await loadBlogPostDocument(slug, draftProps);
  if (!post) return null;

  // Editor-picked related posts; dangling references dropped.
  const manualRelatedPosts = (post.relatedPosts ?? []).filter((p) => p?.slug);

  // Cleaned + lowercased for the case-insensitive GROQ category match
  // (stega characters would break the match in preview).
  const categories = (post.categories ?? []).map((c) =>
    stegaClean(c).toLowerCase(),
  );
  const excludeSlugs = manualRelatedPosts.map((p) => stegaClean(p.slug));

  const [{ data: related }, { data: settings }] = await Promise.all([
    loadQuery({
      query: RELATED_BLOG_POSTS_QUERY,
      params: { slug, categories, excludeSlugs },
      ...draftProps,
    }),
    loadQuery({ query: SITE_SETTINGS_QUERY, ...draftProps }),
  ]);

  return {
    post,
    relatedPosts: related ?? [],
    manualRelatedPosts,
    defaultCta: settings?.defaultBlogCta ?? null,
    defaultCtaSection: settings?.defaultCtaSection ?? null,
  };
}
```

`src/sanity/lib/map/blog.ts`:

```ts
/**
 * Sanity blog rows → BlogPostSummary / BlogPostDetail
 * (src/lib/content/types.ts).
 *
 * The body stays Portable Text — BlogBody renders it with the components in
 * src/components/portabletext/ — with each h2 given an id for the table of
 * contents. FAQ answers are rendered to HTML here. Derived text (FAQ answer
 * text for JSON-LD, the words behind `readTime`) is cleaned. Policy:
 * ../source.ts.
 */
import { stegaClean } from "@sanity/client/stega";
import type {
  BLOG_POST_QUERY_RESULT,
  RELATED_BLOG_POSTS_QUERY_RESULT,
} from "@/sanity/sanity.types";
import type { BlogPostDetail, BlogPostSummary } from "@/lib/content/types";
import { buildToc } from "@/lib/toc";
import { estimateReadTime } from "@/lib/read-time";
import {
  portableTextToHtml,
  portableTextToPlainText,
  portableTextWords,
} from "../portable-text";
import { sanityImage } from "./image";
import { toSeo } from "./seo";

/**
 * A post in card shape. RELATED_BLOG_POSTS_QUERY, BLOG_POSTS_BY_CATEGORY,
 * BLOG_POST_QUERY's relatedPosts[] and (with primaryCategory)
 * BLOG_POSTS_QUERY all project these fields.
 */
export type RawPostCard = RELATED_BLOG_POSTS_QUERY_RESULT[number] & {
  primaryCategory?: string | null;
};
export type RawPost = NonNullable<BLOG_POST_QUERY_RESULT>;

/** A card, or null when it has no slug or title (nothing to list). */
export function toBlogPostSummary(p: RawPostCard): BlogPostSummary | null {
  const slug = stegaClean(p.slug);
  if (!slug || !p.title) return null;
  return {
    slug,
    title: p.title,
    description: p.description,
    categories: (p.categories ?? []).map((c) => stegaClean(c)),
    primaryCategory: stegaClean(p.primaryCategory) ?? null,
    image: sanityImage(p.image, p.imageAlt),
    author: p.author,
    authorAvatar: sanityImage(p.authorAvatar, p.author),
    date: stegaClean(p.date),
    featured: stegaClean(p.featured) ?? false,
  };
}

export function toBlogPostDetail(post: RawPost): BlogPostDetail {
  const { body, items: headings } = buildToc(post.body ?? []);
  return {
    slug: stegaClean(post.slug) ?? "",
    title: post.title,
    description: post.description,
    categories: (post.categories ?? []).map((c) => stegaClean(c)),
    image: sanityImage(post.image, post.imageAlt),
    author: post.author,
    authorAvatar: sanityImage(post.authorAvatar, post.author),
    date: stegaClean(post.date),
    updatedAt: post._updatedAt,
    featured: stegaClean(post.featured) ?? false,
    video: stegaClean(post.video),
    body: { kind: "portable-text", blocks: body },
    headings,
    readTime: estimateReadTime(stegaClean(portableTextWords(post.body))),
    faqs: (post.faqs ?? []).map((faq) => ({
      question: faq.question,
      answerHtml: portableTextToHtml(faq.answer),
      answerText: stegaClean(portableTextToPlainText(faq.answer)),
    })),
    seo: toSeo(post.seo),
  };
}
```

In `src/sanity/lib/source.ts`:

- Import `loadBlogPostPage` and `getBlogPostStaticPaths` from
  `./page-data`, `toBlogPostDetail` and `toBlogPostSummary` from
  `./map/blog`, and the type `BlogPostPage`.
- Add the function below, and list `getBlogPost` and
  `getBlogPostStaticPaths` in `sanitySource` and in the `index.ts`
  destructure.

```ts
/* ── Blog ──────────────────────────────────────────────────────────────── */

async function getBlogPost(
  slug: string,
  opts?: ContentOptions,
): Promise<BlogPostPage | null> {
  const raw = await loadBlogPostPage(slug, opts);
  if (!raw) return null;
  return {
    post: toBlogPostDetail(raw.post),
    relatedPosts: raw.relatedPosts.map(toBlogPostSummary).filter(isPresent),
    manualRelatedPosts: raw.manualRelatedPosts
      .map(toBlogPostSummary)
      .filter(isPresent),
    cta: toBlogCta(raw.post.ctaOverride ?? raw.defaultCta),
    ctaSection: toCtaSection(
      raw.post.ctaSectionOverride ?? raw.defaultCtaSection,
    ),
  };
}
```

Run: `npm run check 2>&1 | tail -3`

Expected: `0 errors`. Errors in the template are fine at this point;
Steps 5 and 6 fix them.

- [ ] **Step 5: BlogBody**

`src/components/blog/BlogBody.astro`:

```astro
---
/**
 * BlogBody — renders a blog post's body, whichever form the content source
 * hands over (`post.body` from `getBlogPost()` in `@/lib/content`):
 *
 * - `portable-text` — Sanity Portable Text, rendered by astro-portabletext
 *   with the components in src/components/portabletext/ (code, images,
 *   video, callouts, inline blog CTAs, links, and h2 anchors for the table
 *   of contents).
 * - `mdx` — a compiled MDX `Content` component (files-backed content).
 *
 * It emits only the body markup. The caller owns the wrapping prose element
 * (`blog_post_prose u-rich-text` in BlogPostTemplate).
 */
import { PortableText } from "astro-portabletext";
import type { BlogBodyContent } from "@/lib/content";

const { default: CodeBlock } =
  await import("@/components/portabletext/CodeBlock.astro");
const { default: SanityImage } =
  await import("@/components/portabletext/SanityImage.astro");
const { default: LinkMark } =
  await import("@/components/portabletext/LinkMark.astro");
const { default: InternalLinkMark } =
  await import("@/components/portabletext/InternalLinkMark.astro");
const { default: BlockHeading2 } =
  await import("@/components/portabletext/BlockHeading2.astro");
const { default: VideoEmbed } =
  await import("@/components/portabletext/VideoEmbed.astro");
const { default: Callout } =
  await import("@/components/portabletext/Callout.astro");
const { default: BlogCtaInline } =
  await import("@/components/portabletext/BlogCtaInline.astro");

interface Props {
  /**
   * **BlogBody** — renders `post.body` (Portable Text or MDX) from
   * `getBlogPost()`. It emits no wrapper element; put it inside the prose
   * container.
   */
  docs?: string;

  /** The post body from `@/lib/content` (`post.body`). */
  body: BlogBodyContent;
}

const { docs, body } = Astro.props;

const portableTextComponents = {
  type: {
    code: CodeBlock,
    image: SanityImage,
    videoEmbed: VideoEmbed,
    callout: Callout,
    blogCtaInline: BlogCtaInline,
  },
  mark: {
    link: LinkMark,
    internalLink: InternalLinkMark,
  },
  block: {
    h2: BlockHeading2,
  },
};

/* A component reference for the MDX branch. It must be a capitalised
   identifier: Astro treats a lowercase tag such as `body.Content` as an
   HTML element. */
const Content = body.kind === "mdx" ? body.Content : null;
---

{
  body.kind === "portable-text" && (
    <PortableText value={body.blocks} components={portableTextComponents} />
  )
}
{Content && <Content />}
```

- [ ] **Step 6: BlogPostTemplate**

Replace the frontmatter with:

```astro
---
/**
 * Blog Post Template
 *
 * Renders a single blog post from the BlogPostPage view model
 * (getBlogPost() in @/lib/content): the post, its related posts and the
 * resolved CTA + CTA section. Shared by the prerendered route
 * (src/pages/blog/[slug].astro) and its /preview twin.
 */

import BaseLayout from "@/layouts/BaseLayout.astro";
import Section from "@/components/ui/Section.astro";
import Layout from "@/components/ui/Layout.astro";
import ContentCtaSection from "@/components/sections/ContentCtaSection.astro";
import AdditionalPost from "@/components/sections/BlogPostGrid.astro";

import Heading from "@/components/ui/Heading.astro";
import Text from "@/components/ui/Text.astro";
import FormattedDate from "@/components/ui/FormattedDate.astro";
import Visual from "@/components/ui/Visual.astro";
import Overlay from "@/components/ui/Overlay.astro";
import Card from "@/components/ui/Card.astro";
import Button from "@/components/ui/Button.astro";
import Accordion from "@/components/ui/Accordion.astro";
import AccordionItem from "@/components/ui/AccordionItem.astro";
import TableOfContents from "@/components/ui/TableOfContents.astro";
import BlogCta from "@/components/blog/BlogCta.astro";
import BlogBody from "@/components/blog/BlogBody.astro";

import "@/styles/pages/blog-post.css";

import ctaImage from "@/assets/placeholder-images/ai-first-starter-17.webp";

import { blogPostJsonLd } from "@/lib/jsonld";
import JsonLd from "@/components/global/JsonLd.astro";
import {
  imageSrc,
  imageUrl,
  type BlogCtaData,
  type BlogPostDetail,
  type BlogPostSummary,
  type CtaSectionData,
} from "@/lib/content";

interface Props {
  /**
   * **BlogPostTemplate** — the blog post page. Pass the fields of
   * `getBlogPost()`'s BlogPostPage: `post`, `relatedPosts`,
   * `manualRelatedPosts`, `cta`, `ctaSection`.
   */
  docs?: string;

  /** The post to render. */
  post: BlogPostDetail;

  /** Same-category posts for "Other posts in this category". */
  relatedPosts: BlogPostSummary[];

  /** Editor-picked posts for "Related Posts". */
  manualRelatedPosts: BlogPostSummary[];

  /** End-of-post CTA (the post's override, else the site default), or null. */
  cta: BlogCtaData | null;

  /** Bottom CTA section (the post's override, else the site default), or null. */
  ctaSection: CtaSectionData | null;
}

const { docs, post, relatedPosts, manualRelatedPosts, cta, ctaSection } =
  Astro.props;
const manualRelatedSlugs = manualRelatedPosts.map((p) => p.slug);

const seo = post.seo;
const metaTitle = seo?.metaTitle || post.title;
const metaDescription = seo?.metaDescription || post.description;
const ogTitle = seo?.ogTitle || metaTitle;
const ogDescription = seo?.ogDescription || metaDescription;
const ogImageUrl = imageUrl(seo?.ogImage ?? post.image, {
  width: 1200,
  height: 630,
  format: "jpg",
});

const siteOrigin = Astro.site!.toString().replace(/\/$/, "");
const jsonLd = blogPostJsonLd(post, siteOrigin);
---
```

Make these markup changes:

- `{readTime} min read` → `{post.readTime} min read`
- avatar `src={urlFor(post.authorAvatar).width(64).height(64).url()}` →
  `src={imageUrl(post.authorAvatar, { width: 64, height: 64 })}`
- In the hero ternary, the `else` branch becomes:

```astro
post.image && (
<Visual
  slot="column2"
  src={imageSrc(post.image, { width: 1200 })}
  alt={post.image.alt}
  ratio="wide"
/>
)
```

- `<TableOfContents items={tocItems} />` →
  `<TableOfContents items={post.headings} />`
- `<PortableText value={processedBody} components={portableTextComponents} />`
  → `<BlogBody body={post.body} />`
- `{resolvedBlogCta && <BlogCta cta={resolvedBlogCta} />}` →
  `{cta && <BlogCta cta={cta} />}`
- `(post.faqs?.length ?? 0) > 0 &&` → `post.faqs.length > 0 &&`
- `(post.faqs ?? []).map((faq) => (` → `post.faqs.map((faq) => (`
- Inside each `<AccordionItem>`, replace the
  `<Text><PortableText value={faq.answer ?? []} components={{ … }} /></Text>`
  block with `<Text><Fragment set:html={faq.answerHtml} /></Text>`.
- `{resolvedCtaSection && <ContentCtaSection cta={resolvedCtaSection} />}`
  → `{ctaSection && <ContentCtaSection cta={ctaSection} />}`
- On both `AdditionalPost` elements, `currentSlug={post.slug ?? undefined}`
  → `currentSlug={post.slug}`.
- On the second `AdditionalPost`:
  - `currentCategories={post.categories ?? undefined}` →
    `currentCategories={post.categories}`
  - `excludeSlugs={manualRelatedSlugs.filter((s): s is string => !!s)}` →
    `excludeSlugs={manualRelatedSlugs}`

- [ ] **Step 7: BlogPostGrid, JSON-LD, routes**

**`BlogPostGrid.astro`:**

- Delete the "Exported post type" comment block and `export interface BlogPost`.
- Delete `import type { ImageMetadata } from "astro";`.
- Add `import { imageSrc, type BlogPostSummary } from "@/lib/content";`.
- Replace `BlogPost` with `BlogPostSummary` in `posts?:`, `samplePosts:`
  and `let filtered:`.
- In the `posts` JSDoc, replace the "When connecting a CMS, pass the query
  result here" example with:

````ts
   * Pass posts from the content interface:
   * ```astro
   * const allPosts = await getBlogPosts();
   * <BlogPostGrid posts={allPosts} variant="recent" />
   * ```
````

- Replace `samplePosts` with:

```ts
const samplePosts: BlogPostSummary[] = [
  {
    title: "How to Get Started in Five Simple Steps",
    slug: "getting-started-guide",
    description:
      "A practical walkthrough to help you get up and running quickly — from first setup to your first results.",
    categories: ["Guides"],
    primaryCategory: null,
    image: { src: featuredImage, alt: "Getting started checklist on a desk" },
    author: "Jane Doe",
    authorAvatar: { src: avatarPlaceholder, alt: "Jane Doe" },
    date: "2026-03-01",
    featured: true,
  },
  {
    title: "What's New: Our Latest Updates",
    slug: "latest-updates",
    description:
      "A roundup of the improvements and features we've shipped recently, and what they mean for you.",
    categories: ["News"],
    primaryCategory: null,
    image: { src: blogImage1, alt: "Team reviewing recent product updates" },
    author: "Jane Doe",
    authorAvatar: null,
    date: "2026-02-20",
    featured: false,
  },
  {
    title: "Five Trends Shaping Our Industry This Year",
    slug: "industry-trends",
    description:
      "The shifts we're watching closely, and how forward-thinking teams are responding to them.",
    categories: ["Insights"],
    primaryCategory: null,
    image: { src: blogImage2, alt: "Charts illustrating industry trends" },
    author: "Jane Doe",
    authorAvatar: null,
    date: "2026-02-15",
    featured: false,
  },
  {
    title: "The Power of Clear, Customer-Focused Messaging",
    slug: "customer-focused-messaging",
    description:
      "How sharper messaging turns a website from a digital brochure into a tool that actually converts.",
    categories: ["Insights"],
    primaryCategory: null,
    image: { src: blogImage3, alt: "Whiteboard messaging workshop" },
    author: "Jane Doe",
    authorAvatar: null,
    date: "2026-02-10",
    featured: false,
  },
  {
    title: "Designing for Everyone: A Practical Accessibility Guide",
    slug: "accessibility-guide",
    description:
      "Practical techniques for building experiences that work for everyone, including keyboard navigation and screen reader support.",
    categories: ["Guides"],
    primaryCategory: null,
    image: { src: heroImage, alt: "Accessible interface components" },
    author: "Jane Doe",
    authorAvatar: null,
    date: "2026-02-05",
    featured: false,
  },
  {
    title: "A Step-by-Step Walkthrough of Your First Project",
    slug: "first-project-walkthrough",
    description:
      "Follow along as we set up a project from scratch and explain each decision along the way.",
    categories: ["Tutorials"],
    primaryCategory: null,
    image: {
      src: blogImage1,
      alt: "Step-by-step project walkthrough on screen",
    },
    author: "Jane Doe",
    authorAvatar: null,
    date: "2026-01-28",
    featured: false,
  },
  {
    title: "The Tools and Resources We Rely On",
    slug: "tools-and-resources",
    description:
      "A curated list of the software, templates, and references our team reaches for every day.",
    categories: ["Resources"],
    primaryCategory: null,
    image: { src: blogImage2, alt: "Collection of tools and resources" },
    author: "Jane Doe",
    authorAvatar: null,
    date: "2026-01-20",
    featured: false,
  },
  {
    title: "Building a Design System from Scratch",
    slug: "design-system-from-scratch",
    description:
      "How we build scalable, consistent systems that accelerate work and improve quality.",
    categories: ["Guides"],
    primaryCategory: null,
    image: { src: featuredImage, alt: "Design system component library" },
    author: "Jane Doe",
    authorAvatar: null,
    date: "2026-01-08",
    featured: false,
  },
];
```

- In the card grid, the `BlogCard` props become:

```astro
<BlogCard
  theme={invertCards}
  title={post.title}
  description={post.description}
  categories={post.categories}
  href={`/blog/${post.slug}`}
  image={imageSrc(post.image, { width: 600 }) ?? null}
  imageAlt={post.image?.alt ?? null}
  author={post.author}
  authorAvatar={imageSrc(post.authorAvatar, { width: 80, height: 80 })}
  date={post.date}
/>
```

**`src/lib/jsonld.ts`:**

- Delete `import { urlFor } from "@/sanity/lib/image";`,
  `import { portableTextToPlainText } …`, `toImageUrl` and `faqAnswerText`.
- Add `type BlogPostDetail` to the `@/lib/content` import.
- `youtubeVideoObject`'s `post` parameter type becomes
  `{ title?: string | null; description?: string | null; date?: string | null }`.
- In `blogPostJsonLd`:
  - Change the signature to `(post: BlogPostDetail, siteUrl: string)`.
  - `toImageUrl(post.image, siteUrl)` → `contentImageUrl(post.image, siteUrl)`.
  - `toIsoDateTime(post._updatedAt)` → `toIsoDateTime(post.updatedAt)`.
  - Replace the FAQ block with:

```ts
if (post.faqs.length > 0) {
  nodes.push({
    "@type": "FAQPage",
    mainEntity: post.faqs
      .filter((f) => f.question && f.answerText)
      .map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: f.answerText.replace(/\s+/g, " ").trim(),
        },
      })),
  });
}
```

**`src/pages/blog/[slug].astro`** (full file):

```astro
---
/**
 * Public blog post page — PRERENDERED. Slugs are enumerated at build time
 * by getBlogPostStaticPaths(); the page is emitted as static HTML and served
 * by the Cloudflare assets binding at zero Worker CPU.
 *
 * Draft preview does NOT happen here — Sanity's Presentation tool loads the
 * SSR twin at /preview/blog/[slug], which calls the same getBlogPost() with
 * the draft perspective. Keep the two files in sync (they should differ only
 * in prerender mode, getStaticPaths and the perspective argument).
 */
import BlogPostTemplate from "@/components/templates/BlogPostTemplate.astro";
import { getBlogPost, getBlogPostStaticPaths } from "@/lib/content";

// Must be an imported helper: Astro extracts getStaticPaths into its own
// module at build time, so frontmatter siblings are not in scope here.
export const getStaticPaths = getBlogPostStaticPaths;

const { slug } = Astro.params;
if (!slug) return Astro.redirect("/404");

const data = await getBlogPost(slug);
if (!data) return Astro.redirect("/404");
---

<BlogPostTemplate {...data} />
```

**`src/pages/preview/blog/[slug].astro`** (full file):

```astro
---
/**
 * SSR PREVIEW twin of /blog/[slug] — the route Sanity's Presentation tool
 * iframes for draft preview (see src/sanity/lib/resolve.ts). Renders the
 * IDENTICAL template through the IDENTICAL getBlogPost() as the public
 * prerendered route; the only difference is that this runs per request, so
 * the Presentation cookie can switch the fetch to the drafts perspective.
 *
 * Editor-only surface: robots.txt disallows /preview, the middleware adds
 * X-Robots-Tag noindex + private,no-cache, and it's excluded from the
 * sitemap. Keep this file in sync with src/pages/blog/[slug].astro.
 */
export const prerender = false;
import BlogPostTemplate from "@/components/templates/BlogPostTemplate.astro";
import { getBlogPost } from "@/lib/content";
import { getDraftModeProps } from "@/sanity/lib/draft-mode";

const { slug } = Astro.params;
if (!slug) return Astro.redirect("/404");

const data = await getBlogPost(slug, getDraftModeProps(Astro));
if (!data) return Astro.redirect("/404");
---

<BlogPostTemplate {...data} />
```

- [ ] **Step 8: Check, then compare**

Run:

```bash
npm run check 2>&1 | tail -3 && npm run check:hover
KEEP_DEV_PAGES=1 npm run build && node scripts/compare-dist.mjs .parity/empty dist/client
KEEP_DEV_PAGES=1 PARITY_FIXTURES=1 npm run build && node scripts/compare-dist.mjs .parity/fixtures dist/client --canonical
node scripts/compare-dist.mjs .parity/fixtures dist/client
```

Expected:

- `0 errors`.
- The empty comparison prints `Identical`.
- The canonical fixtures comparison prints `Identical`.
- The final strict comparison may print `DIFF` for
  `blog/fixture-post-one/index.html` only. Every window must sit inside the
  `blog_post_faq_wrap` block. FAQ answers now arrive as an HTML string, so
  the newline between `<p>` elements and the entity form can differ.

Any other strict diff is a regression; fix it before going on. Once the
only strict diff is the FAQ region, re-baseline the fixtures:

```bash
rm -rf .parity/fixtures && cp -R dist/client .parity/fixtures
```

- [ ] **Step 9: Grep and commit**

Run:

```bash
grep -rln "urlFor\|astro-portabletext\|page-data\|stega\|@/sanity" src/components/templates/BlogPostTemplate.astro src/pages/blog/\[slug\].astro src/lib/jsonld.ts src/lib/read-time.ts
grep -rn "estimateReadTime\|buildToc" src --include='*.ts' --include='*.astro'
```

Expected:

- The first grep prints nothing.
- The second shows only `src/lib/read-time.ts`, `src/lib/toc.ts` and
  `src/sanity/lib/map/blog.ts`.

```bash
git add -A src
git commit -m "$(cat <<'EOF'
Move the blog post page behind the content interface

getBlogPost returns BlogPostPage: BlogPostDetail (body as a
portable-text/mdx union, headings, readTime, FAQ answers as HTML), related
posts as BlogPostSummary, and the resolved CTAs. New BlogBody renders the
body with the Portable Text components moved out of the template.
read-time takes text; JSON-LD reads view models. FAQ answers are
DOM-identical (canonical parity).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Blog index and category pages

**Files:**

- Modify:
  - `src/lib/content/{types.ts,index.ts}`
  - `src/sanity/lib/{source.ts,page-data.ts}`
  - `src/pages/blog/index.astro`
  - `src/pages/blog/category/[category].astro`

**Interfaces:**

- Consumes:
  - `toBlogPostSummary` (Task 6)
  - `isPresent` (Task 4)
  - `getCtaDefaults`, `imageSrc`, `imageUrl` and `plainText` (Task 2)
- Produces:
  - Type `CategoryPath`.
  - `getBlogPosts(opts?): Promise<BlogPostSummary[]>`
  - `getBlogPostsByCategory(category: string, opts?): Promise<BlogPostSummary[]>`.
    `category` is the display name, as the route props carry it.
  - `getBlogCategories(opts?): Promise<string[]>`
  - `getBlogCategoryStaticPaths(): Promise<CategoryPath[]>`
  - `loadBlogPosts`, `loadBlogPostsByCategory` and `loadBlogCategories` in
    `page-data.ts`.

- [ ] **Step 1: Record the hits**

Run:

```bash
grep -rln "@/sanity\|@sanity/" src/pages/blog/index.astro src/pages/blog/category
```

Expected: both files. Step 6 requires no output.

- [ ] **Step 2: Types and contract**

Append to `types.ts`, in the Shared section:

```ts
/** One `getStaticPaths` entry for /blog/category/[category]. */
export interface CategoryPath {
  params: { category: string };
  props: { categoryName: string };
}
```

Add these to `ContentSource`:

```ts
  /** Every post as a card, newest first. */
  getBlogPosts(opts?: ContentOptions): Promise<BlogPostSummary[]>;
  /** Posts carrying this category (display name, exact match), newest first. */
  getBlogPostsByCategory(
    category: string,
    opts?: ContentOptions,
  ): Promise<BlogPostSummary[]>;
  /** Every category name in use, de-duplicated. */
  getBlogCategories(opts?: ContentOptions): Promise<string[]>;
  /** getStaticPaths for /blog/category/[category] (one per category, plus "all"). */
  getBlogCategoryStaticPaths(): Promise<CategoryPath[]>;
```

- [ ] **Step 3: Loaders and source**

In `page-data.ts`, import `BLOG_POSTS_QUERY` and
`BLOG_POSTS_BY_CATEGORY_QUERY`, then add:

```ts
/** Every post (card fields + primaryCategory), newest first. Empty on a fresh fork. */
export function loadBlogPosts(draftProps: DraftProps = {}) {
  return loadPageQuery({
    query: BLOG_POSTS_QUERY,
    draftProps,
    fallback: [],
    label: "blog posts",
  });
}

/** Posts in one category (display name), newest first. */
export function loadBlogPostsByCategory(
  category: string,
  draftProps: DraftProps = {},
) {
  return loadPageQuery({
    query: BLOG_POSTS_BY_CATEGORY_QUERY,
    params: { category },
    draftProps,
    fallback: [],
    label: `blog category "${category}"`,
  });
}

/** Every category name across posts. */
export function loadBlogCategories(draftProps: DraftProps = {}) {
  return loadPageQuery({
    query: BLOG_CATEGORIES_QUERY,
    draftProps,
    fallback: [],
    label: "blog categories",
  });
}
```

In `source.ts`:

- Import the three loaders and `getBlogCategoryStaticPaths`, plus the type
  `BlogPostSummary`.
- Add the functions below, and list `getBlogPosts`,
  `getBlogPostsByCategory`, `getBlogCategories` and
  `getBlogCategoryStaticPaths` in `sanitySource` and in the `index.ts`
  destructure.

```ts
async function getBlogPosts(opts?: ContentOptions): Promise<BlogPostSummary[]> {
  return (await loadBlogPosts(opts)).map(toBlogPostSummary).filter(isPresent);
}

async function getBlogPostsByCategory(
  category: string,
  opts?: ContentOptions,
): Promise<BlogPostSummary[]> {
  return (await loadBlogPostsByCategory(category, opts))
    .map(toBlogPostSummary)
    .filter(isPresent);
}

async function getBlogCategories(opts?: ContentOptions): Promise<string[]> {
  const names = (await loadBlogCategories(opts))
    .map((c) => stegaClean(c))
    .filter((c): c is string => Boolean(c));
  return [...new Set(names)];
}
```

- [ ] **Step 4: Blog index**

In `src/pages/blog/index.astro`:

- Header: "Blog Listing Page — prerendered (published content at build time;
  a Sanity publish triggers a rebuild…)" stays. Add the line "Posts come
  from getBlogPosts() in @/lib/content."
- Replace the `// Sanity` import group (`getDraftModeProps`,
  `loadPageQuery`, `BLOG_POSTS_QUERY`, `urlFor`, `stegaClean`) and the
  Task 2 `getCtaDefaults` import with:

```ts
import {
  getBlogPosts,
  getCtaDefaults,
  imageSrc,
  imageUrl,
  plainText,
} from "@/lib/content";
```

- Replace the fetch block with:

```ts
/* ── Posts (newest first) and the CTA defaults ── */

const [allPosts, ctaDefaults] = await Promise.all([
  getBlogPosts(),
  getCtaDefaults(),
]);
const defaultCtaSection = ctaDefaults.ctaSection;
```

- `allPosts.filter((p: any) => p.featured)` →
  `allPosts.filter((p) => p.featured)`.
- Replace `getPostsForCategory` and its comment with:

```ts
// Group posts by primary category (each post appears in one section only).
// Categories arrive cleaned from the content source, so === matches in
// Presentation draft mode too.
function getPostsForCategory(categoryName: string) {
  return allPosts.filter(
    (p) => (p.primaryCategory || p.categories[0]) === categoryName,
  );
}
```

Make these markup changes, applying each one everywhere it occurs:

| Before                                                                                                | After                                                                                   |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `(post: any)` / `(post: any, i: number)`                                                              | `(post)` / `(post, i)`                                                                  |
| `data-title={stegaClean(post.title)}`                                                                 | `data-title={plainText(post.title)}`                                                    |
| `data-description={stegaClean(post.description)}`                                                     | `data-description={plainText(post.description)}`                                        |
| `data-categories={(post.categories ?? []).map((c: string) => stegaClean(c)).join(",")}`               | `data-categories={post.categories.join(",")}`                                           |
| slider `src={urlFor(post.image).width(800).url()}` + `alt={post.imageAlt}`                            | `src={imageUrl(post.image, { width: 800 })}` + `alt={post.image?.alt}`                  |
| `{post.categories?.[0] && (`                                                                          | `{post.categories[0] && (`                                                              |
| featured `src={urlFor(post.image).width(i === 0 ? 1000 : 600).url()}` + `alt={post.imageAlt}`         | `src={imageUrl(post.image, { width: i === 0 ? 1000 : 600 })}` + `alt={post.image?.alt}` |
| BlogCard `image={urlFor(post.image).width(600).url()}`                                                | `image={imageSrc(post.image, { width: 600 }) ?? null}`                                  |
| BlogCard `image={urlFor(post.image).width(800).url()}` (latest large)                                 | `image={imageSrc(post.image, { width: 800 }) ?? null}`                                  |
| BlogCard `imageAlt={post.imageAlt}`                                                                   | `imageAlt={post.image?.alt ?? null}`                                                    |
| `authorAvatar={post.authorAvatar ? urlFor(post.authorAvatar).width(80).height(80).url() : undefined}` | `authorAvatar={imageSrc(post.authorAvatar, { width: 80, height: 80 })}`                 |

- [ ] **Step 5: Category page**

In `src/pages/blog/category/[category].astro`:

- The header's last line "Content is fetched from Sanity CMS, filtered by
  category." becomes "Posts come from getBlogPosts() /
  getBlogPostsByCategory() in @/lib/content."
- Replace the `// Sanity` import group and the `getCtaDefaults` import with:

```ts
import {
  getBlogCategoryStaticPaths,
  getBlogPosts,
  getBlogPostsByCategory,
  getCtaDefaults,
  imageSrc,
} from "@/lib/content";
```

- Delete `const draftProps = getDraftModeProps(Astro);`.
- Replace the fetch block with:

```ts
/* ── Posts — all for "All", else those in the category ── */

const [posts, ctaDefaults] = await Promise.all([
  category === "All" ? getBlogPosts() : getBlogPostsByCategory(category),
  getCtaDefaults(),
]);
const defaultCtaSection = ctaDefaults.ctaSection;
```

- In the grid, `posts.map((post: any) =>` → `posts.map((post) =>`, and the
  image, alt and avatar rows change exactly as in the Step 4 table (600
  wide). Keep `data-title={post.title}` and
  `data-description={post.description}` as they are.

- [ ] **Step 6: Verify and commit**

Run:

```bash
grep -rln "@/sanity\|@sanity/" src/pages/blog/index.astro src/pages/blog/category
npm run check 2>&1 | tail -3 && npm run check:hover
KEEP_DEV_PAGES=1 npm run build && node scripts/compare-dist.mjs .parity/empty dist/client
KEEP_DEV_PAGES=1 PARITY_FIXTURES=1 npm run build && node scripts/compare-dist.mjs .parity/fixtures dist/client
```

Expected:

- The grep prints nothing.
- `0 errors`.
- Both comparisons print `Identical`. This uses the strict re-baselined
  fixtures from Task 6.

Fixture coverage:

- the blog index: the featured slider (posts one and three), the Guides,
  News and Insights sections, and Latest
- `blog/category/{all,guides,news,insights}`

```bash
git add -A src
git commit -m "$(cat <<'EOF'
Move the blog index and category pages behind the content interface

getBlogPosts/getBlogPostsByCategory/getBlogCategories and the category
static paths come from @/lib/content. Listing cards size images with
imageSrc/imageUrl and read search text through plainText().

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: llms.txt and llms-full.txt

**Files:**

- Modify:
  - `src/lib/content/{types.ts,index.ts}`
  - `src/sanity/lib/{source.ts,page-data.ts}`
  - `src/sanity/lib/map/{blog.ts,case-studies.ts}`
  - `src/pages/llms.txt.ts`
  - `src/pages/llms-full.txt.ts` (a full rewrite; this also fixes the stale
    l.6 header so it mentions projects)
  - `.claude/skills/seo-discoverability/SKILL.md` (l.120-131)

**Interfaces:**

- Consumes:
  - `getBlogPosts` (Task 7), `getCaseStudies` (Task 5), `getProjects`
    (Task 4)
  - `toBlogPostDetail` (Task 6), `toCaseStudyDetail` (Task 5)
  - `loadBlogPostDocument` (Task 6)
- Produces:
  - A `markdown: string` field on `BlogPostDetail` and `CaseStudyDetail`.
  - `getFullBlogPosts(opts?): Promise<BlogPostDetail[]>`
  - `getFullCaseStudies(opts?): Promise<CaseStudyDetail[]>`, which excludes
    coming-soon studies.
  - `loadCaseStudyDocument(slug, draftProps?)` in `page-data.ts`.
  - `caseStudyMarkdown(blocks)` in `map/case-studies.ts`.

- [ ] **Step 1: Record the hits**

Run: `grep -ln "@/sanity" src/pages/llms.txt.ts src/pages/llms-full.txt.ts`

Expected: both files. Step 6 requires no output.

- [ ] **Step 2: Markdown on the detail view models**

In `types.ts`, add this member to both `BlogPostDetail` and
`CaseStudyDetail`:

```ts
/** The full body as Markdown (llms-full.txt). */
markdown: string;
```

Add these to `ContentSource`:

```ts
  /** Every post with its full body, newest first (llms-full.txt). */
  getFullBlogPosts(opts?: ContentOptions): Promise<BlogPostDetail[]>;
  /** Every published (not coming-soon) case study in full, newest first. */
  getFullCaseStudies(opts?: ContentOptions): Promise<CaseStudyDetail[]>;
```

In `map/blog.ts`:

- Import `portableTextToMarkdown` too.
- Add this to the object `toBlogPostDetail` returns:

```ts
    // `as never`: the body includes custom node types (code, callout, …)
    // the Markdown walker skips but its input type does not list.
    markdown: stegaClean(portableTextToMarkdown(post.body as never)),
```

In `map/case-studies.ts`:

- Import `portableTextToMarkdown`.
- Add this function. It moves verbatim from `llms-full.txt.ts`, typed on
  `RawBlock`:

```ts
/** Render a case study's flexible `content[]` blocks to Markdown. */
export function caseStudyMarkdown(
  blocks: RawBlock[] | null | undefined,
): string {
  if (!blocks?.length) return "";
  const parts: string[] = [];
  for (const b of blocks) {
    // Each block shape carries a different subset of these fields; the
    // union only exposes one after `_type` narrowing, and this walker
    // deliberately probes them instead.
    const block = b as {
      _type: string;
      body?: unknown[] | null;
      items?: Array<{ value?: string | null; label?: string | null }> | null;
      imageAlt?: string | null;
      images?: Array<{ alt?: string | null }> | null;
    };
    if (block.body?.length) {
      const md = portableTextToMarkdown(block.body as never);
      if (md) parts.push(md);
      continue;
    }
    if (block._type === "stats" && block.items?.length) {
      parts.push(
        block.items
          .map((s) => `- **${s.value ?? ""}** — ${s.label ?? ""}`)
          .join("\n"),
      );
      continue;
    }
    if (block.imageAlt) {
      parts.push(`![${block.imageAlt}]`);
      continue;
    }
    if (block.images?.length) {
      parts.push(block.images.map((i) => `![${i.alt ?? "image"}]`).join("\n"));
    }
  }
  return parts.join("\n\n");
}
```

Add `markdown: stegaClean(caseStudyMarkdown(s.content)),` to the object
`toCaseStudyDetail` returns.

- [ ] **Step 3: Loader and source**

In `page-data.ts`, add:

```ts
/** One case study document by slug (CASE_STUDY_QUERY), or null. */
export async function loadCaseStudyDocument(
  slug: string,
  draftProps: DraftProps = {},
) {
  const { data } = await loadQuery({
    query: CASE_STUDY_QUERY,
    params: { slug },
    ...draftProps,
  });
  return data;
}
```

Then make `loadCaseStudyPage` start with
`const study = await loadCaseStudyDocument(slug, draftProps); if (!study) return null;`
in place of its own `loadQuery` call.

In `source.ts`:

- Import `loadBlogPostDocument` and `loadCaseStudyDocument`, plus the types
  `BlogPostDetail` and `CaseStudyDetail`.
- Add the functions below, and list `getFullBlogPosts` and
  `getFullCaseStudies` in `sanitySource` and in the `index.ts` destructure.

```ts
/* ── Full documents (llms-full.txt) ────────────────────────────────────── */

async function getFullBlogPosts(
  opts?: ContentOptions,
): Promise<BlogPostDetail[]> {
  const slugs = (await getBlogPosts(opts)).map((p) => p.slug);
  const posts = await Promise.all(
    slugs.map((slug) => loadBlogPostDocument(slug, opts)),
  );
  return posts.filter(isPresent).map(toBlogPostDetail);
}

async function getFullCaseStudies(
  opts?: ContentOptions,
): Promise<CaseStudyDetail[]> {
  const slugs = (await getCaseStudies(opts))
    .filter((c) => !c.comingSoon)
    .map((c) => c.slug);
  const studies = await Promise.all(
    slugs.map((slug) => loadCaseStudyDocument(slug, opts)),
  );
  return studies.filter(isPresent).map(toCaseStudyDetail);
}
```

- [ ] **Step 4: Rewrite the two endpoints**

Replace `src/pages/llms.txt.ts` entirely:

```ts
/**
 * `/llms.txt` — an LLM-friendly index of the site (llmstxt.org format).
 *
 * Prerendered to `dist/llms.txt` at build time. Static marketing pages come
 * from the `PAGES` registry in `src/data/site-structure.ts`; blog posts,
 * case studies, and projects come from the content interface
 * (`@/lib/content`) on every build — so this file stays in sync with
 * published content automatically, like the sitemap.
 */

import type { APIRoute } from "astro";
import {
  getBlogPosts,
  getCaseStudies,
  getProjects,
  type BlogPostSummary,
  type CaseStudySummary,
  type ProjectCardData,
} from "@/lib/content";
import { SITE_URL, SITE_NAME, SITE_SUMMARY } from "@/config/site";
import {
  MAIN_PAGES,
  SERVICE_PAGES,
  LOCATION_PAGES,
  INDEX_PAGES,
  OPTIONAL_PAGES,
  type StaticPage,
} from "@/data/site-structure";
import { isNoindexRoute } from "@/config/seo.shared.mjs";

export const prerender = true;

/** `/contact` → `${SITE_URL}/contact`; `/` → site root. */
function url(path: string): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

/* Belt-and-braces: a page kept out of search results has no business in the
   LLM index either. The registry should never contain one, but if an entry is
   added there, the same predicate the sitemap / robots.txt / noindex meta use
   filters it here too — one fact, now five surfaces. */
function indexable(p: StaticPage): boolean {
  return !isNoindexRoute(p.path);
}

function staticLine(p: StaticPage): string {
  return `- [${p.title}](${url(p.path)}): ${p.desc}`;
}

function dynamicLine(
  title: string,
  path: string,
  desc?: string | null,
): string {
  const line = `- [${title}](${SITE_URL}${path})`;
  return desc ? `${line}: ${desc}` : line;
}

export const GET: APIRoute = async () => {
  // Tolerate an empty or unreachable dataset (e.g. a fresh fork before
  // `/setup`) — the file still renders the static page index. Listings only
  // carry linkable entries (slug + title), so nothing to filter here.
  const [posts, caseStudies, projects] = await Promise.all([
    getBlogPosts().catch((): BlogPostSummary[] => []),
    getCaseStudies().catch((): CaseStudySummary[] => []),
    getProjects().catch((): ProjectCardData[] => []),
  ]);

  // Mirror the sitemap rule: hide case studies marked "coming soon".
  const publishedCaseStudies = caseStudies.filter((c) => !c.comingSoon);

  // Only emit static groups that have pages (services/locations are empty in
  // the bare starter).
  const staticGroups: Array<[string, StaticPage[]]> = [
    ["Main Pages", MAIN_PAGES],
    ["Services", SERVICE_PAGES],
    ["Locations", LOCATION_PAGES],
    ["Sections", INDEX_PAGES],
  ];

  const sections: string[] = [
    `# ${SITE_NAME}`,
    `> ${SITE_SUMMARY}`,
    ...staticGroups
      .filter(([, pages]) => pages.length)
      .map(
        ([heading, pages]) =>
          `## ${heading}\n${pages.filter(indexable).map(staticLine).join("\n")}`,
      ),
  ];

  if (publishedCaseStudies.length) {
    sections.push(
      `## Case Studies\n${publishedCaseStudies
        .map((c) =>
          dynamicLine(c.title, `/case-studies/${c.slug}`, c.description),
        )
        .join("\n")}`,
    );
  }

  if (projects.length) {
    sections.push(
      `## Projects\n${projects
        .map((p) =>
          dynamicLine(
            p.title,
            p.href,
            [p.categoryLabel, p.location].filter(Boolean).join(" · "),
          ),
        )
        .join("\n")}`,
    );
  }

  if (posts.length) {
    sections.push(
      `## Blog\n${posts
        .map((p) => dynamicLine(p.title, `/blog/${p.slug}`, p.description))
        .join("\n")}`,
    );
  }

  sections.push(
    `## Optional\n${OPTIONAL_PAGES.filter(indexable).map(staticLine).join("\n")}`,
  );

  const body = sections.join("\n\n") + "\n";

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
```

Replace `src/pages/llms-full.txt.ts` entirely:

```ts
/**
 * `/llms-full.txt` — the full text content of the site for LLM ingestion.
 *
 * Prerendered to `dist/llms-full.txt` at build time. Static marketing pages
 * are listed as a link index (their content lives in `.astro` templates);
 * every blog post and published case study has its full body inline as
 * Markdown (converted by the content source), and every project is listed
 * with its category and location. Rebuilt from `@/lib/content` on every
 * deploy.
 */

import type { APIRoute } from "astro";
import {
  getFullBlogPosts,
  getFullCaseStudies,
  getProjects,
  type BlogPostDetail,
  type CaseStudyDetail,
  type ProjectCardData,
} from "@/lib/content";
import { SITE_URL, SITE_NAME, SITE_SUMMARY } from "@/config/site";
import {
  MAIN_PAGES,
  SERVICE_PAGES,
  LOCATION_PAGES,
  INDEX_PAGES,
  OPTIONAL_PAGES,
  type StaticPage,
} from "@/data/site-structure";

export const prerender = true;

function url(path: string): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

function pageIndex(heading: string, pages: StaticPage[]): string {
  return `## ${heading}\n${pages
    .map((p) => `- [${p.title}](${url(p.path)}): ${p.desc}`)
    .join("\n")}`;
}

export const GET: APIRoute = async () => {
  // Tolerate an empty or unreachable dataset (e.g. a fresh fork before
  // `/setup`) — the file still renders the static page index.
  const [caseStudies, projects, posts] = await Promise.all([
    getFullCaseStudies().catch((): CaseStudyDetail[] => []),
    getProjects().catch((): ProjectCardData[] => []),
    getFullBlogPosts().catch((): BlogPostDetail[] => []),
  ]);

  const staticGroups: Array<[string, StaticPage[]]> = [
    ["Main Pages", MAIN_PAGES],
    ["Services", SERVICE_PAGES],
    ["Locations", LOCATION_PAGES],
    ["Sections", INDEX_PAGES],
  ];

  const out: string[] = [
    `# ${SITE_NAME}`,
    `> ${SITE_SUMMARY}`,
    ...staticGroups
      .filter(([, pages]) => pages.length)
      .map(([heading, pages]) => pageIndex(heading, pages)),
  ];

  if (caseStudies.length) {
    out.push("---", "# Case Studies");
    for (const cs of caseStudies) {
      out.push(`## ${cs.title}`);
      out.push(`URL: ${SITE_URL}/case-studies/${cs.slug}`);
      if (cs.client) out.push(`Client: ${cs.client}`);
      if (cs.description) out.push(cs.description);
      if (cs.markdown) out.push(cs.markdown);
    }
  }

  if (projects.length) {
    out.push("---", "# Projects");
    for (const p of projects) {
      out.push(`## ${p.title}`);
      out.push(`URL: ${SITE_URL}${p.href}`);
      const meta = [p.categoryLabel, p.location].filter(Boolean).join(" · ");
      if (meta) out.push(meta);
    }
  }

  if (posts.length) {
    out.push("---", "# Blog");
    for (const post of posts) {
      out.push(`## ${post.title}`);
      out.push(`URL: ${SITE_URL}/blog/${post.slug}`);
      if (post.description) out.push(post.description);
      if (post.markdown) out.push(post.markdown);
    }
  }

  out.push(
    "---",
    "## Optional",
    ...OPTIONAL_PAGES.map((p) => `- [${p.title}](${url(p.path)}): ${p.desc}`),
  );

  const body = out.join("\n\n") + "\n";

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
```

- [ ] **Step 5: seo-discoverability skill**

In `.claude/skills/seo-discoverability/SKILL.md`, replace the paragraph
"They re-run their Sanity queries on every build … The full file uses
`portableTextToMarkdown()` in [src/sanity/lib/portable-text.ts](…)." with:

> They read the content interface (`@/lib/content`: `getBlogPosts`,
> `getCaseStudies`, `getProjects`, and for the full file
> `getFullBlogPosts` / `getFullCaseStudies`) on every build — the same
> lifecycle as the sitemap — so new, edited and deleted content flows
> through automatically on the next deploy. Coming-soon case studies stay
> hidden, matching the case-study `getStaticPaths` rule. Bodies arrive as
> Markdown on the view models (`markdown`). The Sanity source converts
> Portable Text with `portableTextToMarkdown()` in
> [src/sanity/lib/portable-text.ts](../../../src/sanity/lib/portable-text.ts).

- [ ] **Step 6: Verify and commit**

Run:

```bash
grep -ln "@/sanity" src/pages/llms.txt.ts src/pages/llms-full.txt.ts
npm run check 2>&1 | tail -3 && npm run check:hover
KEEP_DEV_PAGES=1 npm run build && node scripts/compare-dist.mjs .parity/empty dist/client
KEEP_DEV_PAGES=1 PARITY_FIXTURES=1 npm run build && node scripts/compare-dist.mjs .parity/fixtures dist/client
```

Expected:

- The grep prints nothing.
- `0 errors`.
- Both comparisons print `Identical`, including `llms.txt` and
  `llms-full.txt` (fixture case study one's blocks, project meta lines and
  post one's Markdown).

```bash
git add -A src .claude/skills/seo-discoverability/SKILL.md
git commit -m "$(cat <<'EOF'
Build llms.txt and llms-full.txt from the content interface

Detail view models carry their body as Markdown (computed by the Sanity
source); getFullBlogPosts/getFullCaseStudies feed llms-full.txt with the
same query count as before. The llms-full header now mentions projects.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Boundary guard and preview-safety checks

**Files:**

- Create: `scripts/check-content-boundary.mjs`,
  `scripts/check-stega-leaks.mjs`
- Modify:
  - `package.json` (scripts)
  - `.github/workflows/ci.yml`
  - `src/sanity/lib/fixtures/{data.ts,index.ts}`: the `preview` mode.
  - `src/sanity/lib/page-data.ts`: un-export the internals and rewrite the
    header.
  - `src/sanity/lib/portable-text.ts`: the header comment.

**Interfaces:**

- Consumes: everything above.
- Produces:
  - `npm run check:boundary`
  - `PARITY_FIXTURES=preview`
  - `node scripts/check-stega-leaks.mjs [distDir]`

- [ ] **Step 1: Write the guard**

`scripts/check-content-boundary.mjs`:

```js
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
  if (ALLOW.some((a) => rel === a || (a.endsWith("/") && rel.startsWith(a))))
    continue;
  const lines = fs.readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const [, spec] of line.matchAll(SPECIFIER)) {
      if (forbidden(spec, file)) violations.push(`${rel}:${i + 1}  ${spec}`);
    }
  });
}

if (violations.length) {
  console.error(
    `Content boundary violations — get content from @/lib/content instead:\n${violations
      .map((v) => `  ${v}`)
      .join("\n")}`,
  );
  process.exit(1);
}
console.log("Content boundary OK — no Sanity imports outside the allow list.");
```

In `package.json` `scripts`, add
`"check:boundary": "node scripts/check-content-boundary.mjs",` after
`check:hover`. In `.github/workflows/ci.yml`, add
`      - run: npm run check:boundary` after the `check:config` step.

- [ ] **Step 2: Run the guard, then prove it bites**

Run:

```bash
npm run check:boundary; echo "exit=$?"
printf -- '---\nimport { urlFor } from "@/sanity/lib/image";\n---\n' > src/components/ui/__BoundaryProbe.astro
npm run check:boundary; echo "exit=$?"
rm src/components/ui/__BoundaryProbe.astro
```

Expected:

- The first run prints `Content boundary OK …` and `exit=0`. If it lists
  violations, those are consumers an earlier task missed: move them onto
  `@/lib/content`. Don't extend `ALLOW` for them.
- The second run prints
  `src/components/ui/__BoundaryProbe.astro:2  @/sanity/lib/image` and
  `exit=1`.

- [ ] **Step 3: Pin the preview twins (Review Focus 4)**

Run:

```bash
grep -c "getDraftModeProps(Astro)" src/pages/preview/blog/\[slug\].astro src/pages/preview/case-studies/\[slug\].astro src/pages/preview/projects/\[slug\].astro
grep -rln "getDraftModeProps" src --include='*.astro' --include='*.ts' | grep -v "^src/pages/preview/\|^src/sanity/"
```

Expected: `:1` for each preview file. The second command prints nothing:
no other consumer forwards a perspective.

- [ ] **Step 4: Add the `preview` fixture mode (Review Focus 1, 2 and 3)**

Append to `src/sanity/lib/fixtures/data.ts`. These documents are
half-filled drafts as Presentation shows them:

```ts
/* ── Incomplete documents (PARITY_FIXTURES=preview only) ───────────────── */

export const INCOMPLETE_POST: Doc = {
  title: null,
  slug: "fixture-post-incomplete",
  description: null,
  categories: null,
  primaryCategory: null,
  image: null,
  imageAlt: "",
  author: { name: null, avatar: null },
  video: null,
  date: "2026-06-01",
  _updatedAt: "2026-06-01T00:00:00Z",
  featured: null,
  body: null,
  ctaOverride: { ...BLOG_CTA_PORTRAIT, image: null },
  ctaSectionOverride: { ...CTA_SECTION_DEFAULT, backgroundImage: null },
  faqs: null,
  relatedSlugs: [],
  seo: null,
};

export const INCOMPLETE_CASE_STUDY: Doc = {
  title: null,
  slug: "case-study-incomplete",
  description: null,
  client: null,
  categories: null,
  industries: null,
  image: null,
  imageAlt: "",
  date: "2026-06-01",
  _updatedAt: "2026-06-01T00:00:00Z",
  featured: null,
  comingSoon: null,
  timeline: null,
  liveUrl: null,
  galleryImagesAlt: null,
  galleryImages: [{ alt: "No asset yet" }],
  content: [
    {
      _type: "richTextWithImage",
      _key: "incomplete-1",
      body: [para("Body without its image.")],
      image: null,
      imageAlt: "",
    },
    { _type: "stats", _key: "incomplete-2", items: null },
  ],
  ctaSectionOverride: null,
  seo: null,
};

export const INCOMPLETE_PROJECT: Doc = {
  _id: "project-incomplete",
  _updatedAt: "2026-06-01T00:00:00Z",
  title: null,
  slug: "fixture-incomplete",
  category: null,
  location: null,
  service: null,
  completed: null,
  featured: null,
  heroImage: null,
  imageAlt: "",
  heroImageMeta: null,
  photos: [
    { _key: "incomplete-photo", label: "Before", alt: null, meta: null },
  ],
  description: null,
  quote: { text: null, name: null },
  seoDescription: null,
};
```

In `src/sanity/lib/fixtures/index.ts`:

- Import the three `INCOMPLETE_*` docs.
- Add the code below.
- Replace `fixtureFetch` with the version below.

```ts
/** The parity dataset plus one half-filled draft per detail type. */
const PREVIEW_DOCS: FixtureDocs = {
  ...PARITY_DOCS,
  posts: [...POSTS, INCOMPLETE_POST],
  caseStudies: [...CASE_STUDIES, INCOMPLETE_CASE_STUDY],
  projects: [...PROJECTS, INCOMPLETE_PROJECT],
};

/* Draft-mode stand-in: Sanity's stega appends invisible characters to
   strings when a perspective cookie is present. stegaClean strips runs of
   these characters, exactly as it strips a real payload. */
const STEGA = "​‌‍﻿".repeat(3);
/** Keys real stega never encodes (its default filter) plus Portable Text internals. */
const NEVER_ENCODED = new Set([
  "slug",
  "href",
  "url",
  "website",
  "language",
  "style",
  "listItem",
  "marks",
  "type",
]);
/** getStaticPaths queries run at build time — never with a perspective. */
const BUILD_TIME_QUERIES = new Set<string>([
  BLOG_SLUGS_QUERY,
  CASE_STUDY_SLUGS_QUERY,
  PROJECT_SLUGS_QUERY,
  BLOG_CATEGORIES_QUERY,
]);

function draftEncode(value: unknown, key = ""): unknown {
  if (typeof value === "string") {
    const skip =
      key.startsWith("_") ||
      NEVER_ENCODED.has(key) ||
      /^(https?:\/\/|\/)/.test(value) ||
      /^\d{4}-\d{2}-\d{2}/.test(value);
    return skip ? value : value + STEGA;
  }
  if (Array.isArray(value)) return value.map((v) => draftEncode(v, key));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, draftEncode(v, k)]),
    );
  return value;
}

/** Drop-in for `sanityClient.fetch(query, params, { filterResponse: false })`.
    Modes: "1" — the parity dataset; "preview" — draft-like data (stega-
    encoded strings + half-filled documents) for scripts/check-stega-leaks.mjs. */
export async function fixtureFetch(
  query: string,
  params: Params | undefined,
  mode: string,
) {
  if (mode === "1")
    return {
      result: resolveFixture(query, params ?? {}),
      resultSourceMap: undefined,
    };
  if (mode === "preview") {
    const result = resolveFixture(query, params ?? {}, PREVIEW_DOCS);
    return {
      result: BUILD_TIME_QUERIES.has(query) ? result : draftEncode(result),
      resultSourceMap: undefined,
    };
  }
  throw new Error(`[parity fixtures] Unknown PARITY_FIXTURES mode "${mode}".`);
}
```

- [ ] **Step 5: Write the leak check**

`scripts/check-stega-leaks.mjs`:

```js
#!/usr/bin/env node
/**
 * check-stega-leaks — run after `PARITY_FIXTURES=preview npm run build`.
 *
 * The preview fixtures stand in for Presentation draft mode: every display
 * string carries invisible stega characters, and one half-filled document
 * per detail type is added. This scans the pages a /preview twin renders
 * (the detail templates) plus the homepage's self-fetching sections, and
 * fails when stega reaches an attribute that carries logic — an encoded
 * slug, class, style, URL or search value breaks only inside Presentation,
 * where nothing else would notice. Display attributes (alt, title,
 * aria-label) are allowed to stay encoded.
 *
 * Usage: node scripts/check-stega-leaks.mjs [dist/client]
 */
import fs from "node:fs";
import path from "node:path";
import { parse } from "node-html-parser";

const ROOT = process.argv[2] ?? "dist/client";
const PAGES = [
  "",
  "blog/fixture-post-one",
  "blog/fixture-post-two",
  "blog/fixture-post-incomplete",
  "case-studies/case-study-one",
  "case-studies/case-study-incomplete",
  "projects/fixture-kitchen",
  "projects/fixture-incomplete",
];
const CHECKED = [
  "href",
  "src",
  "srcset",
  "class",
  "style",
  "id",
  "data-aspect",
  "data-categories",
  "data-industries",
  "data-title",
  "data-description",
  "data-client",
  "data-date",
  "data-lightbox-src",
  "data-lightbox-caption",
];
const STEGA = /[​‌‍﻿]/;
const STEGA_ALL = /[​‌‍﻿]/g;

let leaks = 0;
let encodedPages = 0;
for (const page of PAGES) {
  const file = path.join(ROOT, page, "index.html");
  if (!fs.existsSync(file)) {
    console.error(`MISSING ${file} — the page did not build.`);
    process.exit(1);
  }
  const html = fs.readFileSync(file, "utf8");
  if (STEGA.test(html)) encodedPages++;
  for (const el of parse(html).querySelectorAll("*")) {
    for (const name of CHECKED) {
      const value = el.getAttribute(name);
      if (value && STEGA.test(value)) {
        leaks++;
        console.log(
          `LEAK /${page}  <${el.rawTagName} ${name}="${value.replace(STEGA_ALL, "·").slice(0, 140)}">`,
        );
      }
    }
  }
}

if (encodedPages === 0) {
  console.error(
    "No stega characters anywhere — was the build run with PARITY_FIXTURES=preview?",
  );
  process.exit(1);
}
if (
  !fs
    .readFileSync(path.join(ROOT, "index.html"), "utf8")
    .includes("single_testimonial")
) {
  console.error(
    'SingleTestimonial did not render on / — getTestimonialByName("Jane Doe") failed against an encoded name.',
  );
  process.exit(1);
}
console.log(
  leaks
    ? `\n${leaks} stega leak(s) in logic attributes.`
    : `No stega in logic attributes across ${PAGES.length} pages.`,
);
process.exit(leaks ? 1 : 0);
```

- [ ] **Step 6: Run the preview-safety build**

Run:

```bash
PARITY_FIXTURES=preview npm run build && node scripts/check-stega-leaks.mjs
```

Expected:

- The build succeeds. That covers Review Focus 2: every half-filled draft
  renders and no `urlFor` throws.
- The check prints `No stega in logic attributes across 8 pages.`

A `LEAK` line names the page, tag and attribute. Fix it in the mapper that
produces that value, by cleaning it per the stega policy, then rerun. Never
fix a leak in the component.

Then re-run the parity gate (both comparisons). Expected: `Identical`. The
fixture mode change does not affect mode `1`.

- [ ] **Step 7: A real project that cannot be reached fails the build (Review Focus 5)**

Run:

```bash
cp src/config/site.shared.mjs .parity/site.shared.mjs.bak
node -e 'const f="src/config/site.shared.mjs",fs=require("fs");fs.writeFileSync(f,fs.readFileSync(f,"utf8").replace(/SANITY_PROJECT_ID = "[^"]*"/,"SANITY_PROJECT_ID = \"zz9unreachable0\""))'
npx astro build > .parity/unreachable.log 2>&1; echo "exit=$?"
cp .parity/site.shared.mjs.bak src/config/site.shared.mjs && git diff --exit-code src/config/site.shared.mjs && echo "restored"
tail -20 .parity/unreachable.log
```

Expected: `exit=` is non-zero, `restored` prints, and the log ends in a
Sanity fetch error (project not found, or a network error when offline).
`npx astro build` skips `prebuild`, so the wrangler sync check does not
interfere. If the build exits 0, a listing function swallowed a real-project
failure: find the caller that `.catch`es where it shouldn't.

- [ ] **Step 8: Tighten page-data's surface and headers**

Run:

```bash
grep -rn "loadPageQuery\|categoryToSlug\|DraftProps" src --include='*.ts' --include='*.astro' | grep -v "^src/sanity/lib/page-data.ts"
```

Expected: no output. If so, drop `export` from `loadPageQuery`,
`categoryToSlug` and `type DraftProps` in `page-data.ts` (CLAUDE.md: export
only what another file imports).

Replace the `page-data.ts` header comment with:

```ts
/**
 * GROQ fetching layer of the Sanity content source (src/sanity/lib/
 * source.ts). Consumers never import this file — they call @/lib/content,
 * whose Sanity implementation composes these loaders with the mappers in
 * ./map/.
 *
 * Loader contract:
 * - Fetch the single document FIRST (the related-content query depends on its
 *   categories/slug), then `Promise.all` everything independent.
 * - Related content is filtered in GROQ with a small buffer over the card
 *   slot — never by fetching the whole collection and filtering in JS.
 * - GROQ params built from fetched values are stegaClean'd (an encoded
 *   category never matches in preview).
 * - Return `null` for "not found"; the route decides how to respond.
 * - Listing loaders go through loadPageQuery: empty on a fresh fork
 *   (placeholder project id), a loud failure on a real project.
 * - `draftProps` is the `opts` a content function received — set only on
 *   the /preview twins.
 *
 * This module also holds the `getStaticPaths` helpers the source re-exports.
 * Routes import them from @/lib/content (an imported module): Astro extracts
 * `getStaticPaths` into its own module at build time, so only imports are in
 * scope inside it — sibling consts declared in the same frontmatter are not
 * (symptom: "<helper> is not defined" pointing into an Astro-generated chunk).
 */
```

In `portable-text.ts`, the header's second paragraph becomes "Used by the
Sanity mappers in ./map/ — case-study blocks, project write-ups and FAQ
answers (HTML), llms-full.txt bodies (Markdown), plain text and read-time
words."

- [ ] **Step 9: Verify and commit**

Run:

```bash
npm run check 2>&1 | tail -3 && npm run check:hover && npm run check:boundary
KEEP_DEV_PAGES=1 npm run build && node scripts/compare-dist.mjs .parity/empty dist/client
KEEP_DEV_PAGES=1 PARITY_FIXTURES=1 npm run build && node scripts/compare-dist.mjs .parity/fixtures dist/client
```

Expected: `0 errors`, boundary OK, and both comparisons `Identical`.

```bash
git add -A scripts package.json .github/workflows/ci.yml src
git commit -m "$(cat <<'EOF'
Guard the content boundary; add preview-safety checks

check:boundary fails on any Sanity import outside src/sanity and the
Sanity-only allow list (preview twins, draft-mode API, Portable Text,
BlogBody, visual-editing islands, BaseLayout, middleware, env.d.ts) and
runs in CI. PARITY_FIXTURES=preview builds draft-like data (stega-encoded
strings, half-filled documents) and check-stega-leaks fails on stega in
any logic attribute.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Docs, skills and final verification

**Files:**

- Modify:
  - `.claude/skills/sanity-and-preview/SKILL.md`
  - `.claude/skills/component-api/SKILL.md` (l.36)
  - `.claude/skills/component-api/references/layout-and-content.md`
    (l.303-308)
  - `.claude/skills/component-api/references/local-service.md` (l.34, l.41)
  - `README.md` (l.33-35)
  - `CLAUDE.md`
  - `.github/workflows/ci.yml` (header comment)

**Interfaces:**

- Consumes: the final API from Tasks 2–9.
- Produces: documentation only.

- [ ] **Step 1: Find every stale instruction**

Run:

```bash
grep -rnE "page-data|urlFor|hotspotPosition|stegaClean|loadQuery|getTestimonials|sanityPhoto|toProjectCard|lib/testimonials|loadBlogPostPage|loadCaseStudyPage|loadProjectPage|loadGallery|loadProjects|SanityCtaSection|getDraftModeProps|BlogPost\b" .claude/skills README.md CLAUDE.md docs .github --include='*.md' --include='*.yml' | grep -v docs/superpowers
```

Sort each hit into one of three groups (the CLAUDE.md rename rule):

- **Still true:** for example, `loadQuery` inside `src/sanity`, or
  `getDraftModeProps` on the preview twins. Keep these.
- **Describes a consumer pattern that no longer exists:** rewrite these
  using Steps 2–4.
- **Historical:** none expected.

- [ ] **Step 2: sanity-and-preview skill**

Make these edits:

1. **Frontmatter `description`:** replace
   "loadQuery/getDraftModeProps/page-data.ts loaders" with "the Sanity
   content source behind @/lib/content (src/sanity/lib/source.ts,
   page-data.ts loaders, map/ mappers), loadQuery/getDraftModeProps, the
   stega policy, the parity fixtures".
2. **l.31-40:** replace the "Templates take their prop types from the
   loader…" paragraph and its code block with:

   > **Templates and components never see Sanity types.** They take the named
   > view models from `@/lib/content` (`BlogPostPage`, `CaseStudyDetail`,
   > `ProjectCardData`, …, defined in `src/lib/content/types.ts`). TypeGen
   > types stay inside `src/sanity/`: each mapper in `src/sanity/lib/map/`
   > takes a `*_QUERY_RESULT` and returns a view model, and
   > `src/sanity/lib/source.ts` is declared `satisfies ContentSource`. After
   > editing a query and running `npm run typegen`, any drift surfaces in the
   > one mapper that reads it, not in the templates.

3. **l.63:** "renders the identical templates through the identical
   loaders" becomes "renders the identical templates through the identical
   content functions".
4. **How draft mode works, step 4:** replace it with:

   > The Presentation iframe loads the `/preview/*` path. The preview route
   > calls the same content function as its public twin (`getBlogPost()`,
   > `getCaseStudy()` or `getProject()` from `@/lib/content`), passing
   > `getDraftModeProps(Astro)`
   > ([src/sanity/lib/draft-mode.ts](../../../src/sanity/lib/draft-mode.ts)),
   > which reads the cookie. The Sanity source forwards
   > `{ perspectiveCookie }` through its loaders
   > ([src/sanity/lib/page-data.ts](../../../src/sanity/lib/page-data.ts))
   > into `loadQuery`
   > ([src/sanity/lib/load-query.ts](../../../src/sanity/lib/load-query.ts)).
   > When present, `loadQuery` fetches drafts with stega encoding and
   > authenticates using `SANITY_API_READ_TOKEN`. Only the three preview
   > twins pass the cookie; public routes and sections call without it.

5. **l.172:** "(helpers in [page-data.ts](…))" becomes "(helpers exported
   from `@/lib/content`, implemented in
   [src/sanity/lib/page-data.ts](../../../src/sanity/lib/page-data.ts))".
6. **l.187:** "Keep its helpers in an imported module (`page-data.ts`)."
   becomes "Keep its helpers in an imported module — routes import them
   from `@/lib/content`."
7. **Image alt text, l.~370:** "The same projection is duplicated in the one
   inline query in `CaseStudyFeatured.astro` — update both when adding an
   image query." becomes "Every image query lives in `queries.ts` (including
   `FEATURED_CASE_STUDIES_QUERY`, which CaseStudyFeatured uses through
   `getFeaturedCaseStudies()`)."
8. **Replace the whole "Data fetching pattern" section** (from its heading
   to the line before "## Projects + gallery") with:

````markdown
## Data fetching pattern

**Consumers get content from `@/lib/content` — never from `src/sanity`.**
Pages, templates, sections and components import the functions, view-model
types and image helpers from there; `npm run check:boundary` fails the build
when anything outside `src/sanity` and the Sanity-only allow list (preview
twins, `/api/draft-mode`, Portable Text renderers, `BlogBody`, the
visual-editing islands, `BaseLayout`, `middleware.ts`, `env.d.ts`) imports
Sanity code.

```astro
---
import { getBlogPosts, imageSrc, plainText } from "@/lib/content";

const posts = await getBlogPosts(); // BlogPostSummary[], newest first
---

{
  posts.map((post) => (
    <BlogCard
      title={post.title}
      image={imageSrc(post.image, { width: 600 }) ?? null}
      imageAlt={post.image?.alt ?? null}
      data-title={plainText(post.title)}
      href={`/blog/${post.slug}`}
    />
  ))
}
```

- **Images** are `ContentImage`. Size them with `imageSrc(image, { width })`
  (for `<Visual>` and cards), `imageUrl(image, { width, height, format })`
  (raw tags, OG, JSON-LD, lightboxes) or `sizedImage(image, width)` (tiles
  that need width + height). The Sanity mapper attaches a `url()` builder
  around `urlFor`, so each placement gets exactly the CDN size it always
  did.
- **Rich text** arrives pre-rendered: HTML strings for FAQ answers, project
  write-ups and case-study blocks; the blog body is a
  `{ kind: "portable-text" | "mdx" }` union rendered by `<BlogBody>`.
- **Draft perspective.** Every content function takes a trailing
  `opts?: { perspectiveCookie }`. Only the `/preview/*` twins pass
  `getDraftModeProps(Astro)`; everything else is prerendered and calls
  without it.

**Inside `src/sanity/`** the layers run one way:
`page-data.ts` (GROQ loaders, `loadQuery`, placeholder-safe listings and
`getStaticPaths` helpers) → `map/*.ts` (query results → view models; the
only users of `urlFor`, `hotspotPosition`, `stegaClean` and Portable Text
serialisation) → `source.ts` (the `ContentSource` functions).

**Stega policy** (header of `src/sanity/lib/source.ts`). In draft mode
`loadQuery` stega-encodes strings so Presentation can overlay them. The
mappers clean values used as logic — slugs, URLs, enums and categories,
dates, numbers, booleans, image sources and alt text, CSS-ish values, SEO
fields, derived text, anything they trim — and leave display strings
(titles, descriptions, names, captions, quotes, labels, rich text) encoded.
A CTA section is cleaned in full (deliberate; see `map/cta.ts`). Consumers
that need a display string as data call `plainText()`.

**Loader rules** (`page-data.ts`):

- Fetch the single document **first** (related-content queries depend on
  its categories/slug), then `Promise.all` everything independent — never
  stack sequential awaits.
- **Related content is filtered in GROQ, never in JS over the whole
  collection.** Fetching all posts to render 3 related cards is the pattern
  that caused production `exceededCpu` 503s. Query the few cards you need,
  with a small buffer over the card slot (`[0...4]` for a 2-card slot).
- Clean any GROQ param built from fetched values (`stegaClean`) — an
  encoded category never matches in preview.
- Return `null` for "not found" / "not publicly visible" and let the route
  decide the response.

**Adding a new content type with a detail route needs six pieces:**

1. **View models + contract** — named types in `src/lib/content/types.ts`
   and the new functions on `ContentSource` (`getThing`, `getThings`,
   `getThingStaticPaths`).
2. **Loader** — GROQ in `queries.ts` (`defineQuery`, then
   `npm run typegen`), a raw loader and a `get<Type>StaticPaths` helper in
   `page-data.ts` (slug-only query, "not published" flags excluded).
3. **Mapper + source** — `src/sanity/lib/map/<type>.ts` (apply the stega
   policy) and the functions in `source.ts`; re-export them from
   `src/lib/content/index.ts`.
4. **Public prerendered route** — `src/pages/<type>/[slug].astro` with
   `export const getStaticPaths = get<Type>StaticPaths;` imported from
   `@/lib/content`.
5. **`/preview` SSR twin** — `src/pages/preview/<type>/[slug].astro` with
   `prerender = false`, same template, same function plus
   `getDraftModeProps(Astro)`.
6. **Presentation location** — a `defineLocations` entry in `resolve.ts`
   pointing at `/preview/<type>/<slug>`, followed by a Studio deploy.

Then add the query to the parity fixtures (`src/sanity/lib/fixtures/` —
an unknown query throws there) and run the checks below. The sitemap picks
the new route up automatically. **llms.txt / llms-full.txt do not** — each
content type needs an explicit section there (see the case-studies and
projects blocks in `src/pages/llms*.txt.ts`), calling the content functions
with `.catch(() => [])` so a fresh fork still builds.

### Parity and preview-safety checks

- `PARITY_FIXTURES=1` answers every query from GROQ-shaped fixtures
  (`src/sanity/lib/fixtures/`), so a populated site builds with no Sanity
  project. `KEEP_DEV_PAGES=1` keeps `/components` in the build. Capture
  `dist/client` before a refactor and compare after with
  `node scripts/compare-dist.mjs <before> dist/client` (add `--canonical`
  to compare HTML as a DOM).
- `PARITY_FIXTURES=preview npm run build && node scripts/check-stega-leaks.mjs`
  builds draft-like data (stega-encoded strings + half-filled documents)
  and fails if stega reaches a logic attribute (href, src, class, style,
  id, search data-attributes) on the pages the preview twins render.
````

9. **Projects + gallery section:** replace the "Loaders" and "View models"
   bullets with:

   > - **Content functions** (`@/lib/content`): `getProject` (the project,
   >   up to three related cards — same category first, filtered in GROQ —
   >   and the default CTA section), `getProjects`, `getFeaturedProjects`,
   >   `getGallery`, `getProjectStaticPaths` — all placeholder-safe.
   > - **Mapping** (`src/sanity/lib/map/projects.ts`): `toProjectCard`,
   >   `toProjectDetail`, `toGalleryEntry`. Pages size photos with
   >   `sizedImage()`. Pure formatters live in `src/lib/project-format.ts`
   >   and are covered by `node scripts/check-projects.mjs`.

- [ ] **Step 3: component-api skill**

Make these edits:

- **SKILL.md l.36:** "`src/components/portabletext/` (Sanity rich-text
  renderers)" becomes "`src/components/portabletext/` (Sanity rich-text
  renderers, used by `src/components/blog/BlogBody.astro`)". Add one
  sentence after the directory map: "Content-driven components take view
  models and `ContentImage`s from `@/lib/content` — never Sanity data."
- **layout-and-content.md, the BlogCard paragraph:** "The `BlogPost`
  interface in `src/pages/blog/index.astro` maps 1:1 to CMS fields."
  becomes "Listings pass `BlogPostSummary`s from `@/lib/content`, sizing
  the image with `imageSrc(post.image, { width: 600 })`; `BlogPostGrid`
  takes `BlogPostSummary[]`."
- **local-service.md l.34:** "Card from `toProjectCards()`" becomes "Card
  for a `ProjectCardData` from `getProjects()` (`@/lib/content`)".
- **local-service.md l.41:** "The content model and loaders are documented
  in the `sanity-and-preview` skill." becomes "The content functions and
  the Sanity mapping are documented in the `sanity-and-preview` skill."

- [ ] **Step 4: README, CLAUDE.md, CI comment**

**README.md l.33:** "(slug-only GROQ queries; helpers in
`src/sanity/lib/page-data.ts`)" becomes "(slug-only GROQ queries; helpers
exported from `src/lib/content`, Sanity implementation in
`src/sanity/lib/page-data.ts`)". In l.35, "same templates, same loaders"
becomes "same templates, same content functions".

**CLAUDE.md:**

- In the file-structure block, change the `lib/` line to:
  `├── lib/              # content/ (THE content interface — all CMS content comes from @/lib/content), slots.ts, uid.ts, jsonld.ts, toc.ts, …`
- Under "Verification commands", add `npm run check:boundary` (no Sanity
  imports outside src/sanity) after `check:config`.
- Under "Anti-patterns", add:

  `- Importing Sanity (\`@/sanity/_\`, \`@sanity/_\`, \`urlFor\`, \`stegaClean\`, \`astro-portabletext\`) outside \`src/sanity\` and the allow list in \`scripts/check-content-boundary.mjs\` — content, types and image helpers come from \`@/lib/content\`.`

**`.github/workflows/ci.yml`:** change the header comment "(the
getStaticPaths queries in src/sanity/lib/page-data.ts)" to "(the
getStaticPaths helpers behind @/lib/content, in
src/sanity/lib/page-data.ts)".

- [ ] **Step 5: Final verification**

Run:

```bash
npm run format
npm run format:check
npm run check 2>&1 | tail -3
npm run check:hover
npm run check:config
npm run check:boundary
KEEP_DEV_PAGES=1 npm run build && node scripts/compare-dist.mjs .parity/empty dist/client
KEEP_DEV_PAGES=1 PARITY_FIXTURES=1 npm run build && node scripts/compare-dist.mjs .parity/fixtures dist/client
PARITY_FIXTURES=preview npm run build && node scripts/check-stega-leaks.mjs
npm run build
grep -rnE "page-data|urlFor|stegaClean|getDraftModeProps|SanityCtaSection|sanityPhoto|toProjectCards|lib/testimonials" .claude/skills README.md CLAUDE.md | grep -v "src/sanity\|preview\|draft-mode\|check-content-boundary"
```

Expected:

- `format:check` passes.
- `npm run check` reports `0 errors`; `check:hover`, `check:config` and
  `check:boundary` exit 0.
- Both parity comparisons print `Identical`.
- The leak check passes.
- The final plain build succeeds. That is the production configuration:
  no fixtures, and dev pages stripped.
- The last grep shows only lines Step 1 classified as still true.

If `npm run format` touched files from earlier tasks, include them in this
commit.

- [ ] **Step 6: Commit**

```bash
git add -A .claude/skills README.md CLAUDE.md .github/workflows/ci.yml src scripts
git commit -m "$(cat <<'EOF'
Document the content interface in skills, README and CLAUDE.md

sanity-and-preview now describes consumers on @/lib/content, the
page-data -> map -> source layering, the stega policy, the six-piece
recipe for a new content type, and the parity / preview-safety checks.
component-api, README, CLAUDE.md (check:boundary, anti-pattern) and the
CI comment follow.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```
