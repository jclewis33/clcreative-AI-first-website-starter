# Astro Starter — Frontend Conventions

This project uses a structured class-naming and component system. Follow the conventions below when writing or editing any HTML, CSS, or Astro component.

> **Forking this repo for a new project?** Start with [docs/new-project-checklist.md](docs/new-project-checklist.md) — it walks through the per-fork identity/config edits (`src/config/site.ts`, `src/config/site.shared.mjs`, `src/data/site-structure.ts`, brand color, logo), the dashboard setup (Cloudflare, Sanity CORS, secrets, Dependabot), and post-launch verification. Most of a rebrand is config, not find-and-replace.

---

## Class Naming System

There are three types of classes. Apply them in this order on any element: **custom class first**, then utilities, then combo classes.

### 1. Custom Classes

Used to identify an element's role within a component. Always the first class on an element.

**Rules:**

- Use underscores between words: `hero_wrap`, `hero_split_layout`, `card_title`
- Compound-word prefixes keep their hyphens: `case-study_detail_wrap`, `case-study_card_title`
- Format: `type_variation_element` (variation is optional)
- Maximum 3 underscores
- `_wrap` always marks the outermost element of a new component
- Interactive elements (`<a>`, `<button>`) that act as component roots must end in `_wrap`
- Any element that contains children with component classes must end in `_wrap`
- Every element should have a custom class (with rare exceptions for slots using `u-display-contents`) — no bare `<span>`, `<div>`, or `<a>` with only a utility class
- Preferred element suffixes: `_title` not `_heading`, `_text` not `_paragraph`, `_img` not `_image`
- Broadest type first → specific type → element: `card_testimonial_title`, `cta_secondary_visual_img`
- Deeper nesting starts a new subcomponent rather than exceeding 3 underscores

**Examples:**

```html
<section class="hero_wrap u-padding-block-main">
  <div class="hero_layout u-container u-grid-2">
    <h1 class="hero_title u-text-style-h1">
      <p class="hero_text u-text-style-regular"></p>
      <div class="card_wrap u-box-shadow-small u-radius-main">
        <h3 class="card_title u-text-style-h3">
          <footer class="footer_wrap u-background-1 u-padding-block-large">
            <div
              class="footer_link_wrap u-display-flex u-flex-direction-column u-gap-1rem"
            ></div>
          </footer>
        </h3>
      </div>
    </h1>
  </div>
</section>
```

### 2. Utility Classes

Reusable, single-purpose classes. Always prefixed with `u-`. Always stacked on top of a custom class.

**Rules:**

- Always start with `u-`
- Use dashes between words: `u-text-style-large`, `u-gap-1rem`
- Never apply more than 4 utility classes at once — use the custom class for additional styles
- Never apply a utility class alone without a custom class beneath it

**Available utilities** (see `src/styles/base/` for the full list):

| Category           | Example classes                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Typography         | `u-text-style-h1` through `u-text-style-h6`, `u-text-style-eyebrow`, `u-display-xl/lg/md/sm`, `u-text-style-tiny/small/regular/large/xlarge`                                                                                                                                                                                                                                                                                                                 |
| Text style         | `u-text-style-bold`, `u-text-style-italic`, `u-text-style-muted`, `u-text-style-strikethrough`, `u-text-style-nowrap`                                                                                                                                                                                                                                                                                                                                        |
| Text align         | `u-text-align-left`, `u-text-align-center`, `u-text-align-right`                                                                                                                                                                                                                                                                                                                                                                                             |
| Spacing — padding  | `u-padding-0` through `u-padding-8`, `u-padding-small/main/large`, `u-padding-sitemargin/gutter`, `u-padding-block-*`, `u-padding-inline-*`, `u-padding-top/bottom/left/right-*`                                                                                                                                                                                                                                                                             |
| Spacing — margin   | `u-margin-top/bottom-0` through `u-margin-top/bottom-8`, `u-margin-top/bottom-auto/gutter`                                                                                                                                                                                                                                                                                                                                                                   |
| Layout — container | `u-container`, `u-container-narrow`, `u-container-wide`, `u-container-full`                                                                                                                                                                                                                                                                                                                                                                                  |
| Layout — flex      | `u-display-flex`, `u-flex-direction-row/column`, `u-flex-wrap`, `u-justify-content-start/center/end/between`, `u-align-items-start/center/end`                                                                                                                                                                                                                                                                                                               |
| Layout — grid      | `u-grid-1` through `u-grid-12`                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Layout — gap       | `u-gap-gutter`, `u-gap-0` through `u-gap-8`, `u-gap-row-0` through `u-gap-row-8`, `u-gap-column-0` through `u-gap-column-8`, `u-gap-inherit`                                                                                                                                                                                                                                                                                                                 |
| Background         | `u-background-1`, `u-background-2`, `u-background-skeleton`                                                                                                                                                                                                                                                                                                                                                                                                  |
| Gradient           | `u-gradient-text`, `u-gradient-light-blue`, `u-gradient-light-blue-reverse`                                                                                                                                                                                                                                                                                                                                                                                  |
| Shadow             | `u-box-shadow-xxsmall/xsmall/small/medium/large/xlarge/xxlarge`                                                                                                                                                                                                                                                                                                                                                                                              |
| Radius             | `u-radius-none/xsmall/small/medium/large/xlarge/main/full/section`                                                                                                                                                                                                                                                                                                                                                                                           |
| Display            | `u-display-flex`, `u-display-none`, `u-display-block`, `u-display-inline-block`                                                                                                                                                                                                                                                                                                                                                                              |
| Visibility         | `u-visible`, `u-invisible`, `u-hide`, `u-hide-on-xsmall`, `u-hide-on-small`, `u-hide-on-medium`, `u-hide-on-large`                                                                                                                                                                                                                                                                                                                                           |
| Overflow           | `u-overflow-hidden`, `u-overflow-auto`, `u-overflow-visible`, `u-overflow-scroll`                                                                                                                                                                                                                                                                                                                                                                            |
| Dimension          | `u-w-100`, `u-h-100`                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Max width          | `u-max-width-xlarge/large/medium/small/xsmall/xxsmall`                                                                                                                                                                                                                                                                                                                                                                                                       |
| Z-index            | `u-z-index-1`, `u-z-index-2`                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Aspect ratio       | `u-aspect-ratio-portrait/landscape/widescreen/square`                                                                                                                                                                                                                                                                                                                                                                                                        |
| Icon               | `u-icon-16`, `u-icon-24`, `u-icon-32`, `u-icon-48`, `u-icon-64`                                                                                                                                                                                                                                                                                                                                                                                              |
| Image              | `u-image-wrapper`, `u-image`, `u-image-wrapper.is-background`                                                                                                                                                                                                                                                                                                                                                                                                |
| Content wrapper    | `u-content-wrapper`, `.is-center-align`, `.is-left-align`, `.is-right-align`, `.is-center-align-mobile`                                                                                                                                                                                                                                                                                                                                                      |
| Rich text          | `u-rich-text` — vertical rhythm for CMS/prose content (bare heading + paragraph tags)                                                                                                                                                                                                                                                                                                                                                                        |
| List               | `u-list` — apply to `<ul>` or `<ol>` for bullet/ordered list spacing without the rich-text wrapper. Sets `margin-top: 0`, `margin-bottom: var(--space-4)` (auto-zeroed when `:last-child`), and a default `font-size: var(--text-regular-size)`. The font-size uses `:where()` so any `u-text-style-*` class overrides it (e.g. `<ul class="u-list u-text-style-large">`). Direct `<li>` children get `margin-bottom: var(--space-2)` between items.         |
| Button             | `u-button-wrapper`, `u-button-reset`                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Color              | `u-inherit-color`                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Theme invert       | `data-theme-invert` — marks a card that must invert against its section (Lumos' relative `.theme-invert`, as a data attribute). Takes a whole theme (see **Theme invert** under Variables), so a card pops and stays readable on any section theme — background, text, borders, buttons and links all resolve against the card. Cards and testimonials carry it by default in their markup. |
| Text shrink        | `u-text-shrink` — add to flex-row parent with icon + Text children to prevent overflow                                                                                                                                                                                                                                                                                                                                                                       |
| Accessibility      | `u-sr-only`                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

### 3. Combo Classes

Used to apply a specific modification to an existing custom class. Scoped only to that combination.

**Rules:**

- Always start with `is-`
- Use dashes between words: `is-active`, `is-dark`, `is-open`
- Always applied on top of a custom class (not utilities)
- Only affect the specific custom + combo combination

**Examples:**

```html
<div class="card_wrap is-featured">
  <button class="nav_link is-active">
    <section class="hero_wrap is-dark"></section>
  </button>
</div>
```

---

## Variables

CSS custom properties are defined in `src/styles/variables/`. Use them for all of the following — never hardcode these values:

1. **Typography** — font family, size, weight, line height, letter spacing, text transform
2. **Color** — text, background, border, outline colors
3. **Page structure** — section padding, container max widths
4. **Spacing** — padding, margin, gap values (`--space-*`, `--section-space-*`, `--margin-*`, `--gap-*`)
5. **Layout** — grid column counts, max widths, gaps
6. **Miscellaneous** — border radius (`--radius-*`), border width

Use custom styles or utility classes (not variables directly) for: `display`, width/height, opacity, overflow, and anything not in the variable list.

**Variable naming pattern:**

```
--category-subcategory-variant
```

Examples: `--color-brand-black`, `--site-margin`, `--space-4`, `--radius-main`, `--site-gutter`

**Spacing system — three tiers:**

All fluid values use `clamp()` scaling between 20em (320px) and 90em (1440px) viewports.

| Variable group                     | Purpose                                                               | Range                   |
| ---------------------------------- | --------------------------------------------------------------------- | ----------------------- |
| `--space-1` … `--space-8`          | Fluid micro-spacing (margins, gaps, text spacing)                     | 6px–64px                |
| `--section-space-small/main/large` | Fluid section vertical padding                                        | 3rem–10rem (48px–160px) |
| `--gap-1` … `--gap-8`              | Gap aliases that map to the space scale                               | Same as `--space-*`     |
| `--site-margin`                    | Fluid horizontal container gutter (used in container width calc)      | 1rem–3rem               |
| `--site-gutter`                    | Fluid column gap for column-width calculations                        | 1rem–2rem               |
| `--grid-breakout`                  | Named-line grid for full-bleed layouts (12-col with viewport gutters) | —                       |
| `--grid-breakout-single`           | Mobile version of breakout grid (single content track)                | —                       |

**Theme invert — a card that must invert against its section:**

A card inside a themed `<Section>` often needs to read _against_ it (a white "paper" card on a dark section, a tonal-orange card on a brand section). Mark that element `data-theme-invert` and it takes a **whole theme**, exactly as Lumos' relative `.theme-invert` does — a card carries a real theme, not a partial copy of one:

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

The rule lives in [src/styles/variables/themes.css](src/styles/variables/themes.css): `[data-theme="dark"] [data-theme-invert]` is added to the **light** theme's selector list, so an island inside a dark section adopts the light theme wholesale. Islands inside light and brand sections need no rule — they already inherit the right tokens and use `--background-2` as their surface (white on light, tonal on brand). Only the dark→light direction is wired because cards carry the attribute **by default**; Lumos' other flips (light→dark, brand→light) are deliberate omissions — adding either would restyle every default card on those sections.

**Why a whole theme and not a `--surface-*` tier.** This replaced a tier that copied only background / text / heading-accent / border. Because the copy was partial, anything else inside a card — buttons, links — still resolved against the **section** theme. That is a mismatch waiting to happen, and it happened: the card title is now a real `<a>`. A whole theme has no such gap; every token agrees by construction.

To re-skin a fork, edit the theme blocks — one file, no per-component branching. Never hard-code per-theme card colors in a component (`[data-theme="dark"] .card …`, or a force-applied `.u-theme-light`); the marker exists so that branching never has to happen. Cards react to their section's `data-theme` automatically — no `theme` prop or per-instance logic.
**Layout rules:**

- Grid columns: never use bare `1fr` — always `minmax(0, 1fr)`. This applies to every grid: `repeat(2, minmax(0, 1fr))` not `1fr 1fr`, `repeat(3, minmax(0, 1fr))` not `1fr 1fr 1fr`
- Never apply layout (`display: grid`, `grid-template-columns`, etc.) directly on a `u-container`. Because `u-container` has `container-type: inline-size`, it acts as the container query context — `@container` rules on it affect its children, not itself. Always use a child element (e.g. `_layout` div) for grid/flex layout
- Any element with `display: grid` or responsive grid (e.g. `display: var(--flex-medium, grid)`) must also have `flex-direction: column` — for when it collapses to flex on smaller viewports
- Use `grid-column-end: span N` not absolute end values. When both start and span: `grid-column: 1 / span 5`

---

## File Structure

```
src/
├── assets/           # Image files (prefer .avif or .webp)
├── components/       # Reusable Astro components
├── config/           # Single-source config (import from here — never hardcode)
│   ├── site.ts          # SITE: name, URL, email, phone, social, areaServed, brand.color…
│   ├── site.shared.mjs  # Sanity projectId/dataset/apiVersion + site URL (importable by config files)
│   └── logo-paths.ts    # Logo SVG path data (front-end Logo + Studio logo)
├── data/             # Static data
│   ├── site-structure.ts # PAGES + NAV_MENU + FOOTER_GROUPS + BANNER (drives nav, footer, banner, llms.txt)
│   └── faqs.ts          # Per-page FAQ sets (imported by pages via the FAQ component)
├── layouts/          # Page wrapper layouts (BaseLayout.astro)
├── pages/            # Route pages (index.astro, about.astro, etc.)
├── scripts/          # JavaScript (GSAP animations, etc.)
└── styles/
    ├── global.css         # Master import file — assigns every sheet to a cascade layer
    ├── reset.css
    ├── overrides.css      # Highest layer: runtime states + structural corrections
    ├── vendor.css         # Third-party CSS (Swiper), wrapped in the low `vendor` layer
    ├── fonts.css
    ├── variables/         # CSS custom properties only
    │   ├── base.css       # ★ Edit here first — screen size, site margin/gutter,
    │   │                  #   max-width, radius, border-width, border-colors,
    │   │                  #   box-shadows, button sizes, focus
    │   ├── colors.css     # Raw color swatches only (no semantic aliases).
    │   │                  #   --color-brand-500 is the canonical brand hex; the
    │   │                  #   SITE.brand.color literal in src/config/site.ts is a
    │   │                  #   MIRROR for email/<meta theme-color> (can't read CSS) —
    │   │                  #   keep them in sync. JS that has the DOM reads the var.
    │   ├── themes.css     # Semantic theme aliases (--background, --text, --border, etc.)
    │   │                  #   a theme-invert island inside a dark section takes
    │   │                  #   the light theme wholesale (data-theme-invert)
    │   ├── typography.css # Font families, sizes, weights, line-heights, letter-spacing
    │   ├── spacing.css    # --space-1–8, --section-space-*, --margin-*
    │   ├── layout.css     # --grid-*, --gap-*
    │   └── nav.css        # Nav sizing, spacing, radius, banner height, dropdowns
    ├── components/        # ONLY component CSS with no single owner (see below)
    │   ├── forms.css          # Form fields — shared by contact page + SignUpForm
    │   └── marketing-scorecard.css # Owned by a React .tsx (can't hold an Astro style block)
    ├── base/              # Utility classes and element defaults
    │   ├── elements.css        # Bare element defaults (h1–h6, p, a, section, button) — `base` layer
    │   ├── utilities.css       # u-sr-only, u-button-reset, misc u- classes
    │   ├── typography.css      # u-text-style-*, u-display-*, u-text wrapper, rich text
    │   ├── layout.css          # u-container, u-grid-*, u-display-flex, u-gap-*, etc.
    │   ├── responsive-columns.css # Responsive column system + responsive flag vars + their :root defaults
    │   ├── spacing.css         # u-padding-*, u-margin-*
    │   ├── visual-utilities.css # u-background-*, u-box-shadow-*, u-radius-*, u-hide-*, etc.
    │   └── animate.css         # CSS scroll-triggered animations (data-animate-in/up)
    └── pages/             # Page-specific styles (component custom classes live here)
        ├── home.css
        └── contact.css
```

**Cascade layers:** every stylesheet is assigned to a layer in `global.css`:
`reset, vendor, variables, base, utilities, components, pages, overrides` —
later beats earlier regardless of selector specificity. Utilities sit BELOW
components on purpose (several u- classes are multi-property presets that
components legitimately override — see the order note in `global.css`).
Two hard rules follow from this:

- **Never write unlayered CSS.** Unlayered rules beat every layer, so a
  stray unlayered rule silently outranks the whole design system. New
  stylesheet files must be added to `global.css` with `layer(...)`;
  page CSS pulled in via ESM `import` must open with `@layer pages { … }`
  in-file (see any file in `styles/pages/`). Third-party CSS must be
  imported via `vendor.css`, never as a bare ESM import (that is why
  swiper's CSS goes through it). `image.responsiveStyles` stays **off** in
  `astro.config.mjs` — Astro injects those styles unlayered (see the
  comment there).
- **A rule that must beat page/component styling goes in `overrides.css`**
  (swiper lock states, select placeholder color, the margin-trim
  fallback). Keep that file small — read its header before adding to it.

**Where to write CSS:**

- **Component classes** → co-located in the component's own `.astro` file, at the bottom:

  ```astro
  <style is:global>
    @layer components {
      .my-component_wrap {
        /* declarations */
      }
    }
  </style>
  ```

  Both attributes are load-bearing. `is:global` skips Astro's scoping hash so the classes stay targetable from other files and apply to slotted children; `@layer components { … }` slots them into the cascade defined in `styles/global.css`. A bare scoped `<style>` block (no `is:global`, no `@layer`) is still wrong for component classes — it's unlayered, so it would beat every layer in the design system.

- **Component CSS with no single owning component** → `src/styles/components/` (add the file to `global.css` with `layer(components)`). Only three files qualify today; the reasons are listed in `global.css`.
- **Page-specific classes** → `src/styles/pages/[page-name].css`, opening with `@layer pages { … }` in-file
- **Utility classes** → `src/styles/base/` (existing files)
- **Element defaults** (bare `h1`/`p`/`a`-style selectors) → `src/styles/base/elements.css` — never in a utilities file, where the layer would let them beat component classes
- **CSS variables** → `src/styles/variables/` (existing files)

---

## Astro-Specific Notes

- **Images**: Wrap images with `u-image-wrapper` (controls dimensions, radius, overflow) and apply `u-image` to the `<img>` element (absolute-fill with focal-point positioning via `--x`/`--y`). Use `is-background` on the wrapper for Section background slots.
- **Alt text — every image needs it**: Every `<Image>`, `<img>`, and `<Visual>` must carry meaningful, descriptive `alt` text. Do **not** ship `alt=""`. SEO crawlers (Ahrefs, etc.) report empty `alt` as a _missing_ alt attribute, so even decorative/duplicate images get flagged — write a real description instead of leaving it blank. For images sourced from data (e.g. a `services`/`posts` array), reuse the existing `imageAlt`/`alt` field rather than hardcoding or blanking it. Inside `aria-hidden="true"` containers (decorative collages, cursor-follower effects) the `alt` is skipped by screen readers but still read by crawlers — so it must be present and descriptive there too. The only acceptable exception is a third-party/external image whose markup we don't render (e.g. the HoneyBook tracking pixel), since we have nothing to set `alt` on.
- **Slots**: When placing multiple loose elements into a Layout column, wrap them in the **``component** (`…</Fragment>`) — the standard wrapper. It renders `<div class="u-display-contents">` with that load-bearing class baked in, so it can't be forgotten (a plain `<div>` would become the grid child and break alignment/gap). Do not hand-write `<div class="u-display-contents">`. Single self-contained components (Visual, Grid, Card) take `slot` directly — no`` needed. **Exception:** don't use ``to wrap a `<Visual>` _alongside other content_ — use `<Layout variant="stack">` instead.``'s `display: contents` lets the image's `height: 100%` override its `ratio` aspect-ratio and balloon; `<Layout variant="stack">` is a real block so the aspect-ratio governs (see the ⚠️ note in the `` section).
- **Animations**: GSAP data attributes (`data-duration`, `data-distance`, `data-stagger`, `data-prevent-flicker`) are used for scroll-triggered animations. These are not classes.
- **Component props**: Use TypeScript interfaces for component props. Prop names use camelCase.
- **Layout is the only layout component.** A section's content goes straight inside `<Layout>` — the default slot IS column 1, and `<Layout>` generates the column wrapper itself. A second column takes `slot="column2"`; several loose elements there go in `<Fragment slot="column2">`, which groups without emitting a box. There is no ``and no `<Layout variant="stack">` — both were removed, their jobs absorbed: alignment and measure are now the `align` and `maxWidth` props. Do not reintroduce a wrapper component for columns; the generated column is a real flex box, which is what makes a ratio'd `<Visual>` safe inside one (the old`` used `display: contents`, which erased the box and let images balloon).
- **Variable naming — `--_` marks internal plumbing.** Two kinds of custom property exist and the name tells them apart. Design tokens (`--space-4`, `--background-2`, `--radius-main`) and the responsive keywords (`--flex-medium`, `--unset-medium`, …) are the public authoring API: use them freely in any component. A property prefixed `--_` (e.g. Layout's `--_collapse`, Visual's `--_x`/`--_y`) is internal to the component that declares it — set and consumed in one file, no outside contract, free to rename. Never reach for another component's `--_` variables; if two components need the same value, promote it to a token. Adopt the prefix incrementally: rename internals as you touch a file, and put a one-line note where the variable is set.
- **Merging classes**: Always use Astro's `class:list` directive — it takes an array, drops falsy entries, and is the pattern every UI component follows. Build the array with the base class first, conditional modifiers next, and the caller's `className` last, so user classes win: `class:list={["u-text", muted && "u-text-style-muted", className]}`. Do **not** hand-roll the string with `.filter(Boolean).join(" ")`. Merging inline **styles** is a separate problem — `class:list` does not cover it, so `[computed, userStyle].filter(Boolean).join("; ")` stays correct in Heading, Text, Visual, and Overlay.
- **Formatting**: Prettier owns formatting. Run `npm run format` before committing; `npm run format:check` gates CI. Two files are excluded in `.prettierignore` (`Head.astro`, `BaseLayout.astro`) because prettier-plugin-astro cannot parse their `is:inline` scripts — format those by hand.
- **Import alias**: `@/` resolves to `src/` (defined in `tsconfig.json` `paths`). Existing files use relative imports; both work.
- **Imports**: Use the `@/` path alias (mapped to `./src/` in tsconfig.json) for any import that leaves the current directory — `import Card from "@/components/ui/Card.astro"`, never `../../components/ui/Card.astro`. Same-directory `./` imports are fine.
- **Extra attributes (rest spread)**: All UI components accept the standard HTML attributes of the element they render (`style`, `data-*`, `aria-*`, etc.) beyond their explicit props — no extra prop needed. Each `Props` interface extends `HTMLAttributes<"tag">` from `astro/types` for the element it spreads onto, so those attributes are **type-checked**, not merely tolerated (`data-*` stays open via the built-in template-literal index). Never add a `[key: string]: any` index signature — it silently accepts typos and cancels the checking. Components whose valid props depend on another prop use a **discriminated union**: Button's link-only props (`newTab`) require `href` and its button-only props (`type`, `disabled`) forbid it; Card's link-only props (`newTab`, `ariaLabel`, `actions`) require `href`. Misuse is an editor error at the call site. Internally, each component destructures known props and captures the remainder with `...rest`, then spreads `{...rest}` (or `{...attrs}` for style-merging components) onto the root element. For components that compute inline styles (Heading, Text, Visual, Overlay), user-provided `style` is extracted from `rest` and merged with the computed style string so both apply. **Button is special:** it renders a real `<a>`/`<button>` as its root, and `...rest` spreads onto that element. BlogCard's `...rest` passes through to the underlying `<Card>` component. Each component also has a `docs` prop (destructured but unused) that serves as a JSDoc documentation holder visible in editor autocomplete — it must be destructured to prevent it from leaking into `...rest` as a DOM attribute.
- **SVGs**: Give SVGs their own component class. Put stroke attributes (`stroke`, `stroke-width`, `stroke-linecap`, `stroke-linejoin`) in CSS, not inline. Use `stroke-width: var(--border-width-main)` and `stroke: currentColor`. Decorative SVGs need `aria-hidden="true"`.
- **Icons & logos**: Icons/logos next to text need `flex-shrink: 0`. Square icons/logos: use `width` + `aspect-ratio: 1/1` — not `width` + `height`. Logos need `object-fit: contain` (overrides the default `cover`).
- **Image loading placeholders**: The Visual component applies a skeleton background by default. For images with transparency (logos, PNGs), use the `transparent` prop to remove it: `<Visual src={logo} alt="Logo" transparent />`. Pass as a bare keyword — not `transparent="true"`.
- **Background image loading**: `<Visual variant="background">` defaults to `loading="eager"` (not `lazy`). Background images are structural — they're part of every section that contains them — and native lazy-load can fail to fire reliably when the image sits inside the multi-layer `position: absolute; inset: 0` chain used by Section backgrounds and `Layout variant="card"` col2, especially on SSR routes where HTML streams in. `priority` still upgrades both `loading` to `eager` and `fetchpriority` to `high` for above-the-fold heroes.
- **Form inputs**: `<input>`, `<textarea>`, and `<select>` elements must have `font-size` no smaller than `1rem` — sizes below `1rem` trigger auto-zoom on iOS.
- **Text parent containers**: Direct parents of text elements should not be `display: flex` — flex prevents vertical margin collapsing between text. Use `display: block` or no display override for text wrappers. Add `u-margin-trim` to the direct parent of text elements with margins to prevent unwanted extra space at the edges.
- **Text spacing**: Bottom-margin-only inside `.u-text` wrappers. Every text style class (`u-text-style-*`, `u-display-*`) declares both `margin-top` and `margin-bottom` via variables, but all `margin-top` variables are `0` — so spacing flows in one direction only (bottom). Inside `.u-text` wrappers, the child's `margin-top` is also forced to `0 !important` by the `.u-text > *` rule. Bare heading tags (`h1`–`h6`) and `p` have `margin-top: 0; margin-bottom: 0;` — so headings and paragraphs used without a text style class (accordion toggles, nav links, footers) carry zero margin. **Rich text** (`.u-rich-text`): a separate vertical rhythm system for CMS/prose content where bare heading and paragraph tags flow without `.u-text` wrappers. Headings get both `margin-top` (section separation) and `margin-bottom` (flow into content); paragraphs get `margin-bottom` only. Values use `--space-*` variables directly (not per-heading typography variables) so you can tune rich-text rhythm independently. Rules live in `src/styles/base/typography.css`. **Margin trim**: containers (`u-container`), layout columns (`u-layout-column`), content wrappers (`u-content-wrapper`), rich text (`u-rich-text`), and any element with `u-margin-trim` automatically remove `margin-top` from the first visible child and `margin-bottom` from the last visible child — preventing extra space at the edges. Add `u-ignore-trim` to any child that should keep its margin. `text-box-trim` is applied as a progressive enhancement inside `.u-text`.
- **Don't add redundant `marginBottom={0}`**: because of margin-trim (above), the **last child's bottom margin is already auto-zeroed** whenever a `<Text>`/`<Heading>` is the _last child_ of a **trimmed wrapper** — a `<Section>` container, a `<Layout>` column (``/`"col2"`), `<Layout variant="stack">`, ``, `u-rich-text`, or any element carrying `u-margin-trim` / `u-container*`. In those cases `marginBottom={0}` does **nothing** — do not add it. It is only needed when the element is the last child of a **custom `<div>`** that is _not_ one of those (e.g. a card body `*_content`, a `*_meta` row, an `<li>`). Even then, prefer adding `u-margin-trim` to that custom wrapper once over sprinkling `marginBottom={0}` on each child. The trim rules live in [src/styles/overrides.css](src/styles/overrides.css) (`:last-child { margin-bottom: 0 }` fallback; the native `margin-trim` half sits in Section.astro's style block) and [src/styles/base/utilities.css](src/styles/base/utilities.css) (last-visible-child trim).
- **Layout containers space their own children — don't add margins between siblings.** The `<Section>` content container (`.u-container`) is a **flex column with a built-in `gap`** (default `--space-8`, overridable via the Section `gap` prop, `0`–`8`). Its direct children are spaced apart automatically — so when you stack a `<Heading>` above a `<Layout>`, `<Grid>`, `<Layout variant="stack">`, another `<Heading>`, or a `<Text>` **directly inside a `<Section>`**, do **not** add `marginBottom` (or any `u-margin-*` utility) to create that gap; the container already does it. The same is true inside a `<Layout>` (CSS grid with a `rowGap`), its `stack`/`stack-centered` variants, and inside ``(`display: contents`, so its children become the Layout's grid children and inherit that row gap). To change the spacing, **adjust the container's gap** (`<Section gap={N}>` / `<Layout rowGap={N}>`) — never per-child margins. The one exception is `<Layout variant="stack">` — a plain block with **no gap**; spacing between its children comes from the text elements' own bottom margins (last one auto-trimmed), so you still don't add extra `marginBottom`. **Net rule:** between direct children of a `<Section>` / `<Layout>` /``, spacing is the container's `gap` — leave child margins alone. Only reach for `marginBottom` inside a custom `<div>` _you_ wrote that has no gap and isn't margin-trimmed (e.g. a card body).

---

## Responsive Variable System

Responsive behavior is driven by CSS custom property flags defined in `src/styles/base/responsive-columns.css`. These flags are set per container-query breakpoint tier on all descendants (`*`), so you can reference them in any component's CSS without writing additional container queries.

**Breakpoint tiers** (requires a `container-type: inline-size` ancestor like `u-container`):

- **large** — default (no query)
- **medium** — `@container (width < 58em)` (~928px)
- **small** — `@container (width < 35em)` (~560px)
- **xsmall** — `@container (width < 20em)` (~320px)

**Available flags per tier** (undefined at larger tiers — use CSS fallback value):

| Flag                  | Value when active           |
| --------------------- | --------------------------- |
| `--flex-{tier}`       | `flex`                      |
| `--none-{tier}`       | `none`                      |
| `--column-{tier}`     | `column`                    |
| `--row-{tier}`        | `row`                       |
| `--start-{tier}`      | `start`                     |
| `--center-{tier}`     | `center`                    |
| `--end-{tier}`        | `end`                       |
| `--unset-{tier}`      | `unset`                     |
| `--relative-{tier}`   | `relative`                  |
| `--responsive-{tier}` | `1` (numeric, for `calc()`) |

**Usage patterns — prefer these over `@container` for simple keyword switches:**

```css
/* Collapse grid to flex stack on medium */
display: var(--flex-medium, grid);
flex-direction: column;

/* Switch flex direction on small */
flex-direction: var(--column-small, row);

/* Conditionally center on medium */
justify-content: var(--center-medium, flex-start);

/* Hide on small */
display: var(--none-small, block);

/* Switch sticky to relative on medium */
position: var(--relative-medium, sticky);

/* Numeric flag for calc — apply a value only at large */
top: calc(
  (var(--nav-height-total) + var(--space-2)) * var(--responsive-large, 0)
);
```

Only use `@container` when responsive variables can't express the change (e.g. changing `grid-template-columns` values, adjusting padding amounts, or other non-keyword property changes).

---

## Interactions (plain CSS)

Interactive states — hover, focus, and active/open — are **plain CSS**. There is no trigger/state CSS-variable indirection — style the real state directly. The responsive flag variables (`--flex-medium`, `--none-small`, `--responsive-*`, …) are a **separate, still-active** system — see the Responsive Variable System section.

**Hover / focus:**

- `:hover` and `:focus-visible` for an element's own state.
- For a root element driving its children (e.g. Button's root `<a>`/`<button>` painting `.button_main_element`), key off the root: `.button_main_wrap:hover .button_main_element`, and `:focus-visible` for keyboard focus. Reach for `:has(:focus-visible)` only when the focusable element is genuinely a descendant — if you find yourself needing it, check whether the wrapper should have been the control.
- `:focus-within` for "this container has focus" (e.g. form-field / search borders).

**Component state — style it directly:**

- **`.is-active`** for JS-driven interactives (tabs, sliders, accordions). JS toggles it; CSS styles it. Always scope to a custom class: `.tabs_link_wrap.is-active { }`, never bare `.is-active { }`. Don't invent `.is-visible` / `.is-open`.
- **`aria-expanded`** for disclosure state — rotate chevrons via `[aria-expanded="true"] .icon`, and open panels via `.x:has([aria-expanded="true"])` (nav dropdowns, accordions).
- **`:has(:checked)`** for custom checkbox/radio visuals.
- Open a **Modal** with `data-modal-trigger="modal-id"`.

**Patterns:**

```css
/* Fade on hover */
.card_link {
  opacity: 1;
  transition: opacity 0.2s ease;
}
.card_link:hover {
  opacity: 0.6;
}

/* Parent hover/focus drives a child */
.button_main_wrap:hover .button_main_element,
.button_main_wrap:has(:focus-visible) .button_main_element {
  /* hover tokens */
}

/* Show only when active */
.tab_button_item.is-active .tab_button_line {
  opacity: 1;
}

/* Faded text */
color: color-mix(in hsl, currentColor 70%, transparent);
```

---

## Quick Reference

```html
<!-- Correct: custom class first, then utilities, then combo -->
<section class="cta_wrap u-background-1 u-padding-block-large is-dark">
  <div class="cta_layout u-container u-grid-2 u-gap-gutter">
    <div class="cta_content">
      <p class="cta_eyebrow u-text-style-eyebrow u-text-style-muted">Label</p>
      <h2 class="cta_title u-text-style-h2">Heading</h2>
      <p class="cta_text u-text-style-regular">Body copy.</p>
      <div class="u-button-wrapper">
        <!-- Button component -->
      </div>
    </div>
    <div class="cta_visual u-image-wrapper">
      <!-- Image component -->
    </div>
  </div>
</section>
```

---

## Button Component (`src/components/ui/Button.astro`)

Theme-aware button using the wrapper pattern. Hover/focus transitions are plain CSS (`.button_main_wrap:hover` / `:has(:focus-visible)`). Automatically adapts to `data-theme="light|dark|brand"` on any ancestor.

**Import:**

```astro
import Button from '@/components/ui/Button.astro';
```

**Architecture:** The component renders three layers:

1. **Wrapper** (`.button_main_wrap`) — variant/size data attributes + border-radius; the hover/focus target
2. **Root element** — the `<a>` (with `href`) or `<button>` IS `.button_main_wrap`. It takes focus, hover, and `...rest`. There is no overlay and no duplicate label.
3. **Visual element** (`.button_main_element`) — displays label and icon; set to `aria-hidden`

| Prop             | Type                                 | Default     | Description                                                                                                                                                                                             |
| ---------------- | ------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `variant`        | `'primary'`\|`'secondary'`\|`'text'` | `'primary'` | Visual style — filled, outlined, or text-link                                                                                                                                                           |
| `size`           | `'default'`\|`'small'`\|`'large'`    | `'default'` | Padding preset                                                                                                                                                                                          |
| `href`           | `string`                             | —           | Renders as `<a>`. Omit to render a plain `<button>` (modal triggers/closes, form submits, JS actions).                                                                                                  |
| `newTab`         | `boolean`                            | `false`     | Opens in new tab (adds `rel="noopener noreferrer"`)                                                                                                                                                     |
| `disabled`       | `boolean`                            | `false`     | Disables `<button>` (not links)                                                                                                                                                                         |
| `ariaLabel`      | `string`                             | —           | Only used for **icon-only** buttons. When the button has visible text, that text is the accessible name and `ariaLabel` is ignored (a dev warning fires if they disagree — that mismatch is WCAG 2.5.3) |
| `type`           | `'button'`\|`'submit'`\|`'reset'`    | `'button'`  | Native button type (when no `href`)                                                                                                                                                                     |
| `square`         | `boolean`                            | `false`     | Removes pill radius                                                                                                                                                                                     |
| `id`             | `string`                             | —           | `id` on wrapper                                                                                                                                                                                         |
| `class`          | `string`                             | —           | Extra classes on wrapper                                                                                                                                                                                |
| _DOM attributes_ | `HTMLAttributes<"a" \| "button">`    | —           | Standard attributes of the rendered element (`data-modal-trigger`, `style`, `aria-*`, …) — type-checked, spread onto the root                                                                           |

**Slots:** default (label text), `icon` (rendered after label)

> **No `href` → plain `<button>`.** A `<Button>` with no `href` renders a real `<button>` with no navigation — use it for modal triggers/closes (`data-modal-trigger` / `data-modal-close`), form submits (`type="submit"`), or any on-page JS action. There is **no** default destination; pass `href` whenever the button should navigate.

```astro
<!-- Primary link (most common) -->
<Button href="/contact" ariaLabel="Contact us">Contact Us</Button>

<!-- Secondary -->
<Button variant="secondary" href="/case-studies" ariaLabel="Learn more"
  >Learn More</Button
>

<!-- Text-link style -->
<Button variant="text" href="/blog" ariaLabel="Read articles"
  >Read more →</Button
>

<!-- Small size -->
<Button size="small" href="/login" ariaLabel="Log in">Log In</Button>

<!-- Form submit -->
<Button type="submit" ariaLabel="Submit form">Send Message</Button>

<!-- Modal trigger (extra data attributes spread onto overlay) -->
<Button data-modal-trigger="contact-modal" ariaLabel="Open contact form"
  >Contact</Button
>

<!-- With icon slot -->
<Button href="/start" ariaLabel="Get started">
  Get Started
  <svg
    slot="icon"
    aria-hidden="true"
    viewBox="0 0 10 10"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
  >
    <line x1="0" y1="5" x2="8" y2="5"></line>
    <polyline points="5,2 8,5 5,8"></polyline>
  </svg>
</Button>
```

---

## Navbar Component (`src/components/global/Navbar.astro`)

Fixed navigation bar with plain-CSS interactions. Container-query responsive (switches at 65em / 1040px). Supports an optional announcement banner, dropdown menus, and a mobile hamburger menu.

**Import (already in BaseLayout):**

```astro
import Navbar from '@/components/global/Navbar.astro';
```

### Props

| Prop         | Type                           | Default                  | Description                             |
| ------------ | ------------------------------ | ------------------------ | --------------------------------------- |
| `theme`      | `'light'`\|`'dark'`\|`'brand'` | —                        | Override theme on the nav               |
| `class`      | `string`                       | —                        | Extra classes on nav_wrap               |
| `bannerText` | `string`                       | —                        | Announcement banner text (omit to hide) |
| `bannerHref` | `string`                       | —                        | Optional link for banner text           |
| `bannerId`   | `string`                       | `'nav-banner-dismissed'` | sessionStorage key for dismissal        |

### Editing Nav Items

Nav items come from the **`NAV_MENU`** array in [src/data/site-structure.ts](src/data/site-structure.ts) — the single page registry that also drives the footer and `llms.txt`. Each entry is either a simple link (`{ path }`) or a dropdown (`{ label, children: [paths] }`); children reference pages by path and their labels resolve from each page's `navLabel` (→ `title`). Navbar.astro maps `NAV_MENU` into its render structure.

```ts
// src/data/site-structure.ts
export const NAV_MENU: NavMenuItem[] = [
  { path: "/blog" },
  {
    label: "More",
    children: ["/case-studies", "/glossary"],
  },
  { path: "/contact" },
];
```

To add a nav link: add the page to `PAGES` (once), then reference its path in `NAV_MENU`. The placeholder "Work" mega menu stays defined inline in Navbar.astro (its links aren't real pages) behind the `showMegaMenu` flag.

### Announcement Banner

The banner is configured in the **`BANNER`** object in [src/data/site-structure.ts](src/data/site-structure.ts) (alongside the nav/footer), with a sitewide default and optional per-page overrides:

```ts
// src/data/site-structure.ts
export const BANNER = {
  default: { text: "Your announcement text", href: "/link" }, // text: "" hides it everywhere
  overrides: {
    "/some-page": null, // hide the banner on this page
    "/other": { text: "Custom", href: "/x" }, // replace it on this page
  },
};
```

BaseLayout calls `resolveBanner(Astro.url.pathname)` and passes the result to `<Navbar>` — no per-page wiring needed.

The banner renders as a full-width bar fixed to the top of the viewport, independent of the nav shape (pill or full-width). On dismiss, it collapses with a CSS transition and persists via `sessionStorage`. A synchronous `<script is:inline>` in `<head>` prevents any flash on repeat visits.

### Pill-Shaped vs Full-Width Nav

The navbar supports two layouts controlled entirely by CSS variables in **`src/styles/variables/nav.css`**. To switch, change only these three values:

| Variable                         | Pill-shaped (default) | Full-width           |
| -------------------------------- | --------------------- | -------------------- |
| `--nav-spacing-outer-horizontal` | `var(--site-margin)`  | `0px`                |
| `--nav-spacing-outer-vertical`   | `.75rem`              | `0px`                |
| `--nav-radius`                   | `var(--radius-main)`  | `var(--radius-none)` |

Optionally also change `--nav-background` in `themes.css` (pill uses `--background-2` for contrast; full-width often uses `--background` to blend with the page).

### Key Files

| File                                    | What it controls                                                          |
| --------------------------------------- | ------------------------------------------------------------------------- |
| `src/styles/variables/nav.css`          | All nav sizing, spacing, radius, banner height — **edit here to restyle** |
| `src/styles/variables/themes.css`       | `--nav-background` per theme (light/dark/brand)                           |
| `Navbar.astro` (co-located style block) | All nav component styles (layout, animations, responsive)                 |
| `src/components/global/Navbar.astro`    | Markup, nav items array, and all JS (menu, dropdowns, banner)             |
| `src/layouts/BaseLayout.astro`          | Banner text config, page theme prop, `is-has-banner` class on `<html>`    |

### Structure

```
<div class="nav_banner_wrap" />   ← fixed full-width (z-index 51)
<nav class="nav_wrap">            ← fixed, offset by --nav-banner-height (z-index 50)
  <div class="nav_inner">
    .nav_logo_wrap
    .nav_menu_wrap > .nav_list    ← desktop links + dropdowns
    .nav_cta_wrap                 ← desktop CTA button
    .nav_hamburger_state          ← hamburger (mobile only)
  </div>
  <div class="nav_mobile_menu">   ← clip-path animated slide-down
    .nav_mobile_list              ← mobile links + dropdowns
    .nav_mobile_cta
  </div>
</nav>
<div class="nav_menu_backdrop" /> ← dims page behind open mobile menu
```

---

## BaseLayout (`src/layouts/BaseLayout.astro`)

Root page wrapper used by every page. Renders `<html>`, `<head>`, Navbar, `<main>` (slot), and Footer. Sets the site-wide default theme via `data-theme` on `<html>`.

**Import:**

```astro
import BaseLayout from '../layouts/BaseLayout.astro';
```

### Props

| Prop          | Type                           | Default      | Description                                                                                                                                                                         |
| ------------- | ------------------------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`       | `string`                       | **required** | Page `<title>` for SEO — shown in browser tab and search results                                                                                                                    |
| `description` | `string`                       | —            | Meta description for SEO                                                                                                                                                            |
| `canonical`   | `string`                       | —            | Canonical URL for `<link rel="canonical">`                                                                                                                                          |
| `theme`       | `'light'`\|`'dark'`\|`'brand'` | `'light'`    | Page-level color theme. Sets `data-theme` on `<html>`, which cascades CSS color variables to all children. Individual `<Section theme="...">` props override for that section only. |

**Slot:** default — page content rendered inside `<main>`

### Theme Cascade

The `theme` prop sets `data-theme` on `<html>`, which cascades CSS color variables to all children. Individual `<Section theme="...">` props override the page-level default for that section only.

```astro
<!-- Default theme (light) -->
<BaseLayout title="Home | Site Name">...</BaseLayout>

<!-- Dark-themed page -->
<BaseLayout title="Blog | Site Name" theme="dark">...</BaseLayout>

<!-- Mixed — light page with one dark hero section (default padding throughout) -->
<BaseLayout title="About | Site Name">
  <Section theme="dark">Hero</Section>
  <Section>Light content</Section>
</BaseLayout>
```

### Changing the Site-Wide Default Theme

To change the default theme for **every page** that doesn't pass an explicit `theme` prop, update the default value in the destructuring line of `BaseLayout.astro`:

```typescript
// In BaseLayout.astro — change 'light' to 'dark' or 'brand'
const {
  docs,
  title,
  description,
  canonical,
  /* … */ theme = "light",
  schema,
} = Astro.props;
```

### Footer Theme

The footer uses its own CSS variables defined per theme in `src/styles/variables/themes.css`:

| Variable              | Purpose                       |
| --------------------- | ----------------------------- |
| `--footer-background` | Footer background color       |
| `--footer-text`       | Footer text color             |
| `--footer-border`     | Bottom bar divider line color |

Each theme block (light, dark, brand) defines these variables. By default, all three themes set the footer to dark values — so the footer stays dark regardless of the page theme. To change the footer's look for a specific theme, update the values in that theme's block in `themes.css`.

**How it works internally:** `.footer_wrap` in `footer.css` remaps the footer variables onto the standard theme aliases (`--background`, `--text`, `--border`) and link variables (`--link-text`, `--link-border`, `--link-text-hover`, `--link-border-hover`). This ensures all descendants — utility classes, link styles, borders — resolve to the footer's palette instead of the page's. Link colors are derived from `--footer-text` via `color-mix()` (75% opacity for normal state, full for hover), matching the same pattern used in the main theme system. You only need to set the three `--footer-*` variables in `themes.css`; the rest cascades automatically.

### Banner Config

The announcement banner is configured in the `BANNER` object in [src/data/site-structure.ts](src/data/site-structure.ts) — a sitewide `default` plus a per-page `overrides` map (`null` hides it on a page; an object replaces it). BaseLayout resolves it per request with `resolveBanner(Astro.url.pathname)` and passes `bannerText`/`bannerHref` to `<Navbar>`. Set the default `text` to `""` to disable the banner everywhere. See the **Announcement Banner** subsection under Navbar above.

Banner dismiss persists via `sessionStorage('nav-banner-dismissed')`. Nav shape (pill vs full-width) is controlled in `variables/nav.css`.

---

## UI Component System (`src/components/ui/`)

These are typed Astro components that wrap the CSS system. Every prop is documented with JSDoc — your editor will show autocomplete and inline descriptions.

**Import pattern:**

```astro
import Heading from '@/components/ui/Heading.astro'; import Text from
'@/components/ui/Text.astro'; import Layout from '@/components/ui/Layout.astro';
import Section from '@/components/ui/Section.astro'; import Grid from
'@/components/ui/Grid.astro'; import Card from '@/components/ui/Card.astro';
import Visual from '@/components/ui/Visual.astro'; import Overlay from
'@/components/ui/Overlay.astro'; import Accordion from
'@/components/ui/Accordion.astro'; import AccordionItem from
'@/components/ui/AccordionItem.astro'; import Modal from
'@/components/ui/Modal.astro'; import Slider from
'@/components/ui/Slider.astro'; import Tab from '@/components/ui/Tab.astro';
import TabButton from '@/components/ui/TabButton.astro'; import TabPanel from
'@/components/ui/TabPanel.astro'; import CaseStudyCard from
'@/components/ui/CaseStudyCard.astro';
```

**Additional component directories:**

- `src/components/form/` — Form, FormField, FormCheckbox, FormRadio, FormSelect, FormTextarea, FormRange, FormFieldset
- `src/components/sections/` — CTASection, BlogPostGrid, CaseStudyGrid, TestimonialsSlider, TestimonialsGrid, FAQ
- `src/components/case-study/` — CaseStudyBlockRenderer + block components (FullWidthImage, StatsBlock, RichTextBlock, etc.)
- `src/components/global/` — Navbar, Footer, Head, Logo

---

### `<Heading>`

Separates semantic tag (`tag`) from visual style (`variant`). Always choose the correct `tag` for the document outline, then use `variant` when the visual size should differ.

| Prop           | Type                                                                                       | Default | Description                                                                                                                                                                                                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tag`          | `'h1'`–`'h6'`                                                                              | `'h2'`  | Semantic heading level                                                                                                                                                                                                                                                                                                     |
| `variant`      | `'display-xl'`\|`'display-lg'`\|`'display-md'`\|`'display-sm'`\|`'h1'`–`'h6'`\|`'eyebrow'` | —       | Visual style. Omit to use semantic tag defaults.                                                                                                                                                                                                                                                                           |
| `balance`      | `boolean`                                                                                  | `true`  | `text-wrap: balance` for even line breaks (on by default)                                                                                                                                                                                                                                                                  |
| `accent`       | `boolean`                                                                                  | `false` | Makes `<strong>` inside use the accent color                                                                                                                                                                                                                                                                               |
| `marginTop`    | `0`\|`'auto'`                                                                              | —       | `marginTop={0}` forces zero; `marginTop="auto"` pushes down in flex (align bottom edges)                                                                                                                                                                                                                                   |
| `marginBottom` | `0`–`8`                                                                                    | —       | Override bottom margin. **Usually redundant for `{0}`** — the last child of a trimmed wrapper (Section container, Layout column, Layout, Col, `u-rich-text`, `u-margin-trim`) is auto-zeroed. Only set `marginBottom={0}` as the last child of a _custom_ `<div>` that isn't trimmed. See the **Text spacing** note above. |
| `maxWidth`     | `string`                                                                                   | —       | Max-width of heading content, with units (e.g. `'40ch'`, `'40rem'`). **Don't set this by default — see note below.**                                                                                                                                                                                                       |
| `class`        | `string`                                                                                   | —       | Extra utility classes                                                                                                                                                                                                                                                                                                      |

> **Don't add `maxWidth` by default.** `<Heading>` already applies a built-in default (`30ch`; `eyebrow` has none). Only pass `maxWidth` when the design genuinely needs a different constraint — never re-state the default, and don't add it reflexively when building from a design. Work with the defaults unless explicitly told otherwise.

**Structure:** Renders a `.u-text` wrapper div around the heading tag. The wrapper stays full-width (`min-width: 100%`), while the child heading inherits the `max-width` constraint. `align-items: inherit` flows alignment from the parent layout.

**Variants:**

- `display-xl` → hero / feature intro (3→6rem fluid)
- `display-lg` → major section opening (3→5rem fluid)
- `display-md` → feature callout (3→4.5rem fluid)
- `display-sm` → section header (2.75→4rem fluid)
- `h1` → primary heading (2.5→4rem fluid)
- `h2` → section heading (2.25→3rem fluid)
- `h3` → subsection heading (2→2.5rem fluid)
- `h4` → card/feature heading (1.5→2rem fluid)
- `h5` → small heading (1.25→1.5rem fluid)
- `h6` → smallest heading (1.125→1.25rem fluid)
- `eyebrow` → small uppercase label (1.125rem fixed, wide letter-spacing)

> **Display variants — use with restraint.** The `display-xl/lg/md/sm` tier is part of the base framework and fully available. The default visual maximum for ordinary pages is **`h1`** — don't reach for display variants by default; use them where an oversized headline is genuinely wanted (e.g. the `404` page uses `display-lg`, and heroes are a natural fit).

```astro
<!-- h2 DOM node that looks like a large display heading -->
<Heading tag="h2" variant="display-lg">Hero Title</Heading>

<!-- h3 DOM node styled as h1, with accent on a keyword -->
<Heading tag="h3" variant="h1" accent>Build <strong>faster</strong></Heading>

<!-- Eyebrow label -->
<Heading variant="eyebrow">Our Story</Heading>

<!-- Custom max-width (only when the design needs a non-default; default is 30ch) -->
<Heading tag="h2" variant="h2" maxWidth="40ch">A longer section heading</Heading
>

<!-- Zero bottom margin — use {0} for the number value -->
<Heading tag="h4" variant="h5" marginBottom={0}>Author Name</Heading>

<!-- Auto top margin — use "" for the string value, pushes down in flex -->
<Heading tag="h3" variant="h4" marginTop="auto">Bottom-aligned heading</Heading>
```

---

### `<Text>`

Body text with configurable size, weight, alignment, and line clamping.

| Prop           | Type                                                                                                                                                | Default | Description                                                                                                                                                                                                                                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tag`          | `'p'`\|`'span'`\|`'div'`\|`'label'`\|`'figcaption'`\|`'li'`\|`'dt'`\|`'dd'`\|`'caption'`                                                            | `'p'`   | HTML element                                                                                                                                                                                                                                                                                                               |
| `variant`      | `'tiny'`\|`'small'`\|`'regular'`\|`'large'`\|`'xlarge'`\|`'h1'`–`'h6'`\|`'eyebrow'`\|`'display-xl'`\|`'display-lg'`\|`'display-md'`\|`'display-sm'` | —       | Typography tier — text sizes, heading sizes, or display sizes                                                                                                                                                                                                                                                              |
| `weight`       | `'regular'`\|`'medium'`\|`'bold'`                                                                                                                   | —       | Font weight                                                                                                                                                                                                                                                                                                                |
| `align`        | `'left'`\|`'center'`\|`'right'`\|`'inherit'`                                                                                                        | —       | Text alignment                                                                                                                                                                                                                                                                                                             |
| `muted`        | `boolean`                                                                                                                                           | `false` | ~75% opacity                                                                                                                                                                                                                                                                                                               |
| `balance`      | `boolean`                                                                                                                                           | `false` | `text-wrap: balance`                                                                                                                                                                                                                                                                                                       |
| `nowrap`       | `boolean`                                                                                                                                           | `false` | `white-space: nowrap`                                                                                                                                                                                                                                                                                                      |
| `clamp`        | `1`–`6`                                                                                                                                             | —       | Line clamp (truncate with ellipsis)                                                                                                                                                                                                                                                                                        |
| `marginTop`    | `0`\|`'auto'`                                                                                                                                       | —       | `marginTop={0}` forces zero; `marginTop="auto"` pushes down in flex (align bottom edges)                                                                                                                                                                                                                                   |
| `marginBottom` | `0`–`8`                                                                                                                                             | —       | Override bottom margin. **Usually redundant for `{0}`** — the last child of a trimmed wrapper (Section container, Layout column, Layout, Col, `u-rich-text`, `u-margin-trim`) is auto-zeroed. Only set `marginBottom={0}` as the last child of a _custom_ `<div>` that isn't trimmed. See the **Text spacing** note above. |
| `maxWidth`     | `string`                                                                                                                                            | —       | Max-width of text content, with units (e.g. `'48ch'`, `'40rem'`). **Don't set this by default — see note below.**                                                                                                                                                                                                          |
| `class`        | `string`                                                                                                                                            | —       | Extra utility classes                                                                                                                                                                                                                                                                                                      |

> **Don't add `maxWidth` by default.** `<Text>` already applies a built-in default (`60ch`). Only pass `maxWidth` when the design genuinely needs a different constraint — never re-state the default, and don't add it reflexively when building from a design. Work with the defaults unless explicitly told otherwise.

**Structure:** Renders a `.u-text` wrapper div around the text tag. The wrapper stays full-width (`min-width: 100%`), while the child element inherits the `max-width` constraint. `clamp` is applied on the child element (not wrapper) due to display conflict with `-webkit-box`.

```astro
<Text variant="large" weight="medium">Lead paragraph</Text>
<Text variant="small" muted>Fine print</Text>
<Text clamp={3}>Long text truncated at three lines…</Text>
<Text tag="figcaption" size="tiny" align="center">Caption</Text>
<Text variant="large" align="center" maxWidth="32rem"
  >Constrained centered text</Text
>

<!-- Zero margins — use {0} for the number value -->
<Text tag="span" weight="bold" size="small" marginBottom={0}>Author Name</Text>
<Text tag="span" size="small" muted marginBottom={0}>CEO, Company</Text>

<!-- Auto top margin — use "" for the string value, pushes down in flex -->
<Text variant="small" marginTop="auto"
  >Bottom-aligned text in a flex column</Text
>
```

---

### `<Layout variant="stack">`

Block-level alignment wrapper for content. Controls `text-align`, `align-items`, and `justify-content` which cascade down to child flex/grid containers (e.g. `.u-text` uses `align-items: inherit`). This is **not** a flex or grid container — it's a plain block wrapper. Margin-trim is applied automatically on first/last children.

| Prop    | Type                                                            | Default     | Description                   |
| ------- | --------------------------------------------------------------- | ----------- | ----------------------------- |
| `align` | `'inherit'`\|`'center'`\|`'left'`\|`'right'`\|`'center-mobile'` | `'inherit'` | Alignment variant (see below) |
| `class` | `string`                                                        | —           | Extra utility classes         |

**Variants:**

- `inherit` — inherits alignment from parent (default, no combo class)
- `center` → `.is-center-align` — center-align everything
- `left` → `.is-left-align` — left/start-align everything
- `right` → `.is-right-align` — right/end-align everything
- `center-mobile` → `.is-center-align-mobile` — center at medium breakpoint (< 58em / ~928px), start-align above that. Uses the `--center-medium` responsive flag.

**Slot:** default — content (Heading, Text, Button, etc.)

```astro
<!-- Inherit alignment from parent (default) -->
<Layout variant="stack">
  <Heading tag="h2" variant="h2">Title</Heading>
  <Text variant="large">Body text.</Text>
</Layout>

<!-- Center-aligned content -->
<Layout variant="stack-centered">
  <Heading tag="h2" variant="h2">Centered Title</Heading>
  <Text variant="large">Centered body text.</Text>
  <div class="u-button-wrapper">
    <Button href="/cta" ariaLabel="CTA">Get Started</Button>
  </div>
</Layout>

<!-- Right-aligned content -->
<Layout variant="stack" align="right">
  <Heading variant="eyebrow">Stats</Heading>
  <Heading tag="h3" variant="display-lg">42%</Heading>
</Layout>

<!-- Center on mobile, inherit (left) on desktop -->
<Layout variant="stack" align="center-mobile">
  <Heading tag="h2" variant="h2">Responsive Title</Heading>
  <Text>Left on desktop, centered on mobile.</Text>
</Layout>
```

---

### `<Section>`

Full-width page section with theming, fluid vertical padding, optional background slot, and a constrained container.

| Prop            | Type                                                               | Default           | Description                                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------ | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `theme`         | `'light'`\|`'dark'`\|`'brand'`                                     | —                 | Sets `data-theme`; cascades CSS variables to all children                                                                                                                    |
| `padding`       | `'none'`\|`'xsmall'`\|`'small'`\|`'main'`\|`'large'`\|`'page-top'` | `'main'`          | Equal top + bottom padding. **Leave it off — `'main'` is the default and the right choice for almost every section.** Don't reach for `'large'` by default (see note below). |
| `paddingTop`    | same as `padding`                                                  | —                 | Override top only. **Do NOT use `'page-top'` here by default** — it's only for a _fixed_ nav, and this project's nav is sticky (see note below).                             |
| `paddingBottom` | same as `padding`                                                  | —                 | Override bottom only                                                                                                                                                         |
| `minHeight`     | `boolean`                                                          | `false`           | `min-height: 100svh` — hero sections                                                                                                                                         |
| `container`     | `'default'`\|`'narrow'`\|`'wide'`\|`'full'`                        | `'default'`       | Container max-width                                                                                                                                                          |
| `gap`           | `0`–`8`                                                            | `8` (`--space-8`) | Flex `gap` between the container's direct children. Retune the built-in spacing here instead of adding per-child margins (see note below).                                   |
| `id`            | `string`                                                           | —                 | `id` for same-page anchor links                                                                                                                                              |
| `class`         | `string`                                                           | —                 | Extra classes on `<section>`                                                                                                                                                 |

**Slots:**

- `background` — renders in `.u-background-slot` (absolute overlay, z-index 0). For background images, videos, or gradient divs.
- default — content inside `.u-container`

> **The container spaces its children for you.** `.u-container` is a **flex column with `gap: var(--space-8)`**, so a Section's direct children (Heading, Layout, Grid, Layout, Text…) are already spaced apart — **don't add `marginBottom` / `u-margin-*` between them.** To make that spacing tighter or looser, set the `gap` prop (`<Section gap={4}>`), don't sprinkle margins. See **Layout containers space their own children** under Astro-Specific Notes.

**Padding values:**

- `none` → 0
- `xsmall` → ~1.25–2rem fluid
- `small` → ~3–5rem fluid
- `main` → ~4–7rem fluid _(default — use this for virtually every section)_
- `large` → ~5.5–10rem fluid
- `page-top` → ~10–14rem fluid _(only for a **fixed** nav — see note below; not for this project by default)_

> **Default padding: leave it on `main` — and the types enforce it.** Every `<Section>` defaults to `main`, and `"main"` is **not a legal prop value**: writing `padding="main"` (or `paddingTop`/`paddingBottom="main"`) is a type error caught by `astro check` — omitting the prop is the only way to express the default, and the `data-padding-*` attributes are never emitted for it. **Do not add `padding="large"` (or any other override) by default.** `main` is the correct rhythm for the overwhelming majority of sections, including content sections, card grids, and listing pages. Only use `large` (or another value) when a specific section genuinely needs more room _and_ you've been asked for it (or it's clearly required by a design) — not as a habit. The padding union lives in one place — `src/components/ui/Section.props.ts` — and every section-wrapper component (TestimonialsSlider, BlogPostGrid, CaseStudyGrid, …) imports it from there; don't re-declare padding value unions in components.

> **`page-top` is for a FIXED nav only — don't use it on this project by default.** `page-top` exists to push a page's first section down so it clears a navbar that's pinned as a fixed overlay. **This project's navbar is `sticky` by default**, so it sits in normal document flow and the first section does _not_ need extra top padding to clear it. Build the first section (hero included) with the normal default padding — omit `paddingTop` entirely. `page-top` stays in the project only for the specific case where someone switches the nav to `fixed`; reach for it then, not before.

**How padding is applied (overriding it):** padding lives **directly on the `<section>`** — the chosen sizes are emitted as `data-padding-top` / `data-padding-bottom` attributes and mapped to `padding-top` / `padding-bottom` in [Section.astro's style block](src/components/ui/Section.astro). There are **no spacer divs** — padding is a property of the section itself. The mapping rules are wrapped in `:where()` so they carry **zero specificity** — which means any single component/page class can override section padding without an `!important` or attribute-level selector. This is the supported pattern for sections that need responsive or asymmetric padding the props can't express: pass `padding="none"` and drive it from a class, e.g.

```css
/* a section that wants its own responsive vertical rhythm */
.split_section {
  padding-block: var(--section-space-xsmall);
}
@media (width < 55em) {
  .split_section {
    padding-block: var(--section-space-small);
  }
}
```

```astro
<Section padding="none" class="split_section"> … </Section>
```

```astro
<!-- Dark hero with background image — default padding (sticky nav, no page-top) -->
<Section theme="dark" minHeight id="hero">
  <Image slot="background" src={bg} alt="" class="u-image" />
  <Heading tag="h1" variant="display-xl">Page Title</Heading>
</Section>

<!-- Prose section — no padding prop: the 'main' default isn't writable -->
<Section container="narrow">
  <Text variant="large">Article body…</Text>
</Section>
```

---

### `<Layout>`

Two-column CSS Grid with 13 named variants. Uses `display: var(--layout-collapse, grid)` — the `--layout-collapse` variable references the responsive flag for the chosen breakpoint (`--flex-medium` or `--flex-small`). All two-column variants collapse to a single stacked column via container query, not a media query. Grid columns use `minmax(0, 1fr)` to prevent content blowout.

| Prop            | Type                                        | Default                  | Description                                                                                                                                                                                                |
| --------------- | ------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `variant`       | See table below                             | `'columns'`              | Column proportion and behavior                                                                                                                                                                             |
| `verticalAlign` | `'start'`\|`'center'`\|`'end'`\|`'stretch'` | `'start'`                | Vertical alignment of columns                                                                                                                                                                              |
| `collapseAt`    | `'medium'`\|`'small'`                       | `'medium'`               | Container-width breakpoint at which two-column layouts collapse to a single stacked column. `'medium'` = ~928px (58em), `'small'` = ~560px (35em). No effect on stack variants.                            |
| `contentSpan`   | `1`–`11`                                    | breakout: `7`, full: `6` | Content-side column span for breakout/full variants. Must pair with `bleedSpan` to total 13.                                                                                                               |
| `bleedSpan`     | `1`–`11`                                    | breakout: `6`, full: `7` | Bleed-side column span for breakout/full variants. Must pair with `contentSpan` to total 13.                                                                                                               |
| `ratio`         | `string`                                    | —                        | Custom column ratio for two-column variants. Format: `"N-M"` (e.g. `"60-40"`, `"5-7"`). Numbers become `fr` units. Works with `columns`, `columns-reversed`, `sticky-left`, `contain`, `contain-reversed`. |
| `cardPadding`   | `string`                                    | —                        | Vertical padding for `card` variant content column. Defaults to `--section-space-main` (fluid 4rem–7rem). Accepts any CSS length value.                                                                    |
| `class`         | `string`                                    | —                        | Extra classes on wrapper                                                                                                                                                                                   |

**Variants:**

| Value               | Grid columns       | Notes                                                                                                                                                               |
| ------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `columns`           | 1fr 1fr            | Equal 50/50                                                                                                                                                         |
| `columns-reversed`  | 1fr 1fr            | col2 appears left on desktop                                                                                                                                        |
| `stack`             | 1fr                | Single column, left-aligned — use ``                                                                                                                                |
| `stack-centered`    | 1fr                | Single column, centered — use ``                                                                                                                                    |
| `sticky-left`       | 1fr 1fr            | Left column sticky while right scrolls                                                                                                                              |
| `contain`           | 1fr 1fr            | Card layout: content left (padded), image right (clipped). Background, radius, overflow clip, zero gap.                                                             |
| `contain-reversed`  | 1fr 1fr            | Card layout: image left (clipped), content right (padded). Background, radius, overflow clip, zero gap.                                                             |
| `breakout`          | 7/12 + 5/12+gutter | ~60/40 — content left, image right bleeds to viewport edge (named-line grid)                                                                                        |
| `breakout-reversed` | gutter+5/12 + 7/12 | ~40/60 — image left bleeds to viewport edge, content right (named-line grid)                                                                                        |
| `full`              | 6/12 + 6/12+gutter | 50/50 — content left, image right bleeds to viewport edge (named-line grid)                                                                                         |
| `full-reversed`     | gutter+6/12 + 6/12 | 50/50 — image left bleeds to viewport edge, content right (named-line grid)                                                                                         |
| `card`              | 1fr                | Centered card: col1 content centered with padding, col2 positioned absolutely as background (rounded, clipped). Use with Visual + Overlay in col2 for CTA sections. |
| `auto-width`        | auto auto          | Both columns size to content                                                                                                                                        |

**Choosing a column wrapper — the decision table.** For anything going into a `col1`/`col2` slot, answer one question: _what is in the column?_

| What the column holds                                            | Wrapper                                  | Why                                                                                                                                    |
| ---------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| One self-contained component (Visual, Grid, Card, Slider)        | **None** — `` on it directly             | It's already a single element; a wrapper adds nothing                                                                                  |
| Multiple loose elements, **no** `<Visual>` (Heading/Text/Button) | **``**                                   | `display: contents` erases the wrapper so each element is a real grid child — column gap and `verticalAlign` apply per element         |
| A ratio'd `<Visual>` **plus** anything else                      | **`<Layout variant="stack">`**           | A real block box between column and image; without it the image's `height: 100%` beats its `ratio` and balloons (Col makes this worse) |
| A background `<Visual variant="background">` + `<Overlay>`       | **``**                                   | Background visuals are absolute-fill with ratio unset — the balloon hazard doesn't exist                                               |
| Content that needs its own text alignment (e.g. centered column) | **`<Layout variant="stack" align="…">`** | It cascades alignment to children; `` has no box to align                                                                              |

Getting this wrong is loud in dev: ``warns in the terminal when it wraps a ratio'd `<Visual>` (see `Layout.astro`). In `stack`/`stack-centered` variants none of this applies — put elements in`` and let the variant handle alignment.

**Slots:** `col1` (left) and `col2` (right). **All variants use ``** — including `stack` and `stack-centered`. When placing multiple loose elements (Heading, Text, Button) into a column, wrap them in the **`` component** (`…</Fragment>`) — see [`](#col) below. ` renders `<div class="u-display-contents">` so its children behave as direct grid children, with the load-bearing `u-display-contents` class baked in (never hand-write that div). Single components that already have their own wrapper (Visual, Grid, Card) can take `slot` directly — no ``needed. **Exception:** a column that holds a `<Visual>` _together with other content_ must use `<Layout variant="stack">`, not`` — ``'s `display: contents` lets the image's `height: 100%` override its `ratio` aspect-ratio and balloon (see the ⚠️ note in the [``](#col) section).

**Stack variants:** Do NOT wrap children in Layout for alignment — `stack-centered` already handles centering via `text-align: center` and `align-items: center`. Layout is only needed inside two-column layouts when you need to control alignment within a column.

```astro
<!-- Centered single column — use with  -->
<Layout variant="stack-centered">
  <Heading tag="h1" variant="display-sm">Page Title</Heading>
  <Text variant="large" align="center">Supporting text.</Text>
  <div class="u-button-wrapper">
    <Button href="/cta" ariaLabel="CTA">Get Started</Button>
  </div>
</Layout>

<!-- 50/50 — wrap loose elements in  -->
<Layout variant="columns" verticalAlign="center">
  <Heading variant="eyebrow">Label</Heading>
  <Heading tag="h3" variant="h2">Title</Heading>
  <Text>Description text.</Text>
  <div class="u-button-wrapper">
    <Button href="#" ariaLabel="CTA">Get started</Button>
  </div>
</Layout>
<Visual slot="column2" src={img} alt="Description" ratio="landscape" />

<!-- Card layout (content + image in a rounded card) -->
<Layout variant="contain">
  <Heading>Feature</Heading>
  <Text>Description</Text>
</Layout>
<Visual slot="column2" src={img} alt="" />

<!-- Custom column ratio (works on columns, sticky-left, contain) -->
<Layout variant="columns" ratio="5-7" verticalAlign="start">
  <Heading variant="eyebrow">Label</Heading>
  <Text slot="column2">Body</Text>
</Layout>

<!-- Breakout with custom column spans (image takes 8 cols, content takes 5) -->
<Layout variant="breakout" contentSpan={5} bleedSpan={8}>
  <Heading>Narrow content</Heading>
  <Image slot="column2" src={img} alt="" />
</Layout>

<!-- Full with wider content side -->
<Layout variant="full" contentSpan={8} bleedSpan={5}>
  <Text>Wide content area</Text>
  <Image slot="column2" src={img} alt="" />
</Layout>

<!-- Keep columns until small (~560px) instead of default medium (~928px) -->
<Layout variant="columns" collapseAt="small" verticalAlign="center">
  <Heading variant="h3">Stays side-by-side on tablets</Heading>
  <Text slot="column2">Only stacks on phones.</Text>
</Layout>

<!-- Card with background image (CTA pattern) -->
<Layout variant="card">
  <Heading tag="h2" variant="display-sm" accent
    >Ready to <strong>start</strong>?</Heading
  >
  <Text variant="large" align="center">Book a free strategy call.</Text>
  <div class="u-button-wrapper">
    <Button href="/contact" ariaLabel="Book call">Book a Call</Button>
  </div>
</Layout>
<Fragment slot="column2">
  <Visual src={bgImage} alt="" variant="background" />
  <Overlay strength={75} />
</Fragment>

<!-- Card with custom vertical padding -->
<Layout variant="card" cardPadding="var(--section-space-large)">
  <Heading tag="h2" variant="h2">Taller card</Heading>
  <Text>More vertical breathing room.</Text>
</Layout>
```

**Column span math:** `contentSpan + bleedSpan` must equal 13 (12 content columns + 1 gutter). The bleed side includes the gutter track that extends to the viewport edge. If you only set one, the other uses its default and the total may not equal 13 — always set both.

---

### ``

The standard wrapper for putting **multiple loose elements** into a single `<Layout>` column slot. Renders `<div class="u-display-contents">` — `display: contents` removes the wrapper from the box tree, so its children become **direct children of the Layout column** (correct `verticalAlign`, `rowGap`, and margin flow). Use it instead of hand-writing `<div class="u-display-contents">`; the load-bearing class is baked in so it can never be forgotten.

**When to use it:** a Layout slot positions exactly one element. Whenever a column holds two or more loose elements (Heading + Text + Button, or Visual + Overlay), wrap them in `. A _single_ self-contained component (Visual, Grid, Card) is already one element — give it `/`slot="column2"` directly; do **not** wrap it in ``.

**Why not a plain `<div>`:** a normal `<div>` would itself become the grid/flex child, collapsing all your elements into one box and breaking column alignment and gap. `` (via `display: contents`) wraps for slotting without becoming a layout box.

> ⚠️ **A column that holds a `<Visual>` together with other content must use `<Layout variant="stack">`, not ``.** Because `display: contents` removes the `` box, `.u-image-wrapper` becomes a **direct child of the Layout column** — a grid/flex item with a _definite_ height. The wrapper's `height: 100%` ([visual-utilities.css](src/styles/base/visual-utilities.css)) then **overrides the inline `aspect-ratio`** that `<Visual ratio="…">` sets, so the image balloons to a huge near-portrait size and crowds out the text below (worst on mobile, where the column collapses to `display: flex`). `<Layout variant="stack">` inserts a real `height: auto` block between the column and the image, so `height: 100%` has nothing definite to resolve against → it falls back to `auto` → the aspect-ratio governs and the image sizes correctly. Rule: `` is only for self-sizing loose elements (Heading / Text / Button); reach for `<Layout variant="stack">` the moment a `<Visual>` shares the column with other content.

| Prop             | Type                    | Default | Description                                                                                                           |
| ---------------- | ----------------------- | ------- | --------------------------------------------------------------------------------------------------------------------- |
| `class`          | `string`                | —       | Extra custom/utility classes, merged **on top of** `u-display-contents`                                               |
| _DOM attributes_ | `HTMLAttributes<"div">` | —       | Standard `<div>` attributes (`slot`, `style`, `data-*`, `aria-*`, etc.) — type-checked, forwarded to the root element |

**Slot:** default — the loose elements to place into the Layout column.

```astro
<!-- Multiple loose elements in one column -->
<Layout variant="columns" verticalAlign="center">
  <Heading variant="eyebrow">Label</Heading>
  <Heading tag="h3" variant="h2">Title</Heading>
  <Text>Description text.</Text>
  <div class="u-button-wrapper">
    <Button href="#" ariaLabel="CTA">Get started</Button>
  </div>
</Layout>
<!-- Single component → slot directly, no  -->
<Visual slot="column2" src={img} alt="Description" ratio="landscape" />

<!-- Extra class is merged on top of u-display-contents; attributes pass through -->
<Heading tag="h1" variant="h1">Hero</Heading>
<Text variant="large">Subhead.</Text>
```

---

### `<Grid>`

Responsive CSS grid using container-query-based column counts (`@container` on `.u-container`).

| Prop            | Type                     | Default     | Description                                     |
| --------------- | ------------------------ | ----------- | ----------------------------------------------- |
| `largeColumns`  | `1`–`6`                  | `3`         | Columns at default size                         |
| `mediumColumns` | `0`–`4`                  | `2`         | Columns at container ≤ 928px. `0` = inherit     |
| `smallColumns`  | `0`–`2`                  | `1`         | Columns at container ≤ 560px. `0` = inherit     |
| `xsmallColumns` | `0`–`1`                  | `0`         | Columns at container ≤ 320px. `0` = inherit     |
| `rowGap`        | `0`–`8`                  | `6`         | Row gap (`--space-N` scale)                     |
| `variant`       | `'default'`\|`'autofit'` | `'default'` | Grid mode                                       |
| `minColWidth`   | `string`                 | —           | Min column width for `autofit` (e.g. `'16rem'`) |
| `class`         | `string`                 | —           | Extra classes on wrapper                        |

```astro
<!-- 3 → 2 → 1 responsive grid -->
<Grid largeColumns={3} mediumColumns={2} smallColumns={1}>
  <Card title="A" />
  <Card title="B" />
  <Card title="C" />
</Grid>

<!-- Auto-fit (fills available space) -->
<Grid variant="autofit" minColWidth="18rem" rowGap={8}>
  <Card />
  <Card />
</Grid>
```

---

### `<Card>`

Content card with optional image, title, body, and footer. Passing `href` makes the whole card surface a link — via a stretched pseudo-element on the title's anchor, not an overlay element.

**Interaction model (automatic).** The card counts the actions (`<a href>` / `<button>`) in its **footer** slot and picks:

| Actions in footer | Result                                                                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 0 or 1            | Whole card is the link. The lone button is a visual affordance, and the footer is `inert` — **one** tab stop, not two to the same place. |
| 2 or more         | The card surface is **not** a link (two destinations can't share one surface); the buttons stay real. A dev warning explains it.         |

Override with `actionsOverride="single" \| "multiple"` when that read is wrong. Actions must be in the `footer` slot to be counted.

| Prop        | Type                                | Default     | Description                                                            |
| ----------- | ----------------------------------- | ----------- | ---------------------------------------------------------------------- |
| `variant`   | `'default'`\|`'stacked'`\|`'cover'` | `'default'` | Card layout                                                            |
| `href`      | `string`                            | —           | Makes card fully clickable (renders `<a>` overlay)                     |
| `newTab`    | `boolean`                           | `false`     | Open link in new tab                                                   |
| `ariaLabel` | `string`                            | —           | Accessible label for the card link (the title text is the anchor text) |
| `title`     | `string`                            | —           | Convenience title prop (renders as h4)                                 |
| `rowSpan`   | `1`–`4`                             | —           | `grid-row: span N`                                                     |
| `colSpan`   | `1`–`4`                             | —           | `grid-column: span N`                                                  |
| `radius`    | `string`                            | —           | Border-radius utility class override                                   |
| `class`     | `string`                            | —           | Extra classes on outer wrapper                                         |

**Variants:**

- `default` — visual on top (16/9 aspect ratio), content below
- `stacked` — content only, visual slot hidden
- `cover` — visual fills card (2/3 aspect ratio), content overlays at bottom

**Slots:** `visual` (image/media), `title` (custom heading), default (body), `footer`

```astro
<!-- Default card with image and link -->
<Card title="Project Title" href="/work/project" ariaLabel="View Project">
  <Image slot="visual" src={img} alt="Project screenshot" />
  <Text>Short description.</Text>
  <div slot="footer"><Button ariaLabel="Read more">Read More</Button></div>
</Card>

<!-- Cover card (image-first) -->
<Card variant="cover" href="/article">
  <Image slot="visual" src={cover} alt="" class="u-image" />
  <Heading tag="h3" variant="h4">Article Title</Heading>
</Card>

<!-- Wide feature card spanning 2 columns -->
<Card variant="stacked" colSpan={2}>
  <Heading tag="h3" variant="h3">Feature Title</Heading>
  <Text>Body text.</Text>
</Card>
```

---

### `<BlogCard>`

Blog post card built on top of the Card component. Image-top layout with title (clamped at 2 lines), description (clamped at 2 lines), category label, and hidden author/date metadata for CMS sorting. The entire card surface is clickable.

| Prop           | Type                      | Default      | Description                                          |
| -------------- | ------------------------- | ------------ | ---------------------------------------------------- |
| `title`        | `string`                  | **required** | Post title (clamped at 2 lines)                      |
| `description`  | `string`                  | **required** | Post excerpt (clamped at 2 lines)                    |
| `category`     | `string`                  | **required** | Category label at bottom                             |
| `href`         | `string`                  | **required** | Link to the full blog post                           |
| `image`        | `ImageMetadata \| string` | **required** | Featured image source                                |
| `imageAlt`     | `string`                  | **required** | Alt text for the featured image                      |
| `author`       | `string`                  | —            | Author name (data attribute for sorting)             |
| `authorAvatar` | `ImageMetadata \| string` | —            | Author avatar (used in featured post layout)         |
| `date`         | `string`                  | —            | Publish date ISO string (data attribute for sorting) |
| `class`        | `string`                  | —            | Extra classes on outer wrapper                       |

```astro
<!-- Basic blog card -->
<BlogCard
  title="How to Build a Design System"
  description="Learn how to create a scalable design system for your team."
  category="Design"
  href="/blog/design-system"
  image={blogImage}
  imageAlt="Design system components"
  author="Jane Doe"
  date="2026-03-01"
/>
```

**CMS integration:** When connecting Sanity or another headless CMS, the `BlogPost` interface in `src/pages/blog/index.astro` maps 1:1 to CMS fields. Replace the static `posts` array with a CMS query.

---

### `<Accordion>` + `<AccordionItem>`

Animated expand/collapse FAQ list. Uses GSAP for smooth height transitions (falls back to instant toggle if GSAP is unavailable).

#### `<Accordion>` props

| Prop                 | Type      | Default | Description                                     |
| -------------------- | --------- | ------- | ----------------------------------------------- |
| `closePrevious`      | `boolean` | `true`  | Close open item when another opens              |
| `closeOnSecondClick` | `boolean` | `true`  | Click open item to close it                     |
| `openOnHover`        | `boolean` | `false` | Open on hover (avoid for accessibility)         |
| `openByDefault`      | `number`  | `0`     | 1-based index to open on load. `0` = all closed |
| `class`              | `string`  | —       | Extra classes                                   |

#### `<AccordionItem>` props

| Prop       | Type      | Default | Description        |
| ---------- | --------- | ------- | ------------------ |
| `question` | `string`  | —       | Toggle button text |
| `open`     | `boolean` | `false` | Start expanded     |
| `class`    | `string`  | —       | Extra classes      |

**Slots on AccordionItem:** `question` (rich text toggle), default (expanded body)

```astro
<Accordion openByDefault={1}>
  <AccordionItem question="What is this design system?">
    A structured CSS and component system for building consistent UIs.
  </AccordionItem>
  <AccordionItem question="Does this work with Astro?">
    Yes — this starter maps the CSS system to typed Astro components.
  </AccordionItem>
</Accordion>
```

---

### `<Overlay>`

Absolute-fill scrim that sits on top of media or background content. Must be placed inside a `position: relative` (or `absolute`) parent — typically a Section `background` slot, a Layout `card` variant's col2, or a Card's `visual` slot.

| Prop             | Type                    | Default   | Description                                                                                                         |
| ---------------- | ----------------------- | --------- | ------------------------------------------------------------------------------------------------------------------- |
| `variant`        | `'solid'`\|`'gradient'` | `'solid'` | Even scrim vs top-to-bottom vertical gradient                                                                       |
| `strength`       | `0`–`100`               | `70`      | Darkness for solid variant                                                                                          |
| `strengthTop`    | `0`–`100`               | `0`       | Darkness at top edge (gradient variant only)                                                                        |
| `strengthMiddle` | `0`–`100`               | —         | Optional midpoint darkness (gradient variant only). Omit for a straight two-stop fade; set to add a 50% color stop. |
| `strengthBottom` | `0`–`100`               | `70`      | Darkness at bottom edge (gradient variant only)                                                                     |
| `class`          | `string`                | —         | Extra classes on the overlay div                                                                                    |

Accepts any HTML attribute (`style`, `data-*`, `aria-*`). User-provided `style` is merged with computed styles.

```astro
<!-- Default solid scrim -->
<Overlay />

<!-- Lighter solid scrim -->
<Overlay strength={40} />

<!-- Gradient: transparent top → dark bottom (for bottom-aligned text over imagery) -->
<Overlay variant="gradient" strengthTop={0} strengthBottom={80} />

<!-- Reverse gradient: dark top → transparent bottom -->
<Overlay variant="gradient" strengthTop={70} strengthBottom={0} />

<!-- Both ends tinted, lighter in the middle -->
<Overlay variant="gradient" strengthTop={40} strengthBottom={60} />

<!-- Three-stop gradient: dark top, very light middle, dark bottom -->
<Overlay
  variant="gradient"
  strengthTop={70}
  strengthMiddle={10}
  strengthBottom={70}
/>

<!-- Inside a Section background slot -->
<Section theme="dark">
  <Fragment slot="background">
    <Visual src={bg} alt="" variant="background" />
    <Overlay variant="gradient" strengthTop={30} strengthBottom={75} />
  </Fragment>
  ...
</Section>
```

---

### `<Modal>`

Native `<dialog>`-based modal with CSS enter/exit transitions. No extra JS imports required.

**Trigger pattern:** Add `data-modal-trigger="modal-id"` to any button or link to open the modal.

| Prop        | Type                                       | Default      | Description                                         |
| ----------- | ------------------------------------------ | ------------ | --------------------------------------------------- |
| `id`        | `string`                                   | **required** | Must match `data-modal-trigger` value               |
| `variant`   | `'small'`\|`'side-panel'`\|`'full-screen'` | `'small'`    | Layout style                                        |
| `ariaLabel` | `string`                                   | —            | Accessible label when no visible heading is present |
| `class`     | `string`                                   | —            | Extra classes on `<dialog>`                         |

**Variants:**

- `small` — centered panel, max ~800px wide
- `side-panel` — slides in from right edge (filters, settings)
- `full-screen` — full viewport (image viewers, immersive content)

**Slots:** default (scrollable content), `close` (override the default close × button)

**Close methods:** close button click, backdrop click, `Escape` key (native `<dialog>`)

```astro
<!-- Trigger (anywhere on page) -->
<Button data-modal-trigger="contact-modal" ariaLabel="Open contact form"
  >Contact Us</Button
>

<!-- Modal (near bottom of page, inside BaseLayout slot) -->
<Modal id="contact-modal" variant="small" ariaLabel="Contact form">
  <Heading tag="h2" variant="h3">Get in Touch</Heading>
  <Text>Fill out the form below.</Text>
</Modal>
```

---

### `<Marquee>`

Infinite horizontal scrolling ticker powered by GSAP (loaded globally via CDN). Accepts any content — text, logos, cards, CMS items. Each child should have the `marquee_item` class. Automatically clones content to fill the viewport for seamless looping.

| Prop           | Type                | Default  | Description                           |
| -------------- | ------------------- | -------- | ------------------------------------- |
| `speed`        | `number`            | `20`     | Duration in seconds — higher = slower |
| `direction`    | `'left'`\|`'right'` | `'left'` | Scroll direction                      |
| `pauseOnHover` | `boolean`           | `true`   | Pause animation on mouse hover        |
| `gap`          | `0`–`8`             | `6`      | Gap between items (`--space-N` scale) |
| `class`        | `string`            | —        | Extra classes on `.marquee_wrap`      |

**Slot:** default — marquee items (use `.marquee_item` class on each child)

**Accessibility:** Respects `prefers-reduced-motion: reduce` — animation is skipped entirely.

```astro
<!-- Text marquee -->
<Marquee>
  <span class="marquee_item u-text-style-h3">Design</span>
  <span class="marquee_item u-text-style-h3">Develop</span>
  <span class="marquee_item u-text-style-h3">Deploy</span>
  <span class="marquee_item u-text-style-h3">Iterate</span>
</Marquee>

<!-- Logo marquee (slower, wider gap, right-to-left) -->
<Marquee speed={30} gap={8}>
  <div class="marquee_item">
    <Image src={logo1} alt="Acme Corp" />
  </div>
  <div class="marquee_item">
    <Image src={logo2} alt="Globex" />
  </div>
</Marquee>

<!-- CMS-driven -->
<Marquee speed={25}>
  {
    clients.map((c) => (
      <div class="marquee_item">
        <Image src={c.logo} alt={c.name} />
      </div>
    ))
  }
</Marquee>

<!-- Reversed direction, no hover pause -->
<Marquee direction="right" pauseOnHover={false} gap={4}>
  <span class="marquee_item u-text-style-large">Trusted by 500+ teams</span>
  <span class="marquee_item u-text-style-large">24/7 Support</span>
  <span class="marquee_item u-text-style-large">99.9% Uptime</span>
</Marquee>
```

**Logo sizing:** Images inside `.marquee_item` default to `max-height: 2.5rem` with `object-fit: contain`. Override with a custom class or inline style for different sizes.

---

### `<ScrollReveal>`

Scroll-linked reveal component: text blocks on the left fade in/out as the user scrolls, while a sticky image on the right cross-fades to match the active text block. On mobile (< 768px), collapses to a single column with images inline. Powered by GSAP + ScrollTrigger (loaded globally via CDN).

**Important:** Uses `@media` queries (not `@container`) to stay in sync with `ScrollTrigger.matchMedia('(min-width: 768px)')` in the JS. Both fire at exactly 768px viewport width.

| Prop          | Type                                                                                                | Default       | Description                                         |
| ------------- | --------------------------------------------------------------------------------------------------- | ------------- | --------------------------------------------------- |
| `items`       | `ScrollRevealItem[]`                                                                                | **required**  | Array of content blocks (min 2 recommended)         |
| `imageRatio`  | `'wide'`\|`'widescreen'`\|`'landscape'`\|`'square'`\|`'portrait'`\|`'tall'`\|`string`               | `'landscape'` | Aspect ratio for all images (forwarded to Visual)   |
| `imageRadius` | `'none'`\|`'xsmall'`\|`'small'`\|`'medium'`\|`'large'`\|`'xlarge'`\|`'main'`\|`'full'`\|`'section'` | `'main'`      | Border radius for all images (forwarded to Visual)  |
| `ratio`       | `string`                                                                                            | `'5-7'`       | Column ratio as `"N-M"` — numbers become `fr` units |
| `class`       | `string`                                                                                            | —             | Extra classes on `.scroll_reveal_wrap`              |

**ScrollRevealItem fields:**

| Field             | Type                      | Required | Description                                                          |
| ----------------- | ------------------------- | -------- | -------------------------------------------------------------------- |
| `image`           | `ImageMetadata \| string` | yes      | Image source (imported or URL — URL requires width/height on Visual) |
| `imageAlt`        | `string`                  | yes      | Alt text for the image                                               |
| `eyebrow`         | `string`                  | —        | Small label above heading (renders as `Heading variant="eyebrow"`)   |
| `heading`         | `string`                  | yes      | Block heading (renders as `Heading tag="h3" variant="h3"`)           |
| `text`            | `string`                  | yes      | Body text (renders as `Text variant="regular"`)                      |
| `buttonHref`      | `string`                  | —        | CTA link (omit to hide button)                                       |
| `buttonText`      | `string`                  | —        | Button label (default: `'Learn more'`)                               |
| `buttonAriaLabel` | `string`                  | —        | Button aria-label (falls back to `"Learn more about {heading}"`)     |

**Slot:** none — content is driven entirely by the `items` array.

**Accessibility:** Respects `prefers-reduced-motion: reduce` — all scroll animations are skipped entirely.

```astro
<!-- Standard scroll reveal with 4 items -->
<ScrollReveal
  items={[
    {
      eyebrow: "Platform",
      heading: "Powerful analytics dashboard",
      text: "Track every metric that matters to your business.",
      image: analyticsImg,
      imageAlt: "Analytics dashboard screenshot",
    },
    {
      heading: "Automated workflows",
      text: "Set it and forget it. Our automation handles the rest.",
      image: workflowImg,
      imageAlt: "Workflow builder interface",
      buttonHref: "/workflows",
      buttonText: "Learn more",
    },
    {
      heading: "Real-time collaboration",
      text: "Work together seamlessly, no matter where your team is.",
      image: collabImg,
      imageAlt: "Team collaboration view",
    },
  ]}
/>

<!-- Custom column ratio (wider image) and square images -->
<ScrollReveal
  items={items}
  ratio="4-8"
  imageRatio="square"
  imageRadius="large"
/>
```

**How it works:**

- Desktop: each text block gets a `ScrollTrigger` with `scrub: 0.3` that controls its opacity. First block starts visible, last block never fades out. At ~50% progress, the paired image panel gets `.is-active` (cross-fade via CSS `transition: opacity 0.5s ease`).
- Mobile: no animations — all blocks visible at full opacity, images shown inline above each text block, sticky track hidden.
- Uses `ScrollTrigger.matchMedia` — animations are auto-killed on resize below 768px and re-created above.

---

### `<Slider>`

Touch/swipe carousel powered by **Swiper v12** (npm-bundled via `src/scripts/swiper-init.js`). Each slide must be a `.swiper-slide` div.

| Prop             | Type                                | Default       | Description                                      |
| ---------------- | ----------------------------------- | ------------- | ------------------------------------------------ |
| `variant`        | `'crop-left'`\|`'overflow-visible'` | `'crop-left'` | Overflow clipping                                |
| `slidesLg`       | `number`                            | `3`           | Slides at ≥ 1024px                               |
| `slidesMd`       | `number`                            | `2`           | Slides at ≥ 800px                                |
| `slidesSm`       | `number`                            | `1.2`         | Slides at ≥ 560px (fractional = peek next slide) |
| `slidesXs`       | `number`                            | `1.1`         | Slides at ≥ 320px                                |
| `speed`          | `number`                            | `600`         | Transition duration (ms)                         |
| `freeMode`       | `boolean`                           | `false`       | Free drag — no snap to position                  |
| `mousewheel`     | `boolean`                           | `true`        | Horizontal mouse-wheel scrolls slider            |
| `slideToClicked` | `boolean`                           | `false`       | Click a slide to navigate to it                  |
| `showBullets`    | `boolean`                           | `true`        | Pagination bullet dots                           |
| `showArrows`     | `boolean`                           | `false`       | Prev / next arrow buttons                        |
| `showControls`   | `boolean`                           | `true`        | Show controls row at all                         |
| `class`          | `string`                            | —             | Extra classes on `.slider_wrap`                  |

**Variants:**

- `crop-left` — left edge clips to container; slides peek in from the right
- `overflow-visible` — all overflow visible; use inside an already-clipped parent

**Slots:** default (`.swiper-slide` divs), `controls` (override entire controls row)

```astro
<Slider slidesLg={3} slidesSm={1.2} showArrows={true}>
  <div class="swiper-slide">
    <Card title="Slide 1"><Text>Content</Text></Card>
  </div>
  <div class="swiper-slide">
    <Card title="Slide 2"><Text>Content</Text></Card>
  </div>
  <div class="swiper-slide">
    <Card title="Slide 3"><Text>Content</Text></Card>
  </div>
</Slider>
```

---

### `<PricingCard>` + `<PricingItem>`

Pricing tier card with name, price, description, feature items, and CTA button. No box-shadow baked in — add `u-box-shadow-*` utilities yourself. Composes Layout, Heading, Text, and Button internally.

**Import:**

```astro
import PricingCard from '@/components/ui/PricingCard.astro'; import PricingItem
from '@/components/ui/PricingItem.astro';
```

#### `<PricingCard>` props

| Prop            | Type                              | Default         | Description                                                   |
| --------------- | --------------------------------- | --------------- | ------------------------------------------------------------- |
| `name`          | `string`                          | **required**    | Package name (rendered as heading)                            |
| `price`         | `string`                          | **required**    | Price number (e.g. `"$5,000"`, `"$3,500"`)                    |
| `priceSuffix`   | `string`                          | —               | Smaller text after price (e.g. `"/month"`, `"/link"`)         |
| `priceLabel`    | `string`                          | —               | Small text above price (e.g. `"Starting at"`)                 |
| `description`   | `string`                          | —               | Tagline below price                                           |
| `href`          | `string`                          | —               | CTA button link (omit to hide button)                         |
| `buttonText`    | `string`                          | `'Get started'` | Button label                                                  |
| `ariaLabel`     | `string`                          | —               | Button aria-label (falls back to `"Learn more about {name}"`) |
| `buttonVariant` | `'primary'`\|`'secondary'`        | `'primary'`     | Button style                                                  |
| `variant`       | `'default'`\|`'compact'`          | `'default'`     | Card layout — compact has tighter spacing                     |
| `featured`      | `boolean`                         | `false`         | Accent-colored border highlight                               |
| `align`         | `'inherit'`\|`'center'`\|`'left'` | `'inherit'`     | Content alignment                                             |
| `class`         | `string`                          | —               | Extra classes on root                                         |

**Slots:** `label` (tag badge inline with name, right-aligned), `default` (PricingItems), `footer` (below button)

#### `<PricingItem>` props

| Prop    | Type     | Default | Description   |
| ------- | -------- | ------- | ------------- |
| `class` | `string` | —       | Extra classes |

**Slots:** `icon` (defaults to checkmark SVG), `default` (text content)

```astro
<!-- Detailed card with items and featured badge -->
<PricingCard
  name="Growth Package"
  price="$3,500"
  priceSuffix="/month"
  description="For businesses ready to scale."
  href="/contact"
  featured
  class="u-box-shadow-medium"
>
  <Fragment slot="label">
    <Text tag="span" variant="tiny" weight="bold" marginBottom={0}
      >Most Popular</Text
    >
  </Fragment>
  <PricingItem>3 blog posts per month</PricingItem>
  <PricingItem>Monthly technical SEO audit</PricingItem>
</PricingCard>

<!-- Compact quick-view card -->
<PricingCard
  variant="compact"
  name="SEO Audit"
  price="$1,200"
  description="One-time comprehensive audit."
  href="/contact"
  class="u-box-shadow-small"
/>

<!-- Simple card with price label -->
<PricingCard
  name="Web Design"
  price="$5,000"
  priceLabel="Starting at"
  href="/contact"
  buttonText="Book Your Free Strategy Call"
>
  <PricingItem>ICP discovery and strategic positioning</PricingItem>
  <PricingItem>Custom Webflow design and development</PricingItem>
</PricingCard>
```

---

## Bundled Animation/Slider Dependencies

GSAP and Swiper are **npm-bundled** (no CDN). Two init scripts in `src/scripts/` import them and expose them on `window`, both imported from `BaseLayout.astro`'s `<script>` block (gsap-init must come first):

| Library                          | Source                                                            | Init script                  | Provides                                                  |
| -------------------------------- | ----------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------- |
| GSAP + ScrollTrigger + SplitText | `gsap` (npm)                                                      | `src/scripts/gsap-init.js`   | `window.gsap`, `window.ScrollTrigger`, `window.SplitText` |
| Swiper 12                        | `swiper` (npm, `swiper/bundle` entry — all modules pre-installed) | `src/scripts/swiper-init.js` | `window.Swiper` — Slider component                        |

**Note:** Component scripts may still run before the bundles attach to `window`. `Accordion.astro` falls back gracefully if GSAP is absent; `Slider.astro` polls for `window.Swiper` with up to 10 retries at 100ms intervals.

---

## Common Page Patterns

### Standard content section

```astro
<!-- No padding prop — 'main' default, the standard rhythm (writing "main" is a type error) -->
<Section theme="light">
  <Layout variant="columns" ratio="5-7" verticalAlign="center">
    <Heading variant="eyebrow">Section Label</Heading>
    <Heading tag="h2" variant="display-sm">
      Section <strong>heading</strong>
    </Heading>
  </Layout>
  <Text slot="column2" size="large">Body text for this section.</Text>
</Section>
```

### Card grid section

```astro
<Section>
  <Heading tag="h2" variant="h2">Our Work</Heading>
  <Grid largeColumns={3} mediumColumns={2} smallColumns={1} rowGap={6}>
    <Card title="Project One" href="/work/one" ariaLabel="View Project One">
      <Image slot="visual" src={img} alt="Project One" />
      <Text>Description.</Text>
    </Card>
  </Grid>
</Section>
```

### Hero section (first section on page)

```astro
<!-- Sticky nav → no page-top; no padding prop (the 'main' default). minHeight drives the hero height. -->
<Section theme="dark" minHeight id="hero">
  <Image slot="background" src={heroBg} alt="" class="u-image" />
  <Layout variant="stack-centered">
    <Heading tag="h1" variant="display-xl">
      Page <strong>Headline</strong>
    </Heading>
    <Text variant="large" align="center">Supporting text.</Text>
    <div class="u-button-wrapper">
      <Button href="/contact" ariaLabel="Get started">Get Started</Button>
      <Button variant="secondary" href="/case-studies" ariaLabel="Learn more"
        >Learn More</Button
      >
    </div>
  </Layout>
</Section>
```

### Blog listing page

```astro
<!-- src/pages/blog/index.astro — structure overview -->
<Section theme="dark">
  <!-- Hero with background image + overlay (default padding; sticky nav, no page-top) -->
  <Fragment slot="background">
    <Visual src={heroImage} alt="" variant="background" priority />
    <Overlay strength={75} />
  </Fragment>
  <Layout variant="stack-centered">
    <Heading tag="h1" variant="display-sm">Blog</Heading>
    <Text variant="large" align="center">Blog description.</Text>
  </Layout>
</Section>

<!-- Featured post — 2-column reversed (image left, content right) -->
<Section>
  <Layout variant="columns-reversed" verticalAlign="center">
    <Layout variant="stack">
      <Heading tag="h2" variant="h2">{featured.title}</Heading>
      <Text variant="regular">{featured.description}</Text>
      <!-- Author meta, CTA button -->
    </Layout>
  </Layout>
  <Visual slot="column2" src={featured.image} alt="" ratio="landscape" />
</Section>

<!-- Blog grid — 3 → 2 → 1 responsive -->
<Section>
  <Grid largeColumns={3} mediumColumns={2} smallColumns={1} rowGap={6}>
    {posts.map((post) => <BlogCard {...post} />)}
  </Grid>
</Section>
```

### Adding a new page

```astro
---
// src/pages/new-page.astro
import BaseLayout from "../layouts/BaseLayout.astro";
import Section from "../components/ui/Section.astro";
import Heading from "../components/ui/Heading.astro";
import Text from "../components/ui/Text.astro";
---

<!-- Default theme is light (omit theme prop to use site default) -->
<BaseLayout title="New Page | Site Name" description="SEO description.">
  <!-- First section: no padding prop (defaults to "main"); no page-top — nav is sticky -->
  <Section>
    <Heading tag="h1" variant="h1">New Page</Heading>
    <Text variant="large">Page intro text.</Text>
  </Section>
</BaseLayout>

<!-- Dark-themed page — pass theme="dark" -->
<BaseLayout title="Blog | Site Name" description="Our blog." theme="dark">
  <Section>
    <Heading tag="h1" variant="h1">Blog</Heading>
    <Text variant="large">Page intro text.</Text>
  </Section>
</BaseLayout>
```

---

## Site Configuration — `src/config/site.ts`

All site identity lives in **one file**: [src/config/site.ts](src/config/site.ts) exports a typed `SITE` object — name, URL, email, phone (display / e164 / tel), founder, address, business hours, `priceRange`, OG image + logo paths, `brand.color`, the footer `social` array, JSON-LD `sameAs`, the sitewide `areaServed` list, and the Sanity `projectId`/`dataset`/`apiVersion`. It also re-exports `SITE_URL` / `SITE_NAME` / `SITE_SUMMARY` (consumed by the `llms.txt` endpoints).

**When you need a site-wide value (email, phone, social link, brand name, URL), import it from `site.ts` — never hardcode it.** Consumers already wired up: `BaseLayout` (LocalBusiness JSON-LD), `Head` (title/og/theme-color), `Footer` (socials + contact), `jsonld.ts` (org name/logo/og-image and the `serviceFaqJsonLd` provider id), the contact + thank-you pages, the scorecard API (`/api/scorecard`), and the `llms.txt` / `llms-full.txt` endpoints.

**The Sanity project id/dataset/apiVersion + the site URL** live in [src/config/site.shared.mjs](src/config/site.shared.mjs) — a tiny **dependency-free `.mjs` leaf** that the config-load-context files (`astro.config.mjs`, `sanity.config.ts`, `sanity.cli.ts`, `scripts/*.mjs`) CAN import even though they can't import `site.ts`. `site.ts` imports it too, so there is **one** source for those primitives — no hand-syncing. The lone exception is [wrangler.jsonc](wrangler.jsonc) (JSON can't import); its `vars` are validated against the shared module by `npm run check:config`, which also runs automatically before every `npm run build` (the `prebuild` hook). If you change the project id/dataset, edit `site.shared.mjs` + `wrangler.jsonc` and the check guarantees they agree.

**Brand color:** the canonical value is `--color-brand-500` in [colors.css](src/styles/variables/colors.css). `SITE.brand.color` is a literal **mirror** of it, used only by HTML email and `<meta theme-color>` (contexts that can't read CSS variables). Anything with DOM access (e.g. the HowItWorks GSAP timeline) reads the CSS variable directly. Keep the two in sync when re-skinning.

---

## Deployment, Sanity Studio & Preview

The site runs on a **single** Cloudflare Worker (the `your-worker-name` project). `www.example.com` is the only public URL. The public CMS content routes (`/blog/**`, `/case-studies/**`, `/glossary/**`) are **prerendered static HTML** served by the Worker's assets binding at zero CPU; draft preview happens on a parallel **SSR `/preview/*` tree** (`/preview/blog/[slug]`, etc.) that renders the identical templates through the identical loaders — only the perspective differs. A second, tiny Worker (`workers/rebuild-debounce/`) collapses Sanity publish webhooks into a single rebuild so published content ships on the next build. The Studio is **hosted by Sanity** (deployed with `npx sanity deploy`), not embedded in the app. Its Presentation tool iframes the `/preview/*` routes **cross-origin**, via a cookie set by the `/api/draft-mode/enable` route on `www.example.com`. Because the frame is cross-origin, the site allows the Studio origin via CSP `frame-ancestors` (in [src/middleware.ts](src/middleware.ts) for SSR responses and [public/_headers](public/_headers) for static assets — keep both in sync), and the enable route sets the cookie `SameSite=None; Secure`.

**Why a `/preview` tree instead of drafts on the public URLs:** with `@astrojs/cloudflare`, the request handler returns a matching static asset **before** `app.render()` is ever called — Astro middleware never runs for a prerendered path, so a cookie-keyed draft rewrite on the public URL is impossible (including with `run_worker_first`). And serving the CMS routes as SSR just to enable preview is not an acceptable workaround: it burns Worker CPU per request and causes production 503s (`exceededCpu`) under crawler load. The `/preview` tree is the supported pattern — don't reach for either alternative.

**Studio URLs (Sanity app model):** the branded host `your-studio.sanity.studio` is a **redirect shim** — it 302s (preserving deep `/intent/...` paths) to the actual app at `https://www.sanity.io/@your-org-id/studio/<appId>`, which is itself sandboxed under `*.sanity.studio` nested inside the `www.sanity.io` dashboard shell. So `frame-ancestors` (in `src/middleware.ts` + `public/_headers`) must allow **both** `https://*.sanity.io` **and** `https://*.sanity.studio` (plus `http://localhost:3333` for `sanity dev`) — NOT just the branded host, and NOT just `www.sanity.io` (a single-origin value silently blocks Presentation). `stega.studioUrl` can still point at the branded `your-studio.sanity.studio` (overlay deep-links redirect through correctly). The backing app id is pinned in [sanity.cli.ts](sanity.cli.ts) (`deployment.appId`). ⚠️ The cross-site draft cookie can be blocked by Safari/ITP — verify Presentation in Chrome; a same-site `studio.example.com` Studio is the fallback.

**Forking this repo as a template?** Work through [docs/new-project-checklist.md](docs/new-project-checklist.md) — it lists the security/infra setup that lives in dashboards (Cloudflare WAF rate-limit rule, GitHub Dependabot settings, Sanity CORS, encrypted secrets) and must be re-created per project, plus the post-launch verification commands and the current dependency pins with their removal conditions. Keep that file updated when security-relevant setup changes (new API endpoints needing rate limits, new pins, new secrets).

Architecture reference: [Sanity's Visual Editing with Astro guide](https://www.sanity.io/docs/astro/astro-visual-editing). That guide's pattern is what this project implements.

### How draft mode works

1. Editor opens `your-studio.sanity.studio` and clicks **Presentation** in Studio's left rail. Per-document locations ([src/sanity/lib/resolve.ts](src/sanity/lib/resolve.ts)) point at the **`/preview/<type>/<slug>`** SSR twins — never the public URLs, which are static files where the cookie can't do anything.
2. Presentation calls `/api/draft-mode/enable` ([src/pages/api/draft-mode/enable.ts](src/pages/api/draft-mode/enable.ts)) with a Sanity-signed preview secret. The route validates the secret via `@sanity/preview-url-secret`'s `validatePreviewUrl` against the live dataset — if the request isn't from a legitimate Studio session, it returns 401.
3. On success the route sets the `sanity-preview-mode` cookie (`perspectiveCookieName` from `@sanity/preview-url-secret/constants`) with the editor's chosen perspective (default `"drafts"`) and redirects to the target path.
4. The Presentation iframe loads the `/preview/*` path. The preview route calls the same shared loader as its public twin ([src/sanity/lib/page-data.ts](src/sanity/lib/page-data.ts)), passing `getDraftModeProps(Astro)` ([src/sanity/lib/draft-mode.ts](src/sanity/lib/draft-mode.ts)) which reads the cookie and spreads `{ perspectiveCookie }` into `loadQuery` ([src/sanity/lib/load-query.ts](src/sanity/lib/load-query.ts)). When present, `loadQuery` fetches drafts with stega encoding and authenticates using `SANITY_API_READ_TOKEN`.
5. [src/layouts/BaseLayout.astro](src/layouts/BaseLayout.astro) checks `Astro.cookies.has(perspectiveCookieName)` (guarded by `Astro.isPrerendered`) and conditionally mounts [src/components/SanityVisualEditing.tsx](src/components/SanityVisualEditing.tsx) (click-to-edit overlays + history sync + content refresh) and [src/components/DisableDraftMode.tsx](src/components/DisableDraftMode.tsx) (exit button, hidden inside the iframe).
6. When an editor changes a field, `SanityVisualEditing`'s `refresh` callback reloads the page. The server re-fetches with drafts perspective. Content updates.
7. Clicking "Disable Draft Mode" (only visible outside the iframe) hits `/api/draft-mode/disable`, which clears the cookie.

Public visitors get prerendered HTML with `published` content baked in, and never have the cookie on the SSR routes → `<SanityVisualEditing>` isn't mounted. **Drafts can't leak.**

The `/preview` tree is invisible to search and never edge-cached, via three required layers: `Disallow: /preview` in [public/robots.txt](public/robots.txt); `X-Robots-Tag: noindex, nofollow` + forced `private, no-cache` from [src/middleware.ts](src/middleware.ts) (forced **regardless of the cookie** — Cloudflare's edge cache doesn't vary on cookies, so a cached published render would otherwise be served back to editors); and exclusion from the sitemap in [astro.config.mjs](astro.config.mjs).

**Publishing requires a rebuild.** Prerendered content ships on the next build, so a Sanity publish must trigger one: Sanity webhook (filter `!(_id in path("drafts.**"))`, on Create/Update/Delete) → the rebuild-debounce Worker ([workers/rebuild-debounce/](workers/rebuild-debounce/README.md), ~5 min quiet period / ~15 min hard cap via a Durable Object alarm) → Cloudflare deploy hook → **one** build. The debounce matters because Sanity fires once per document — publishing a batch without it means one build per document. Publish-to-live lands ~5–20 minutes depending on the debounce window.

### Rendering model — prerender public, SSR only /preview and /api

`astro.config.mjs` uses `output: "static"` with `@astrojs/cloudflare`. **All public routes are prerendered**, including the CMS content routes — each dynamic route exports a `getStaticPaths` fed by a minimal slug-only query (helpers in [src/sanity/lib/page-data.ts](src/sanity/lib/page-data.ts)). Only two kinds of routes opt into SSR with `export const prerender = false;`:

- `src/pages/preview/**` — the draft-preview twins that Presentation iframes
- `src/pages/api/**` — the scorecard endpoint and draft-mode cookie routes

Rules that keep this model healthy:

- **Keep slug queries thin.** `getStaticPaths` fetches the whole collection at build time — enumerate `slug.current` only.
- **Exclude "not published yet" flags from the slug query** (e.g. `comingSoon != true` on case studies), or you'll build pages that immediately redirect to /404. Those documents remain previewable under `/preview`.
- **`getStaticPaths` is extracted into its own module at build time.** Only _imports_ are in scope inside it — sibling consts in the same frontmatter are **not**. Keep its helpers in an imported module (`page-data.ts`). Symptom of getting this wrong: `<helper> is not defined` at build, pointing into an Astro-generated chunk.
- **Fresh forks build green:** the `page-data.ts` static-path helpers return `[]` (with a warning) when the Sanity project id is still the template placeholder. For a **real** project id they rethrow — a Sanity outage mid-build must fail the build loudly, not silently ship a site with every content page missing.

### Trailing slash config

URLs must resolve without trailing slashes. Two places must stay in sync:

1. **[astro.config.mjs](astro.config.mjs)** — set `trailingSlash: 'never'` on the root config so Astro emits canonical URLs, sitemap entries, and internal links without trailing slashes.
2. **[wrangler.jsonc](wrangler.jsonc)** — inside the `assets` block, set `"html_handling": "drop-trailing-slash"` so the Cloudflare Worker serves `/contact` instead of redirecting `/contact` → `/contact/` (or vice versa) at the edge:

   ```jsonc
   "assets": {
     "binding": "ASSETS",
     "directory": "./dist",
     "html_handling": "drop-trailing-slash",
   }
   ```

If only one side is set, you get edge redirects or 404s that don't show up in local dev.

### Sitemap

Every public route is prerendered, so `@astrojs/sitemap` enumerates the whole site — **including the CMS content routes** — automatically from the route table. There is **no** `customPages` option and **no** `getSanityUrls()`-style helper — a `customPages` list is only ever needed for SSR routes (which are invisible to the sitemap), and no content route here is SSR. A new content type only needs a prerendered route with `getStaticPaths` and it appears in the sitemap on the next build.

**Exclusions** live in [astro.config.mjs](astro.config.mjs) as **two lists with two different matching modes** (a single loose `page.includes(path)` gets it wrong in both directions — it can silently drop a real post like `/blog/components-in-…` via a `/components` exclusion, while exact-only matching pushes `/thank-you-call` variants _into_ the sitemap against robots.txt):

- `NOINDEX_PATHS` (src/config/seo.shared.mjs) — whole path segments (`/x` and `/x/…`, never `/blog/x-…`): the dev-only pages and `/preview`.
- `NOINDEX_PREFIXES` — literal prefixes mirroring robots.txt `Disallow` semantics: one `/thank-you` entry covers every `/thank-you*` variant. `isNoindexRoute()` combines both and feeds the sitemap filter, the generated `robots.txt`, the `noindex` meta tag, the SSR `X-Robots-Tag`, and the llms.txt index — one fact, five surfaces.

Keep both lists in sync with [public/robots.txt](public/robots.txt). To verify after a change: run a build and inspect `dist/sitemap-0.xml` — count entries, confirm no robots-disallowed URL appears, confirm no real content page is missing.

### Studio

Sanity Studio is **hosted by Sanity** at `your-studio.sanity.studio` — it is _not_ embedded in the app. The `@sanity/astro` integration in [astro.config.mjs](astro.config.mjs) intentionally omits `studioBasePath` (so no `/studio` route is injected) but is still present because it provides the `sanity:client` virtual module used by [src/sanity/lib/load-query.ts](src/sanity/lib/load-query.ts). Studio config lives in [sanity.config.ts](sanity.config.ts) and is shared by the hosted Studio, `npx sanity deploy`, and `npx sanity dev`. `stega.studioUrl` is set to the absolute hosted URL (`https://your-studio.sanity.studio`) so overlay clicks deep-link into the hosted Studio.

**Deploying the Studio:** `npx sanity schema deploy` then `npx sanity deploy` (publishes to `your-studio.sanity.studio` using the `studioHost`/`deployment.appId` already set in [sanity.cli.ts](sanity.cli.ts)). Studio updates ship independently of the site build.

**Local workflow:** run `npm run studio:local` (Studio at `localhost:3333`, iframing the local site) and `npm run dev` (site at `localhost:4321`) in separate terminals — there is no `/studio` on the dev site. `studio:local` sets `SANITY_STUDIO_PREVIEW_URL=http://localhost:4321` inline; a plain `npm run studio` / `sanity dev` falls back to `SITE_URL`, which iframes **production** — local route changes appear to do nothing, and if the route doesn't exist in production yet Presentation shows **"Unable to connect"** (that means "wrong origin", not broken code). The env var lives in `package.json` on purpose — do **not** put `SANITY_STUDIO_PREVIEW_URL` in `.env`, where it leaks into `sanity deploy` and ships a Studio pointing at localhost. `frame-ancestors` already allows `localhost:3333`.

**Staging-first deploy (ship before the real domain exists).** A fork can run on the Worker's free `https://<worker>.<account>.workers.dev` URL — including Sanity Presentation — before any custom domain is attached, with **no per-fork code edits**. The mechanism: `SITE_URL` in [src/config/site.shared.mjs](src/config/site.shared.mjs) is **env-overridable** (`process.env.SITE_URL || "<literal>"`), so the Cloudflare _build_ env supplies the staging origin; [sanity.config.ts](sanity.config.ts) drives `presentationTool`'s `previewUrl.initial` and `allowOrigins` from `SITE_URL` plus a `https://*.workers.dev` wildcard, so any staging Worker is trusted automatically. Deploy the Studio with `SANITY_STUDIO_PREVIEW_URL=https://<worker>.<account>.workers.dev npx sanity deploy` (env var on the same line — a plain `npx sanity deploy` bakes in the `SITE_URL` fallback). At launch, change the Cloudflare `SITE_URL` build var to the real origin and redeploy — no code commit. Full per-client runbook: **§4a "Staging-first deploy"** in [docs/new-project-checklist.md](docs/new-project-checklist.md).

### Studio editing experience (desk, groups, icons, Vision)

The Studio UI is configured entirely in code — [sanity.config.ts](sanity.config.ts) for the desk/plugins/branding, and each schema file for per-type icons and field groups. None of this touches content data; it's all editor-facing presentation.

**Branding.** `defineConfig` sets `name: "your-project"`, `title: "Your Company"`, a workspace `icon` (`StudioIcon` — the compact CL mark), and a navbar `logo` via `studio.components.logo` (`StudioLogo` — the full wordmark). Both live in [src/sanity/components/](src/sanity/components/) as TSX SVGs using `currentColor` (so they adapt to Studio light/dark). `StudioLogo` and the front-end [Logo.astro](src/components/global/Logo.astro) both render their SVG paths from the shared [src/config/logo-paths.ts](src/config/logo-paths.ts) — edit that one file to restyle the wordmark everywhere.

**Landing view / Dashboard.** There is **no in-Studio dashboard** — the org-level overview lives in Sanity's **hosted Dashboard**. The deployed Studio is a Core app, so it appears in the org Dashboard at `www.sanity.io` alongside Canvas, Media Library, Content Releases, etc. — that's the overview hub. In `sanity.config.ts`, `structureTool` is the **first plugin**, so opening the Studio lands on the content desk. If you want quick-links/external-shortcut widgets, build them as a **custom widget in the hosted Dashboard** — don't add an in-Studio dashboard plugin (`@sanity/dashboard`).

**Sanity version policy — track current.** The Studio runs on **Sanity 6**, and no Sanity package is version-held: majors arrive as normal (cooldown'd) Dependabot PRs. A Sanity major still deserves a real review before merging — re-verify the Studio plugins (`sanity-plugin-media`, `@sanity/code-input`, `visionTool`), the desk structure, and the visual-editing islands — but treat it as an ordinary upgrade, not a blocked one.

When taking a Sanity major, verify in this order: `npm ci` (a clean install on a **Linux** runner, which is where native/optional-peer resolution bugs surface, not macOS) → `npm run check` → `npm run build` → `npx sanity build` → then Presentation in a browser. If an "Invalid hook call" appears in dev after an `@sanity/astro` bump, that's a duplicate-React issue ([sanity-astro#406](https://github.com/sanity-io/sanity-astro/issues/406)) — pin `@sanity/astro` to the last-good version.

⚠️ **Never import `sanity/*` Studio modules from site code.** The Studio dependency tree includes packages that ship CSS imports, which the prerender step cannot load (`Unknown file extension ".css"`) — the build fails at the prerender stage, well after the bundle looks fine. This is why the Presentation location map ([resolve.ts](src/sanity/lib/resolve.ts), Studio-only) and the public content-link helper ([internal-links.ts](src/sanity/lib/internal-links.ts), site-only, zero Studio imports) are **separate modules**. Keep them separate.

**Desk structure** (the `structureTool({ structure })` resolver). Instead of the auto-generated flat type list, the resolver builds an explicit `S.list()`. **Because it's explicit, every new document type must be added here by hand** — a type with no entry will not appear in the desk. The layout:

```
Site Settings            (singleton — pinned, create/delete disabled)
──────────────
Blog Posts      ▸ All Posts · Featured · Drafts
Case Studies    ▸ All Case Studies · Featured · Coming Soon
Glossary Terms  (direct list, A–Z)
──────────────
Reusable Content ▸ Blog CTAs · CTA Sections
People & Social  ▸ Authors · Testimonials
```

Frequently-edited types (Blog Posts, Case Studies, Glossary) sit at the top level for shallow access; supporting types are tucked into the two labeled folders. The curated sub-views are plain GROQ filters on `S.documentList()`, e.g. `'_type == "blogPost" && featured == true'`, the drafts view `'… && _id in path("drafts.**")'`, and `'_type == "caseStudy" && comingSoon == true'`. "All" views use `S.documentTypeList(type)` so they inherit the schema's `orderings` and the type-scoped "create new" button. The `SINGLETON_TYPES` / `SINGLETON_ACTIONS` logic (and the `templates` / `document.actions` filters) keeps `siteSettings` a singleton — leave it intact.

**Field groups.** `blogPost`, `caseStudy`, and `glossaryTerm` split their fields into tabs via a `groups: [...]` array on the type plus a `group:` key on each top-level field. Convention: `content` (default), then `media`, `meta`, `seo` as needed (glossary only needs `content` + `meta`). `group` is **editor-UI only — no data migration**, so adding/removing groups is always safe. Copy the pattern from [blogPost.ts](src/sanity/schemaTypes/blogPost.ts). Object/array-member sub-fields (e.g. the content-block members in `caseStudy`) do not take groups — only the document's top-level fields do.

**Icons.** Every document type sets `icon:` on its `defineType` (imported from `@sanity/icons`) so the desk and document lists are scannable. Current mapping: blogPost→`DocumentTextIcon`, caseStudy→`CaseIcon`, glossaryTerm→`BookIcon`, author→`UserIcon`, testimonial→`CommentIcon`, blogCta→`BellIcon`, ctaSection→`BlockElementIcon`, siteSettings→`CogIcon`. Give new types an icon too.

**Vision (GROQ playground).** `visionTool` is added **dev-gated**: `...(import.meta.env?.DEV ? [visionTool({ defaultApiVersion: "2025-03-15" })] : [])`. It appears as a "Vision" tab only when running `astro dev`, and is excluded from the production Studio bundle's toolbar. The `?.` keeps it safe when [sanity.config.ts](sanity.config.ts) is loaded by the Sanity CLI (Node has no `import.meta.env`). Use it to test/prototype the queries in [src/sanity/lib/queries.ts](src/sanity/lib/queries.ts) against the live dataset. Keep `defaultApiVersion` in sync with the `apiVersion` in [astro.config.mjs](astro.config.mjs).

**Document actions & badges.** `document.actions`/`document.badges` in [sanity.config.ts](sanity.config.ts) are extended via [src/sanity/components/studioDocument.ts](src/sanity/components/studioDocument.ts): a **"View on site"** action (opens the live `/blog`·`/case-studies`·`/glossary` page by slug in a new tab — or a coming-soon case study's external Live URL) added to `PREVIEWABLE_TYPES`, plus **Featured** / **Coming Soon** status badges in the document header (blogPost gets Featured; caseStudy gets both). The singleton `actions` filter for `siteSettings` is preserved — keep it intact.

**SEO length nudges.** `blogPost`/`caseStudy` `description` fields return an **array of validation rules**: a hard `required().max(300)` error plus a `max(155).warning(...)` so editors get a non-blocking nudge when the description would be truncated in Google results. Returning an array lets one rule be an error and another a warning. The dedicated `seo.ts` override fields already carry their own length validation.

**When adding a new document type, do all four:** (1) add an `S.listItem()` in the right desk group, (2) set its `icon`, (3) add field `groups` if it's field-heavy, and (4) add a Presentation location (next section) if it's previewable. If the type gets its own detail route, it also needs the **four route pieces** — see **Adding a new content type** under Data fetching pattern below.

### Image alt text (asset-level fallback)

Editors can set **Alt text** directly on an image asset in the Media tab — `sanity-plugin-media` writes it to the asset's native `altText` field. So alt text is entered **once per asset** and reused everywhere that image appears.

Two pieces make this work:

- **Queries** ([src/sanity/lib/queries.ts](src/sanity/lib/queries.ts)) project every image alt as `"imageAlt": coalesce(imageAlt, <image>.asset->altText, "")` (galleries/grids also fold in their per-block default: `coalesce(alt, ^.galleryImagesAlt, asset->altText, "")`). Precedence: per-placement field → asset alt → empty string. The trailing `""` guarantees a **string** so Astro `<Image>`/`Visual` never receives `null`. The same projection is duplicated in the one inline query in [CaseStudyFeatured.astro](src/components/sections/CaseStudyFeatured.astro) — update both if you add a new image query.
- **Schema** — the per-field `imageAlt` inputs (blogPost, caseStudy, its image content blocks, blogCta) are **optional** (not `required`), with a description telling editors they can leave them blank to inherit the asset alt. They remain available as a per-placement override. Body inline-image alt stays `required` (those are contextual, set per insertion). Front-end components are unchanged — they still read `imageAlt`/`alt`, now pre-coalesced by the query.

**When adding a new image field + query:** mirror the `coalesce(…, asset->altText, "")` projection so the asset fallback keeps working, and make the per-field alt optional unless the image is always contextual.

### Presentation locations

Per-document iframe URLs are mapped in [src/sanity/lib/resolve.ts](src/sanity/lib/resolve.ts) via `defineLocations`. Location hrefs must point at the **`/preview/<type>/<slug>`** SSR twins — the public routes are prerendered static files, so the draft cookie can't affect them.

⚠️ **Two URL maps exist and are easy to conflate — they live in separate modules on purpose:**

| Module                                                | Used by                                         | Returns                                                                           |
| ----------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------- |
| [resolve.ts](src/sanity/lib/resolve.ts)               | the Studio only (imports `sanity/presentation`) | `/preview/<type>/<slug>` — the draft-preview iframe targets                       |
| [internal-links.ts](src/sanity/lib/internal-links.ts) | site code only (zero Studio imports)            | `/blog/…`, `/case-studies/…`, `/glossary/…` — real links inside published content |

Never import `resolve.ts` from site code: it drags the Studio dependency tree (including CSS-importing packages) into the site build and breaks the prerender step.

**When adding a previewable schema type:** add a new entry in `resolve.locations`. And remember: `resolve.ts` is compiled into the **hosted Studio bundle**, so location changes require `npx sanity deploy` — a site deploy alone leaves Presentation loading the old URLs (published content, no overlays, reads as "preview broke"). Deploy order: **site first** (so the `/preview` route exists), **then the Studio**.

### Required env vars

| Name                       | Where                                                  | Purpose                                                                                               |
| -------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `PUBLIC_SANITY_PROJECT_ID` | [wrangler.jsonc](wrangler.jsonc) `vars` + local `.env` | Sanity project                                                                                        |
| `PUBLIC_SANITY_DATASET`    | [wrangler.jsonc](wrangler.jsonc) `vars` + local `.env` | Dataset name                                                                                          |
| `SANITY_API_READ_TOKEN`    | Cloudflare **encrypted secret** + local `.env`         | Viewer token — validates preview secrets and authenticates draft fetches. Never a plain wrangler var. |

The Sanity project must have `https://www.example.com` (and `http://localhost:4321` for dev) added as a CORS origin with **Allow credentials** checked.

### Data fetching pattern

Every page and Sanity-fetching component goes through `loadQuery` and forwards the perspective via `getDraftModeProps(Astro)` — pass the **whole `Astro` global**, not `Astro.cookies`. The helper checks `isPrerendered` and short-circuits, so the _same call_ is safe on prerendered public routes (build time → `published`) and SSR preview routes (request time → cookie perspective). That's what lets one loader serve both trees.

```astro
---
import { loadQuery } from "../sanity/lib/load-query";
import { getDraftModeProps } from "../sanity/lib/draft-mode";
import { BLOG_POSTS_QUERY } from "../sanity/lib/queries";

const { data: posts } = await loadQuery<any[]>({
  query: BLOG_POSTS_QUERY,
  ...getDraftModeProps(Astro),
});
---
```

Helpers that fetch Sanity data (e.g. [src/sanity/lib/testimonials.ts](src/sanity/lib/testimonials.ts)) accept `perspectiveCookie` as an option, so the calling page can forward it via `getDraftModeProps`. The helper itself has no access to request context.

**Detail pages use the shared loaders in [src/sanity/lib/page-data.ts](src/sanity/lib/page-data.ts)** — one function per content type, called by both the public prerendered route and its `/preview` twin so the two can never drift. Loader rules:

- Fetch the single document **first** (related-content queries depend on its categories/slug), then `Promise.all` everything independent — never stack sequential awaits.
- **Related content is filtered in GROQ, never in JS over the whole collection.** Fetching all posts to render 3 related cards is the pattern that caused production `exceededCpu` 503s. Query the few cards you need (`slug.current != $slug && count(categories[@ in $categories]) > 0 | order(date desc) [0...N]`), with a small buffer over the card slot (`[0...4]` for a 2-card slot) when the template applies its own final filter (e.g. a has-image check).
- Return `null` for "not found" / "not publicly visible" and let the route decide the response.

**Adding a new content type with a detail route needs four pieces:**

1. **Public prerendered route** — `src/pages/<type>/[slug].astro` with `export const getStaticPaths = get<Type>StaticPaths;` (helper in `page-data.ts`; slug-only query, "not published" flags excluded).
2. **`/preview` SSR twin** — `src/pages/preview/<type>/[slug].astro` with `prerender = false`, same template, same loader.
3. **Shared loader** — `load<Type>Page()` in [src/sanity/lib/page-data.ts](src/sanity/lib/page-data.ts).
4. **Presentation location** — a `defineLocations` entry in [src/sanity/lib/resolve.ts](src/sanity/lib/resolve.ts) pointing at `/preview/<type>/<slug>`, followed by a Studio deploy.

The sitemap and llms endpoints pick the new route up automatically (prerendered routes enumerate from the route table; llms endpoints query Sanity directly).

---

## Per-page SEO & Structured Data

Most pages need nothing here — BaseLayout emits the baseline schema automatically.
Reach for this only when a page should advertise a specific **Service** (and
optionally an **FAQ**) to search engines, e.g. a marketing/service/landing page.

### Sitewide pieces — already wired, do not duplicate

- **LocalBusiness JSON-LD** lives in [src/layouts/BaseLayout.astro](src/layouts/BaseLayout.astro) as a single `ProfessionalService` node with `@id: ${SITE.url}/#localbusiness`. It renders on **every** page. Per-page `Service` schemas reference it via `provider.@id` — never redefine the LocalBusiness on a page.
- **`areaServed`** on the sitewide node comes from `SITE.areaServed` in [src/config/site.ts](src/config/site.ts). Add the cities/regions your business serves there (once) — it's independent of whether any per-page Service schema exists.
- **Baseline per page:** BaseLayout always renders `LocalBusiness + WebPage + BreadcrumbList`. Image/logo paths come from `SITE.ogImagePath` (`/images/og-image.png`) and `SITE.logoPath` (`/images/favicon.png`); [src/lib/jsonld.ts](src/lib/jsonld.ts) reuses the same `SITE.*` values for the blog/case-study/glossary templates.

### Adding a Service (+ optional FAQ) graph to a page

1. Build the graph with the `serviceFaqJsonLd()` helper in [src/lib/jsonld.ts](src/lib/jsonld.ts) — don't hand-write JSON or a raw `<script>` block:

   ```ts
   import { serviceFaqJsonLd } from "../lib/jsonld";
   import { SITE } from "../config/site";
   import { generalFaqs } from "../data/faqs";

   // Build the URL from SITE.url — never hardcode the host literal.
   const pageUrl = `${SITE.url}/your-page`;

   const schemaGraph = serviceFaqJsonLd({
     pageUrl,
     serviceType: "Web Design",
     name: "Your service name",
     description: "...",
     areaServed: [
       { type: "City", name: "Your City" },
       { type: "AdministrativeArea", name: "Your County" },
     ],
     audience: { audienceType: "..." }, // type defaults to "BusinessAudience"
     faqs: generalFaqs, // omit to skip the FAQPage node
   });
   ```

   The helper derives `provider.@id` from `SITE.url` so it **always** matches the
   sitewide LocalBusiness `@id`. Keep the per-page `areaServed` tight (the specific
   area this page targets) — the full list belongs on the sitewide node only.

2. **Pass it to BaseLayout** via the `schema` prop — BaseLayout renders it through `JsonLd.astro` (which escapes `<`) alongside the automatic baseline (LocalBusiness + WebPage + BreadcrumbList). No manual `<script type="application/ld+json">` tag:

   ```astro
   <BaseLayout title="..." canonical={pageUrl} schema={schemaGraph} />
   ```

3. **Register the page** in the `PAGES` array in [src/data/site-structure.ts](src/data/site-structure.ts) with the matching `group` (the single registry that feeds `/llms.txt`, `/llms-full.txt`, the nav, and the footer), then reference its `path` in `NAV_MENU`/`FOOTER_GROUPS` if it should appear there. See **LLM Discoverability** below.

4. **Per-page FAQs:** [src/data/faqs.ts](src/data/faqs.ts) ships one generic `generalFaqs` set; add more exports there (HTML is allowed in answers — `<a class="u-text-style-underline">` links, `<br><br>` breaks, `<strong>` bold) and pass the one you want as `faqs`.

### Validate

```bash
npm run dev               # in one terminal
npm run check:schema      # in another
```

[scripts/check-schema.mjs](scripts/check-schema.mjs) validates the JSON-LD on the
pages in its `STATIC_PAGES` array (currently `/` and `/contact`) plus one live
sample of each CMS content type. **Add any page that ships a custom `schema`** to
`STATIC_PAGES`. It catches:

- JSON parse errors
- Missing `@context` / `@type` / required fields
- Duplicate or malformed `@id` values
- Dangling `provider.@id` references (the load-bearing failure mode for the page→business linkage)
- Empty FAQ entries

What it doesn't catch: Google's rich-result eligibility rules. After deploy, paste each script into [Google's Rich Results Test](https://search.google.com/test/rich-results) (Test code tab) or point it at the live URL to confirm Google detects the LocalBusiness, Service, and FAQ rich results.

### Don'ts

- **Don't redefine the LocalBusiness node on a page.** It only lives in BaseLayout. Pages reference it via `provider.@id`.
- **Don't list every area in a per-page `Service.areaServed`.** That's the sitewide node's job; the page-level `Service` stays scoped to what that page targets.
- **Don't hardcode contact details.** They live in one place — `SITE` in [src/config/site.ts](src/config/site.ts) — and flow into the sitewide node.

---

## LLM Discoverability — `llms.txt` & `llms-full.txt`

The site serves two LLM-facing files at the root, following the [llmstxt.org](https://llmstxt.org) convention:

- **`/llms.txt`** — a concise, curated index: site summary + links (with one-line descriptions) to the important pages and every blog post, case study, and glossary term.
- **`/llms-full.txt`** — the full body text of every blog post, case study, and glossary term, rendered to Markdown for whole-site ingestion.

### How they stay current (no manual work for CMS content)

Both are **Astro endpoint routes that prerender to static files at build time** ([src/pages/llms.txt.ts](src/pages/llms.txt.ts), [src/pages/llms-full.txt.ts](src/pages/llms-full.txt.ts)). They re-run their Sanity queries on every build — the same lifecycle as the sitemap — so new/edited/deleted blog posts, case studies, and glossary terms flow through automatically on the next deploy. They reuse the existing queries in [src/sanity/lib/queries.ts](src/sanity/lib/queries.ts) and mirror the `comingSoon != true` rule used by the case-study `getStaticPaths` slug query, so unpublished case studies stay hidden. The full file uses `portableTextToMarkdown()` in [src/sanity/lib/portable-text.ts](src/sanity/lib/portable-text.ts) to render bodies.

The built files land in `dist/client/` alongside `sitemap-index.xml` and are served at the root by the Cloudflare Worker. They are intentionally **not** added to the XML sitemap.

### ⚠️ The one manual step — adding a new static page

Dynamic content is automatic; **static (non-Sanity) marketing pages are hand-curated** in the `PAGES` registry in [src/data/site-structure.ts](src/data/site-structure.ts) — the single source of truth that also drives the nav and footer. **Whenever you add a new static page** (a marketing page, a service under `src/pages/services/`, a location page, etc.), add one `PAGES` entry with the matching `group` so it appears in both llms files:

| New page type              | `group` value on the `PAGES` entry |
| -------------------------- | ---------------------------------- |
| Top-level marketing page   | `"main"`                           |
| Service (`/services/*`)    | `"service"`                        |
| Location (`/web-design-*`) | `"location"`                       |
| Collection index / landing | `"index"`                          |
| Legal / policy page        | `"optional"`                       |

Each entry is `{ path, title, desc, group }` (plus optional `navLabel` / `footerLabel` overrides) — `path` is the site-relative URL with no trailing slash, `title` is the page title with the ` | Your Company` suffix stripped, and `desc` is the page's meta description. The llms endpoints render each group via `pagesInGroup(group)`. Because nav and footer reference pages by path from this same registry, adding the page here once + referencing its path in `NAV_MENU`/`FOOTER_GROUPS` is all that's needed — one registry, never three separate lists. New **CMS** content needs nothing here.

To verify: `npm run dev`, then open `/llms.txt` and `/llms-full.txt` and confirm the new page appears.

---

## Anti-Patterns

Avoid these when writing CSS and HTML in this project:

- `display: grid` or `grid-template-columns` on `u-container` — layout must go on a child element
- Grid columns with bare `1fr` instead of `minmax(0, 1fr)` — includes `1fr 1fr`, `repeat(N, 1fr)`, or any form
- `@container` for simple display/direction/position/alignment switches — use responsive variables instead
- A CSS-variable "trigger/state" indirection for hover/active — style `:hover`, `.is-active`, `[aria-expanded]`, and `:has(:checked)` directly instead
- `false`/`off` before `true`/`on` in `color-mix()` or `calc()` expressions
- Unscoped combo classes — always scope to a custom class: `.card_wrap.is-featured { }` not `.is-featured { }`
- Hyphens between component name parts — use underscores: `hero_title` not `hero-title`
- Bare elements with only utility classes and no custom class
- `order` in responsive layouts when DOM order + `grid-column-start` works
- Hardcoded colors, border widths, or font sizes — use variables
- `font-size` below `1rem` on form inputs — triggers iOS auto-zoom
- `alt=""` (empty/blank alt) on any `<Image>`/`<img>`/`<Visual>` — every image needs descriptive alt text; crawlers flag empty alt as missing. Reuse the data's `imageAlt` field where one exists. Only third-party images we don't render (e.g. the HoneyBook pixel) are exempt
- Icon + Text in a flex row without `u-text-shrink` on the parent — `.u-text` has `min-width: 100%` which causes overflow; add `u-text-shrink` to the flex parent to fix
- Icons/logos without `flex-shrink: 0` next to text
- `width` + `height` for square icons — use `width` + `aspect-ratio: 1/1`
- `display: flex` on direct parents of text elements with margins — prevents margin collapsing
- `marginBottom={0}` on a `<Text>`/`<Heading>` that is the last child of a trimmed wrapper (Section container, Layout column, Layout, Col, `u-rich-text`, `u-margin-trim`) — margin-trim already zeroes it; the prop does nothing. Only use it (or add `u-margin-trim` to the wrapper) inside a custom `<div>` that isn't auto-trimmed
- Adding a positive `marginBottom` (or `u-margin-*`) to separate a direct child of a `<Section>`/`<Layout>`/`` from the next sibling — those containers have a built-in `gap`/`rowGap` that already spaces them (Section's `.u-container` defaults to `--space-8`). Change the container's `gap`/`rowGap` instead. (`<Layout variant="stack">` is the exception — a plain block that uses the text elements' own margins.)
- Adding `maxWidth` to `<Heading>` or `<Text>` by default — both already have built-in defaults (Heading `30ch`, Text `60ch`; `eyebrow` headings have none). Don't add the prop reflexively when building from a design, and never re-state the default value. Only set `maxWidth` when the design needs a _different_ constraint and you've been told (or it's clearly required) to change it
- Hard-coding per-theme card colors (a `[data-theme="dark"] .card …` branch, or force-applying `.u-theme-light`) for a contrasting card — mark it `data-theme-invert` instead (see **Theme invert** under Variables). Define the look once per theme in `themes.css`; the card adapts automatically
- Putting a contrasting card's `color` only on a child layer while the card's own wrapping class sets just `background` — the inner `.u-text` layers then inherit `color` from `.u-section[data-theme]` (white on a dark section) and the text goes invisible on a light card. Put `data-theme-invert` and `color: var(--text)` on the card's own wrapping class (the layer that contains all the text)
- `paddingTop="page-top"` on any section (heroes included) — `page-top` is **only** for a _fixed_ navbar, and this project's nav is **sticky** by default, so the first section doesn't need it. Build heroes/first sections with the normal default padding; only use `page-top` if the nav has been switched to `fixed`
- Adding `padding="large"` (or any padding override) to a section by default — `<Section>` defaults to `main`, which is correct for almost every section. Omit the prop entirely; `padding="main"` doesn't type-check (the union excludes it — see Section.props.ts). Only override to `large`/another value when a specific section genuinely needs it _and_ it's been asked for or is clearly required by a design — never as a habit
- Wrapping a `<Visual>` together with other content in a `—`'s `display: contents` makes `.u-image-wrapper` a direct grid/flex child with a definite height, so its `height: 100%` overrides the `ratio` aspect-ratio and the image balloons (worst on mobile when the column collapses to `display: flex`). Use `<Layout variant="stack">` (a real `height: auto` block) for any column that holds a `<Visual>` alongside other content; keep `` for self-sizing loose elements (Heading / Text / Button) only
- An `<a>` whose only accessible name is `aria-label` — a logo link wrapping an SVG, or an icon-only link (social/share). Crawlers see zero anchor text. Put the label in a visually-hidden child instead: `<span class="u-sr-only">{label}</span>` (SVG siblings get `aria-hidden="true"` so the name isn't announced twice). `<button>` elements are exempt — `aria-label` is correct there
- Making CMS content routes SSR (`prerender = false`) "so draft preview works" — draft preview lives on the `/preview/*` SSR twins; public content routes are prerendered with `getStaticPaths`. Serving content via SSR burns Worker CPU per request and caused real production `exceededCpu` 503s
- Fetching a whole collection in a detail route to render a few related cards, or stacking sequential `await`s on independent queries — filter related content in GROQ (`[0...N]` with a small buffer) and `Promise.all` independent fetches; see the shared loaders in `src/sanity/lib/page-data.ts`
- A `sitemap({ customPages })` list / `getSanityUrls()`-style helper — prerendered routes are enumerated automatically; customPages is only ever needed for SSR routes, and no content route here is SSR
- Adding `limits: { cpu_ms: N }` to `wrangler.jsonc` — Workers Paid only; on the Free plan the build stays green and the deploy silently fails (nothing ships). It's also unnecessary: the only SSR surface is `/api/*` and the editor-only `/preview` tree
