# Interactive Components

## `<Accordion>` + `<AccordionItem>`

Expand/collapse list built on native `details`/`summary`. Single-open is the
platform's `details name` grouping — no click JS. Each `AccordionItem` renders
a bare `data-accordion-group` marker; the parent captures the rendered
children once and replaces every marker with a shared `name="accordion-N"`
(deterministic `uid()` from `@/lib/uid`). Open/close animates with
`interpolate-size: allow-keywords` + `::details-content` transitions —
Chromium today; other engines open instantly with identical behavior
(`details name` itself is Baseline 2024). The parent's script only forwards
`toggle`/`transitionend` to the `scrolltrigger:refresh` bus.

**Accordion props:**

| Prop                 | Type      | Default | Description                                                                                |
| -------------------- | --------- | ------- | ------------------------------------------------------------------------------------------ |
| `closePrevious`      | `boolean` | `true`  | Shared `name` — opening one closes the previous, natively                                  |
| `openByDefault`      | `number`  | `0`     | 1-based index to open on load; `0` = all closed                                            |
| `closeOnSecondClick` | `boolean` | `true`  | **Deprecated no-op** — native details always closes on re-click (dev warning when `false`) |

`openOnHover` no longer exists (a11y-hostile; had no call sites).

**AccordionItem props:** `question` (toggle text — or the `question` slot for
rich text), `open` (start expanded), `class`, plus any `details` attribute
(e.g. `data-fade-in`). Slots: `question`, default (answer).

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

Note: the Footer's "Locations Served" dropdown is deliberately **not** built
on these classes — it is a self-contained `footer_locations_*` disclosure
inside Footer.astro, so the two can evolve independently.

## `<Tab>` + `<TabButton>` + `<TabPanel>`

Tabbed interface — panel transitions and the autoplay progress line are pure
CSS (keyframes selected by `data-tab-transition`; progress paused via
`animation-play-state`), no animation library.

| Prop               | Type                                    | Default | Description                                                                                                                                                                  |
| ------------------ | --------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `variant`          | `'top'`\|`'side'`\|`'slider'`\|`'fade'` | `'top'` | top/fade: horizontal + fade · side: vertical pills in a 12-col grid · slider: slide transition + autoplay controls                                                           |
| `duration`         | `number`                                | `0.6`   | Panel transition seconds (drives the CSS keyframes)                                                                                                                          |
| `autoplayDuration` | `number`                                | `6`     | Autoplay interval seconds (slider only; `0` disables)                                                                                                                        |
| `pauseOnHover`     | `boolean`                               | `true`  | Hover **holds** the progress (resumes where it left off)                                                                                                                     |
| `loopControls`     | `boolean`                               | `true`  | Arrows and autoplay wrap around                                                                                                                                              |
| `activeTab`        | `number`                                | `1`     | 1-based initially active tab                                                                                                                                                 |
| `id`               | `string`                                | —       | Wrapper id; doubles as the deep-link query key                                                                                                                               |
| `deepLink`         | `boolean`                               | `false` | Mirror the active tab in the URL (`?<id>=<label-slug>`, `history.replaceState`). On arrival with a matching param: that tab activates, scrolls into view, autoplay stays off |

**Slots:** `heading` (above the button list), `buttons` (`TabButton`s),
default (`TabPanel`s — matched to buttons by DOM order).

Behavior notes: keyboard arrows (orientation-aware) + Home/End with roving
tabindex; autoplay is **held** (paused-in-place) while hovered, focused
inside, scrolled offscreen, or under `prefers-reduced-motion` — and
**stopped** by the play/pause button; panel changes dispatch
`scrolltrigger:refresh`; a `<noscript>` fallback shows all panels stacked.

## `<Modal>`

Native `<dialog>` modal with CSS enter/exit transitions (`@starting-style` +
`transition-behavior: allow-discrete`; scrim is native `::backdrop`; JS only
calls `showModal()`/`close()`, so Escape closes natively).

| Prop        | Type                                       | Default      | Description                                      |
| ----------- | ------------------------------------------ | ------------ | ------------------------------------------------ |
| `id`        | `string`                                   | **required** | Must match `data-modal-trigger` value            |
| `variant`   | `'small'`\|`'side-panel'`\|`'full-screen'` | `'small'`    | Centered ~800px / right slide-in / full viewport |
| `ariaLabel` | `string`                                   | —            | Label when no visible heading                    |

Open with `data-modal-trigger="modal-id"` on any button/link. **Slots:**
default (scrollable content), `close` (override the × button). Closes on
button, click-beside-panel, Escape. Reduced motion: near-instant (1ms, so
`display`/`overlay` still complete).

## `<Slider>` (Swiper) vs `<Carousel>` (scroll-snap)

**Carousel is the default for simple card rows** — native CSS scroll-snap +
a small script for drag/dots/arrows, zero dependencies. **Slider** wraps
Swiper v12 — reach for it when you need **loop, autoplay, mousewheel, or free
mode**.

### `<Carousel>`

| Prop       | Type                                     | Default      | Description                                     |
| ---------- | ---------------------------------------- | ------------ | ----------------------------------------------- |
| `variant`  | `'bleed'`\|`'crop-start'`\|`'contained'` | `'bleed'`    | Off both screen edges / flush start / contained |
| `slidesXs` | `number`                                 | `1.1`        | Slides in view below 35rem (fractional = peek)  |
| `slidesSm` | `number`                                 | `1.2`        | From 35rem                                      |
| `slidesMd` | `number`                                 | `2`          | From 50rem                                      |
| `slidesLg` | `number`                                 | `3`          | From 64rem                                      |
| `label`    | `string`                                 | `'Carousel'` | Accessible name of the slide group              |
| `render`   | `boolean`                                | `true`       | Empty slot already skips automatically          |

**Slot:** default — each direct child becomes one slide (no wrapper divs).
Slide widths are pure CSS (`--_visible` per tier); dots/arrows sync from
scroll position; mouse drag suppresses the click on release so card links
don't fire; reduced motion swaps smooth scrolling for instant jumps; touch,
trackpad and keyboard scrolling need no JS at all.

### `<Slider>`

Swiper v12, imported inside the component's script (core + Navigation,
Pagination, Mousewheel, FreeMode, Autoplay, A11y — A11y is deliberate, it
carries the aria-live announcements). Swiper's CSS ships via
`styles/vendor.css` — never import it from a script.

**Put slides straight into the default slot — children are auto-wrapped in
`.swiper-slide` divs at runtime** (already-wrapped children are left alone).

| Prop                                          | Type                                                               | Default          | Description                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------- |
| `variant`                                     | `'crop-left'`\|`'crop-right'`\|`'crop-both'`\|`'overflow-visible'` | `'crop-left'`    | Overflow clipping                                                                     |
| `slidesLg/Md/Sm/Xs`                           | `number`                                                           | `3/2/1.2/1.1`    | Slides per view per tier (35/50/64rem media queries)                                  |
| `speed`                                       | `number`                                                           | `600`            | Transition ms                                                                         |
| `freeMode`                                    | `boolean`                                                          | `false`          | Free drag, no snap                                                                    |
| `autoplay` / `autoplayDelay`                  | `boolean` / `number`                                               | `false`/`6000`   | Auto-advance                                                                          |
| `loop`                                        | `boolean`                                                          | `false`          | Infinite loop (slides are duplicated when too few; bullets hand-synced via realIndex) |
| `mousewheel`                                  | `boolean`                                                          | `true`           | Horizontal wheel scrolls                                                              |
| `slideToClicked`                              | `boolean`                                                          | `false`          | Click a slide to navigate                                                             |
| `showBullets` / `showArrows` / `showControls` | `boolean`                                                          | `true/true/true` | Controls row                                                                          |

**Slots:** default (slides), `controls` (replace the whole controls row).

`TestimonialShowcase` runs its own small Swiper init on purpose (its counter
and arrows live outside the slider box and need loop-mode `realIndex`) — the
reasoning is documented in that file; don't "fix" it into `<Slider>`.

## `<Marquee>`

Infinite horizontal ticker — pure CSS. Renders the slot twice (second copy
`aria-hidden` + `inert`) and animates the track by -50%. Props: `speed`
(seconds, default `20` — higher is slower), `direction` (`left`/`right`),
`pauseOnHover` (default `true`), `gap` (`0`–`8`, default `6`). Each child
takes the `marquee_item` class. Reduced motion: animation dropped, strip
becomes scrollable. Images inside default to `max-height: 2.5rem` +
`object-fit: contain`.

## `<ScrollReveal>`

Scroll-linked reveal: text blocks fade as you scroll while a sticky image
cross-fades to match. GSAP + ScrollTrigger (per-component import). Uses
`@media` (not `@container`) at exactly 768px to stay in sync with
`ScrollTrigger.matchMedia`. Props: `items` (required array of `{ image,
imageAlt, heading, text, eyebrow?, buttonHref?, buttonText?,
buttonAriaLabel? }`), `imageRatio` (default `'landscape'`), `imageRadius`
(default `'main'`), `ratio` (default `'5-7'`). No slots. Mobile: no
animation, images inline. Reduced motion: skipped entirely.

## `<Dropdown>`

Native `details`/`summary` menu. Opens/closes with no JS; one **delegated**
pair of document listeners adds Escape (focus returns to the control),
ArrowUp/Down roving focus over the panel's links/buttons, and click-outside.
Panel animates via `::details-content` (Chromium; instant elsewhere).

| Prop     | Type      | Default | Description                             |
| -------- | --------- | ------- | --------------------------------------- |
| `label`  | `string`  | —       | The control's text — required to render |
| `render` | `boolean` | `true`  | Empty slot already skips                |

**Slot:** default — panel content (links, buttons, anything; `u-list` works
well).

## `<SkipLink>`

First tab stop on every page (mounted once in BaseLayout, before Navbar):
visually parked above the viewport until keyboard focus, then slides in fixed
top-left. Props: `target` (default `'main-content'` — BaseLayout's `<main>`,
which carries `tabindex="-1"` so focus moves in every browser), `label`
(default `'Skip to main content'`), `render`.

## Navbar (`src/components/global/Navbar.astro`)

Fixed navigation with plain-CSS interactions, container-query responsive
(switches at 65em/1040px), optional announcement banner, dropdowns, mobile
hamburger.

| Prop         | Type                           | Default                  | Description                             |
| ------------ | ------------------------------ | ------------------------ | --------------------------------------- |
| `theme`      | `'light'`\|`'dark'`\|`'brand'` | —                        | Theme override on the nav               |
| `bannerText` | `string`                       | —                        | Announcement banner text (omit to hide) |
| `bannerHref` | `string`                       | —                        | Optional banner link                    |
| `bannerId`   | `string`                       | `'nav-banner-dismissed'` | sessionStorage key                      |

**Nav items** come from `NAV_MENU` in
[src/data/site-structure.ts](../../../../src/data/site-structure.ts) — the
single page registry that also drives the footer and llms.txt. Entries are
`{ path }` (simple link) or `{ label, children: [paths] }` (dropdown); labels
resolve from each page's `navLabel` → `title`. To add a nav link: add the page
to `PAGES` once, reference its path in `NAV_MENU`. The placeholder "Work" mega
menu stays inline in Navbar.astro behind `showMegaMenu`.

**Banner** is configured in the `BANNER` object there too — sitewide
`default` (+ `text: ""` hides everywhere) and per-page `overrides` (`null`
hides; an object replaces). BaseLayout resolves per request via
`resolveBanner()`. Dismiss persists via sessionStorage; a synchronous
`is:inline` script in `<head>` prevents flash on repeat visits.

**Pill vs full-width nav** — controlled entirely by variables in
[src/styles/variables/nav.css](../../../../src/styles/variables/nav.css):

| Variable                         | Pill (default)       | Full-width           |
| -------------------------------- | -------------------- | -------------------- |
| `--nav-spacing-outer-horizontal` | `var(--site-margin)` | `0px`                |
| `--nav-spacing-outer-vertical`   | `.75rem`             | `0px`                |
| `--nav-radius`                   | `var(--radius-main)` | `var(--radius-none)` |

Optionally change `--nav-background` in themes.css (pill uses
`--background-2`; full-width often uses `--background`). All nav sizing,
spacing, and banner height live in nav.css — edit there to restyle; markup,
menu JS and dropdowns live in Navbar.astro.
