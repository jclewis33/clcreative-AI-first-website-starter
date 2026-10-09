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
