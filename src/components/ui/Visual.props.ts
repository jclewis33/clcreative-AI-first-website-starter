/**
 * Visual's props contract, in a plain .ts module.
 *
 * These lived in Visual.astro's frontmatter until a hard-won discovery: large
 * inline frontmatter types are FRAGILE under astro-language-tools — an
 * innocuous JSDoc comment containing two braced JSX-like expressions silently
 * degraded call-site checking of the Props union to "accepts anything",
 * order-dependently, with zero diagnostics. Types in a real .ts module are
 * checked by plain TypeScript, deterministically, and the contract test in
 * src/lib/prop-contracts.test-d.ts pins the union rules so a regression here
 * turns into a hard error instead of silently vanishing enforcement.
 */
import type { HTMLAttributes } from "astro/types";

export type PositionPreset =
  /** 50 / 50 — centered (default) */
  | "center"
  /** 50 / 0 — top edge */
  | "top"
  /** 0 / 0 — top-left corner */
  | "top-left"
  /** 100 / 0 — top-right corner */
  | "top-right"
  /** 50 / 100 — bottom edge */
  | "bottom"
  /** 0 / 100 — bottom-left corner */
  | "bottom-left"
  /** 100 / 100 — bottom-right corner */
  | "bottom-right"
  /** 0 / 50 — left edge */
  | "left"
  /** 100 / 50 — right edge */
  | "right";

export type FocalPoint = { x: number; y: number };

export type RatioPreset =
  | "wide" // 16 / 9
  | "widescreen" // 21 / 9
  | "landscape" // 3 / 2
  | "square" // 1 / 1
  | "portrait" // 3 / 4
  | "tall"; // 2 / 3

/* ── Radius type ── */

export type RadiusSize =
  /** 0 — no rounding */
  | "none"
  /** Subtle rounding */
  | "xsmall"
  /** Slightly rounded */
  | "small"
  /** Moderate rounding */
  | "medium"
  /** Noticeable rounding */
  | "large"
  /** Very rounded */
  | "xlarge"
  /** Site default radius (--radius-main) */
  | "main"
  /** Fully rounded / pill */
  | "full"
  /** Large section-level rounding */
  | "section";

/* ── Component props ── */

/**
 * Visual — image component with aspect ratio, focal-point positioning,
 * border-radius, and background variant support.
 *
 * **Props:**
 * - `src` — image source: imported `ImageMetadata` or URL string (**required**)
 * - `alt` — alt text for accessibility (**required**, use `""` for decorative)
 * - `ratio` — aspect ratio: wide (16/9), widescreen (21/9), landscape (3/2), square (1/1), portrait (3/4), tall (2/3), or custom CSS string (default: `'landscape'`)
 * - `radius` — border-radius: none, xsmall, small, medium, large, xlarge, main, full, section (default: `'main'`)
 * - `variant` — default (image in wrapper) or background (absolute-fill for Section slot) (default: `'default'`)
 * - `position` — focal point: center, top, top-left, top-right, bottom, bottom-left, bottom-right, left, right, or `{ x, y }` (default: `'center'`)
 * - `fit` — object-fit: cover, contain, fill, none, scale-down (default: `'cover'`)
 * - `loading` — lazy or eager (default: `'lazy'`; `variant="background"` defaults to `'eager'`)
 * - `priority` — sets eager loading + high fetchpriority for above-the-fold images (default: `false`)
 * - `transparent` — removes skeleton background for transparent images like logos/PNGs. Pass as bare keyword, not `="true"` (default: `false`)
 * - `width` — image width in px (required for remote URLs)
 * - `height` — image height in px (required for remote URLs)
 * - `class` — extra classes on the wrapper
 */
export interface BaseProps extends HTMLAttributes<"div"> {
  /**
   * **Visual props:**
   * - `src` — ImageMetadata or URL string (required)
   * - `alt` — alt text, "" for decorative (required)
   * - `ratio` — wide, widescreen, landscape, square, portrait, tall, or custom CSS (default 'landscape')
   * - `radius` — none, xsmall, small, medium, large, xlarge, main, full, section (default 'main')
   * - `variant` — default, background (absolute-fill for Section bg slot)
   * - `position` — center, top, top-left, top-right, bottom, bottom-left, bottom-right, left, right, or { x, y }
   * - `fit` — cover, contain, fill, none, scale-down (default 'cover')
   * - `loading` — eager, lazy (default 'lazy'; `variant="background"` defaults to 'eager')
   * - `priority` — eager loading + high fetchpriority for above-the-fold
   * - `transparent` — removes skeleton bg for transparent images (logos, PNGs). Bare keyword, not `="true"`
   * - `width` / `height` — required for remote URLs
   * - `class` — extra classes
   * - Also accepts any HTML attribute (`style`, `data-*`, `aria-*`, etc.) — `style` is merged with computed styles
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
   * Image source — an imported image (`ImageMetadata`) or a URL string.
   * @example src={myImage}
   * @example src="https://example.com/photo.jpg"
   */
  src: ImageMetadata | string;

  /**
   * Alt text — required for accessibility.
   * Use `""` for purely decorative images.
   * @example alt="Team photo"
   * @example alt=""
   */
  alt: string;

  /**
   * Aspect ratio of the wrapper.
   * - **Preset:** `'wide'` (16/9), `'widescreen'` (21/9), `'landscape'` (3/2),
   *   `'square'` (1/1), `'portrait'` (3/4), `'tall'` (2/3)
   * - **Custom:** any CSS aspect-ratio string, e.g. `'4/3'`, `'2.35/1'`
   * - Ignored when `variant="background"`.
   * @default 'landscape'
   * @example ratio="wide"
   * @example ratio="4/3"
   */
  ratio?: RatioPreset | string;

  /**
   * Border-radius applied to the image wrapper.
   * Maps to the `u-radius-*` utility classes.
   *
   * When the Visual is inside a breakout/full layout bleed column,
   * the bleed-side corners are automatically zeroed via CSS context rules.
   * @default 'main'
   * @example radius="large"
   * @example radius="none"
   */
  radius?: RadiusSize;

  /**
   * Component variant.
   * - `default`    → standard image inside an aspect-ratio wrapper
   * - `background` → absolute-fill for use in a Section `background` slot
   *   or any `position: relative` parent
   * @default 'default'
   * @example variant="background"
   */
  variant?: "default" | "background";

  /**
   * Focal point / object-position.
   * - **Named preset:** `'center'`, `'top'`, `'top-left'`, `'top-right'`,
   *   `'bottom'`, `'bottom-left'`, `'bottom-right'`, `'left'`, `'right'`
   * - **Custom:** `{ x: 30, y: 20 }` — percentage values 0–100
   *
   * A custom focal point is an **object literal, so it needs double braces**
   * in Astro/JSX: `position={{ x: 30, y: 20 }}`. Single braces
   * (`position={x: 30, y: 20}`) are parsed as a code expression and fail the
   * build with `Unexpected ":"`.
   *
   * The focal point drives `--x`/`--y` on the `<img>`, consumed by
   * `.u-image-wrapper .u-image { object-position: … }`. That rule is scoped to
   * the wrapper (specificity 0,2,0) on purpose — Astro's `layout="full-width"`
   * stamps `data-astro-image-pos="center"` (0,1,0) on every local image, and a
   * single-class rule would tie and lose to it, silently forcing center.
   * @default 'center'
   * @example position="top"
   * @example position={{ x: 30, y: 20 }}
   */
  position?: PositionPreset | FocalPoint;

  /**
   * Object-fit behavior. Overrides the default `cover`.
   * Applied on the wrapper and inherited by the image.
   * @default 'cover'
   * @example fit="contain"
   */
  fit?: "cover" | "contain" | "fill" | "none" | "scale-down";

  /**
   * Loading behavior.
   * Overridden to `'eager'` when `priority` is `true`.
   * `variant="background"` defaults to `'eager'` because background images are
   * structural — native lazy-load can fail to fire for them on SSR routes
   * where the image sits inside a chain of absolute-positioned containers.
   * @default 'lazy' (or 'eager' when variant="background")
   */
  loading?: "lazy" | "eager";

  /**
   * Priority image — sets `loading="eager"` and `fetchpriority="high"`.
   * Use for above-the-fold hero and background images.
   * @default false
   * @example priority
   */
  priority?: boolean;

  /**
   * Image width in pixels — **required** for remote URL sources.
   * For imported images Astro infers this automatically.
   */
  width?: number;

  /**
   * Image height in pixels — **required** for remote URL sources.
   * For imported images Astro infers this automatically.
   */
  height?: number;

  /**
   * Remove the loading-skeleton background color.
   * Use for images with transparency (logos, PNGs, etc.)
   * where the grey placeholder would show through.
   * Pass as a bare keyword — `transparent`, not `transparent="true"`.
   * @default false
   * @example <Visual src={logo} alt="Logo" transparent />
   */
  /**
   * Compression quality passed to Astro's image service — a preset
   * (`'low' | 'mid' | 'high' | 'max'`) or a number 0–100.
   *
   * Left unset, Astro's default applies. Worth lowering on large decorative
   * photos, and raising on screenshots or anything with fine text.
   *
   * Ignored on remote URLs, which are not processed.
   *
   * @example quality="high"
   */
  quality?: "low" | "mid" | "high" | "max" | number;

  transparent?: boolean;

  /** Extra classes on the outer `.u-image-wrapper` div. */
  class?: string;
}

/* `sizes` and `densities` are mutually exclusive BY THE HTML SPEC — a density
   srcset has no width descriptors for `sizes` to choose between. This used to
   be a dev-console warning; encoded as a union it is an editor error at the
   call site instead. */
export type Props = BaseProps &
  (
    | ({ densities?: never } & {
        /**
         * Override the `sizes` attribute.
         *
         * Normally unnecessary. A lazy image (the default) already gets
         * `sizes="auto"`, which makes the browser choose the srcset candidate from
         * the element's real laid-out width — the right size for whatever box it
         * lands in, with no per-instance configuration.
         *
         * Worth setting on an EAGER or `priority` image, where `auto` does not
         * apply: the browser has no layout to measure yet, so it falls back to
         * `100vw`. If such an image is not full-bleed, describe it here — e.g.
         * `sizes="(min-width: 60rem) 33vw, 100vw"`.
         *
         * Ignored on remote URLs, which have no srcset.
         *
         * @example sizes="(min-width: 60rem) 33vw, 100vw"
         */
        sizes?: string;
      })
    | ({ sizes?: never } & {
        /**
         * Pixel densities to generate instead of width-based srcset entries, e.g.
         * `[1, 2]`. Use for fixed-size images (logos, avatars, icons) where the
         * rendered size never changes — a density srcset is smaller than a width
         * one there.
         *
         * Mutually exclusive with Astro's width-based srcset, so it is only applied
         * when `sizes` is not set. Ignored on remote URLs.
         *
         * @example densities={[1, 2]}
         */
        densities?: (number | `${number}x`)[];
      })
  );

/* Flat shape for the implementation. */
export type AllProps = BaseProps & {
  sizes?: string;
  densities?: (number | `${number}x`)[];
};
