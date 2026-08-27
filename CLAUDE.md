# Astro Starter — Conventions

This project uses a structured class-naming and component system. This file
holds the rules that must always be in context; the deep reference material
lives in **skills** — load them, don't guess:

| Load this skill       | Before                                                                                                                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `component-api`       | Building or editing any page/section, or using any component (Section, Layout, Card, Slider, Carousel, Tab, Accordion, forms, …) — every prop table and page pattern is there                         |
| `styling-reference`   | Styling beyond applying existing utilities: tokens/variables, theming and `data-theme-invert`, the responsive flag system, the full utility list, text rhythm/margin-trim mechanisms, image/SVG rules |
| `sanity-and-preview`  | Anything Sanity (queries, TypeGen, schema, Studio, Presentation), draft mode / `/preview`, deployment, rendering model, sitemap, env vars, adding a content type                                      |
| `seo-discoverability` | JSON-LD / structured data, per-page SEO, llms.txt — and ALWAYS when adding a new static page (manual `PAGES` registry step)                                                                           |
| `setup`               | Setting up a fork as a new project                                                                                                                                                                    |

Other docs: [docs/new-project-checklist.md](docs/new-project-checklist.md)
(per-fork dashboard setup), [docs/brand-color-guide.md](docs/brand-color-guide.md),
[docs/responsive-columns.md](docs/responsive-columns.md).

> **Forking this repo for a new project?** Start with the checklist above —
> most of a rebrand is config (`src/config/site.ts`, `site.shared.mjs`,
> `src/data/site-structure.ts`, brand color, logo), not find-and-replace.

---

## Class naming system

Three kinds of classes, applied in this order on any element: **custom class
first**, then utilities, then combo classes.

**1. Custom classes** — identify an element's role within a component.

- Underscores between words: `hero_wrap`, `card_title`; compound-word
  prefixes keep hyphens: `case-study_card_title`. Max 3 underscores; deeper
  nesting starts a new subcomponent.
- Format `type_variation_element`; broadest type first:
  `card_testimonial_title`.
- `_wrap` marks the outermost element of a component. Interactive roots
  (`<a>`, `<button>`) and any element containing children with component
  classes also end in `_wrap`.
- Every element gets a custom class (rare exceptions for
  `u-display-contents` slots) — no bare tags with only utilities.
- Name children for **role, not mechanism**: `_layout`/`_list`, never
  `_grid`/`_flex`. Preferred suffixes: `_title` not `_heading`, `_text` not
  `_paragraph`, `_img` not `_image`.

**2. Utility classes** — single-purpose, `u-` prefixed, dashes between words
(`u-text-style-large`, `u-gap-1rem`). Stacked on top of a custom class, never
alone. **Max 4 per element** — more styling belongs in the custom class.
Full utility list: `styling-reference` skill.

**3. Combo classes** — `is-` prefixed modifiers (`is-active`, `is-featured`),
dashes between words, applied on top of a custom class and **always scoped**:
`.card_wrap.is-featured { }`, never bare `.is-featured { }`.

```html
<section class="cta_wrap u-padding-block-large is-dark">
  <div class="cta_layout u-container u-grid-2 u-gap-gutter">
    <h2 class="cta_title u-text-style-h2">Heading</h2>
  </div>
</section>
```

## Units & tokens

- **No `px` in authored CSS.** `rem` for lengths, `ch` for text max-widths,
  `em` for anything that should track font size (icon sizes, control
  padding).
- Never hardcode colors, font sizes, radii, or border widths — use the
  variables (`--space-*`, `--radius-*`, `--border-width-main`, theme aliases
  like `--background`/`--text`/`--border`). Components read **semantic theme
  aliases** from `themes.css`, never raw swatches from `colors.css`.
- Fluid tokens are tuned via their `-min`/`-max` companion numbers in
  `variables/foundation.css` — never edit a `clamp()` formula.
- `--_` prefix marks **component-internal** custom properties (set and read
  in one file, free to rename). Never reach for another component's `--_`
  variables — promote to a token if two components need the value.

## File structure (short map)

```
src/
├── assets/           # Images (.avif/.webp preferred), icons/*.svg for <Icon>
├── components/       # ui/ · sections/ · form/ · global/ · templates/ · case-study/ · portabletext/
├── config/           # site.ts (SITE), site.shared.mjs, logo-paths.ts — import, never hardcode
├── data/             # site-structure.ts (PAGES/NAV_MENU/FOOTER_GROUPS/BANNER), faqs.ts
├── layouts/          # BaseLayout.astro
├── lib/              # slots.ts (slotContent), uid.ts, jsonld.ts, toc.ts, …
├── pages/            # Routes; preview/** and api/** are the only SSR routes
├── sanity/           # Queries, loaders, generated types, Studio components
├── scripts/          # animation.js, scroll-refresh.js, social-share.js
└── styles/           # A DIRECTORY'S NAME IS ITS CASCADE LAYER
    ├── global.css    # The index — declares the cascade, imports every global sheet
    ├── reset.css · vendor.css · overrides.css
    ├── variables/    # foundation, colors, themes, typography, spacing, layout, nav
    ├── base/         # Element/attribute defaults only
    ├── utilities/    # Every u- class (import order is load-bearing)
    ├── components/   # ONLY component CSS with no single owner (forms.css, marketing-scorecard.css)
    └── pages/        # Page CSS; imported by the page, opens with @layer pages { }
```

## Cascade layers (the two hard rules)

Layer order in `global.css`: `reset, vendor, variables, base, utilities,
components, pages, overrides` — later beats earlier regardless of
specificity. Utilities sit BELOW components **on purpose**.

1. **Never write unlayered CSS.** Component classes go co-located in the
   component's own file as `<style is:global>` wrapped in
   `@layer components { … }` — both attributes load-bearing (`is:global` also
   keeps classes reachable inside `set:html` slot content). Page CSS opens
   with `@layer pages { … }` in-file. Third-party CSS only via `vendor.css`.
   A bare scoped `<style>` block is unlayered and silently outranks the
   whole design system.
2. **A rule that must beat page/component styling goes in `overrides.css`** —
   keep that file small; read its header first.

Full decision table (base vs utilities, shared component CSS, etc.):
`styling-reference` skill.

## Slots: render once

When a component needs to inspect or gate on slot content, capture it ONCE
with `slotContent()` from `@/lib/slots` and emit the string with
`<Fragment set:html={…}>`:

```astro
---
import { slotContent } from "@/lib/slots";
const content = await slotContent(Astro.slots);
---

{
  content && (
    <div class="x_wrap">
      <Fragment set:html={content} />
    </div>
  )
}
```

- **Never render `<slot />` after calling `Astro.slots.render()`** — the
  second render silently drops the hoisted `<script>` of every component
  inside the slot, page-wide (measured: one Slider in a Card footer killed
  both sliders on the page).
- Frontmatter capture is safe on the current setup — verified against both
  historical failure modes (script drop, and the image-service cold-start
  `validateOptions` crash) on Astro 6.4.6: dev cold start ×3, production
  build A/B, SSR `/preview` cold start ×2 (slotContent spike, 2026-08-27).
  If a `validateOptions` error ever reappears on a cold start, re-run that
  spike before changing anything.
- `Astro.slots.has()` stays fine for cheap "was it passed" checks.
- Section, Card, Carousel, Dropdown, Accordion(Item) already work this way —
  their empty slots emit nothing. `render={false}` still expresses "skip"
  from data at the call site.

## Layout & spacing (the rules that bite)

- **`<Layout>` is the only layout component** — its default slot IS column 1;
  `slot="column2"` for the second. No wrapper divs around loose column
  children (a plain div becomes the grid child and kills alignment/gap).
- **`<body>` is the page shell** — BaseLayout renders SkipLink, Navbar,
  `<main>`, Footer as direct children; never add a wrapper div.
- **Containers space their children.** Section's container is a flex column
  with `gap` (default `--space-8`); Layout columns have `rowGap`. Never add
  `marginBottom` between their direct children — retune the container's gap.
  (`<Layout variant="stack">` is the exception: a plain block using text
  margins.)
- **Section padding:** the default is `main` — write no padding prop at all
  for almost every section. Don't reach for `large` by habit. `page-top` is
  fixed-nav only; this project's nav is **sticky**, so heroes use the normal
  default.
- Grid columns: never bare `1fr` — always `minmax(0, 1fr)`.
- Never put layout (`display: grid` etc.) directly on `u-container` (it's the
  container-query context) — use a child `_layout` element.
- Any element with responsive `display: var(--flex-*, grid)` also needs
  `flex-direction: column` for its collapsed form.
- `grid-column-end: span N`, not absolute end values.
- Prefer the responsive flag variables (`--flex-medium`, `--none-small`,
  `--column-small`, `--center-medium`, `--responsive-*`, …) over `@container`
  for keyword switches — full table in `styling-reference`.
- Text: bottom-margin-only rhythm; don't wrap text elements (`.u-text` IS the
  element); direct parents of text must not be flex; don't repeat the
  layout's alignment on children; `maxWidth` has built-in defaults — don't
  add it reflexively. New centred layout contexts must set
  `--_text-inline-margin: auto` **and** `--_buttons-justify` (mechanisms in
  `styling-reference`).
- Images: every image needs real alt text (never `alt=""`); `height: auto` is
  the base and filling a box is opt-in per pattern; a ratio'd `<Visual>`
  sharing a column with other content needs `<Layout variant="stack">`
  around them.
- Interactions are plain CSS — `:hover`, `:focus-visible`, scoped
  `.is-active`, `[open]` on details, `:has(:checked)`. **Hover styles go
  behind `@media (hover: hover)`.**

## Props & TypeScript

- Props interfaces extend `HTMLAttributes<"tag">` for the rendered element —
  extra DOM attributes are type-checked, spread via `...rest`. **Never add an
  index signature** (`[key: string]: any` re-legalizes every typo).
- **Give prop types a NAME.** Inline unions
  (`variant?: "default" | "background"`) silently lose their editor tooltips
  in intersection-typed components; a named alias (`variant?: VisualVariant`)
  keeps them.
- **Never export a type whose first token is a leading `|` pipe** — it breaks
  `npm run build` (`Unexpected "export"`) while `astro check` stays green.
  Export only what another file imports (`Props`, `PaddingSize`); keep helper
  types unexported.
- **No stray `<` or `>` in frontmatter comments** — one stray angle bracket
  detaches the file's whole Props type at call sites (tooltips gone, invalid
  props stop erroring, no diagnostic). Write comparisons in words. Balanced
  pairs in `@example` blocks are safe.
- Every component has a `docs` prop (destructured, unused) holding its manual
  as JSDoc — hover it in an editor. **`npm run check:hover`** drives the real
  language server and fails if any documented prop loses its tooltip — run it
  after touching any Props interface. Neither hazard is worth reasoning about
  at the keyboard: measure, don't predict.
- Variant-dependent props use a **discriminated union** (Button's link/button
  split, Card's href-only props, Video's custom-ratio) with a widened
  `AllProps` alias for the internal destructure.
- **Prop order** (interface and destructure alike): `docs`, `render`,
  per-instance content, `variant`, variant-only props, occasional settings,
  then `class` and `...rest` last.
- Validate with **DEV `console.warn`, never a throw** — invalid values drop
  to defaults; prefix messages `[ComponentName]`.
- Components that skip themselves: `render` prop (default `true`) plus
  nothing-when-required-prop-missing plus nothing-when-slots-render-empty.

## Working practices

- **Imports:** `@/` alias for anything leaving the current directory;
  same-directory `./` is fine.
- **Formatting:** Prettier owns it — `npm run format` before committing;
  `format:check` gates CI. `Head.astro` and `BaseLayout.astro` are
  `.prettierignore`d (format by hand).
- **Merging classes:** always `class:list` (base class first, conditional
  modifiers, caller's `className` last). Merging inline **styles** is
  separate: `[computed, userStyle].filter(Boolean).join("; ")`.
- **Animation/slider dependencies are per-component imports** — no window
  globals, no site-wide library script. GSAP today: `animation.js`
  (dynamically imported behind data-attribute checks), ScrollReveal,
  HowItWorks, StackingPanels, Services. Swiper: Slider, TestimonialShowcase.
  Tab, Accordion, Modal, Marquee, Carousel, Dropdown are pure CSS + small
  hoisted scripts. Layout-changing components dispatch
  `scrolltrigger:refresh` (see `src/scripts/scroll-refresh.js`) instead of
  importing GSAP. Swiper's CSS ships via `vendor.css` only.
- **GSAP data attributes** (`data-fade-in`, `data-fade-up`,
  `data-splittext`, `data-prevent-flicker`, `data-duration`,
  `data-distance`, `data-stagger`) drive scroll-triggered animations —
  attributes, not classes.
- Form inputs never below `1rem` font-size (iOS auto-zoom).
- **Renaming anything? Grep the old name before you finish**
  (`grep -rn "<old-name>" src CLAUDE.md .claude docs`) and sort hits into
  real consumers (update), deliberate historical notes (keep), and stale
  instructions (rewrite — the dangerous ones). Cross-file pairs — a custom
  property set in one file and read in another — have no compiler tying the
  ends together; change both in one commit.
- **Site-wide values** (email, phone, URL, brand name, socials) come from
  `SITE` in `src/config/site.ts` — never hardcode. Sanity ids + site URL live
  in `site.shared.mjs` (the config-context leaf); `wrangler.jsonc` mirrors
  them, validated by `npm run check:config` (prebuild). Brand color:
  `--color-brand-500` in `colors.css` is canonical; `SITE.brand.color` is its
  literal mirror for email/`<meta theme-color>` — keep in sync.

## Browser support

Baseline widely-available features are the floor. Animation niceties may be
Chromium-first with graceful degradation — `interpolate-size` +
`::details-content` (Accordion, Dropdown) and `field-sizing: content`
(FormTextarea) degrade to instant open / fixed-height with identical
behavior. `details name`, `@starting-style`, `:has()`, container queries are
Baseline and used freely. Verify cross-engine when touching those components.

## New-style checklist

Before writing any new CSS:

- [ ] Does an existing variant or utility already produce this look? New CSS
      is the last resort.
- [ ] Utilities override **one instance**. The moment several utilities have
      to hold together to make a look, that look is a variant (or a custom
      class), not a stack of classes.
- [ ] Repeating the same utility on every instance means the default is
      wrong — fix it at the source (token, prop default, or new prop).
- [ ] Custom classes follow the naming system; the root ends `_wrap`;
      children carry the family prefix; combos are scoped `is-*`.
- [ ] Co-located `<style is:global>` + `@layer components`; no `px`; tokens
      not hardcoded values; hover behind `@media (hover: hover)`.
- [ ] Responsive via the flag variables where they can express it; container
      queries only for what they can't.

## New-component checklist

- [ ] It earns its existence — a new card is a `Card` variant, not a second
      card component.
- [ ] `docs` prop + JSDoc on every prop; named type aliases; prop order
      convention; `render` prop; DEV `console.warn` validation.
- [ ] Slots handled render-once (`slotContent` + `set:html`) when inspected;
      empty slots emit nothing.
- [ ] Class family follows the naming system; CSS co-located and layered.
- [ ] Reduced motion handled; keyboard access checked; `aria-hidden` on
      decorative SVGs.
- [ ] Demo added to `src/pages/components.astro`; `npm run check:hover`
      passes; documented in the `component-api` skill.
- [ ] Portable: copy the component into another page and it works with
      nothing else moved.

## Verification commands

`npm run check` (astro check) · `npm run check:hover` (prop tooltips) ·
`npm run check:config` (wrangler/site.shared sync; runs prebuild) ·
`npm run check:schema` (JSON-LD, needs dev server) · `npm run build` ·
`npm run format:check` · `npm run typegen` (after any GROQ/schema change).

## Anti-patterns

- Unlayered CSS anywhere; third-party CSS imported from a script.
- `display: grid` on `u-container`; bare `1fr` grid columns.
- Rendering `<slot />` after `Astro.slots.render()` — dead client JS.
- A CSS-variable trigger/state indirection for hover/active — style the real
  state.
- Unscoped combo classes; hyphens between component-name words; bare
  elements with only utilities; hardcoded colors/sizes/borders; `px` units.
- `order` in responsive layouts when DOM order + `grid-column-start` works.
- `alt=""` on any image; icon+text flex rows without `u-text-shrink`;
  icons without `flex-shrink: 0`; square icons via width+height instead of
  width+aspect-ratio; `display: flex` directly on parents of text.
- Margins between Section/Layout children (the container's gap owns it);
  redundant `marginBottom={0}` on the last child of trimmed wrappers;
  reflexive `maxWidth` on Heading/Text; `padding="large"` or
  `paddingTop="page-top"` by default.
- Hard-coded per-theme card colors (`[data-theme="dark"] .card …`) — use
  `theme="invert"` / `data-theme-invert`; putting a contrasting card's
  `color` only on a child layer (put the marker and `color: var(--text)` on
  the card's own wrapping class).
- An `<a>` whose only accessible name is `aria-label` — put the label in a
  visually-hidden child (`u-sr-only`); `<button>` is exempt.
- Making CMS content routes SSR "so preview works" — preview lives on the
  `/preview/*` SSR twins; public content routes are prerendered (SSR content
  routes caused real production `exceededCpu` 503s).
- Fetching a whole collection to render a few related cards; sequential
  awaits on independent queries — filter in GROQ, `Promise.all`.
- A `sitemap({ customPages })` list — prerendered routes enumerate
  automatically.
- `limits: { cpu_ms }` in `wrangler.jsonc` — Workers Paid only; on Free the
  deploy silently fails.
