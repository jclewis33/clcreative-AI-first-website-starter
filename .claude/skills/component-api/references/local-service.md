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

## Projects and gallery

| Piece             | Role                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| `ProjectCard`     | Card for a `ProjectCardData` from `getProjects()` (`@/lib/content`) — photo, category badge, location, "View project" |
| `ProjectBrowser`  | `/projects` grid with search, category select (only used categories), live count                                      |
| `GalleryBrowser`  | `/gallery` chips + square tiles + Lightbox; caption meta never leaves a stray "·"                                     |
| `ProjectTemplate` | `/projects/[slug]` (and the Sanity add-on's preview twin) — every optional section renders only with content          |

Routes: `/projects`, `/projects/[slug]`, `/gallery` (plus
`/preview/projects/[slug]` with the Sanity add-on). Categories are set per
client in `src/config/projects.ts`. The content functions are in `@/lib/content` (the Files side: the `content-files`
skill; the Sanity mapping: the add-on's `sanity-and-preview` skill).

## Sections (`src/components/sections/`)

Whole page sections for local-service sites. Every one takes its content as
props (no client copy built in), skips itself when its required content is
missing, warns in dev, and passes `theme` / `padding` / `id` / `class` to its
`Section`. Buttons take a `SectionCta` (`{ label, href?, modal? }` from
`@/lib/cta`); `modal` opens a `<LeadFormModal>` by id. Phone buttons always
read `SITE.phone`.

| Section            | What it's for                                                               | Key props                                                                                                                                                                                                                                               | Use when                                                                                                                                                                                                                                 |
| ------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Hero`             | The first section                                                           | `variant: background \| split \| text`, `headingSize: display \| h1`, `heading` (HTML, `<strong>` = accent, `<mark>` = highlighted offer), `primaryCta`, `ctaStyle: buttons \| panel`, `ctaNote`, `trust`, `showPhone`, `breadcrumbs`, `proof`, `badge` | Every page. `split` + `breadcrumbs` for service pages; `ctaStyle="panel"` + `trust` on home-service homes                                                                                                                                |
| `StatsStrip`       | Four proof points in a slim band                                            | `items: {value, label}[]`, `valueSize: number \| word`                                                                                                                                                                                                  | Under the hero                                                                                                                                                                                                                           |
| `ServiceCards`     | The services, as cards                                                      | `items: {title, text?, image?, href?, icon?}[]`, `layout: grid \| swipe`                                                                                                                                                                                | Home services; `swipe` for related services                                                                                                                                                                                              |
| `ServiceArea`      | Places served, with a map or photos                                         | `areas` (default `SITE.serviceAreas`), `geo` (street map, towns outlined), `areaLinks` (chips become links), `currentArea` (highlighted on the map), `map` (SVG component), `images`                                                                    | Home, contact                                                                                                                                                                                                                            |
| `ProcessSteps`     | How it works                                                                | `steps: {title, text}[]`, `image`, `variant: list \| cards`                                                                                                                                                                                             | Home, service pages, "what happens next"                                                                                                                                                                                                 |
| `StorySplit`       | Meet the owner / why us                                                     | `paragraphs`, `image`, `reasons: {title, text}[]`, `cta`                                                                                                                                                                                                | Home, about                                                                                                                                                                                                                              |
| `Reviews`          | Customer reviews                                                            | `reviews: {text, name, meta?}[]`, `rating`, `count`, `layout: featured \| grid \| cards`                                                                                                                                                                | Home, service pages. `cards` (stars on every card, rating centred, `meta` = "job · town") is the home-service default                                                                                                                    |
| `LeadFormSection`  | Intro + phone line beside the GHL LeadForm                                  | `formId`, `fields`, `projectOptions`, `showPhone`                                                                                                                                                                                                       | The main conversion section                                                                                                                                                                                                              |
| `CallBand`         | The closing CTA                                                             | `heading`, `secondaryCta`, `variant: band \| photo-card \| split \| cinematic`, `image`, `imageAlt`, `ctaNote`                                                                                                                                          | Bottom of every local-service page. `photo-card` = a white quote card on a full-width photo (a lawn, a roofline); `split` = text and photo in one rounded card; `cinematic` = centred h1 + both buttons over a full-bleed darkened photo |
| `IncludedList`     | Checklist beside an offset photo pair                                       | `items: string[]`, `images`                                                                                                                                                                                                                             | Service pages ("what's included")                                                                                                                                                                                                        |
| `PhotoBand`        | Full-width photo strip                                                      | `image`, `alt`                                                                                                                                                                                                                                          | Breaking up a long page                                                                                                                                                                                                                  |
| `SymptomCards`     | "Sound familiar?" — the problems, in the homeowner's words                  | `items: {title, text, icon?}[]`, `heading` (default "Sound familiar?"), `intro`, `cta`                                                                                                                                                                  | Home, service pages — people search for the symptom, not the service                                                                                                                                                                     |
| `OfferBand`        | One real offer on a card: seal, bullets, button, terms                      | `seal: {value, label}`, `heading` (HTML), `text`, `items`, `cta`, `note` (the terms)                                                                                                                                                                    | A first-visit discount, financing, rebates, a seasonal special — only real ones                                                                                                                                                          |
| `RecentWork`       | Job photos captioned town · job, opening in a Lightbox                      | `items: {image, imageAlt, title, place?}[]`, `heading`, `cta`                                                                                                                                                                                           | Home — the business's own photos only                                                                                                                                                                                                    |
| `Guarantee`        | A named promise with a seal                                                 | `name` (HTML), `text`, `items`, `sealLabel`, `cta`                                                                                                                                                                                                      | Home, service pages — only a guarantee they really give                                                                                                                                                                                  |
| `ComparisonTable`  | Us vs. a typical contractor, row by row (a real table; cards on phones)     | `rows: {label, us, them}[]`, `usLabel` (default `SITE.name`), `themLabel`                                                                                                                                                                               | Home, about — common practice, never a named competitor                                                                                                                                                                                  |
| `EmergencyBand`    | Slim urgent band: live dot, heading, the phone as a big button              | `heading` (default "24/7 emergency service"), `text`, `theme` (default `brand`)                                                                                                                                                                         | Only for real round-the-clock / after-hours service                                                                                                                                                                                      |
| `MaintenancePlans` | Membership / maintenance-club cards: price per month or year, perks, button | `plans: {name, price, period?, description?, perks, featured?, ctaLabel?}[]`, `cta`, `note`                                                                                                                                                             | HVAC, plumbing, pest, pool — real plans at real prices                                                                                                                                                                                   |
| `TeamGrid`         | The people at the door: photo, name, role, a line; optional hiring prompt   | `members: {name, role, image, imageAlt?, bio?}[]`, `hiring: {text, cta}`                                                                                                                                                                                | Home, about — real people only                                                                                                                                                                                                           |
| `UtilityBar`       | Thin bar above the nav (`src/components/global/`)                           | none — set `SITE.utilityBar` (`null` = off)                                                                                                                                                                                                             | Emergency / 24/7 businesses                                                                                                                                                                                                              |

Supporting pieces: `CtaPanel` (the estimate button, "or", and "Call or text
us" + the number on one tinted panel; `cta`, `note`, `phoneLabel`),
`ServiceMap` (a street map with the towns' real boundaries outlined and
named — OpenStreetMap tiles, greyed; Leaflet loads near the screen; the
boundaries come from `scripts/lib/service-area-geo.mjs` at generation time,
cached in `service-area.geo.json`, never at page load — `npm run demo`
does it automatically), `TrustBadges` (a row of credentials, each a logo `image` or a check-shield
icon + `label` — only ones the business holds), `CtaButton` (renders a
`SectionCta`, or `phone`),
`LeadFormModal` (a pop-up LeadForm; place once per page), `ImagePair`,
`ServiceIcon` (icon set in `src/data/service-icons.json`). `CTASection` also
accepts `primaryCta` / `secondaryCta` and HTML headings.

**ServiceArea maps:** import the client's SVG as a component and pass it as
`map`. Each region that should light up carries `data-area="<name>"`
matching one of `areas` exactly. Everything else in the SVG is artwork and
ignores the pointer. Example: `src/assets/maps/sample-service-area.svg`.

### Local-service mode and looks

Two `SITE` settings turn the agency chrome into contractor chrome, site-wide:

- **`SITE.quote`** (`{ label, heading, text? }`, `null` = off): BaseLayout
  renders the estimate form once as a modal (`ESTIMATE_MODAL_ID` from
  `@/lib/cta` — open it with `{ label, modal: ESTIMATE_MODAL_ID }`), the
  navbar shows "Call or text" + the number and a button that opens it, phones
  get the sticky `MobileActionBar` (Call now | estimate), and the footer adds
  a "Service area" column and "© year Legal Name. License …" (`SITE.license`).
  `LocalServiceHome` uses the site-wide modal when it exists and brings its
  own otherwise.
- **`SITE.look`** — `studio` (the starter's own), `fresh`, `warm`, `rugged`,
  `natural` (`src/config/looks.ts`; tokens in
  `src/styles/variables/looks.css`). A look re-values tokens only — fonts,
  heading case and tracking, radii, button and nav/footer type, paper and
  ink — so every component follows; the brand colour stays the client's.
  Pick by trade: fresh = lawn, pest, cleaning, pool; warm = HVAC,
  insulation, remodeling; rugged = electrical, roofing, plumbing,
  commercial; natural = hardscape, landscaping, decks.

### Town pages (`SITE.cityPages`)

With `SITE.cityPages: true`, `/services/[slug]/[city]` builds every
service × town in `SITE.serviceAreas` (`serviceCityPath`, `citySlug` in
`@/lib/services`). Both routes render the `ServicePage` template
(`src/components/templates/ServicePage.astro`); `city` adds the town to the
title ("Panel upgrades in Round Rock, TX"), description, eyebrow,
breadcrumbs, schema `areaServed`, a "Do you offer … in <town>?" FAQ first,
and highlights it on the map; the area chips link to the other towns. The
map's outlines are `src/data/service-area-geo.json` (`@/lib/service-area-geo`
— `npm run demo` writes it). Off by default: on a real client site, turn it
on only for towns the business genuinely serves, and consider adding real
local detail per town — near-duplicate town pages are thin content.

### Composing a page

The whole stack is a template: **`LocalServiceHome`**
(`src/components/templates/LocalServiceHome.astro`) renders a full home page
from one `home` object (`LocalServiceHomeData`, `src/lib/local-service-home.ts`);
optional sections (`stats`, `process`, `photoBand`, `story`, `reviews`, `faqs`)
render only when their data is there, and the service cards come from
`src/content/services`. Its photo-led sibling **`LocalServiceShowcase`** takes
the same `home` object (`layout: "showcase"`; dev page
`/demo/local-service-showcase`): background hero at `headingSize="h1"`,
recent work on dark, the story with a text-link CTA, a `cinematic` CallBand,
and none of the offer/symptoms/comparison/hero panel. **`LocalServiceContact`** (same folder) is the matching
contact page — it needs only `title` and `description`. The dev-only
`/demo/local-service` page feeds `LocalServiceHome` the sample in
`src/data/local-service-sample.ts`; prospect demos (`npm run demo`,
presets/local-service) feed it a generated `src/data/home.ts`. For a client
site, either use the template with the client's data or copy its section
stack into the page when the client wants page-level edits. The stack, in
order:

```astro
<Hero
  heading="Remodels done <strong>right</strong>"
  image={hero}
  imageAlt="…"
  primaryCta={{ label: "Get a free estimate", modal: "estimate-modal" }}
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
  secondaryCta={{ label: "Get a free estimate", modal: "estimate-modal" }}
/>
<LeadFormModal
  id="estimate-modal"
  formId="contact"
  heading="Get a free estimate"
/>
```
