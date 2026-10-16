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
"priya-shah"`. `gallery.json` items carry an `"id"` instead.
- **Images**: a relative path from the file
  (`"./images/smith-kitchen.webp"`). WebP or AVIF, about 2000px wide.
  Astro resizes them. A missing file fails the sync, naming the file and
  the field.
- **Crops are centred.** Wherever a photo is cut to a fixed shape (social
  share images at 1200×630, card and slider ratios, round avatars), the
  middle of the photo is kept; files have no focal point. Keep the subject
  centred.
- **Headshots are square.** Author and testimonial avatars are cropped to a
  small square (64–256px) from the centre, so supply a square photo with
  the face in the middle, at least 512px on each side.
- **Alt text is required and never empty.** Every image field has a
  partner (`imageAlt`, `alt`, `avatarAlt`). Describe what the photo shows.
- **Dates** are `"YYYY-MM-DD"`. In MDX frontmatter they must be quoted
  (`date: "2026-03-01"`). Unquoted, YAML reads a date object and the sync
  fails, asking you to quote it.
- **Rich text in data fields is Markdown** (case-study block `body`,
  project `description`, a blog post's FAQ `answer`): `**bold**`,
  `*italic*`, `[links](/path)`, `- lists`, `### headings`. JSON needs `\n`
  for line breaks:
  `"body": "### The challenge\n\nFirst paragraph.\n\n- a point"`. In MDX
  frontmatter, a multi-line answer uses a YAML block (`answer: |`).
- **No images inside rich-text fields.** `![alt](./images/x.webp)` works
  in a blog post's body only. Inside a JSON rich-text field (or a FAQ
  answer) the path is not checked or processed and the image would break,
  so use the image fields and blocks instead (`richTextWithImage`,
  `fullWidthImage`, `imageGrid`, project `photos`).
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
author: "priya-shah" # src/content/authors/priya-shah.json
featured: false # optional: the /blog hero slider
video: "https://www.youtube.com/watch?v=…" # optional: replaces the hero image
relatedPosts: ["another-post"] # optional, up to 3
cta: "free-site-review" # optional: else settings.json's default
ctaSection: "start-a-project" # optional: else settings.json's default
faqs: # optional: shown under the post + FAQPage JSON-LD
  - question: "How long does it take?"
    answer: "Most kitchens take **four to six weeks**."
seo: # optional overrides, every field optional
  metaTitle: "…"
  metaDescription: "…"
  ogTitle: "…"
  ogDescription: "…"
  ogImage: "./images/kitchen-plan-og.webp"
---

Opening paragraph.

## A section heading

Body text in Markdown.
```

- **`##` headings build the table of contents.** Their ids are the
  heading text in lowercase-kebab form. Keep them plain words and unique
  within the post, and use `###` for sub-steps.
- **The hero `video`** must be a YouTube `watch?v=` or `youtu.be` link.
  Shorts and Vimeo links do not embed there; put those in the body with
  `<VideoEmbed>`.
- **Code**: a fenced block with a language (` ```html `), highlighted
  at build time. There is no filename caption.
- **Images**: `![Alt text](./images/file.webp)` on its own line. There is
  no caption. A missing file fails the sync, naming the post.
- **Components, with no import needed** (BlogBody passes them in). Put
  each tag on its own line (a long self-closing tag may wrap its
  attributes over several lines):

  ```mdx
  <Callout type="tip">
    Text of the callout. type is "tip", "warning" or "info".
  </Callout>

  <VideoEmbed url="https://www.youtube.com/watch?v=…" caption="What it shows" />

  <BlogCta id="free-site-review" />
  ```

  - **`<VideoEmbed url>`** takes a YouTube link (`youtube.com/watch?v=…`,
    `youtu.be/…`, `youtube.com/shorts/…`) or a Vimeo link
    (`vimeo.com/<number>`, `player.vimeo.com/video/<number>`). Any other
    URL renders nothing (`npm run dev` prints a warning); the build does
    not fail. `caption` is optional and also titles the player.
  - **`<BlogCta id>`** names a file in `src/content/ctas/blog/`. Write the
    id as a literal in double quotes, `id="free-site-review"`: that is the
    form the sync checks, and an unknown id then fails it, naming the post.
    Any other form (`id='…'`, `id={…}`) skips the check and fails the
    build later, at render, without naming the post. A tag inside fenced
    code is only a code sample and is not checked or rendered.

## Case studies

Required: `title`, `description` (300 characters at most), `client`,
`image` + `imageAlt`, `date`, `categories` and `industries` (from
`src/config/case-studies.ts`). Optional: `updated`, `featured`,
`comingSoon` (needs `liveUrl`; the card links to the live site and no page
is built), `timeline`, `liveUrl`, `galleryImages` (`[{ "src", "alt" }]`,
the hero slider), `ctaSection`, `seo` (the same fields as a post's), and
`content`, the body: an array of blocks, each with a `type`:

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
`maxWidth` is one of `20ch`, `30ch`, `40ch`, `48ch`, `60ch`, `48rem`,
`60rem`, `100%`. `aspectRatio` is `auto` (uncropped), `wide`,
`widescreen`, `landscape`, `square`, `portrait` or `tall`.
`customAspectRatio` is `"4 / 3"`. The homepage strip shows the three slugs
in `FEATURED_CASE_STUDIES_SLUGS`
(`src/components/sections/CaseStudyFeatured.astro`). Case-study grids show
only studies that have an `image` (every Files study does: it is
required).

## Projects, gallery, testimonials, authors and CTAs

- **Project**: `title`, `category` (`PROJECT_CATEGORIES` values:
  `residential`, `commercial`, `remodel`, `repair`), `heroImage` +
  `imageAlt` (required). Optional: `location`, `service`, `description`
  (Markdown), `quote` (`{ "text", "name"? }`), `photos`
  (`[{ "src", "alt", "label"? }]`, label `Before`/`During`/`After`),
  `completed`, `featured` (the featured strip shows three), and
  `seoDescription`. Set `seoDescription` when the write-up has several
  paragraphs.
- **Gallery item** (in `gallery.json`): `id`, `image`, `alt`, `caption`
  (60 characters at most), `category`, `added`. Optional: `location`, and
  `project` (a project id, whose title joins the caption).
- **Testimonial**: `name`, `quote`. Optional: `role`, `company`, `avatar`
  (a square headshot; needs `avatarAlt`, usually the name), `website`,
  `stars` (1–5), `featured` (featured sections), `order` (lowest first;
  default 100).
- **Author**: `name`. Optional: `avatar` (a square headshot), `avatarAlt`
  (default: the name).
- **Blog CTA**: `heading`, `body` (280 characters at most), `image` +
  `imageAlt`, `aspectRatio` (`portrait` default, `square`, `landscape`),
  `linkUrl` (a site path like `/contact` or a full URL), `linkLabel`.
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
- **Add a project with photos:** copy a file in `src/content/projects/`
  and rename it to the new slug. Put the photos in
  `src/content/projects/images/`, then set `heroImage` + `imageAlt` and
  list the others in `photos`, each with its own `alt` (and a `label` for
  before/after shots). The page is `/projects/<slug>`.
- **Add a testimonial with a headshot:** put a square photo in
  `src/content/testimonials/images/`, copy a file in
  `src/content/testimonials/`, rename it, and set `avatar`
  (`"./images/<file>"`) and `avatarAlt` (the person's name). Set
  `featured` to add it to the homepage testimonial showcase, or point
  `<SingleTestimonial name>` in `src/pages/index.astro` at its `name`.
- **Add a case study:** copy a sibling JSON file, rename it, swap the
  photos into `src/content/case-studies/images/`, and edit it.
- **Add a gallery photo:** put the photo in `src/content/gallery/images/`
  and add an object to `gallery.json` with a new `id`.
- **Change the default CTAs:** point `settings.json` at another file in
  `ctas/blog/` or `ctas/section/`.
- **Remove an entry:** delete its file and its photos. If another file
  referenced it, the sync names that file and field; fix or remove the
  reference.

## When the build fails

The error names the file, then lists each problem as `field: message`.

| Message contains                                               | Fix                                                     |
| -------------------------------------------------------------- | ------------------------------------------------------- |
| `→ heroImage: image file not found: "./images/x.webp"`         | Check the filename and that the photo is in that folder |
| `→ author: no entry "x" (expected src/content/authors/x.json)` | The referenced file is missing or misspelled            |
| `→ body: <BlogCta id="x"> names no entry`                      | Fix the id, or add `src/content/ctas/blog/x.json`       |
| `imageAlt: Alt text can't be empty`                            | Describe the photo                                      |
| `title: Required` (any field name)                             | Add the missing required field                          |
| `date: Write the date as quoted text`                          | Quote it in the MDX frontmatter                         |
| `categories.0: Invalid option: expected one of …`              | Use a listed value, or add it in `src/config/*.ts`      |
| `liveUrl: Add liveUrl — a coming-soon case study …`            | Add `liveUrl`, or set `comingSoon` to false             |
| `avatarAlt: Add avatarAlt …`                                   | Add the alt text (usually the person's name)            |
| `must be named in lowercase-kebab-case`                        | Rename the file                                         |

`npm run check:content` proves each of these still fails (it writes and
removes temporary `zz-check-*` entries), and unit-tests the Markdown and
MDX text helpers. After a build, `npm run check:content-build` checks the
built pages: coming-soon studies stay unpublished, OG and JSON-LD images
are absolute, local images are served resized, and table-of-contents links
resolve. CI runs both.

## Editor autocomplete for JSON

`.vscode/settings.json` maps each JSON collection to the JSON Schema Astro
generates (`.astro/collections/<name>.schema.json`). VS Code then
suggests fields and flags wrong ones while you type. The schemas appear
after the first `npm run dev`, `npm run check` or `npx astro sync`, and
refresh on every sync. The editor checks the shape only: missing photos
and broken references are caught at sync. MDX frontmatter is YAML, so it
is checked at sync only.

## Under the hood

- `src/content.config.ts`: the collections. `richText` renders each
  Markdown field to `{ markdown, html, text }` once, at sync
  (`src/lib/content/markdown.ts`, node-only). `checked()`
  (`src/lib/content/checks.ts`) fails the sync on missing images, dangling
  references and unknown inline `<BlogCta id>` targets, which Astro itself
  only logs or defers.
- `src/lib/content/files/`: the backend (`satisfies ContentSource`). Each
  module maps one content type. `npm run check:boundary` keeps it behind
  `@/lib/content` (only the MDX body components in
  `src/components/blog/mdx/` read it directly), and keeps
  `markdown.ts`/`checks.ts` out of site code.
- **Blog body styles.** The Callout, code block and table-of-contents
  styles (`callout_*`, `code_block_*`, `toc_*`) live in
  `src/styles/pages/blog-post.css`, imported by `BlogPostTemplate`. A page
  that uses those components outside the post template must import that
  stylesheet too (as `src/pages/components.astro` does). Moving them into
  their components is deliberately deferred.
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
