# How to Change the Brand Colors

This guide explains how to update the color system so all three themes (light, dark, brand) display correctly. It covers both single-accent setups and multi-color brand palettes.

---

## Files involved

| File | What it contains |
|------|------------------|
| `src/styles/variables/colors.css` | Raw color swatches (brand scale, dark/light palettes) |
| `src/styles/variables/themes.css` | Semantic theme mappings that reference the raw swatches (includes footer variables + the `--surface-*` contrasting-card tier) |

You will almost always only need to edit **`colors.css`**. The theme file references the color variables, so it updates automatically.

---

## Step 1: Change the brand color

In `colors.css`, update `--color-brand-500` to your new hex value:

```css
--color-brand-500: #f35423; /* your new brand color */
```

The full brand scale (100–900) is generated automatically via `color-mix()`, so you only need to change this one line. Lighter shades (100–400) mix with white, darker shades (600–900) mix with black.

---

## Step 2: Decide if brand text should be light or dark

This is the key step. `--color-brand-text` controls the color of **text, borders, and icons placed on top of the brand color**. Ask yourself:

> "Is my brand color light or dark?"

- **Light brand color** (e.g., lime green `#c6fb50`, yellow, light blue) → use dark text:
  ```css
  --color-brand-text: var(--color-dark-900);
  ```

- **Dark brand color** (e.g., orange `#f35423`, navy, deep red) → use light text:
  ```css
  --color-brand-text: var(--color-light-100);
  ```

The opacity variants (`--color-brand-text-o20` and `--color-brand-text-o75`) are built from `--color-brand-text` via `color-mix()`, so they update automatically.

---

## What those two changes affect

Here's everything that flows from `--color-brand-500` and `--color-brand-text` through `themes.css`:

### All themes (light, dark, brand)

| Semantic variable | What it controls | Source |
|---|---|---|
| `--button-primary-background` | Primary button fill | `--color-brand-500` |
| `--button-primary-border` | Primary button border | `--color-brand-500` |
| `--button-primary-text` | Primary button label | `--color-brand-text` |
| `--selection-text` | Text highlight color | `--color-brand-text` |
| `--selection-background` | Text highlight background | `--color-brand-300` |
| `--footer-background` | Footer background color | `--color-dark-900` |
| `--footer-text` | Footer text color | `--color-light-100` |
| `--footer-border` | Footer bottom bar divider | `--color-light-100-o20` |

### Light theme only

| Semantic variable | What it controls | Source |
|---|---|---|
| `--heading-accent` | `<strong>` inside headings | `--color-brand-600` |

### Dark theme only

| Semantic variable | What it controls | Source |
|---|---|---|
| `--heading-accent` | `<strong>` inside headings | `--color-brand-500` |
| `--link-border-hover` | Link underline on hover | `--color-brand-500` |

### Brand theme (brand color is the background)

| Semantic variable | What it controls | Source |
|---|---|---|
| `--background` | Section/page background | `--color-brand-500` |
| `--background-2` | Card/nav background | `--color-brand-600` |
| `--text` | All body text | `--color-brand-text` |
| `--heading-accent` | Accent heading text | `--color-brand-text` (mixed 20% white) |
| `--border` | All borders | `--color-brand-text-o20` |
| `--button-primary-background` | Button fill (inverted) | `--color-brand-text` |
| `--button-primary-text` | Button label | `--color-brand-500` |
| `--button-secondary-*` | Secondary button states | `--color-brand-text` / `--color-brand-500` |
| `--link-text` | Link text | `--color-brand-text-o75` |
| `--link-border` | Link underlines | `--color-brand-text-o20` |
| `--nav-background` | Nav bar fill | `--color-brand-500` |
| `--nav-banner-background` | Announcement banner fill | `--color-brand-text` |
| `--nav-banner-color` | Announcement banner text | `--color-brand-500` |

### Surface tier — contrasting cards (testimonials, primary `<Card>`)

A card that sits inside a themed section often needs to **contrast** with it (so it pops) while staying readable. Those colors are a separate **`--surface-*` tier**, defined once per theme block in `themes.css`. Each card consumes the tier on its own wrapping class, so it adapts to its section's theme automatically.

| Surface variable | What it controls | Source — light / dark | Source — brand |
|---|---|---|---|
| `--surface-background` | Card background | `--color-light-100` (white "paper") | `--color-brand-400` |
| `--surface-text` | Card text | `--color-dark-900` | `--color-brand-text` |
| `--surface-heading-accent` | Accent inside card (e.g. stars) | `--color-brand-500` | `--color-brand-text` |
| `--surface-border` | Card border | `--color-dark-900-o20` | `--color-brand-text-o20` |

These already cascade from the swatches you change in Steps 1–2 (the brand surface follows `--color-brand-500`/`--color-brand-text`). You only edit `--surface-*` directly if you want to **change the card's look itself** — see "Optional: Change the contrasting card surface" below.

---

## Step 3: Verify the results

After making your changes, check these areas on the site:

1. **Primary buttons** — text should be readable on the brand-colored background (all themes)
2. **Brand theme sections** (`data-theme="brand"`) — all text, borders, and buttons should have sufficient contrast
3. **Heading accents** — `<strong>` text inside headings on light and dark themes
4. **Selection highlight** — select some text and check the highlight color is usable
5. **Nav bar** — if using brand theme on nav, check text/logo contrast
6. **Focus rings** — `--color-focus-state` uses `--color-brand-500` for keyboard focus outlines
7. **Footer** — links and text should be readable on the footer background (all themes)
8. **Contrasting cards** — testimonial cards and primary `<Card>` (default/stacked) on a **dark** section: the card surface and its text must contrast (dark text on a light card). This is the one that breaks most visibly if `--surface-text` is wrong

---

## Optional: Update the heading accent independently

If the auto-generated `--color-brand-600` doesn't look right as a heading accent on light backgrounds, you can override `--heading-accent` directly in `themes.css` for the light theme:

```css
/* In the light theme block */
--heading-accent: var(--color-brand-700); /* or any brand shade */
```

This is independent of `--color-brand-text` and can be set to whatever shade works best for your design.

---

## Optional: Update the gradient

The gradient in `themes.css` uses brand-400, brand-500, and brand-600. It updates automatically when you change brand-500, but you can adjust the stops or angle if needed:

```css
--gradient-primary: linear-gradient(
  94deg,
  var(--color-brand-400) -0.01%,
  var(--color-brand-500) 51.63%,
  var(--color-brand-600) 103.27%
);
```

---

## Optional: Change the footer theme

The footer has its own set of CSS variables in `themes.css`, defined in each theme block:

```css
/* Footer */
--footer-background: var(--color-dark-900);
--footer-text: var(--color-light-100);
--footer-border: var(--color-light-100-o20);
```

By default, all three themes (light, dark, brand) set the footer to the same dark values — so the footer stays dark regardless of the page theme. To change the footer's look for a specific theme, update the values in that theme's block.

For example, to give the brand theme a brand-colored footer:

```css
/* In the brand theme block */
--footer-background: var(--color-brand-600);
--footer-text: var(--color-brand-text);
--footer-border: var(--color-brand-text-o20);
```

**How it works:** `.footer_wrap` in `footer.css` remaps these three variables onto the standard theme aliases (`--background`, `--text`, `--border`) and derives the link variables (`--link-text`, `--link-text-hover`, etc.) from `--footer-text` via `color-mix()`. You only need to set the three `--footer-*` variables — link colors, borders, and all descendant styles cascade automatically.

---

## Optional: Change the contrasting card surface

Cards that must stand out against a themed section — testimonial cards and the primary `<Card>` (default/stacked variants) — use the **`--surface-*` tier** in `themes.css`. It's defined once per theme block, right after `--border`:

```css
/* In each theme block (light / dark / brand) */
--surface-background: var(--color-light-100);     /* the card's background    */
--surface-text: var(--color-dark-900);            /* the card's text          */
--surface-heading-accent: var(--color-brand-500); /* accent inside (e.g. stars) */
--surface-border: var(--color-dark-900-o20);      /* the card's border        */
```

By default these reproduce the established look: **light/dark** sections → white "paper" card with dark text + brand-accent stars; **brand** section → a tonal `--color-brand-400` card with `--color-brand-text`. They already cascade from your Step 1–2 swatch changes, so you only edit them here to **redesign the card itself** — e.g. to make brand-section cards a white "paper" card instead of tonal orange:

```css
/* In the brand theme block */
--surface-background: var(--color-light-100);     /* white card on orange section */
--surface-text: var(--color-dark-900);            /* dark text                    */
--surface-heading-accent: var(--color-brand-500); /* orange stars                 */
--surface-border: var(--color-dark-900-o20);
```

**How it works:** the card's own class (`.testimonial_card` in `components/testimonials.css`, `.card_primary_*` in `components/cards.css`) remaps the standard aliases (`--background`, `--text`, `--heading-accent`, `--border`) to the `--surface-*` values **and sets its own `color`**, so every nested text layer inherits the contrasting color. Editing the four `--surface-*` variables in a theme block is all you need — the cards adapt automatically with no per-instance props. There's also a `.u-surface` utility class that does the same remap for any one-off element.

> **Gotcha when extending this:** the contrasting `color` must live on the card's *own* wrapping class (the layer that contains all the text). If a card only sets `background` and leaves `color` to a child layer, the inner text inherits `color` straight from the section (`.u-section[data-theme]`) — white on a dark section — and goes invisible on a light card. Mirror the pattern in `.testimonial_card` / `.card_primary_element`.

---

## Quick reference: the two-line change

For most brand color updates, this is all you need in `colors.css`:

```css
/* 1. Set the new brand color */
--color-brand-500: #your-hex-here;

/* 2. Set text contrast (light-100 for dark brands, dark-900 for light brands) */
--color-brand-text: var(--color-light-100);  /* or var(--color-dark-900) */
```

Everything else cascades automatically.

---
---

# Multi-Color Brand Palettes

The default system uses one accent color (brand) plus neutral dark/light swatches. If your design has a primary, secondary, and tertiary brand color, here's how to extend it.

---

## Understanding the swatch groups

`colors.css` has three structural swatch groups. Each serves a specific role in the theme system:

| Swatch group | Current default | Role in themes |
|---|---|---|
| **Dark** (`--color-dark-*`) | `#1f1d1e` warm black | Dark backgrounds (dark theme), text color on light backgrounds, borders on light backgrounds |
| **Light** (`--color-light-*`) | `white` / `#ebebeb` | Light backgrounds (light theme), text color on dark backgrounds, borders on dark backgrounds |
| **Brand** (`--color-brand-*`) | `#c6fb50` lime (or your accent) | Buttons, brand theme background, heading accents, selection highlight, focus rings, gradient |

These groups are **structural**, not decorative. The dark and light groups define the neutral foundation. The brand group is the accent.

---

## Mapping a multi-color palette

When you have multiple brand colors, decide which structural role each one fills:

### Example: Dark blue primary, blue secondary, orange tertiary

| Your color | Hex | Design role | Maps to |
|---|---|---|---|
| Brand primary | `#0c111d` | Dark backgrounds, body text on light sections | **Dark swatches** (`--color-dark-900`) |
| Brand secondary | `#1a57a8` | Heading accent color | **New swatch** (`--color-secondary-500`) |
| Brand tertiary | `#f35423` | Buttons, accent, brand theme background | **Brand swatches** (`--color-brand-500`) |

---

## Step 1: Update the dark swatches (brand primary)

If your primary brand color is a dark color used for backgrounds and text, it replaces the neutral dark swatches. In `colors.css`:

```css
--color-dark-900: #0c111d;  /* your dark brand primary */
```

Also update `--color-dark-800` — this is used for `--background-2` in the dark theme (cards, nav, secondary surfaces). Pick a slightly lighter variant of your dark primary:

```css
--color-dark-800: #141c2e;  /* lighter shade for secondary dark surfaces */
```

The opacity variants (`-o20`, `-o50`, `-o75`) are built via `color-mix()` and update automatically.

**What this affects in `themes.css`:**
- Light theme: `--text`, `--border`, button text/hover colors, link colors, nav banner text
- Dark theme: `--background`, `--background-2`, overlay scrim
- All themes: button hover backgrounds, secondary button text

---

## Step 2: Add a secondary swatch (brand secondary)

Add a new section in `colors.css` between the light and brand swatch groups:

```css
/* =====================================================
   SECONDARY SWATCHES
   ===================================================== */

--color-secondary-500: #1a57a8;
```

You don't need a full 100–900 scale unless you plan to use multiple shades. If you do, add them the same way:

```css
--color-secondary-400: color-mix(in srgb, var(--color-secondary-500), white 20%);
--color-secondary-600: color-mix(in srgb, var(--color-secondary-500), black 20%);
```

---

## Step 3: Wire the secondary color into themes

Open `themes.css` and replace the `--heading-accent` values:

**Light theme:**
```css
--heading-accent: var(--color-secondary-500);  /* was --color-brand-600 */
```

**Dark theme:**
```css
--heading-accent: var(--color-secondary-500);  /* was --color-brand-500 */
```

If `#1a57a8` doesn't have enough contrast on one of the backgrounds, use a lighter or darker variant per theme:

```css
/* Dark theme — lighter blue for contrast on dark background */
--heading-accent: var(--color-secondary-400);
```

**Brand theme** — the heading accent here is already set to a mix of `--color-brand-text` + white, which works independently. Only change it if you want the secondary color visible on the brand background too.

---

## Step 4: Update the brand accent (brand tertiary)

This is the standard two-line change from the first section of this guide:

```css
--color-brand-500: #f35423;
--color-brand-text: var(--color-light-100);  /* light text on dark orange */
```

---

## Summary: all changes for a three-color brand

### `colors.css`

| Variable | Change |
|---|---|
| `--color-dark-900` | Your dark brand primary (e.g. `#0c111d`) |
| `--color-dark-800` | Slightly lighter variant (e.g. `#141c2e`) |
| New: `--color-secondary-500` | Your secondary color (e.g. `#1a57a8`) |
| `--color-brand-500` | Your accent/tertiary color (e.g. `#f35423`) |
| `--color-brand-text` | `var(--color-light-100)` or `var(--color-dark-900)` based on brand-500 brightness |

### `themes.css`

| Variable | Theme | Change |
|---|---|---|
| `--heading-accent` | Light | `var(--color-secondary-500)` |
| `--heading-accent` | Dark | `var(--color-secondary-500)` |

Everything else (buttons, borders, links, nav, footer, brand theme) cascades from the existing system. The footer defaults to `--color-dark-900` background with `--color-light-100` text across all themes — update the `--footer-*` variables in each theme block if you want the footer to match your new dark primary.

---

## Adding more semantic slots

If you need a secondary color to appear in places beyond heading accents (e.g. a secondary button style, link hover color, or card border), add new semantic variables to `themes.css` in each theme block:

```css
/* Example: secondary accent for links on hover */
--link-border-hover: var(--color-secondary-500);
```

The pattern is always the same:
1. Define the raw swatch in `colors.css`
2. Reference it in the semantic slot in `themes.css`
3. Set a different value per theme block if contrast requires it
