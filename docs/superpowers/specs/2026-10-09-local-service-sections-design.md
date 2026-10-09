# Local-service sections — design

Sub-project 3 of the starter-template roadmap. Sub-project 1 (GoHighLevel
lead pipeline) is PR #32; sub-project 2 (building blocks, projects and
gallery) is PR #33. Implementation starts once both are merged and branches
from `main`.

## Goal

Ready-made page sections for local-service and trades sites, generalised from
two sources:

- Way Construction (`~/Documents/GitHub/way-construction`, branch
  `build/way-site`)
- the ACE Electric and Outdoor Living demos (`~/Documents/GitHub/clcreative`,
  branch `demo/ace-electric`)

The aim is that a new client's home and service pages are mostly a stack of
these sections filled with that client's content.

Success means four things:

1. Each section takes all of its content as props. No client copy, region,
   phone number or brand colour is built in.
2. Each section is built on the starter's own `Section` / `Layout` primitives
   and the sub-project 2 building blocks. Nothing uses clcreative's
   `col1`/`Col`/`ContentWrapper`.
3. Each section has a `/components` demo, and a dev-only
   `/demo/local-service` page shows them stacked into a full sample home page.
4. `npm run check`, `check:hover`, `format:check` and `build` pass.

## Decisions (agreed with Casey)

- **Content comes from props in the page**, not Sanity. That's the fastest
  path to a new site, and it works with or without the CMS.
- **Look:** sections use the starter's themes (`light`, `dark`, `brand`) and
  tokens. Way's `bone` theme and the demos' palette overrides are per-client
  theming and are not ported.
- **Phone:** every call button reads `SITE.phone`.
- **Reviews:** typed-in quotes with an optional star rating and count. There
  is no review JSON-LD; self-serving review markup risks a Google manual
  action.

## Shared pieces

**CTA shape.** New file `src/lib/cta.ts` exports:

```ts
export interface SectionCta {
  label: string;
  /** Link target. Ignored when `modal` is set. */
  href?: string;
  /** Id of a <Modal> to open instead of navigating (e.g. the LeadFormModal). */
  modal?: string;
}
```

Every section CTA prop uses `SectionCta`. A small `CtaButton.astro` in
`src/components/ui/` renders one as a `Button`:

- with `modal` set, it adds `data-modal-trigger={modal}` and renders as a
  `<button>`;
- otherwise it renders a link to `href`.

The phone button is a separate boolean, `showPhone`, which renders
`tel:${SITE.phone.tel}`, labelled with `SITE.phone.display`, using the new
phone icon in the start position.

**`LeadFormModal.astro`** (`src/components/form/`) is a `<Modal id>` holding
a heading, a short line of text and a `<LeadForm formId>`. A page places it
once. Any `SectionCta` with `modal: "<id>"` then opens it. This is the demos'
"Get an estimate" pattern.

**Building blocks** (`src/components/ui/`):

- `ImagePair`:
  - two portrait photos side by side, the second offset down;
  - the offset resets below the small container tier;
  - used by ServiceArea and IncludedList;
  - props: `images: [{src, alt}, {src, alt}]`.
- `ServiceIcon`:
  - a 24×24 stroke icon in a rounded tile;
  - the icon set lives in `src/data/service-icons.json`;
  - it's a neutral set, ported from Way minus the disaster-specific icons:
    `grid`, `building`, `house`, `addition`, `kitchen`, `bath`, `roof`,
    `wind`, `alert`, `car`, `water`, plus new `tools`, `bolt`, `leaf`,
    `phone`, `check`;
  - `ServiceIconName` is derived from the JSON keys;
  - an unknown name renders nothing and warns in dev.

**Assets and tokens:**

- `src/assets/icons/phone.svg`.
- A `--rating-star` theme alias in `themes.css`, pointing at an existing
  swatch.

**`SITE` additions** (`src/config/site.ts`):

| Field          | Type                                           | Used by                                          |
| -------------- | ---------------------------------------------- | ------------------------------------------------ |
| `founded`      | `number \| null`                               | Hero badge ("Since …")                           |
| `serviceAreas` | `string[]`                                     | ServiceArea chips (map `data-area` keys)         |
| `reviewsUrl`   | `string`                                       | Reviews "Read all reviews" link (blank = hidden) |
| `utilityBar`   | `{ text: string; areaLabel?: string } \| null` | UtilityBar (`null` = off)                        |

These are placeholders in the starter, documented in the new-project
checklist.

## Sections (`src/components/sections/`)

Every section follows CLAUDE.md:

- a `docs` prop and a `render` prop;
- named prop types;
- DEV `console.warn` on a missing required prop or an unknown variant;
- the section renders nothing when its required content is empty;
- co-located `@layer components` CSS;
- no `px`;
- hover styles behind `(hover: hover)`;
- `theme` and padding props passed through to `Section`.

| Section                                    | Key props                                                                                                                                                                                                                                                                                         | Notes                                                                                                                                                                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Hero`                                     | `variant: 'background' \| 'split' \| 'text'`, `eyebrow`, `heading` (HTML; `<strong>` = accent), `text`, `image`, `imagePosition`, `primaryCta: SectionCta`, `showPhone`, `secondaryCta?`, `breadcrumbs?`, `proof?: { rating?: number; text: string }`, `badge?: { value: string; label: string }` | `background` covers the photo with an overlay and sets `minHeight`. `split` is a 6-6 layout with the photo on the right. `text` has no photo. Breadcrumbs also feed the page's BaseLayout `breadcrumbs`; the section docs show how. |
| `StatsStrip`                               | `items: { value: string; label: string }[]`, `valueSize: 'number' \| 'word'`                                                                                                                                                                                                                      | 4 → 2 columns. A dark theme by default.                                                                                                                                                                                             |
| `ServiceCards`                             | `eyebrow`, `heading`, `intro`, `items: { title, text, image, imageAlt, href?, icon?: ServiceIconName }[]`, `layout: 'grid' \| 'swipe'`, `moreLabel?`                                                                                                                                              | `swipe` uses SwipeRow, for related services. With `href`, the whole card is a link.                                                                                                                                                 |
| `ServiceArea`                              | `eyebrow`, `heading`, `text`, `areas?` (default `SITE.serviceAreas`), `map?` (an imported SVG component), `mapLabel`, `images?` (ImagePair fallback), `cta?`                                                                                                                                      | The map's regions carry `data-area="<name>"` matching `areas`. Hovering or focusing a chip highlights its region, and the reverse. Without `map`, the section shows `images`.                                                       |
| `ProcessSteps`                             | `eyebrow`, `heading`, `text`, `steps: { title, text }[]`, `image?`, `variant: 'list' \| 'cards'`                                                                                                                                                                                                  | A 5-7 layout with StepList. `cards` puts the header above a StepList card row.                                                                                                                                                      |
| `StorySplit`                               | `eyebrow`, `heading`, `paragraphs: string[]`, `image`, `imageAlt`, `reasons?: { title, text }[]`, `cta?`                                                                                                                                                                                          | Photo on the left, story on the right. `reasons` adds the 2×2 ruled grid (Way's "Why Way"). Covers "meet the owner" and "why us".                                                                                                   |
| `Reviews`                                  | `eyebrow`, `heading`, `reviews: { text, name, meta? }[]`, `rating?`, `count?`, `layout: 'featured' \| 'grid'`, `allReviewsHref?` (default `SITE.reviewsUrl`)                                                                                                                                      | `featured`: the first review large on brand, the next two stacked (Way). `grid`: three columns with a rating badge (OL). Built on Quote.                                                                                            |
| `LeadFormSection`                          | `eyebrow`, `heading`, `text`, `formId`, `fields`, `projectOptions?`, `showPhone`                                                                                                                                                                                                                  | Intro and a "Rather talk now?" phone line on the left. LeadForm sits in an inverted (`data-theme-invert`) panel on the right. Dark by default.                                                                                      |
| `CallBand`                                 | `heading`, `text?`, `secondaryCta?` (default `{ label: "Contact us", href: "/contact" }`)                                                                                                                                                                                                         | Dark band. The phone button plus the secondary CTA.                                                                                                                                                                                 |
| `IncludedList`                             | `eyebrow`, `heading`, `text`, `items: string[]`, `images`                                                                                                                                                                                                                                         | A two-column CheckList beside an ImagePair.                                                                                                                                                                                         |
| `PhotoBand`                                | `image`, `alt`, `position?`                                                                                                                                                                                                                                                                       | A full-width strip, `clamp(11rem, 26vw, 24rem)` tall.                                                                                                                                                                               |
| `UtilityBar` (in `src/components/global/`) | none; reads `SITE.utilityBar`                                                                                                                                                                                                                                                                     | BaseLayout renders it above the Navbar when `SITE.utilityBar` is set. Desktop shows the text, phone and area label; phones get a full-width tap-to-call bar.                                                                        |

**CTASection change.** Two additions:

- `heading` accepts HTML, so `<strong>` renders as the accent.
- New `primaryCta` / `secondaryCta: SectionCta` props, so the closing CTA can
  open the form pop-up. The existing `buttonText` / `buttonHref` props keep
  working, which keeps existing callers unchanged.

## Out of scope

- The contact-page cards, the service link list, and the data-driven service
  pages and home or contact recipes. All of these belong to sub-project 4,
  which composes these sections.
- Sanity-editable sections.
- A per-client map generator. Making a map is client artwork; the ServiceArea
  docs explain the `data-area` contract.

## Verification

- `npm run check`, `check:hover`, `format:check` and `build` on a clean
  `npm ci`.
- Each section rendered with its required props missing in a temporary page:
  - it warns in dev;
  - it renders nothing;
  - nothing throws.
- `/components` demos and `/demo/local-service`, screenshotted at 1440 and
  390 with no horizontal overflow.
- Interactions in a browser:
  - ServiceArea chip ↔ map highlighting with a sample map, by mouse and by
    keyboard focus;
  - the LeadFormModal opens from a Hero CTA;
  - SwipeRow ServiceCards scroll at 390.
- `/demo/local-service` is dev-only: it's added to `DEV_ONLY_PATHS`, so the
  build strips it.
