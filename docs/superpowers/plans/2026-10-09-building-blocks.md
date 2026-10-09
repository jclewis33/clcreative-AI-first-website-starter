# Building Blocks, Projects & Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port Way Construction's ten generic UI components, plus its Sanity-backed projects portfolio and photo gallery, into the starter as client-neutral templates. Also fix the starter's build-time Sanity token bug.

**Architecture:** Most of the work is copy-then-audit from `~/Documents/GitHub/way-construction` (branch `build/way-site`; read it with plain file reads and do not switch branches). Way was forked from this starter and only _adds_ to the shared Sanity files. Projects and gallery follow the starter's documented content-type pattern (`sanity-and-preview` skill):

- a schema type
- `defineQuery` queries, followed by typegen
- a `page-data.ts` loader
- a prerendered route plus a `/preview` SSR twin
- a Presentation location
- a desk entry

**Tech Stack:** Astro 7 (static, `@astrojs/cloudflare`), Sanity 6 + TypeGen, plain CSS cascade layers, TypeScript.

**Spec:** `docs/superpowers/specs/2026-10-09-building-blocks-design.md`

## Global Constraints

- Follow CLAUDE.md in full:
  - Classes: custom class first; `_wrap` root; at most 4 utilities per element.
  - CSS: `<style is:global>` + `@layer components`; no `px`; tokens only; hover styles behind `@media (hover: hover)`.
  - Props: a `docs` prop; a `render` prop; named prop types; DEV `console.warn` (never throw); prop order `docs, render, content, variant, settings, class, ...rest`.
  - Imports use `@/`.
- **No Way-specific content anywhere:**
  - none of "Way", "Red Oak", "DFW", "TX" / ", TX", "Texas"
  - no Way categories (fire-smoke, water-damage, storm-roofing) and no Way service slugs
  - Check with `grep -rniE "red oak|dfw|, TX|texas|way construction|fire-smoke|water-damage|storm-roofing" src docs .claude`. The only allowed hits are in this plan, the spec, and the `location` field description example.
- Every image has real alt text, never `alt=""` (CLAUDE.md).
- Sanity:
  - every query lives in `src/sanity/lib/queries.ts` inside `defineQuery()`;
  - every image alt is projected as `coalesce(<placement alt>, <image>.asset->altText, "")`;
  - run `npm run typegen` after any schema or query change;
  - never import `sanity/*` from site code.
- Fresh-fork safety: listing loaders return `[]` on the placeholder project id; detail routes produce zero paths.
- Do not port Way's design changes (Card, FAQ, Carousel, Navbar, Visual, `bone` theme) or Way's `CREATABLE_TYPES` desk lockdown.
- After each task, run `npm run check`; it must report 0 errors. Commit at the end of each task. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Fresh fork with no Sanity.** `npm run build` with the placeholder project id must succeed: `/projects` and `/gallery` show empty states, and `/projects/[slug]` has zero paths. Task 7 verifies this.
2. **Project with no `photos`, no `quote` or no `description`.** The template must omit those sections, not render empty headings or a broken Lightbox. Task 6 renders the template from a fixture with those fields null.
3. **Gallery item whose `project` reference is deleted (null) or whose `location` is empty.** The caption must still render, with no "undefined" and no dangling separator. Task 6 covers the caption builder.
4. **Category value in Sanity no longer in `src/config/projects.ts`** (the client renamed a category). Filters and badges must fall back to the raw value, not crash or show blank. `categoryTitle()` returns its input when unknown; the Task 5 fixture covers it.
5. **Lightbox with triggers hidden by a filter.** Prev/next must skip hidden photos. Way's Lightbox already handles this; the Task 4 demo includes a hidden trigger to confirm.

---

### Task 1: Fix the build-time Sanity read token

**Files:**

- Modify: `src/sanity/lib/load-query.ts`
- Modify: `src/pages/api/draft-mode/enable.ts`

**Why:** `import.meta.env.SANITY_API_READ_TOKEN` is replaced at build time, but a Worker secret only exists at runtime. On a deployed Worker the token is therefore `undefined`, which breaks draft preview. `getSecret()` from `astro:env/server` reads the Cloudflare binding at runtime, and `.env` locally. This is copied from Way's fix.

- [ ] **Step 1: Edit `load-query.ts`**
  - Add `import { getSecret } from "astro:env/server";` after the `sanity:client` import.
  - Delete the module-level `const token = import.meta.env.SANITY_API_READ_TOKEN;`.
  - Directly after `const draftMode = perspectiveCookie ? true : false;`, add:

```ts
/* Read per request, not at build: `import.meta.env` is replaced at build
     time, and the Worker secret only exists at runtime. getSecret() reads
     the Cloudflare binding on the Worker and .env / process.env locally. */
const token = draftMode ? getSecret("SANITY_API_READ_TOKEN") : undefined;
```

- [ ] **Step 2: Edit `enable.ts`**
  - Add `import { getSecret } from "astro:env/server";`.
  - Replace `const token = import.meta.env.SANITY_API_READ_TOKEN;` with:

```ts
/* Runtime read — see load-query.ts. */
const token = getSecret("SANITY_API_READ_TOKEN");
```

- [ ] **Step 3: Verify**
  - Run `npm run check`: 0 errors.
  - Run `npm run build`: it succeeds.
  - Run `grep -rn "import.meta.env.SANITY_API_READ_TOKEN" src`: no output.
  - Update the token line in the `sanity-and-preview` skill's "Required env vars" table to mention runtime `getSecret`.
- [ ] **Step 4: Commit:** `git commit -am "Read the Sanity token at runtime so draft preview works on Workers"`

---

### Task 2: Text and list building blocks: SectionHeader, CheckList, ChipList, StepList, Quote

**Files:**

- Create: `src/components/ui/{SectionHeader,CheckList,ChipList,StepList,Quote}.astro`, each copied from the same path in Way.
- Modify: `src/styles/variables/typography.css` (token; see Task 4, but add it here if any of these files uses it).
- Modify: `src/pages/components.astro` (demos + `COMPONENT_INDEX`).

**Interfaces (used by later tasks):**

- `SectionHeader`: `eyebrow?`, `heading`, `intro?`, `tag?`, `size?`, plus a named `action` slot.
- `CheckList`: `items: string[]`, `variant?: "ruled" | "plain"`, `columns?: 1 | 2`.
- `ChipList`: `items: { label: string; href?: string; key?: string }[]`.
- `StepList`: `steps: { title: string; text: string }[]`, `variant?: "list" | "cards"`.
- `Quote`: `text`, `name?`, `meta?`, `size?: "band" | "large" | "regular" | "small"`, `mark?: "icon" | "none"`, `spread?`.

- [ ] **Step 1: Copy the five files verbatim**

```bash
W=~/Documents/GitHub/way-construction/src/components/ui
for c in SectionHeader CheckList ChipList StepList Quote; do cp "$W/$c.astro" src/components/ui/; done
```

- [ ] **Step 2: Audit each file against the Global Constraints**
  - Look for Way copy in JSDoc `@example` blocks; replace it with neutral copy such as "Our process".
  - Confirm `docs` and `render` props exist, types are named, there are no `px` units and hover styles are gated.
  - Fix anything that fails in place.
- [ ] **Step 3: Add demos to `src/pages/components.astro`**
  - Add `COMPONENT_INDEX` entries: `section-header`, `check-list`, `chip-list`, `step-list`, `quote`.
  - Add one `<Section id="…">` per component after the `lead-form` section if it exists, else after `forms`. Follow the page's convention: eyebrow = component name, h2 = one-line description.
  - Each demo shows every variant. For example, Quote shows all four sizes; StepList shows both `list` and `cards`.
  - Use neutral sample copy, for example:
    - CheckList: `["Free estimates", "Licensed and insured", "Clean job sites", "Warranty on all work"]`
    - StepList: Call → Inspect → Plan → Build, each with a one-line text.
- [ ] **Step 4: Verify**
  - Run `npm run check`: 0 errors.
  - Run `npm run check:hover`: passes. A newly documented prop failing means the Props type is detached; look for a stray `<` or `>` in a frontmatter comment.
  - Start `npm run dev` and screenshot `/components#quote` and `#step-list` at 1440 and 390. Check: no horizontal scroll, no overflow.
- [ ] **Step 5: Commit:** `git add -A && git commit -m "Add SectionHeader, CheckList, ChipList, StepList and Quote"`

---

### Task 3: Media building blocks: BeforeAfter, FactPhoto, SwipeRow, Lightbox

**Files:**

- Create: `src/components/ui/{BeforeAfter,FactPhoto,SwipeRow,Lightbox}.astro`, copied from Way.
- Modify: `src/styles/variables/typography.css`: add `--eyebrow-letter-spacing: 0.14em;` directly after `--eyebrow-margin-bottom`. BeforeAfter reads it.
- Modify: `src/pages/components.astro`.

**Interfaces:**

- `BeforeAfter`: `before: ImageMetadata`, `beforeAlt`, `after: ImageMetadata`, `afterAlt`, `label?`.
- `FactPhoto`: `src: ImageMetadata`, `alt`, `position?`, `facts: { title: string; text: string }[]`, `priority?`.
- `SwipeRow`: `columns?: 2 | 3 | 4`, `label`, plus the default slot (rendered once via `slotContent`).
- `Lightbox`: `label?` (default `"Photos"`), plus the default slot. Any descendant `[data-lightbox-src]` (with optional `data-lightbox-alt`, `data-lightbox-caption`) becomes a trigger. Triggers inside `[hidden]` ancestors are skipped.

- [ ] **Step 1: Copy the files**

```bash
W=~/Documents/GitHub/way-construction/src/components/ui
for c in BeforeAfter FactPhoto SwipeRow Lightbox; do cp "$W/$c.astro" src/components/ui/; done
```

- [ ] **Step 2: Add the token**
- [ ] **Step 3: Audit as in Task 2 Step 2.** Also confirm both hover rules and `prefers-reduced-motion` handling in BeforeAfter and Lightbox.
- [ ] **Step 4: Demos**
  - Use the starter's placeholder images under `src/assets/placeholder-images/`, with real alt text such as "Kitchen before the remodel, with dated cabinets".
  - The Lightbox demo has 4 triggers. The 4th trigger sits inside a `<div hidden>`, so prev/next can be seen skipping it (Review Focus 5).
  - `COMPONENT_INDEX`: `before-after`, `fact-photo`, `swipe-row`, `lightbox`.
- [ ] **Step 5: Verify**
  - Run `npm run check` and `check:hover`.
  - In dev, check BeforeAfter: drag works, arrow keys move the split, and with JS off the split sits at 50/50.
  - Check Lightbox: it opens; the arrow keys step through photos 1→3 and wrap without showing the hidden 4th; Escape closes it and focus returns to the trigger.
  - Screenshot at 390: SwipeRow scrolls horizontally inside itself with no page-level horizontal scroll (`document.documentElement.scrollWidth === 390`).
- [ ] **Step 6: Commit:** `git commit -m "Add BeforeAfter, FactPhoto, SwipeRow and Lightbox"`

---

### Task 4: Breadcrumbs + breadcrumb JSON-LD + Button iconPosition

**Files:**

- Create: `src/components/ui/Breadcrumbs.astro`, copied from Way.
- Modify: `src/lib/jsonld.ts`: add `breadcrumbListJsonLd`.
- Modify: `src/layouts/BaseLayout.astro`: add the `breadcrumbs` prop. This file is `.prettierignore`d, so format it by hand.
- Modify: `src/components/ui/Button.astro`: add `iconPosition`.
- Modify: `src/pages/components.astro`.

**Interfaces:**

- `Breadcrumbs`: `items: { label: string; href?: string }[]`. The last item gets `aria-current="page"`.
- `breadcrumbListJsonLd(items: { name: string; path: string }[], siteUrl?: string)` returns the schema object, or `null` when items is empty.
- `BaseLayout`: new optional prop `breadcrumbs?: { name: string; path: string }[]`.
- `Button`: `iconPosition?: ButtonIconPosition`, where `type ButtonIconPosition = "start" | "end"`. Default `"end"`.

- [ ] **Step 1: Add to `src/lib/jsonld.ts`**, directly after `breadcrumbJsonLd`:

```ts
/**
 * BreadcrumbList from an explicit trail (Home first, current page last). Use
 * when a URL segment has no page of its own, so the list never points at a
 * 404. `path` is site-relative.
 */
export function breadcrumbListJsonLd(
  items: { name: string; path: string }[],
  siteUrl: string = SITE.url,
) {
  if (items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: `${siteUrl}${crumb.path === "/" ? "" : crumb.path}`,
    })),
  };
}
```

- [ ] **Step 2: BaseLayout**
  - Add to Props, after `schema`, with JSDoc:

```ts
  /**
   * Explicit breadcrumb trail for the BreadcrumbList JSON-LD (Home first,
   * current page last). Pass it whenever the page shows `<Breadcrumbs>` so
   * the schema matches the visible trail. Omitted, the trail is derived from
   * the URL path.
   */
  breadcrumbs?: { name: string; path: string }[];
```

- Destructure `breadcrumbs`.
- Import `breadcrumbListJsonLd`.
- Change `const breadcrumbSchema = breadcrumbJsonLd(canonicalPath);` to:

```ts
const breadcrumbSchema = breadcrumbs
  ? breadcrumbListJsonLd(breadcrumbs)
  : breadcrumbJsonLd(canonicalPath);
```

- [ ] **Step 3: Button `iconPosition`.** Port it from Way's `src/components/ui/Button.astro`:
  - the `ButtonIconPosition` type;
  - the prop and JSDoc (Way lines around 230–240);
  - the default `iconPosition = "end"`;
  - `data-icon-position={iconPosition === "start" ? "start" : undefined}` on both the `<a>` and the `<button>` branches;
  - the matching CSS rule that reverses order for `[data-icon-position="start"]`.

  Diff Way's file against the starter's and take only the `iconPosition` hunks; Way's em-padding and radius changes are design changes and are excluded.

- [ ] **Step 4: Copy Breadcrumbs**, then audit.
- [ ] **Step 5: Demo**
  - The `breadcrumbs` demo section shows `[{label:"Home",href:"/"},{label:"Projects",href:"/projects"},{label:"Kitchen remodel"}]`.
  - Add one Button with `iconPosition="start"` to the existing Button demo.
- [ ] **Step 6: Verify**
  - Run `npm run check`, `check:hover` and `build`.
  - Run `grep -c BreadcrumbList dist/client/contact/index.html`. It should print 1, because the path-derived fallback is still working.
- [ ] **Step 7: Commit:** `git commit -m "Add Breadcrumbs, explicit breadcrumb JSON-LD and Button iconPosition"`

---

### Task 5: Project and gallery content model, queries and loaders

**Files:**

- Create: `src/config/projects.ts`
- Create: `src/sanity/schemaTypes/project.ts`
- Create: `src/sanity/schemaTypes/galleryItem.ts`
- Modify: `src/sanity/schemaTypes/index.ts`
- Modify: `src/sanity/lib/queries.ts`
- Modify: `src/sanity/lib/page-data.ts`
- Create: `src/lib/projects.ts`
- Regenerate: `src/sanity/sanity.types.ts` (via `npm run typegen`)

**Interfaces (Task 6 consumes these):**

- `PROJECT_CATEGORIES: { title: string; value: string }[]` and `categoryTitle(value: string | null | undefined): string` (returns the input when unknown), both from `@/config/projects`.
- Queries:
  - `PROJECTS_QUERY`
  - `PROJECT_SLUGS_QUERY`
  - `PROJECT_QUERY` (param `$slug`)
  - `RELATED_PROJECTS_QUERY` (params `$slug`, `$category`)
  - `FEATURED_PROJECTS_QUERY`
  - `GALLERY_QUERY`
- Loaders in `page-data.ts`:
  - `loadProjectPage(slug, draftProps)` returns `{ project, relatedProjects, defaultCtaSection } | null`
  - `getProjectStaticPaths()`
  - `loadProjects(draftProps)`
  - `loadFeaturedProjects(draftProps)`
  - `loadGallery(draftProps)`
- From `src/lib/projects.ts`:
  - `SanityPhoto`, `sanityPhoto(image, alt, meta, width?)`
  - `ProjectCardData { id, title, href, category, categoryLabel, location, image: SanityPhoto | null }`
  - `projectPath(slug)`, `toProjectCard(row)`, `toProjectCards(rows)`
  - `galleryCaptionMeta(location, projectTitle)`, which returns a string with no dangling separators.

- [ ] **Step 1: `src/config/projects.ts`**

```ts
/**
 * Project + gallery categories — plain data (no `sanity` import), read by the
 * Sanity schema AND the site, so the Studio dropdown and the public filters
 * can never disagree. REPLACE THESE PER CLIENT: they are placeholders.
 * Renaming a value orphans documents that use the old one — they still
 * render (categoryTitle falls back to the raw value) but drop out of the
 * matching Studio list until re-saved.
 */
export const PROJECT_CATEGORIES = [
  { title: "Residential", value: "residential" },
  { title: "Commercial", value: "commercial" },
  { title: "Remodel", value: "remodel" },
  { title: "Repair", value: "repair" },
];

/** Display title for a category value; the raw value when unknown. */
export function categoryTitle(value: string | null | undefined): string {
  if (!value) return "";
  return PROJECT_CATEGORIES.find((c) => c.value === value)?.title ?? value;
}
```

- [ ] **Step 2: `project.ts` schema.** Start from Way's `src/sanity/schemaTypes/project.ts` and apply these exact changes:
  - Import `PROJECT_CATEGORIES, categoryTitle` from `"../../config/projects"`. The schema folder is built by the Sanity CLI, so use a relative path, matching the other schema files.
  - Delete the `propertyType`, `service` (list version), `whatHappened`, `whatWeDid` and `sample` fields, and `SAMPLE_DESCRIPTION`.
  - Replace `city` with:

```ts
    defineField({
      name: "location",
      title: "Location",
      type: "string",
      group: "content",
      description: "Shown as written, e.g. Springfield, IL. No street addresses.",
    }),
```

- Add after `location`:

```ts
    defineField({
      name: "service",
      title: "Service",
      type: "string",
      group: "content",
      description: "Optional. The service this job was, e.g. Kitchen remodel.",
    }),
```

- Move `quote` into `group: "meta"`.
- Change the description of `photos[].label` to "Optional. Shown on the photo." Keep the Before/During/After radio.
- Update the preview to select `location` instead of `city`, and drop `sample`; the subtitle is `[categoryTitle(category), location].filter(Boolean).join(" · ")`.
- Update the `featured` description to `"Show in featured project lists"`.
- [ ] **Step 3: `galleryItem.ts` schema**
  - Copy Way's `src/sanity/schemaTypes/galleryItem.ts`.
  - Change the import to `../../config/projects`.
  - Rename `city` to `location` (same description as above).
  - Delete `sample`, and update the preview.
  - Register both types in `src/sanity/schemaTypes/index.ts`, next to `caseStudy`.
- [ ] **Step 4: Queries.** Copy Way's `queries.ts` project/gallery block (lines ~423–520) into the starter's `queries.ts`, after the case-study queries, then make these changes:
  - `city` becomes `location` everywhere.
  - Remove `propertyType`, `whatHappened`, `whatWeDid` and `sample` from every projection.
  - Keep the `coalesce(…, asset->altText, "")` alt projections exactly.
- [ ] **Step 5: Loaders.** Copy Way's `loadProjectPage`, `getProjectStaticPaths`, `loadProjects`, `loadFeaturedProjects` and `loadGallery` into `page-data.ts`.
  - Extend `loadProjectPage`'s `Promise.all` to also fetch `SITE_SETTINGS_QUERY` and return `defaultCtaSection`, exactly as `loadCaseStudyPage` does. The template uses `SanityCtaSection` instead of Way's CallBand.
- [ ] **Step 6: `src/lib/projects.ts`.** Copy Way's file, then:
  - Delete `projectMeta`.
  - Replace `city` with `location` in `ProjectCardSource` and `ProjectCardData`.
  - Remove `sample`.
  - `toProjectCard` sets `location: row.location ?? ""`.
  - Add:

```ts
/** Gallery caption line: "Springfield, IL · Smith kitchen" — no dangling dots. */
export function galleryCaptionMeta(
  location: string | null | undefined,
  projectTitle: string | null | undefined,
): string {
  return [location, projectTitle]
    .filter((part) => part && part.trim())
    .join(" · ");
}
```

- [ ] **Step 7:** Run `npm run typegen`, then `npm run check`: 0 errors.
- [ ] **Step 8: Fixture check (Review Focus 3 and 4).** Create `scripts/check-projects.mjs`. If the starter's TS import style doesn't work under plain node, run it through `npx tsx`. It asserts:

```js
import assert from "node:assert/strict";
import { categoryTitle } from "../src/config/projects.ts";
import { galleryCaptionMeta } from "../src/lib/projects.ts";
assert.equal(categoryTitle("remodel"), "Remodel");
assert.equal(categoryTitle("renamed-old-value"), "renamed-old-value");
assert.equal(categoryTitle(null), "");
assert.equal(galleryCaptionMeta("Springfield, IL", null), "Springfield, IL");
assert.equal(galleryCaptionMeta("", "Smith kitchen"), "Smith kitchen");
assert.equal(galleryCaptionMeta(null, undefined), "");
console.log("check-projects: ok");
```

- Run `npx tsx scripts/check-projects.mjs`. Expect `check-projects: ok`.
- If `src/lib/projects.ts` imports an Astro virtual module (such as `sanity:client` via `urlFor`), move `galleryCaptionMeta` and any other pure helpers into `src/lib/project-format.ts` with no Astro imports, and import them from there.
- [ ] **Step 9: Commit:** `git commit -m "Add project and gallery content types, queries and loaders"`

---

### Task 6: Project and gallery components, routes and template

**Files:**

- Create: `src/components/ui/{ProjectCard,ProjectBrowser,GalleryBrowser}.astro`, copied from Way.
- Create: `src/components/templates/ProjectTemplate.astro`, copied from Way.
- Create: `src/pages/projects/index.astro`, `src/pages/projects/[slug].astro`, `src/pages/preview/projects/[slug].astro` and `src/pages/gallery.astro`, copied from Way.
- Create: `src/styles/pages/projects.css`, copied from Way.

**Interfaces:**

- Consumes everything Task 5 produces, plus Lightbox, SwipeRow, Quote, Breadcrumbs and SectionHeader from Tasks 2–4.
- `ProjectBrowser` takes `projects: ProjectCardData[]` and `categories: { title: string; value: string }[]`.
- `GalleryBrowser` keeps `items: GalleryItem[]` and `categories` (an exported `GalleryItem` interface, with `city` renamed to `location`).

- [ ] **Step 1: Copy the files** (paths above).
- [ ] **Step 2: De-Way each file**
  - **`ProjectCard`:** the meta line is `project.location`, and the separator renders only when it's non-empty.
  - **`ProjectBrowser`:**
    - Stop importing `PROJECT_CATEGORIES`; take a `categories` prop instead (named type, JSDoc).
    - In the select, show only the categories present in `projects`.
    - Search placeholder: "Search projects or locations".
  - **`GalleryBrowser`:**
    - Delete the `, TX` in `captionMeta` and use `galleryCaptionMeta(item.location, item.project?.title)`.
    - Remove `sample` from the interface.
  - **`ProjectTemplate`:**
    - Remove the legacy `whatHappened`/`whatWeDid` fallback.
    - Remove the `getService`/`servicePath` import; show `service` as plain text in the facts list when present.
    - The Location fact is `project.location` as written.
    - Replace the `CallBand` with `<SanityCtaSection ctaSection={defaultCtaSection} />`. Match the prop name `CaseStudyTemplate` uses; read it first.
    - Title: `` `${project.title} | ${SITE.name}` ``.
    - Breadcrumb trail: `[{name:"Home",path:"/"},{name:"Projects",path:"/projects"},{name:title,path:projectPath(slug)}]`. Pass it to both `<Breadcrumbs>` and BaseLayout's `breadcrumbs`.
    - **Review Focus 2:** wrap the write-up block in `{project.description?.length ? … : null}`, the photo grid plus Lightbox in `{project.photos?.length ? … : null}`, the quote band in `{project.quote?.text ? … : null}`, and "More projects" in `{relatedProjects.length ? … : null}`.
  - **`projects/index.astro`:**
    - Title: `` `Projects | ${SITE.name}` ``.
    - Neutral intro copy: "A look at recent work."
    - Pass `categories={PROJECT_CATEGORIES}`.
    - Keep the empty state.
    - Replace the CallBand with `<CTASection />`, the starter's existing section.
    - Show the gallery strip only when the gallery has items.
  - **`gallery.astro`:** the same title/CTA changes. Empty state: "Photos coming soon."
  - **`[slug].astro` and the preview twin:** they keep the starter's case-study shape. The public route redirects to `/404` on null data, and the preview twin has `prerender = false`.
- [ ] **Step 3: Verify (Review Focus 2)**
  - In `src/pages/components.astro`, add a `project-card` demo rendering `ProjectCard` with a hand-built `ProjectCardData` object whose `location` is `""` (no Sanity needed).
  - Then run `npm run check`.
  - Read `ProjectTemplate` once more and confirm every optional section is guarded as listed in Step 2.
- [ ] **Step 4: Commit:** `git commit -m "Add project and gallery pages, template and browsers"`

---

### Task 7: Studio, Presentation, discoverability and docs

**Files:**

- Modify: `sanity.config.ts` (desk, previewable types, badges)
- Modify: `src/sanity/lib/resolve.ts`
- Modify: `src/sanity/components/studioDocument.ts`
- Modify: `src/sanity/lib/internal-links.ts`
- Modify: `src/sanity/schemaTypes/portableTextConfig.ts`
- Modify: `src/data/site-structure.ts`
- Modify: `src/pages/llms.txt.ts` and `src/pages/llms-full.txt.ts`
- Modify: `.claude/skills/component-api/SKILL.md`; create `.claude/skills/component-api/references/local-service.md`
- Modify: `.claude/skills/sanity-and-preview/SKILL.md`, `.claude/skills/seo-discoverability/SKILL.md` and `.claude/skills/setup/references/no-cms.md`

- [ ] **Step 1: Desk**
  - In `sanity.config.ts`, after the Case Studies list item, add a "Projects" `S.listItem()`. It contains:
    - All projects, ordered `completed desc, _createdAt desc`
    - "Featured", filtered on `_type == "project" && featured == true`
    - a divider
    - one `S.documentList()` per `PROJECT_CATEGORIES` entry, filtered on `_type == "project" && category == $category` with `.params({ category: c.value })` and `.apiVersion(...)` matching the existing lists
  - Add a "Gallery photos" `S.documentTypeList("galleryItem")` ordered `added desc`.
  - Use Way's `sanity.config.ts` as the reference; do not port `CREATABLE_TYPES`.
  - Add `"project"` to `PREVIEWABLE_TYPES` and give project the `FeaturedBadge`.
- [ ] **Step 2: Location and route maps**
  - In `resolve.ts`, add a `project` `defineLocations` entry pointing at `/preview/projects/${slug}`. Copy Way's entry.
  - `studioDocument.ts` `ROUTE_BY_TYPE`: `project: "/projects"`.
  - `internal-links.ts`: `case "project": return \`/projects/${target.slug}\``.
  - `portableTextConfig.ts` internalLink `to:`: add `{ type: "project" }`. Way forgot this, so the link case was unreachable.
- [ ] **Step 3: PAGES**
  - Add these to `PAGES` (group `"index"`):

```ts
  { path: "/projects", title: "Projects", desc: "Recent projects with photos and details.", group: "index" },
  { path: "/gallery", title: "Photo gallery", desc: "Photos from recent work.", group: "index" },
```

- Add both paths to the footer Resources group links. Do not add them to `NAV_MENU`.
- [ ] **Step 4: llms**
  - In both llms endpoints, mirror the case-studies block: query `PROJECTS_QUERY` with `.catch(() => [])` and emit a `## Projects` section, one line per project (`- [title](url): categoryTitle · location`).
- [ ] **Step 5: Docs**
  - Create `references/local-service.md` with a table of all 13 new UI components: name, one-line role, the key props, and "use when". It closes with the projects/gallery page list.
  - Add its row to the `component-api` SKILL.md reference table.
  - `sanity-and-preview`:
    - add `project`/`galleryItem` to the icons list and desk description;
    - change "The sitemap and llms endpoints pick the new route up automatically" to "The sitemap picks the new route up automatically; llms.txt / llms-full.txt need an explicit section (see the case-studies and projects blocks)".
  - `seo-discoverability`: list the two new PAGES entries.
  - `no-cms.md`:
    - Option A (defer): also unlink `/projects` and `/gallery`.
    - Option B (delete): add `project.ts`, `galleryItem.ts`, `src/config/projects.ts`, `src/lib/projects.ts`, ProjectTemplate, ProjectCard, ProjectBrowser, GalleryBrowser, the three project routes, `gallery.astro` and `projects.css`.
    - Keep Lightbox; it's CMS-agnostic.
    - Update any file counts in that doc.
- [ ] **Step 6: Full verification (Review Focus 1)**
  - Run `npm run typegen && npm run check && npm run check:hover && npm run format && npm run format:check && npm run build`. All must pass with the placeholder Sanity id.
  - Check the built output:

```bash
test -f dist/client/projects/index.html && test -f dist/client/gallery/index.html && echo pages-ok
ls dist/client/projects | grep -v index.html | wc -l     # expect 0 (no project paths on a fresh fork)
grep -c "/projects\|/gallery" dist/client/sitemap-0.xml   # expect 2
grep -rniE "red oak|dfw|, TX|texas|way construction|fire-smoke|water-damage|storm-roofing" src .claude docs | grep -v "superpowers/" # expect only the location-field example
```

- In dev, screenshot `/projects` and `/gallery` (empty states) at 1440 and 390.
- Run `npx sanity build`. The Studio must compile with the new desk.
- [ ] **Step 7: Commit:** `git commit -m "Wire projects and gallery into the Studio, llms and docs"`

---

### Task 8: Branch review and PR

- [ ] Dispatch a reviewer over `git diff main...HEAD` against this plan and the spec, and address its findings.
- [ ] Push, then run `gh pr create` with a summary of Parts A and B, the token fix, and the verification checklist. Note that Presentation preview of a project needs a real Sanity project and must be checked manually.
