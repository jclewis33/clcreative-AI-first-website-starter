/**
 * Section's props contract, in a plain .ts module.
 *
 * Two reasons this is not in Section.astro's frontmatter:
 *
 * 1. Same fragility story as the other .props.ts files: large inline
 *    frontmatter types are unreliable under astro-language-tools (an innocuous
 *    JSDoc comment silently degraded call-site checking, order-dependently).
 *    Types in a real .ts module are checked by plain TypeScript, and
 *    src/lib/prop-contracts.test-d.ts pins the rules below.
 *
 * 2. Padding is a HOUSE RULE, and this module is its single source. Every
 *    section-wrapper component (TestimonialsSlider, BlogPostGrid, …) imports
 *    its padding type from here instead of re-declaring the union — the old
 *    copies had already drifted (none of them knew about `xsmall`).
 */
import type { HTMLAttributes } from "astro/types";

export type SectionTheme =
  /** Inherit the current page / parent theme — no data-theme rendered, section stays transparent */
  "inherit" | "light" | "dark" | "brand";

/**
 * Every padding size the CSS understands (`--section-space-*` in
 * variables/spacing.css). `'main'` exists here because the CSS has it — but
 * props deliberately use {@link PaddingOverride}, which excludes it.
 */
export type PaddingSize =
  /** No vertical padding */
  | "none"
  /** Extra small — 1.25–2rem fluid */
  | "xsmall"
  /** Small — 3–5rem fluid */
  | "small"
  /** Main — 4–7rem fluid. THE DEFAULT — never written, only omitted. */
  | "main"
  /** Large — 5.5–10rem fluid */
  | "large"
  /** Page top — 10–14rem fluid; fixed-navbar layouts only (rare). Not needed for this project's sticky nav. */
  | "page-top";

/**
 * The padding values a caller may WRITE. `'main'` is excluded on purpose:
 * it is the default, so the only way to get it is to omit the prop — writing
 * `padding="main"` is a type error, not a style-review comment. The rendered
 * attribute is likewise omitted at the default, so `data-padding-top="main"`
 * never appears in HTML.
 *
 * Every combination stays expressible without `'main'`:
 * - top X, bottom main  → `paddingTop="X"` alone
 * - top main, bottom X  → `paddingBottom="X"` alone
 * - both X              → `padding="X"`
 */
export type PaddingOverride = Exclude<PaddingSize, "main">;

export type ContainerSize =
  /** Standard container — max 90rem / 1440px */
  | "default"
  /** Narrow container — max 48rem / 768px (good for prose) */
  | "narrow"
  /** Wide container — max 120rem / 1920px */
  | "wide"
  /** Full-width — no max-width constraint */
  | "full";

/**
 * Section — full-width page section with theming, fluid padding,
 * optional background slot, and a constrained container.
 *
 * **Props:**
 * - `theme` — color theme: inherit, light, dark, brand
 * - `padding` — vertical padding override: none, xsmall, small, large, page-top.
 *   The default is `'main'` and it is NOT a legal value — omit the prop to get it.
 * - `paddingTop` — override top padding only (`'page-top'` is fixed-navbar only — not this project)
 * - `paddingBottom` — override bottom padding only
 * - `minHeight` — full viewport height `min-height: 100svh` (default: `false`)
 * - `container` — container max-width: default, narrow, wide, full (default: `'default'`)
 * - `gap` — flex gap between the container's direct children, `0`–`8` (default: `--space-8`)
 * - `id` — HTML id for same-page anchor links
 * - `class` — extra classes on `<section>`
 *
 * **Slots:** `background` (absolute overlay for images/videos), default (content inside container).
 * A section whose slots render nothing renders nothing itself — no empty shell.
 */
export interface Props extends HTMLAttributes<"section"> {
  /**
   * **Section props:**
   * - `theme` — inherit, light, dark, brand (cascades to children)
   * - `padding` — sets both top + bottom. The default is `'main'` — omit the
   *   prop for it (writing `"main"` is a type error). Override per-side with
   *   paddingTop / paddingBottom.
   * - `paddingTop` — override top only ('page-top' is fixed-navbar only — not needed for this project's sticky nav)
   * - `paddingBottom` — override bottom only
   * - `minHeight` — 100svh for hero sections
   * - `container` — default, narrow, wide, full
   * - `gap` — 0–8, container flex gap (default: 8 / `--space-8`). Spaces direct children automatically — retune here, don't add `marginBottom` between siblings.
   * - `id` — anchor link target
   * - `class` — extra classes
   * - Also accepts any HTML attribute (`style`, `data-*`, `aria-*`, etc.) — forwarded to `<section>`
   *
   * **Padding options (fluid values scale with viewport):**
   * | Value        | Height                    | Use case                           |
   * |--------------|---------------------------|------------------------------------|
   * | *(omitted)*  | 4rem → 7rem (64–112px)    | `'main'` — the default, never written |
   * | `'none'`     | 0px                       | No spacing (flush sections)        |
   * | `'xsmall'`   | 1.25rem → 2rem (20–32px)  | Tight sub-sections (case studies)  |
   * | `'small'`    | 3rem → 5rem (48–80px)     | Tight sections, sub-sections       |
   * | `'large'`    | 5.5rem → 10rem (88–160px) | Generous breathing room            |
   * | `'page-top'` | 10rem → 14rem (160–224px) | Fixed-navbar layouts only (rare)   |
   *
   * **Slots:** `background` (absolute overlay for images/videos), default (container content)
   */
  docs?: string;

  /**
   * Set to `false` to skip rendering this component and its children.
   *
   * Lets a caller express "only if there is something to show" as data rather
   * than markup — e.g. `render` set to `posts.length > 0` — instead of
   * wrapping the element in a conditional block. Nothing is emitted when
   * false, so no empty wrapper is left behind.
   *
   * Independently of this prop, a section whose slots render nothing (empty
   * map over CMS data, comment-only slot) also renders nothing.
   *
   * @default true
   */
  render?: boolean;

  /**
   * Color theme — cascades CSS variables to all children.
   * - `inherit` — transparent, inherits parent theme (same as omitting)
   * - `light`   — light background, dark text
   * - `dark`    — dark background, light text
   * - `brand`   — brand-colored background
   *
   * @example theme="dark"
   */
  theme?: SectionTheme;

  /**
   * Vertical padding (top + bottom). The default is `'main'` (4–7rem fluid) —
   * omit the prop for it; `"main"` is not a legal value. Override per-side
   * with `paddingTop` / `paddingBottom`.
   *
   * | Value        | Height                    | Use case                           |
   * |--------------|---------------------------|------------------------------------|
   * | `'none'`     | 0px                       | No spacing (flush sections)        |
   * | `'xsmall'`   | 1.25rem → 2rem (20–32px)  | Tight sub-sections                 |
   * | `'small'`    | 3rem → 5rem (48–80px)     | Tight sections, sub-sections       |
   * | `'large'`    | 5.5rem → 10rem (88–160px) | Generous breathing room            |
   * | `'page-top'` | 10rem → 14rem (160–224px) | Fixed-navbar layouts only (rare)   |
   *
   * @example padding="small"
   */
  padding?: PaddingOverride;

  /**
   * Override top padding only. Same values as `padding`; the other side keeps
   * the `'main'` default.
   *
   * @example paddingTop="none"
   */
  paddingTop?: PaddingOverride;

  /**
   * Override bottom padding only. Same values as `padding`; the other side
   * keeps the `'main'` default.
   *
   * @example paddingBottom="none"
   */
  paddingBottom?: PaddingOverride;

  /**
   * Full viewport height (`min-height: 100svh`). Use for hero sections.
   * @default false
   * @example minHeight
   */
  minHeight?: boolean;

  /**
   * Container max-width.
   * - `default` — 90 rem / 1440 px
   * - `narrow`  — 48 rem / 768 px (prose)
   * - `wide`    — 120 rem / 1920 px
   * - `full`    — no constraint
   *
   * @default 'default'
   * @example container="narrow"
   */
  container?: ContainerSize;

  /**
   * Gap between child elements in the container (uses `--space-N` scale).
   * Overrides the default `--space-8` gap on the container flex layout.
   *
   * | Value | Size               |
   * |-------|--------------------|
   * | `0`   | 0px                |
   * | `1`   | ~6–8px fluid       |
   * | `2`   | ~8–12px fluid      |
   * | `3`   | ~12–16px fluid     |
   * | `4`   | ~16–24px fluid     |
   * | `5`   | ~20–32px fluid     |
   * | `6`   | ~24–40px fluid     |
   * | `7`   | ~32–48px fluid     |
   * | `8`   | ~40–64px fluid     |
   *
   * @example gap={4}
   */
  gap?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
}
