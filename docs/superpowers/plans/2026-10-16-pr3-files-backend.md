# PR 3 — Files backend: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete local-files content backend (Astro content
collections for every content type, validated when content syncs, with MDX
blog bodies), make it the default source behind `@/lib/content`, and prove
it renders the same markup as the Sanity source for the same content.

**Architecture:** `src/content.config.ts` defines one collection per content
type. A `richText` Zod transform renders Markdown strings to HTML at
content sync, and a loader wrapper (`src/lib/content/checks.ts`) fails sync
on missing images and dangling references, naming the file and the field.
`src/lib/content/files/` maps collection entries to the existing view models
and is declared `satisfies ContentSource`. `src/lib/content/source.ts`
re-exports it. MDX bodies render through `BlogBody` with a component map
(`Callout`, `VideoEmbed`, `BlogCta`, `pre`), so authors write no imports.
Equivalence is proven by building the Sanity source from fixtures _derived
from the same `src/content` files_ and diffing the two builds with a new
`compare-dist --equivalent` mode. A test-only `CONTENT_SOURCE` build switch
(removed in PR 4) lets one checkout build either backend.

**Tech Stack:** Astro 7.3.2 content layer (`glob()`/`file()` loaders,
`reference()`, `image()`, `render()`), `@astrojs/mdx` 8.1,
`@astrojs/markdown-satteri` 0.4 (Astro's own Markdown engine, used only at
content sync), Zod 4 via `astro/zod`, `getImage()` from `astro:assets`, the
existing Sanity source, and node-html-parser for the dist diffs.

**Spec:** [docs/superpowers/specs/2026-10-16-files-first-content-design.md](../specs/2026-10-16-files-first-content-design.md). This plan covers "Delivery" item 3 plus the "Content formats", "Type safety" and "Testing" sections as they apply to PR 3.

## Global Constraints

- **Default source.** After Task 8, `src/lib/content/source.ts` is a header
  comment plus exactly `export { default } from "./files";`. Before Task 8
  it stays on the Sanity source.
- **Collections exactly per the spec table.** The paths are
  `src/content/blog/<slug>.mdx`, `authors/<id>.json`,
  `ctas/blog/<id>.json`, `ctas/section/<id>.json`, `settings.json`
  (`file()`), `case-studies/<slug>.json`, `projects/<slug>.json`,
  `gallery.json` (`file()`) and `testimonials/<id>.json`. Images live in an
  `images/` folder beside the entries and are referenced by relative path
  through `image()`.
- **Ids are lowercase-kebab filenames.** Every `glob()` collection enforces
  this in `generateId`, as `services` already does.
- **Bad content fails `astro sync`** (so it fails `npm run check`, `npm run
build` and `astro dev`) with a message that names the file and the field.
  This covers schema errors, missing images (data fields and MDX bodies),
  dangling references and dangling inline `<BlogCta id>` tags.
- **Alt text is never empty** in Files content (`alt` validator:
  `"Alt text can't be empty"`). An image field without its alt field fails.
- **Shared enums have ONE source.** Blog categories, blog section
  categories, blog CTA aspect ratios, callout types, case-study categories,
  industries and block options, project categories and photo labels live in
  `src/config/blog.ts`, `src/config/case-studies.ts` and
  `src/config/projects.ts`. Both `src/content.config.ts` and
  `src/sanity/schemaTypes/*` import them.
- **The Files backend never imports Sanity.** `src/lib/content/files/**` is
  not on the boundary allow list. `src/lib/content/markdown.ts` and
  `src/lib/content/checks.ts` are node-only and may be imported only by
  `src/content.config.ts`. `src/lib/content/files/**` may be imported only
  from `src/lib/content/` and `src/components/blog/mdx/`.
  `npm run check:boundary` enforces all three rules.
- **Files functions ignore `opts`.** They are declared without the trailing
  `opts` parameter (`satisfies` allows fewer parameters). `plainText` is
  the identity function.
- **Sanity-mode output stays identical** in both PR 2 baselines
  (`.parity/empty`, `.parity/fixtures`) through Task 7. Task 8 re-baselines
  exactly three files, `index.html`, `components/index.html` and
  `services/kitchen-remodeling/index.html`, for the reasons it names.
- **Do not edit any GROQ query string** in `src/sanity/lib/queries.ts`. The
  fixtures key on them.
- **Sample content uses typographic punctuation** (’ “ ” —) in prose, never
  ASCII `'`, `"`, `--` or `...`. MDX and the `richText` transform apply smart
  punctuation, and Portable Text does not, so ASCII quotes would differ
  between the sources. The equivalence check catches any slip.
- **Every image's alt text describes what the photo actually shows.** The
  placeholder photos are web-design and interior shots. Never describe them
  as kitchens or porches.
- **CLAUDE.md conventions apply to every touched component:** a `docs`
  prop with JSDoc, named prop types, the prop-order rule, `render` where
  the component can skip itself, DEV `console.warn` and never a throw, no
  stray `<` or `>` in frontmatter comments, CSS co-located in
  `@layer components`, and `npm run check:hover` passing.
- **The `CONTENT_SOURCE` switch is test-only.** It is read at build time
  only, never set in a real build, and removed in PR 4.
- **Per-task gate:** `npm run check` (0 errors), `npm run check:hover`,
  `npm run check:boundary`, plus the parity commands the task lists. Task 9
  adds `format`, `format:check`, `check:config`, `check:content`,
  `check:content-build`, the Sanity-mode stega check and a
  `wrangler deploy --dry-run`.
- **Node.** The `scripts/*.mjs` unit checks import `.ts` files directly.
  That needs Node 22.18 or later (built-in type stripping). CI's
  `node-version: 22` resolves to it, and `scripts/check-projects.mjs`
  already relies on it.
- **Commits:** end the message with a blank line, then exactly
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Don't push.

## Decisions this plan makes

These settle the points the spec leaves open. Each was measured where it
could be (Astro 7.3.2, this repo, 2026-10-16).

1. **Rich text inside JSON is rendered at content sync, not at runtime.**
   A `richText` Zod transform in `src/content.config.ts` turns each Markdown
   string into `{ markdown, html, text }`. Async transforms work in content
   schemas (measured), Astro stores the HTML in its data store, and the
   generated JSON Schema still describes the input as a string. The engine
   is `@astrojs/markdown-satteri` (`createSatteriMarkdownProcessor`). It
   was already in the tree as Astro's own Markdown engine, and
   `@astrojs/mdx` 8 depends on it. That gives JSON rich text the same GFM
   and smart-punctuation rules as MDX bodies. `marked` was rejected
   because its output and punctuation differ from MDX. Rendering at sync
   also keeps Sätteri's native binding out of the Cloudflare Worker bundle.
   The SSR preview twins reach the content modules, so a runtime import
   would have dragged it in.
2. **Sync-time checks.** Astro 7.3.2 only _logs_ a dangling `reference()`
   (`astro sync` and `astro build` both exit 0, measured). It also defers a
   missing `image()` file to a build error that does not name the content
   file. `checked()` in `src/lib/content/checks.ts` wraps each loader and
   throws after loading, with lines like
   `src/content/projects/x.json → heroImage: image file not found: "./images/y.webp"`.
   It checks reference targets against the files on disk, so it does not
   depend on load order.
3. **`image()` works inside a `file()` loader** (measured). So
   `src/content/gallery.json` is one top-level array with an `id` on each
   item, and its photos live in `src/content/gallery/images/`.
   `src/content/settings.json` is an object with one key, `"site"`.
4. **Parity datasets.** `PARITY_FIXTURES=1` (PR 2's hand-written edge
   dataset: empty alts, nulls, dangling links, duplicate headings) stays
   untouched, so `.parity/fixtures` needs no re-baseline. A new
   `PARITY_FIXTURES=sample` mode _derives_ GROQ-shaped documents from
   `src/content` at build time. It reads the same entries the Files source
   reads, and converts each rich-text field's Markdown source to Portable
   Text with a small converter that throws on anything outside the
   supported subset. Both builds then describe identical content by
   construction. Rewriting the PR 2 fixtures instead would have deleted the
   edge cases only Sanity can express.
5. **`CONTENT_SOURCE=files|sanity`** is a Vite `load` hook in
   `astro.config.mjs`. It replaces the module `source.ts` selects. It is
   test-only and removed in PR 4, when the add-on's CI job builds Sanity
   mode.
6. **MDX heading ids.** MDX gives every heading an id through
   github-slugger: `whats-next`, then `whats-next-1` for a duplicate.
   Portable Text ids only h2s, through `slugifyHeading`: `what-s-next`,
   then `section-<key>` for a duplicate. Each source's table of contents
   matches its own ids. The sample's h2s are plain, unique words, so both
   produce the same ids. The comparator ignores ids on h3 to h6.
7. **Body images.** Markdown renders `<p><img></p>` with no caption.
   Portable Text renders `<figure><img>[<figcaption>]</figure>`. The
   comparator treats a lone-image `<p>` or bare `<figure>` as its `<img>`.
   Files mode does not support body image captions.
8. **Sample content keeps each type's current flavour.** Blog posts and
   case studies port the existing placeholders in
   `src/data/case-studies.ts` and `BlogPostGrid`. They are web-studio work:
   their enums and the placeholder photos are web-design. Projects,
   gallery and testimonials are home services (`PROJECT_CATEGORIES`).
   Photos are copied into each collection's `images/` folder from
   `src/assets/placeholder-images/`, so no new binaries are added. Git
   stores identical bytes once.
9. **`CaseStudyGrid` is kept.** It is a generic filtered section with
   featured, category and limit filters, used on `/components`. Its
   default data becomes `getCaseStudies()`. `BlogPostGrid`'s default
   becomes `getBlogPosts()`. Both built-in sample datasets are deleted.
10. **Inline CTAs.** `<BlogCta id>` in MDX maps to
    `src/components/blog/mdx/BlogCta.astro`, which reads the Files backend
    (`getBlogCtaById`). MDX bodies exist only in Files mode, so no
    `ContentSource` method is added. The boundary rule in the Global
    Constraints keeps that the only direct importer.
11. **Optional `updated` date** on blog posts and case studies. The spec
    table is silent. Without it, `dateModified` in JSON-LD would differ
    from Sanity's `_updatedAt`.
12. **Testimonial avatars read their alt from the image** (`avatar.alt`) in
    `TestimonialCard`, `SingleTestimonial` and `TestimonialShowcase`, so
    `avatarAlt` means something. The Sanity mapper already sets that alt to
    the person's name, so Sanity output is unchanged.
13. **`check:content` writes temporary `zz-check-*` entries.** It never
    edits existing files, except a temporary append to `gallery.json`,
    which it restores. So it keeps working after a fork replaces the
    sample content.
14. **`check:schema` samples slugs from `src/content`** instead of
    querying Sanity.
15. **Homepage defaults follow the sample.** `<SingleTestimonial name>` on
    `/` becomes "Marcus Bell", and `FEATURED_CASE_STUDIES_SLUGS` becomes
    the three sample studies. The PR 2 edge fixtures gain a "Marcus Bell"
    testimonial (no image, appended), so the draft-mode name-lookup check
    in `check-stega-leaks.mjs` keeps its subject.
16. **Preview twins in a Files-default build.** They read
    `@/sanity/lib/source` directly. The shared templates still call
    `plainText` from `@/lib/content`, which is the identity in Files mode.
    So stega cleaning is only correct in `CONTENT_SOURCE=sanity` builds,
    which is where the stega check runs. Real draft preview needs a Sanity
    project, which a Files fork does not have, and PR 4 moves the twins
    into the add-on.
17. **Visual parity is a DOM diff, not screenshots.** The spec's Testing
    section asks for Playwright screenshots of Files and Sanity renders.
    This plan uses `compare-dist --equivalent` over every built route
    instead, the PR 2 ruling's precedent: it is deterministic, covers every
    page rather than nine, and names the differing element. No CSS changes
    between the two sources, so a pixel check would add nothing.
18. **CI scope.** PR 3 adds `check:content`, `check:content-build` and a
    test-only Sanity-mode build. The spec's full default-CI list (adding
    `check:hover` and `check:schema` against the built site) is the end
    state, and lands with PR 4's CI restructure for the add-on job.
    `check:schema` needs a served site; PR 3 only makes it sample
    `src/content`.
19. **The content-editing guide is a new skill**,
    `.claude/skills/content-files/SKILL.md`. `component-api` is about
    components, and content editing is a separate job with its own
    trigger. `.gitignore` gains `!.claude/skills/content-files`.

## Review Focus

1. **Unquoted dates in MDX frontmatter.** `date: 2026-03-01` parses as a
   YAML Date, not a string. Expected: `astro sync` fails, naming the file
   and `date`, with a message that says to quote it. Pinned by Task 4's
   `unquoted date` case.
2. **A typo in an image path, in a data field or an MDX body.** Expected:
   a sync error naming the content file and the field (or `body`), not
   Astro's anonymous build-time `ImageNotFound`. Pinned by Task 4's
   `missing data image` and `missing body image` cases.
3. **Local images that need a plain URL.** These are OG tags, JSON-LD,
   raw-`<img>` avatars and lightbox sources. Expected: a resized file at
   an absolute URL where one is required. Never the original, never a
   relative og:image. Pinned by `scripts/check-content-build.mjs`
   (Task 5).
4. **A coming-soon case study.** Expected: no detail page, no sitemap or
   `llms-full.txt` entry, and its card on `/case-studies` links to its
   live URL. Pinned by `scripts/check-content-build.mjs` (Task 5).
5. **A typo in an inline `<BlogCta id>`.** Expected: a sync error naming
   the post and the id, not a crash at render. Pinned by Task 6's
   `dangling inline CTA` case.

## Parity procedure

The baselines live in `.parity/`, which is git-ignored:

| Directory          | Build                                                                                   | Captured                         |
| ------------------ | --------------------------------------------------------------------------------------- | -------------------------------- |
| `.parity/empty`    | Sanity source, placeholder project (no content)                                         | PR 2 (re-baselined in Task 8)    |
| `.parity/fixtures` | Sanity source, `PARITY_FIXTURES=1` (PR 2 edge dataset)                                  | PR 2 (re-baselined in Task 8)    |
| `.parity/files`    | Files source, the sample content                                                        | Task 5 (refreshed Tasks 6 and 8) |
| `.parity/sample`   | Sanity source, `PARITY_FIXTURES=sample` (fixtures derived from the same sample content) | Task 7 (refreshed Task 8)        |

Every build sets `KEEP_DEV_PAGES=1`, so `/components` is compared too.
`CONTENT_SOURCE` makes the backend explicit and keeps the commands valid on
both sides of Task 8's switch:

```bash
# Sanity source (Tasks 1–9)
KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity npm run build && node scripts/compare-dist.mjs .parity/empty dist/client
KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity PARITY_FIXTURES=1 npm run build && node scripts/compare-dist.mjs .parity/fixtures dist/client
# Files source (Task 5 on)
KEEP_DEV_PAGES=1 CONTENT_SOURCE=files npm run build && node scripts/compare-dist.mjs .parity/files dist/client
# Files ≡ Sanity (Task 7 on)
KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity PARITY_FIXTURES=sample npm run build && node scripts/compare-dist.mjs .parity/sample dist/client
node scripts/compare-dist.mjs --equivalent .parity/sample .parity/files
```

Expected: `Identical: <n> files.` from each plain comparison, and
`Equivalent: <n> files.` from `--equivalent`.

To capture or refresh a baseline, run its build, then
`rm -rf .parity/<name> && cp -R dist/client .parity/<name>`. Re-baseline
only where a task says so, and only after reading every `DIFF` line it
replaces.

**If `.parity/empty` or `.parity/fixtures` is lost**, recapture them from
the PR 2 tip:

```bash
git worktree add ../pr3-baseline 2cf72cb
cd ../pr3-baseline && npm ci
KEEP_DEV_PAGES=1 npm run build && cp -R dist/client ../clcreative-AI-first-website-starter/.parity/empty
KEEP_DEV_PAGES=1 PARITY_FIXTURES=1 npm run build && cp -R dist/client ../clcreative-AI-first-website-starter/.parity/fixtures
```

## Expected Files-vs-Sanity differences

`compare-dist --equivalent` normalises exactly these differences and
nothing else. The sample content avoids the ones marked _avoided_, so a
regression there still fails.

| #   | Difference                                                                                                                                                                                                                                                                                                                                                         | Handling                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 1   | Image URLs and sizing. Local `/_astro/…` files (`<Image>`, `getImage()`) against `cdn.sanity.io` URLs; `srcset`, `sizes`, `width`, `height`, `loading`, `decoding`, `fetchpriority`, `data-astro-image` (and its `-fit` / `-pos` companions, which Astro stamps only on processed local images and no CSS reads with `responsiveStyles: false`) differ on `<img>`. | Normalised: every image URL becomes `IMAGE`; those `<img>` attributes are dropped; `alt`, `class`, `style` kept. |
| 2   | Syntax highlighting. MDX highlights at compile time, while Portable Text uses `<Code>`; token spans and the inline `style` spacing can differ.                                                                                                                                                                                                                     | Normalised: a `pre.astro-code` compares by `data-language` and text only.                                        |
| 3   | Whitespace at block boundaries (`<li>One\n<ul>` against `<li>One<ul>`).                                                                                                                                                                                                                                                                                            | Normalised: text is trimmed next to block elements; runs collapse to one space.                                  |
| 4   | Body image wrapper: `<p><img></p>` (Markdown) against `<figure><img></figure>` (Portable Text). Files has no body image captions.                                                                                                                                                                                                                                  | Normalised: a lone-image `<p>` or bare `<figure>` compares as its `<img>`. Captions avoided.                     |
| 5   | Heading ids on h3 to h6: MDX ids every heading, Portable Text only h2.                                                                                                                                                                                                                                                                                             | Normalised: `id` dropped on h3 to h6. h2 ids still compared.                                                     |
| 6   | h2 ids for punctuation or duplicate headings (github-slugger against `slugifyHeading`).                                                                                                                                                                                                                                                                            | Avoided: sample h2s are plain words and unique per post.                                                         |
| 7   | Smart punctuation: MDX and `richText` curl ASCII quotes and dashes, Portable Text keeps them as typed.                                                                                                                                                                                                                                                             | Avoided: sample prose uses typographic characters.                                                               |
| 8   | Links that open in a new tab (Portable Text `newTab`), and internal-link hover cards (spec: out of scope).                                                                                                                                                                                                                                                         | Avoided: sample uses plain links.                                                                                |
| 9   | Code-block filename captions (Portable Text `filename`).                                                                                                                                                                                                                                                                                                           | Avoided: sample code blocks have none.                                                                           |
| 10  | `llms-full.txt` bodies. Files emits the post's own Markdown, including code blocks and callout text. Sanity's serializer drops both.                                                                                                                                                                                                                               | Normalised: `llms-full.txt` compares heading, `URL:`, `Client:` and index lines only. `llms.txt` is exact.       |
| 11  | Project write-up plain text. Sanity joins paragraphs with no space, an existing quirk. Files separates them with a space.                                                                                                                                                                                                                                          | Avoided: every sample project sets `seoDescription`, the only consumer's first choice.                           |
| 12  | Focal points. Files images have no hotspot.                                                                                                                                                                                                                                                                                                                        | Avoided: derived fixtures carry no hotspot, so both centre.                                                      |
| 13  | Author avatar alt. Sanity always uses the author's name, while Files uses `avatarAlt` and falls back to the name.                                                                                                                                                                                                                                                  | Avoided: sample authors set no `avatarAlt`.                                                                      |
| 14  | Inline `<style>` order. Each build's module graph can order CSS chunks differently.                                                                                                                                                                                                                                                                                | Normalised: styles compare layer by layer (the `--layers` rule).                                                 |

---

## File map

**Create:**

- `src/config/blog.ts` and `src/config/case-studies.ts`: shared enums.
- `src/lib/content/markdown.ts`: Markdown to `{ markdown, html, text }`,
  node-only.
- `src/lib/content/checks.ts`: the `checked()` loader wrapper, node-only.
- `src/lib/content/files/` with `index.ts`, `entries.ts`, `shared.ts`,
  `ctas.ts`, `testimonials.ts`, `projects.ts`, `case-studies.ts`,
  `blog.ts` and `mdx-text.ts`: the Files backend.
- `src/components/blog/Callout.astro` and
  `src/components/blog/VideoEmbed.astro`: shared markup for MDX and
  Portable Text.
- `src/components/blog/mdx/CodeBlock.astro` (the `pre` override) and
  `src/components/blog/mdx/BlogCta.astro` (`<BlogCta id>`).
- `src/content/**`: the sample content and its `images/` folders.
- `src/sanity/lib/fixtures/sample.ts` and
  `src/sanity/lib/fixtures/markdown-to-pt.ts`: the derived parity dataset.
- `scripts/check-content-text.mjs`: unit checks for the text helpers.
- `scripts/check-content-validation.mjs`: negative content checks.
- `scripts/check-content-build.mjs`: built-site checks for Review Focus
  items 3 and 4.
- `scripts/check-fixture-markdown.mjs`: unit checks for the Markdown to
  Portable Text converter.
- `.claude/skills/content-files/SKILL.md`: the content-editing guide.

**Modify:**

- **Config:** `astro.config.mjs`, `package.json`, `.gitignore`,
  `.vscode/settings.json`, `.github/workflows/ci.yml`,
  `src/content.config.ts`, `src/config/projects.ts`.
- **Content interface:** `src/lib/content/{source,index,images,types,blocks}.ts`,
  `src/lib/jsonld.ts`.
- **Sanity schema types:** `blogPost.ts`, `blogCta.ts`, `callout.ts`,
  `caseStudy.ts`, `project.ts`.
- **Sanity fixtures:** `fixtures/index.ts`, `fixtures/data.ts`.
- **Components:** `BlogBody`, `portabletext/{Callout,VideoEmbed}`,
  `ui/{Quote,TestimonialCard,GalleryBrowser}`,
  `sections/{Reviews,SingleTestimonial,TestimonialShowcase,CaseStudyGrid,BlogPostGrid,CaseStudyFeatured}`,
  and the three templates.
- **Routes:** `src/pages/{index,components}.astro`,
  `src/pages/blog/index.astro`, all three `src/pages/preview/**/[slug].astro`.
- **Scripts:** `check-content-boundary.mjs`, `compare-dist.mjs`,
  `check-stega-leaks.mjs`, `check-schema.mjs`.
- **Docs:** `README.md`, `CLAUDE.md`, `docs/new-project-checklist.md`, and
  the skills `sanity-and-preview`, `component-api` (plus
  `references/layout-and-content.md`), `seo-discoverability`, `setup`
  (SKILL.md table row) and `setup/references/no-cms.md` (one stale bullet).

**Delete:** `src/data/case-studies.ts` and the `samplePosts` block in
`BlogPostGrid.astro`.

---

### Task 1: Shared content enums and the test-only source switch

Move every enum the two backends share into `src/config/`, point the Sanity
schema at it, and add the `CONTENT_SOURCE` build switch the rest of the plan
uses for parity builds. Rendered output does not change.

**Files:**

- Create: `src/config/blog.ts`, `src/config/case-studies.ts`
- Modify: `src/config/projects.ts` (append two exports)
- Modify: `src/sanity/schemaTypes/blogPost.ts`, `blogCta.ts`, `callout.ts`,
  `caseStudy.ts`, `project.ts` (option lists only)
- Modify: `src/pages/blog/index.astro` (`categoryConfig` type)
- Modify: `astro.config.mjs` (the `contentSourceSwitch()` plugin)

**Interfaces:**

- Consumes: nothing new.
- Produces:
  - `src/config/blog.ts`: `BLOG_CATEGORIES` (readonly tuple),
    `type BlogCategory`, `BLOG_SECTION_CATEGORIES`,
    `type BlogSectionCategory`, `BLOG_CTA_ASPECT_RATIO_OPTIONS`,
    `BLOG_CTA_ASPECT_RATIOS` (`("square"|"landscape"|"portrait")[]`),
    `CALLOUT_TYPE_OPTIONS`, `type CalloutType`.
  - `src/config/case-studies.ts`: `CASE_STUDY_CATEGORIES`,
    `CASE_STUDY_INDUSTRIES`, `SECTION_SPACING_OPTIONS`, `SECTION_SPACINGS`,
    `CASE_STUDY_MAX_WIDTHS`, `CASE_STUDY_ASPECT_RATIO_OPTIONS`,
    `CASE_STUDY_ASPECT_RATIOS`.
  - `src/config/projects.ts`: `PROJECT_CATEGORY_VALUES: string[]`,
    `PROJECT_PHOTO_LABELS` (`readonly ["Before", "During", "After"]`).
  - Build env `CONTENT_SOURCE=files|sanity`, which overrides the module
    `src/lib/content/source.ts` exports.

- [ ] **Step 1: Confirm the PR 2 baselines exist**

Run: `ls .parity`
Expected: `empty  fixtures` (plus anything else). If either is missing,
recapture it as described in the Parity procedure ("If `.parity/empty` or
`.parity/fixtures` is lost") before going on.

- [ ] **Step 2: Write the failing check for the switch**

Run: `CONTENT_SOURCE=nope npm run build 2>&1 | tail -3; echo "exit=$?"`
Expected today: the build **succeeds**, because nothing reads the variable
yet. After Step 9 it must fail with `Unknown CONTENT_SOURCE "nope"`.

- [ ] **Step 3: Create `src/config/blog.ts`**

```ts
/**
 * Blog enums — plain data, read by the content schemas
 * (src/content.config.ts), the Sanity schema (src/sanity/schemaTypes/) and
 * the blog pages, so the three can never disagree. REPLACE THE CATEGORIES
 * PER CLIENT: they are placeholders.
 *
 * Renaming a category orphans posts that use the old name: a files build
 * fails naming the post and the field; Sanity documents keep the old value
 * until re-saved.
 */

/** Every category a post can carry. */
export const BLOG_CATEGORIES = [
  "News",
  "Guides",
  "Insights",
  "Tutorials",
  "Resources",
] as const;
export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

/**
 * The categories that have their own section on /blog — the values a post's
 * `primaryCategory` may take. Keep in step with `categoryConfig` in
 * src/pages/blog/index.astro (typed against this list).
 */
export const BLOG_SECTION_CATEGORIES = [
  "News",
  "Guides",
  "Insights",
  "Tutorials",
] as const satisfies readonly BlogCategory[];
export type BlogSectionCategory = (typeof BLOG_SECTION_CATEGORIES)[number];

/** The image shapes a blog CTA offers (titles are the Studio labels). */
export const BLOG_CTA_ASPECT_RATIO_OPTIONS = [
  { title: "Square (1:1)", value: "square" },
  { title: "Landscape (3:2)", value: "landscape" },
  { title: "Portrait (3:4)", value: "portrait" },
] as const;
export const BLOG_CTA_ASPECT_RATIOS = BLOG_CTA_ASPECT_RATIO_OPTIONS.map(
  (option) => option.value,
);

/** Callout styles in a post body (MDX `<Callout type>`, Sanity `callout`). */
export const CALLOUT_TYPE_OPTIONS = [
  { title: "Tip", value: "tip" },
  { title: "Warning", value: "warning" },
  { title: "Info", value: "info" },
] as const;
export type CalloutType = (typeof CALLOUT_TYPE_OPTIONS)[number]["value"];
```

- [ ] **Step 4: Create `src/config/case-studies.ts`**

```ts
/**
 * Case-study enums — plain data, read by the content schemas
 * (src/content.config.ts) and the Sanity schema
 * (src/sanity/schemaTypes/caseStudy.ts), so the two can never disagree.
 * REPLACE THE CATEGORIES AND INDUSTRIES PER CLIENT: they are placeholders.
 * The block options mirror the case-study block components and rarely
 * change.
 */

/** Drives the category filter on /case-studies. */
export const CASE_STUDY_CATEGORIES = [
  "Design",
  "Development",
  "Strategy",
  "Branding",
  "Marketing",
  "Consulting",
] as const;

/** Drives the industry filter on /case-studies. */
export const CASE_STUDY_INDUSTRIES = [
  "Agencies",
  "AI Companies",
  "Consultants",
  "Financial Services",
  "Food & Beverage",
  "Home Services",
  "Manufacturing / Industrial",
  "Non-Profits",
  "Real Estate",
  "Recruiting",
  "Retail / E-commerce",
  "SaaS",
  "Wellness",
] as const;

/**
 * Vertical spacing for a content block — Section's padding sizes minus
 * "page-top" (SectionSpacing in src/lib/content/blocks.ts).
 */
export const SECTION_SPACING_OPTIONS = [
  { title: "None", value: "none" },
  { title: "Extra Small", value: "xsmall" },
  { title: "Small", value: "small" },
  { title: "Main", value: "main" },
  { title: "Large", value: "large" },
] as const;
export const SECTION_SPACINGS = SECTION_SPACING_OPTIONS.map(
  (option) => option.value,
);

/** Content widths for the rich-text blocks (leave unset for the default). */
export const CASE_STUDY_MAX_WIDTHS = [
  "20ch",
  "30ch",
  "40ch",
  "48ch",
  "60ch",
  "48rem",
  "60rem",
  "100%",
] as const;

/** Crop ratios for the image blocks (leave unset for the block default). */
export const CASE_STUDY_ASPECT_RATIO_OPTIONS = [
  { title: "Auto (no crop)", value: "auto" },
  { title: "Wide (21:9)", value: "wide" },
  { title: "Widescreen (16:9)", value: "widescreen" },
  { title: "Landscape (3:2)", value: "landscape" },
  { title: "Square (1:1)", value: "square" },
  { title: "Portrait (2:3)", value: "portrait" },
  { title: "Tall (3:4)", value: "tall" },
] as const;
export const CASE_STUDY_ASPECT_RATIOS = CASE_STUDY_ASPECT_RATIO_OPTIONS.map(
  (option) => option.value,
);
```

- [ ] **Step 5: Append to `src/config/projects.ts`** (after `categoryTitle`)

```ts
/** The category values alone — the enum src/content.config.ts validates. */
export const PROJECT_CATEGORY_VALUES = PROJECT_CATEGORIES.map((c) => c.value);

/** Stage labels a project photo may carry. */
export const PROJECT_PHOTO_LABELS = ["Before", "During", "After"] as const;
```

- [ ] **Step 6: Point the Sanity schema types at the shared lists**

Schema files import `src/config` by relative path, as `project.ts` already
does. The Studio bundle does not resolve `@/`.

`src/sanity/schemaTypes/blogPost.ts`: add
`import { BLOG_CATEGORIES, BLOG_SECTION_CATEGORIES } from "../../config/blog";`
below the existing imports. In the `categories` field, replace the
five-item `list: [ … ]` with
`list: BLOG_CATEGORIES.map((c) => ({ title: c, value: c })),`. In
`primaryCategory`, replace the four-item list with
`list: BLOG_SECTION_CATEGORIES.map((c) => ({ title: c, value: c })),`.

`src/sanity/schemaTypes/blogCta.ts`: add
`import { BLOG_CTA_ASPECT_RATIO_OPTIONS } from "../../config/blog";` and
replace the three-item `list: [ … ]` under `aspectRatio` with
`list: [...BLOG_CTA_ASPECT_RATIO_OPTIONS],`. Keep `layout: "radio"`.

`src/sanity/schemaTypes/callout.ts`: add
`import { CALLOUT_TYPE_OPTIONS } from "../../config/blog";` and replace the
three-item list under `type` with `list: [...CALLOUT_TYPE_OPTIONS],`.

`src/sanity/schemaTypes/project.ts`: extend the existing import to
`import { PROJECT_CATEGORIES, PROJECT_PHOTO_LABELS, categoryTitle } from "../../config/projects";`
and replace `list: ["Before", "During", "After"],` with
`list: [...PROJECT_PHOTO_LABELS],`.

`src/sanity/schemaTypes/caseStudy.ts`: add

```ts
import {
  CASE_STUDY_ASPECT_RATIO_OPTIONS,
  CASE_STUDY_CATEGORIES,
  CASE_STUDY_INDUSTRIES,
  CASE_STUDY_MAX_WIDTHS,
  SECTION_SPACING_OPTIONS,
} from "../../config/case-studies";
```

Then replace the three local option arrays (keep their doc comments):

```ts
const spacingOptions = [...SECTION_SPACING_OPTIONS];

const maxWidthOptions = [
  { title: "Default", value: "" },
  ...CASE_STUDY_MAX_WIDTHS.map((width) => ({ title: width, value: width })),
];

const aspectRatioOptions = [
  { title: "Default", value: "" },
  ...CASE_STUDY_ASPECT_RATIO_OPTIONS,
];
```

In the `categories` field replace the six-item list with
`list: CASE_STUDY_CATEGORIES.map((c) => ({ title: c, value: c })),`. In
`industries`, replace the thirteen-item list with
`list: CASE_STUDY_INDUSTRIES.map((i) => ({ title: i, value: i })),`.

- [ ] **Step 7: Type the blog index sections against the shared list**

In `src/pages/blog/index.astro`, add
`import type { BlogSectionCategory } from "@/config/blog";` beside the other
`@/config` import, and change the `categoryConfig` annotation's
`name: string;` to `name: BlogSectionCategory;`. A section name outside the
list now fails `npm run check`.

- [ ] **Step 8: Prove the Studio schema is unchanged**

Run: `npm run typegen && git diff --exit-code src/sanity/sanity.types.ts && echo SAME`
Expected: `SAME`. The extracted schema carries the same values, so the
generated types are byte-identical. `src/sanity/schema.json` is
git-ignored.

- [ ] **Step 9: Add the switch to `astro.config.mjs`**

Change the vite import to `import { loadEnv, normalizePath } from "vite";`.
Then add this block after the `redirects` constant:

```js
/**
 * TEST-ONLY content-source switch (PR 3 of the files-first plan; removed in
 * PR 4, when the Sanity add-on's own CI job builds Sanity mode).
 * `CONTENT_SOURCE=files` or `CONTENT_SOURCE=sanity` replaces the module that
 * src/lib/content/source.ts re-exports, so one checkout can build either
 * backend for the parity checks (scripts/compare-dist.mjs). Unset in every
 * real build. Like __PARITY_FIXTURES__ below it is decided at build time —
 * nothing at runtime can switch it.
 */
const CONTENT_SOURCES = {
  files: "./src/lib/content/files/index.ts",
  sanity: "./src/sanity/lib/source.ts",
};

/** @returns {import("vite").Plugin | false} */
function contentSourceSwitch() {
  const choice = process.env.CONTENT_SOURCE;
  if (!choice) return false;
  if (!Object.hasOwn(CONTENT_SOURCES, choice)) {
    throw new Error(
      `[content-source-switch] Unknown CONTENT_SOURCE "${choice}". Use "files" or "sanity".`,
    );
  }
  const toId = (/** @type {string} */ rel) =>
    normalizePath(fileURLToPath(new URL(rel, import.meta.url)));
  const selector = toId("./src/lib/content/source.ts");
  const target = toId(
    CONTENT_SOURCES[/** @type {keyof typeof CONTENT_SOURCES} */ (choice)],
  );
  return {
    name: "content-source-switch",
    enforce: "pre",
    load(id) {
      if (id.split("?")[0] === selector)
        return `export { default } from ${JSON.stringify(target)};`;
    },
  };
}
```

In the `vite` block, add `plugins: [contentSourceSwitch()],` above
`define`.

- [ ] **Step 10: Run the switch check again**

Run: `CONTENT_SOURCE=nope npm run build 2>&1 | grep -c 'Unknown CONTENT_SOURCE "nope"'`
Expected: `1`. The build fails.

- [ ] **Step 11: Gate**

```bash
npm run check            # 0 errors
npm run check:hover
npm run check:boundary
KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity npm run build && node scripts/compare-dist.mjs .parity/empty dist/client
KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity PARITY_FIXTURES=1 npm run build && node scripts/compare-dist.mjs .parity/fixtures dist/client
```

Expected: `Identical: <n> files.` twice. The schema lists hold the same
values and the switch re-exports the module `source.ts` already selects.

- [ ] **Step 12: Commit**

```bash
git add src/config/blog.ts src/config/case-studies.ts src/config/projects.ts src/sanity/schemaTypes src/pages/blog/index.astro astro.config.mjs
git commit -m "$(cat <<'EOF'
Share content enums between schemas; add the test-only source switch

Blog, case-study and project enums move to src/config so the coming
content-collection schemas and the Sanity schema read one list.
CONTENT_SOURCE=files|sanity (build time only, removed in PR 4) lets one
checkout build either backend for parity checks.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `resolveImageUrl()` and the raw-URL consumers

Every consumer that needs a plain URL string (a raw `<img>`, `og:image`,
JSON-LD, a lightbox) moves from the synchronous `imageUrl()` to an async
`resolveImageUrl()`. That function sizes local images with `getImage()`.
This closes PR 2's "local images serve originals" gap before Files content
exists. Sanity output is byte-identical: for a CDN image the new function
returns the same string `imageUrl()` did.

**Files:**

- Modify: `src/lib/content/images.ts` (add `resolveImageUrl`, remove
  `imageUrl`), `src/lib/content/index.ts`, `src/lib/content/types.ts`
  (comments)
- Modify: `src/lib/jsonld.ts`, `src/components/templates/{BlogPostTemplate,CaseStudyTemplate,ProjectTemplate}.astro`,
  `src/components/ui/{GalleryBrowser,TestimonialCard}.astro`,
  `src/components/sections/{SingleTestimonial,TestimonialShowcase}.astro`,
  `src/pages/blog/index.astro`

**Interfaces:**

- Consumes: `ContentImage`, `ImageUrlOptions` (`src/lib/content/types.ts`).
- Produces:
  - `resolveImageUrl(image: ContentImage, options?: ImageUrlOptions): Promise<string>`
  - `resolveImageUrl(image: ContentImage | null | undefined, options?: ImageUrlOptions): Promise<string | undefined>`
  - both exported from `@/lib/content`
  - `blogPostJsonLd(post, siteUrl): Promise<any>` and
    `caseStudyJsonLd(cs, siteUrl): Promise<any>` (now async)
  - `imageUrl` no longer exists.

- [ ] **Step 1: List the call sites**

Run: `grep -rn "imageUrl" src --include='*.astro' --include='*.ts' | grep -v "^src/sanity"`
Expected: the matches in the files listed above, plus the
`InternalLinkMark.astro` local variable named `imageUrl`. That one is not
the helper; leave it.

- [ ] **Step 2: Replace `imageUrl` in `src/lib/content/images.ts`**

Update the header comment's second sentence and add the import, so the top
reads:

```ts
/**
 * Image helpers for ContentImage — the only way consumers turn a content
 * image into a `src` or a URL. A CMS image carries a `url()` builder
 * (resized on its CDN); a local image is ImageMetadata, sized by Astro:
 * <Visual> does it for `imageSrc()` results, and `resolveImageUrl()` asks
 * getImage() for a sized file when a plain URL string is needed.
 */
import type { ImageMetadata } from "astro";
import { getImage } from "astro:assets";
import type { ContentImage, ImageUrlOptions } from "./types";
```

Delete the three `imageUrl` overloads and their implementation. Put this in
their place:

```ts
/**
 * A URL string for a raw img tag, an OG tag, JSON-LD or a lightbox, sized
 * either way:
 * - CMS image: its CDN URL at this size (the same URL `imageSrc()` builds);
 * - local image: a file Astro writes at build time with getImage(), at
 *   `width` (else the image's own `width`, e.g. from `sizedImage()`), and
 *   cropped to cover when both `width` and `height` are given.
 * A local result is root-relative ("/_astro/…"): Head resolves og:image
 * against the site URL, and jsonld.ts makes JSON-LD URLs absolute.
 */
export async function resolveImageUrl(
  image: ContentImage,
  options?: ImageUrlOptions,
): Promise<string>;
export async function resolveImageUrl(
  image: ContentImage | null | undefined,
  options?: ImageUrlOptions,
): Promise<string | undefined>;
export async function resolveImageUrl(
  image: ContentImage | null | undefined,
  options: ImageUrlOptions = {},
): Promise<string | undefined> {
  if (!image) return undefined;
  if (typeof image.src === "string")
    return image.url && wantsSize(options) ? image.url(options) : image.src;
  const width = options.width ?? image.width;
  const { height, format } = options;
  const result = await getImage({
    src: image.src,
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...(width && height ? { fit: "cover" as const } : {}),
    ...(format ? { format } : {}),
  });
  return result.src;
}
```

In `src/lib/content/index.ts`, change the helper export to
`export { imageSrc, resolveImageUrl, sizedImage } from "./images";`, and
the header bullet to "Image helpers (imageSrc, resolveImageUrl, sizedImage):
./images.ts". In `src/lib/content/types.ts`, rewrite the two comments that
name `imageUrl()`:

- "A size request for `imageSrc()` / `resolveImageUrl()`."
- "call `imageSrc()` / `resolveImageUrl()` / `sizedImage()`."

- [ ] **Step 3: Make the JSON-LD builders async (`src/lib/jsonld.ts`)**

Change the import from `imageUrl,` to `resolveImageUrl,`. Then replace
`contentImageUrl`:

```ts
/** Absolute URL of a content image at 1200 wide — CDN URLs pass through,
    local files get the site origin. */
async function contentImageUrl(
  image: ContentImage | null,
  siteUrl: string,
): Promise<string | null> {
  const url = await resolveImageUrl(image, { width: 1200 });
  return url ? absoluteUrl(siteUrl, url) : null;
}
```

Make the two builders async:
`export async function blogPostJsonLd(post: BlogPostDetail, siteUrl: string): Promise<any> {`
with `const imageUrl = await contentImageUrl(post.image, siteUrl);`, and
`export async function caseStudyJsonLd(cs: CaseStudyDetail, siteUrl: string): Promise<any> {`
with `const csImageUrl = await contentImageUrl(cs.image, siteUrl);`.

- [ ] **Step 4: Templates**

`BlogPostTemplate.astro`: in the `@/lib/content` import replace `imageUrl,`
with `resolveImageUrl,`. Then:

```ts
// before
const ogImageUrl = imageUrl(seo?.ogImage ?? post.image, {
  width: 1200,
  height: 630,
  format: "jpg",
});

const siteOrigin = Astro.site!.toString().replace(/\/$/, "");
const jsonLd = blogPostJsonLd(post, siteOrigin);
// after
const ogImageUrl = await resolveImageUrl(seo?.ogImage ?? post.image, {
  width: 1200,
  height: 630,
  format: "jpg",
});
const authorAvatarSrc = await resolveImageUrl(post.authorAvatar, {
  width: 64,
  height: 64,
});

const siteOrigin = Astro.site!.toString().replace(/\/$/, "");
const jsonLd = await blogPostJsonLd(post, siteOrigin);
```

In the avatar markup, change
`src={imageUrl(post.authorAvatar, { width: 64, height: 64 })}` to
`src={authorAvatarSrc}`.

`CaseStudyTemplate.astro`: same import swap. Use
`const jsonLd = await caseStudyJsonLd(study, siteOrigin);` and
`const ogImageUrl = await resolveImageUrl(seo?.ogImage ?? study.image, {`
(same options as before).

`ProjectTemplate.astro`: import swap `imageUrl,` becomes `resolveImageUrl,`.
Then:

```ts
// before
const photos = project.photos.map(({ image, label }) => ({
  photo: sizedImage(image, 1200),
  large: sizedImage(image, 1600),
  label,
}));
// after
/* The lightbox needs a URL string; a local photo is sized by getImage(), so
   the sources resolve up front. */
const photos = await Promise.all(
  project.photos.map(async ({ image, label }) => {
    const large = sizedImage(image, 1600);
    return {
      photo: sizedImage(image, 1200),
      large,
      largeSrc: await resolveImageUrl(large),
      label,
    };
  }),
);
```

In the markup change `photos.map(({ photo, large, label }, i) => (` to
`photos.map(({ photo, large, largeSrc, label }, i) => (`, and
`data-lightbox-src={imageUrl(large)}` to `data-lightbox-src={largeSrc}`.

- [ ] **Step 5: UI and section components**

`GalleryBrowser.astro`: swap `imageUrl` for `resolveImageUrl` in the import.
After `captionMeta`, add:

```ts
/* Lightbox sources are plain URL strings (a local photo is sized by
   getImage()), so they resolve once, up front. */
const lightboxSrcs = await Promise.all(
  items.map((item) => resolveImageUrl(item.full)),
);
```

Change `{items.map((item) => (` to `{items.map((item, i) => (`, and
`data-lightbox-src={imageUrl(item.full)}` to
`data-lightbox-src={lightboxSrcs[i]}`.

`TestimonialCard.astro`: change the import to
`import { plainText, resolveImageUrl, type ContentImage } from "@/lib/content";`
and replace the `avatarUrl` block:

```ts
// before
const avatarUrl = avatar
  ? typeof avatar === "string"
    ? avatar
    : imageUrl(avatar, { width: 80, height: 80 })
  : undefined;
// after
const avatarUrl =
  typeof avatar === "string"
    ? avatar
    : await resolveImageUrl(avatar, { width: 80, height: 80 });
/* A content avatar carries its own alt text (the person's name when the
   source has nothing better); a bare URL string falls back to the name. */
const avatarAlt =
  (avatar && typeof avatar !== "string" && avatar.alt) || plainText(name);
```

In the markup, change the avatar's `alt={plainText(name)}` to
`alt={avatarAlt}`.

`SingleTestimonial.astro`: import `resolveImageUrl` instead of `imageUrl`.
Apply the same replacement with `{ width: 256, height: 256 }`, and change
the avatar `alt={plainText(name)}` to `alt={avatarAlt}`.

`TestimonialShowcase.astro`: import `resolveImageUrl` instead of
`imageUrl`. After `const total = testimonials.length;`, add:

```ts
/* Avatar URLs resolve asynchronously (a local image is sized by getImage()),
   so the slides are prepared before the markup maps over them. */
const slides = await Promise.all(
  testimonials.map(async (t) => ({
    ...t,
    avatarUrl:
      typeof t.avatar === "string"
        ? t.avatar
        : await resolveImageUrl(t.avatar, { width: 96, height: 96 }),
    avatarAlt:
      (t.avatar && typeof t.avatar !== "string" && t.avatar.alt) ||
      plainText(t.name),
  })),
);
```

In the markup, change the slide loop's opening from
`testimonials.map(({ quote, name, role, company, avatar }) => {` to
`slides.map(({ quote, name, role, company, avatarUrl, avatarAlt }) => {`.
Delete the inner `const avatarUrl = …;` statement. Change the avatar
`alt={plainText(name)}` to `alt={avatarAlt}`.

- [ ] **Step 6: Blog index raw images (`src/pages/blog/index.astro`)**

Swap `imageUrl,` for `resolveImageUrl,` in the import. After `sliderPosts`
is defined, add:

```ts
/* Raw <img> sources for the slider cards (a local image is sized by
   getImage(), so they resolve up front). */
const sliderImageSrcs = await Promise.all(
  sliderPosts.map((post) => resolveImageUrl(post.image, { width: 800 })),
);
```

Replace the `categorySections` definition:

```ts
// before
const categorySections = categoryConfig
  .map((cat) => ({
    ...cat,
    slug: categoryToSlug(cat.name),
    posts: getPostsForCategory(cat.name),
  }))
  .filter((cat) => cat.posts.length > 0);
// after
const categorySections = await Promise.all(
  categoryConfig
    .map((cat) => ({
      ...cat,
      slug: categoryToSlug(cat.name),
      posts: getPostsForCategory(cat.name),
    }))
    .filter((cat) => cat.posts.length > 0)
    .map(async (cat) => ({
      ...cat,
      /* The two large cards' raw <img> sources, resolved up front. */
      largeImageSrcs: await Promise.all(
        cat.posts
          .slice(0, 2)
          .map((post, i) =>
            resolveImageUrl(post.image, { width: i === 0 ? 1000 : 600 }),
          ),
      ),
    })),
);
```

In the markup:

- `{sliderPosts.map((post) => (` becomes
  `{sliderPosts.map((post, slideIndex) => (`.
- `src={imageUrl(post.image, { width: 800 })}` becomes
  `src={sliderImageSrcs[slideIndex]}`.
- In the large-card loop, replace the three-line
  `src={imageUrl(post.image, {` … `})}` with
  `src={cat.largeImageSrcs[i]}`.

- [ ] **Step 7: Prove nothing still calls `imageUrl`**

Run: `grep -rn "imageUrl(" src --include='*.astro' --include='*.ts' | grep -v "^src/sanity" | grep -v InternalLinkMark`
Expected: no output.

- [ ] **Step 8: Gate**

```bash
npm run check && npm run check:hover && npm run check:boundary
KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity npm run build && node scripts/compare-dist.mjs .parity/empty dist/client
KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity PARITY_FIXTURES=1 npm run build && node scripts/compare-dist.mjs .parity/fixtures dist/client
KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity PARITY_FIXTURES=preview npm run build && node scripts/check-stega-leaks.mjs
npx wrangler deploy --dry-run --outdir "$(mktemp -d)"
```

Expected: `Identical` twice. The stega check passes, because the avatar alt
comes from the mapper's cleaned name. The dry run ends with
`--dry-run: exiting now.`, which shows `getImage` bundles for the Worker.

- [ ] **Step 9: Commit**

```bash
git add src/lib/content src/lib/jsonld.ts src/components src/pages/blog/index.astro
git commit -m "$(cat <<'EOF'
Resolve image URLs through getImage() for local images

resolveImageUrl() replaces imageUrl(): CDN images keep their URL, local
images get a sized file from getImage(). OG tags, JSON-LD, raw avatars and
lightbox sources move to it. Sanity output is byte-identical.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Collections, schemas, sync-time checks and the sample content

Define every collection from the spec table, render JSON rich text at
content sync, fail sync on missing images or dangling references, write the
sample content, and add review avatars to `Quote`/`Reviews`. Nothing renders
from the new collections yet (the Sanity source is still selected), so
Sanity output stays identical.

**Files:**

- Modify: `package.json`/`package-lock.json` (add `@astrojs/mdx`,
  `@astrojs/markdown-satteri`), `astro.config.mjs` (MDX integration,
  `markdown.shikiConfig`)
- Create: `src/lib/content/markdown.ts`, `src/lib/content/checks.ts`,
  `scripts/check-content-text.mjs`
- Modify: `src/content.config.ts` (rewrite), `scripts/check-content-boundary.mjs`
  (restricted-import rules)
- Modify: `src/components/ui/Quote.astro`, `src/components/sections/Reviews.astro`
- Create: everything under `src/content/` listed in Steps 8–13

**Interfaces:**

- Consumes: the `src/config/*` enums from Task 1.
- Produces:
  - `markdownToHtml(markdown: string): Promise<string>`,
    `htmlToPlainText(html: string): string`,
    `renderRichText(markdown: string): Promise<RichText>`,
    `interface RichText { markdown: string; html: string; text: string }`
    (`src/lib/content/markdown.ts`, node-only).
  - `checked(loader: Loader, options?: CheckOptions): Loader`,
    `interface RefTarget { dir: string; ext: "json" | "mdx" }`,
    `interface CheckOptions { refs?: Record<string, RefTarget> }`
    (`src/lib/content/checks.ts`, node-only; Task 6 adds `bodyCtas`).
  - Collections `blog`, `authors`, `blogCtas`, `ctaSections`, `settings`,
    `caseStudies`, `projects`, `gallery`, `testimonials` (plus `services`).
    Rich-text fields are typed `RichText` in `CollectionEntry` data:
    `blog.faqs[].answer`, `caseStudies.content[].body`,
    `projects.description`. References are `{ id, collection }`. The
    settings entry has id `"site"`.
  - `Quote` prop `avatar?: QuoteAvatar` (a `ContentImage`); `Reviews`
    review items accept `avatar?: ImageMetadata | string` and
    `avatarAlt?: string`.
  - Sample entry ids that later tasks name: blog `accessibility-guide`,
    `customer-focused-messaging`, `industry-trends`; case studies
    `acme-corp-rebrand`, `summit-outdoor-migration`,
    `greenleaf-organics-seo` (coming soon); projects
    `home-office-built-in`, `breakfast-nook-remodel`,
    `design-studio-refresh`; testimonials `marcus-bell`, `dana-kim`,
    `luis-ortega`, `hannah-price`; blog CTAs `free-site-review`,
    `accessibility-checklist`; CTA sections `start-a-project`,
    `talk-to-us`; authors `daniel-reyes`, `priya-shah`.

- [ ] **Step 1: Install the MDX integration and Astro's Markdown engine**

Run: `npm install @astrojs/mdx@^8.1.0 @astrojs/markdown-satteri@^0.4.4`
Then: `npm ls @astrojs/markdown-satteri`
Expected: a top-level `@astrojs/markdown-satteri@0.4.x` and the copy
`@astrojs/mdx` depends on. Astro core keeps its own pinned copy, which is
fine.

- [ ] **Step 2: Register MDX and match its code highlighting to `<Code>`**

In `astro.config.mjs`, add `import mdx from "@astrojs/mdx";` beside the
other integration imports. Add `mdx(),` to `integrations` after
`sitemap({ … }),`. Add this top-level key after `image: { … },`:

```js
  /* Fenced code in MDX blog bodies is highlighted at build time with these
     settings — the same theme and wrapping the Portable Text CodeBlock
     passes to <Code> (src/components/portabletext/CodeBlock.astro), so a
     code block looks the same from either content source. */
  markdown: {
    shikiConfig: { theme: "github-dark", wrap: true },
  },
```

- [ ] **Step 3: Write the failing unit check for the Markdown helpers**

Create `scripts/check-content-text.mjs`:

```js
#!/usr/bin/env node
/**
 * check-content-text — unit checks for the pure text helpers behind the
 * Files content source: build-time Markdown rendering for rich text inside
 * JSON (src/lib/content/markdown.ts). Task 5 adds the MDX body helpers
 * (src/lib/content/files/mdx-text.ts).
 *
 * Runs under plain Node (22.18+ strips TypeScript types on import):
 *   node scripts/check-content-text.mjs
 */
import assert from "node:assert/strict";
import {
  htmlToPlainText,
  markdownToHtml,
  renderRichText,
} from "../src/lib/content/markdown.ts";

// Heading ids are removed: rich-text blocks have no table of contents, and
// the Portable Text serializer emits none.
assert.equal(
  await markdownToHtml("## The challenge\n\nIt’s *fine*."),
  "<h2>The challenge</h2>\n<p>It’s <em>fine</em>.</p>",
);
// Same engine and defaults as MDX bodies: smart punctuation is on.
assert.equal(await markdownToHtml(`It's "quoted"`), "<p>It’s “quoted”</p>");
// A nested list sits inside its parent item, as the Portable Text
// serializer nests it.
assert.equal(
  await markdownToHtml("- One\n  - Two\n- Three"),
  "<ul>\n<li>One\n<ul>\n<li>Two</li>\n</ul>\n</li>\n<li>Three</li>\n</ul>",
);
// Plain text: inline tags vanish without a gap, block boundaries become one
// space, entities decode.
assert.equal(
  htmlToPlainText(
    '<p>Read <a href="/x">the <strong>bold</strong> guide</a>.</p>\n<ul>\n<li>One</li>\n<li>Two &amp; three</li>\n</ul>',
  ),
  "Read the bold guide. One Two & three",
);
assert.deepEqual(await renderRichText("Start with **one** step."), {
  markdown: "Start with **one** step.",
  html: "<p>Start with <strong>one</strong> step.</p>",
  text: "Start with one step.",
});

console.log("check-content-text: ok");
```

Run: `node scripts/check-content-text.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lib/content/markdown.ts`.

- [ ] **Step 4: Create `src/lib/content/markdown.ts`**

```ts
/**
 * Build-time Markdown → HTML for rich text inside JSON content: case-study
 * block bodies, project write-ups and blog FAQ answers.
 *
 * NODE-ONLY. Imported by src/content.config.ts alone, where the `richText`
 * schema transform renders each field once, at content sync; Astro stores
 * the result in its data store, so pages read finished HTML and the
 * Markdown engine (a native binding) never ships to the Cloudflare Worker.
 * `npm run check:boundary` fails any other importer.
 *
 * Same engine and defaults as MDX blog bodies — Astro's own Sätteri
 * processor (GFM, smart punctuation) — minus syntax highlighting, and with
 * heading ids removed: rich-text blocks have no table of contents, and the
 * Portable Text serializer emits none, so both sources match.
 */
import { createSatteriMarkdownProcessor } from "@astrojs/markdown-satteri";

/** A rich-text field after the schema transform. */
export interface RichText {
  /** The Markdown as written (llms-full.txt, and the parity fixtures). */
  markdown: string;
  /** Rendered HTML, ready for set:html inside a .u-rich-text wrapper. */
  html: string;
  /** Plain text (JSON-LD answers, SEO fallbacks). */
  text: string;
}

let renderer: ReturnType<typeof createSatteriMarkdownProcessor> | undefined;

/** Markdown → HTML, with the defaults above. */
export async function markdownToHtml(markdown: string): Promise<string> {
  renderer ??= createSatteriMarkdownProcessor({ syntaxHighlight: false });
  const { code } = await (await renderer).render(markdown);
  return code.replace(/<(h[1-6]) id="[^"]*">/g, "<$1>").trim();
}

/** Block-level tags whose boundaries separate words. */
const BLOCK_BOUNDARY =
  /<\/?(?:p|li|ul|ol|h[1-6]|blockquote|pre|div|table|tr|td|th|figure|figcaption)\b[^>]*>|<br\s*\/?>/gi;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(text: string): string {
  return text.replace(
    /&(?:#(\d+)|#x([0-9a-f]+)|(amp|lt|gt|quot|apos|nbsp));/gi,
    (_, dec: string, hex: string, name: string) =>
      dec
        ? String.fromCodePoint(Number(dec))
        : hex
          ? String.fromCodePoint(parseInt(hex, 16))
          : NAMED_ENTITIES[name.toLowerCase()],
  );
}

/** HTML → plain text: block boundaries become spaces, inline tags vanish. */
export function htmlToPlainText(html: string): string {
  return decodeEntities(
    html.replace(BLOCK_BOUNDARY, " ").replace(/<[^>]+>/g, ""),
  )
    .replace(/\s+/g, " ")
    .trim();
}

/** The `richText` schema transform: Markdown → { markdown, html, text }. */
export async function renderRichText(markdown: string): Promise<RichText> {
  const html = await markdownToHtml(markdown);
  return { markdown, html, text: htmlToPlainText(html) };
}
```

Run: `node scripts/check-content-text.mjs`
Expected: `check-content-text: ok`.

- [ ] **Step 5: Create `src/lib/content/checks.ts`**

```ts
/**
 * Content-sync checks Astro does not make on its own, wrapped around a
 * collection's loader in src/content.config.ts.
 *
 * NODE-ONLY (it reads the filesystem): src/content.config.ts is its only
 * importer, enforced by `npm run check:boundary`.
 *
 * - Image paths. `image()` accepts any string at sync and only fails later,
 *   in the build, with an error that does not name the content file.
 * - References. Astro 7 logs a dangling `reference()` but lets sync and the
 *   build pass, so a typo'd author or CTA would ship a broken page. Targets
 *   are checked against the files on disk (an entry's id is its filename),
 *   so the check does not depend on collection load order.
 *
 * Every problem is collected, then thrown as one error, one line each:
 *   src/content/projects/x.json → heroImage: image file not found: "./images/y.webp"
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Loader } from "astro/loaders";

/** Where a referenced collection's entries live: `<dir>/<id>.<ext>`. */
export interface RefTarget {
  /** Repo-relative folder, e.g. "src/content/authors". */
  dir: string;
  ext: "json" | "mdx";
}

export interface CheckOptions {
  /**
   * Top-level reference fields to check (a single reference or an array of
   * them) → where their targets live.
   */
  refs?: Record<string, RefTarget>;
}

/** A relative path to an image file — what an `image()` field holds at sync. */
const IMAGE_PATH = /^\.{1,2}\/\S*\.(?:avif|gif|jpe?g|png|svg|webp)$/i;
/** A relative Markdown image in an MDX body: ![alt](./images/x.webp) */
const BODY_IMAGE = /!\[[^\]]*\]\((\.{1,2}\/[^)\s]+)\)/g;

/** Wrap a loader so its entries are checked after every full load. */
export function checked(loader: Loader, options: CheckOptions = {}): Loader {
  return {
    ...loader,
    load: async (context) => {
      await loader.load(context);
      const root = fileURLToPath(context.config.root);
      const problems: string[] = [];
      for (const entry of context.store.values()) {
        const file = entry.filePath ?? `${context.collection}/${entry.id}`;
        const dir = path.dirname(path.resolve(root, entry.filePath ?? "."));
        walk(entry.data, "", (value, at) => {
          if (
            IMAGE_PATH.test(value) &&
            !fs.existsSync(path.resolve(dir, value))
          )
            problems.push(`${file} → ${at}: image file not found: "${value}"`);
        });
        for (const [, src] of (entry.body ?? "").matchAll(BODY_IMAGE)) {
          if (!fs.existsSync(path.resolve(dir, src)))
            problems.push(`${file} → body: image file not found: "${src}"`);
        }
        for (const [field, target] of Object.entries(options.refs ?? {})) {
          for (const id of refIds(entry.data[field])) {
            if (!targetExists(root, target, id))
              problems.push(
                `${file} → ${field}: no entry "${id}" (expected ${target.dir}/${id}.${target.ext})`,
              );
          }
        }
      }
      if (problems.length) {
        throw new Error(
          `Content check failed in "${context.collection}":\n${problems
            .map((p) => `  - ${p}`)
            .join("\n")}`,
        );
      }
    },
  };
}

/** Visit every string in a value, with its path ("photos[1].src"). */
function walk(
  value: unknown,
  at: string,
  visit: (value: string, at: string) => void,
): void {
  if (typeof value === "string") visit(value, at);
  else if (Array.isArray(value))
    value.forEach((item, i) => walk(item, `${at}[${i}]`, visit));
  else if (value && typeof value === "object")
    for (const [key, item] of Object.entries(value))
      walk(item, at ? `${at}.${key}` : key, visit);
}

/** The ids a reference field holds: a string, or Astro's `{ id, collection }`. */
function refIds(value: unknown): string[] {
  const one = (item: unknown): string | null =>
    typeof item === "string"
      ? item
      : item && typeof item === "object" && "id" in item
        ? String((item as { id: unknown }).id)
        : null;
  return (Array.isArray(value) ? value : [value])
    .map(one)
    .filter((id): id is string => Boolean(id));
}

function targetExists(root: string, target: RefTarget, id: string): boolean {
  return fs.existsSync(path.resolve(root, target.dir, `${id}.${target.ext}`));
}
```

- [ ] **Step 6: Restrict the node-only modules in the boundary check**

In `scripts/check-content-boundary.mjs`, extend the header comment with a
paragraph:

```js
 * RESTRICTED lists modules only some files may import: the node-only
 * content-sync helpers (src/lib/content/markdown.ts, checks.ts — importing
 * them from a page would ship them to the Worker), and later the Files
 * backend itself. A restricted rule applies to every file, allow-listed or
 * not.
```

Add after `ALLOW`:

```js
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
```

Replace the scanning loop:

```js
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
```

Change the failure header from
`Content boundary violations — get content from @/lib/content instead:` to
`Content boundary violations (get content from @/lib/content; see the rules in scripts/check-content-boundary.mjs):`.
Change the success line to
`Content boundary OK: no Sanity imports outside the allow list, no restricted imports.`

Prove the rule bites:

```bash
printf 'import { markdownToHtml } from "@/lib/content/markdown";\nexport const x = markdownToHtml;\n' > src/lib/boundary-probe.ts
npm run check:boundary; echo "exit=$?"
rm src/lib/boundary-probe.ts
```

Expected: `src/lib/boundary-probe.ts:1  @/lib/content/markdown  (node-only: …)`
and `exit=1`.

- [ ] **Step 7: Copy the sample photos into each collection**

Every source is an existing placeholder. The alt texts in Steps 8–13
describe what each photo really shows: web-design workspaces and bright
interiors.

```bash
P=src/assets/placeholder-images/ai-first-starter
cp_to() { mkdir -p "$(dirname "$2")"; cp "$P-$1.webp" "$2"; }
cp_to 3  src/content/authors/images/daniel-reyes.webp
cp_to 12 src/content/ctas/blog/images/site-review.webp
cp_to 9  src/content/ctas/blog/images/checklist.webp
cp_to 11 src/content/ctas/section/images/arched-room.webp
cp_to 13 src/content/ctas/section/images/studio-desk.webp
cp_to 5  src/content/blog/images/accessibility-guide.webp
cp_to 14 src/content/blog/images/customer-messaging.webp
cp_to 6  src/content/blog/images/industry-trends.webp
cp_to 4  src/content/blog/images/messaging-review.webp
cp_to 1  src/content/case-studies/images/acme-hero.webp
cp_to 3  src/content/case-studies/images/acme-pages.webp
cp_to 16 src/content/case-studies/images/acme-devices.webp
cp_to 12 src/content/case-studies/images/acme-palette.webp
cp_to 18 src/content/case-studies/images/acme-swatches.webp
cp_to 10 src/content/case-studies/images/summit-hero.webp
cp_to 5  src/content/case-studies/images/summit-devices.webp
cp_to 4  src/content/case-studies/images/summit-review.webp
cp_to 8  src/content/case-studies/images/summit-code.webp
cp_to 20 src/content/case-studies/images/summit-shelf.webp
cp_to 7  src/content/case-studies/images/summit-nook.webp
cp_to 15 src/content/case-studies/images/greenleaf-hero.webp
cp_to 13 src/content/projects/images/office-hero.webp
cp_to 19 src/content/projects/images/office-desk.webp
cp_to 10 src/content/projects/images/office-laptop.webp
cp_to 1  src/content/projects/images/nook-hero.webp
cp_to 11 src/content/projects/images/nook-window.webp
cp_to 20 src/content/projects/images/nook-shelf.webp
cp_to 17 src/content/projects/images/nook-reading.webp
cp_to 14 src/content/projects/images/studio-hero.webp
cp_to 4  src/content/projects/images/studio-review.webp
cp_to 8  src/content/projects/images/studio-workstation.webp
cp_to 11 src/content/gallery/images/arched-window-nook.webp
cp_to 9  src/content/gallery/images/stone-and-linen-samples.webp
cp_to 20 src/content/gallery/images/oak-shelf-and-arch.webp
cp_to 8  src/content/gallery/images/studio-workstations.webp
cp_to 18 src/content/gallery/images/swatch-board.webp
cp_to 19 src/content/testimonials/images/marcus-bell.webp
cp_to 4  src/content/testimonials/images/hannah-price.webp
```

- [ ] **Step 8: Authors, CTAs and settings**

`src/content/authors/daniel-reyes.json`:

```json
{
  "name": "Daniel Reyes",
  "avatar": "./images/daniel-reyes.webp"
}
```

`src/content/authors/priya-shah.json`:

```json
{
  "name": "Priya Shah"
}
```

`src/content/ctas/blog/free-site-review.json`:

```json
{
  "heading": "Get a free site review",
  "body": "Send us your address and we’ll record a ten-minute walkthrough of what’s working and what to fix first.",
  "image": "./images/site-review.webp",
  "imageAlt": "A tablet showing a website mockup beside sketches, a pen and color swatches",
  "aspectRatio": "portrait",
  "linkUrl": "/contact",
  "linkLabel": "Book a review"
}
```

`src/content/ctas/blog/accessibility-checklist.json`:

```json
{
  "heading": "Get our accessibility checklist",
  "body": "The twenty checks we run before every launch, in the order we run them.",
  "image": "./images/checklist.webp",
  "imageAlt": "A tablet resting on stone and fabric samples",
  "aspectRatio": "landscape",
  "linkUrl": "/contact",
  "linkLabel": "Get the checklist"
}
```

`src/content/ctas/section/start-a-project.json`:

```json
{
  "heading": "Ready to start your project?",
  "text": "Tell us what you’re planning and we’ll reply within one business day with next steps.",
  "primaryButtonLabel": "Get a quote",
  "primaryButtonHref": "/contact",
  "secondaryButtonLabel": "See our work",
  "secondaryButtonHref": "/projects",
  "backgroundImage": "./images/arched-room.webp",
  "imageAlt": "A sunlit room with an arched window and a round pedestal table",
  "overlayStrength": 70
}
```

`src/content/ctas/section/talk-to-us.json`:

```json
{
  "heading": "Have a question about your site?",
  "text": "Book a twenty-minute call. No pitch, just answers.",
  "primaryButtonLabel": "Book a call",
  "primaryButtonHref": "/contact",
  "backgroundImage": "./images/studio-desk.webp",
  "imageAlt": "A desk with a large monitor and a lamp beside a tall window"
}
```

`src/content/settings.json`:

```json
{
  "site": {
    "defaultBlogCta": "free-site-review",
    "defaultCtaSection": "start-a-project"
  }
}
```

- [ ] **Step 9: Blog posts**

Dates in frontmatter are quoted strings. Bodies use `##` for sections. The
h2 texts are plain words, unique within the post: the TOC ids from both
sources only agree for those. Task 6 adds the `Callout`, `VideoEmbed` and
`BlogCta` lines.

`src/content/blog/accessibility-guide.mdx`:

````mdx
---
title: "Designing for Everyone: A Practical Accessibility Guide"
description: "Practical techniques for building sites that work for everyone, from keyboard navigation to screen reader support."
date: "2026-03-01"
updated: "2026-03-08"
categories: ["Guides", "Tutorials"]
primaryCategory: "Guides"
image: "./images/accessibility-guide.webp"
imageAlt: "A website shown on a desktop monitor, a laptop, a tablet and a phone"
author: "daniel-reyes"
featured: true
relatedPosts: ["customer-focused-messaging"]
faqs:
  - question: "Where should we start if our site has never been audited?"
    answer: |
      Start with the pages that bring in leads:

      - your homepage
      - your contact form
      - your busiest service page

      Then run each one through [WebAIM’s WAVE checker](https://wave.webaim.org/) and fix the errors before the warnings.
  - question: "Do we need a separate accessible version of the site?"
    answer: "No. One site built to the **WCAG 2.2 AA** standard serves everyone, and it is easier to keep current than two."
seo:
  metaTitle: "A Practical Accessibility Guide for Small-Business Sites"
---

Accessibility is not a feature you bolt on before launch. It is a handful of habits that make a site easier for every visitor, including the one in four adults who lives with a disability.

## Start with the keyboard

Put your mouse away and press Tab. Every link, button and form field should light up in order, with a focus ring you can actually see. If you get stuck or lose track of where you are, so does everyone who browses this way.

### A skip link

The first thing a keyboard user meets should be a way past the navigation:

```html
<a class="skip-link" href="#main">Skip to content</a>
```

## Write real alt text

Describe what an image shows and why it is there, in a sentence or less:

- _Good:_ “A technician replacing a furnace filter”
- _Not useful:_ “image1.jpg”

Decorative flourishes are the exception, and they are rarer than you think.

## Check contrast early

Low-contrast text is the most common failure we find. Check your brand colors with [the WebAIM contrast checker](https://webaim.org/resources/contrastchecker/) before they reach a single page, not after.

## Test with a screen reader

Turn on VoiceOver or NVDA and listen to your homepage. Within a minute you will hear every unlabeled button and every “click here” link.
````

`src/content/blog/customer-focused-messaging.mdx`:

```mdx
---
title: "The Power of Clear, Customer-Focused Messaging"
description: "How sharper messaging turns a website from a digital brochure into a tool that wins work."
date: "2026-02-10"
categories: ["Insights"]
primaryCategory: "Insights"
image: "./images/customer-messaging.webp"
imageAlt: "Two designers discussing a page on a desktop monitor"
author: "priya-shah"
relatedPosts: ["accessibility-guide"]
cta: "accessibility-checklist"
ctaSection: "talk-to-us"
faqs:
  - question: "How long should a homepage headline be?"
    answer: "Short enough to read in one glance: aim for **eight words or fewer**, and put the detail in the line beneath it."
---

Most small-business sites talk about the business. The ones that win work talk about the customer: the problem they have today, and what life looks like once it is solved.

## Lead with the problem

Your visitor arrives with a leaking roof, a slow website or a messy set of books. Name that problem in the first sentence they read, in the words they would use to describe it.

![Two people reviewing a website layout on a desktop monitor](./images/messaging-review.webp)

## Make the next step obvious

Every page needs one clear action. Pick it, label the button with what happens next, and repeat it wherever a reader finishes a section:

1. Say what you do in one sentence.
2. Show proof: a number, a photo or a review.
3. Ask for one action.

## Cut the jargon

If a phrase only makes sense inside your industry, replace it. **Plain words convert better** than clever ones, and they are easier to translate when you grow.
```

`src/content/blog/industry-trends.mdx`:

```mdx
---
title: "Five Trends Shaping Small-Business Websites This Year"
description: "The shifts we’re watching closely, and how forward-thinking teams are responding to them."
date: "2026-02-15"
categories: ["News", "Insights"]
primaryCategory: "News"
image: "./images/industry-trends.webp"
imageAlt: "Translucent chart and layout panels floating above a desk"
author: "daniel-reyes"
featured: true
video: "https://www.youtube.com/watch?v=aqz-KE-bpKQ"
---

Every year brings a new wave of tools, but the sites that perform best keep getting simpler. Here is what we are seeing across the projects we shipped this year.

## Speed is the first impression

Visitors decide in under three seconds whether to stay. Static pages, compressed images and fewer third-party scripts are the cheapest conversion boost there is.

## Search is turning into answers

AI assistants now summarize sites instead of listing them. Clear headings, honest FAQs and structured data are how your business gets quoted correctly.

## Owners want to edit their own sites

Content that lives in plain files, or in a simple editor, beats a platform nobody on the team can log into.

## Reviews do the selling

A real quote with a name and a photo outperforms any headline we can write.

## Accessibility is table stakes

Accessible sites reach more people and rank better. Our [practical guide](/blog/accessibility-guide) is a good place to start.
```

- [ ] **Step 10: Case studies**

Rich-text `body` values are Markdown. Together the three studies use all
seven block types, both spacing styles, `maxWidth`, every image-display
option, a blockquote, a nested list and a coming-soon study.

`src/content/case-studies/acme-corp-rebrand.json`:

```json
{
  "title": "Revitalizing Acme Corp’s Digital Presence",
  "description": "A complete brand refresh and website redesign that increased lead generation by 340% and gave Acme one visual identity across every channel.",
  "client": "Acme Corp",
  "image": "./images/acme-hero.webp",
  "imageAlt": "Acme Corp’s new homepage on a laptop in a bright room with a plaster arch",
  "date": "2026-02-28",
  "updated": "2026-03-05",
  "featured": true,
  "categories": ["Branding", "Design", "Development"],
  "industries": ["Manufacturing / Industrial"],
  "timeline": "8 weeks",
  "liveUrl": "https://example.com",
  "galleryImages": [
    {
      "src": "./images/acme-hero.webp",
      "alt": "Acme Corp’s homepage on a laptop"
    },
    {
      "src": "./images/acme-pages.webp",
      "alt": "A designer reviewing Acme Corp’s interior pages on a laptop"
    },
    {
      "src": "./images/acme-devices.webp",
      "alt": "Acme Corp’s site on a desktop, laptop, tablet and phone"
    }
  ],
  "content": [
    {
      "type": "richText",
      "body": "### Introduction\n\nAcme Corp had outgrown its website. The brand no longer reflected the premium service the team delivers, and new inquiries had stalled. They needed a refresh that would position them as the leader in their region and drive measurable results.",
      "sectionSpacing": "small"
    },
    {
      "type": "richTextWithImage",
      "body": "### The challenge\n\nThe old site was dated, with inconsistent branding, slow pages and a confusing path to the contact form. Traffic was steady, but conversions had plateaued: the problem was the destination, not the demand.\n\nWe needed to rebuild the site from the ground up **without losing the search visibility** Acme had earned over the years.",
      "image": "./images/acme-pages.webp",
      "imageAlt": "A designer reviewing Acme Corp’s interior pages on a laptop",
      "aspectRatio": "square"
    },
    {
      "type": "fullWidthImage",
      "image": "./images/acme-devices.webp",
      "imageAlt": "Acme Corp’s new site on a desktop, laptop, tablet and phone",
      "customAspectRatio": "21 / 9"
    },
    {
      "type": "imageGrid",
      "images": [
        {
          "image": "./images/acme-palette.webp",
          "alt": "Palette cards beside a tablet showing the new homepage"
        },
        {
          "image": "./images/acme-swatches.webp",
          "alt": "The new homepage on a tablet surrounded by material samples"
        }
      ]
    },
    {
      "type": "richTextColumns",
      "body": "### The approach\n\nWe started with a brand workshop to find out what Acme values and what sets it apart. From there we built a visual identity and turned it into a fast site with a simple editor.\n\nThe design went through three rounds, with feedback from the team at every stage. Mobile layouts, accessibility and page speed were priorities from day one.\n\nWe wrote the copy alongside the design, so every page had a clear message and one obvious next step:\n\n- a headline that names the problem\n- proof from real projects\n  - numbers first\n  - then photos\n- one call to action"
    },
    {
      "type": "stats",
      "items": [
        { "value": "340%", "label": "Increase in leads" },
        { "value": "60%", "label": "Faster page loads" },
        { "value": "2.5x", "label": "More pages per visit" }
      ]
    },
    {
      "type": "richText",
      "body": "### The results\n\n> The new site paid for itself in the first quarter.\n\nLeads rose by 340%, pages load 60% faster and visitors read more of the site. Acme now has a web presence that matches the quality of its work. Read how we approach this in [our accessibility guide](/blog/accessibility-guide).",
      "maxWidth": "60ch"
    }
  ],
  "seo": { "metaTitle": "Acme Corp rebrand and website redesign" }
}
```

`src/content/case-studies/summit-outdoor-migration.json`:

```json
{
  "title": "E-Commerce Migration for Summit Outdoor",
  "description": "Rebuilt a slow, legacy storefront on a modern platform with custom product filtering, cutting page load times by 60%.",
  "client": "Summit Outdoor",
  "image": "./images/summit-hero.webp",
  "imageAlt": "Summit Outdoor’s product photo library open on a laptop",
  "date": "2026-02-15",
  "featured": true,
  "categories": ["Development", "Strategy", "Marketing"],
  "industries": ["Retail / E-commerce"],
  "timeline": "12 weeks",
  "liveUrl": "https://example.com",
  "galleryImages": [
    {
      "src": "./images/summit-hero.webp",
      "alt": "Summit Outdoor’s product photo library open on a laptop"
    },
    {
      "src": "./images/summit-devices.webp",
      "alt": "The new storefront on a desktop, laptop, tablet and phone"
    }
  ],
  "content": [
    {
      "type": "richText",
      "body": "### Introduction\n\nSummit Outdoor’s storefront was slow, hard to maintain and losing sales. We planned a phased move to a modern platform with zero downtime, keeping every search ranking through careful redirect mapping."
    },
    {
      "type": "fullWidthImage",
      "image": "./images/summit-devices.webp",
      "imageAlt": "The new storefront on a desktop, laptop, tablet and phone",
      "aspectRatio": "widescreen"
    },
    {
      "type": "richTextLeft",
      "body": "### From legacy to modern\n\nThe migration covered more than 500 product pages. We:\n\n1. audited every page and its traffic\n2. mapped each old address to its new one\n3. rebuilt the catalog with the filters customers actually use\n\nCart abandonment fell by 35% once checkout dropped from five steps to two.",
      "maxWidth": "60ch",
      "sectionSpacingTop": "none",
      "sectionSpacingBottom": "large"
    },
    {
      "type": "richTextWithImage",
      "body": "### Working as one team\n\nWeekly reviews with Summit’s merchandisers kept the catalog accurate while it moved.",
      "image": "./images/summit-review.webp",
      "imageAlt": "Two people reviewing the new product pages on a desktop monitor",
      "objectFit": "contain",
      "transparent": true
    },
    {
      "type": "imageGrid",
      "aspectRatio": "auto",
      "images": [
        {
          "image": "./images/summit-code.webp",
          "alt": "A developer building the product filters at a desktop monitor"
        },
        {
          "image": "./images/summit-shelf.webp",
          "alt": "The finished storefront on a laptop under a plaster arch"
        },
        {
          "image": "./images/summit-nook.webp",
          "alt": "The storefront open on a laptop beside a bookshelf"
        }
      ]
    },
    {
      "type": "richText",
      "body": "### The outcome\n\nThe move finished with zero downtime and no lost rankings. Pages load 60% faster, and the new filters help customers find the right gear in fewer clicks."
    }
  ],
  "ctaSection": "talk-to-us"
}
```

`src/content/case-studies/greenleaf-organics-seo.json`:

```json
{
  "title": "Organic Growth for GreenLeaf Organics",
  "description": "A growth plan spanning technical fixes, content and outreach that grew organic traffic by 520% in six months.",
  "client": "GreenLeaf Organics",
  "image": "./images/greenleaf-hero.webp",
  "imageAlt": "Floating analytics panels above a desk with a vase and a notebook",
  "date": "2026-01-20",
  "comingSoon": true,
  "liveUrl": "https://example.com",
  "categories": ["Marketing", "Design"],
  "industries": ["Food & Beverage"],
  "timeline": "6 months",
  "content": [
    {
      "type": "richText",
      "body": "### Introduction\n\nGreenLeaf Organics was hard to find online despite great products. The full story is on its way."
    },
    {
      "type": "stats",
      "items": [
        { "value": "520%", "label": "Organic traffic growth" },
        { "value": "45%", "label": "More online orders" }
      ]
    }
  ]
}
```

- [ ] **Step 11: Projects**

`src/content/projects/home-office-built-in.json`:

```json
{
  "title": "Home office built-in",
  "category": "remodel",
  "location": "Springfield, IL",
  "service": "Custom carpentry",
  "description": "We turned an unused corner into a full-width oak desk with storage above and below, wired for two monitors.\n\nThe owners asked for **no visible cables**, so we ran power and data inside the cabinetry.",
  "quote": {
    "text": "The new desk changed how I work from home.",
    "name": "Marcus B."
  },
  "heroImage": "./images/office-hero.webp",
  "imageAlt": "The finished built-in desk, with a large monitor and a lamp beside the window",
  "photos": [
    {
      "src": "./images/office-desk.webp",
      "alt": "The homeowner working at the new desk beside the window",
      "label": "After"
    },
    {
      "src": "./images/office-laptop.webp",
      "alt": "A laptop and a mug on the finished oak desktop"
    }
  ],
  "completed": "2026-04-18",
  "featured": true,
  "seoDescription": "A built-in oak desk with hidden wiring turns an unused corner of a Springfield home into a full office."
}
```

`src/content/projects/breakfast-nook-remodel.json`:

```json
{
  "title": "Breakfast nook and plaster arch",
  "category": "residential",
  "location": "Chatham, IL",
  "service": "Interior remodeling",
  "description": "A dark dining corner became a bright breakfast nook: a new arched window, a curved plaster arch and a built-in stone shelf.",
  "heroImage": "./images/nook-hero.webp",
  "imageAlt": "The breakfast nook: a round pedestal table under a curved plaster arch",
  "photos": [
    {
      "src": "./images/nook-window.webp",
      "alt": "Morning light through the arched window onto the round table",
      "label": "After"
    },
    {
      "src": "./images/nook-shelf.webp",
      "alt": "The new plaster arch and stone shelf, with a vase and a mug",
      "label": "After"
    },
    {
      "src": "./images/nook-reading.webp",
      "alt": "Books and a mug on the stone tabletop in front of the arched wall"
    }
  ],
  "completed": "2026-03-02",
  "featured": true,
  "seoDescription": "An arched window, a curved plaster arch and a stone shelf turn a dark dining corner into a bright breakfast nook."
}
```

`src/content/projects/design-studio-refresh.json`:

```json
{
  "title": "Design studio refresh",
  "category": "commercial",
  "location": "Springfield, IL",
  "service": "Commercial interiors",
  "description": "New oak workstations, better light and quieter acoustics for a six-person design studio, finished over two weekends so the team never closed.",
  "quote": {
    "text": "We worked through the whole job and barely noticed the crew."
  },
  "heroImage": "./images/studio-hero.webp",
  "imageAlt": "Two designers discussing a page at a desktop monitor in the refreshed studio",
  "photos": [
    {
      "src": "./images/studio-review.webp",
      "alt": "Two people reviewing a layout at one of the new oak desks"
    },
    {
      "src": "./images/studio-workstation.webp",
      "alt": "A designer working at one of the new workstations",
      "label": "After"
    }
  ],
  "completed": "2025-11-14",
  "seoDescription": "New oak workstations, better light and quieter acoustics for a six-person design studio, built over two weekends."
}
```

- [ ] **Step 12: Gallery**

`src/content/gallery.json` is one array (a `file()` collection). Each item
needs a lowercase-kebab `id`. Image paths are relative to this file.

```json
[
  {
    "id": "arched-window-nook",
    "image": "./gallery/images/arched-window-nook.webp",
    "alt": "Morning light through an arched window onto a round table",
    "caption": "Arched window nook",
    "category": "residential",
    "location": "Chatham, IL",
    "project": "breakfast-nook-remodel",
    "added": "2026-03-04"
  },
  {
    "id": "oak-shelf-and-arch",
    "image": "./gallery/images/oak-shelf-and-arch.webp",
    "alt": "A laptop on a stone shelf under a curved plaster arch",
    "caption": "Plaster arch and stone shelf",
    "category": "residential",
    "location": "Chatham, IL",
    "project": "breakfast-nook-remodel",
    "added": "2026-03-03"
  },
  {
    "id": "stone-and-linen-samples",
    "image": "./gallery/images/stone-and-linen-samples.webp",
    "alt": "A tablet resting on stone and fabric finish samples",
    "caption": "Finish samples for a client review",
    "category": "remodel",
    "location": "Springfield, IL",
    "added": "2026-02-20"
  },
  {
    "id": "studio-workstations",
    "image": "./gallery/images/studio-workstations.webp",
    "alt": "A designer at one of the new studio workstations",
    "caption": "New studio workstations",
    "category": "commercial",
    "project": "design-studio-refresh",
    "added": "2025-11-15"
  },
  {
    "id": "swatch-board",
    "image": "./gallery/images/swatch-board.webp",
    "alt": "A tablet surrounded by fabric, stone and brass samples",
    "caption": "Material board for a remodel",
    "category": "remodel",
    "added": "2025-10-30"
  }
]
```

- [ ] **Step 13: Testimonials**

`src/content/testimonials/marcus-bell.json`:

```json
{
  "name": "Marcus Bell",
  "role": "Homeowner",
  "quote": "The built-in desk changed how I work from home. They measured twice, finished on schedule and left the room cleaner than they found it.",
  "avatar": "./images/marcus-bell.webp",
  "avatarAlt": "Marcus Bell",
  "stars": 5,
  "featured": true,
  "order": 1
}
```

`src/content/testimonials/dana-kim.json`:

```json
{
  "name": "Dana Kim",
  "role": "Owner",
  "company": "Kim & Co. Design",
  "quote": "Our studio stayed open the whole time. The crew worked weekends, kept the dust down and finished a day early.",
  "stars": 5,
  "featured": true,
  "order": 2
}
```

`src/content/testimonials/luis-ortega.json`:

```json
{
  "name": "Luis Ortega",
  "role": "Property manager",
  "company": "Ortega Rentals",
  "quote": "Clear quotes, real start dates and photos at the end of every day. That is rare.",
  "website": "https://example.com",
  "stars": 5,
  "featured": true,
  "order": 3
}
```

`src/content/testimonials/hannah-price.json`:

```json
{
  "name": "Hannah Price",
  "role": "Homeowner",
  "quote": "Our breakfast nook is the brightest room in the house now. We eat there every morning.",
  "avatar": "./images/hannah-price.webp",
  "avatarAlt": "Hannah Price",
  "stars": 4,
  "order": 4
}
```

- [ ] **Step 14: Rewrite `src/content.config.ts`**

Replace the whole file. The `services` schema is unchanged except for the
two review fields and the shared helpers.

```ts
import { defineCollection, reference } from "astro:content";
import { file, glob } from "astro/loaders";
import { z } from "astro/zod";
import ICONS from "./data/service-icons.json";
import {
  BLOG_CATEGORIES,
  BLOG_CTA_ASPECT_RATIOS,
  BLOG_SECTION_CATEGORIES,
} from "./config/blog";
import {
  CASE_STUDY_ASPECT_RATIOS,
  CASE_STUDY_CATEGORIES,
  CASE_STUDY_INDUSTRIES,
  CASE_STUDY_MAX_WIDTHS,
  SECTION_SPACINGS,
} from "./config/case-studies";
import {
  PROJECT_CATEGORY_VALUES,
  PROJECT_PHOTO_LABELS,
} from "./config/projects";
import { checked, type RefTarget } from "./lib/content/checks";
import { renderRichText } from "./lib/content/markdown";

/**
 * Content collections — build-time, local files, read through @/lib/content
 * (the Files backend, src/lib/content/files/). How to add and edit entries:
 * .claude/skills/content-files/SKILL.md (services:
 * .claude/skills/component-api/references/service-pages.md).
 *
 * - One file per entry. Its filename is its id and URL slug, in
 *   lowercase-kebab-case (enforced below). `gallery` and `settings` are
 *   single files (`file()` loader).
 * - Photos sit in an `images/` folder beside the entries, referenced by
 *   relative path ("./images/kitchen-hero.webp"); `image()` imports them.
 *   Every image carries non-empty alt text.
 * - Rich text inside JSON is a Markdown string, rendered here once, at
 *   content sync (`richText`): entries carry `{ markdown, html, text }`.
 * - `checked()` (src/lib/content/checks.ts) fails the sync when an image
 *   file or a referenced entry is missing, naming the file and the field —
 *   Astro itself only logs a dangling reference.
 * - Enums come from src/config/, which the Sanity schema reads too.
 */

/** Where each folder-based collection lives (repo-relative). */
const DIR = {
  services: "src/content/services",
  blog: "src/content/blog",
  authors: "src/content/authors",
  blogCtas: "src/content/ctas/blog",
  ctaSections: "src/content/ctas/section",
  caseStudies: "src/content/case-studies",
  projects: "src/content/projects",
  testimonials: "src/content/testimonials",
} as const;

/** A reference target: entries are `<dir>/<id>.json` (or `.mdx`). */
const json = (dir: string): RefTarget => ({ dir, ext: "json" });
const mdx = (dir: string): RefTarget => ({ dir, ext: "mdx" });

/**
 * A glob loader whose entry ids are the filenames, rejected unless they are
 * lowercase-kebab-case. Astro's default would slugify them — so
 * "Deck Building.json" would build /services/deck-building while links
 * built from the filename pointed at "/services/Deck Building" (a 404). A
 * "slug" key inside a file is ignored for the same reason. `example`
 * finishes the error message.
 */
function filesIn(dir: string, ext: "json" | "mdx", example: string) {
  return glob({
    pattern: `*.${ext}`,
    base: `./${dir}`,
    generateId: ({ entry }) => {
      const id = entry.slice(0, -(ext.length + 1));
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
        throw new Error(
          `"${entry}" in ${dir}/ must be named in lowercase-kebab-case, e.g. ${example}.`,
        );
      }
      return id;
    },
  });
}

/* ── Shared field rules ────────────────────────────────────────────────── */

const iconNames = Object.keys(ICONS) as [
  keyof typeof ICONS,
  ...(keyof typeof ICONS)[],
];

/** Alt text is required and never empty (CLAUDE.md: no alt=""). */
const alt = z.string().min(1, "Alt text can't be empty");

/** A calendar date. In MDX frontmatter it must be quoted (YAML would
    otherwise read it as a Date). */
const isoDate = z
  .string({ error: 'Write the date as quoted text, e.g. "2026-03-01"' })
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Use the format "YYYY-MM-DD", e.g. "2026-03-01"',
  );

/** A site path ("/contact") or a full URL. */
const href = z
  .string()
  .regex(
    /^(\/|https?:\/\/|mailto:|tel:)/,
    'Use a site path like "/contact" or a full URL like "https://example.com"',
  );

/** A full web address. */
const webUrl = z.url({
  protocol: /^https?$/,
  error: 'Use a full URL starting with "https://"',
});

/** Markdown, rendered at content sync to { markdown, html, text }. */
const richText = z.string().min(1).transform(renderRichText);

/** Per-page SEO overrides; every field optional. */
const seo = <I extends z.ZodType>(ogImage: I) =>
  z
    .object({
      metaTitle: z.string().min(1).optional(),
      metaDescription: z.string().min(1).optional(),
      ogTitle: z.string().min(1).optional(),
      ogDescription: z.string().min(1).optional(),
      ogImage: ogImage.optional(),
    })
    .optional();

/* ── Collections ───────────────────────────────────────────────────────── */

/* `services`: one JSON file per service page; the filename is the URL slug
   (/services/<filename>), used as-is by both the page route and the nav
   (src/lib/service-nav.ts). Field guide and copy rules:
   .claude/skills/component-api/references/service-pages.md. */
const services = defineCollection({
  loader: checked(
    filesIn(
      DIR.services,
      "json",
      '"deck-building.json" — the filename becomes the URL /services/<name>',
    ),
  ),
  schema: ({ image }) =>
    z.object({
      /** Service name — page title base, breadcrumb, card title. */
      title: z.string().min(1),
      /** Shorter label for the nav dropdown and footer (defaults to title). */
      navLabel: z.string().optional(),
      /** Sort order in the nav, footer and related cards (lower first). */
      order: z.number().default(100),
      seoTitle: z.string().min(1),
      seoDescription: z.string().min(1).max(160),
      /** Text on this service's card in "related services". */
      cardText: z.string().min(1),
      cardImage: image(),
      cardImageAlt: alt,
      icon: z.enum(iconNames).optional(),
      hero: z.object({
        eyebrow: z.string().optional(),
        /** HTML allowed; wrap accent words in <strong>. */
        heading: z.string().min(1),
        text: z.string().min(1),
        image: image(),
        imageAlt: alt,
      }),
      /** Exactly four proof points for the StatsStrip. */
      highlights: z
        .array(z.object({ value: z.string().min(1), label: z.string().min(1) }))
        .length(4),
      scope: z.object({
        heading: z.string().min(1),
        intro: z.string().optional(),
        items: z
          .array(
            z.object({
              title: z.string().min(1),
              text: z.string().min(1),
              icon: z.enum(iconNames).optional(),
            }),
          )
          .min(1),
      }),
      included: z.object({
        heading: z.string().min(1),
        text: z.string().optional(),
        items: z.array(z.string().min(1)).min(1),
        images: z.array(z.object({ src: image(), alt })).length(2),
      }),
      /** Optional: falls back to DEFAULT_PROCESS in src/data/process.ts. */
      process: z
        .object({
          heading: z.string().min(1),
          steps: z
            .array(
              z.object({ title: z.string().min(1), text: z.string().min(1) }),
            )
            .min(1),
        })
        .optional(),
      reviews: z
        .array(
          z
            .object({
              text: z.string().min(1),
              name: z.string().min(1),
              meta: z.string().optional(),
              /** Optional reviewer photo; needs avatarAlt. */
              avatar: image().optional(),
              avatarAlt: alt.optional(),
            })
            .superRefine((review, ctx) => {
              if (review.avatar && !review.avatarAlt)
                ctx.addIssue({
                  code: "custom",
                  path: ["avatarAlt"],
                  message:
                    'Add avatarAlt (usually the reviewer\'s name) — "avatar" is set, and every image needs alt text.',
                });
            }),
        )
        .optional(),
      faqs: z
        .array(
          z.object({ question: z.string().min(1), answer: z.string().min(1) }),
        )
        .min(2),
      cta: z.object({
        heading: z.string().min(1),
        text: z.string().optional(),
      }),
    }),
});

/** Blog posts: MDX — frontmatter here, the body is the post. */
const blog = defineCollection({
  loader: checked(
    filesIn(
      DIR.blog,
      "mdx",
      '"spring-checklist.mdx" — the filename becomes the URL /blog/<name>',
    ),
    {
      refs: {
        author: json(DIR.authors),
        relatedPosts: mdx(DIR.blog),
        cta: json(DIR.blogCtas),
        ctaSection: json(DIR.ctaSections),
      },
    },
  ),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1),
      /** Card excerpt and meta description. */
      description: z.string().min(1).max(300),
      date: isoDate,
      /** Last meaningful edit (JSON-LD dateModified); defaults to `date`. */
      updated: isoDate.optional(),
      categories: z.array(z.enum(BLOG_CATEGORIES)).min(1),
      /** The /blog section this post appears under (else its first category). */
      primaryCategory: z.enum(BLOG_SECTION_CATEGORIES).optional(),
      image: image(),
      imageAlt: alt,
      author: reference("authors"),
      featured: z.boolean().default(false),
      /** A YouTube or Vimeo URL shown instead of the hero image. */
      video: webUrl.optional(),
      /** Up to three hand-picked related posts. */
      relatedPosts: z.array(reference("blog")).max(3).default([]),
      faqs: z
        .array(z.object({ question: z.string().min(1), answer: richText }))
        .default([]),
      /** Overrides the site default end-of-post CTA (settings.json). */
      cta: reference("blogCtas").optional(),
      /** Overrides the site default CTA section (settings.json). */
      ctaSection: reference("ctaSections").optional(),
      seo: seo(image()),
    }),
});

const authors = defineCollection({
  loader: checked(
    filesIn(
      DIR.authors,
      "json",
      '"jane-doe.json" — posts name it as author: "jane-doe"',
    ),
  ),
  schema: ({ image }) =>
    z.object({
      name: z.string().min(1),
      avatar: image().optional(),
      /** Defaults to the author's name. */
      avatarAlt: alt.optional(),
    }),
});

const blogCtas = defineCollection({
  loader: checked(
    filesIn(
      DIR.blogCtas,
      "json",
      '"free-estimate.json" — posts name it as cta: "free-estimate"',
    ),
  ),
  schema: ({ image }) =>
    z.object({
      heading: z.string().min(1),
      body: z.string().min(1).max(280),
      image: image(),
      imageAlt: alt,
      aspectRatio: z.enum(BLOG_CTA_ASPECT_RATIOS).default("portrait"),
      linkUrl: href,
      linkLabel: z.string().min(1),
    }),
});

const ctaSections = defineCollection({
  loader: checked(
    filesIn(
      DIR.ctaSections,
      "json",
      '"book-a-call.json" — pages name it as ctaSection: "book-a-call"',
    ),
  ),
  schema: ({ image }) =>
    z
      .object({
        heading: z.string().min(1),
        text: z.string().min(1).max(280),
        primaryButtonLabel: z.string().min(1),
        primaryButtonHref: href,
        secondaryButtonLabel: z.string().min(1).optional(),
        secondaryButtonHref: href.optional(),
        backgroundImage: image(),
        imageAlt: alt,
        /** Darkness of the overlay on the photo, 0–100 (default 80). */
        overlayStrength: z.number().int().min(0).max(100).optional(),
      })
      .superRefine((cta, ctx) => {
        if (
          Boolean(cta.secondaryButtonLabel) !== Boolean(cta.secondaryButtonHref)
        )
          ctx.addIssue({
            code: "custom",
            path: [
              cta.secondaryButtonLabel
                ? "secondaryButtonHref"
                : "secondaryButtonLabel",
            ],
            message:
              "Set both secondaryButtonLabel and secondaryButtonHref, or neither.",
          });
      }),
});

/** Site-wide defaults: one object keyed "site". */
const settings = defineCollection({
  loader: checked(file("src/content/settings.json"), {
    refs: {
      defaultBlogCta: json(DIR.blogCtas),
      defaultCtaSection: json(DIR.ctaSections),
    },
  }),
  schema: z.object({
    defaultBlogCta: reference("blogCtas").optional(),
    defaultCtaSection: reference("ctaSections").optional(),
  }),
});

const caseStudies = defineCollection({
  loader: checked(
    filesIn(
      DIR.caseStudies,
      "json",
      '"smith-kitchen.json" — the filename becomes the URL /case-studies/<name>',
    ),
    { refs: { ctaSection: json(DIR.ctaSections) } },
  ),
  schema: ({ image }) => {
    const spacing = {
      sectionSpacing: z.enum(SECTION_SPACINGS).optional(),
      sectionSpacingTop: z.enum(SECTION_SPACINGS).optional(),
      sectionSpacingBottom: z.enum(SECTION_SPACINGS).optional(),
    };
    const ratio = {
      aspectRatio: z.enum(CASE_STUDY_ASPECT_RATIOS).optional(),
      customAspectRatio: z
        .string()
        .regex(
          /^\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?$/,
          'Write a ratio as "width / height", e.g. "4 / 3"',
        )
        .optional(),
    };
    /* The flexible body: one block per layout, the same fields as the
       Sanity blocks (src/sanity/schemaTypes/caseStudy.ts). */
    const block = z.discriminatedUnion("type", [
      z.object({
        type: z.literal("richText"),
        body: richText,
        maxWidth: z.enum(CASE_STUDY_MAX_WIDTHS).optional(),
        ...spacing,
      }),
      z.object({
        type: z.literal("richTextLeft"),
        body: richText,
        maxWidth: z.enum(CASE_STUDY_MAX_WIDTHS).optional(),
        ...spacing,
      }),
      z.object({
        type: z.literal("richTextColumns"),
        body: richText,
        ...spacing,
      }),
      z.object({
        type: z.literal("richTextWithImage"),
        body: richText,
        image: image(),
        imageAlt: alt,
        transparent: z.boolean().optional(),
        objectFit: z.enum(["cover", "contain"]).optional(),
        ...ratio,
        ...spacing,
      }),
      z.object({
        type: z.literal("fullWidthImage"),
        image: image(),
        imageAlt: alt,
        transparent: z.boolean().optional(),
        ...ratio,
        ...spacing,
      }),
      z.object({
        type: z.literal("imageGrid"),
        images: z
          .array(
            z.object({
              image: image(),
              alt,
              transparent: z.boolean().optional(),
            }),
          )
          .min(2),
        ...ratio,
        ...spacing,
      }),
      z.object({
        type: z.literal("stats"),
        items: z
          .array(
            z.object({ value: z.string().min(1), label: z.string().min(1) }),
          )
          .min(1),
        ...spacing,
      }),
    ]);
    return z
      .object({
        title: z.string().min(1),
        description: z.string().min(1).max(300),
        client: z.string().min(1),
        image: image(),
        imageAlt: alt,
        date: isoDate,
        updated: isoDate.optional(),
        featured: z.boolean().default(false),
        /** Not published yet: the card links to liveUrl, no page is built. */
        comingSoon: z.boolean().default(false),
        categories: z.array(z.enum(CASE_STUDY_CATEGORIES)).min(1),
        industries: z.array(z.enum(CASE_STUDY_INDUSTRIES)).min(1),
        timeline: z.string().min(1).optional(),
        liveUrl: webUrl.optional(),
        /** The hero slider. */
        galleryImages: z.array(z.object({ src: image(), alt })).default([]),
        content: z.array(block).default([]),
        ctaSection: reference("ctaSections").optional(),
        seo: seo(image()),
      })
      .superRefine((study, ctx) => {
        if (study.comingSoon && !study.liveUrl)
          ctx.addIssue({
            code: "custom",
            path: ["liveUrl"],
            message:
              "Add liveUrl — a coming-soon case study links to the live site instead of a page.",
          });
      });
  },
});

const projects = defineCollection({
  loader: checked(
    filesIn(
      DIR.projects,
      "json",
      '"smith-kitchen.json" — the filename becomes the URL /projects/<name>',
    ),
  ),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1),
      category: z.enum(PROJECT_CATEGORY_VALUES),
      /** As it should read, e.g. "Springfield, IL". */
      location: z.string().min(1).optional(),
      /** The service the job used, e.g. "Kitchen remodeling". */
      service: z.string().min(1).optional(),
      /** The write-up (Markdown). */
      description: richText.optional(),
      quote: z
        .object({
          text: z.string().min(1),
          name: z.string().min(1).optional(),
        })
        .optional(),
      heroImage: image(),
      imageAlt: alt,
      photos: z
        .array(
          z.object({
            src: image(),
            alt,
            label: z.enum(PROJECT_PHOTO_LABELS).optional(),
          }),
        )
        .default([]),
      completed: isoDate.optional(),
      featured: z.boolean().default(false),
      /** Meta description; else the start of the write-up. */
      seoDescription: z.string().min(1).optional(),
    }),
});

/** Gallery: one array in src/content/gallery.json; each item needs an id. */
const gallery = defineCollection({
  loader: checked(file("src/content/gallery.json"), {
    refs: { project: json(DIR.projects) },
  }),
  schema: ({ image }) =>
    z.object({
      image: image(),
      alt,
      caption: z.string().min(1).max(60),
      category: z.enum(PROJECT_CATEGORY_VALUES),
      location: z.string().min(1).optional(),
      /** The project the photo belongs to (adds its title to the caption). */
      project: reference("projects").optional(),
      added: isoDate,
    }),
});

const testimonials = defineCollection({
  loader: checked(
    filesIn(
      DIR.testimonials,
      "json",
      '"jane-doe.json" — <SingleTestimonial name> looks testimonials up by name',
    ),
  ),
  schema: ({ image }) =>
    z
      .object({
        name: z.string().min(1),
        role: z.string().min(1).optional(),
        company: z.string().min(1).optional(),
        quote: z.string().min(1),
        avatar: image().optional(),
        /** Required with an avatar — usually the person's name. */
        avatarAlt: alt.optional(),
        website: webUrl.optional(),
        stars: z.number().int().min(1).max(5).optional(),
        featured: z.boolean().default(false),
        /** Sort order, lowest first. */
        order: z.number().int().min(0).default(100),
      })
      .superRefine((t, ctx) => {
        if (t.avatar && !t.avatarAlt)
          ctx.addIssue({
            code: "custom",
            path: ["avatarAlt"],
            message:
              'Add avatarAlt (usually the person\'s name) — "avatar" is set, and every image needs alt text.',
          });
      }),
});

export const collections = {
  services,
  blog,
  authors,
  blogCtas,
  ctaSections,
  settings,
  caseStudies,
  projects,
  gallery,
  testimonials,
};
```

- [ ] **Step 15: Review avatars on `Quote` and `Reviews`**

`src/components/ui/Quote.astro`: add
`import { resolveImageUrl, type ContentImage } from "@/lib/content";`
below the `HTMLAttributes` import, and after `QuoteMark`:

```ts
/** A reviewer photo: an imported image or a URL, with its alt text. */
type QuoteAvatar = ContentImage;
```

Add the prop to `Props` between `meta` and `size`:

```ts
  /**
   * A small round photo beside the name — `{ src, alt }` with `src` an
   * imported image or a URL (resized to 96px). Alt is usually the name.
   *
   * @example avatar={{ src: reviewerPhoto, alt: "Sandra D." }}
   */
  avatar?: QuoteAvatar;
```

Add `avatar,` to the destructure after `meta,`. After the destructure, add
`const avatarSrc = await resolveImageUrl(avatar, { width: 96, height: 96 });`.
In the markup, replace the single line
`{name && <span class="quote_name">{name}</span>}` with ONE expression. Do
not add a sibling expression line: a second expression adds a whitespace
text node to every review without a photo, which breaks parity (measured).

```astro
{
  avatarSrc && avatar ? (
    <span class="quote_person">
      <img
        class="quote_avatar"
        src={avatarSrc}
        alt={avatar.alt}
        width="48"
        height="48"
        loading="lazy"
      />
      <span class="quote_name">{name}</span>
    </span>
  ) : (
    name && <span class="quote_name">{name}</span>
  )
}
```

Append inside the `@layer components` block:

```css
/* With a photo: the avatar sits beside the name; meta stays below. */
.quote_person {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.quote_avatar {
  width: 2.5em;
  height: auto;
  aspect-ratio: 1 / 1;
  flex-shrink: 0;
  border-radius: var(--radius-full, 100vmax);
  object-fit: cover;
}

.quote_person .quote_name {
  min-width: 0;
}
```

`src/components/sections/Reviews.astro`: change the `Review` type to:

```ts
type Review = {
  text: string;
  name: string;
  meta?: string;
  /** Reviewer photo: an imported image or a URL. Needs `avatarAlt`. */
  avatar?: ImageMetadata | string;
  /** Alt text for `avatar` — usually the reviewer's name. */
  avatarAlt?: string;
};
```

Add `import type { ImageMetadata } from "astro";` to the imports. In the
`docs` JSDoc, change the `reviews` bullet to
`` `reviews` — `{ text, name, meta?, avatar?, avatarAlt? }[]`, typed in by you or from a service file ``.
After the DEV warnings, add:

```ts
/** A review's photo in the shape Quote takes (alt falls back to the name). */
const reviewAvatar = (review: Review) =>
  review.avatar
    ? { src: review.avatar, alt: review.avatarAlt || review.name }
    : undefined;
```

Add `avatar={reviewAvatar(featured)}` to the featured `<Quote>`, and
`avatar={reviewAvatar(review)}` to the other two `<Quote>` calls.
`src/pages/services/[slug].astro` keeps passing `s.reviews` unchanged:
the collection's review items already match `Review`.

- [ ] **Step 16: Sync and spot-check the failure path**

Run: `npx astro sync`
Expected: `Synced content` and no `[ERROR]` lines. Then check that the
editor schemas exist:
`ls .astro/collections` shows `authors`, `blog`, `blogCtas`,
`caseStudies`, `ctaSections`, `gallery`, `projects`, `services`, `settings`
and `testimonials`, each `<name>.schema.json`.

Break one reference by hand and watch it fail:

```bash
sed -i.bak 's/"author": "daniel-reyes"/"author": "nobody"/; s/^author: "daniel-reyes"/author: "nobody"/' src/content/blog/industry-trends.mdx
npx astro sync 2>&1 | grep -F 'src/content/blog/industry-trends.mdx → author: no entry "nobody"'
mv src/content/blog/industry-trends.mdx.bak src/content/blog/industry-trends.mdx
```

Expected: the grep prints that line. Task 4 automates every such case.

- [ ] **Step 17: Gate**

```bash
node scripts/check-content-text.mjs
npm run check && npm run check:hover && npm run check:boundary
KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity npm run build && node scripts/compare-dist.mjs .parity/empty dist/client
KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity PARITY_FIXTURES=1 npm run build && node scripts/compare-dist.mjs .parity/fixtures dist/client
```

Expected: `check-content-text: ok`, and `Identical` twice. The new
collections are not rendered yet. `Quote` without an avatar renders exactly
as before, and the MDX integration changes no page.

- [ ] **Step 18: Commit**

```bash
git add package.json package-lock.json astro.config.mjs src/content.config.ts src/content src/lib/content/markdown.ts src/lib/content/checks.ts scripts/check-content-text.mjs scripts/check-content-boundary.mjs src/components/ui/Quote.astro src/components/sections/Reviews.astro
git commit -m "$(cat <<'EOF'
Add content collections, sync-time checks and sample content

Every content type gets a collection (blog as MDX, the rest as JSON),
validated at content sync: Markdown inside JSON renders once into the data
store, and a loader wrapper fails the sync on missing images and dangling
references with the file and field named. Sample content ports the
existing placeholders. Quote and Reviews take an optional avatar.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Negative content checks (`npm run check:content`)

A script that proves each kind of bad content fails `astro sync` with the
file and the field named, wired into `npm run check:content` and CI. It
writes temporary, self-contained `zz-check-*` entries instead of editing
yours, so it keeps working after a fork replaces the sample content.

**Files:**

- Create: `scripts/check-content-validation.mjs`
- Modify: `package.json` (`check:content`), `.github/workflows/ci.yml`

**Interfaces:**

- Consumes: the collections and `checked()` from Task 3; `BLOG_CATEGORIES`,
  `CASE_STUDY_CATEGORIES`, `CASE_STUDY_INDUSTRIES`,
  `PROJECT_CATEGORY_VALUES` from `src/config/*`.
- Produces: `npm run check:content`, which runs
  `scripts/check-content-text.mjs` and then
  `scripts/check-content-validation.mjs`. The `CASES` array is the
  extension point Task 6 appends to; each case is
  `{ name: string, apply: () => void, expect: string[] }`. Also
  `post(overrides, body)` and the `POST_FILE` constant.

- [ ] **Step 1: Create `scripts/check-content-validation.mjs`**

```js
#!/usr/bin/env node
/**
 * check-content-validation — proves bad content fails `astro sync` (and so
 * `npm run build`, `astro check` and `astro dev`) with a message that names
 * the file and the field. Spec: "Every content file is schema-validated at
 * build time. Bad content fails the build with a message naming the file and
 * the field."
 *
 * It never edits your entries. A run writes a small set of temporary
 * `zz-check-*` entries (and a 1×1 PNG beside them) that are valid together —
 * the control set, which must sync cleanly — then, per case, rewrites ONE of
 * them with ONE broken field, runs `astro sync`, and expects a non-zero exit
 * whose output contains every `expect` string. The gallery case appends an
 * item to src/content/gallery.json (a single-file collection) and restores
 * the original bytes. Everything is removed or restored after each case, on
 * exit and on Ctrl-C.
 *
 * Usage: npm run check:content
 * Exit 1 when a broken entry syncs, or its error misses the file or field.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { BLOG_CATEGORIES } from "../src/config/blog.ts";
import {
  CASE_STUDY_CATEGORIES,
  CASE_STUDY_INDUSTRIES,
} from "../src/config/case-studies.ts";
import { PROJECT_CATEGORY_VALUES } from "../src/config/projects.ts";

const ROOT = process.cwd();
const ASTRO = path.join(ROOT, "node_modules", "astro", "astro.js");
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

/* ── Temporary files: tracked, and always cleaned up ───────────────────── */

/** Files and folders this run created (removed afterwards). */
const created = new Set();
/** Files this run overwrote → their original bytes (restored afterwards). */
const originals = new Map();

function write(rel, content) {
  const abs = path.join(ROOT, rel);
  const missingDirs = [];
  for (
    let dir = path.dirname(abs);
    !fs.existsSync(dir);
    dir = path.dirname(dir)
  )
    missingDirs.unshift(dir);
  for (const dir of missingDirs) {
    fs.mkdirSync(dir);
    created.add(dir);
  }
  if (!fs.existsSync(abs)) created.add(abs);
  else if (!created.has(abs) && !originals.has(abs))
    originals.set(abs, fs.readFileSync(abs));
  fs.writeFileSync(abs, content);
}

function cleanup() {
  for (const [abs, bytes] of originals) fs.writeFileSync(abs, bytes);
  originals.clear();
  // Deepest paths first, so files go before the folders that hold them.
  for (const abs of [...created].sort((a, b) => b.length - a.length))
    fs.rmSync(abs, { recursive: true, force: true });
  created.clear();
}

process.on("exit", cleanup);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    cleanup();
    process.exit(130);
  });

/* ── The control set: valid together ───────────────────────────────────── */

const json = (data) => `${JSON.stringify(data, null, 2)}\n`;
const IMG = "./images/zz-check.png";
const POST_FILE = "src/content/blog/zz-check-post.mdx";
const PROJECT = {
  title: "Check project",
  category: PROJECT_CATEGORY_VALUES[0],
  heroImage: IMG,
  imageAlt: "A check image",
};
const STUDY = {
  title: "Check study",
  description: "Check.",
  client: "Check",
  image: IMG,
  imageAlt: "A check image",
  date: "2026-01-01",
  categories: [CASE_STUDY_CATEGORIES[0]],
  industries: [CASE_STUDY_INDUSTRIES[0]],
};
const TESTIMONIAL = {
  name: "Check Person",
  quote: "Check.",
  avatar: IMG,
  avatarAlt: "Check Person",
};

/** An MDX post. A `{ raw }` value is written into the YAML unquoted. */
function post(overrides = {}, body = "## Check\n\nBody text.\n") {
  const fields = {
    title: "Check post",
    description: "Check.",
    date: "2026-01-01",
    categories: [BLOG_CATEGORIES[0]],
    image: IMG,
    imageAlt: "A check image",
    author: "zz-check-author",
    relatedPosts: [],
    cta: "zz-check-cta",
    ctaSection: "zz-check-section",
    ...overrides,
  };
  const yaml = Object.entries(fields)
    .map(
      ([key, value]) =>
        `${key}: ${value && typeof value === "object" && "raw" in value ? value.raw : JSON.stringify(value)}`,
    )
    .join("\n");
  return `---\n${yaml}\n---\n\n${body}`;
}

function control() {
  for (const dir of [
    "authors",
    "ctas/blog",
    "ctas/section",
    "projects",
    "case-studies",
    "testimonials",
    "blog",
  ])
    write(`src/content/${dir}/images/zz-check.png`, PNG);
  write(
    "src/content/authors/zz-check-author.json",
    json({ name: "Check Author" }),
  );
  write(
    "src/content/ctas/blog/zz-check-cta.json",
    json({
      heading: "Check",
      body: "Check body.",
      image: IMG,
      imageAlt: "A check image",
      linkUrl: "/contact",
      linkLabel: "Go",
    }),
  );
  write(
    "src/content/ctas/section/zz-check-section.json",
    json({
      heading: "Check",
      text: "Check text.",
      primaryButtonLabel: "Go",
      primaryButtonHref: "/contact",
      backgroundImage: IMG,
      imageAlt: "A check image",
    }),
  );
  write("src/content/projects/zz-check-project.json", json(PROJECT));
  write("src/content/case-studies/zz-check-study.json", json(STUDY));
  write(
    "src/content/testimonials/zz-check-testimonial.json",
    json(TESTIMONIAL),
  );
  write(POST_FILE, post());
}

/* ── The cases: each breaks ONE field ──────────────────────────────────── */

const { avatarAlt: _droppedAlt, ...TESTIMONIAL_WITHOUT_ALT } = TESTIMONIAL;

const CASES = [
  {
    name: "missing data image",
    apply: () =>
      write(
        "src/content/projects/zz-check-project.json",
        json({ ...PROJECT, heroImage: "./images/zz-missing.png" }),
      ),
    expect: [
      "src/content/projects/zz-check-project.json",
      "heroImage",
      "zz-missing.png",
    ],
  },
  {
    name: "missing body image",
    apply: () =>
      write(
        POST_FILE,
        post({}, "## Check\n\n![A missing photo](./images/zz-missing.png)\n"),
      ),
    expect: [POST_FILE, "body", "zz-missing.png"],
  },
  {
    name: "empty alt",
    apply: () =>
      write(
        "src/content/case-studies/zz-check-study.json",
        json({ ...STUDY, imageAlt: "" }),
      ),
    expect: ["zz-check-study.json", "imageAlt", "Alt text can't be empty"],
  },
  {
    name: "bad category enum",
    apply: () => write(POST_FILE, post({ categories: ["zz-not-a-category"] })),
    expect: ["zz-check-post.mdx", "categories"],
  },
  {
    name: "unquoted date",
    apply: () => write(POST_FILE, post({ date: { raw: "2026-01-01" } })),
    expect: ["zz-check-post.mdx", "date", "quoted"],
  },
  {
    name: "dangling author",
    apply: () => write(POST_FILE, post({ author: "zz-nobody" })),
    expect: [POST_FILE, "author", "zz-nobody"],
  },
  {
    name: "dangling related post",
    apply: () => write(POST_FILE, post({ relatedPosts: ["zz-no-post"] })),
    expect: [POST_FILE, "relatedPosts", "zz-no-post"],
  },
  {
    name: "dangling CTA",
    apply: () => write(POST_FILE, post({ cta: "zz-no-cta" })),
    expect: [POST_FILE, "cta", "zz-no-cta"],
  },
  {
    name: "dangling gallery project",
    apply: () => {
      const file = "src/content/gallery.json";
      const abs = path.join(ROOT, file);
      const items = fs.existsSync(abs)
        ? JSON.parse(fs.readFileSync(abs, "utf8"))
        : [];
      write("src/content/gallery/images/zz-check.png", PNG);
      write(
        file,
        json([
          ...items,
          {
            id: "zz-check",
            image: "./gallery/images/zz-check.png",
            alt: "A check image",
            caption: "Check",
            category: PROJECT_CATEGORY_VALUES[0],
            project: "zz-gone",
            added: "2026-01-01",
          },
        ]),
      );
    },
    expect: ["src/content/gallery.json", "project", "zz-gone"],
  },
  {
    name: "comingSoon without liveUrl",
    apply: () =>
      write(
        "src/content/case-studies/zz-check-study.json",
        json({ ...STUDY, comingSoon: true }),
      ),
    expect: ["zz-check-study.json", "liveUrl"],
  },
  {
    name: "avatar without avatarAlt",
    apply: () =>
      write(
        "src/content/testimonials/zz-check-testimonial.json",
        json(TESTIMONIAL_WITHOUT_ALT),
      ),
    expect: ["zz-check-testimonial.json", "avatarAlt"],
  },
  {
    name: "filename not kebab-case",
    apply: () =>
      write(
        "src/content/testimonials/zz Check Bad.json",
        json({ name: "Bad", quote: "Bad." }),
      ),
    expect: ["zz Check Bad.json", "lowercase-kebab-case"],
  },
];

/* ── Run ───────────────────────────────────────────────────────────────── */

function sync() {
  const run = spawnSync(process.execPath, [ASTRO, "sync"], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
    timeout: 180_000,
  });
  return {
    ok: run.status === 0,
    output: `${run.stdout ?? ""}\n${run.stderr ?? ""}`,
  };
}

const tail = (text) => text.trim().split("\n").slice(-15).join("\n");

control();
const baseline = sync();
if (!baseline.ok) {
  console.log(
    `FAIL  the control entries do not sync, so this script is out of date with the schemas:\n${tail(baseline.output)}`,
  );
  process.exit(1);
}
console.log("ok    control entries sync");

let failures = 0;
for (const testCase of CASES) {
  cleanup();
  control();
  testCase.apply();
  const { ok, output } = sync();
  const missing = testCase.expect.filter((text) => !output.includes(text));
  if (ok) {
    failures++;
    console.log(`FAIL  ${testCase.name}: astro sync passed`);
  } else if (missing.length) {
    failures++;
    console.log(
      `FAIL  ${testCase.name}: the error does not mention ${missing.map((m) => `"${m}"`).join(", ")}\n${tail(output)}`,
    );
  } else console.log(`ok    ${testCase.name}`);
}

cleanup();
if (!sync().ok) {
  failures++;
  console.log("FAIL  the content does not sync after cleanup");
}

console.log(
  failures
    ? `\n${failures} case(s) failed.`
    : `\nAll ${CASES.length} broken-content cases fail sync, naming the file and the field.`,
);
process.exit(failures ? 1 : 0);
```

- [ ] **Step 2: Add the npm script and run it**

In `package.json` `scripts`, after `check:boundary`, add:
`"check:content": "node scripts/check-content-text.mjs && node scripts/check-content-validation.mjs"`.

Run: `npm run check:content`
Expected: `check-content-text: ok`, then `ok` for the control set and each
of the 12 cases, then
`All 12 broken-content cases fail sync, naming the file and the field.`
Then run `git status --short src/content`. Expected: no output, so nothing
was left behind.

- [ ] **Step 3: Prove the harness can fail**

Temporarily delete the `.superRefine(…)` block on `caseStudies` in
`src/content.config.ts`. Run `npm run check:content`.
Expected: `FAIL  comingSoon without liveUrl: astro sync passed` and exit 1.
Restore the block with `git checkout src/content.config.ts` and re-run:
everything ok.

- [ ] **Step 4: Run it in CI**

In `.github/workflows/ci.yml`, add `- run: npm run check:content` after
`- run: npm run check:boundary`.

- [ ] **Step 5: Gate**

```bash
npm run check && npm run check:hover && npm run check:boundary && npm run check:content
```

Expected: all pass. No rendered output changed, so the parity builds are
skipped for this task.

- [ ] **Step 6: Commit**

```bash
git add scripts/check-content-validation.mjs package.json .github/workflows/ci.yml
git commit -m "$(cat <<'EOF'
Add check:content: bad content must fail sync, naming file and field

Writes temporary zz-check entries that are valid together, breaks one
field per case (missing image, empty alt, bad enum, unquoted date,
dangling author/related/CTA/gallery project, comingSoon without liveUrl,
avatar without alt, bad filename) and expects astro sync to fail with the
file and field in the message. Runs in CI.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: The Files content source

The Files implementation of every `ContentSource` function, built only via
`CONTENT_SOURCE=files` for now. Also a built-site check for Review Focus
items 3 and 4, and the first `.parity/files` baseline.

**Files:**

- Create: `src/lib/content/files/{index,entries,shared,ctas,testimonials,projects,case-studies,blog,mdx-text}.ts`
- Create: `scripts/check-content-build.mjs`
- Modify: `scripts/check-content-text.mjs` (MDX body helpers),
  `scripts/check-content-boundary.mjs` (Files-backend import rule),
  `package.json` (`check:content-build`)

**Interfaces:**

- Consumes: the collections from Task 3 (`CollectionEntry` types),
  `resolveImageUrl`/`sizedImage` (`@/lib/content/images`),
  `estimateReadTime` (`@/lib/read-time`), `categoryToSlug`
  (`@/lib/blog-categories`), `categoryTitle` (`@/config/projects`),
  `projectPath` (`@/lib/projects`).
- Produces:
  - `src/lib/content/files/index.ts`: `default` is `filesSource`,
    `satisfies ContentSource`.
  - `entries.ts`: `loadContent(): Promise<Content>`,
    `need(map, collection, id)`, `type Entry<C>`, `interface Content`.
  - `ctas.ts`: `toBlogCta`, `toCtaSection`,
    `resolveBlogCta(content, ref)`, `resolveCtaSection(content, ref)`,
    `getCtaDefaults()`, and `getBlogCtaById(id: string): Promise<BlogCtaData>`
    (Task 6's MDX component calls it).
  - `mdx-text.ts`: `mdxWords(body)`, `mdxToMarkdown(body)` and
    `inlineCtaIds(body): string[]` (Task 6's sync check calls it).
  - `npm run check:content-build [dist/client]`.

- [ ] **Step 1: Write the failing checks**

Run: `KEEP_DEV_PAGES=1 CONTENT_SOURCE=files npm run build 2>&1 | tail -3`
Expected: FAIL. The build cannot load `src/lib/content/files/index.ts`.

Append to `scripts/check-content-text.mjs`, above the final
`console.log`:

````js
import {
  inlineCtaIds,
  mdxToMarkdown,
  mdxWords,
} from "../src/lib/content/files/mdx-text.ts";

const BODY = [
  "Intro with a [link](/x) and **bold**.",
  "",
  "## A heading",
  "",
  "- one item",
  "1. two item",
  "",
  "```js",
  "const skipped = true;",
  "```",
  "",
  '<Callout type="tip">',
  "Skipped callout text.",
  "</Callout>",
  "",
  '<VideoEmbed url="https://youtu.be/abc" caption="A demo" />',
  "",
  '<BlogCta id="free-site-review" />',
  "",
  "![An image](./images/x.webp)",
].join("\n");

// Read time counts what the Portable Text source counts: prose blocks only,
// no code, callouts, embeds or image alt text.
assert.deepEqual(mdxWords(BODY).trim().split(/\s+/), [
  "Intro",
  "with",
  "a",
  "link",
  "and",
  "**bold**.",
  "A",
  "heading",
  "one",
  "item",
  "two",
  "item",
]);
// llms-full.txt: videos become links, CTA and callout tags drop out, local
// image paths are hidden (the Portable Text exporter's `![alt]`).
assert.equal(
  mdxToMarkdown(BODY),
  [
    "Intro with a [link](/x) and **bold**.",
    "",
    "## A heading",
    "",
    "- one item",
    "1. two item",
    "",
    "```js",
    "const skipped = true;",
    "```",
    "",
    "Skipped callout text.",
    "",
    "[Video: A demo](https://youtu.be/abc)",
    "",
    "![An image]",
  ].join("\n"),
);
assert.deepEqual(inlineCtaIds(BODY), ["free-site-review"]);
````

Move the new `import` line up to join the other imports (ES modules hoist
imports, but keep the file tidy). Run `node scripts/check-content-text.mjs`.
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `mdx-text.ts`.

- [ ] **Step 2: `src/lib/content/files/mdx-text.ts`**

````ts
/**
 * Plain-string helpers over an MDX post's raw body (`entry.body`). Pure (no
 * Astro imports), so scripts/check-content-text.mjs runs them under Node.
 * They read a body the way the Sanity source reads Portable Text, so both
 * sources count the same words and export comparable Markdown:
 *
 * - mdxWords — the prose a reader reads: no code, callouts, embeds or images.
 * - mdxToMarkdown — the llms-full.txt copy: components converted or dropped.
 * - inlineCtaIds — the ids that `<BlogCta id="…" />` tags name.
 *
 * Component tags are matched on their own lines — the way the content guide
 * (.claude/skills/content-files/SKILL.md) tells authors to write them.
 */

/** A fenced code block, fences included. */
const FENCE = /^```[^\n]*\n[\s\S]*?^```[ \t]*$/gm;
/** A whole `<Callout>` block. */
const CALLOUT = /^<Callout\b[^>]*>[\s\S]*?^<\/Callout>[ \t]*$/gm;
/** A self-closing component on its own line (`<VideoEmbed … />`). */
const SELF_CLOSING_TAG = /^<[A-Z]\w*\b[^>]*\/>[ \t]*$/gm;
const IMAGE = /!\[([^\]]*)\]\([^)]*\)/g;
const LINK = /\[([^\]]*)\]\([^)]*\)/g;
/** Heading, quote and list markers at the start of a line. */
const LINE_MARKER = /^[ \t]*(?:#{1,6}|>|[-*+]|\d+\.)[ \t]+/gm;

/** The words a reader reads, for estimateReadTime(). */
export function mdxWords(body: string): string {
  return body
    .replace(FENCE, " ")
    .replace(CALLOUT, " ")
    .replace(SELF_CLOSING_TAG, " ")
    .replace(IMAGE, " ")
    .replace(LINK, "$1")
    .replace(LINE_MARKER, "");
}

const attr = (attrs: string, name: string): string =>
  new RegExp(`\\b${name}="([^"]*)"`).exec(attrs)?.[1] ?? "";

/**
 * The body as Markdown for llms-full.txt: a video becomes a link, inline
 * CTAs and the callout tags drop out (the callout's text stays), and local
 * image paths are hidden.
 */
export function mdxToMarkdown(body: string): string {
  return body
    .replace(
      /^<VideoEmbed\b([^>]*)\/>[ \t]*$/gm,
      (_, attrs: string) =>
        `[Video: ${attr(attrs, "caption") || "embedded video"}](${attr(attrs, "url")})`,
    )
    .replace(/^<BlogCta\b[^>]*\/>[ \t]*$/gm, "")
    .replace(/^<\/?Callout\b[^>]*>[ \t]*$/gm, "")
    .replace(IMAGE, "![$1]")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Every id an inline `<BlogCta id="…" />` names. */
export function inlineCtaIds(body: string): string[] {
  return [...body.matchAll(/<BlogCta\b[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
}
````

Run: `node scripts/check-content-text.mjs`
Expected: `check-content-text: ok`.

- [ ] **Step 3: `src/lib/content/files/entries.ts` and `shared.ts`**

```ts
/**
 * The Files backend's view of src/content: every collection, loaded per call
 * and indexed by id. Astro validated every file at content sync (the schemas
 * in src/content.config.ts, plus the image and reference checks in
 * ../checks.ts), so lookups can assume complete, linked content; a missing
 * entry still throws a named error rather than rendering half a page.
 *
 * Not memoized on purpose: getCollection() is already cached by Astro, and
 * a module-level cache would keep serving stale content in `astro dev`.
 */
import {
  getCollection,
  type CollectionEntry,
  type CollectionKey,
} from "astro:content";

export type Entry<C extends CollectionKey> = CollectionEntry<C>;

/** Every collection the content functions read, indexed by id. */
export interface Content {
  blog: Map<string, Entry<"blog">>;
  authors: Map<string, Entry<"authors">>;
  blogCtas: Map<string, Entry<"blogCtas">>;
  ctaSections: Map<string, Entry<"ctaSections">>;
  caseStudies: Map<string, Entry<"caseStudies">>;
  projects: Map<string, Entry<"projects">>;
  gallery: Entry<"gallery">[];
  testimonials: Entry<"testimonials">[];
  /** settings.json's "site" entry, if there is one. */
  settings: Entry<"settings">["data"] | undefined;
}

const byId = <T extends { id: string }>(entries: T[]) =>
  new Map(entries.map((entry) => [entry.id, entry]));

export async function loadContent(): Promise<Content> {
  const [
    blog,
    authors,
    blogCtas,
    ctaSections,
    settings,
    caseStudies,
    projects,
    gallery,
    testimonials,
  ] = await Promise.all([
    getCollection("blog"),
    getCollection("authors"),
    getCollection("blogCtas"),
    getCollection("ctaSections"),
    getCollection("settings"),
    getCollection("caseStudies"),
    getCollection("projects"),
    getCollection("gallery"),
    getCollection("testimonials"),
  ]);
  return {
    blog: byId(blog),
    authors: byId(authors),
    blogCtas: byId(blogCtas),
    ctaSections: byId(ctaSections),
    caseStudies: byId(caseStudies),
    projects: byId(projects),
    gallery,
    testimonials,
    settings: settings.find((entry) => entry.id === "site")?.data,
  };
}

/** An entry by id, or a named error (the sync checks make it unreachable). */
export function need<C extends CollectionKey>(
  entries: Map<string, Entry<C>>,
  collection: C,
  id: string,
): Entry<C> {
  const entry = entries.get(id);
  if (!entry)
    throw new Error(
      `[content] No "${collection}" entry "${id}". Ids are filenames without the extension.`,
    );
  return entry;
}
```

```ts
/**
 * Helpers the Files backend's per-type modules share.
 */
import type { ImageMetadata } from "astro";
import type { ContentImage, SeoFields } from "@/lib/content/types";

/**
 * A local image as a ContentImage: Astro's metadata plus its intrinsic size
 * (so sizedImage() keeps the ratio). Files content has no focal point, so
 * the image renders centred.
 */
export function localImage(src: ImageMetadata, alt: string): ContentImage {
  return { src, alt, width: src.width, height: src.height };
}

/** The optional `seo` object page-level collections share. */
interface SeoInput {
  metaTitle?: string;
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: ImageMetadata;
}

export function toSeo(seo: SeoInput | undefined): SeoFields | null {
  if (!seo) return null;
  return {
    metaTitle: seo.metaTitle ?? null,
    metaDescription: seo.metaDescription ?? null,
    ogTitle: seo.ogTitle ?? null,
    ogDescription: seo.ogDescription ?? null,
    // og:image:alt comes from the page, not the image.
    ogImage: seo.ogImage ? localImage(seo.ogImage, "") : null,
  };
}

/**
 * Newest first by a "YYYY-MM-DD" field, undated entries last, ties by id —
 * so equal dates always list in the same order.
 */
export function newestFirst<T extends { id: string }>(
  dateOf: (entry: T) => string | undefined,
): (a: T, b: T) => number {
  return (a, b) =>
    (dateOf(b) ?? "").localeCompare(dateOf(a) ?? "") ||
    a.id.localeCompare(b.id);
}
```

- [ ] **Step 4: `ctas.ts` and `testimonials.ts`**

```ts
/**
 * Blog CTAs (src/content/ctas/blog/), CTA sections (src/content/ctas/section/)
 * and the site defaults in src/content/settings.json → BlogCtaData /
 * CtaSectionData.
 */
import type {
  BlogCtaData,
  CtaDefaults,
  CtaSectionData,
} from "@/lib/content/types";
import { loadContent, need, type Content, type Entry } from "./entries";
import { localImage } from "./shared";

/** A reference field's value. */
type Ref = { id: string } | undefined;

export function toBlogCta(entry: Entry<"blogCtas">): BlogCtaData {
  const d = entry.data;
  return {
    heading: d.heading,
    body: d.body,
    image: localImage(d.image, d.imageAlt),
    aspectRatio: d.aspectRatio,
    linkUrl: d.linkUrl,
    linkLabel: d.linkLabel,
  };
}

export function toCtaSection(entry: Entry<"ctaSections">): CtaSectionData {
  const d = entry.data;
  return {
    heading: d.heading,
    text: d.text,
    primaryButtonLabel: d.primaryButtonLabel,
    primaryButtonHref: d.primaryButtonHref,
    secondaryButtonLabel: d.secondaryButtonLabel ?? null,
    secondaryButtonHref: d.secondaryButtonHref ?? null,
    backgroundImage: localImage(d.backgroundImage, d.imageAlt),
    overlayStrength: d.overlayStrength ?? null,
  };
}

/** The blog CTA a page names, else the site default; null when neither. */
export function resolveBlogCta(content: Content, ref: Ref): BlogCtaData | null {
  const id = ref?.id ?? content.settings?.defaultBlogCta?.id;
  return id ? toBlogCta(need(content.blogCtas, "blogCtas", id)) : null;
}

/** The CTA section a page names, else the site default; null when neither. */
export function resolveCtaSection(
  content: Content,
  ref: Ref,
): CtaSectionData | null {
  const id = ref?.id ?? content.settings?.defaultCtaSection?.id;
  return id ? toCtaSection(need(content.ctaSections, "ctaSections", id)) : null;
}

export async function getCtaDefaults(): Promise<CtaDefaults> {
  const content = await loadContent();
  return {
    blogCta: resolveBlogCta(content, undefined),
    ctaSection: resolveCtaSection(content, undefined),
  };
}

/** One blog CTA by id — for `<BlogCta id>` in an MDX post body. */
export async function getBlogCtaById(id: string): Promise<BlogCtaData> {
  return toBlogCta(need((await loadContent()).blogCtas, "blogCtas", id));
}
```

```ts
/**
 * Testimonials (src/content/testimonials/*.json) → TestimonialData, in
 * `order` (lowest first, ties by id).
 */
import type { TestimonialData, TestimonialFilter } from "@/lib/content/types";
import { loadContent, type Entry } from "./entries";
import { localImage } from "./shared";

function toTestimonial(entry: Entry<"testimonials">): TestimonialData {
  const d = entry.data;
  return {
    id: entry.id,
    name: d.name,
    role: d.role ?? null,
    company: d.company ?? null,
    quote: d.quote,
    // The schema requires avatarAlt with an avatar; the name only satisfies the type.
    avatar: d.avatar ? localImage(d.avatar, d.avatarAlt ?? d.name) : null,
    website: d.website ?? null,
    stars: d.stars ?? null,
    featured: d.featured,
    order: d.order,
  };
}

export async function getTestimonials(
  filter: TestimonialFilter = {},
): Promise<TestimonialData[]> {
  const { testimonials } = await loadContent();
  const ordered = testimonials
    .filter((t) => !filter.featured || t.data.featured)
    .sort((a, b) => a.data.order - b.data.order || a.id.localeCompare(b.id))
    .map(toTestimonial);
  return filter.limit ? ordered.slice(0, filter.limit) : ordered;
}

export async function getTestimonialByName(
  name: string,
): Promise<TestimonialData | undefined> {
  const wanted = name.toLowerCase();
  return (await getTestimonials()).find(
    (t) => t.name?.toLowerCase() === wanted,
  );
}
```

- [ ] **Step 5: `projects.ts`**

```ts
/**
 * Projects (src/content/projects/*.json) and the gallery
 * (src/content/gallery.json) → ProjectCardData / ProjectPage / GalleryEntry,
 * ordered like the Sanity queries: newest completed first; related projects
 * same-category first.
 */
import type {
  GalleryEntry,
  ProjectCardData,
  ProjectDetail,
  ProjectPage,
  SlugPath,
} from "@/lib/content/types";
import { sizedImage } from "@/lib/content/images";
import { categoryTitle } from "@/config/projects";
import { projectPath } from "@/lib/projects";
import { resolveCtaSection } from "./ctas";
import { loadContent, type Entry } from "./entries";
import { localImage, newestFirst } from "./shared";

type Project = Entry<"projects">;

/** Project cards have always been served at this width. */
const CARD_WIDTH = 900;
const byCompleted = newestFirst<Project>((p) => p.data.completed);

function toProjectCard(entry: Project): ProjectCardData {
  const d = entry.data;
  return {
    id: entry.id,
    title: d.title,
    href: projectPath(entry.id),
    category: d.category,
    categoryLabel: categoryTitle(d.category),
    location: d.location?.trim() ?? "",
    image: sizedImage(localImage(d.heroImage, d.imageAlt), CARD_WIDTH),
  };
}

function toProjectDetail(entry: Project): ProjectDetail {
  const d = entry.data;
  return {
    slug: entry.id,
    title: d.title,
    category: d.category,
    categoryLabel: categoryTitle(d.category),
    location: d.location?.trim() ?? "",
    service: d.service?.trim() ?? "",
    completed: d.completed ?? null,
    hero: localImage(d.heroImage, d.imageAlt),
    photos: d.photos.map((photo) => ({
      image: localImage(photo.src, photo.alt),
      label: photo.label ?? null,
    })),
    descriptionHtml: d.description?.html ?? "",
    descriptionText: d.description?.text ?? "",
    quote: d.quote ? { text: d.quote.text, name: d.quote.name ?? null } : null,
    seoDescription: d.seoDescription ?? null,
  };
}

export async function getProjects(): Promise<ProjectCardData[]> {
  const { projects } = await loadContent();
  return [...projects.values()].sort(byCompleted).map(toProjectCard);
}

export async function getFeaturedProjects(): Promise<ProjectCardData[]> {
  const { projects } = await loadContent();
  return [...projects.values()]
    .filter((p) => p.data.featured)
    .sort(byCompleted)
    .slice(0, 3)
    .map(toProjectCard);
}

export async function getProject(slug: string): Promise<ProjectPage | null> {
  const content = await loadContent();
  const entry = content.projects.get(slug);
  if (!entry) return null;
  const others = [...content.projects.values()]
    .filter((p) => p.id !== slug)
    .sort(byCompleted);
  const sameCategory = (p: Project) => p.data.category === entry.data.category;
  return {
    project: toProjectDetail(entry),
    relatedProjects: [
      ...others.filter(sameCategory),
      ...others.filter((p) => !sameCategory(p)),
    ]
      .slice(0, 3)
      .map(toProjectCard),
    ctaSection: resolveCtaSection(content, undefined),
  };
}

export async function getProjectStaticPaths(): Promise<SlugPath[]> {
  const { projects } = await loadContent();
  return [...projects.keys()].map((slug) => ({ params: { slug } }));
}

export async function getGallery(): Promise<GalleryEntry[]> {
  const { gallery, projects } = await loadContent();
  return [...gallery]
    .sort(newestFirst<Entry<"gallery">>((g) => g.data.added))
    .map((entry) => {
      const d = entry.data;
      return {
        id: entry.id,
        image: localImage(d.image, d.alt),
        caption: d.caption,
        category: d.category,
        categoryLabel: categoryTitle(d.category),
        location: d.location?.trim() ?? "",
        projectTitle: d.project
          ? (projects.get(d.project.id)?.data.title.trim() ?? "")
          : "",
      };
    });
}
```

- [ ] **Step 6: `case-studies.ts`**

```ts
/**
 * Case studies (src/content/case-studies/*.json) → CaseStudySummary /
 * CaseStudyPage / FeaturedCaseStudy, with the flexible `content` blocks
 * mapped to ContentBlock for CaseStudyBlockRenderer. Block bodies arrive as
 * HTML, rendered at content sync. Newest first by `date`; coming-soon
 * studies list but get no page.
 */
import type {
  CaseStudyDetail,
  CaseStudyPage,
  CaseStudySummary,
  ContentBlock,
  FeaturedCaseStudy,
  SlugPath,
} from "@/lib/content/types";
import { resolveCtaSection } from "./ctas";
import { loadContent, type Entry } from "./entries";
import { localImage, newestFirst, toSeo } from "./shared";

type Study = Entry<"caseStudies">;
type Block = Study["data"]["content"][number];

const byDate = newestFirst<Study>((s) => s.data.date);

function toCaseStudySummary(entry: Study): CaseStudySummary {
  const d = entry.data;
  return {
    slug: entry.id,
    title: d.title,
    description: d.description,
    client: d.client,
    categories: [...d.categories],
    industries: [...d.industries],
    image: localImage(d.image, d.imageAlt),
    date: d.date,
    featured: d.featured,
    comingSoon: d.comingSoon,
    liveUrl: d.liveUrl ?? null,
  };
}

/** A custom ratio wins; "auto" means uncropped; else the block default. */
function aspectRatio(
  block: { aspectRatio?: string; customAspectRatio?: string },
  fallback: string,
): string | undefined {
  if (block.customAspectRatio) return block.customAspectRatio;
  if (block.aspectRatio === "auto") return undefined;
  return block.aspectRatio ?? fallback;
}

function toBlock(block: Block): ContentBlock {
  const spacing = {
    sectionSpacing: block.sectionSpacing,
    sectionSpacingTop: block.sectionSpacingTop,
    sectionSpacingBottom: block.sectionSpacingBottom,
  };
  switch (block.type) {
    case "richText":
      return {
        type: "richText",
        html: block.body.html,
        maxWidth: block.maxWidth,
        ...spacing,
      };
    case "richTextLeft":
      return {
        type: "richTextLeft",
        html: block.body.html,
        maxWidth: block.maxWidth,
        ...spacing,
      };
    case "richTextColumns":
      return { type: "richTextColumns", html: block.body.html, ...spacing };
    case "richTextWithImage":
      return {
        type: "richTextWithImage",
        html: block.body.html,
        image: block.image,
        imageAlt: block.imageAlt,
        aspectRatio: aspectRatio(block, "landscape"),
        transparent: block.transparent ?? false,
        objectFit: block.objectFit,
        position: "center",
        ...spacing,
      };
    case "fullWidthImage":
      return {
        type: "fullWidthImage",
        image: block.image,
        imageAlt: block.imageAlt,
        aspectRatio: aspectRatio(block, "wide"),
        transparent: block.transparent ?? false,
        position: "center",
        ...spacing,
      };
    case "imageGrid":
      return {
        type: "imageGrid",
        images: block.images.map((img) => ({
          src: img.image,
          alt: img.alt,
          transparent: img.transparent ?? false,
          position: "center" as const,
        })),
        aspectRatio: aspectRatio(block, "landscape"),
        ...spacing,
      };
    case "stats":
      return { type: "stats", items: block.items, ...spacing };
  }
}

/**
 * The flexible body as Markdown for llms-full.txt — the Sanity mapper's walk:
 * text blocks as written, stats as a list, image-only blocks as alt text.
 */
function toMarkdown(blocks: Block[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    if ("body" in block) parts.push(block.body.markdown.trim());
    else if (block.type === "stats")
      parts.push(
        block.items.map((s) => `- **${s.value}** — ${s.label}`).join("\n"),
      );
    else if (block.type === "fullWidthImage")
      parts.push(`![${block.imageAlt}]`);
    else if (block.type === "imageGrid")
      parts.push(block.images.map((img) => `![${img.alt}]`).join("\n"));
  }
  return parts.join("\n\n");
}

function toCaseStudyDetail(entry: Study): CaseStudyDetail {
  const d = entry.data;
  return {
    ...toCaseStudySummary(entry),
    updatedAt: d.updated ?? null,
    timeline: d.timeline ?? null,
    gallery: d.galleryImages.map((img) => localImage(img.src, img.alt)),
    blocks: d.content.map(toBlock),
    markdown: toMarkdown(d.content),
    seo: toSeo(d.seo),
  };
}

const newest = (content: { caseStudies: Map<string, Study> }) =>
  [...content.caseStudies.values()].sort(byDate);

export async function getCaseStudies(): Promise<CaseStudySummary[]> {
  return newest(await loadContent()).map(toCaseStudySummary);
}

export async function getCaseStudy(
  slug: string,
): Promise<CaseStudyPage | null> {
  const content = await loadContent();
  const entry = content.caseStudies.get(slug);
  if (!entry) return null;
  return {
    study: toCaseStudyDetail(entry),
    upNext: newest(content)
      .filter((s) => s.id !== slug)
      .slice(0, 2)
      .map(toCaseStudySummary),
    ctaSection: resolveCtaSection(content, entry.data.ctaSection),
  };
}

export async function getFeaturedCaseStudies(
  slugs: readonly string[],
): Promise<FeaturedCaseStudy[]> {
  const { caseStudies } = await loadContent();
  return slugs.flatMap((slug) => {
    const entry = caseStudies.get(slug);
    if (!entry) return [];
    const d = entry.data;
    return [
      {
        slug,
        client: d.client,
        description: d.description,
        image: localImage(d.image, d.imageAlt),
      },
    ];
  });
}

export async function getCaseStudyStaticPaths(): Promise<SlugPath[]> {
  return newest(await loadContent())
    .filter((s) => !s.data.comingSoon)
    .map((s) => ({ params: { slug: s.id } }));
}

export async function getFullCaseStudies(): Promise<CaseStudyDetail[]> {
  return newest(await loadContent())
    .filter((s) => !s.data.comingSoon)
    .map(toCaseStudyDetail);
}
```

- [ ] **Step 7: `blog.ts`**

```ts
/**
 * Blog posts (src/content/blog/*.mdx) → BlogPostSummary / BlogPostPage /
 * BlogPostDetail. The body stays a compiled MDX component (BlogBody renders
 * it with the MDX components); the table of contents comes from its h2s,
 * read time and the llms-full.txt Markdown from the raw body
 * (./mdx-text.ts). Newest first by `date`.
 */
import { render } from "astro:content";
import type {
  BlogPostDetail,
  BlogPostPage,
  BlogPostSummary,
  CategoryPath,
  ContentImage,
  SlugPath,
} from "@/lib/content/types";
import { categoryToSlug } from "@/lib/blog-categories";
import { estimateReadTime } from "@/lib/read-time";
import { resolveBlogCta, resolveCtaSection } from "./ctas";
import { loadContent, need, type Content, type Entry } from "./entries";
import { mdxToMarkdown, mdxWords } from "./mdx-text";
import { localImage, newestFirst, toSeo } from "./shared";

type Post = Entry<"blog">;

const byDate = newestFirst<Post>((p) => p.data.date);
const newest = (content: Content) => [...content.blog.values()].sort(byDate);

function byline(
  content: Content,
  post: Post,
): { name: string; avatar: ContentImage | null } {
  const author = need(content.authors, "authors", post.data.author.id).data;
  return {
    name: author.name,
    avatar: author.avatar
      ? localImage(author.avatar, author.avatarAlt ?? author.name)
      : null,
  };
}

function toSummary(content: Content, post: Post): BlogPostSummary {
  const d = post.data;
  const author = byline(content, post);
  return {
    slug: post.id,
    title: d.title,
    description: d.description,
    categories: [...d.categories],
    primaryCategory: d.primaryCategory ?? null,
    image: localImage(d.image, d.imageAlt),
    author: author.name,
    authorAvatar: author.avatar,
    date: d.date,
    featured: d.featured,
  };
}

async function toDetail(content: Content, post: Post): Promise<BlogPostDetail> {
  const d = post.data;
  const author = byline(content, post);
  const { Content: Body, headings } = await render(post);
  const raw = post.body ?? "";
  return {
    slug: post.id,
    title: d.title,
    description: d.description,
    categories: [...d.categories],
    image: localImage(d.image, d.imageAlt),
    author: author.name,
    authorAvatar: author.avatar,
    date: d.date,
    updatedAt: d.updated ?? null,
    featured: d.featured,
    video: d.video ?? null,
    body: { kind: "mdx", Content: Body },
    headings: headings
      .filter((h) => h.depth === 2)
      .map(({ slug, text }) => ({ slug, text })),
    readTime: estimateReadTime(mdxWords(raw)),
    faqs: d.faqs.map((faq) => ({
      question: faq.question,
      answerHtml: faq.answer.html,
      answerText: faq.answer.text,
    })),
    markdown: mdxToMarkdown(raw),
    seo: toSeo(d.seo),
  };
}

export async function getBlogPosts(): Promise<BlogPostSummary[]> {
  const content = await loadContent();
  return newest(content).map((post) => toSummary(content, post));
}

export async function getBlogPost(slug: string): Promise<BlogPostPage | null> {
  const content = await loadContent();
  const post = content.blog.get(slug);
  if (!post) return null;
  const manual = post.data.relatedPosts.map((ref) =>
    need(content.blog, "blog", ref.id),
  );
  const excluded = new Set([slug, ...manual.map((p) => p.id)]);
  const shared = new Set(post.data.categories.map((c) => c.toLowerCase()));
  const related = newest(content)
    .filter(
      (p) =>
        !excluded.has(p.id) &&
        p.data.categories.some((c) => shared.has(c.toLowerCase())),
    )
    .slice(0, 6);
  return {
    post: await toDetail(content, post),
    relatedPosts: related.map((p) => toSummary(content, p)),
    manualRelatedPosts: manual.map((p) => toSummary(content, p)),
    cta: resolveBlogCta(content, post.data.cta),
    ctaSection: resolveCtaSection(content, post.data.ctaSection),
  };
}

export async function getBlogPostStaticPaths(): Promise<SlugPath[]> {
  const { blog } = await loadContent();
  return [...blog.keys()].map((slug) => ({ params: { slug } }));
}

export async function getBlogPostsByCategory(
  category: string,
): Promise<BlogPostSummary[]> {
  const content = await loadContent();
  return newest(content)
    .filter((post) => (post.data.categories as string[]).includes(category))
    .map((post) => toSummary(content, post));
}

/** Every category in use, in the order the newest posts use them. */
export async function getBlogCategories(): Promise<string[]> {
  const content = await loadContent();
  return [...new Set(newest(content).flatMap((post) => post.data.categories))];
}

/** "all" plus one path per category in use (slug from categoryToSlug). */
export async function getBlogCategoryStaticPaths(): Promise<CategoryPath[]> {
  const seen = new Set<string>();
  const paths: CategoryPath[] = [
    { params: { category: "all" }, props: { categoryName: "All" } },
  ];
  for (const name of await getBlogCategories()) {
    const slug = categoryToSlug(name);
    if (slug === "all" || seen.has(slug)) continue;
    seen.add(slug);
    paths.push({ params: { category: slug }, props: { categoryName: name } });
  }
  return paths;
}

export async function getFullBlogPosts(): Promise<BlogPostDetail[]> {
  const content = await loadContent();
  return Promise.all(newest(content).map((post) => toDetail(content, post)));
}
```

- [ ] **Step 8: `index.ts`, the backend**

```ts
/**
 * The Files implementation of the content interface (src/lib/content):
 * Astro content collections in src/content (schemas, image and reference
 * checks in src/content.config.ts). src/lib/content/source.ts selects it;
 * nothing else imports this file (npm run check:boundary).
 *
 *   entries.ts        — loads every collection, indexed by id
 *   shared.ts         — localImage(), toSeo(), newestFirst()
 *   ctas.ts           — CTAs and the site defaults (settings.json)
 *   testimonials.ts, projects.ts (with the gallery), case-studies.ts,
 *   blog.ts           — collection entries → view models
 *   mdx-text.ts       — read time, llms Markdown and inline-CTA ids from a raw MDX body
 *
 * There are no drafts here: every function ignores the trailing `opts`
 * the interface allows (only the Sanity source's /preview twins pass it),
 * and plainText() returns its input unchanged.
 */
import type { ContentSource } from "@/lib/content/types";
import {
  getBlogCategories,
  getBlogCategoryStaticPaths,
  getBlogPost,
  getBlogPostStaticPaths,
  getBlogPosts,
  getBlogPostsByCategory,
  getFullBlogPosts,
} from "./blog";
import {
  getCaseStudies,
  getCaseStudy,
  getCaseStudyStaticPaths,
  getFeaturedCaseStudies,
  getFullCaseStudies,
} from "./case-studies";
import { getCtaDefaults } from "./ctas";
import {
  getFeaturedProjects,
  getGallery,
  getProject,
  getProjectStaticPaths,
  getProjects,
} from "./projects";
import { getTestimonialByName, getTestimonials } from "./testimonials";

function plainText<T extends string | null | undefined>(value: T): T {
  return value;
}

/* `satisfies` fails `npm run check` when a ContentSource function is
   missing here or its signature drifts. */
const filesSource = {
  plainText,
  getCtaDefaults,
  getTestimonials,
  getTestimonialByName,
  getProjects,
  getFeaturedProjects,
  getProject,
  getGallery,
  getProjectStaticPaths,
  getCaseStudies,
  getCaseStudy,
  getFeaturedCaseStudies,
  getCaseStudyStaticPaths,
  getBlogPost,
  getBlogPostStaticPaths,
  getBlogPosts,
  getBlogPostsByCategory,
  getBlogCategories,
  getBlogCategoryStaticPaths,
  getFullBlogPosts,
  getFullCaseStudies,
} satisfies ContentSource;

export default filesSource;
```

- [ ] **Step 9: Keep the backend behind the interface (boundary rule)**

In `scripts/check-content-boundary.mjs`, append to `RESTRICTED`:

```js
  {
    target: "src/lib/content/files",
    allow: ["src/lib/content/"],
    why: "the Files backend is reached through @/lib/content (source.ts selects it)",
  },
```

- [ ] **Step 10: The built-site check, `scripts/check-content-build.mjs`**

```js
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
const widthOf = async (src) =>
  (await sharp(path.join(DIST, decodeURIComponent(src))).metadata()).width;
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
  const url = new RegExp(`/case-studies/${slug}(?=[<\\s]|$)`);
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
      const width = src ? await widthOf(src) : undefined;
      if (!width || width > 128)
        fail(
          `blog post ${slug}: the author photo is ${width ?? "missing"}px wide, not resized`,
        );
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
    const width = await widthOf(tile.getAttribute("data-lightbox-src"));
    if (!width || width > 1600)
      fail(`project ${slug}: a lightbox photo is ${width}px wide, not resized`);
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
```

In `package.json` `scripts`, add after `check:content`:
`"check:content-build": "node scripts/check-content-build.mjs"`.

- [ ] **Step 11: Build Files mode and run the built-site check**

```bash
KEEP_DEV_PAGES=1 CONTENT_SOURCE=files npm run build
npm run check:content-build
```

Expected: the build completes, and
`check-content-build: ok (3 posts, 3 case studies, 3 projects)`.
Spot-check `dist/client/blog/accessibility-guide/index.html` by eye. The
TOC lists "Start with the keyboard", "Write real alt text", "Check contrast
early" and "Test with a screen reader". Its `og:image` content starts
`https://www.example.com/_astro/` and ends `.jpg`. Also check that
`dist/client/case-studies/greenleaf-organics-seo/` does not exist.

- [ ] **Step 12: Capture the Files baseline, and confirm Sanity output is untouched**

```bash
rm -rf .parity/files && cp -R dist/client .parity/files
npm run check && npm run check:hover && npm run check:boundary && npm run check:content
KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity npm run build && node scripts/compare-dist.mjs .parity/empty dist/client
KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity PARITY_FIXTURES=1 npm run build && node scripts/compare-dist.mjs .parity/fixtures dist/client
```

Expected: all checks pass, then `Identical` twice.

- [ ] **Step 13: Commit**

```bash
git add src/lib/content/files scripts/check-content-text.mjs scripts/check-content-build.mjs scripts/check-content-boundary.mjs package.json
git commit -m "$(cat <<'EOF'
Add the Files content source

src/lib/content/files implements every ContentSource function from the
content collections (declared satisfies ContentSource), ordering and
relating content as the Sanity queries do. check:content-build checks a
built site: coming-soon studies stay unpublished, OG and JSON-LD images
are absolute, local images are served resized, FAQ JSON-LD follows the
FAQs, and every TOC anchor resolves.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: MDX body components and `BlogBody`

MDX posts get `<Callout>`, `<VideoEmbed>` and `<BlogCta id>` with no
imports, and fenced code renders in the same `figure.code_block_wrap` as
Portable Text code. `Callout` and `VideoEmbed` become shared components,
and the Portable Text renderers become thin wrappers around them, so both
sources emit the same markup by construction. An unknown inline CTA id
fails content sync.

**Files:**

- Create: `src/components/blog/Callout.astro`,
  `src/components/blog/VideoEmbed.astro`,
  `src/components/blog/mdx/CodeBlock.astro`,
  `src/components/blog/mdx/BlogCta.astro`
- Modify: `src/components/portabletext/Callout.astro`,
  `src/components/portabletext/VideoEmbed.astro` (become wrappers)
- Modify: `src/components/blog/BlogBody.astro` (the MDX component map)
- Modify: `src/lib/content/checks.ts` (`bodyCtas`), `src/content.config.ts`
  (pass it), `scripts/check-content-validation.mjs` (a new case),
  `scripts/check-content-boundary.mjs` (allow `src/components/blog/mdx/`)
- Modify: the three sample posts (add the components)

**Interfaces:**

- Consumes: `getBlogCtaById` (`src/lib/content/files/ctas.ts`),
  `inlineCtaIds` (`src/lib/content/files/mdx-text.ts`), `CALLOUT_TYPE_OPTIONS`
  and `CalloutType` (`src/config/blog.ts`), `BlogCta.astro` (takes
  `cta: BlogCtaData`).
- Produces:
  - `<Callout type?: CalloutType>` with a slot, and
    `<VideoEmbed url: string caption?: string | null />`, both in
    `src/components/blog/`.
  - BlogBody's MDX map: `{ Callout, VideoEmbed, BlogCta, pre }`.
  - `CheckOptions.bodyCtas?: RefTarget`.

- [ ] **Step 1: Write the failing check for inline CTA ids**

Append to `CASES` in `scripts/check-content-validation.mjs`:

```js
  {
    name: "dangling inline CTA",
    apply: () =>
      write(POST_FILE, post({}, '## Check\n\n<BlogCta id="zz-no-cta" />\n')),
    expect: [POST_FILE, "body", "zz-no-cta"],
  },
```

Run: `npm run check:content`
Expected: `FAIL  dangling inline CTA: astro sync passed`.

- [ ] **Step 2: Check inline CTA ids at sync**

In `src/lib/content/checks.ts`, add the import
`import { inlineCtaIds } from "./files/mdx-text";` (pure, safe at sync).
Extend `CheckOptions`:

```ts
  /** Check `<BlogCta id="…" />` tags in an MDX body against this folder. */
  bodyCtas?: RefTarget;
```

Inside the entry loop, after the `refs` loop, add:

```ts
if (options.bodyCtas) {
  for (const id of inlineCtaIds(entry.body ?? "")) {
    if (!targetExists(root, options.bodyCtas, id))
      problems.push(
        `${file} → body: <BlogCta id="${id}"> names no entry (expected ${options.bodyCtas.dir}/${id}.${options.bodyCtas.ext})`,
      );
  }
}
```

Add a bullet to the header comment: ` * - Inline CTAs. An MDX body's <BlogCta id="…" /> must name a file in src/content/ctas/blog/.`

In `src/content.config.ts`, give the blog loader's options
`bodyCtas: json(DIR.blogCtas),` next to `refs`.

Run: `npm run check:content`
Expected: all 13 cases `ok`.

- [ ] **Step 3: Shared `src/components/blog/Callout.astro`**

Move the markup of `portabletext/Callout.astro` here, with the body as a
slot. The `<aside>` keeps exactly the classes and attributes it had.

```astro
---
/**
 * Callout — a tip, warning or info aside in a blog post body. One component
 * for both content sources: an MDX post writes
 * `<Callout type="warning">…</Callout>` (BlogBody passes it in, so no
 * import), and a Portable Text `callout` node renders through
 * src/components/portabletext/Callout.astro, which slots its body in here.
 * Styles: src/styles/pages/blog-post.css (`callout_*`).
 */
import type { HTMLAttributes } from "astro/types";
import { CALLOUT_TYPE_OPTIONS, type CalloutType } from "@/config/blog";

interface Props extends HTMLAttributes<"aside"> {
  /**
   * **Callout** — a highlighted aside in a post body. `type` picks the
   * style and icon (tip, warning, info); the content goes in the slot. In
   * MDX, put the opening and closing tags on their own lines with the text
   * between them.
   *
   * @example
   * <Callout type="warning">Measure twice before you order tile.</Callout>
   */
  docs?: string;

  /** Set to `false` to skip rendering. @default true */
  render?: boolean;

  /** The style and icon. @default "tip" @example type="warning" */
  type?: CalloutType;

  /** Extra classes on the aside. */
  class?: string;
}

const {
  docs,
  render = true,
  type: typeProp = "tip",
  class: className,
  ...rest
} = Astro.props;

const known = CALLOUT_TYPE_OPTIONS.some((option) => option.value === typeProp);
const type: CalloutType = known ? typeProp : "tip";
if (import.meta.env.DEV && render && !known)
  console.warn(
    `[Callout] Unknown type "${typeProp}" — use "tip", "warning" or "info". Rendering "tip".`,
  );
---

{
  render && (
    <aside
      class:list={["callout_wrap", `is-${type}`, className]}
      role="note"
      {...rest}
    >
      <span class="callout_icon" aria-hidden="true">
        {type === "tip" && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M9 18h6" />
            <path d="M10 22h4" />
            <path d="M12 2a7 7 0 0 0-4 12.7c.5.4.8 1 .8 1.6V18h6.4v-1.7c0-.6.3-1.2.8-1.6A7 7 0 0 0 12 2Z" />
          </svg>
        )}
        {type === "warning" && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 3 2 20h20L12 3Z" />
            <line x1="12" y1="10" x2="12" y2="14" />
            <line x1="12" y1="17.5" x2="12" y2="18" />
          </svg>
        )}
        {type === "info" && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="11" x2="12" y2="16.5" />
            <circle cx="12" cy="7.75" r="0.5" fill="currentColor" />
          </svg>
        )}
      </span>
      <div class="callout_content">
        <slot />
      </div>
    </aside>
  )
}
```

Replace `src/components/portabletext/Callout.astro` with the wrapper:

```astro
---
/**
 * Callout — Portable Text custom type component. Renders the shared
 * src/components/blog/Callout.astro with the node's body (normal
 * paragraphs only) in its slot.
 *
 * Node shape:
 *   { _type: "callout", type: "tip" | "warning" | "info", body: PortableText[] }
 */
import type { Props as PortableTextProps } from "astro-portabletext/types";
import { PortableText } from "astro-portabletext";
import Callout from "@/components/blog/Callout.astro";
import type { CalloutType } from "@/config/blog";

interface CalloutNode {
  _type: "callout";
  type?: CalloutType;
  body?: any[];
}

type Props = PortableTextProps<CalloutNode>;

const { node } = Astro.props;

const { default: LinkMark } = await import("./LinkMark.astro");
const { default: InternalLinkMark } = await import("./InternalLinkMark.astro");

const innerComponents = {
  mark: {
    link: LinkMark,
    internalLink: InternalLinkMark,
  },
};
---

<Callout type={node.type || "tip"}>
  {node.body && <PortableText value={node.body} components={innerComponents} />}
</Callout>
```

- [ ] **Step 4: Shared `src/components/blog/VideoEmbed.astro`**

```astro
---
/**
 * VideoEmbed — a responsive YouTube or Vimeo iframe with an optional
 * caption, in a blog post body. One component for both content sources: an
 * MDX post writes `<VideoEmbed url="…" caption="…" />` (BlogBody passes it
 * in), and a Portable Text `videoEmbed` node renders through
 * src/components/portabletext/VideoEmbed.astro. Styles: `video-embed_*`.
 */
import type { HTMLAttributes } from "astro/types";
import { plainText } from "@/lib/content";

interface Props extends HTMLAttributes<"figure"> {
  /**
   * **VideoEmbed** — a YouTube (watch, youtu.be, Shorts) or Vimeo page URL
   * as a lazy, responsive iframe. `caption` shows under it and titles the
   * iframe. Any other URL renders nothing (and warns in dev).
   *
   * @example
   * <VideoEmbed url="https://www.youtube.com/watch?v=aqz-KE-bpKQ" caption="A sample video" />
   */
  docs?: string;

  /** Set to `false` to skip rendering. @default true */
  render?: boolean;

  /** The video's page URL. @example url="https://vimeo.com/76979871" */
  url: string;

  /** Shown under the video; also the iframe's title. @example caption="How we plan a remodel" */
  caption?: string | null;

  /** Extra classes on the figure. */
  class?: string;
}

const {
  docs,
  render = true,
  url,
  caption,
  class: className,
  ...rest
} = Astro.props;

/** The embeddable player URL for a YouTube or Vimeo page, else null. */
function getEmbedUrl(pageUrl: string): string | null {
  try {
    const u = new URL(pageUrl);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (u.pathname.startsWith("/shorts/")) {
        return `https://www.youtube.com/embed/${u.pathname.split("/")[2]}`;
      }
    }
    if (host === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    if (host === "player.vimeo.com") return pageUrl;
  } catch {
    return null;
  }
  return null;
}

const embedUrl = url ? getEmbedUrl(url) : null;
if (import.meta.env.DEV && render && !embedUrl)
  console.warn(
    `[VideoEmbed] "${url}" is not a YouTube or Vimeo URL; nothing renders.`,
  );
---

{
  render && embedUrl && (
    <figure class:list={["video-embed_wrap", className]} {...rest}>
      <div class="video-embed_frame">
        <iframe
          src={embedUrl}
          title={plainText(caption) || "Video"}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        />
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}
```

Replace `src/components/portabletext/VideoEmbed.astro` with:

```astro
---
/**
 * Video Embed — Portable Text custom type component. Renders the shared
 * src/components/blog/VideoEmbed.astro.
 *
 * Node shape: { _type: "videoEmbed", url: string, caption?: string }
 */
import type { Props as PortableTextProps } from "astro-portabletext/types";
import VideoEmbed from "@/components/blog/VideoEmbed.astro";

interface VideoEmbedNode {
  _type: "videoEmbed";
  url: string;
  caption?: string;
}

type Props = PortableTextProps<VideoEmbedNode>;

const { node } = Astro.props;
---

<VideoEmbed url={node.url} caption={node.caption} />
```

- [ ] **Step 5: Prove the Portable Text output did not change**

```bash
KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity PARITY_FIXTURES=1 npm run build && node scripts/compare-dist.mjs .parity/fixtures dist/client
```

Expected: `Identical: <n> files.`. If the only differences are whitespace
text nodes inside `.callout_content`, confirm with
`node scripts/compare-dist.mjs --canonical .parity/fixtures dist/client`.
Expected `Identical`. Whitespace between a block container and its first
or last block child does not render. Then re-baseline `.parity/fixtures`
from this build and record the reason in the commit message. Any other
difference is a bug in Step 3 or 4: fix it, don't re-baseline.

- [ ] **Step 6: The MDX-only components**

`src/components/blog/mdx/CodeBlock.astro`:

```astro
---
/**
 * MDX `pre` override — wraps each highlighted code block in an MDX post in
 * the same `figure.code_block_wrap` the Portable Text CodeBlock renders, so
 * blog-post.css styles both alike. BlogBody passes it as `components.pre`;
 * authors never name it. Highlighting happens at build time
 * (`markdown.shikiConfig` in astro.config.mjs). The markup stays on one
 * line: whitespace inside a pre is visible.
 */
import type { HTMLAttributes } from "astro/types";

interface Props extends HTMLAttributes<"pre"> {
  /**
   * **MDX code block** — the `pre` of a fenced code block in an MDX post,
   * wrapped in `figure.code_block_wrap`. Supplied by BlogBody; Shiki's
   * `class`, `style`, `tabindex` and `data-language` pass through.
   */
  docs?: string;
}

const { docs, ...rest } = Astro.props;
---

<figure class="code_block_wrap"><pre {...rest}><slot /></pre></figure>
```

`src/components/blog/mdx/BlogCta.astro`:

```astro
---
/**
 * MDX `<BlogCta id="…" />` — an inline blog CTA
 * (src/content/ctas/blog/<id>.json) in a post body. BlogBody maps the
 * `BlogCta` tag to this file, so authors write no import. Content sync
 * checks the id (src/lib/content/checks.ts), so an unknown id fails the
 * build before this renders. Files mode only: a Portable Text body uses
 * src/components/portabletext/BlogCtaInline.astro.
 */
import BlogCtaPanel from "@/components/blog/BlogCta.astro";
import { getBlogCtaById } from "@/lib/content/files/ctas";

interface Props {
  /**
   * **BlogCta (MDX)** — an inline call to action in an MDX post. `id` is
   * the CTA file's name in src/content/ctas/blog/, without `.json`.
   *
   * @example
   * <BlogCta id="free-site-review" />
   */
  docs?: string;

  /** Set to `false` to skip rendering. @default true */
  render?: boolean;

  /** The CTA file's name without `.json`. @example id="free-site-review" */
  id: string;
}

const { docs, render = true, id } = Astro.props;
const cta = render ? await getBlogCtaById(id) : null;
---

{cta && <BlogCtaPanel cta={cta} />}
```

In `scripts/check-content-boundary.mjs`, extend the Files-backend rule's
`allow` to `["src/lib/content/", "src/components/blog/mdx/"]`. Change its
`why` to:
`"the Files backend is reached through @/lib/content; only the MDX body components (src/components/blog/mdx/) read it directly"`.

- [ ] **Step 7: Pass the components to MDX in `BlogBody.astro`**

Add the static imports below the `PortableText` import:

```ts
import Callout from "@/components/blog/Callout.astro";
import VideoEmbed from "@/components/blog/VideoEmbed.astro";
import MdxBlogCta from "@/components/blog/mdx/BlogCta.astro";
import MdxCodeBlock from "@/components/blog/mdx/CodeBlock.astro";
```

Replace the header bullet for `mdx` with:

```
 * - `mdx` — a compiled MDX `Content` component (files-backed content),
 *   rendered with `mdxComponents` below, so a post body can use
 *   `<Callout>`, `<VideoEmbed>` and `<BlogCta id>` without importing them.
 *   Fenced code is wrapped like the Portable Text code block.
```

After `portableTextComponents`, add:

```ts
/* The components an MDX body may use by tag name, without an import, and
   the `pre` override every fenced code block renders through. Keep the
   list in step with the content guide (.claude/skills/content-files). */
const mdxComponents = {
  Callout,
  VideoEmbed,
  BlogCta: MdxBlogCta,
  pre: MdxCodeBlock,
};
```

Change `Content && <Content />` to
`Content && <Content components={mdxComponents} />`.

- [ ] **Step 8: Use the components in the sample posts**

`src/content/blog/accessibility-guide.mdx`: after the closing fence of the
`html` code block, insert a blank line and:

```mdx
<Callout type="tip">
  Put the skip link first in the page, and make it visible when it receives
  focus.
</Callout>
```

After the "Check contrast early" paragraph, insert a blank line and
`<BlogCta id="accessibility-checklist" />`.

`src/content/blog/customer-focused-messaging.mdx`: after the numbered list
under "Make the next step obvious", insert a blank line and
`<VideoEmbed url="https://www.youtube.com/watch?v=aqz-KE-bpKQ" caption="A sample video embed" />`.
After the "Cut the jargon" paragraph, insert a blank line and:

```mdx
<Callout type="warning">
  Avoid stacking three calls to action in one section. When everything is a
  priority, nothing is.
</Callout>
```

`src/content/blog/industry-trends.mdx`: after the intro paragraph, insert
a blank line and:

```mdx
<Callout type="info">
  We review these trends every January. Subscribe to the blog to get the next
  edition.
</Callout>
```

- [ ] **Step 9: Build Files mode and look at the result**

```bash
KEEP_DEV_PAGES=1 CONTENT_SOURCE=files npm run build
npm run check:content-build
grep -c 'class="callout_wrap is-tip"' dist/client/blog/accessibility-guide/index.html
grep -c 'class="code_block_wrap"' dist/client/blog/accessibility-guide/index.html
grep -c 'class="blog-cta_wrap' dist/client/blog/accessibility-guide/index.html
grep -c 'class="video-embed_wrap"' dist/client/blog/customer-focused-messaging/index.html
node scripts/compare-dist.mjs .parity/files dist/client
```

Expected: `check-content-build: ok`. The four greps print `1`, `1`, `2`
(the inline CTA plus the end-of-post one) and `1`. The comparison lists
`DIFF` for exactly the three blog posts and `llms-full.txt`, which now
carries the callout text and the video link. Read each diff, then
re-baseline: `rm -rf .parity/files && cp -R dist/client .parity/files`.

- [ ] **Step 10: Gate**

```bash
npm run check && npm run check:hover && npm run check:boundary && npm run check:content
KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity npm run build && node scripts/compare-dist.mjs .parity/empty dist/client
KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity PARITY_FIXTURES=1 npm run build && node scripts/compare-dist.mjs .parity/fixtures dist/client
```

Expected: all pass, and `Identical` twice (or as accepted in Step 5).
The `/components` demo for `Callout` and `VideoEmbed` is added in Task 8,
where `/components` is re-baselined anyway.

- [ ] **Step 11: Commit**

```bash
git add src/components/blog src/components/portabletext/Callout.astro src/components/portabletext/VideoEmbed.astro src/lib/content/checks.ts src/content.config.ts src/content/blog scripts/check-content-validation.mjs scripts/check-content-boundary.mjs
git commit -m "$(cat <<'EOF'
Render MDX bodies with Callout, VideoEmbed, BlogCta and code figures

BlogBody passes the MDX components by tag name, so posts need no imports;
fenced code renders in the Portable Text code-block figure. Callout and
VideoEmbed are shared components both sources render through. Content
sync fails on an inline <BlogCta id> that names no CTA.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Files ≡ Sanity — derived fixtures and `compare-dist --equivalent`

Prove the spec's "both modes render identical markup for identical
content". A new `PARITY_FIXTURES=sample` mode builds the Sanity source from
documents derived at build time from the same `src/content` files.
`compare-dist --equivalent` then diffs that build against the Files build,
normalising only the differences listed in "Expected Files-vs-Sanity
differences".

**Files:**

- Create: `src/sanity/lib/fixtures/markdown-to-pt.ts`,
  `src/sanity/lib/fixtures/sample.ts`, `scripts/check-fixture-markdown.mjs`
- Modify: `src/sanity/lib/fixtures/data.ts` (export `FixtureDocs`),
  `src/sanity/lib/fixtures/index.ts` (the `sample` mode),
  `scripts/compare-dist.mjs` (`--equivalent`)

**Interfaces:**

- Consumes: the content collections (`getCollection`), `resolveFixture()`
  and the GROQ projections the fixtures already mirror.
- Produces:
  - `markdownToPortableText(markdown: string, ctx: PtContext): Doc[]`,
    with `interface PtContext { keyPrefix: string; image?: (src: string) => Doc; cta?: (id: string) => Doc }`.
  - `loadSampleDocs(): Promise<FixtureDocs>`.
  - `export interface FixtureDocs` in `data.ts`.
  - Build env `PARITY_FIXTURES=sample`.
  - `node scripts/compare-dist.mjs --equivalent <sanity-dir> <files-dir>`.

- [ ] **Step 1: Write the failing converter test**

Create `scripts/check-fixture-markdown.mjs`:

````js
#!/usr/bin/env node
/**
 * check-fixture-markdown — unit checks for the Markdown → Portable Text
 * converter behind the "sample" parity fixtures
 * (src/sanity/lib/fixtures/markdown-to-pt.ts). Plain Node:
 *   node scripts/check-fixture-markdown.mjs
 */
import assert from "node:assert/strict";
import { markdownToPortableText } from "../src/sanity/lib/fixtures/markdown-to-pt.ts";

const blocks = markdownToPortableText(
  [
    "## Getting started",
    "",
    "Read [the **bold** guide](https://example.com).",
    "",
    "- one",
    "  - nested",
    "1. step",
    "",
    "```html",
    "<a></a>",
    "```",
    "",
    '<Callout type="tip">',
    "Mind the gap.",
    "</Callout>",
    "",
    '<VideoEmbed url="https://youtu.be/x" caption="Demo" />',
    "",
    '<BlogCta id="cta-1" />',
    "",
    "![Alt text](./images/a.webp)",
    "",
    "> Quoted",
  ].join("\n"),
  {
    keyPrefix: "t-",
    image: (src) => ({ asset: { _ref: `ref:${src}` } }),
    cta: (id) => ({ _id: id }),
  },
);

assert.deepEqual(
  blocks.map((b) => [
    b._type,
    b._type === "block" ? (b.listItem ?? b.style) : null,
  ]),
  [
    ["block", "h2"],
    ["block", "normal"],
    ["block", "bullet"],
    ["block", "bullet"],
    ["block", "number"],
    ["code", null],
    ["callout", null],
    ["videoEmbed", null],
    ["blogCtaInline", null],
    ["image", null],
    ["block", "blockquote"],
  ],
);
// A link whose text has a bold word: one markDef, the bold span carries both marks.
const para = blocks[1];
const link = para.markDefs[0];
assert.deepEqual(link, {
  _type: "link",
  _key: link._key,
  href: "https://example.com",
});
assert.deepEqual(
  para.children.map((s) => [s.text, s.marks]),
  [
    ["Read ", []],
    ["the ", [link._key]],
    ["bold", [link._key, "strong"]],
    [" guide", [link._key]],
    [".", []],
  ],
);
assert.deepEqual(
  blocks.slice(2, 5).map((b) => b.level),
  [1, 2, 1],
);
assert.deepEqual([blocks[5].code, blocks[5].language], ["<a></a>", "html"]);
assert.equal(blocks[6].type, "tip");
assert.equal(blocks[6].body[0].children[0].text, "Mind the gap.");
assert.deepEqual(
  [blocks[7].url, blocks[7].caption],
  ["https://youtu.be/x", "Demo"],
);
assert.equal(blocks[8].cta._id, "cta-1");
assert.deepEqual(
  [blocks[9].asset._ref, blocks[9].alt],
  ["ref:./images/a.webp", "Alt text"],
);
// Every key is unique and deterministic.
const keys = blocks.map((b) => b._key);
assert.equal(new Set(keys).size, keys.length);
// Anything outside the supported subset throws instead of diverging silently.
assert.throws(
  () => markdownToPortableText("| a | b |", { keyPrefix: "x-" }),
  /Unsupported/,
);
assert.throws(
  () => markdownToPortableText("<Gallery />", { keyPrefix: "x-" }),
  /Unsupported/,
);

console.log("check-fixture-markdown: ok");
````

Run: `node scripts/check-fixture-markdown.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 2: `src/sanity/lib/fixtures/markdown-to-pt.ts`**

````ts
/**
 * Markdown → Portable Text, for the "sample" parity fixtures (./sample.ts)
 * ONLY. It converts exactly the Markdown and MDX subset the starter's
 * sample content uses, and throws on anything else, so new sample content
 * cannot make the two sources silently describe different things:
 *
 * - blocks: paragraphs (soft-wrapped lines joined by a space), ## to ####
 *   headings, > quotes, - and 1. list items (two spaces of indent per
 *   level), fenced code, a lone ![alt](./path) image line;
 * - MDX: <Callout type>…</Callout>, <VideoEmbed url caption />,
 *   <BlogCta id /> — each tag on its own line;
 * - inline: **bold**, *em* / _em_, `code`, [text](href) (marks may nest).
 *
 * Keys are `${keyPrefix}${n}`, deterministic, because the parity diff
 * compares builds byte for byte.
 */

type Doc = Record<string, any>;

export interface PtContext {
  /** Prefix for every `_key` in this document — unique per field. */
  keyPrefix: string;
  /** A body image path ("./images/x.webp") → a projected Sanity image. */
  image?: (src: string) => Doc;
  /** A blog CTA id → its dereferenced projection (BLOG_CTA_PROJECTION). */
  cta?: (id: string) => Doc;
}

const unsupported = (what: string) =>
  new Error(
    `[sample fixtures] Unsupported Markdown: ${what}. Extend src/sanity/lib/fixtures/markdown-to-pt.ts, or keep the sample content inside its subset.`,
  );

const attr = (attrs: string, name: string) =>
  new RegExp(`\\b${name}="([^"]*)"`).exec(attrs)?.[1];

/** The start of any block other than a paragraph. */
const BLOCK_START =
  /^(?:```|<\/?[A-Z]|!\[|#{1,6}\s|>|\s*(?:[-*]|\d+\.)\s|\s*\|)/;

export function markdownToPortableText(
  markdown: string,
  ctx: PtContext,
): Doc[] {
  let n = 0;
  const key = () => `${ctx.keyPrefix}${++n}`;
  const textBlock = (text: string, extra: Doc = {}): Doc => {
    const markDefs: Doc[] = [];
    const children = inline(text, [], markDefs, key);
    return {
      _type: "block",
      _key: key(),
      style: "normal",
      markDefs,
      children,
      ...extra,
    };
  };

  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out: Doc[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    let m: RegExpExecArray | null;

    if ((m = /^```(\S*)\s*$/.exec(line))) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i]))
        code.push(lines[i++]);
      if (i >= lines.length) throw unsupported("an unclosed code fence");
      i++;
      out.push({
        _type: "code",
        _key: key(),
        code: code.join("\n"),
        language: m[1] || "plaintext",
      });
      continue;
    }
    if ((m = /^<Callout\b([^>]*)>\s*$/.exec(line))) {
      const inner: string[] = [];
      i++;
      while (i < lines.length && !/^<\/Callout>\s*$/.test(lines[i]))
        inner.push(lines[i++]);
      if (i >= lines.length) throw unsupported("an unclosed <Callout>");
      i++;
      const calloutKey = key();
      out.push({
        _type: "callout",
        _key: calloutKey,
        type: attr(m[1], "type") ?? "tip",
        body: markdownToPortableText(inner.join("\n"), {
          ...ctx,
          keyPrefix: `${calloutKey}-`,
        }),
      });
      continue;
    }
    if ((m = /^<VideoEmbed\b([^>]*)\/>\s*$/.exec(line))) {
      out.push({
        _type: "videoEmbed",
        _key: key(),
        url: attr(m[1], "url") ?? "",
        caption: attr(m[1], "caption") ?? null,
      });
      i++;
      continue;
    }
    if ((m = /^<BlogCta\b([^>]*)\/>\s*$/.exec(line))) {
      const id = attr(m[1], "id");
      if (!ctx.cta || !id) throw unsupported(`"${line}" here`);
      out.push({ _type: "blogCtaInline", _key: key(), cta: ctx.cta(id) });
      i++;
      continue;
    }
    if ((m = /^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/.exec(line))) {
      if (!ctx.image) throw unsupported(`an image here ("${line}")`);
      out.push({ _type: "image", _key: key(), ...ctx.image(m[2]), alt: m[1] });
      i++;
      continue;
    }
    if ((m = /^(#{2,4})\s+(.*)$/.exec(line))) {
      out.push(textBlock(m[2], { style: `h${m[1].length}` }));
      i++;
      continue;
    }
    if ((m = /^>\s?(.*)$/.exec(line))) {
      out.push(textBlock(m[1], { style: "blockquote" }));
      i++;
      continue;
    }
    if ((m = /^( *)([-*]|\d+\.)\s+(.*)$/.exec(line))) {
      out.push(
        textBlock(m[3], {
          listItem: /\d/.test(m[2]) ? "number" : "bullet",
          level: Math.floor(m[1].length / 2) + 1,
        }),
      );
      i++;
      continue;
    }
    if (BLOCK_START.test(line)) throw unsupported(`"${line}"`);
    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !BLOCK_START.test(lines[i]))
      paragraph.push(lines[i++].trim());
    out.push(textBlock(paragraph.join(" ")));
  }
  return out;
}

/** Inline Markdown → spans; link definitions are pushed onto `markDefs`. */
function inline(
  text: string,
  marks: string[],
  markDefs: Doc[],
  key: () => string,
): Doc[] {
  const spans: Doc[] = [];
  let plain = "";
  const flush = () => {
    if (plain) spans.push({ _type: "span", _key: key(), text: plain, marks });
    plain = "";
  };
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    let m: RegExpExecArray | null;
    if ((m = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(rest))) {
      flush();
      const linkKey = key();
      markDefs.push({ _type: "link", _key: linkKey, href: m[2] });
      spans.push(...inline(m[1], [...marks, linkKey], markDefs, key));
    } else if ((m = /^\*\*(.+?)\*\*/.exec(rest))) {
      flush();
      spans.push(...inline(m[1], [...marks, "strong"], markDefs, key));
    } else if ((m = /^\*(.+?)\*/.exec(rest)) || (m = /^_(.+?)_/.exec(rest))) {
      flush();
      spans.push(...inline(m[1], [...marks, "em"], markDefs, key));
    } else if ((m = /^`([^`]+)`/.exec(rest))) {
      flush();
      spans.push({
        _type: "span",
        _key: key(),
        text: m[1],
        marks: [...marks, "code"],
      });
    } else {
      plain += text[i];
      i++;
      continue;
    }
    i += m[0].length;
  }
  flush();
  return spans;
}
````

Run: `node scripts/check-fixture-markdown.mjs`
Expected: `check-fixture-markdown: ok`.

- [ ] **Step 3: Export `FixtureDocs` from `data.ts`**

Cut the `/** One complete fixture dataset. */ interface FixtureDocs { … }`
block from `src/sanity/lib/fixtures/index.ts` and paste it into `data.ts`
directly below `export type Doc = Record<string, any>;`, as
`export interface FixtureDocs { … }` (same six fields). In `index.ts`, add `type FixtureDocs`
to the `./data` import. This is types only, so mode `1` output is
unchanged.

- [ ] **Step 4: `src/sanity/lib/fixtures/sample.ts`**

```ts
/**
 * The "sample" parity dataset (PARITY_FIXTURES=sample): the Files sample
 * content in src/content, reshaped into the GROQ projections the Sanity
 * source reads, so one build per source renders the SAME content and
 * `compare-dist --equivalent` can show both render it the same way.
 *
 * - Rich text comes from each field's Markdown source (`.markdown` on the
 *   collection data; the raw body for posts), converted by
 *   ./markdown-to-pt.ts — the Files source renders the same source with
 *   MDX / Sätteri.
 * - Images become asset references whose ids encode the file's intrinsic
 *   size, as real refs do, with no hotspot (Files images have none).
 * - Every list is pre-sorted the way the Files source sorts (newest first,
 *   ties by id), because resolveFixture() keeps document order on ties.
 *
 * Dev-only, like the rest of ./fixtures: load-query.ts imports this folder
 * only in a parity build.
 */
import type { ImageMetadata } from "astro";
import { getCollection } from "astro:content";
import type { Doc, FixtureDocs } from "./data";
import { markdownToPortableText } from "./markdown-to-pt";

/** Every photo an MDX body can reference, by repo path. */
const BODY_IMAGES = import.meta.glob<ImageMetadata>(
  "/src/content/blog/images/*.{avif,gif,jpeg,jpg,png,webp}",
  { eager: true, import: "default" },
);

/** A stable alphanumeric asset id (FNV-1a of the image's build path). */
function assetId(src: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < src.length; i++) {
    hash ^= src.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `sample${hash.toString(16).padStart(8, "0")}`;
}

/** A projected Sanity image (no hotspot: Files images have no focal point). */
function img(meta: ImageMetadata): Doc {
  return {
    _type: "image",
    asset: {
      _ref: `image-${assetId(meta.src)}-${meta.width}x${meta.height}-${meta.format}`,
      _type: "reference",
    },
  };
}

/** `asset->metadata{ dimensions, lqip }`. */
const dims = (meta: ImageMetadata): Doc => ({
  dimensions: { width: meta.width, height: meta.height },
  lqip: null,
});

/** Newest first, ties by id — the Files source's order. */
const newestFirst =
  <T extends { id: string }>(dateOf: (entry: T) => string | undefined) =>
  (a: T, b: T) =>
    (dateOf(b) ?? "").localeCompare(dateOf(a) ?? "") ||
    a.id.localeCompare(b.id);

/** `_updatedAt` that JSON-LD reads exactly as the Files `updated ?? date`. */
const stamp = (date: string, updated?: string) =>
  `${updated ?? date}T12:00:00Z`;

const byId = <T extends { id: string }>(entries: T[]) =>
  new Map(entries.map((entry) => [entry.id, entry]));

export async function loadSampleDocs(): Promise<FixtureDocs> {
  const [
    blog,
    authors,
    blogCtas,
    ctaSections,
    settings,
    caseStudies,
    projects,
    gallery,
    testimonials,
  ] = await Promise.all([
    getCollection("blog"),
    getCollection("authors"),
    getCollection("blogCtas"),
    getCollection("ctaSections"),
    getCollection("settings"),
    getCollection("caseStudies"),
    getCollection("projects"),
    getCollection("gallery"),
    getCollection("testimonials"),
  ]);
  const authorById = byId(authors);
  const ctaById = byId(blogCtas);
  const sectionById = byId(ctaSections);
  const projectById = byId(projects);

  const blogCta = (id: string): Doc => {
    const d = ctaById.get(id)!.data;
    return {
      _id: id,
      heading: d.heading,
      body: d.body,
      image: img(d.image),
      imageAlt: d.imageAlt,
      aspectRatio: d.aspectRatio,
      linkUrl: d.linkUrl,
      linkLabel: d.linkLabel,
    };
  };
  const ctaSection = (id: string): Doc => {
    const d = sectionById.get(id)!.data;
    return {
      _id: id,
      heading: d.heading,
      text: d.text,
      primaryButtonLabel: d.primaryButtonLabel,
      primaryButtonHref: d.primaryButtonHref,
      secondaryButtonLabel: d.secondaryButtonLabel ?? null,
      secondaryButtonHref: d.secondaryButtonHref ?? null,
      backgroundImage: img(d.backgroundImage),
      imageAlt: d.imageAlt,
      overlayStrength: d.overlayStrength ?? null,
    };
  };
  const seo = (
    s:
      | {
          metaTitle?: string;
          metaDescription?: string;
          ogTitle?: string;
          ogDescription?: string;
          ogImage?: ImageMetadata;
        }
      | undefined,
  ): Doc | null =>
    s
      ? {
          metaTitle: s.metaTitle ?? null,
          metaDescription: s.metaDescription ?? null,
          ogTitle: s.ogTitle ?? null,
          ogDescription: s.ogDescription ?? null,
          ogImage: s.ogImage ? img(s.ogImage) : null,
        }
      : null;
  const portableText = (markdown: string, keyPrefix: string) =>
    markdownToPortableText(markdown, {
      keyPrefix,
      image: (src) => {
        const meta =
          BODY_IMAGES[`/src/content/blog/${src.replace(/^\.\//, "")}`];
        if (!meta) throw new Error(`[sample fixtures] No body image ${src}`);
        return img(meta);
      },
      cta: blogCta,
    });

  const posts = [...blog].sort(newestFirst((p) => p.data.date)).map((p) => {
    const d = p.data;
    const author = authorById.get(d.author.id)!.data;
    return {
      title: d.title,
      slug: p.id,
      description: d.description,
      categories: [...d.categories],
      primaryCategory: d.primaryCategory ?? null,
      image: img(d.image),
      imageAlt: d.imageAlt,
      author: {
        name: author.name,
        avatar: author.avatar ? img(author.avatar) : null,
      },
      video: d.video ?? null,
      date: d.date,
      _updatedAt: stamp(d.date, d.updated),
      featured: d.featured,
      body: portableText(p.body ?? "", `${p.id}-`),
      ctaOverride: d.cta ? blogCta(d.cta.id) : null,
      ctaSectionOverride: d.ctaSection ? ctaSection(d.ctaSection.id) : null,
      faqs: d.faqs.map((faq, i) => ({
        question: faq.question,
        answer: portableText(faq.answer.markdown, `${p.id}-faq${i}-`),
      })),
      relatedSlugs: d.relatedPosts.map((ref) => ref.id),
      seo: seo(d.seo),
    };
  });

  const studies = [...caseStudies]
    .sort(newestFirst((s) => s.data.date))
    .map((s) => {
      const d = s.data;
      return {
        title: d.title,
        slug: s.id,
        description: d.description,
        client: d.client,
        categories: [...d.categories],
        industries: [...d.industries],
        image: img(d.image),
        imageAlt: d.imageAlt,
        date: d.date,
        _updatedAt: stamp(d.date, d.updated),
        featured: d.featured,
        comingSoon: d.comingSoon,
        timeline: d.timeline ?? null,
        liveUrl: d.liveUrl ?? null,
        galleryImagesAlt: null,
        galleryImages: d.galleryImages.map((g) => ({
          ...img(g.src),
          alt: g.alt,
        })),
        content: d.content.map((block, i) => {
          const base = {
            _type: block.type,
            _key: `${s.id}-block${i}`,
            sectionSpacing: block.sectionSpacing ?? null,
            sectionSpacingTop: block.sectionSpacingTop ?? null,
            sectionSpacingBottom: block.sectionSpacingBottom ?? null,
          };
          const body =
            "body" in block
              ? {
                  body: portableText(block.body.markdown, `${s.id}-block${i}-`),
                }
              : {};
          const ratio =
            "aspectRatio" in block || "customAspectRatio" in block
              ? {
                  aspectRatio:
                    (block as { aspectRatio?: string }).aspectRatio ?? null,
                  customAspectRatio:
                    (block as { customAspectRatio?: string })
                      .customAspectRatio ?? null,
                }
              : {};
          switch (block.type) {
            case "richText":
            case "richTextLeft":
              return { ...base, ...body, maxWidth: block.maxWidth ?? null };
            case "richTextColumns":
              return { ...base, ...body };
            case "richTextWithImage":
              return {
                ...base,
                ...body,
                ...ratio,
                image: img(block.image),
                imageAlt: block.imageAlt,
                transparent: block.transparent ?? false,
                objectFit: block.objectFit ?? null,
              };
            case "fullWidthImage":
              return {
                ...base,
                ...ratio,
                image: img(block.image),
                imageAlt: block.imageAlt,
                transparent: block.transparent ?? false,
              };
            case "imageGrid":
              return {
                ...base,
                ...ratio,
                defaultAlt: null,
                images: block.images.map((g) => ({
                  ...img(g.image),
                  alt: g.alt,
                  transparent: g.transparent ?? false,
                })),
              };
            case "stats":
              return { ...base, items: block.items };
          }
        }),
        ctaSectionOverride: d.ctaSection ? ctaSection(d.ctaSection.id) : null,
        seo: seo(d.seo),
      };
    });

  const projectDocs = [...projects]
    .sort(newestFirst((p) => p.data.completed))
    .map((p) => {
      const d = p.data;
      return {
        _id: p.id,
        _updatedAt: stamp(d.completed ?? "2026-01-01"),
        title: d.title,
        slug: p.id,
        category: d.category,
        location: d.location ?? null,
        service: d.service ?? null,
        completed: d.completed ?? null,
        featured: d.featured,
        heroImage: img(d.heroImage),
        imageAlt: d.imageAlt,
        heroImageMeta: dims(d.heroImage),
        photos: d.photos.map((photo, i) => ({
          _key: `${p.id}-photo${i}`,
          ...img(photo.src),
          label: photo.label ?? null,
          alt: photo.alt,
          meta: dims(photo.src),
        })),
        description: d.description
          ? portableText(d.description.markdown, `${p.id}-`)
          : null,
        quote: d.quote
          ? { text: d.quote.text, name: d.quote.name ?? null }
          : null,
        seoDescription: d.seoDescription ?? null,
      };
    });

  const galleryDocs = [...gallery]
    .sort(newestFirst((g) => g.data.added))
    .map((g) => {
      const d = g.data;
      return {
        _id: g.id,
        image: img(d.image),
        imageAlt: d.alt,
        imageMeta: dims(d.image),
        caption: d.caption,
        category: d.category,
        location: d.location ?? null,
        added: d.added,
        project: d.project
          ? {
              title: projectById.get(d.project.id)!.data.title,
              slug: d.project.id,
            }
          : null,
      };
    });

  const testimonialDocs = [...testimonials]
    .sort((a, b) => a.data.order - b.data.order || a.id.localeCompare(b.id))
    .map((t) => {
      const d = t.data;
      return {
        _id: t.id,
        name: d.name,
        role: d.role ?? null,
        company: d.company ?? null,
        quote: d.quote,
        avatar: d.avatar ? img(d.avatar) : null,
        website: d.website ?? null,
        stars: d.stars ?? null,
        featured: d.featured,
        sortOrder: d.order,
      };
    });

  const site = settings.find((entry) => entry.id === "site")?.data;
  return {
    posts,
    caseStudies: studies,
    projects: projectDocs,
    gallery: galleryDocs,
    testimonials: testimonialDocs,
    settings: {
      defaultBlogCta: site?.defaultBlogCta
        ? blogCta(site.defaultBlogCta.id)
        : null,
      defaultCtaSection: site?.defaultCtaSection
        ? ctaSection(site.defaultCtaSection.id)
        : null,
    },
  };
}
```

- [ ] **Step 5: The `sample` mode in `fixtures/index.ts`**

Above `fixtureFetch`, add:

```ts
/** The sample dataset, derived once per build from src/content. */
let sampleDocs: Promise<FixtureDocs> | undefined;
```

In `fixtureFetch`, add before the final `throw`:

```ts
if (mode === "sample") {
  sampleDocs ??= import("./sample").then((m) => m.loadSampleDocs());
  return {
    result: resolveFixture(query, params ?? {}, await sampleDocs),
    resultSourceMap: undefined,
  };
}
```

Extend the doc comment's mode list with
`"sample" — the Files sample content re-shaped as GROQ results (./sample.ts), for the Files-vs-Sanity equivalence check.`
Extend the header comment on `load-query.ts` the same way:
`PARITY_FIXTURES=1|preview|sample`.

- [ ] **Step 6: Build the sample dataset**

```bash
KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity PARITY_FIXTURES=sample npm run build
grep -c 'class="callout_wrap is-tip"' dist/client/blog/accessibility-guide/index.html
rm -rf .parity/sample && cp -R dist/client .parity/sample
```

Expected: the build completes, and the grep prints `1`. That is the
Portable Text callout, derived from the MDX source.

- [ ] **Step 7: Add `--equivalent` to `scripts/compare-dist.mjs`**

Add a paragraph to the header comment after the `--layers` one:

```js
 * `--equivalent` compares two builds of the SAME content from DIFFERENT
 * sources (Sanity fixtures derived from src/content against the Files
 * build). On top of `--canonical` it normalises only the differences
 * listed in docs/superpowers/plans/2026-10-16-pr3-files-backend.md
 * ("Expected Files-vs-Sanity differences"): image URLs and <img> sizing
 * attributes, syntax-highlighting markup (a code block compares by
 * language and text), whitespace beside block elements, a body image's
 * <p>/<figure> wrapper, ids on h3–h6, inline <style> split across chunks
 * (compared layer by layer), and llms-full.txt bodies (only its outline —
 * headings, URL:, Client: and index lines — is compared).
 *
 *   node scripts/compare-dist.mjs --equivalent .parity/sample .parity/files
```

Update the usage string to
`[--canonical | --layers | --equivalent]`. Add
`const equivalent = flags.includes("--equivalent");` beside the other
flags. Add these helpers above the comparison loop:

```js
/* ── --equivalent ──────────────────────────────────────────────────────── */

/** Image URLs from either source: local build files and Sanity CDN URLs. */
const IMAGE_URL =
  /(?:https?:\/\/[^"'\s/<>]+)?\/_astro\/ASSET|https:\/\/cdn\.sanity\.io\/images\/[^"'\s)<>,]+/g;
/** <img> attributes about sizing and loading, not content. */
const IMG_SIZING = new Set([
  "src",
  "srcset",
  "sizes",
  "width",
  "height",
  "loading",
  "decoding",
  "fetchpriority",
  "data-astro-image",
]);
const BLOCK_TAGS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "body",
  "dd",
  "details",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hr",
  "html",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul",
]);

const tagOf = (node) => node.rawTagName?.toLowerCase() ?? "";
const isElement = (node) => node.nodeType === 1 && Boolean(node.rawTagName);
const isBlock = (node) => isElement(node) && BLOCK_TAGS.has(tagOf(node));
const normStyle = (value) =>
  value
    .split(";")
    .map((decl) => decl.trim())
    .filter(Boolean)
    .map((decl) => decl.replace(/\s*:\s*/, ": "))
    .join("; ");

/** A <p>, or an attribute-less <figure>, holding one <img> and nothing else. */
function loneImage(node) {
  const tag = tagOf(node);
  if (
    tag !== "p" &&
    !(tag === "figure" && !Object.keys(node.attributes).length)
  )
    return null;
  const elements = node.childNodes.filter(isElement);
  const textless = node.childNodes.every((c) => isElement(c) || !c.text.trim());
  return elements.length === 1 && tagOf(elements[0]) === "img" && textless
    ? elements[0]
    : null;
}

/** Canonical DOM string with the equivalence normalisations applied. */
function canonEq(node) {
  const tag = tagOf(node);
  if (tag) {
    const img = loneImage(node);
    if (img) return canonEq(img);
    if (
      tag === "pre" &&
      /\bastro-code\b/.test(node.getAttribute("class") ?? "")
    )
      return `<pre data-language="${node.getAttribute("data-language") ?? ""}">\n${node.rawText.replace(/<[^>]+>/g, "")}</pre>\n`;
  }
  const kids = node.childNodes;
  const blockEdge = !tag || BLOCK_TAGS.has(tag);
  const inner = kids
    .map((kid, i) => {
      if (isElement(kid)) return canonEq(kid);
      if (kid.nodeType !== 3) return "";
      let text = kid.text.replace(/\s+/g, " ");
      if (i > 0 ? isBlock(kids[i - 1]) : blockEdge) text = text.trimStart();
      if (i < kids.length - 1 ? isBlock(kids[i + 1]) : blockEdge)
        text = text.trimEnd();
      return text;
    })
    .join("");
  if (!tag) return inner;
  const attrs = Object.entries(node.attributes)
    .filter(
      ([name]) =>
        !(tag === "img" && IMG_SIZING.has(name)) &&
        !(name === "id" && /^h[3-6]$/.test(tag)),
    )
    .map(([name, value]) => [name, name === "style" ? normStyle(value) : value])
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => ` ${name}="${value}"`)
    .join("");
  return `<${tag}${attrs}>\n${inner}</${tag}>\n`;
}

/** Why two pages' inlined CSS differ layer by layer, or null. */
function styleLayerDiff(a, b) {
  const styles = (t) => [...t.matchAll(STYLE_RE)].map((m) => m[1]).join("");
  const sa = layerSequences(styles(a));
  const sb = layerSequences(styles(b));
  for (const name of new Set([...sa.keys(), ...sb.keys()])) {
    if (
      JSON.stringify(sa.get(name) ?? []) !== JSON.stringify(sb.get(name) ?? [])
    )
      return `layer "${name}" blocks differ or are reordered`;
  }
  return null;
}

/** llms-full.txt's outline: headings, URL:/Client: lines, index entries. */
const outline = (text) =>
  text
    .split("\n")
    .filter((line) => /^(#|URL: |Client: |- \[)/.test(line))
    .join("\n");
```

In the comparison loop, insert this right after `a` and `b` are read and
normalised, before the `canonical` branch:

```js
  if (equivalent) {
    a = a.replace(IMAGE_URL, "IMAGE");
    b = b.replace(IMAGE_URL, "IMAGE");
    if (file.endsWith(".html")) {
      const why = styleLayerDiff(a, b);
      if (why) {
        failures++;
        console.log(`STYLES   ${file}: ${why}`);
        continue;
      }
      const noStyles = (t) => t.replace(STYLE_RE, "<style></style>");
      a = canonEq(parse(noStyles(a), PARSE_OPTIONS));
      b = canonEq(parse(noStyles(b), PARSE_OPTIONS));
    } else if (path.basename(file) === "llms-full.txt") {
      a = outline(a);
      b = outline(b);
    }
  }
```

Guard the existing `canonical` and `layers` branches with
`!equivalent &&`. Change the final summary to print
`Equivalent: ${base.length} files.` when `equivalent` is set and nothing
failed.

- [ ] **Step 8: Run the equivalence check**

Run: `node scripts/compare-dist.mjs --equivalent .parity/sample .parity/files`
Expected: `Equivalent: <n> files.`

If it reports differences, triage each one. Never widen the normaliser to
make one pass:

1. **The Files source maps a field differently** (ordering, a default, a
   fallback). Fix the Files module, rebuild Files, and refresh
   `.parity/files`.
2. **Sample text uses a construct only one renderer handles** (ASCII
   quotes, a duplicate h2, a link with a new-tab flag). Change the sample
   content, then rebuild both and refresh `.parity/files` and
   `.parity/sample`.
3. **A genuine, unavoidable renderer difference** not on the list. Stop
   and report it with the diff. Adding a normalisation needs a new
   numbered row in "Expected Files-vs-Sanity differences" (here and in the
   `compare-dist.mjs` header) with its justification.

- [ ] **Step 9: Gate**

```bash
node scripts/check-fixture-markdown.mjs
npm run check && npm run check:hover && npm run check:boundary
KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity npm run build && node scripts/compare-dist.mjs .parity/empty dist/client
KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity PARITY_FIXTURES=1 npm run build && node scripts/compare-dist.mjs .parity/fixtures dist/client
node scripts/compare-dist.mjs --equivalent .parity/sample .parity/files
```

Expected: ok, all checks pass, `Identical` twice (the `1` mode is
untouched), then `Equivalent`.

- [ ] **Step 10: Commit**

```bash
git add src/sanity/lib/fixtures scripts/check-fixture-markdown.mjs scripts/compare-dist.mjs src/sanity/lib/load-query.ts
git commit -m "$(cat <<'EOF'
Prove Files and Sanity render the same content alike

PARITY_FIXTURES=sample derives GROQ-shaped documents from src/content at
build time (Markdown to Portable Text via a strict converter), so both
sources render identical content. compare-dist --equivalent diffs the two
builds, normalising only the documented renderer differences (image URLs
and sizing, highlighting markup, block-edge whitespace, body-image
wrappers, h3-h6 ids, CSS chunking, llms-full bodies).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Files becomes the default source

Point `source.ts` at the Files backend. Move the preview twins onto the
Sanity source directly, switch the `/components` demos and the sections'
built-in data to real content, delete the placeholders, and give CI a
Files build plus a test-only Sanity build. Then re-baseline exactly the
pages this task changes.

**Files:**

- Modify: `src/lib/content/source.ts`, `src/lib/content/index.ts`,
  `src/lib/content/types.ts`, `src/lib/content/blocks.ts` (comments)
- Modify: `src/pages/preview/{blog,case-studies,projects}/[slug].astro`
- Modify: `src/components/sections/CaseStudyGrid.astro`,
  `src/components/sections/BlogPostGrid.astro`,
  `src/components/sections/CaseStudyFeatured.astro`
  (`FEATURED_CASE_STUDIES_SLUGS`)
- Modify: `src/pages/index.astro`, `src/pages/components.astro`
- Modify: `src/content/services/kitchen-remodeling.json` (a review avatar)
- Modify: `src/sanity/lib/fixtures/data.ts` (append a "Marcus Bell"
  testimonial), `scripts/check-stega-leaks.mjs`, `scripts/check-schema.mjs`
- Modify: `.github/workflows/ci.yml`
- Delete: `src/data/case-studies.ts`

**Interfaces:**

- Consumes: `filesSource` (Task 5), the Sanity default export
  (`src/sanity/lib/source.ts`), the shared `Callout`/`VideoEmbed` (Task 6),
  and the `Quote`/`Reviews` avatar (Task 3).
- Produces:
  - `@/lib/content` resolves to Files by default.
  - `CaseStudyGrid`'s `studies?: CaseStudySummary[]` defaults to
    `getCaseStudies()`.
  - `BlogPostGrid`'s `posts?: BlogPostSummary[]` defaults to
    `getBlogPosts()`.
  - `FEATURED_CASE_STUDIES_SLUGS` is
    `["acme-corp-rebrand", "summit-outdoor-migration", "greenleaf-organics-seo"]`.

- [ ] **Step 1: Switch the source**

Replace `src/lib/content/source.ts` with:

```ts
/**
 * Selects the active content backend: the Files backend (content
 * collections in src/content). Kept to ONE re-export on purpose: the Sanity
 * add-on swaps the target here and nowhere else. Test builds can pick
 * either backend with CONTENT_SOURCE=files|sanity (astro.config.mjs;
 * removed in PR 4). Never import a backend from any other file.
 */
export { default } from "./files";
```

In `src/lib/content/index.ts`, change the header bullet to:
"The active backend: ./source.ts (one line; the Files implementation in
./files/ by default, the Sanity one in src/sanity/lib/source.ts with the
add-on)". In `types.ts`, change "(src/sanity/lib/source.ts today)" to
"(./files/ by default; src/sanity/lib/source.ts with the Sanity add-on)".
In `blocks.ts`, change "(Sanity's "array of objects" field today, the local
samples in src/data/case-studies.ts)" to "(the JSON `content` array in
src/content/case-studies/, or Sanity's array of block objects)".

- [ ] **Step 2: Preview twins read the Sanity source directly**

In each of the three `src/pages/preview/**/[slug].astro` files:

- Replace `import { getBlogPost } from "@/lib/content";` (or `getCaseStudy`,
  or `getProject`) with `import sanity from "@/sanity/lib/source";`.
- Change the call to `sanity.getBlogPost(slug, getDraftModeProps(Astro))`
  (or `getCaseStudy`, or `getProject`).
- Append this paragraph to the header comment:

```
 * Draft preview is a Sanity feature, so this twin reads the Sanity source
 * directly, whichever source @/lib/content selects (Files by default). The
 * shared template still cleans text with @/lib/content's plainText, which
 * strips stega only when the Sanity source is the active one
 * (CONTENT_SOURCE=sanity builds, and the add-on). PR 4 moves this file into
 * the Sanity add-on.
```

- [ ] **Step 3: `CaseStudyGrid` reads the content interface**

In `src/components/sections/CaseStudyGrid.astro`:

- Delete the `import { caseStudies as allCaseStudiesData } from "@/data/case-studies";`
  line, the "Re-export the shared type" comment, and the two `CaseStudy`
  type lines below it.
- Add `import { getCaseStudies, imageSrc, type CaseStudySummary } from "@/lib/content";`.
- In the header comment, replace the "CMS-ready: …" paragraph with:
  "Data: pass `studies` (CaseStudySummary[] from `getCaseStudies()` in
  `@/lib/content`), or omit it and the section fetches every case study
  itself."
- Change the `studies` prop's JSDoc and type:

```ts
  /**
   * The case studies to filter from (`getCaseStudies()` from
   * `@/lib/content`). Omit it and the section fetches them itself; the
   * component handles filtering, sorting and the limit.
   *
   * @example studies={allStudies}
   */
  studies?: CaseStudySummary[];
```

Replace `const allStudies = studies ?? allCaseStudiesData;` with:

```ts
/* Tolerate an empty or unreachable dataset — the section then renders
   nothing, like any other empty filter result. */
const allStudies =
  studies ?? (await getCaseStudies().catch((): CaseStudySummary[] => []));
```

Replace step 4's date sort with a string compare (dates are nullable):

```ts
// 4. Sort by date descending (most recent first); undated last
filtered.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
```

Replace the `<CaseStudyCard … />` call in the grid with:

```astro
{
  filtered.map(
    (study) =>
      study.image && (
        <CaseStudyCard
          theme={invertCards}
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
          headingVariant={cardHeadingVariant}
          textVariant={cardTextVariant}
        />
      ),
  )
}
```

In the `docs` JSDoc bullet list, change the `studies` bullet to
`` `studies` — CaseStudySummary[] (fetched with getCaseStudies() if omitted) ``.

- [ ] **Step 4: `BlogPostGrid` loses its built-in samples**

In `src/components/sections/BlogPostGrid.astro`:

- Delete the six sample-image imports and their comment ("Sample-data
  images …").
- Delete the whole `samplePosts` block and its banner comment.
- Change the import to
  `import { getBlogPosts, imageSrc, type BlogPostSummary } from "@/lib/content";`.
- Replace `const allPosts = posts ?? samplePosts;` and its comment with:

```ts
/* Use `posts` when given, else fetch every post (an empty or unreachable
   dataset renders nothing). */
const allPosts =
  posts ?? (await getBlogPosts().catch((): BlogPostSummary[] => []));
```

- In the header comment, change "with no `posts` it previews built-in
  sample data" to "with no `posts` it fetches them with `getBlogPosts()`".
  In the `docs` bullets, change "(sample data if omitted)" to "(fetched
  with getBlogPosts() if omitted)". In the `posts` JSDoc, change "If
  omitted, uses built-in sample data for previewing." to "If omitted, the
  section fetches every post itself."

- [ ] **Step 5: Homepage and featured defaults follow the sample content**

In `src/components/sections/CaseStudyFeatured.astro`:

```ts
export const FEATURED_CASE_STUDIES_SLUGS: [string, string, string] = [
  "acme-corp-rebrand",
  "summit-outdoor-migration",
  "greenleaf-organics-seo",
];
```

In `src/pages/index.astro`, change `<SingleTestimonial name="Jane Doe" />`
to `<SingleTestimonial name="Marcus Bell" />`. Update the `@example` in
`SingleTestimonial.astro`'s header to `name="Marcus Bell"`.

Append to `TESTIMONIALS` in `src/sanity/lib/fixtures/data.ts`. It must not
call `img()`, so every earlier fixture keeps its asset ref:

```ts
  {
    _id: "testimonial-marcus",
    name: "Marcus Bell",
    role: "Homeowner",
    company: null,
    quote: "They measured twice and finished on schedule.",
    avatar: null,
    website: null,
    stars: 5,
    featured: false,
    sortOrder: 4,
  },
```

In `scripts/check-stega-leaks.mjs`, change the failure message to
`'SingleTestimonial did not render on / — getTestimonialByName("Marcus Bell") failed against an encoded name.'`.

- [ ] **Step 6: A service review with a photo**

```bash
cp src/assets/placeholder-images/ai-first-starter-19.webp src/content/services/images/reviewer-jordan.webp
```

In `src/content/services/kitchen-remodeling.json`, give the first review
(`"name": "Jordan P."`) two more keys:
`"avatar": "./images/reviewer-jordan.webp", "avatarAlt": "Jordan P."`.

- [ ] **Step 7: `/components` demos use real content**

In `src/pages/components.astro`:

1. Imports: replace the `@/lib/content` import with

   ```ts
   import {
     getBlogPosts,
     getGallery,
     getProjects,
     getTestimonials,
     sizedImage,
     type BlogPostSummary,
     type GalleryEntry,
     type ProjectCardData,
     type TestimonialData,
   } from "@/lib/content";
   ```

   Then add `import Callout from "@/components/blog/Callout.astro";`,
   `import VideoEmbed from "@/components/blog/VideoEmbed.astro";`,
   `import reviewerPhoto from "@/assets/placeholder-images/ai-first-starter-19.webp";`
   and `import "@/styles/pages/blog-post.css";`. That stylesheet holds the
   callout, video and code-block styles, and the TableOfContents styles
   this page also uses.

2. Replace everything from the comment
   `/* Hand-built sample data for the ProjectBrowser / GalleryBrowser demos —`
   down to the end of `demoGallery` (`];` before the closing `---`) with:

   ```ts
   /* The content-backed demos render the real content — the same calls
      /projects, /gallery and /blog make (tolerating an empty dataset). */
   const [demoProjects, galleryEntries, demoPosts] = await Promise.all([
     getProjects().catch((): ProjectCardData[] => []),
     getGallery().catch((): GalleryEntry[] => []),
     getBlogPosts().catch((): BlogPostSummary[] => []),
   ]);
   const demoGallery = galleryEntries.map((entry) => ({
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

   If `ImageMetadata` is no longer referenced after this (check with
   `grep -n ImageMetadata src/pages/components.astro`), delete its
   `import type`.

3. ProjectBrowser demo text: change `Try searching for "Decatur".` to
   `Try searching for "Chatham".`.

4. Card-family text: change "render these for you from Sanity — shown here
   standalone with literal props." to "render these for you from the
   content source (@/lib/content) — shown here standalone with literal
   props."

5. `<CaseStudyGrid … heading="Case studies pulled from Sanity" />` becomes
   `heading="Case studies from the content source"`.

6. BlogPostGrid demos: add `posts={demoPosts}` to both. In the category
   demo, change `category="Development"` to `category="Guides"` (a blog
   category; "Development" is a case-study category).

7. SingleTestimonial demo: replace the whole
   `<SingleTestimonial testimonial={{ … }} />` element with
   `<SingleTestimonial name="marcus bell" />`. Change its text to "Looks a
   testimonial up by name (any letter case, as here) from the content
   source, or takes one directly as `testimonial`. Renders nothing at all if
   neither resolves."

8. TestimonialShowcase demo: delete the `testimonials={[ … ]}` attribute,
   keeping `heading`. Change its text's last sentence to "Self-fetches the
   featured testimonials from the content source, as it does here."

9. CaseStudyFeatured demo: delete the `studies={[ … ]}` attribute, from
   `studies={[` through its closing `]}`. Change its text to "Looks up the
   three slugs in FEATURED_CASE_STUDIES_SLUGS (or a `slugs` prop) from the
   content source, as it does here. Needs all three to resolve or it renders
   nothing."

10. Reviews demo: give the first review of the first `<Reviews>` two more
    keys: `avatar: reviewerPhoto,` and `avatarAlt: "Jordan P.",`.

11. Add a demo for the blog body components. Add
    `{ slug: "blog-body", text: "Callout & VideoEmbed" },` after the
    `blogpostgrid` entry in `COMPONENT_INDEX`, and add this section after
    the BlogPostGrid demos section closes (`</Section>`):

    ```astro
    <Section theme="light" id="blog-body">
      <Layout variant="stack">
        <Heading variant="eyebrow" class="u-margin-bottom-2"
          >Callout &amp; VideoEmbed</Heading
        >
        <Heading tag="h2" balance>Blog body components</Heading>
        <Text variant="regular" muted maxWidth="48rem">
          MDX posts use these by tag name with no import (BlogBody passes them
          in), and Sanity posts render the same markup.
        </Text>
      </Layout>
      <div class="blog_post_prose u-rich-text">
        <Callout type="tip"><p>Put the skip link first in the page.</p></Callout
        >
        <Callout type="warning"
          ><p>Avoid stacking three calls to action in one section.</p></Callout
        >
        <Callout type="info"
          ><p>We review these trends every January.</p></Callout
        >
        <VideoEmbed
          url="https://www.youtube.com/watch?v=aqz-KE-bpKQ"
          caption="A sample video embed"
        />
      </div>
    </Section>
    ```

- [ ] **Step 8: Delete the placeholder data**

```bash
git rm src/data/case-studies.ts
grep -rn "data/case-studies\|samplePosts\|allCaseStudiesData" src .claude CLAUDE.md docs README.md | grep -v "^docs/superpowers"
```

Expected from the grep: only `.claude/skills/setup/SKILL.md` (the fixtures
row, fixed in Task 9). No source file still refers to the deleted data.

- [ ] **Step 9: `check:schema` samples `src/content`**

In `scripts/check-schema.mjs`, delete the `createClient` import, the
`site.shared.mjs` import, `getSampleSanityPaths()` and the
`sanityPaths`/`try` block. Add `import fs from "node:fs";` and
`import path from "node:path";`, and:

```js
// One sample page per content type, taken from src/content, so the JsonLd
// helper output on the blog and case-study templates is validated too.
function getSampleContentPaths() {
  const first = (dir, ext, keep = () => true) =>
    fs.existsSync(dir)
      ? fs
          .readdirSync(dir)
          .filter((f) => f.endsWith(ext))
          .sort()
          .find((f) => keep(path.join(dir, f)))
      : undefined;
  const post = first("src/content/blog", ".mdx");
  const study = first(
    "src/content/case-studies",
    ".json",
    (file) => !JSON.parse(fs.readFileSync(file, "utf8")).comingSoon,
  );
  return [
    post && `/blog/${post.slice(0, -".mdx".length)}`,
    study && `/case-studies/${study.slice(0, -".json".length)}`,
  ].filter(Boolean);
}

const PAGES = [...STATIC_PAGES, ...getSampleContentPaths()];
```

- [ ] **Step 10: CI builds Files by default and still compiles Sanity**

In `.github/workflows/ci.yml`, replace the header comment's second
sentence with: "The build reads content from src/content (the Files
source). A second, test-only build compiles the Sanity source until PR 4
moves it into the add-on, whose own CI job replaces that step." After
`- run: npm run build`, add:

```yaml
- run: npm run check:content-build
# TEST-ONLY until PR 4 (the Sanity add-on's CI job replaces it): the
# Sanity source must keep compiling while it still lives in src/.
- run: CONTENT_SOURCE=sanity npm run build
```

- [ ] **Step 11: Rebuild everything and review the expected changes**

```bash
npm run check && npm run check:hover && npm run check:boundary && npm run check:content
KEEP_DEV_PAGES=1 npm run build && npm run check:content-build && node scripts/compare-dist.mjs .parity/files dist/client
```

Expected: checks pass and `check-content-build: ok`. With no
`CONTENT_SOURCE`, this is now the Files build. The comparison shows `DIFF`
in at most `components/index.html` (the demos),
`services/kitchen-remodeling/index.html` (the review photo) and
`index.html`, and nothing else. Read them, then re-baseline:
`rm -rf .parity/files && cp -R dist/client .parity/files`.

```bash
KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity npm run build && node scripts/compare-dist.mjs .parity/empty dist/client
```

Expected: `DIFF` only in `components/index.html`, where the content-backed
demos are now empty in the empty dataset, and
`services/kitchen-remodeling/index.html`. Re-baseline `.parity/empty`.

```bash
KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity PARITY_FIXTURES=1 npm run build && node scripts/compare-dist.mjs .parity/fixtures dist/client
```

Expected: `DIFF` only in `index.html` (featured slugs and the testimonial
name; the edge dataset has no sample studies, so that strip is now empty),
`components/index.html` and `services/kitchen-remodeling/index.html`.
Re-baseline `.parity/fixtures`.

```bash
KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity PARITY_FIXTURES=sample npm run build && node scripts/compare-dist.mjs .parity/sample dist/client
```

Expected: `DIFF` only in the same three files. Re-baseline
`.parity/sample`.

- [ ] **Step 12: Gate**

```bash
node scripts/compare-dist.mjs --equivalent .parity/sample .parity/files
KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity PARITY_FIXTURES=preview npm run build && node scripts/check-stega-leaks.mjs
npm run build && npx wrangler deploy --dry-run --outdir "$(mktemp -d)"
```

Expected: `Equivalent`. The stega check passes and finds the "Marcus Bell"
testimonial on `/`. The Files production build bundles for the Worker:
the dry run ends with `--dry-run: exiting now.`

- [ ] **Step 13: Commit**

```bash
git add -A src scripts .github/workflows/ci.yml
git commit -m "$(cat <<'EOF'
Make Files the default content source

source.ts now selects the Files backend. The preview twins read the
Sanity source directly until PR 4 moves them into the add-on. CaseStudyGrid
and BlogPostGrid fetch from the content interface instead of built-in
samples (src/data/case-studies.ts deleted); /components demos, the
homepage defaults and check:schema follow the sample content. CI builds
Files mode, checks the built content, and still compiles the Sanity source
(test-only until PR 4).

Re-baselined: index.html, components/index.html and
services/kitchen-remodeling/index.html in every parity set (new demos,
sample-content defaults, a review photo).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Editor JSON schemas, documentation and the final gate

Map each data collection's generated JSON Schema in `.vscode/settings.json`,
so content JSON gets autocomplete and live errors. Write the
content-editing guide as a new skill, and bring every doc and skill that
describes content up to date. PR 5 rewrites setup and writes the add-on
docs; this task only fixes what PR 3 made wrong and adds what it made new.

**Files:**

- Modify: `.vscode/settings.json` (`json.schemas`), `.gitignore`
  (`!.claude/skills/content-files`)
- Create: `.claude/skills/content-files/SKILL.md`
- Modify: `CLAUDE.md`, `README.md`, `docs/new-project-checklist.md`
- Modify: `.claude/skills/sanity-and-preview/SKILL.md`,
  `.claude/skills/component-api/SKILL.md`,
  `.claude/skills/component-api/references/layout-and-content.md`,
  `.claude/skills/seo-discoverability/SKILL.md`,
  `.claude/skills/setup/SKILL.md`,
  `.claude/skills/setup/references/no-cms.md`

**Interfaces:**

- Consumes: everything above. The generated schemas live at
  `.astro/collections/<collection>.schema.json`, written by `astro sync`,
  `astro dev`, `astro check` and `astro build`. They were measured in
  Task 3.
- Produces: documentation only.

- [ ] **Step 1: Map the generated schemas**

In `.vscode/settings.json`, add after `"editor.quickSuggestions"`:

```json
  "json.schemas": [
    {
      "fileMatch": ["**/src/content/services/*.json"],
      "url": "./.astro/collections/services.schema.json"
    },
    {
      "fileMatch": ["**/src/content/authors/*.json"],
      "url": "./.astro/collections/authors.schema.json"
    },
    {
      "fileMatch": ["**/src/content/ctas/blog/*.json"],
      "url": "./.astro/collections/blogCtas.schema.json"
    },
    {
      "fileMatch": ["**/src/content/ctas/section/*.json"],
      "url": "./.astro/collections/ctaSections.schema.json"
    },
    {
      "fileMatch": ["**/src/content/settings.json"],
      "url": "./.astro/collections/settings.schema.json"
    },
    {
      "fileMatch": ["**/src/content/case-studies/*.json"],
      "url": "./.astro/collections/caseStudies.schema.json"
    },
    {
      "fileMatch": ["**/src/content/projects/*.json"],
      "url": "./.astro/collections/projects.schema.json"
    },
    {
      "fileMatch": ["**/src/content/gallery.json"],
      "url": "./.astro/collections/gallery.schema.json"
    },
    {
      "fileMatch": ["**/src/content/testimonials/*.json"],
      "url": "./.astro/collections/testimonials.schema.json"
    }
  ]
```

Remember the comma after the `editor.quickSuggestions` object.
`.vscode/settings.json` is already tracked (`git ls-files .vscode`). The
blog's MDX frontmatter is YAML, so it is checked at sync only.

- [ ] **Step 2: Prove every mapping points at a schema that accepts its files**

```bash
npx astro sync
node --input-type=module -e '
import fs from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
const maps = JSON.parse(fs.readFileSync(".vscode/settings.json", "utf8"))["json.schemas"];
const ajv = new Ajv2020({ strict: false, allErrors: true, validateFormats: false });
let files = 0, bad = 0;
for (const { fileMatch: [pattern], url } of maps) {
  const validate = ajv.compile(JSON.parse(fs.readFileSync(url, "utf8")));
  const target = pattern.replace(/^\*\*\//, "");
  const list = target.endsWith("*.json")
    ? fs.readdirSync(target.slice(0, -"/*.json".length)).filter((f) => f.endsWith(".json")).map((f) => target.replace("*.json", f))
    : [target];
  for (const file of list) {
    files++;
    if (!validate(JSON.parse(fs.readFileSync(file, "utf8")))) { bad++; console.log(file, validate.errors); }
  }
}
console.log(bad ? `${bad} file(s) fail their schema` : `schemas OK for ${files} files`);
'
```

Expected: `schemas OK for 20 files`: 2 services, 2 authors, 2 blog CTAs, 2
CTA sections, settings, 3 case studies, 3 projects, the gallery and 4
testimonials. This uses the `ajv` copy already in `node_modules` and adds
no dependency.

- [ ] **Step 3: Write `.claude/skills/content-files/SKILL.md`**

````markdown
---
name: content-files
description: How the site's content works as local files, and how to edit it. Load BEFORE adding or editing a blog post, case study, project, gallery photo, testimonial, author, blog CTA, CTA section or the site CTA defaults — anything under src/content/ (except service pages, which have their own guide) — or when a build fails with a content error ("Content check failed", "does not match collection schema", "must be named in lowercase-kebab-case"), or when wiring a new content type into the Files source (src/lib/content/files/, src/content.config.ts).
---

# Content as files

Every piece of site content lives in `src/content/`, one file per entry, and
is checked when Astro syncs content (`npm run dev`, `check` and `build` all
sync). Pages never read these files directly: they call `@/lib/content`,
whose default backend (`src/lib/content/files/`) maps the entries to view
models. Service pages are content collections too. Their guide is
`component-api` → `references/service-pages.md`.

## Where everything lives

| Content        | File(s)                                | Becomes                                                            |
| -------------- | -------------------------------------- | ------------------------------------------------------------------ |
| Blog post      | `src/content/blog/<slug>.mdx`          | `/blog/<slug>`, cards, category pages, llms files                  |
| Author         | `src/content/authors/<id>.json`        | The byline and photo on posts                                      |
| Blog CTA       | `src/content/ctas/blog/<id>.json`      | The end-of-post CTA, and `<BlogCta id>` inside a post              |
| CTA section    | `src/content/ctas/section/<id>.json`   | The bottom CTA band on blog, case-study and project pages          |
| Site defaults  | `src/content/settings.json`            | Which blog CTA and CTA section a page gets when it names none      |
| Case study     | `src/content/case-studies/<slug>.json` | `/case-studies/<slug>` (unless coming soon), cards, featured strip |
| Project        | `src/content/projects/<slug>.json`     | `/projects/<slug>`, project cards                                  |
| Gallery photos | `src/content/gallery.json` (one array) | `/gallery`, the /projects strip                                    |
| Testimonial    | `src/content/testimonials/<id>.json`   | Testimonial sliders, grids, `<SingleTestimonial name>`             |

Photos go in an `images/` folder beside the entries (`src/content/blog/images/`,
`src/content/projects/images/`, …). Gallery photos go in
`src/content/gallery/images/`, referenced as `"./gallery/images/<file>"`
from `gallery.json`. The schemas are in `src/content.config.ts`. Enums
(categories, industries, photo labels) come from `src/config/blog.ts`,
`src/config/case-studies.ts` and `src/config/projects.ts`; change them
there.

## The rules every file follows

- **The filename is the id and the URL**, in lowercase-kebab-case:
  `smith-kitchen.json`, never `Smith Kitchen.json` (the sync fails, naming
  the file). Other files refer to an entry by this id: `"author":
"jane-doe"`. `gallery.json` items carry an `"id"` instead.
- **Images**: a relative path from the file
  (`"./images/smith-kitchen.webp"`). WebP or AVIF, about 2000px wide.
  Astro resizes them. A missing file fails the sync, naming the file and
  the field.
- **Alt text is required and never empty.** Every image field has a
  partner (`imageAlt`, `alt`, `avatarAlt`). Describe what the photo shows.
- **Dates** are `"YYYY-MM-DD"`. In MDX frontmatter they must be quoted
  (`date: "2026-03-01"`). Unquoted, YAML reads a date object and the sync
  fails, asking you to quote it.
- **Rich text inside JSON is Markdown** (case-study block `body`, project
  `description`, FAQ `answer`): `**bold**`, `*italic*`, `[links](/path)`,
  `- lists`, `### headings`. JSON needs `\n` for line breaks:
  `"body": "### The challenge\n\nFirst paragraph.\n\n- a point"`.
- **Write real typographic punctuation** (’ “ ” —) in prose. Markdown
  converts straight quotes anyway, and the sample content keeps both
  content sources identical this way.

## Blog posts (MDX)

```mdx
---
title: "How to Plan a Kitchen Remodel"
description: "Card excerpt and meta description, 300 characters at most."
date: "2026-04-02"
updated: "2026-04-09" # optional: last real edit (JSON-LD)
categories: ["Guides"] # one or more of BLOG_CATEGORIES
primaryCategory: "Guides" # optional: the /blog section it sits in
image: "./images/kitchen-plan.webp"
imageAlt: "A kitchen floor plan sketched on graph paper"
author: "jane-doe" # src/content/authors/jane-doe.json
featured: false # optional: the /blog hero slider
video: "https://www.youtube.com/watch?v=…" # optional: replaces the hero image
relatedPosts: ["another-post"] # optional, up to 3
cta: "free-estimate" # optional: else settings.json's default
ctaSection: "book-a-call" # optional: else settings.json's default
faqs: # optional: shown under the post + FAQPage JSON-LD
  - question: "How long does it take?"
    answer: "Most kitchens take **four to six weeks**."
seo: # optional overrides
  metaTitle: "…"
  ogImage: "./images/kitchen-plan-og.webp"
---

Opening paragraph.

## A section heading

Body text in Markdown.
```

- **`##` headings build the table of contents.** Their ids are the
  heading text in lowercase-kebab form. Keep them plain words and unique
  within the post, and use `###` for sub-steps.
- **Code**: a fenced block with a language (` ```html `), highlighted
  at build time. There is no filename caption.
- **Images**: `![Alt text](./images/file.webp)` on its own line. There is
  no caption.
- **Components, with no import needed** (BlogBody passes them in). Put
  each tag on its own line:

  ```mdx
  <Callout type="tip">
    Text of the callout. type is "tip", "warning" or "info".
  </Callout>

  <VideoEmbed url="https://www.youtube.com/watch?v=…" caption="What it shows" />

  <BlogCta id="free-estimate" />
  ```

  `<BlogCta id>` names a file in `src/content/ctas/blog/`. An unknown id
  fails the sync.

## Case studies

Required: `title`, `description` (300 characters at most), `client`,
`image` + `imageAlt`, `date`, `categories` and `industries` (from
`src/config/case-studies.ts`). Optional: `updated`, `featured`,
`comingSoon` (needs `liveUrl`; the card links to the live site and no page
is built), `timeline`, `liveUrl`, `galleryImages` (`[{ "src", "alt" }]`,
the hero slider), `ctaSection`, `seo`, and `content`, the body: an array
of blocks, each with a `type`:

| `type`              | Fields                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `richText`          | `body` (Markdown), `maxWidth`?                                                                                      |
| `richTextLeft`      | `body`, `maxWidth`?                                                                                                 |
| `richTextColumns`   | `body`                                                                                                              |
| `richTextWithImage` | `body`, `image`, `imageAlt`, `transparent`?, `objectFit`? (`cover`/`contain`), `aspectRatio`?, `customAspectRatio`? |
| `fullWidthImage`    | `image`, `imageAlt`, `transparent`?, `aspectRatio`?, `customAspectRatio`?                                           |
| `imageGrid`         | `images` (two or more `{ "image", "alt", "transparent"? }`), `aspectRatio`?, `customAspectRatio`?                   |
| `stats`             | `items` (`[{ "value", "label" }]`)                                                                                  |

Every block also takes `sectionSpacing`, `sectionSpacingTop` and
`sectionSpacingBottom` (`none`, `xsmall`, `small`, `main`, `large`).
`aspectRatio` is `auto` (uncropped), `wide`, `widescreen`, `landscape`,
`square`, `portrait` or `tall`. `customAspectRatio` is `"4 / 3"`. The
homepage strip shows the three slugs in `FEATURED_CASE_STUDIES_SLUGS`
(`src/components/sections/CaseStudyFeatured.astro`).

## Projects, gallery, testimonials, authors and CTAs

- **Project**: `title`, `category` (`PROJECT_CATEGORIES` values),
  `heroImage` + `imageAlt` (required). Optional: `location`, `service`,
  `description` (Markdown), `quote` (`{ "text", "name"? }`), `photos`
  (`[{ "src", "alt", "label"? }]`, label `Before`/`During`/`After`),
  `completed`, `featured` (the featured strip shows three), and
  `seoDescription`. Set `seoDescription` when the write-up has several
  paragraphs.
- **Gallery item** (in `gallery.json`): `id`, `image`, `alt`, `caption`
  (60 characters at most), `category`, `added`. Optional: `location`, and
  `project` (a project id, whose title joins the caption).
- **Testimonial**: `name`, `quote`. Optional: `role`, `company`, `avatar`
  (needs `avatarAlt`, usually the name), `website`, `stars` (1–5),
  `featured` (featured sections), `order` (lowest first; default 100).
- **Author**: `name`. Optional: `avatar`, `avatarAlt` (default: the name).
- **Blog CTA**: `heading`, `body` (280 characters at most), `image` +
  `imageAlt`, `aspectRatio` (`portrait` default, `square`, `landscape`),
  `linkUrl`, `linkLabel`.
- **CTA section**: `heading`, `text` (280 characters at most),
  `primaryButtonLabel` + `primaryButtonHref`, `backgroundImage` +
  `imageAlt`. Optional: both `secondaryButtonLabel` and
  `secondaryButtonHref` (set both or neither), and `overlayStrength`
  (0–100, default 80).
- **settings.json**: `{ "site": { "defaultBlogCta": "<id>",
"defaultCtaSection": "<id>" } }`.

## How to…

- **Add a blog post:** copy a file in `src/content/blog/`, rename it to
  the new slug, put its photo in `src/content/blog/images/`, and edit the
  frontmatter and body. It appears on `/blog`, its category pages, the
  sitemap and the llms files on the next build.
- **Add a case study / project / testimonial:** copy a sibling JSON file,
  rename it, swap the photos into the `images/` folder, and edit it.
- **Add a gallery photo:** put the photo in `src/content/gallery/images/`
  and add an object to `gallery.json` with a new `id`.
- **Change the default CTAs:** point `settings.json` at another file in
  `ctas/blog/` or `ctas/section/`.
- **Remove an entry:** delete its file and its photos. If another file
  referenced it, the sync names that file and field; fix or remove the
  reference.

## When the build fails

| Message contains                                               | Fix                                                     |
| -------------------------------------------------------------- | ------------------------------------------------------- |
| `→ heroImage: image file not found: "./images/x.webp"`         | Check the filename and that the photo is in that folder |
| `→ author: no entry "x" (expected src/content/authors/x.json)` | The referenced file is missing or misspelled            |
| `→ body: <BlogCta id="x"> names no entry`                      | Fix the id, or add `src/content/ctas/blog/x.json`       |
| `imageAlt: Alt text can't be empty`                            | Describe the photo                                      |
| `date: Write the date as quoted text`                          | Quote it in the MDX frontmatter                         |
| `categories.0: Invalid option`                                 | Use a value from `src/config/*.ts`, or add it there     |
| `liveUrl: Add liveUrl — a coming-soon case study …`            | Add `liveUrl`, or set `comingSoon` to false             |
| `must be named in lowercase-kebab-case`                        | Rename the file                                         |

`npm run check:content` proves each of these still fails (it writes and
removes temporary `zz-check-*` entries). After a build,
`npm run check:content-build` checks the built pages: coming-soon studies
stay unpublished, OG and JSON-LD images are absolute, local images are
served resized, and table-of-contents links resolve.

## Editor autocomplete for JSON

`.vscode/settings.json` maps each JSON collection to the JSON Schema Astro
generates (`.astro/collections/<name>.schema.json`). VS Code then
suggests fields and flags wrong ones while you type. The schemas appear
after the first `npm run dev`, `npm run check` or `npx astro sync`, and
refresh on every sync. MDX frontmatter is YAML, so it is checked at sync
only.

## Under the hood

- `src/content.config.ts`: the collections. `richText` renders each
  Markdown field to `{ markdown, html, text }` once, at sync
  (`src/lib/content/markdown.ts`, node-only). `checked()`
  (`src/lib/content/checks.ts`) fails the sync on missing images and
  dangling references, which Astro itself only logs.
- `src/lib/content/files/`: the backend (`satisfies ContentSource`). Each
  module maps one content type. `npm run check:boundary` keeps it behind
  `@/lib/content`, and keeps `markdown.ts`/`checks.ts` out of site code.
- **Adding a content type:** define the collection (with `filesIn()` and
  `checked()`), add view models and functions to `ContentSource`
  (`src/lib/content/types.ts`), implement them in a new
  `src/lib/content/files/<type>.ts` wired into `files/index.ts` and
  `src/lib/content/index.ts`, map the JSON Schema in
  `.vscode/settings.json`, and add a case to
  `scripts/check-content-validation.mjs`. The Sanity source needs the same
  functions (`sanity-and-preview` → "Data fetching pattern").
- **The Sanity source** (`src/sanity/lib/source.ts`) is the alternative
  backend. Test builds select it with `CONTENT_SOURCE=sanity` (a build-time
  switch in `astro.config.mjs`, removed when PR 4 turns Sanity into an
  add-on). `compare-dist --equivalent` proves both sources render the
  sample content alike (see `sanity-and-preview` → "Parity and
  preview-safety checks").
````

Add `!.claude/skills/content-files` to `.gitignore` after
`!.claude/skills/seo-discoverability`.

- [ ] **Step 4: CLAUDE.md**

- In the skills table, add a row after `component-api`:
  `| `content-files`| Adding or editing any content under`src/content/` (blog posts, case studies, projects, gallery, testimonials, authors, CTAs), a content build error, or wiring a content type into the Files source |`.
  Then run `npx prettier --write CLAUDE.md` to realign the table.
- In the `sanity-and-preview` row, change "Anything Sanity (queries …" to
  "Anything Sanity — the alternative content source (queries …".
- File structure: change the `lib/` line to
  `├── lib/              # content/ (THE content interface — all content comes from @/lib/content; files/ is the default backend), slots.ts, uid.ts, jsonld.ts, toc.ts, …`.
  Add a line above `├── components/`:
  `├── content/          # Site content as files (one per entry) — see the content-files skill`.
- Anti-patterns: after the Sanity-import bullet, add:
  `- Reading `src/content`with`getCollection()`in a page or component — content comes from`@/lib/content`; the Files backend in `src/lib/content/files/` is the only reader (`check:boundary` enforces it).`
- Verification commands: add `npm run check:content` (bad content must
  fail sync) and `npm run check:content-build` (after a build) to the list.

- [ ] **Step 5: README.md**

- Line 3: replace "built with [Astro](https://astro.build), [Sanity](https://www.sanity.io) (CMS), and deployed to a single [Cloudflare Worker]"
  with "built with [Astro](https://astro.build), with its content in local
  files (Markdown/MDX and JSON; [Sanity](https://www.sanity.io) is the
  optional CMS alternative), and deployed to a single [Cloudflare Worker]".
- Add a section before "## 🏗️ Rendering model":

```markdown
## 📝 Content

Blog posts, case studies, projects, gallery photos, testimonials, authors
and CTAs are files in [`src/content/`](src/content/), one per entry: MDX
for posts, JSON for everything else, with photos in each folder's
`images/`. Every file is validated when the site builds. A missing photo,
empty alt text or a reference to an entry that does not exist fails the
build, naming the file and the field. Edit a file, rebuild, done; no CMS
account or API token involved. The field guide and how-tos are in
[`.claude/skills/content-files/SKILL.md`](.claude/skills/content-files/SKILL.md),
and VS Code autocompletes the JSON fields (`.vscode/settings.json`).
```

- In "Rendering model", replace "(slug-only GROQ queries; helpers exported
  from `src/lib/content`, Sanity implementation in
  `src/sanity/lib/page-data.ts`)" with "(helpers exported from
  `src/lib/content`, read from the files in `src/content/`)", and "the CMS
  content routes" with "the content routes".
- Add `npm run check:content` and `npm run check:content-build` rows to the
  Commands table: "Prove bad content fails the build, naming the file and
  field" and "After a build: check coming-soon studies, OG/JSON-LD image
  URLs, resized local images and TOC anchors".

- [ ] **Step 6: docs/new-project-checklist.md**

After item 9 ("Replace the two sample services …"), add:

```markdown
10. **Replace the sample content** in `src/content/`: blog posts, case
    studies, projects, gallery, testimonials, authors and CTAs, with their
    photos in each folder's `images/`. Update `settings.json` and
    `FEATURED_CASE_STUDIES_SLUGS` (`src/components/sections/CaseStudyFeatured.astro`)
    and the `<SingleTestimonial name>` on the homepage to match. Field guide:
    `.claude/skills/content-files/SKILL.md`. `npm run check:content`
    keeps working with your own content.
```

- [ ] **Step 7: sanity-and-preview skill**

- Directly under `# Sanity, Deployment & Preview`, add:

```markdown
> **Files is the default content source.** `@/lib/content` reads
> `src/content/` (the `content-files` skill). This skill covers the Sanity
> source, `src/sanity/lib/source.ts`, which test builds select with
> `CONTENT_SOURCE=sanity` (a build-time switch in `astro.config.mjs`) and
> which the preview twins import directly. PR 4 moves all of it into an
> opt-in add-on.
```

- In "Data fetching pattern", change "and the one-line backend selector
  `src/lib/content/source.ts`) imports Sanity code" to "and the one-line
  backend selector `src/lib/content/source.ts`) imports Sanity code; the
  Files backend in `src/lib/content/files/` never does".
- In "Adding a new content type with a detail route", add before item 1:
  "Both sources implement every `ContentSource` function. The Files side
  is in the `content-files` skill ('Adding a content type'); the pieces
  below are the Sanity side."
- In "Parity and preview-safety checks":
  - Change "Do it twice: once with `KEEP_DEV_PAGES=1` (no fixtures, the
    empty-site case), once with `KEEP_DEV_PAGES=1 PARITY_FIXTURES=1`" to
    "Sanity builds need `CONTENT_SOURCE=sanity` now that Files is the
    default. Do it twice: once with `KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity`
    (no fixtures, the empty-site case), once adding `PARITY_FIXTURES=1`".
  - Change the preview-safety command to
    `KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity PARITY_FIXTURES=preview npm run build && node scripts/check-stega-leaks.mjs`.
  - Add a bullet after `--layers`:

```markdown
- **Files ≡ Sanity.** `PARITY_FIXTURES=sample` derives GROQ-shaped
  documents from `src/content` at build time (`fixtures/sample.ts`; rich
  text through the strict converter in `fixtures/markdown-to-pt.ts`), so
  the Sanity build renders exactly the Files sample content.
  `node scripts/compare-dist.mjs --equivalent <sanity-build> <files-build>`
  diffs the two, normalising only the documented renderer differences
  (listed in its header). Unit checks for the converter:
  `node scripts/check-fixture-markdown.mjs`.
```

- [ ] **Step 8: component-api, seo-discoverability and setup**

`component-api/SKILL.md`, the directory-map paragraph: change
"`src/components/portabletext/` (Sanity rich-text renderers, used by
`src/components/blog/BlogBody.astro`)" to "`src/components/blog/`
(`BlogBody`, which renders an MDX or Portable Text post body; `Callout` and
`VideoEmbed`, shared by both; `mdx/` holds the MDX-only `pre` and
`<BlogCta id>`), `src/components/portabletext/` (Sanity rich-text renderers,
used by BlogBody)". Change the next sentence to "Content-driven components
take view models and `ContentImage`s from `@/lib/content` — never
collection entries or Sanity data. Plain URL strings for a raw `<img>`,
OG, JSON-LD or a lightbox come from `await resolveImageUrl(image, { width
})`, which sizes local images with getImage()." Add the `content-files`
skill to the "References" table (row: "Editing content files (posts, case
studies, projects, gallery, testimonials, CTAs)").

`component-api/references/layout-and-content.md`, the `<BlogCard>`
paragraph: change "`BlogPostGrid` takes `BlogPostSummary[]`." to
"`BlogPostGrid` takes `BlogPostSummary[]` (fetched with `getBlogPosts()`
when `posts` is omitted); `CaseStudyGrid` likewise takes
`CaseStudySummary[]` or fetches `getCaseStudies()`." Add a short entry
after it:

```markdown
## `<Callout>` and `<VideoEmbed>`

Blog-body components in `src/components/blog/`, used by MDX posts by tag
name (no import) and by the Portable Text renderers. `Callout`: `type`
(`tip` default · `warning` · `info`), content in the slot. `VideoEmbed`:
`url` (YouTube watch/youtu.be/Shorts or Vimeo; anything else renders
nothing), `caption`. Styles live in `src/styles/pages/blog-post.css`.
`Quote` and `Reviews` also take an optional `avatar` (`{ src, alt }` on
Quote; `avatar` + `avatarAlt` on each review).
```

`seo-discoverability/SKILL.md`:

- In "How they stay current", replace the last two sentences, from
  "Bodies arrive as Markdown…" to the end, with: "Bodies arrive as Markdown
  on the view models (`markdown`). The Files source exports an MDX post's
  own Markdown, with components converted or dropped
  (`src/lib/content/files/mdx-text.ts`), and a case study's block Markdown
  as written. The Sanity source converts Portable Text with
  `portableTextToMarkdown()` in `src/sanity/lib/portable-text.ts`."
- In "Validate", change "plus one live sample of each CMS content type" to
  "plus one sample of each content type (the first blog post and the first
  published case study in `src/content/`)".
- Change "**static (non-Sanity) marketing pages are hand-curated**" to
  "**static marketing pages are hand-curated**".

`setup/SKILL.md`: in the table row
`| Case-study + blog fixtures | `src/data/case-studies.ts`, … |`, change the
label to `Sample content` and the files to
`` `src/content/**` (see the content-files skill), `src/components/templates/BlogPostTemplate.astro` ``.

`setup/references/no-cms.md`: replace the bullet that begins
"- `src/lib/content/` and `scripts/check-content-boundary.mjs`" (through
"These are not in the counts above.") with:

```markdown
- **Keep** `src/lib/content/` and `scripts/check-content-boundary.mjs`:
  the content interface now defaults to the Files backend
  (`src/lib/content/files/`, reading `src/content/`), so it outlives
  `src/sanity`. Point `src/lib/content/source.ts` at `./files` if it is
  not already, and drop the Sanity entries from the boundary allow list.
  PR 5 rewrites this file as the Files setup branch.
```

- [ ] **Step 9: Grep for stale claims**

```bash
grep -rn "src/data/case-studies\|samplePosts\|imageUrl(\|from Sanity\|pulled from Sanity" src .claude CLAUDE.md README.md docs scripts | grep -v "^docs/superpowers" | grep -v "InternalLinkMark"
```

Expected: no output. Sort any hit into (a) a real consumer, (b) a
deliberate historical note, or (c) a stale instruction. Fix (a) and (c);
leave (b) only if it says it is historical.

- [ ] **Step 10: Final gate**

```bash
npm run format
npm run format:check
npm run check:config
npm run check            # 0 errors
npm run check:hover
npm run check:boundary
npm run check:content
node scripts/check-fixture-markdown.mjs
KEEP_DEV_PAGES=1 npm run build && npm run check:content-build && node scripts/compare-dist.mjs .parity/files dist/client
KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity npm run build && node scripts/compare-dist.mjs .parity/empty dist/client
KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity PARITY_FIXTURES=1 npm run build && node scripts/compare-dist.mjs .parity/fixtures dist/client
KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity PARITY_FIXTURES=sample npm run build && node scripts/compare-dist.mjs .parity/sample dist/client
node scripts/compare-dist.mjs --equivalent .parity/sample .parity/files
KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity PARITY_FIXTURES=preview npm run build && node scripts/check-stega-leaks.mjs
npm run build && ls dist/server/chunks | grep -ci fixture; npx wrangler deploy --dry-run --outdir "$(mktemp -d)"
```

Expected: every command passes, with `Identical` four times and
`Equivalent` once. The `grep -ci fixture` prints `0`: no parity fixture
ships in a production build. The dry run ends `--dry-run: exiting now.`
If `npm run format` changed an `.astro` file, rerun the parity lines
(Prettier must not move whitespace inside rendered markup). If it did, fix
the source formatting rather than re-baselining.

- [ ] **Step 11: Commit**

```bash
git add .vscode/settings.json .gitignore .claude/skills CLAUDE.md README.md docs/new-project-checklist.md
git add -u
git commit -m "$(cat <<'EOF'
Document content-as-files; map the collection JSON Schemas in VS Code

New content-files skill: where every content type lives, file and image
rules, MDX components, how-tos and the build errors with their fixes.
VS Code maps each JSON collection to Astro's generated JSON Schema.
README, CLAUDE.md, the new-project checklist and the sanity-and-preview,
component-api, seo-discoverability and setup skills now describe Files as
the default source.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```
