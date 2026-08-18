# Brand colors & type scale — the deep reference

Read this when mapping a real palette (especially from Figma), when a brand needs
more than a single accent color, or when a fork genuinely needs a new theme mode.
The one question you must ask every run — **is the brand color light or dark?** —
lives in the main SKILL.md; everything here is the detail behind it.

## The architecture, in one line

> raw swatch ([colors.css](../../../../src/styles/variables/colors.css)) → theme
> alias that `var()`s the swatch ([themes.css](../../../../src/styles/variables/themes.css))
> → component/utility that `var()`s the alias.

Always feed colors in at the **swatch** layer and let them flow down that chain.
Never hard-code a hex onto a theme block or a component.

**`--color-brand-500` is the one knob.** The whole `--color-brand-100…900` scale
derives from it via `color-mix`, and themes.css references the raw swatches
(`--background: var(--color-light-200)`, `--heading-accent: var(--color-brand-500)`,
…). Setting the base swatches re-skins light/dark/brand **automatically** — never
set `brand-100…900` individually.

## Pulling the palette from Figma (optional)

If the user has a Figma file or design system, offer to pull the palette instead
of asking them to type hex codes.

1. **Find a Figma MCP.** Run `ToolSearch` for `figma colors variables styles` (the
   Figma Dev Mode MCP and community servers expose color tokens under varying
   names — e.g. `get_variable_defs`, `get_variables`, `get_figma_data`). If none is
   connected, fall back: ask the user to paste the hex values, or share a Figma
   link/screenshot you can read swatches from.
2. **Read the color tokens.** Ask for the Figma file URL or current selection, then
   call the discovered tool to get the color variables/styles (name → value).
3. **Map tokens to this project's swatches:**

   | Figma role                    | Swatch (`cssColors` key)                                  |
   | ----------------------------- | --------------------------------------------------------- |
   | Primary brand / accent        | `--color-brand-500` (also mirrored to `SITE.brand.color`) |
   | Text/icons ON the brand color | `--color-brand-text` — **ask, don't derive** (see below)  |
   | Darkest neutral / near-black  | `--color-dark-900`                                        |
   | Secondary dark                | `--color-dark-800`                                        |
   | White / lightest              | `--color-light-100`                                       |
   | Off-white surface             | `--color-light-200`                                       |

   Pass these as a `cssColors` object in the CLI config. Confirm the mapping with
   the user before writing.

4. **Map by role, not 1:1.** A brand's palette will almost never line up exactly
   with these swatch names, and that's fine. Map each Figma color to the swatch
   whose **role** it plays (their primary/accent → `--color-brand-500` even if they
   call it "accent"; their darkest neutral → `--color-dark-900`). You're fitting
   their colors into the existing structure, not renaming the structure to match
   Figma.

## `--color-brand-text` — the one forks get wrong

`--color-brand-text` is the color of **text, borders, and icons painted on top of
the brand color**. It drives the whole `brand` theme's `--text`,
`--heading-accent`, `--border`, and its button/link tokens. It does **not** follow
from `--color-brand-500`, so a light brand hue with the shipped default gives you
white-on-lime.

- **Light brand color** (lime, yellow, pale blue) → `"--color-brand-text": "var(--color-dark-900)"`
- **Dark brand color** (navy, deep green, the default orange) → `"--color-brand-text": "var(--color-light-100)"`

The CLI computes the brand hue's luminance and **warns** on a mismatch, but never
changes it for you. Answer explicitly rather than relying on the warning.

Full decision guide, including multi-color palettes:
[docs/brand-color-guide.md](../../../../docs/brand-color-guide.md).

## Staying inside the three shipped modes

**Default to light / brand / dark and try hard to stay within them.** Two rules
keep this from becoming forced or over-built:

- **Don't make the user invent colors they don't have.** `--color-brand-500` is the
  **primary/accent**, used across _all_ modes (heading accents, primary buttons,
  selection) — every brand has one, so always set it. That is separate from the
  **`brand` theme mode** (the brand-colored background sections). If a brand is
  "just light and dark" with no brand-colored sections, set their accent as
  `--color-brand-500` and **leave the `brand` mode defined and simply unused** —
  don't fabricate a brand palette, and don't delete the mode (deleting is
  restructuring). Likewise, if they have no distinct secondary-dark, leave that
  swatch alone rather than demanding a value.
- **Only add or drop a mode for a rare, legitimate reason**, and only with the
  user's say-so. Dropping a mode is structural — discuss it; the default is to keep
  all three defined even if one goes unused.

## Adding a fourth theme mode (rare)

If a fork genuinely needs one, add it the **exact same way** the others exist:

1. Replicate a full `[data-theme]` block in themes.css with **every** semantic
   alias `var()`-ing the swatches. Copy an existing block as the template — a token
   defined in one theme and missing from another inherits the wrong value silently,
   which is how white-on-white ships.
2. A new swatch goes in colors.css with the same naming and (if a scale) the same
   `color-mix` derivation as `--color-brand-100…900`.
3. **Add it to the invert map** — this is the step that gets forgotten:

```css
/* in the block for the theme the new mode flips TO */
[data-theme="<new-mode>"] [data-theme-invert],
.u-theme-<new-mode> [data-theme-invert] { … }
```

`data-theme-invert` is not a token — it is a pair of selector lists, so a mode that
defines only its own block will silently do nothing under an invert island.
Specificity is what makes the flip relative, so keep the shape exactly: grounds
that flip to light are two-attribute descendant selectors (0,2,0), which beat the
bare `[data-theme-invert]` in the dark block (0,1,0) that catches light and
unthemed grounds. Never collapse those into one list or reach for `!important`.

Contrasting cards need no extra tier — `data-theme-invert` flips an element to the
opposite of the ground it sits on, so a new mode only has to define its full alias
block plus that one invert selector.

## Per-theme overrides (only if needed)

If the design assigns a theme role a swatch swap can't express — the brand section
should use a darker background, or the heading accent differs by mode — add a
`themeColors` object scoped by theme block:

```json
{ "themeColors": { "brand": { "--background": "var(--color-brand-600)" } } }
```

Prefer swatch changes; reach for this only for genuine structural overrides.

## Fluid type scale

Every heading/text tier is fluid: its `clamp()` is computed from a
`--{tier}-min` / `--{tier}-max` pair (in rem) in
[typography.css](../../../../src/styles/variables/typography.css). Show the user
the current min→max for the key tiers and ask whether the new brand wants
larger/smaller:

- **Headings:** `h1` 2.25→3.5, `h2` 2→3, `h3` 1.75→2.5, `h4` 1.5→2, `h5` 1.25→1.5, `h6` 1.125→1.25
- **Body:** `text-regular` 1→1.125, `text-large` 1.125→1.25, `text-xlarge` 1.25→1.5 (`text-small`/`text-tiny` fixed)
- **Display** (only if the fork uses them): `display-xl` 3→6, `display-lg` 3→5, `display-md` 3→4.5, `display-sm` 2.75→4

Pass changes as a `fluidType` object — `{ "h1": { "min": 2.5, "max": 4 } }`. Set
only the tiers that change; the `clamp()` recomputes from the min/max. **Never
hand-edit the clamp expression.** (`min` = size at 320px, `max` = size at 1440px.)

## Fonts

Fonts use the **Astro Fonts API**, not raw `@font-face`. The registry is the
`fonts` array in [astro.config.mjs](../../../../astro.config.mjs) — three families
today: `--font-bdo-grotesk` (primary), `--font-inter` (secondary),
`--font-ibm-plex-mono` (tertiary, eyebrows). There is no font stylesheet;
[variables/typography.css](../../../../src/styles/variables/typography.css) just
maps those variables onto `--font-primary` / `--font-secondary` / `--font-tertiary`.

If the user names new typefaces:

1. **Get the files into the repo.** For self-hosted fonts, have the user add the
   `.woff2` files to [src/assets/fonts/](../../../../src/assets/fonts/) (you can't
   receive binary uploads — tell them the exact folder, or they can commit them).
   Prefer variable `.woff2`. Alternatively switch a family to a hosted provider
   (`fontProviders.google()` etc.) — then no files are needed.
2. **Edit the `fonts` array** in astro.config.mjs: set each family's `name`,
   `cssVariable`, and the `variants` (weight/style/`src` paths). Keep the
   `cssVariable` names unless you also update everything that references them.
3. **If you renamed a `cssVariable`,** update the three `<Font cssVariable=… />`
   preloads in [Head.astro](../../../../src/components/global/Head.astro) **and**
   the `--font-primary/secondary/tertiary` family stacks in typography.css. If you
   kept the names, nothing else to touch.
4. **Build to verify** the fonts resolve (`npm run build`).
