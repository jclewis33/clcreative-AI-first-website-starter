# Layout & Content Components

## BaseLayout (`src/layouts/BaseLayout.astro`)

Root layout for every page. Renders `<html>`, `<head>`, then SkipLink, Navbar,
`<main id="main-content" tabindex="-1">` (slot), and Footer as direct children
of `<body>` — no wrapper div; `body` itself is the flex-column page shell
(`display: flex; flex-direction: column; min-height: 100svh` in reset.css,
with `body > main { flex: 1 }` pushing the footer down, and `overflow-x: clip`
— the axis matters: the shorthand would propagate to both axes and freeze the
page; keep it `clip`, never `hidden`). The modal / mobile-nav scroll lock
belongs on `html` (`html:has(dialog.modal_dialog[open]) { overflow: hidden }`).

| Prop          | Type                           | Default      | Description                                                            |
| ------------- | ------------------------------ | ------------ | ---------------------------------------------------------------------- |
| `title`       | `string`                       | **required** | Page `<title>`                                                         |
| `description` | `string`                       | —            | Meta description                                                       |
| `canonical`   | `string`                       | —            | Canonical URL                                                          |
| `theme`       | `'light'`\|`'dark'`\|`'brand'` | `'light'`    | Sets `data-theme` on `<html>`; `<Section theme>` overrides per section |
| `schema`      | object                         | —            | Per-page JSON-LD graph (see the seo-discoverability skill)             |

**Slot:** default — page content inside `<main>`.

Change the site-wide default theme by editing the destructure default in
BaseLayout. The announcement banner is configured in the `BANNER` object in
`src/data/site-structure.ts` (sitewide `default` + per-page `overrides`;
`text: ""` disables everywhere; dismiss persists via
`sessionStorage('nav-banner-dismissed')`). BaseLayout resolves it per request
with `resolveBanner(Astro.url.pathname)` and passes it to Navbar.

## `<Section>`

Full-width page section: theming, fluid vertical padding, optional background
slot, constrained container. A section whose slots render nothing **emits
nothing at all** (content is captured once in frontmatter).

| Prop            | Type                                                               | Default           | Description                                                                  |
| --------------- | ------------------------------------------------------------------ | ----------------- | ---------------------------------------------------------------------------- |
| `theme`         | `'inherit'`\|`'light'`\|`'dark'`\|`'brand'`                        | —                 | Sets `data-theme`; cascades variables to children                            |
| `padding`       | `'none'`\|`'xsmall'`\|`'small'`\|`'main'`\|`'large'`\|`'page-top'` | `'main'`          | Equal top + bottom. **Leave it off** — `'main'` is right almost always       |
| `paddingTop`    | same                                                               | —                 | Top only. `'page-top'` is for a **fixed** nav — this project's nav is sticky |
| `paddingBottom` | same                                                               | —                 | Bottom only                                                                  |
| `minHeight`     | `boolean`                                                          | `false`           | `min-height: 100svh` — heroes                                                |
| `container`     | `'default'`\|`'narrow'`\|`'wide'`\|`'full'`                        | `'default'`       | Container max-width                                                          |
| `gap`           | `0`–`8`                                                            | `8` (`--space-8`) | Flex gap between the container's direct children — retune here, not margins  |
| `render`        | `boolean`                                                          | `true`            | `false` skips the section (empty slots already skip automatically)           |
| `id` / `class`  | `string`                                                           | —                 | Anchor id / extra classes                                                    |

**Slots:** `background` (absolute overlay, z-index 0 — images, videos,
gradients; a background alone still renders the section), default (content
inside `.u-container`).

Padding values: `none` 0 · `xsmall` ~1.25–2rem · `small` ~3–5rem · `main`
~4–7rem _(default — write no prop)_ · `large` ~5.5–10rem · `page-top`
~10–14rem _(fixed nav only)_. `padding="main"` is legal but redundant — the
emitted HTML is identical either way (Section drops `main` before emitting
`data-padding-*`). The padding union lives in Section.astro's frontmatter and
every section wrapper imports `PaddingSize` from there — never re-declare it.

**Overriding padding responsively:** padding lives directly on the
`<section>` via `data-padding-top/bottom` mapped in `:where()` rules (zero
specificity), so any single class can override it. Pass `padding="none"` and
drive it from a class:

```css
.split_section {
  padding-block: var(--section-space-xsmall);
}
@media (width < 55em) {
  .split_section {
    padding-block: var(--section-space-small);
  }
}
```

## `<Layout>`

The one component that arranges a section's content. Two-column CSS grid with
13 variants; the **default slot IS column 1** and Layout generates the column
wrapper itself. A second column takes `slot="column2"`. Two-column variants
collapse to a stack via container query.

| Prop            | Type                                                            | Default                  | Description                                                                  |
| --------------- | --------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------- |
| `variant`       | table below                                                     | `'columns'`              | Column proportion and behavior                                               |
| `verticalAlign` | `'start'`\|`'center'`\|`'end'`\|`'stretch'`                     | `'start'`                | Vertical alignment of columns                                                |
| `collapseAt`    | `'medium'`\|`'small'`                                           | `'medium'`               | Collapse breakpoint (~928px / ~560px container width)                        |
| `contentSpan`   | `1`–`11`                                                        | breakout: `7`, full: `6` | Content-side span for breakout/full — must pair with `bleedSpan` to total 13 |
| `bleedSpan`     | `1`–`11`                                                        | breakout: `6`, full: `7` | Bleed-side span (includes the gutter track to the viewport edge)             |
| `ratio`         | `string`                                                        | —                        | `"N-M"` custom column ratio (`"60-40"`, `"5-7"`) for columns/sticky/contain  |
| `rowGap`        | `0`–`8`                                                         | —                        | Row gap inside a column                                                      |
| `align`         | `'inherit'`\|`'center'`\|`'left'`\|`'right'`\|`'center-mobile'` | `'inherit'`              | Alignment for stack variants                                                 |
| `cardPadding`   | `string`                                                        | `--section-space-main`   | Vertical padding for the `card` variant                                      |
| `class`         | `string`                                                        | —                        | Extra classes                                                                |

Variants: `columns` (50/50) · `columns-reversed` · `stack` (single column,
plain block, **no gap** — text margins provide rhythm) · `stack-centered` ·
`sticky-left` · `contain` / `contain-reversed` (card layout: padded content +
clipped image, zero gap) · `breakout` / `breakout-reversed` (~60/40, image
bleeds to viewport edge) · `full` / `full-reversed` (50/50 bleed) · `card`
(centered card, col2 absolute background — CTA pattern) · `auto-width`.

**Filling the columns:**

| Placing                                            | Write it as                                              |
| -------------------------------------------------- | -------------------------------------------------------- |
| Anything in column 1                               | Straight inside `<Layout>` — default slot IS column 1    |
| One component in column 2                          | `slot="column2"` on it                                   |
| Several loose elements in column 2                 | `<Fragment slot="column2">…</Fragment>`                  |
| A ratio'd `<Visual>` + other content in one column | Wrap them in `<Layout variant="stack">` (see rule below) |

**Never wrap loose column children in a plain `div`** — it becomes the grid
child and collapses everything into one box. A wrapper that must exist for a
theme class gets `u-display-contents`. And never use a `u-display-contents`
div "for grouping" — it does nothing; check for CSS hooks before deleting one.

⚠️ **A column holding a `<Visual>` alongside other content needs
`<Layout variant="stack">`** around them: as a direct grid/flex item the
image wrapper can get a definite height when the layout collapses, and
`height: 100%` then beats the inline `aspect-ratio` (measured 1.66 vs a
declared 1.78). The stack is a real `height: auto` block that breaks that
chain. A `<Visual>` alone in its column, or `variant="background"`, is exempt.

```astro
<Layout variant="columns" verticalAlign="center">
  <Heading variant="eyebrow">Label</Heading>
  <Heading tag="h3" variant="h2">Title</Heading>
  <Text>Description text.</Text>
  <ButtonWrapper>
    <Button href="#" ariaLabel="CTA">Get started</Button>
  </ButtonWrapper>
  <Visual slot="column2" src={img} alt="Description" ratio="landscape" />
</Layout>

<!-- Card with background image (CTA pattern).
     The u-theme-dark wrapper is REQUIRED: a scrim is dark whatever section the
     card sits in, so the text needs an absolute theme, not a relative
     data-theme-invert (which would flip to dark text inside a dark section).
     u-display-contents keeps the wrapper out of the box tree — a plain div
     would become the card's single grid child. Card variant="cover" does NOT
     need this; it paints its own white text internally. -->
<Layout variant="card">
  <div class="u-display-contents u-theme-dark">
    <Heading tag="h2" variant="display-sm" accent
      >Ready to <strong>start</strong>?</Heading
    >
    <Text variant="large" align="center">Book a free strategy call.</Text>
    <ButtonWrapper
      ><Button href="/contact" ariaLabel="Book call">Book a Call</Button
      ></ButtonWrapper
    >
  </div>
</Layout>
<Fragment slot="column2">
  <Visual src={bgImage} alt="" variant="background" />
  <Overlay strength={75} />
</Fragment>
```

Stack variants already handle centering (`text-align` + `align-items` +
`--_text-inline-margin` + `--_buttons-justify`) — don't nest another Layout
for alignment, don't repeat `align="center"` on children.

## `<Grid>`

Responsive CSS grid via container-query column counts.

| Prop            | Type                     | Default     | Description                                     |
| --------------- | ------------------------ | ----------- | ----------------------------------------------- |
| `largeColumns`  | `1`–`6`                  | `3`         | Columns at default size                         |
| `mediumColumns` | `0`–`4`                  | `2`         | Columns at container ≤ 928px (`0` = inherit)    |
| `smallColumns`  | `0`–`2`                  | `1`         | Columns at container ≤ 560px                    |
| `xsmallColumns` | `0`–`1`                  | `0`         | Columns at container ≤ 320px                    |
| `rowGap`        | `0`–`8`                  | `6`         | Row gap (`--space-N`)                           |
| `variant`       | `'default'`\|`'autofit'` | `'default'` | Grid mode                                       |
| `minColWidth`   | `string`                 | —           | Min column width for `autofit` (e.g. `'16rem'`) |

## `<Heading>` and `<Text>`

Both render **one bare element** carrying `.u-text` + the type class — no
wrapper div. Semantic tag and visual style are decoupled.

**Heading props:** `tag` (`h1`–`h6`, default `h2`) · `variant`
(`display-xl/lg/md/sm`, `h1`–`h6`, `eyebrow` — omit for tag defaults) ·
`balance` (default `true`) · `accent` (makes `<strong>` use the accent color)
· `marginTop` (`0`|`'auto'`) · `marginBottom` (`0`–`8`) · `maxWidth` (with
units) · `class`.

**Text props:** `tag` (`p`|`span`|`div`|`label`|`figcaption`|`li`|`dt`|`dd`|
`caption`, default `p`) · `variant` (`tiny/small/regular/large/xlarge` +
heading/display tiers) · `weight` (`regular/medium/bold`) · `align` ·
`muted` · `balance` · `nowrap` · `clamp` (`1`–`6`, line clamp) · `marginTop` /
`marginBottom` · `maxWidth` · `class`.

Rules that bite:

- **Don't add `maxWidth` by default** — Heading has a built-in `30ch`
  (eyebrow none), Text `60ch`. Only pass it for a genuinely different
  constraint; never restate the default.
- **Display variants with restraint** — the default visual maximum for
  ordinary pages is `h1`; display tiers are for heroes/404-style moments.
- `marginBottom={0}` is redundant as the last child of any trimmed wrapper
  (Section container, Layout column, `u-rich-text`, `u-margin-trim`).
- Variant sizes: display-xl 3→6rem · display-lg 3→5rem · display-md 3→4.5rem
  · display-sm 2.75→4rem · h1 2.5→4rem · h2 2.25→3rem · h3 2→2.5rem · h4
  1.5→2rem · h5 1.25→1.5rem · h6 1.125→1.25rem · eyebrow 1.125rem fixed.

## `<Visual>`

Wraps `astro:assets` `<Image>` with the `u-image-wrapper`/`u-image` structure,
aspect ratio, radius, focal position, and a skeleton placeholder.

Key props: `src` (imported asset or URL — URL needs width/height), `alt`
(**required in practice — never empty**), `ratio` (`wide/widescreen/landscape/
square/portrait/tall` or custom string), `variant` (`default` |
`background` — absolute-fill, ratio unset, `loading="eager"` | `full` |
`contain`), `radius`, `position` (focal point), `priority` (eager +
`fetchpriority=high` for above-the-fold), `transparent` (bare keyword — drops
the skeleton for logos/PNGs), `loading`, `quality`, `class`.

## `<Overlay>`

Absolute-fill scrim over media — inside a Section `background` slot, a Layout
`card` col2, or a Card `visual` slot.

| Prop             | Type                    | Default   | Description                     |
| ---------------- | ----------------------- | --------- | ------------------------------- |
| `variant`        | `'solid'`\|`'gradient'` | `'solid'` | Even scrim vs vertical gradient |
| `strength`       | `0`–`100`               | `70`      | Darkness (solid)                |
| `strengthTop`    | `0`–`100`               | `0`       | Top edge darkness (gradient)    |
| `strengthMiddle` | `0`–`100`               | —         | Optional 50% stop (gradient)    |
| `strengthBottom` | `0`–`100`               | `70`      | Bottom edge darkness (gradient) |

## `<Button>`

Theme-aware button; hover/focus are plain CSS; adapts to `data-theme` on any
ancestor. The root element IS the `<a>` (with `href`) or `<button>` — it takes
focus, hover, and `...rest`; `.button_main_element` is the aria-hidden painted
surface.

| Prop        | Type                                 | Default     | Description                                                                                                              |
| ----------- | ------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| `variant`   | `'primary'`\|`'secondary'`\|`'text'` | `'primary'` | Filled, outlined, or text-link                                                                                           |
| `size`      | `'default'`\|`'small'`\|`'large'`    | `'default'` | Padding preset                                                                                                           |
| `href`      | `string`                             | —           | Renders `<a>`. Omit for a plain `<button>` (modal triggers, submits, JS actions) — no default destination                |
| `newTab`    | `boolean`                            | `false`     | Adds `rel="noopener noreferrer"` (link-only prop)                                                                        |
| `disabled`  | `boolean`                            | `false`     | Button-only prop                                                                                                         |
| `type`      | `'button'`\|`'submit'`\|`'reset'`    | `'button'`  | Button-only prop                                                                                                         |
| `ariaLabel` | `string`                             | —           | Only used for **icon-only** buttons — visible text is the accessible name otherwise (WCAG 2.5.3 dev warning on mismatch) |
| `square`    | `boolean`                            | `false`     | Removes pill radius                                                                                                      |

Props are a discriminated union on `href` — link-only props error without it.
**Slots:** default (label), `icon` (after label).

```astro
<Button href="/contact" ariaLabel="Contact us">Contact Us</Button>
<Button variant="text" href="/blog">Read more →</Button>
<Button type="submit">Send Message</Button>
<Button data-modal-trigger="contact-modal">Contact</Button>
```

## `<ButtonWrapper>`

The row buttons sit in: flex, wraps, spaces buttons, carries the standard
`margin-top` separating a button row from text above. Props: `marginTop`
(`'default'` | `0`–`8` | `'auto'` — auto pins to a card's floor), `render`,
`class`. **Alignment is inherited, never configured** — the row follows the
surrounding layout via `--_buttons-justify`; there is deliberately no align
prop.

## `<Card>`

Content card; `href` makes the whole surface a link via the title's stretched
anchor (no overlay element — real anchor text).

**Interaction model (automatic):** the card counts the actions
(`<a href>` / `<button>`) in its rendered **footer** slot:

| Footer actions | Result                                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| 0 or 1         | Whole card is the link; the lone button is a visual affordance and the footer is `inert` — ONE tab stop           |
| 2 or more      | Card surface is NOT a link (two destinations can't share a surface); buttons stay real. A dev warning explains it |

The `actions` prop (`'single'`|`'multiple'`) overrides the count when the
markup reads wrong (e.g. a decorative anchor). A CSS safety net also drops the
stretch whenever the footer really holds 2+ controls.

| Prop                  | Type                                       | Default     | Description                                 |
| --------------------- | ------------------------------------------ | ----------- | ------------------------------------------- |
| `variant`             | `'default'`\|`'stacked'`\|`'cover'`        | `'default'` | Image-top / text-only / image-fills         |
| `href`                | `string`                                   | —           | Whole-card link                             |
| `newTab`              | `boolean`                                  | `false`     | Link-only                                   |
| `ariaLabel`           | `string`                                   | —           | Card-link label (title text is anchor text) |
| `title`               | `string`                                   | —           | Convenience title (`u-text-style-h5`)       |
| `theme`               | `'light'`\|`'dark'`\|`'brand'`\|`'invert'` | —           | Whole-theme pin or relative flip            |
| `rowSpan` / `colSpan` | `1`–`4`                                    | —           | Grid spans                                  |
| `radius`              | `string`                                   | —           | Radius utility override                     |

**Slots:** `visual`, `title` (custom heading — use a `Heading` with its own
variant), default (body), `footer`.

## `<BlogCard>`

Blog card built on Card: image top, title + description clamped at 2 lines,
category label, whole surface clickable. Required props: `title`,
`description`, `category`, `href`, `image`, `imageAlt`; optional `author`,
`authorAvatar`, `date`. `...rest` passes through to Card. The `BlogPost`
interface in `src/pages/blog/index.astro` maps 1:1 to CMS fields.

## `<Icon>`

Inline SVG from `src/assets`, sized in `em` so it tracks the text beside it.
Props: `src` (an imported `.svg` — `SvgComponent`), `variant` (`small` 1em ·
`medium` 1.5em default · `large` 2em · `full-width`), `render`, `class`.
Decorative by default (`aria-hidden` auto unless `aria-label` passed).

```astro
import arrow from "@/assets/icons/arrow.svg";
<Icon src={arrow} variant="small" />
```

## `<Video>`

One bare `<video>` element with ratio presets and sane defaults.

| Prop                          | Type                                                                                 | Default  | Description                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------- |
| `src`                         | `string`                                                                             | —        | Required in practice — nothing renders without it                                |
| `poster`                      | `string`                                                                             | —        | Still frame before playback                                                      |
| `variant`                     | `'2-1'`\|`'16-9'`\|`'3-2'`\|`'5-4'`\|`'1-1'`\|`'4-5'`\|`'2-3'`\|`'custom'`\|`'auto'` | `'16-9'` | Aspect ratio preset; `custom` + `ratio`; `auto` follows the file (layout shifts) |
| `ratio`                       | `string`                                                                             | —        | Any CSS aspect-ratio (custom variant only)                                       |
| `loop` / `autoplay` / `muted` | `boolean`                                                                            | `true`   | Autoplay without muted is browser-blocked (dev warning)                          |
| `transparent`                 | `boolean` (bare keyword)                                                             | `false`  | Fit whole frame, drop the skeleton tint (cutouts)                                |

## `<FormattedDate>`

Renders a publish date as `<time>` — **never format a date by hand**
(`toLocaleDateString()` in a template gets the time zone wrong: Sanity
date-only strings parse as UTC midnight and render a day early west of
Greenwich, varying by build machine). Props: `date` (Date | string — renders
nothing if unparseable), `format` (`Intl.DateTimeFormatOptions`, default
`{ dateStyle: 'long' }`), `timeZone` (default `'UTC'` — pinned on purpose),
`locale` (default `SITE.locale`), `render`, `class`. A date-only value keeps
its exact string in the `datetime` attribute.

## `<PricingCard>` + `<PricingItem>`

Pricing tier card (no box-shadow baked in — add `u-box-shadow-*` yourself).
PricingCard props: `name` (req), `price` (req), `priceSuffix`, `priceLabel`,
`description`, `href`, `buttonText` (default `'Get started'`), `ariaLabel`,
`buttonVariant` (`primary`/`secondary`), `variant` (`default`/`compact`),
`featured` (accent border), `align`, `class`. Slots: `label` (badge beside
name), default (PricingItems), `footer`. PricingItem slots: `icon` (default
checkmark), default (text).
