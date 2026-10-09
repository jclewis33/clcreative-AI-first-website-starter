# Building blocks, projects and gallery — design

Sub-project 2 of the starter-template roadmap. Sub-project 1, the GoHighLevel
lead pipeline, is PR #32.

## Goal

Port the reusable pieces from Way Construction
(`~/Documents/GitHub/way-construction`, branch `build/way-site`) into the
starter. This includes Way's Sanity-backed **projects** portfolio and **photo
gallery**, shipped as ready-to-use templates. A new client site then starts
with these pages working, and gets restyled per project rather than rebuilt.

Success means four things:

1. A fresh fork has `/projects`, `/projects/[slug]` and `/gallery`. They show
   real content once Sanity has documents, and empty states before that.
2. Every component has a `/components` demo and a `component-api` entry.
3. Nothing Way-specific remains: no Way copy, no Texas or DFW references, no
   Way categories or services.
4. The starter's checks pass: `npm run check`, `npm run check:hover`,
   `npm run build` and `npm run format:check`.

## Part A: UI building blocks (copied from Way, then audited)

Way's code research found these use only the starter's own primitives and
tokens. The one exception is `--eyebrow-letter-spacing`, which is added to
`typography.css`.

| Component (`src/components/ui/`) | Role                                                                    |
| -------------------------------- | ----------------------------------------------------------------------- |
| `SectionHeader`                  | Eyebrow and heading on the left; intro or an `action` slot on the right |
| `CheckList`                      | Checkmark list: `ruled` or `plain`, 1 or 2 columns                      |
| `ChipList`                       | Wrapping row of pills; linked chips get an arrow                        |
| `StepList`                       | Numbered process: `list` or `cards`                                     |
| `Quote`                          | Review or quote: `band`, `large`, `regular` or `small`                  |
| `Breadcrumbs`                    | Visible trail, with the last crumb marked `aria-current`                |
| `BeforeAfter`                    | Drag-to-compare photo slider on a real range input                      |
| `FactPhoto`                      | Large photo with fact cards over its bottom edge                        |
| `SwipeRow`                       | Grid that becomes a scroll-snap swipe row below desktop                 |
| `Lightbox`                       | Native `<dialog>` viewer for any `[data-lightbox-src]` trigger          |

Changes to existing starter code:

- **Button `iconPosition`** (`start` or `end`).
- **Breadcrumb schema:**
  - add `breadcrumbListJsonLd(items)` to `src/lib/jsonld.ts`;
  - add an optional `breadcrumbs` prop to BaseLayout;
  - when the prop is passed, the BreadcrumbList is built from the visible
    trail, so a crumb never points at a 404;
  - without it, the current breadcrumbs derived from the path stay.

Each file goes through the CLAUDE.md checklist: naming, layered `is:global`
CSS, `docs` and `render` props, named types, no `px`, hover styles behind
`(hover: hover)`, real alt text, and DEV `console.warn` validation.

## Part B: Projects and gallery (Sanity templates)

### Content model

**`project`** is a photo-led portfolio item. It is a separate type from
`caseStudy`, which stays the long-form marketing story with a block builder.
A fork can use either type, or both.

Fields, grouped into content, media and meta:

| Group   | Fields                                                                                                                                                                                       |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| content | `title`_, `slug`_, `category`* (from the config list), `location` (free text such as "Red Oak, TX"; shown as entered), `service` (optional free text), `description` (minimal Portable Text) |
| media   | `heroImage`* with hotspot, `imageAlt`, `photos[]` (each with an optional `label` and an `alt`)                                                                                               |
| meta    | `completed` (date), `featured`, `quote{text,name}`, `seoDescription` (warns over 155 characters)                                                                                             |

`photos[].label` is an optional free choice: Before, During, After or none.

**`galleryItem`** is a single photo with no detail page. Fields:

- `image`* and `imageAlt`
- `caption`* (60 characters max)
- `category`* (same list as projects)
- `location`
- `project` (optional reference to a project)
- `added` (defaults to today)

**Dropped from Way's version:**

- `propertyType`
- the legacy `whatHappened` / `whatWeDid` fields
- the `sample` flag
- the hardcoded `, TX` (location is now one field, shown as entered)
- `PROJECT_SERVICES`. `service` is plain text for now; sub-project 4's
  data-driven service pages will turn it into a link.

**Categories:** `src/config/projects.ts` is plain data with no `sanity`
import, so both the schema and the site read it. It ships placeholder
categories, `residential`, `commercial`, `remodel` and `repair`, with a header
saying to replace them per client. Category filters on `/projects` and
`/gallery` show only the categories that are actually used.

### Wiring

This follows the starter's documented content-type pattern from the
`sanity-and-preview` skill.

- **Queries** in `src/sanity/lib/queries.ts`, all via `defineQuery`, with the
  `coalesce(…, asset->altText, "")` alt projection:
  - `PROJECTS_QUERY`
  - `PROJECT_SLUGS_QUERY`
  - `PROJECT_QUERY`
  - `RELATED_PROJECTS_QUERY` (same category first, `[0...4]`)
  - `FEATURED_PROJECTS_QUERY` (`[0...3]`)
  - `GALLERY_QUERY`

  Then `npm run typegen`.

- **Loaders** in `page-data.ts`. All of them are placeholder-safe: they return
  empty on a fresh fork and fail loudly on a real project.
  - `loadProjectPage`
  - `getProjectStaticPaths`
  - `loadProjects`
  - `loadFeaturedProjects`
  - `loadGallery`
- **View models** in `src/lib/projects.ts`: `sanityPhoto()` and
  `toProjectCard(s)`, with no hardcoded place names.
- **Routes**, all prerendered except the preview twin:
  - `/projects` is an index page using `ProjectBrowser` (search, category
    filter, count, empty state) plus a strip of 3 gallery photos.
  - `/projects/[slug]` and its SSR twin `/preview/projects/[slug]` both
    render `ProjectTemplate`.
  - `/gallery` uses `GalleryBrowser` (category chips, square tiles,
    Lightbox).
  - Like the case-studies index, the listing pages have no preview twin.
    Gallery edits appear after a publish rebuild.
- **Template** `src/components/templates/ProjectTemplate.astro`. Sections, in
  order:
  1. Breadcrumbs, then the category badge and H1
  2. Hero photo
  3. Write-up, alongside a facts list: location, service, completed date
  4. Photo grid in a Lightbox
  5. Optional quote band
  6. "More projects" in a SwipeRow
  7. The starter's existing `SanityCtaSection` instead of Way's hardcoded
     CallBand, so the closing CTA is editable and nothing is client-specific

  Breadcrumb JSON-LD comes from the visible trail.

- **Components** in `src/components/ui/`: `ProjectCard`, `ProjectBrowser`
  (categories passed as a prop, not imported) and `GalleryBrowser`.
- **Studio:**
  - Desk: a Projects list (All, Featured, then one list per category) and a
    Gallery list, added **next to** Case Studies. Way's `CREATABLE_TYPES`
    lockdown isn't ported.
  - Icons, the View-on-site action, the Featured badge, and a Presentation
    location for `project`.
  - The project target for internal links in Portable Text.
- **Discoverability:**
  - `/projects` and `/gallery` go into `PAGES` (group `index`) and the footer
    Resources group, but not the nav. A fork adds them to the nav when it uses
    them.
  - llms.txt and llms-full.txt get a "Projects" section, using the
    case-studies pattern with `.catch(() => [])`.
  - The sitemap picks up the new routes automatically.
- **Docs:**
  - `component-api`: entries for the new components, plus a new
    `references/local-service.md` covering the building blocks and when to
    use each.
  - `sanity-and-preview`: the project type, and a fix to its claim that llms
    picks up new types automatically. It doesn't.
  - `seo-discoverability`: the new PAGES entries.
  - `setup/references/no-cms.md`: add the new routes to both the defer and
    delete options.

## Out of scope

- Way's design changes to Card, FAQ, Carousel, Navbar and the `bone` theme.
  These were per-client styling.
- Way-flavoured sections: UtilityBar, CallBand and ServiceArea. Sub-project 3
  generalises them.
- Data-driven service pages. Sub-project 4.
- A homepage "featured projects" section. The `/components` demo shows the
  pattern, and sub-project 4's home recipe will use it.

## Open question

**Way's `load-query.ts` token fix.** Way reads `SANITY_API_READ_TOKEN` per
request (`astro:env/server` `getSecret`, draft mode only). The starter reads
it at build time through `import.meta.env`, and Way's notes say that breaks
draft preview on Workers.

This is a real starter bug, but it isn't part of this feature. Recommendation:
fix it as its own small commit on this branch, verified with Presentation.

## Verification

- `npm run check`, `check:hover`, `format:check`, `typegen`, and `build`
  (with the placeholder Sanity id, so empty states render).
- `/components` demos screenshotted at 1440 and 390.
- `/projects` and `/gallery` render their empty states. `/projects/[slug]`
  has zero paths.
- With real data on a test dataset, Presentation previews a project through
  its `/preview` twin. This needs a Sanity project, so it's listed as a manual
  check if none is available.
