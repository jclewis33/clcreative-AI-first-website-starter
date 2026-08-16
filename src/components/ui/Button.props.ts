/**
 * Button's props contract, in a plain .ts module.
 *
 * These lived in Button.astro's frontmatter until a hard-won discovery: large
 * inline frontmatter types are FRAGILE under astro-language-tools — an
 * innocuous JSDoc comment containing two braced JSX-like expressions silently
 * degraded call-site checking of the Props union to "accepts anything",
 * order-dependently, with zero diagnostics. Types in a real .ts module are
 * checked by plain TypeScript, deterministically, and the contract test in
 * src/lib/prop-contracts.test-d.ts pins the union rules so a regression here
 * turns into a hard error instead of silently vanishing enforcement.
 */
import type { HTMLAttributes } from "astro/types";

export type ButtonVariant = "primary" | "secondary" | "text";

/**
 * Size preset.
 * - `'default'` — standard padding (.9rem 1.5rem)
 * - `'small'`   — compact padding (.55rem 1.25rem)
 * - `'large'`   — prominent padding (1rem 2rem)
 */
export type ButtonSize = "default" | "small" | "large";

/**
 * Override which theme's hover tokens the button uses.
 * Useful when a button sits inside a different-themed container
 * (e.g. a brand-coloured button on a dark card that shouldn't hover to white).
 */
export type ButtonHoverTheme = "light" | "dark" | "brand";

/**
 * Button — theme-aware, trigger-driven button using the wrapper pattern.
 *
 * Renders as `<a>` when `href` is set, `<button>` otherwise.
 * Automatically adapts to `data-theme="light|dark|brand"` on any ancestor.
 *
 * **Props:**
 * - `variant` — visual style: primary (filled), secondary (outlined), text (link style) (default: `'primary'`)
 * - `size` — padding preset: default, small, large (default: `'default'`)
 * - `href` — turns into a link (`<a>` tag)
 * - `newTab` — open link in new tab (default: `false`)
 * - `disabled` — disable the button, not links (default: `false`)
 * - `ariaLabel` — accessible label on the clickable overlay (**required**)
 * - `type` — native button type: button, submit, reset (default: `'button'`)
 * - `square` — remove pill radius (default: `false`)
 * - `id` — HTML id on wrapper
 * - `class` — extra classes on wrapper
 * - `[key: string]` — extra attributes spread onto clickable overlay (e.g. `data-modal-trigger`)
 *
 * **Slots:** default (label text), `icon` (rendered after label).
 *
 * @example Button with supporting copy
 * ```astro
 * <Button href="/book-a-call" ariaLabel="Book a call" supportText="No credit card required">
 *   Get Started
 * </Button>
 * ```
 */
/* Props are a DISCRIMINATED UNION on `href`, following the Lumos pattern:
   the presence of href picks the <a> branch, its absence picks the <button>
   branch, and each branch pulls in the real DOM attributes for that element
   via HTMLAttributes. Props that only make sense on the other branch are
   typed `never`, so misuse is an editor error at the call site:

     <Button type="submit" href="/x">   ❌ type is a button-only prop
     <Button newTab>                    ❌ newTab needs an href
     <Button disabled href="/x">        ❌ links cannot be disabled

   There is deliberately NO index signature — the old `[key: string]: any`
   made every typo type-check. Arbitrary `data-*` attributes still pass
   (HTMLAttributes carries a `data-\${string}` index), and standard DOM
   attributes (`style`, `aria-*`, `id`, `class`) are inherited and CHECKED. */
export interface BaseProps {
  /**
   * **Button props:**
   * - `variant` — `'primary'` | `'secondary'` | `'text'` (default `'primary'`)
   * - `size` — `'default'` | `'small'` | `'large'` (default `'default'`)
   * - `href` — link URL (renders `<a>`; without it renders `<button>`)
   * - `newTab` — open in new tab (link buttons only)
   * - `disabled` / `type` — native button behavior (non-link buttons only)
   * - `ariaLabel` — accessible name for ICON-ONLY buttons (ignored when the
   *   button has visible text — the text is the accessible name)
   * - `square` — removes pill radius
   * - `fullWidth` — stretches button to 100% width (default `false`)
   * - `hoverTheme` — `'light'` | `'dark'` | `'brand'` — hover tokens override
   * - `supportText` — small muted line under the button
   * - Also accepts the standard attributes of the element it renders
   *   (`style`, `data-*`, `aria-*`, …) — spread onto the root `<a>`/`<button>`
   *
   * **Slots:** default (label text), `icon` (after label)
   */
  docs?: string;

  /**
   * Visual style of the button.
   *
   * | Value | Description |
   * |-------|-------------|
   * | `'primary'` | Filled button — uses `--button-primary-*` theme tokens. |
   * | `'secondary'` | Outlined / ghost — uses `--button-secondary-*` theme tokens. |
   * | `'text'` | Text-link style — no background, bottom border only, draws its own chevron. Uses `--link-*` theme tokens. |
   *
   * @default 'primary'
   */
  variant?: ButtonVariant;

  /**
   * Size preset — controls padding on the button element.
   *
   * | Value | Padding |
   * |-------|---------|
   * | `'default'` | `.9rem 1.5rem` |
   * | `'small'` | `.55rem 1.25rem` |
   * | `'large'` | `1rem 2rem` |
   *
   * @default 'default'
   */
  size?: ButtonSize;

  /**
   * Accessible name override.
   *
   * - **Icon-only button** (no visible text): REQUIRED — there is nothing
   *   else to announce.
   * - **Button with visible text**: optional. Use it to disambiguate repeated
   *   labels — six "Learn more" links become "Learn more about Essentials
   *   Package", etc. WCAG 2.5.3 ("Label in Name") requires the label to
   *   CONTAIN the visible text: start it with the words on the button. A
   *   dev-only browser check warns on labels that don't.
   *
   * @example ariaLabel="Learn more about Essentials Package"
   */
  ariaLabel?: string;

  /**
   * Removes the default pill radius (sets `border-radius: 0`).
   * Applies the `button_main_wrap--no-radius` modifier.
   * @default false
   */
  square?: boolean;

  /**
   * Stretches the button to 100% width of its parent (block display).
   * By default buttons are `inline-block` and shrink-wrap their content.
   * @default false
   */
  fullWidth?: boolean;

  /**
   * Override which theme's hover tokens the button uses.
   * Useful when a button sits inside a container whose theme
   * would produce an awkward hover — e.g. a brand primary button
   * on a dark card that hovers to white by default.
   *
   * | Value | Effect |
   * |-------|--------|
   * | `'light'` | Hover uses the light theme's button tokens (hover to dark) |
   * | `'dark'`  | Hover uses the dark theme's button tokens (hover to white) |
   * | `'brand'` | Hover uses the brand theme's button tokens (subtle darken) |
   */
  hoverTheme?: ButtonHoverTheme;

  /**
   * Optional supporting copy displayed below the button.
   * When omitted, no extra element is rendered.
   * Renders as a small, muted text line beneath the button.
   *
   * @example
   * ```astro
   * <Button href="/book-a-call" ariaLabel="Book a call" supportText="No credit card required">
   *   Get Started
   * </Button>
   * ```
   */
  supportText?: string;
}

export type Props = BaseProps &
  (
    | ({
        /** Link URL — this branch renders an `<a>`. */
        href: string;
        /**
         * Opens the link in a new tab; adds `rel="noopener noreferrer"`.
         * @default false
         */
        newTab?: boolean;
        /** Button-only prop — a link has no form type. */
        type?: never;
        /** Button-only prop — a link cannot be disabled; omit the href instead. */
        disabled?: never;
      } & HTMLAttributes<"a">)
    | ({
        /** No href — this branch renders a `<button>`. */
        href?: never;
        /** Link-only prop — a `<button>` has no destination to open in a tab. */
        newTab?: never;
        /**
         * Native button type. `'submit'` submits the nearest form.
         * @default 'button'
         */
        type?: "button" | "submit" | "reset";
        /**
         * Disables the button: `opacity: 0.4`, `cursor: not-allowed` via
         * `.button_main_wrap:disabled`; a native disabled button also stops
         * receiving pointer and keyboard events on its own.
         * @default false
         */
        disabled?: boolean;
      } & HTMLAttributes<"button">)
  );

/* The strict union is for CALLERS. Inside the component TypeScript cannot
   know which branch it is in, so the implementation reads props through this
   flat, permissive shape instead — the standard companion to a discriminated
   union (Lumos does the same). */
export type AllProps = BaseProps & {
  href?: string;
  newTab?: boolean;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  id?: string;
  class?: string;
};
