---
name: styling-reference
description: The long-form CSS system reference for this starter. Load BEFORE styling work that goes beyond applying existing utility classes — defining or editing CSS variables/tokens (src/styles/variables/), theming (data-theme, data-theme-invert, themes.css, footer theme), the responsive flag system (--flex-medium, --none-small, --responsive-*, container-query tiers), the full utility class list, hover/focus/state interaction patterns, text rhythm and margin-trim (u-margin-trim, --_text-inline-margin, --_buttons-justify), or image/icon/SVG rules (u-image-wrapper, aspect-ratio, height:auto). CLAUDE.md keeps only the short rules; the mechanisms and full tables are here.
---

# Styling Reference — variables, responsiveness, interactions, rhythm, images

## Variables

CSS custom properties are defined in `src/styles/variables/`. Use them for:
typography, color, page structure (section padding, container widths), spacing
(`--space-*`, `--section-space-*`, `--gap-*`), layout (grid counts, max
widths), and misc (radius `--radius-*`, border width). Use custom styles or
utility classes (not variables) for `display`, width/height, opacity,
overflow.

**Naming:** `--category-subcategory-variant` — `--color-brand-black`,
`--site-margin`, `--space-4`, `--radius-main`, `--site-gutter`.

**Spacing system — three tiers** (all fluid via `clamp()` between 20em/320px
and 90em/1440px):

| Variable group                     | Purpose                                                            | Range               |
| ---------------------------------- | ------------------------------------------------------------------ | ------------------- |
| `--space-1` … `--space-8`          | Fluid micro-spacing (margins, gaps, text spacing)                  | 6px–64px            |
| `--section-space-small/main/large` | Fluid section vertical padding                                     | 3rem–10rem          |
| `--gap-1` … `--gap-8`              | Gap aliases mapping to the space scale                             | Same as `--space-*` |
| `--site-margin`                    | Fluid horizontal container gutter (used in container width calc)   | 1rem–3rem           |
| `--site-gutter`                    | Fluid column gap for column-width calculations                     | 1rem–2rem           |
| `--grid-breakout`                  | Named-line grid for full-bleed layouts (12-col + viewport gutters) | —                   |
| `--grid-breakout-single`           | Mobile version of the breakout grid                                | —                   |

**Fluid tokens are edited via their `-min`/`-max` companions** (unitless px
numbers in [foundation.css](../../../src/styles/variables/foundation.css)) —
retune a token by editing two numbers, never the `clamp()` formula.

**Brand color:** the canonical value is `--color-brand-500` in
[colors.css](../../../src/styles/variables/colors.css). `SITE.brand.color` in
`src/config/site.ts` is a literal **mirror** used only by HTML email and
`<meta theme-color>` (contexts that can't read CSS variables). Keep the two in
sync when re-skinning. `colors.css` holds raw swatches only;
[themes.css](../../../src/styles/variables/themes.css) holds the semantic
aliases (`--background`, `--text`, `--border`, …) — **components read the
aliases, never a raw swatch**.

## Theme invert — a card that must contrast with its section

`data-theme-invert` flips an element to the **opposite of the ground it sits
on**, and every descendant follows, because a theme here is a set of inherited
custom properties:

| Ground it sits on           | What the island becomes |
| --------------------------- | ----------------------- |
| `dark` section              | light                   |
| `brand` section             | light                   |
| `light` section             | dark                    |
| no theme set (page default) | dark                    |

Put it on **any** wrapper — a card, a panel, a bare `div` — and the whole
subtree inverts. It takes a **whole theme**, not a partial copy:

```html
<div class="testimonial_card" data-theme-invert>…</div>
```

```css
.testimonial_card {
  background: var(--background-2); /* the theme's card background */
  color: var(--text);
  border-color: var(--border);
}
```

The rule lives in themes.css as two selector lists, and **specificity is what
makes the flip relative**: the light block lists
`[data-theme="dark"] [data-theme-invert]` and
`[data-theme="brand"] [data-theme-invert]` (two-part, so they win where they
apply), while the dark block lists a bare `[data-theme-invert]` (one-part) to
catch light and unthemed grounds. Adding a fourth theme mode means adding one
selector to the block holding the theme it should flip _to_.

**On components:** cards do not invert automatically.
`<Card theme="invert">` and `<TestimonialCard theme="invert">` opt in; the
theme union is `inherit | light | dark | brand | invert`. The section wrappers
(`TestimonialsSlider`, `TestimonialsGrid`, `BlogPostGrid`, `CaseStudyGrid`)
pass `invert` for you when their own `theme` is dark or brand.

**Why a whole theme and not a `--surface-*` tier:** this replaced a tier that
copied only background/text/heading-accent/border. Because the copy was
partial, buttons and links inside a card still resolved against the
**section** theme — and that mismatch shipped a real bug when the card title
became a real anchor. A whole theme has no such gap. Never hard-code per-theme
card colors in a component (`[data-theme="dark"] .card …`).

**Footer theme:** the footer uses its own variables per theme block in
themes.css — `--footer-background`, `--footer-text`, `--footer-border`. By
default all three themes set dark values, so the footer stays dark regardless
of page theme. `.footer_wrap` remaps them onto the standard aliases
(`--background`, `--text`, `--border`) and derives the link variables from
`--footer-text` via `color-mix()`, so all descendants resolve to the footer
palette. Only the three `--footer-*` variables need setting per theme.

## Utility classes (the full list)

See `src/styles/utilities/` for source. Categories:

| Category           | Example classes                                                                                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typography         | `u-text-style-h1`–`h6`, `u-text-style-eyebrow`, `u-display-xl/lg/md/sm`, `u-text-style-tiny/small/regular/large/xlarge`                                                                 |
| Text style         | `u-text-style-bold/italic/muted/strikethrough/nowrap`                                                                                                                                   |
| Text align         | `u-text-align-left/center/right`                                                                                                                                                        |
| Spacing — padding  | `u-padding-0`–`8`, `u-padding-small/main/large`, `u-padding-sitemargin/gutter`, `u-padding-block-*`, `u-padding-inline-*`, `u-padding-top/bottom/left/right-*`                          |
| Spacing — margin   | `u-margin-top/bottom-0`–`8`, `u-margin-top/bottom-auto/gutter`                                                                                                                          |
| Layout — container | `u-container`, `u-container-narrow`, `u-container-wide`, `u-container-full`                                                                                                             |
| Layout — flex      | `u-display-flex`, `u-flex-direction-row/column`, `u-flex-wrap`, `u-justify-content-start/center/end/between`, `u-align-items-start/center/end`                                          |
| Layout — grid      | `u-grid-1`–`u-grid-12`                                                                                                                                                                  |
| Layout — gap       | `u-gap-gutter`, `u-gap-0`–`8`, `u-gap-row-0`–`8`, `u-gap-column-0`–`8`, `u-gap-inherit`                                                                                                 |
| Background         | `u-background-1`, `u-background-2`, `u-background-skeleton`                                                                                                                             |
| Gradient           | `u-gradient-text`, `u-gradient-light-blue`, `u-gradient-light-blue-reverse`                                                                                                             |
| Shadow             | `u-box-shadow-xxsmall`–`xxlarge`                                                                                                                                                        |
| Radius             | `u-radius-none/xsmall/small/medium/large/xlarge/main/full/section`                                                                                                                      |
| Display            | `u-display-flex/none/block/inline-block`                                                                                                                                                |
| Visibility         | `u-visible`, `u-invisible`, `u-hide`, `u-hide-on-xsmall/small/medium/large`                                                                                                             |
| Overflow           | `u-overflow-hidden/auto/visible/scroll`                                                                                                                                                 |
| Dimension          | `u-w-100`, `u-h-100`                                                                                                                                                                    |
| Max width          | `u-max-width-xlarge/large/medium/small/xsmall/xxsmall`                                                                                                                                  |
| Z-index            | `u-z-index-1`, `u-z-index-2`                                                                                                                                                            |
| Aspect ratio       | `u-aspect-ratio-portrait/landscape/widescreen/square`                                                                                                                                   |
| Icon               | `u-icon-16/24/32/48/64`                                                                                                                                                                 |
| Image              | `u-image-wrapper`, `u-image`, `u-image-wrapper.is-background`                                                                                                                           |
| Content wrapper    | `u-content-wrapper`, `.is-center-align`, `.is-left-align`, `.is-right-align`, `.is-center-align-mobile`                                                                                 |
| Rich text          | `u-rich-text` — vertical rhythm for CMS/prose content (bare heading + paragraph tags)                                                                                                   |
| List               | `u-list` — bullet/ordered list spacing without the rich-text wrapper; font-size via `:where()` so any `u-text-style-*` overrides it; direct `li` children get `--space-2` between items |
| Button             | `u-button-reset` (`u-button-wrapper` is applied by `<ButtonWrapper>` — use the component)                                                                                               |
| Color              | `u-inherit-color`                                                                                                                                                                       |
| Text shrink        | `u-text-shrink` — add to a flex-row parent with icon + Text children to prevent overflow                                                                                                |
| Accessibility      | `u-sr-only`                                                                                                                                                                             |

## Responsive Variable System

Responsive behavior is driven by CSS custom property flags defined in
[responsive-columns.css](../../../src/styles/utilities/responsive-columns.css).
Flags are set per container-query breakpoint tier on all descendants (`*`), so
any component's CSS can reference them without writing container queries.

**Breakpoint tiers** (requires a `container-type: inline-size` ancestor like
`u-container`): **large** — default (no query) · **medium** —
`@container (width < 58em)` (~928px) · **small** — `@container (width < 35em)`
(~560px) · **xsmall** — `@container (width < 20em)` (~320px).

**Flags per tier** (undefined at larger tiers — use the CSS fallback value):
`--flex-{tier}: flex`, `--none-{tier}: none`, `--column-{tier}: column`,
`--row-{tier}: row`, `--start/center/end-{tier}`, `--unset-{tier}`,
`--relative-{tier}: relative`, `--responsive-{tier}: 1` (numeric, for
`calc()`).

**Usage patterns — prefer these over `@container` for keyword switches:**

```css
display: var(--flex-medium, grid); /* collapse grid to flex on medium */
flex-direction: var(--column-small, row); /* switch direction on small */
justify-content: var(--center-medium, flex-start);
display: var(--none-small, block); /* hide on small */
position: var(--relative-medium, sticky);
top: calc(
  (var(--nav-height-total) + var(--space-2)) * var(--responsive-large, 0)
);
```

Only write `@container` when a flag can't express the change (changing
`grid-template-columns` values, adjusting padding amounts, non-keyword
properties).

Note: the JS-coupled components are the exception — `ScrollReveal` uses
`@media` (not `@container`) to stay in sync with its
`ScrollTrigger.matchMedia('(min-width: 768px)')`, and `Slider`/`Carousel`
breakpoints are viewport media queries at 35/50/64rem matching their
slides-per-view props.

## Interactions (plain CSS)

Hover, focus, and active/open are **plain CSS** — no trigger/state variable
indirection.

- `:hover` and `:focus-visible` for an element's own state. For a root driving
  children (Button's root painting `.button_main_element`):
  `.button_main_wrap:hover .button_main_element`, plus `:has(:focus-visible)`
  only when the focusable element is genuinely a descendant.
- `:focus-within` for "this container has focus" (form-field borders).
- **`.is-active`** for JS-driven interactives (tabs, sliders). JS toggles it;
  CSS styles it. Always scoped: `.tabs_link_wrap.is-active { }`, never bare
  `.is-active { }`. Don't invent `.is-visible` / `.is-open`.
- **`[open]` on native `details`** for disclosure state (Accordion, Dropdown):
  rotate chevrons via `.x_wrap[open] .x_icon`; panels open via
  `::details-content` transitions. Older `aria-expanded`-driven disclosures
  (the footer locations dropdown) key off
  `[aria-expanded="true"]` + `:has()`.
- **`:has(:checked)`** for custom checkbox/radio/chip/toggle visuals.
- Open a **Modal** with `data-modal-trigger="modal-id"`.
- **Gate hover styles behind `@media (hover: hover)`** so touch devices don't
  get sticky hover states.

```css
/* Fade on hover */
.card_link {
  opacity: 1;
  transition: opacity 0.2s ease;
}
@media (hover: hover) {
  .card_link:hover {
    opacity: 0.6;
  }
}

/* Faded text */
color: color-mix(in hsl, currentColor 70%, transparent);
```

## Text & Spacing (the mechanisms)

**Spacing between siblings belongs to the container, not the children.**

- The `<Section>` content container (`.u-container`) is a **flex column with a
  built-in `gap`** — default `--space-8`, overridable via the Section `gap`
  prop (`0`–`8`).
- A `<Layout>` column is a CSS grid with a `rowGap`.
- So between direct children of a Section or a Layout column, never add
  `marginBottom` — retune the container's `gap`/`rowGap`.
- **Exception:** `<Layout variant="stack">` is a plain block with **no gap**;
  spacing there comes from the text elements' own bottom margins (last one
  auto-trimmed).

**Text spacing is bottom-margin-only.** Every text style class declares both
margins via variables, but every `margin-top` variable is `0`.
`base/elements.css` zeroes both margins on bare `h1`–`h6`/`p`/`blockquote`/
`label`. **Rich text** (`.u-rich-text`) is a separate rhythm system where bare
tags flow: headings get both margins, paragraphs bottom only, values from
`--space-*` directly (rules in
[utilities/typography.css](../../../src/styles/utilities/typography.css)).

**Margin trim:** containers (`u-container`), layout columns
(`u-layout-column`), content wrappers, rich text, and anything carrying
`u-margin-trim` remove `margin-top` from the first visible child and
`margin-bottom` from the last. `u-ignore-trim` opts a child out. The trim
rules live in [overrides.css](../../../src/styles/overrides.css) (the
`:last-child` fallback) and
[utilities/margin-trim.css](../../../src/styles/utilities/margin-trim.css)
(last-visible-child trim); the native `margin-trim` half sits in
Section.astro's style block.

**Don't add redundant `marginBottom={0}`.** The last child of any trimmed
wrapper is already zeroed. It is only needed as the last child of a **custom
`div`** that is not trimmed (a card body, a meta row, an `li`) — and even
there, prefer adding `u-margin-trim` to the wrapper once.

**Direct parents of text must not be `display: flex`** — flex prevents the
vertical margin collapsing the rhythm depends on.

**`.u-text` is the text element — never wrap text.** `.u-text` sits directly
on the element `<Heading>`/`<Text>` render. Two jobs a wrapper would otherwise
do: (1) filling the column — `width: 100%` on `.u-text`; (2) centring a
`max-width`-constrained box — via **`--_text-inline-margin`**, an inheriting
custom property set alongside every `align-items` hint
(`.u-content-wrapper.is-*-align`, the `stack-centered`/`card` Layout
variants). **If you add a new centred layout context, set
`--_text-inline-margin: auto` there too**, or constrained headings silently
left-align. The button-row twin is **`--_buttons-justify`** (consumed by
`ButtonWrapper`) — set it in new centred contexts as well; a bare
`justify-content: inherit` only works for direct children, which is the bug
this replaced.

**Don't repeat the layout's alignment on the text.** `text-align` inherits, so
inside `stack-centered` (or any `.is-center-align` wrapper) children are
already centred — `align="center"` on the child does nothing except hard-code
the alignment against future layout changes. `align` is for when the
surrounding context is _not_ aligned that way.

## Images, Icons & SVG (the mechanisms)

**Structure.** Wrap images with `u-image-wrapper` (dimensions, radius,
overflow) and apply `u-image` to the `img` (absolute-fill with focal-point
positioning via `--_x`/`--_y`). `is-background` on the wrapper for Section
background slots.

**Every image needs real alt text — never ship `alt=""`.** SEO crawlers report
an empty alt as missing. Reuse the data's `imageAlt`/`alt` field. Inside
`aria-hidden="true"` containers the alt is skipped by screen readers but still
read by crawlers — present and descriptive there too. Only third-party images
whose markup we don't render are exempt.

**`height: auto` is the default; filling a box is opt-in.** `aspect-ratio`
only computes a **missing** dimension — the moment a wrapper also has a
definite height, the ratio is silently ignored. The base is `height: auto` in
[visual-utilities.css](../../../src/styles/utilities/visual-utilities.css).
Patterns that must FILL their box say so explicitly with
`aspect-ratio: unset; height: 100%` on their own rule: `.is-background`, the
`full`/`contain` Layout variants, `.card_primary_visual`,
`.scroll_reveal_panel`, the case-study featured card. **Do not restore
`height: 100%` on the base rule** — the ratio stops working everywhere at
once and nothing in `astro check` or the build notices; it was caught only by
measuring image boxes across pages.

**Loading.**

- `<Visual>` applies a skeleton background by default; remove it for
  transparent images (logos, PNGs) with the bare `transparent` keyword prop.
- **Background images load eagerly** (`<Visual variant="background">` defaults
  to `loading="eager"`): native lazy-load can fail to fire inside the
  multi-layer absolute-fill chain used by Section backgrounds, especially on
  SSR routes. `priority` upgrades to `fetchpriority="high"` for
  above-the-fold heroes.

**Icons & logos.** Icons or logos next to text need `flex-shrink: 0`. Square
ones use `width` + `aspect-ratio: 1/1`, not `width` + `height`. Logos need
`object-fit: contain`.

**SVGs.** Give each SVG its own component class. Stroke attributes belong in
CSS, not inline — `stroke-width: var(--border-width-main)`,
`stroke: currentColor`. Decorative SVGs need `aria-hidden="true"`. To place an
`src/assets/*.svg` inline, use the `<Icon>` component (em-sized, auto
`aria-hidden`).

## Where CSS goes (the full decision table)

- **Component classes** → co-located in the component's `.astro` file:

  ```astro
  <style is:global>
    @layer components {
      .my-component_wrap {
        /* … */
      }
    }
  </style>
  ```

  Both attributes are load-bearing: `is:global` skips Astro's scoping hash
  (required for classes targeted across files and for slot content emitted
  via `set:html`); `@layer components` slots them into the cascade. A bare
  scoped `<style>` block is unlayered and would beat every layer.

- **Component CSS with no single owning component** →
  `src/styles/components/` (add to `global.css` with `layer(components)`).
  Qualifying files today: `forms.css` (one stylesheet for the whole form
  family, shared by the contact page + SignUpForm — the documented exception
  to co-location) and `marketing-scorecard.css` (owned by a React `.tsx`,
  which can't hold an Astro style block).
- **Page-specific classes** → `src/styles/pages/[page].css`, opening with
  `@layer pages { … }` in-file (ESM imports can't carry `layer()`).
- **Utilities** (`u-`) → `src/styles/utilities/` (existing files; import
  order in global.css is load-bearing).
- **Element/attribute defaults** (bare `h1`, `[data-*]` initial states) →
  `src/styles/base/`.
- **Variables** → `src/styles/variables/`.
- **Rules that must beat page/component styling** → `overrides.css` (keep it
  small; read its header first).
- **Third-party CSS** → via `vendor.css` only (`@import … layer(vendor)`),
  never a bare ESM import — that lands unlayered and outranks the design
  system (this is why Swiper's CSS goes through it, and why
  `image.responsiveStyles` stays **off** in astro.config.mjs).

Each styles directory is its cascade layer, so the choice is one question:
_must a component class be able to override this?_ Yes → `base/`. No →
`utilities/`. Every file opens with an `Owns:` / `Does not:` header — read it
before adding, extend it when you do.
