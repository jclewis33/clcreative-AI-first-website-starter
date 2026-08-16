# How to Change the Brand Colors

This guide explains how to update the color system so all three themes (light, dark, brand) display correctly. It covers both single-accent setups and multi-color brand palettes.

---

## Files involved

| File                              | What it contains                                                                                                              |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `src/styles/variables/colors.css` | Raw color swatches (brand scale, dark/light palettes)                                                                         |
| `src/styles/variables/themes.css` | Semantic theme mappings that reference the raw swatches (includes footer variables + the `data-theme-invert` flip used by contrasting cards) |

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

| Semantic variable             | What it controls          | Source                  |
| ----------------------------- | ------------------------- | ----------------------- |
| `--button-primary-background` | Primary button fill       | `--color-brand-500`     |
| `--button-primary-border`     | Primary button border     | `--color-brand-500`     |
| `--button-primary-text`       | Primary button label      | `--color-brand-text`    |
| `--selection-text`            | Text highlight color      | `--color-brand-text`    |
| `--selection-background`      | Text highlight background | `--color-brand-300`     |
| `--footer-background`         | Footer background color   | `--color-dark-900`      |
| `--footer-text`               | Footer text color         | `--color-light-100`     |
| `--footer-border`             | Footer bottom bar divider | `--color-light-100-o20` |

### Light theme only

| Semantic variable  | What it controls           | Source              |
| ------------------ | -------------------------- | ------------------- |
| `--heading-accent` | `<strong>` inside headings | `--color-brand-600` |

### Dark theme only

| Semantic variable     | What it controls           | Source              |
| --------------------- | -------------------------- | ------------------- |
| `--heading-accent`    | `<strong>` inside headings | `--color-brand-500` |
| `--link-border-hover` | Link underline on hover    | `--color-brand-500` |

### Brand theme (brand color is the background)

| Semantic variable             | What it controls         | Source                                     |
| ----------------------------- | ------------------------ | ------------------------------------------ |
| `--background`                | Section/page background  | `--color-brand-500`                        |
| `--background-2`              | Card/nav background      | `--color-brand-600`                        |
| `--text`                      | All body text            | `--color-brand-text`                       |
| `--heading-accent`            | Accent heading text      | `--color-brand-text` (mixed 20% white)     |
| `--border`                    | All borders              | `--color-brand-text-o20`                   |
| `--button-primary-background` | Button fill (inverted)   | `--color-brand-text`                       |
| `--button-primary-text`       | Button label             | `--color-brand-500`                        |
| `--button-secondary-*`        | Secondary button states  | `--color-brand-text` / `--color-brand-500` |
| `--link-text`                 | Link text                | `--color-brand-text-o75`                   |
| `--link-border`               | Link underlines          | `--color-brand-text-o20`                   |
| `--nav-background`            | Nav bar fill             | `--color-brand-500`                        |
| `--nav-banner-background`     | Announcement banner fill | `--color-brand-text`                       |
| `--nav-banner-color`          | Announcement banner text | `--color-brand-500`                        |

### Contrasting cards — `data-theme-invert` (testimonials, primary `<Card>`)

A card that sits inside a themed section often needs to read **against** it (so it pops) while staying legible. That is one attribute, not a set of variables: mark the element `data-theme-invert` and it flips to the *opposite* of the ground it sits on — dark or brand section → light card, light or unthemed → dark card. Everything nested inside follows, because a theme here is just inherited custom properties.

There is nothing to fill in per card. The island takes a **whole theme**, so its background is that theme's `--background-2`, its text is `--text`, and — this is the part that matters — any button or link inside it resolves against the card too.

> **Why there is no `--surface-*` tier any more.** There used to be one, copying four values (background / text / heading-accent / border) per theme. Because the copy was partial, buttons and links inside a card still resolved against the **section**, which shipped as white-on-white. A whole theme has no such gap. If you are looking for `--surface-background` and friends, they are gone and nothing replaces them — see THEME INVERT in `variables/themes.css`.

**Adding a new theme mode?** It owes the invert map one selector: add the new mode to the selector list of the theme it should flip *to*. See the same note in `themes.css`.

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
8. **Contrasting cards** — testimonial cards and primary `<Card>` on a **dark** section, with `theme="invert"`: the card surface and its text must contrast (dark text on a light card), and any button inside it must be legible on the card rather than on the section

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

## Optional: Change how a contrasting card looks

Cards that must stand out against a themed section carry `data-theme-invert`, which adopts a whole theme rather than a private set of card variables. So there is no card-specific palette to edit: **change the theme, and every invert island follows.**

- Want the white "paper" card on dark sections to be warmer? Edit `--background-2` in the **light** theme block of `themes.css` — that is the surface an invert island uses when it sits on a dark ground.
- Want the card's text or border to change? Same block: `--text`, `--border`.
- Want a card pinned to one theme regardless of its section? Pass the theme explicitly: `<Card theme="dark">`. `theme="invert"` is the relative flip; `light` / `dark` / `brand` are absolute.

Because the card consumes the same tokens as everything else in that theme, a change here also moves anything else painted with them — which is the point: one definition per theme, no per-component palette to keep in sync.

## Quick reference: the two-line change

For most brand color updates, this is all you need in `colors.css`:

```css
/* 1. Set the new brand color */
--color-brand-500: #your-hex-here;

/* 2. Set text contrast (light-100 for dark brands, dark-900 for light brands) */
--color-brand-text: var(--color-light-100); /* or var(--color-dark-900) */
```

Everything else cascades automatically.

---

---

# Multi-Color Brand Palettes

The default system uses one accent color (brand) plus neutral dark/light swatches. If your design has a primary, secondary, and tertiary brand color, here's how to extend it.

---

## Understanding the swatch groups

`colors.css` has three structural swatch groups. Each serves a specific role in the theme system:

| Swatch group                  | Current default                 | Role in themes                                                                               |
| ----------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------- |
| **Dark** (`--color-dark-*`)   | `#1f1d1e` warm black            | Dark backgrounds (dark theme), text color on light backgrounds, borders on light backgrounds |
| **Light** (`--color-light-*`) | `white` / `#ebebeb`             | Light backgrounds (light theme), text color on dark backgrounds, borders on dark backgrounds |
| **Brand** (`--color-brand-*`) | `#c6fb50` lime (or your accent) | Buttons, brand theme background, heading accents, selection highlight, focus rings, gradient |

These groups are **structural**, not decorative. The dark and light groups define the neutral foundation. The brand group is the accent.

---

## Mapping a multi-color palette

When you have multiple brand colors, decide which structural role each one fills:

### Example: Dark blue primary, blue secondary, orange tertiary

| Your color      | Hex       | Design role                                   | Maps to                                  |
| --------------- | --------- | --------------------------------------------- | ---------------------------------------- |
| Brand primary   | `#0c111d` | Dark backgrounds, body text on light sections | **Dark swatches** (`--color-dark-900`)   |
| Brand secondary | `#1a57a8` | Heading accent color                          | **New swatch** (`--color-secondary-500`) |
| Brand tertiary  | `#f35423` | Buttons, accent, brand theme background       | **Brand swatches** (`--color-brand-500`) |

---

## Step 1: Update the dark swatches (brand primary)

If your primary brand color is a dark color used for backgrounds and text, it replaces the neutral dark swatches. In `colors.css`:

```css
--color-dark-900: #0c111d; /* your dark brand primary */
```

Also update `--color-dark-800` — this is used for `--background-2` in the dark theme (cards, nav, secondary surfaces). Pick a slightly lighter variant of your dark primary:

```css
--color-dark-800: #141c2e; /* lighter shade for secondary dark surfaces */
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
--color-secondary-400: color-mix(
  in srgb,
  var(--color-secondary-500),
  white 20%
);
--color-secondary-600: color-mix(
  in srgb,
  var(--color-secondary-500),
  black 20%
);
```

---

## Step 3: Wire the secondary color into themes

Open `themes.css` and replace the `--heading-accent` values:

**Light theme:**

```css
--heading-accent: var(--color-secondary-500); /* was --color-brand-600 */
```

**Dark theme:**

```css
--heading-accent: var(--color-secondary-500); /* was --color-brand-500 */
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
--color-brand-text: var(--color-light-100); /* light text on dark orange */
```

---

## Summary: all changes for a three-color brand

### `colors.css`

| Variable                     | Change                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `--color-dark-900`           | Your dark brand primary (e.g. `#0c111d`)                                          |
| `--color-dark-800`           | Slightly lighter variant (e.g. `#141c2e`)                                         |
| New: `--color-secondary-500` | Your secondary color (e.g. `#1a57a8`)                                             |
| `--color-brand-500`          | Your accent/tertiary color (e.g. `#f35423`)                                       |
| `--color-brand-text`         | `var(--color-light-100)` or `var(--color-dark-900)` based on brand-500 brightness |

### `themes.css`

| Variable           | Theme | Change                       |
| ------------------ | ----- | ---------------------------- |
| `--heading-accent` | Light | `var(--color-secondary-500)` |
| `--heading-accent` | Dark  | `var(--color-secondary-500)` |

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
