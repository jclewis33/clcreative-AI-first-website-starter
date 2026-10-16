# Files-first content, Sanity as an add-on — design

**Date:** 2026-10-16 · **Status:** approved in conversation, pending spec review

## Goal

New projects forked from this starter use **local files** for content by
default: Astro content collections, with MDX for long-form writing and JSON for
structured page data. Sanity becomes an **opt-in add-on** chosen during setup.
It is not present in a project unless chosen.

**Why:** handing a finished site to a client (the home-services offer) should
need nothing more than transferring the GitHub repo or a zip. The new owner runs
`npm install && npm run build` with no Sanity account, API tokens or webhooks.

### Success criteria

1. A fresh fork set up in **Files** mode contains no Sanity code, packages,
   config or env vars. Every content page (blog, blog categories, case studies,
   projects, gallery, testimonials sections) renders from sample content.
2. The same fork set up in **Sanity** mode behaves as the starter does today,
   minus the glossary.
3. Templates, cards and sections never know which source is active: both modes
   render identical markup for identical content.
4. Every content file is schema-validated at build time. Bad content fails the
   build with a message naming the file and the field.
5. CI proves both modes compile and build on every PR.

### Out of scope

- A git-based visual editor for non-technical clients (Keystatic, Pages CMS,
  Decap). These can be layered onto the collections later with no lock-in.
- Migrating existing file content into Sanity when a Files project adopts the
  add-on later.
- Hover preview cards on internal links in Markdown. They are plain links in
  Files mode.

## Decisions (from brainstorming)

| Decision           | Choice                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Content types      | Blog (with authors, CTAs, FAQs), case studies, projects, gallery, testimonials                                                             |
| Glossary           | **Removed entirely** (both modes)                                                                                                          |
| Testimonial images | Optional headshot/avatar (testimonials and service-page `reviews`)                                                                         |
| Default mode       | Files. Sanity is an add-on                                                                                                                 |
| Add-on mechanism   | `addons/sanity/` overlay folder + `npm run addon:sanity` installer (not a config switch, not a branch)                                     |
| Format rule        | Long-form writing → MDX; structured page data → JSON (matches the existing `services` collection); rich text inside JSON → Markdown string |
| Sample content     | Ported from existing placeholders (`src/data/case-studies.ts`, `BlogPostGrid` samples), which are then deleted                             |

## Architecture

### The content interface

`src/lib/content/` is the **only** module pages, templates and sections use
to get content.

```
src/lib/content/
├── types.ts      # View-model types + the ContentSource interface
├── index.ts      # Public API — re-exports from ./source
├── source.ts     # ONE line: export { default } from "./files" (the add-on overwrites it to "./sanity")
├── files/        # Collections-backed implementation (Files mode)
└── markdown.ts   # Build-time Markdown-string → HTML (for rich text inside JSON)
```

`ContentSource` exposes (names final in the plan):

- `getBlogPosts()`, `getBlogPost(slug)` (with related posts and the resolved CTA
  and CTA section), `getBlogCategories()`, `getBlogPostsByCategory(slug)`
- `getCaseStudies()`, `getCaseStudy(slug)` (with up-next studies),
  `getFeaturedCaseStudies()`
- `getProjects()`, `getProject(slug)` (with related projects),
  `getFeaturedProjects()`, `getGallery()`
- `getTestimonials({ featured?, limit? })`, `getTestimonialByName(name)`
- `getCtaDefaults()`
- `get*StaticPaths()` helpers for each detail route, in an imported module
  (Astro extracts `getStaticPaths` into its own chunk)

All of them return **plain view models**:

- Images are `ImageMetadata` (Files) or a URL string with width, height and
  focal point (Sanity), behind one `ContentImage` type that `Visual` already
  accepts.
- Rich text is pre-rendered. The blog body is a renderable `Content` component
  plus `headings`, `readTime` and a plain-text/Markdown export for
  `llms-full.txt`.
- No Sanity types, `urlFor`, `stegaClean` or `hotspotPosition` cross this
  boundary. Today about 25 consumer files import those directly. All of them
  move behind the interface.

The Sanity implementation (`src/sanity/lib/source.ts`, shipped in the add-on)
maps GROQ results into the same view models.

**Blog body rendering in Sanity mode.** The Files blog body is an MDX `Content`
component; Sanity's body is Portable Text. The view model carries the body as a
discriminated union:

- `{ kind: "mdx", Content }`
- `{ kind: "portable-text", blocks }`

A single `BlogBody.astro` renders either. The Portable Text branch and its
`astro-portabletext` components live only in the add-on. Files mode ships a
`BlogBody.astro` without that branch, and the add-on overwrites it. FAQ answers
and other short rich text are pre-rendered HTML strings in both modes.

### CMS seams (replaceable files)

Sanity is currently wired into shared code in five places. Each becomes a small
file the add-on **overwrites wholesale**, so installing the add-on never
search-and-replaces inside source:

| Seam               | Files-mode version                                | Add-on version                                                      |
| ------------------ | ------------------------------------------------- | ------------------------------------------------------------------- |
| Content source     | `src/lib/content/source.ts` → `./files`           | → Sanity implementation                                             |
| Astro integrations | `src/config/cms.mjs` exports `integrations: []`   | `react()`, `sanity({...})`, remote image pattern, vite optimizeDeps |
| Preview security   | `src/config/cms.mjs` exports `frameAncestors: []` | Sanity Studio origins; `middleware.ts` reads it                     |
| Visual editing     | `src/components/global/CmsEditing.astro` (empty)  | Draft-mode island + `perspectiveCookieName` handling                |
| Sanity ids         | absent from `site.shared.mjs`                     | `src/config/sanity.shared.mjs`; `wrangler.jsonc` vars added         |

`astro.config.mjs`, `BaseLayout.astro` and `middleware.ts` import these seams
and never mention Sanity.

### The add-on (`addons/sanity/`)

```
addons/sanity/
├── manifest.json   # deps, devDeps, scripts to merge into package.json; wrangler vars
├── files/          # overlay — mirrors repo paths; copied over the top
│   ├── src/sanity/**                        (schema, queries, loaders, studio components, source.ts)
│   ├── src/lib/content/source.ts            (→ Sanity)
│   ├── src/config/cms.mjs, src/config/sanity.shared.mjs
│   ├── src/components/global/CmsEditing.astro, src/components/blog/BlogBody.astro
│   ├── src/components/portabletext/**, src/components/SanityVisualEditing.tsx, DisableDraftMode.tsx
│   ├── src/pages/preview/**, src/pages/api/draft-mode/**
│   ├── sanity.config.ts, sanity.cli.ts, sanity-typegen.json
│   └── workers/rebuild-debounce/**
└── README.md
```

- `npm run addon:sanity` (`scripts/addon-sanity.mjs`, zero dependencies) copies
  the overlay, merges `manifest.json` into `package.json` and `wrangler.jsonc`,
  and prints the next steps (`npm install`, then the Sanity setup steps). It
  refuses to run twice, and it refuses on a dirty git tree unless given `--force`.
- `addons/` is excluded from `tsconfig` and Astro's build (it is still
  Prettier-formatted, and type-checked by the add-on CI job).
- React (`react`, `react-dom`, `@astrojs/react`, `@types/react*`) is used only by
  the Sanity islands, so it moves into the add-on manifest.

### Setup

`npm run setup` and the `/setup` skill ask: **Content source — Files (default)
or Sanity?**

- **Files:** delete `addons/` and the Sanity-only setup prompts. Done.
- **Sanity:** run `addon:sanity`, then the existing Sanity branch
  (`references/sanity.md`: project, Studio, token, CORS, rebuild webhook).

`.claude/skills/setup/references/no-cms.md` is rewritten as the Files branch
(the current "Option A / Option B" strip-out text is obsolete).

**Adopting Sanity later:** copy `addons/sanity/` from the starter repo and run
the command. This is documented in the add-on README.

## Content formats

All collections are defined in `src/content.config.ts`. Images live in each
collection's `images/` folder and are referenced by relative path through
`image()`. Alt text uses the existing non-empty `alt` validator. Filenames are
lowercase-kebab slugs, enforced by `generateId` as `services` does.

| Collection     | Path                                   | Loader | Key fields                                                                                                                                                                                                                                                                                        |
| -------------- | -------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `blog`         | `src/content/blog/<slug>.mdx`          | glob   | title, description (≤300), date, categories (enum, ≥1), primaryCategory?, image, imageAlt, author → `reference("authors")`, featured, video?, relatedPosts → `reference("blog")[]`, faqs[{question, answer (md)}], cta? → `reference("blogCtas")`, ctaSection? → `reference("ctaSections")`, seo? |
| `authors`      | `src/content/authors/<id>.json`        | glob   | name, avatar?, avatarAlt?                                                                                                                                                                                                                                                                         |
| `blogCtas`     | `src/content/ctas/blog/<id>.json`      | glob   | heading, body (≤280), image, imageAlt, aspectRatio (enum), linkUrl, linkLabel                                                                                                                                                                                                                     |
| `ctaSections`  | `src/content/ctas/section/<id>.json`   | glob   | heading, text (≤280), primary/secondary button label + href, backgroundImage, imageAlt, overlayStrength (0–100)                                                                                                                                                                                   |
| `settings`     | `src/content/settings.json`            | file   | defaultBlogCta → reference, defaultCtaSection → reference                                                                                                                                                                                                                                         |
| `caseStudies`  | `src/content/case-studies/<slug>.json` | glob   | title, description, client, image, imageAlt, date, featured, comingSoon (+ liveUrl required when true, via `superRefine`), categories, industries, timeline, galleryImages[{src, alt}], `content` block list (below), ctaSection?, seo?                                                           |
| `projects`     | `src/content/projects/<slug>.json`     | glob   | title, category (enum from `PROJECT_CATEGORIES`), location?, service?, description (md), quote?{text, name}, heroImage, imageAlt, photos[{src, alt, label?: Before/During/After}], completed?, featured, seoDescription?                                                                          |
| `gallery`      | `src/content/gallery.json`             | file   | entries[{image, alt, caption (≤60), category (enum), location?, project? → `reference("projects")`, added}]                                                                                                                                                                                       |
| `testimonials` | `src/content/testimonials/<id>.json`   | glob   | name, role?, company?, quote, avatar?, avatarAlt? (required when avatar is set), website?, stars? (1–5), featured, order                                                                                                                                                                          |

- **Case-study `content` blocks** are a discriminated union on `type`:
  `richText`, `richTextLeft`, `richTextColumns`, `richTextWithImage`,
  `fullWidthImage`, `imageGrid` and `stats`. They carry the same fields as the
  current Sanity blocks, including the `sectionSpacing*` fields. `body` fields
  are Markdown strings rendered to HTML at build time, and the result feeds the
  existing `CaseStudyBlockRenderer` unchanged.
- **Blog MDX body:** standard Markdown, fenced code blocks with Shiki, and local
  images. `<Callout type>`, `<VideoEmbed url>` and `<BlogCta id>` are provided
  through `<Content components={...} />`, so authors write no imports.
  `@astrojs/mdx` is added. h2 slugs feed the table of contents; read time is
  computed from the raw body.
- **Service `reviews`** (existing `services` schema) gain optional
  `avatar` and `avatarAlt`.
- **Gallery `file()` + `image()`:** if `image()` does not resolve inside a
  `file()` loader on the installed Astro version, the fallback is a glob of
  one JSON file per gallery item. This is verified in PR 3 before content is
  written.

## Type safety

- **Zod schemas** validate every content file at build. Astro generates
  `CollectionEntry<…>` types from them, so content access is typed. `reference()`
  fields fail the build when they point at a missing entry.
- **Editor checking for JSON:** Astro's generated JSON Schemas for data
  collections (`.astro/collections/*.schema.json`) are mapped in
  `.vscode/settings.json` (`json.schemas`), which gives autocomplete and live
  errors while editing content JSON. MDX frontmatter is checked at build only.
- **`ContentSource` interface:** both implementations are declared
  `satisfies ContentSource` with named view-model types. Any shape drift
  between Files and Sanity fails `npm run check`.
- **Components:** typed Props, named type aliases, `docs` JSDoc, and
  `check:hover`, per CLAUDE.md. This includes the MDX components and the
  case-study blocks.
- **Sanity side:** keeps TypeGen-generated types internally and maps them to
  view models at the boundary.
- **Non-TS files:** `astro.config.mjs`, `cms.mjs`, `setup.mjs` and
  `addon-sanity.mjs` stay `.mjs` (config/script context) with `// @ts-check` and
  JSDoc types.
- **Known gap:** Markdown text inside JSON is validated for presence and length
  only. Its formatting is not type-checked.

## Glossary removal

The glossary is deleted outright:

- routes, including the preview twin
- `GlossaryTermTemplate`, `glossary.css` and the schema type
- its queries, loaders, `resolve.ts` / `internal-links.ts` entries and the `internalLink` target
- JSON-LD helper, `llms*.txt` sections, `site-structure.ts` nav and footer entries
- `check-schema.mjs` sample, `migrate-webflow-glossary.mjs`
- all docs and skill mentions (full hit list in the PR 1 plan)

## Delivery: five PRs, each building green

1. **Remove the glossary.**
2. **Introduce the content interface, Sanity-backed.** This is a pure refactor:
   consumers move to `src/lib/content`, and rendered output is unchanged.
3. **Files backend.** Collections, schemas, sample content, the MDX components
   and `BlogBody`, and the `.vscode` JSON-schema mapping. Files becomes the
   default source.
4. **Sanity add-on.** Move the Sanity code into `addons/sanity/`, create the CMS
   seams, write the installer, integrate setup, and add the CI add-on job.
   React moves to the add-on.
5. **Docs and skills.** `setup` (+ `no-cms.md` rewritten as the Files branch),
   `sanity-and-preview` (framed as the add-on), `component-api`,
   `seo-discoverability`, CLAUDE.md, the new-project checklist, and the README
   handoff section.

## Testing

- **Default CI (Files mode):** `check`, `check:hover`, `check:config`,
  `format:check`, `build`, and `check:schema` against the built site.
- **Add-on CI job:**
  1. Copy the repo to a scratch directory and run `addon:sanity`.
  2. Run `npm install`, then `check` and `build`. The build uses the placeholder
     project id, which the existing guard turns into empty content.
- **Visual parity, checked with Playwright screenshots of the homepage, blog
  index, a post, a category, the case-study index and detail, the projects
  index and detail, and the gallery:**
  - PR 2: before and after must match.
  - PR 3: the Files and Sanity renders of equivalent content must match.
- **Negative content checks (PR 3):** a missing image, an empty alt, a bad
  category enum, a dangling author/related/CTA reference, and `comingSoon`
  without `liveUrl` each fail `astro build` with a readable error.
- **Add-on installer:** refuses a second run and refuses a dirty tree; the
  installed `package.json` and `wrangler.jsonc` match the expected merge.
