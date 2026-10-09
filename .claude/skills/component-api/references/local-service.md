# Local-service building blocks (`src/components/ui/`)

Pieces taken from a real contractor build and made
client-neutral. They suit any local-service or trades site. Every one has a
live demo on `/components`, a `docs` prop (hover it), and a `render` prop.

## Content and layout

| Component       | What it's for                                                  | Key props                                                                         | Use when                                                                                                  |
| --------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `SectionHeader` | Eyebrow + heading on the left; intro or an action on the right | `eyebrow`, `heading`, `intro`, `tag`, `size`, slot `action`                       | Opening almost any section — the most-used piece                                                          |
| `CheckList`     | Checkmark list                                                 | `items: string[]`, `variant: 'ruled' \| 'plain'`, `columns: 1 \| 2`               | "What's included", credentials, guarantees                                                                |
| `ChipList`      | Wrapping row of pills; linked chips get an arrow               | `items: { label, href?, key? }[]`                                                 | Service areas, trades, quick links                                                                        |
| `StepList`      | Numbered process                                               | `steps: { title, text }[]`, `variant: 'list' \| 'cards'`                          | "How it works", "What happens next"                                                                       |
| `Quote`         | A review or quote                                              | `text`, `name`, `meta`, `size: 'band' \| 'large' \| 'regular' \| 'small'`, `mark` | Testimonials; `band` on a `theme="brand"` Section for a full-width quote                                  |
| `Breadcrumbs`   | Trail back up the site; last crumb is `aria-current`           | `items: { label, href? }[]`                                                       | Detail pages. Pass the same trail to BaseLayout's `breadcrumbs` prop so the BreadcrumbList schema matches |

## Photos

| Component     | What it's for                                                  | Key props                                                        | Use when                                                   |
| ------------- | -------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------- |
| `BeforeAfter` | Drag-to-compare slider on a real range input (keyboard-ready)  | `before`, `beforeAlt`, `after`, `afterAlt`, `label`              | Remodels, repairs, restoration                             |
| `FactPhoto`   | Big photo with fact cards over its bottom edge                 | `src`, `alt`, `facts: { title, text }[]`, `position`, `priority` | Hero or service-page lead image with 2–3 proof points      |
| `SwipeRow`    | A grid that becomes a scroll-snap swipe row below desktop      | `columns: 2–4`, `label`, default slot                            | "More projects", related services — card rows on phones    |
| `Lightbox`    | Native `<dialog>` viewer for any `[data-lightbox-src]` trigger | `label`; triggers carry `data-lightbox-src/-alt/-caption`        | Any photo grid. Hidden triggers (filtered out) are skipped |

`Button` also gained `iconPosition: 'start' | 'end'` (a phone icon before
"Call us", for example).

## Projects and gallery (Sanity)

| Piece             | Role                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------ |
| `ProjectCard`     | Card from `toProjectCards()` — photo, category badge, location, "View project"             |
| `ProjectBrowser`  | `/projects` grid with search, category select (only used categories), live count           |
| `GalleryBrowser`  | `/gallery` chips + square tiles + Lightbox; caption meta never leaves a stray "·"          |
| `ProjectTemplate` | `/projects/[slug]` and its preview twin — every optional section renders only with content |

Routes: `/projects`, `/projects/[slug]`, `/preview/projects/[slug]`,
`/gallery`. Categories are set per client in `src/config/projects.ts`. The
content model and loaders are documented in the `sanity-and-preview` skill.

## Sections (`src/components/sections/`)

Whole page sections for local-service sites. Every one takes its content as
props (no client copy built in), skips itself when its required content is
missing, warns in dev, and passes `theme` / `padding` / `id` / `class` to its
`Section`. Buttons take a `SectionCta` (`{ label, href?, modal? }` from
`@/lib/cta`); `modal` opens a `<LeadFormModal>` by id. Phone buttons always
read `SITE.phone`.

| Section           | What it's for                                     | Key props                                                                                                                                 | Use when                                              |
| ----------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `Hero`            | The first section                                 | `variant: background \| split \| text`, `heading` (HTML, `<strong>` = accent), `primaryCta`, `showPhone`, `breadcrumbs`, `proof`, `badge` | Every page. `split` + `breadcrumbs` for service pages |
| `StatsStrip`      | Four proof points in a slim band                  | `items: {value, label}[]`, `valueSize: number \| word`                                                                                    | Under the hero                                        |
| `ServiceCards`    | The services, as cards                            | `items: {title, text?, image?, href?, icon?}[]`, `layout: grid \| swipe`                                                                  | Home services; `swipe` for related services           |
| `ServiceArea`     | Places served, with a map or photos               | `areas` (default `SITE.serviceAreas`), `map` (SVG component), `images`                                                                    | Home, contact                                         |
| `ProcessSteps`    | How it works                                      | `steps: {title, text}[]`, `image`, `variant: list \| cards`                                                                               | Home, service pages, "what happens next"              |
| `StorySplit`      | Meet the owner / why us                           | `paragraphs`, `image`, `reasons: {title, text}[]`, `cta`                                                                                  | Home, about                                           |
| `Reviews`         | Customer reviews                                  | `reviews: {text, name, meta?}[]`, `rating`, `count`, `layout: featured \| grid`                                                           | Home, service pages                                   |
| `LeadFormSection` | Intro + phone line beside the GHL LeadForm        | `formId`, `fields`, `projectOptions`, `showPhone`                                                                                         | The main conversion section                           |
| `CallBand`        | Dark closing band: phone + one more button        | `heading`, `secondaryCta`                                                                                                                 | Bottom of service and project pages                   |
| `IncludedList`    | Checklist beside an offset photo pair             | `items: string[]`, `images`                                                                                                               | Service pages ("what's included")                     |
| `PhotoBand`       | Full-width photo strip                            | `image`, `alt`                                                                                                                            | Breaking up a long page                               |
| `UtilityBar`      | Thin bar above the nav (`src/components/global/`) | none — set `SITE.utilityBar` (`null` = off)                                                                                               | Emergency / 24/7 businesses                           |

Supporting pieces: `CtaButton` (renders a `SectionCta`, or `phone`),
`LeadFormModal` (a pop-up LeadForm; place once per page), `ImagePair`,
`ServiceIcon` (icon set in `src/data/service-icons.json`). `CTASection` also
accepts `primaryCta` / `secondaryCta` and HTML headings.

**ServiceArea maps:** import the client's SVG as a component and pass it as
`map`. Each region that should light up carries `data-area="<name>"`
matching one of `areas` exactly. Everything else in the SVG is artwork and
ignores the pointer. Example: `src/assets/maps/sample-service-area.svg`.

### Composing a page

The dev-only `/demo/local-service` page (`src/pages/demo/local-service.astro`)
is a complete example — copy it as the starting point for a client home page:

```astro
<Hero
  heading="Remodels done <strong>right</strong>"
  image={hero}
  imageAlt="…"
  primaryCta={{ label: "Get a free estimate", modal: "estimate" }}
/>
<StatsStrip items={stats} />
<ServiceCards heading="Every room, one crew" items={services} />
<ServiceArea heading="Serving the whole county" map={Map} />
<ProcessSteps
  heading="How it works"
  steps={steps}
  image={processPhoto}
  imageAlt="…"
/>
<StorySplit
  heading="Why choose us"
  paragraphs={story}
  image={ownerPhoto}
  imageAlt="…"
  reasons={reasons}
/>
<Reviews rating={4.9} count={127} reviews={reviews} />
<LeadFormSection
  heading="Tell us about your project"
  formId="contact"
  fields="quote"
/>
<FAQ items={faqs} />
<CallBand
  heading="Ready to get started?"
  secondaryCta={{ label: "Get a free estimate", modal: "estimate" }}
/>
<LeadFormModal id="estimate" formId="contact" heading="Get a free estimate" />
```
