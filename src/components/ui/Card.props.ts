/**
 * Card's props contract, in a plain .ts module.
 *
 * These lived in Card.astro's frontmatter until a hard-won discovery: large
 * inline frontmatter types are FRAGILE under astro-language-tools — an
 * innocuous JSDoc comment containing two braced JSX-like expressions silently
 * degraded call-site checking of the Props union to "accepts anything",
 * order-dependently, with zero diagnostics. Types in a real .ts module are
 * checked by plain TypeScript, deterministically, and the contract test in
 * src/lib/prop-contracts.test-d.ts pins the union rules so a regression here
 * turns into a hard error instead of silently vanishing enforcement.
 */
import type { HTMLAttributes } from "astro/types";

export type CardVariant =
  /** Standard card — visual on top, content below */
  | "default"
  /** Text-only card — no visual slot (image hidden) */
  | "stacked"
  /** Cover card — visual fills card, content overlays at bottom */
  | "cover";

export type GridRowSpan = 1 | 2 | 3 | 4;
export type GridColumnSpan = 1 | 2 | 3 | 4;

/**
 * Card — content card with optional image, clickable overlay, and 3 layout variants.
 *
 * **Props:**
 * - `variant` — card layout: default (image top), stacked (text only), cover (image fills, content overlays) (default: `'default'`)
 * - `href` — makes the entire card a clickable link
 * - `newTab` — open link in new tab (default: `false`)
 * - `ariaLabel` — accessible label for clickable overlay (required when `href` is set)
 * - `title` — convenience title rendered as h4 (or use `title` slot for custom heading)
 * - `rowSpan` — span multiple grid rows, 1–4
 * - `colSpan` — span multiple grid columns, 1–4
 * - `radius` — border-radius utility class override
 * - `class` — extra classes on the outer wrapper
 *
 * **Slots:** `visual` (image/media), `title` (custom heading), default (body), `footer`.
 */
import { slotContent } from "@/lib/slots";

export interface BaseProps {
  /**
   * **Card props:**
   * - `variant` — default (image top), stacked (text only), cover (image fills)
   * - `href` — makes entire card clickable
   * - `newTab` — open link in new tab
   * - `ariaLabel` — accessible label for clickable overlay
   * - `title` — convenience h4 title (uses `u-text-style-h5` by default)
   * - To override the title style, use the `title` slot with a custom Heading instead of the `title` prop
   * - `rowSpan` — 1-4 grid row span
   * - `colSpan` — 1-4 grid column span
   * - `radius` — border-radius override
   * - `class` — extra classes
   * - Also accepts any HTML attribute (`style`, `data-*`, `aria-*`, etc.) — forwarded to root element
   *
   * **Slots:** `visual` (image), `title` (custom heading), default (body), `footer`
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
   * Card layout variant.
   * - `default`  — image on top (16/9), content below
   * - `stacked`  — text only, visual slot hidden
   * - `cover`    — image fills card (2/3 portrait), content overlays at bottom
   *
   * @default 'default'
   * @example variant="cover"
   */
  variant?: CardVariant;

  /**
   * Force a color theme on this card instead of letting it adapt.
   *
   * By default a card is a contrast island: it carries `data-theme-contrast`,
   * so it takes the light theme inside a dark section and inherits the section
   * tokens otherwise (see themes.css). That covers the common cases.
   *
   * Set this to pin a card to one theme regardless of its section — the same
   * `data-theme` values a `<Section>` accepts. It applies a WHOLE token set, so
   * the card's text, borders, buttons and links all follow it.
   *
   * @example theme="dark"
   */
  theme?: "light" | "dark" | "brand";

  /**
   * Convenience title — renders as plain text styled with `u-text-style-h5`.
   *
   * To use a different heading size, use the `title` slot instead with
   * a Heading component — the slot wrapper applies no typography utility,
   * so the Heading's `variant` prop controls the style entirely.
   *
   * @example title="Project Name"
   * @example Using the title slot for a custom variant:
   * ```astro
   * <Card>
   *   <Heading slot="title" tag="h3" variant="h6" marginBottom={0}>Custom Title</Heading>
   * </Card>
   * ```
   */
  title?: string;

  /**
   * Span multiple rows in a Grid. Values: 1–4.
   * @example rowSpan={2}
   */
  rowSpan?: GridRowSpan;

  /**
   * Span multiple columns in a Grid. Values: 1–4.
   * @example colSpan={2}
   */
  colSpan?: GridColumnSpan;

  /**
   * Border-radius override. Pass a utility class name.
   * @example radius="u-radius-xlarge"
   */
  radius?: string;
}

/* Props are a DISCRIMINATED UNION on `href`, the Lumos pattern: link-only
   props (`newTab`, `ariaLabel`, `actions`) are typed `never` on a card with
   no href, so passing them without a destination is an editor error instead
   of silently dead markup. There is deliberately NO index signature — the old
   `[key: string]: any` made every typo type-check. Standard `<div>`
   attributes (`style`, `aria-*`, `data-*`, `id`, `class`) are inherited from
   HTMLAttributes and checked. */
export type Props = BaseProps &
  (
    | ({
        /**
         * Makes the entire card surface a clickable link.
         * @example href="/work/project"
         */
        href: string;
        /**
         * Open link in a new tab (adds `rel="noopener noreferrer"`).
         * @default false
         * @example newTab
         */
        newTab?: boolean;
        /**
         * Accessible label for the clickable overlay.
         * Falls back to `title` prop if omitted. Required when `href` is set.
         * @example ariaLabel="View project details"
         */
        ariaLabel?: string;
        /**
         * Whether this card holds ONE action or SEVERAL — it decides whether the
         * card surface is itself a link.
         *
         * | Value                | Behavior                                          |
         * |----------------------|---------------------------------------------------|
         * | `'single'` (default) | Whole card is the link. A lone footer button is a |
         * |                      | visual affordance and the footer is `inert`, so   |
         * |                      | the card is ONE tab stop, not two to the same     |
         * |                      | place.                                            |
         * | `'multiple'`         | Card surface is NOT a link — two destinations     |
         * |                      | cannot share one surface. Buttons stay clickable. |
         *
         * Pass `'multiple'` whenever the card holds more than one action. A CSS
         * safety net also drops the whole-card link if the footer turns out to hold
         * two or more controls, so a card left on the default can never cover its
         * own buttons — but set the prop so the footer is not needlessly `inert`.
         *
         * @example actions="multiple"
         */
        actions?: "single" | "multiple";
      } & HTMLAttributes<"div">)
    | ({
        /** No href — the card surface is not a link. */
        href?: never;
        /** Link-only prop — needs an `href` to open in a tab. */
        newTab?: never;
        /** Link-only prop — names the card link, which this card doesn't have. */
        ariaLabel?: never;
        /** Link-only prop — decides how the card link and the footer's buttons
            share the surface; without an `href` there is nothing to share. */
        actions?: never;
      } & HTMLAttributes<"div">)
  );

/* Flat shape for the implementation — inside the component TypeScript cannot
   know which union branch applies, so props are read through this instead. */
export type AllProps = BaseProps & {
  href?: string;
  newTab?: boolean;
  ariaLabel?: string;
  actions?: "single" | "multiple";
  id?: string;
  class?: string;
};
