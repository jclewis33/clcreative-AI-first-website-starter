/**
 * Layout's props contract, in a plain .ts module.
 *
 * These lived in Layout.astro's frontmatter until a hard-won discovery: large
 * inline frontmatter types are FRAGILE under astro-language-tools — an
 * innocuous JSDoc comment containing two braced JSX-like expressions silently
 * degraded call-site checking of the Props union to "accepts anything",
 * order-dependently, with zero diagnostics. Types in a real .ts module are
 * checked by plain TypeScript, deterministically, and the contract test in
 * src/lib/prop-contracts.test-d.ts pins the union rules so a regression here
 * turns into a hard error instead of silently vanishing enforcement.
 */
import type { HTMLAttributes } from "astro/types";

export type LayoutVariant =
  /** Equal 50/50 columns */
  | "columns"
  /** Equal 50/50 — column order reversed on desktop */
  | "columns-reversed"
  /** Single column, left-aligned */
  | "stack"
  /** Single column, horizontally centered */
  | "stack-centered"
  /** 50/50 — left column sticky, auto-clears fixed nav. Customize gap with `stickyOffset`. */
  | "sticky-left"
  /** Card layout: content left, image right (background, radius, overflow clip, zero gap) */
  | "contain"
  /** Card layout: image left, content right (background, radius, overflow clip, zero gap) */
  | "contain-reversed"
  /** ~60/40 — right column (image) bleeds to viewport edge via named-line grid */
  | "breakout"
  /** ~40/60 — left column (image) bleeds to viewport edge via named-line grid */
  | "breakout-reversed"
  /** 50/50 — right column bleeds to viewport edge via named-line grid */
  | "full"
  /** 50/50 — left column bleeds to viewport edge via named-line grid */
  | "full-reversed"
  /** Centered card — col1 content centered with padding, col2 positioned as background (rounded, clipped) */
  | "card"
  /** auto/auto — both columns size to their content */
  | "auto-width";

export type VerticalAlign =
  /** Top-align columns (flex-start) */
  | "start"
  /** Center columns vertically */
  | "center"
  /** Bottom-align columns (flex-end) */
  | "end"
  /** Stretch columns to equal height */
  | "stretch";

/** Spacing-scale step (`--space-N`) for the gap props. `0` = no gap. */
export type GapScale = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type CollapseBreakpoint =
  /** Collapse to single column at 928px / 58em container width (default) */
  | "medium"
  /** Collapse to single column at 560px / 35em container width */
  | "small";

export type BreakoutColumns = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

/**
 * Layout — two-column CSS Grid with 13 named variants.
 *
 * All two-column variants collapse to a single stacked column
 * when the nearest `.u-container` is narrower than 58em (928px).
 *
 * **Props:**
 * - `variant` — column layout style: columns, columns-reversed, stack, stack-centered, sticky-left, contain, contain-reversed, breakout, breakout-reversed, full, full-reversed, card, auto-width (default: `'columns'`)
 * - `verticalAlign` — vertical alignment of columns: start, center, end, stretch (default: `'start'`)
 * - `collapseAt` — breakpoint to stack columns: `'medium'` (928px) or `'small'` (560px) (default: `'medium'`)
 * - `contentSpan` — content-side column span 1–11 for breakout/full variants (default: breakout `7`, full `6`)
 * - `bleedSpan` — bleed-side column span 1–11 for breakout/full variants (default: breakout `6`, full `7`)
 * - `ratio` — custom column ratio as `"N-M"` for two-column variants (e.g. `"5-7"`, `"60-40"`)
 * - `columnGap` — horizontal gap between col1 and col2 (default: `--site-gutter`, fluid 1-2rem)
 * - `rowGap` — vertical gap between rows when stacked (default: `--space-8`, fluid 40-64px)
 * - `cardPadding` — vertical padding for `card` variant (default: `--section-space-main`, fluid 4-7rem)
 * - `class` — extra utility classes on the wrapper
 *
 * **Slots:** `col1` (left), `col2` (right) for two-column variants; default slot for stack variants.
 */
export interface BaseProps extends HTMLAttributes<"div"> {
  /**
   * **Layout props:**
   * - `variant` — columns, columns-reversed, stack, stack-centered, sticky-left, contain, contain-reversed, breakout, breakout-reversed, full, full-reversed, card, auto-width
   * - `verticalAlign` — start, center, end, stretch (default 'start')
   * - `collapseAt` — breakpoint at which two columns stack: medium (800px) or small (560px) (default 'medium')
   * - `contentSpan` — 1-11 content-side span for breakout/full
   * - `bleedSpan` — 1-11 bleed-side span for breakout/full
   * - `ratio` — custom column ratio "N-M" (e.g. "5-7", "60-40")
   * - `columnGap` — horizontal gap between col1 and col2. Number = `--space-N` scale (0–8), or any CSS length string (default: `--site-gutter`, fluid 1-2rem).
   * - `rowGap` — vertical gap between rows when stacked. Number = `--space-N` scale (0–8), or any CSS length string (default: `--space-8`, fluid 40-64px).
   * - `stickyOffset` — gap between nav bottom and sticky column (default: `--space-3`). Only applies to `sticky-left`. Any CSS length value.
   * - `cardPadding` — vertical padding for `card` variant (default: `--section-space-main`, fluid 4-7rem). Any CSS length value.
   * - `class` — extra classes
   * - Also accepts any HTML attribute (`style`, `data-*`, `aria-*`, etc.) — forwarded to root element
   *
   * **Slots:** `col1` (left), `col2` (right). A single component (Visual, Grid, Card) takes `slot` directly; wrap MULTIPLE loose elements in the `` component (`…`) — the standard wrapper that bakes in `u-display-contents`. EXCEPTION: a column holding a `<Visual>` alongside other content must use `<Layout variant="stack">`, not `` (`'s `display: contents` lets the image's `height: 100%` override its `ratio` aspect-ratio and balloon).
   */
  docs?: string;

  /**
   * Set to `false` to skip rendering this component and its children.
   *
   * Lets a caller express "only if there is something to show" as data rather
   * than markup — e.g. `render` set to `posts.length > 0` — instead of
   * wrapping the element in a conditional block. Nothing is emitted when
   * false, so no
   * empty wrapper is left behind.
   *
   * @default true
   */
  render?: boolean;

  /**
   * Column layout style.
   *
   * | Value                | Columns        | Notes                                           |
   * |----------------------|----------------|-------------------------------------------------|
   * | `columns`            | 50 / 50        | Equal halves (or custom `ratio`)                |
   * | `columns-reversed`   | 50 / 50        | col2 appears left on desktop                    |
   * | `stack`              | single         | Left-aligned — use default slot                 |
   * | `stack-centered`     | single         | Centered — use default slot                     |
   * | `sticky-left`        | 50 / 50        | Left column sticky, auto-clears nav             |
   * | `contain`            | 50 / 50        | Card: content left, image right (bg + radius)   |
   * | `contain-reversed`   | 50 / 50        | Card: image left, content right (bg + radius)   |
   * | `breakout`           | ~60 / 40       | Right col bleeds to viewport edge               |
   * | `breakout-reversed`  | ~40 / 60       | Left col bleeds to viewport edge                |
   * | `full`               | 50 / 50        | Right col bleeds to viewport edge               |
   * | `full-reversed`      | 50 / 50        | Left col bleeds to viewport edge                |
   * | `card`               | 1fr            | Centered card; col2 is absolute background      |
   * | `auto-width`         | auto / auto    | Columns size to content, row fills the section  |
   *
   * @default 'columns'
   * @example variant="contain"
   */
  variant?: LayoutVariant;

  /**
   * Text alignment for column 1. Absorbed from the old ContentWrapper.
   * `stack-centered` already centers, so this is for the other variants.
   * @default 'inherit'
   */
  align?: "inherit" | "center" | "left" | "right" | "center-mobile";

  /**
   * Optional measure on column 1 — a max-width for readable line length.
   * @example maxWidth="48rem"
   */
  maxWidth?: string;

  /**
   * Vertical alignment of columns relative to each other.
   * - `start`   — top-align (default)
   * - `center`  — vertically center
   * - `end`     — bottom-align
   * - `stretch` — equal height columns
   *
   * @default 'start'
   * @example verticalAlign="center"
   */
  verticalAlign?: VerticalAlign;

  /**
   * Container-width breakpoint at which two-column layouts collapse
   * to a single stacked column.
   *
   * - `'medium'` — collapse at 928px (58em) *(default)*
   * - `'small'`  — collapse at 560px (35em) — keeps columns on tablets
   *
   * Uses the responsive flag system (`--flex-medium` / `--flex-small`)
   * from `responsive-columns.css`.
   *
   * No effect on `stack` / `stack-centered` variants (always single column).
   *
   * @default 'medium'
   * @example collapseAt="small"
   */
  collapseAt?: CollapseBreakpoint;

  /**
   * Custom column ratio for two-column variants.
   *
   * **Format: `"N-M"` (dash-separated).** Do NOT use slashes (`"40/60"`)
   * or other separators — only a dash is parsed.
   *
   * Numbers become `fr` units — `"60-40"` and `"3-2"` give the same split.
   *
   * Works with: `columns`, `columns-reversed`, `sticky-left`,
   * `contain`, `contain-reversed`.
   *
   * @default undefined (50/50)
   * @example ratio="5-7"   // col1 ~42%, col2 ~58%
   * @example ratio="4-8"   // col1 ~33%, col2 ~67%
   * @example ratio="60-40" // col1 60%, col2 40%
   */
  ratio?: string;

  /**
   * Horizontal gap between col1 and col2.
   *
   * Pass a number for the fluid gap scale (`0`–`8`, maps to `--space-N`),
   * or any CSS length string for full control.
   *
   * Defaults to `--site-gutter` (fluid 1rem to 2rem). Override when
   * you need tighter or wider spacing between the two columns.
   *
   * The numeric scale maps to these fluid sizes:
   *
   * | Number | Variable     | Size          |
   * |--------|--------------|---------------|
   * | `1`    | `--gap-1`    | 6 - 8px       |
   * | `2`    | `--gap-2`    | 10 - 12px     |
   * | `3`    | `--gap-3`    | 14 - 16px     |
   * | `4`    | `--gap-4`    | 20 - 24px     |
   * | `5`    | `--gap-5`    | 28 - 32px     |
   * | `6`    | `--gap-6`    | 32 - 40px     |
   * | `7`    | `--gap-7`    | 36 - 48px     |
   * | `8`    | `--gap-8`    | 40 - 64px     |
   *
   * @default 'var(--site-gutter)' (fluid 1-2rem)
   * @example columnGap={6}
   * @example columnGap="var(--gap-8)"
   * @example columnGap="0px"
   * @example columnGap="3rem"
   */
  columnGap?: GapScale | string;

  /**
   * Vertical gap between rows when the layout stacks (collapsed) or
   * between col1 and col2 content in single-column variants.
   *
   * Pass a number for the fluid space scale (`0`–`8`, maps to `--space-N`),
   * or any CSS length string for full control.
   *
   * Defaults to `--space-8` (fluid 40–64px). Override when you need
   * tighter or wider vertical spacing between stacked rows.
   *
   * The numeric scale maps to these fluid sizes:
   *
   * | Number | Variable     | Size          |
   * |--------|--------------|---------------|
   * | `1`    | `--space-1`  | 6 - 8px       |
   * | `2`    | `--space-2`  | 10 - 12px     |
   * | `3`    | `--space-3`  | 14 - 16px     |
   * | `4`    | `--space-4`  | 20 - 24px     |
   * | `5`    | `--space-5`  | 28 - 32px     |
   * | `6`    | `--space-6`  | 32 - 40px     |
   * | `7`    | `--space-7`  | 36 - 48px     |
   * | `8`    | `--space-8`  | 40 - 64px     |
   *
   * @default 'var(--space-8)' (fluid 40-64px)
   * @example rowGap={4}
   * @example rowGap="var(--space-6)"
   * @example rowGap="0px"
   * @example rowGap="2rem"
   */
  rowGap?: GapScale | string;

  /**
   * Extra utility classes on the outer `.u-layout-wrapper` element.
   * @example class="u-margin-top-8"
   */
  class?: string;
}

/* Props are a DISCRIMINATED UNION on `variant`. The JSDoc above always SAID
   "only applies to sticky-left" / "for breakout/full variants" — now the types
   enforce it, so passing a prop to a variant that ignores it is an editor
   error instead of silently dead markup:

     <Layout variant="columns" stickyOffset="2rem">   ❌
     <Layout cardPadding="4rem">                      ❌ (default is columns)
     <Layout variant="card" cardPadding="4rem">       ✅

   This is the same pattern as Button (href branches) and Card (link-only
   props) — design rules encoded where the editor shows them. */
export type Props = BaseProps &
  (
    | {
        variant?:
          | "columns"
          | "columns-reversed"
          | "stack"
          | "stack-centered"
          | "contain"
          | "contain-reversed"
          | "auto-width";
        contentSpan?: never;
        bleedSpan?: never;
        stickyOffset?: never;
        cardPadding?: never;
      }
    | ({
        variant: "breakout" | "breakout-reversed" | "full" | "full-reversed";
        stickyOffset?: never;
        cardPadding?: never;
      } & {
        /**
         * Content-side column span (1–11) for breakout/full variants.
         * Stays within the container. Must pair with `bleedSpan` to total 13.
         *
         * - breakout default: `7` (~58 %)
         * - full default: `6` (50 %)
         *
         * @default breakout: 7, full: 6
         * @example contentSpan={5} bleedSpan={8}
         */
        contentSpan?: BreakoutColumns;
        /**
         * Bleed-side column span (1–11) for breakout/full variants.
         * Extends to the viewport edge. Must pair with `contentSpan` to total 13.
         *
         * - breakout default: `6`
         * - full default: `7`
         *
         * @default breakout: 6, full: 7
         * @example contentSpan={5} bleedSpan={8}
         */
        bleedSpan?: BreakoutColumns;
      })
    | ({
        variant: "sticky-left";
        contentSpan?: never;
        bleedSpan?: never;
        cardPadding?: never;
      } & {
        /**
         * Gap between the bottom of the fixed nav and the sticky column.
         * Only applies to `variant="sticky-left"`.
         *
         * The sticky column automatically clears the fixed navbar (including
         * banner if present) using `--nav-height-total`. This prop controls
         * the extra breathing room below the nav.
         *
         * Accepts any CSS length value, gap variables (`--gap-1` to `--gap-8`),
         * or spacing variables (`--space-1` to `--space-8`).
         *
         * @default 'var(--space-3)' (approx 16px)
         * @example stickyOffset="var(--gap-4)"
         * @example stickyOffset="var(--space-6)"
         * @example stickyOffset="2rem"
         * @example stickyOffset="0px"
         */
        stickyOffset?: string;
      })
    | ({
        variant: "card";
        contentSpan?: never;
        bleedSpan?: never;
        stickyOffset?: never;
      } & {
        /**
         * Vertical padding for the `card` variant's content column.
         * Only applies to `variant="card"`.
         *
         * Defaults to `--section-space-main` (fluid 4rem → 7rem).
         * Override to adjust the card's inner height.
         *
         * Use section-space variables for consistent spacing:
         *
         * | Variable                  | Size           |
         * |---------------------------|----------------|
         * | `--section-space-small`   | 3rem → 5rem    |
         * | `--section-space-main`    | 4rem → 7rem    |
         * | `--section-space-large`   | 5.5rem → 10rem |
         *
         * @default 'var(--section-space-main)' (fluid 4-7rem)
         * @example cardPadding="var(--section-space-large)"
         * @example cardPadding="var(--section-space-small)"
         * @example cardPadding="6rem"
         */
        cardPadding?: string;
      })
  );

/* Flat shape for the implementation — inside the component TypeScript cannot
   know which union branch applies. */
export type AllProps = BaseProps & {
  variant?: LayoutVariant;
  contentSpan?: BreakoutColumns;
  bleedSpan?: BreakoutColumns;
  stickyOffset?: string;
  cardPadding?: string;
};
