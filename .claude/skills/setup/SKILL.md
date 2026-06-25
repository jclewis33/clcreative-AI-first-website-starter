---
name: setup
description: Walk a forked copy of this Astro + Sanity + Cloudflare starter through first-time project setup. Use when the user forks/duplicates this repo for a NEW site and says "set up this project/fork", "/setup", "initialize this starter", "rebrand this for my new client", "stand up the Sanity project", or asks how to get a forked copy running. Orchestrates the deterministic `npm run setup` CLI (file edits) PLUS the cross-system work a script can't do: creating the new Sanity project + dataset via MCP, deploying its schema, adding CORS origins, then verifying with a build and printing the human-only dashboard checklist.
license: MIT
---

# Fork Setup — turn this starter into a new project

## When to use this skill

The user has **forked or duplicated this repo** to start a new site and wants it
configured for their brand/business. This repo ships with **placeholder** identity
values; setup swaps in the real identity, stands up a fresh (empty) Sanity backend,
and verifies the build. The components and page structure stay — only identity,
config, and the Sanity project change.

**Run this on your own fork/duplicate, not the canonical starter-template repo.**
First confirm this is a fresh, not-yet-configured copy: check `git remote -v` (it
should be the user's own repo, not the upstream starter template) and that
`src/config/site.shared.mjs` still holds the placeholder values
(`SANITY_PROJECT_ID = "your-sanity-project-id"`, `SITE_URL = "https://www.example.com"`).
If the remote points at the upstream starter-template repo (and the user hasn't
said they're testing), stop and ask before writing changes into it.

## Scope — re-value and swap content; never touch the system

This project is a **deliberate system of guardrails** — the class-naming
conventions, the CSS variable architecture (colors / themes / typography /
spacing / layout), the typed component APIs, the utility/combo class rules, the
single-source config files, and the conventions in [CLAUDE.md](../../../CLAUDE.md).
That system is what keeps every future AI edit consistent. **Setup must not change
any of it.** Its only job is to:

- **Re-value existing knobs in place** — the *values* of variables and config
  fields that already exist (identity, Sanity ids, brand swatches, type scale).
- **Swap the person's own content & assets in/out** — their copy, fonts, logo, OG
  image, pages, FAQs; replace the placeholder values.

It must **NOT change how the system works**:

- no ad-hoc CSS, no hard-coded hex on a theme block or component, no parallel
  mechanism that does the same job a different way;
- don't rename, restructure, or change how the existing variables / themes /
  typography / spacing **compute**, or alter selectors, layout, or component
  internals;
- don't edit [CLAUDE.md](../../../CLAUDE.md) or any convention/guardrail doc, the
  component library, or the `check:*` / build scripts that enforce the system;
- don't refactor, reformat, "improve," or "tidy" anything beyond the targeted
  value swaps and the person's content/assets.

**Strongly prefer what the starter already provides; adding is rare.** The default
is to map the new brand into the existing structure — e.g. the three theme modes
(**light / brand / dark**) — and stay within it. Don't invent things outside the
guardrails, and equally **don't force the user to fabricate values or modes they
don't have** (if a brand is "just light and dark," don't make them concoct a brand
palette — see step 1a). Only in **rare, legitimate cases** do you add something new.

**When you do add, only the established way.** If setup genuinely needs something
the starter doesn't have (an extra brand color, a new swatch, another theme mode),
it must be added the **exact same way** the existing light/dark/brand colors are
added, so it works identically to everything else and the next AI edit treats it
the same. Concretely: put it in
the **same file**, follow the **same naming convention**, use the **same
derivation** (a new brand scale uses the same `color-mix` steps as
`--color-brand-100…900`; a new theme mode replicates a full `[data-theme]` block
with every semantic alias `var()`-ing the swatches, plus its `--surface-*` tier),
and keep the **same cascade** (swatch → theme alias → component → `--surface-*`).
**Copy an existing example as the template — never invent a different approach.**
If you're unsure how the pattern extends, ask the user rather than guessing.

The deterministic `npm run setup` CLI stays strictly in the *re-value* lane: it
writes a fixed allowlist of files and only *replaces declarations that already
exist*, skipping (never adding) anything it can't find. So any genuinely new
token/theme is a **manual edit you make by copying the existing pattern** — not
something the CLI bolts on.

## What's automatable vs. not

| Step | How |
|---|---|
| All identity/config file edits | `npm run setup` CLI (deterministic — you drive it) |
| Create Sanity project + `production` dataset | Sanity MCP `create_project` / `create_dataset` |
| Deploy the schema to the new project | Sanity MCP `deploy_schema`, or `npx sanity schema deploy` |
| Deploy the hosted Studio | Sanity MCP `deploy_studio`, or `npx sanity deploy` |
| Add CORS origins | Sanity MCP `add_cors_origin` |
| Verify config + build | `npm run check:config`, `npm run build` |
| Sanity **Viewer token** | ⚠️ Manual — no MCP tool. Guide the user to create it. |
| Cloudflare worker / domain / **encrypted secret** / **WAF rule** | ⚠️ Manual dashboard work. Guide + verify. |
| GitHub Dependabot toggles / account push-protection | ⚠️ Manual dashboard work. Guide. |

The single source of truth for the manual pieces is
[docs/new-project-checklist.md](../../../docs/new-project-checklist.md) — read it,
and point the user there for anything you can't do for them.

## Procedure

Work top to bottom. Confirm each external action before taking it.

### 0. Preflight
- Confirm this is a fork (see guard above).
- Check the Sanity MCP is connected and the user is authenticated: call
  `whoami`. If not connected/authed, tell the user to connect the Sanity MCP (or
  fall back to the `npx sanity` CLI for the Sanity steps).
- Read [docs/new-project-checklist.md](../../../docs/new-project-checklist.md) for
  the current per-fork specifics and any updated dependency pins.

### 1. Gather identity (conversational)
Collect the values the CLI needs. **You may draft copy** (tagline, descriptions,
`summary`) and propose it — don't force the user to write everything. Smart
defaults: derive `studioHost` and the Cloudflare worker `name` from a slug of the
site name; build `phone.e164`/`tel` from the display number; default
`dataset` to `production` and `apiVersion` to the value already in
`site.shared.mjs`.

Required: site name, site URL (no trailing slash), email, founder, brand hex.
Optional (keep current if blank): tagline, descriptions, X handle, phone, hours,
address (locality/region/country), priceRange, GTM/MailerLite/Usercentrics/
HoneyBook ids.

> **Site URL before the real domain exists — a staging `*.workers.dev` URL is a
> valid answer.** A fork can deploy and run (including Sanity Presentation) on the
> Worker's free `https://<worker>.<account>.workers.dev` URL before any custom
> domain is attached. If the user doesn't have the real domain yet, set `siteUrl`
> to the staging Worker URL now — no logic changes, and **no code edit is needed
> to switch later**: `SITE_URL` is env-overridable at deploy time (see
> `src/config/site.shared.mjs`), so at launch they just change the Cloudflare
> `SITE_URL` build var to the real origin and redeploy. The full per-client
> staging→production runbook is **§4a "Staging-first deploy"** in
> [docs/new-project-checklist.md](../../../docs/new-project-checklist.md); surface
> it whenever the domain isn't ready.

> **⚠️ Always ask about fonts and font sizes — do not skip.** Steps **1b (fonts)**
> and **1c (fluid type scale)** below are **required parts of this conversational
> gather, not optional add-ons.** Even if the user only gives you the identity
> values above, you **must** explicitly ask:
> 1. **Which typefaces** the new brand uses (or confirm they want to keep the
>    starter's BDO Grotesk / Inter / IBM Plex Mono) — step 1b.
> 2. **Whether the heading & body sizes** should change from the default fluid type
>    scale, showing them the current min→max values — step 1c.
>
> A fork that ships with the wrong fonts or wrong type scale looks unbranded, so
> surface both questions every run. Don't assume the defaults are wanted — ask, then
> apply what they choose (fonts via astro.config.mjs, sizes via the `fluidType`
> CLI map).

> **Always recommend a starter meta description — don't leave the placeholder.**
> From what you learn about the business, **draft and propose** a sitewide default
> meta description (the `defaultDescription` field → `SITE.defaultDescription`,
> the fallback for any page that doesn't set its own and a key SEO signal). Give
> the user a concrete line to start from rather than a blank prompt; refine it with
> them. Guidelines:
> - **≤ 155 characters** (Google truncates beyond that), one sentence.
> - Lead with **what the business does + for whom**, weave in the primary
>   keyword/service and location naturally (no keyword stuffing), end with a light
>   value or CTA.
> - Distinct from the `tagline` (short, for the `<title>`) and the `summary`
>   (one-liner for JSON-LD / llms.txt) — but draft all three together so they're
>   consistent. Template: *“{Service} for {audience} in {place} — {differentiator}.”*
>   e.g. *“Custom Webflow design and development for growth-stage businesses ready
>   to scale.”*
>
> Offer (don't force) to also draft starter `description`s for the key pages in
> [site-structure.ts](../../../src/data/site-structure.ts) `PAGES` (the `desc`
> field, which also feeds llms.txt) so the new site isn't shipping the placeholder
> page copy — flag that those still hold placeholder text.

> **Integrations:** GTM, MailerLite, Usercentrics, and HoneyBook ids in
> `SITE.integrations` all ship **blank (`""`) = off**. Fill in the ones the new
> site uses (Head.astro only injects each script when its id is set). To drop one
> permanently, delete the field + its use in `Head.astro` / `BaseLayout.astro`;
> the two `HoneyBookEmbed*` components ship unused — wire one in or delete them.

#### 1a. Brand colors — pull from Figma (optional)
If the user has a Figma file / design system, offer to pull the palette instead of
asking them to type hex codes.

1. **Find a Figma MCP.** Run `ToolSearch` for `figma colors variables styles`
   (the Figma Dev Mode MCP and community servers expose color tokens under
   varying names — e.g. `get_variable_defs`, `get_variables`, `get_figma_data`).
   If none is connected, fall back: ask the user to paste the hex values, or share
   a Figma link/screenshot you can read swatches from.
2. **Read the color tokens.** Ask for the Figma file URL or current selection, then
   call the discovered tool to get the color variables/styles (name → value).
3. **Map tokens to this project's swatches** — and understand the architecture
   first: **`--color-brand-500` is the one knob.** The whole `--color-brand-100…900`
   scale is derived from it via `color-mix` in
   [colors.css](../../../src/styles/variables/colors.css), and **themes.css
   references the raw swatches** (`--background: var(--color-light-200)`,
   `--heading-accent: var(--color-brand-500)`, …). So setting the base swatches
   re-skins the light/dark/brand themes **automatically** — do **not** try to set
   `brand-100…900` individually.

   | Figma role | Swatch (`cssColors` key) |
   |---|---|
   | Primary brand / accent | `--color-brand-500` (also mirrored to `SITE.brand.color`) |
   | Darkest neutral / near-black | `--color-dark-900` |
   | Secondary dark | `--color-dark-800` |
   | White / lightest | `--color-light-100` |
   | Off-white surface | `--color-light-200` |

   Pass these as a `cssColors` object in the CLI config (step 3). Confirm the
   mapping with the user before writing.
4. **Map by role, not 1:1 — and keep the same idea.** A brand's palette will
   almost never line up exactly with these swatch names, and that's fine. Map each
   Figma color to the swatch whose **role** it plays (their primary/accent →
   `--color-brand-500` even if they call it "accent"; their darkest neutral →
   `--color-dark-900`; etc.) — you're fitting their colors into the existing
   structure, not renaming the structure to match Figma. What must stay intact is
   the **idea/cascade** the project is built on:

   > raw swatch (colors.css) → theme alias that `var()`s the swatch (themes.css)
   > → component/utility that `var()`s the alias → contrasting cards via the
   > `--surface-*` tier.

   Always feed colors in at the swatch layer and let them flow down that chain;
   never hard-code a hex onto a theme block or component.

   **Default to the three shipped modes — light / brand / dark — and try hard to
   stay within them.** They are the baseline; map every brand into these first.
   Two rules keep this from becoming forced or over-built:

   - **Don't make the user invent colors they don't have.** `--color-brand-500` is
     the **primary/accent**, used across *all* modes (heading accents, primary
     buttons, selection) — every brand has one, so always set it. That's separate
     from the **`brand` theme mode** (the orange-background sections). If a brand
     is "just light and dark" with no brand-colored sections, that's fine: set
     their accent as `--color-brand-500` and **leave the `brand` mode defined and
     simply unused** — don't fabricate a brand palette, and don't delete the mode
     (deleting is restructuring). Likewise, if they have no distinct
     secondary-dark/etc., leave that swatch as-is rather than demanding a value.
   - **Only add or drop a mode for a rare, legitimate reason** — and only with the
     user's say-so. If they genuinely need a 4th mode, add it the **same exact way**
     the others exist: replicate a full `[data-theme]` block (every semantic alias
     + the `--surface-*` tier) by copying an existing block as the template, and a
     new swatch goes in [colors.css](../../../src/styles/variables/colors.css) with
     the same naming and (if a scale) the same `color-mix` derivation as
     `--color-brand-100…900`, reaching components only through the cascade. Don't
     reinvent a different approach. Dropping a mode is likewise rare and structural
     — discuss it; the default is to keep all three defined even if one goes unused.
5. **Per-theme overrides (only if needed).** If the design assigns a theme role that
   a swatch swap can't express — e.g. the brand section should use a darker bg, or
   the heading accent differs by mode — add a `themeColors` object scoped by theme
   block (`light`/`dark`/`brand`), e.g.
   `{ "brand": { "--background": "var(--color-brand-600)" } }`. Prefer swatch
   changes; reach for this only for genuine structural overrides.

#### 1b. Fonts — swap in the project's typefaces (REQUIRED ASK)
**Always ask this — never silently keep the defaults.** Fonts use the **Astro
Fonts API**, not raw `@font-face`. The registry is the
`fonts` array in [astro.config.mjs](../../../astro.config.mjs) — three families
today: `--font-bdo-grotesk` (primary), `--font-inter` (secondary),
`--font-ibm-plex-mono` (tertiary, eyebrows). [fonts.css](../../../src/styles/fonts.css)
is just a doc comment.

**Ask the user which typefaces the new brand uses** (primary / secondary / mono,
or confirm they want to keep BDO Grotesk / Inter / IBM Plex Mono). If they name new
fonts, then:
1. **Get the files into the repo.** For self-hosted fonts, have the user add the
   `.woff2` files to [src/assets/fonts/](../../../src/assets/fonts/) (you can't
   receive binary uploads — tell them the exact folder, or they can commit them).
   Prefer variable `.woff2`. Alternatively switch a family to a hosted provider
   (`fontProviders.google()` etc.) — then no files are needed.
2. **Edit the `fonts` array** in astro.config.mjs: set each family's `name`,
   `cssVariable`, and the `variants` (weight/style/`src` paths). Keep the
   `cssVariable` names unless you also update everything that references them.
3. **If you renamed a `cssVariable`,** update the three `<Font cssVariable=… />`
   preloads in [Head.astro](../../../src/components/global/Head.astro) **and** the
   `--font-primary/secondary/tertiary` family stacks in
   [typography.css](../../../src/styles/variables/typography.css). If you kept the
   names, nothing else to touch — every `--{tier}-font-family` already points at
   those stacks.
4. **Build to verify** the fonts resolve (`npm run build`).

#### 1c. Fluid type scale — ask about heading & body sizes (REQUIRED ASK)
**Always ask this — never silently keep the defaults.** Every heading/text tier is
fluid: its `clamp()` is computed from a
`--{tier}-min` / `--{tier}-max` pair (in rem) in
[typography.css](../../../src/styles/variables/typography.css). **Ask the user**
whether the default scale works or the new brand wants larger/smaller headings or
body — show them the current min→max for the key tiers:

- Headings: `h1` 2.25→3.5, `h2` 2→3, `h3` 1.75→2.5, `h4` 1.5→2, `h5` 1.25→1.5, `h6` 1.125→1.25
- Body: `text-regular` 1→1.125, `text-large` 1.125→1.25, `text-xlarge` 1.25→1.5, `text-small`/`text-tiny` fixed
- Display (only if the fork uses them): `display-xl` 3→6, `display-lg` 3→5, `display-md` 3→4.5, `display-sm` 2.75→4

Pass any changes as a `fluidType` object in the CLI config (step 3) — e.g.
`{ "h1": { "min": 2.5, "max": 4 }, "text-regular": { "min": 1, "max": 1.2 } }`.
Set only the tiers that change; the `clamp()` recomputes from the min/max — never
hand-edit the clamp expression. (`min` = size at 320px, `max` = size at 1440px.)

#### 1d. Brand assets — OG image, favicon, logos
These are binary/vector swaps you guide (the CLI auto-syncs only the logo's
accessible `LOGO_LABEL` to the site name). Tell the user exactly what to replace —
keep the **filenames** and nothing else needs touching; if they rename, update the
matching `SITE.*Path` in [site.ts](../../../src/config/site.ts). **Swap every one of
these — don't leave any placeholder logo behind.**

| Asset | File (in [public/images/](../../../public/images/)) | Notes |
|---|---|---|
| Open Graph image | `og-image.png` (`SITE.ogImagePath`) | 1200×630, the social-share card |
| Favicon | `favicon.png` (`SITE.logoPath` — also the JSON-LD logo) | **square** |
| Apple touch / web clip | `webclip.png` (`SITE.appleTouchIconPath`) | **square**, 180×180 |

> **If the brand logo isn't square, make a square version.** The favicon, the
> webclip, and the Sanity Studio badge (step 1e) all render in square tiles. If the
> user only has a wide/horizontal logo, **generate a square asset yourself** — take
> the symbol/monogram alone (drop the wordmark) and center it on a tight transparent
> square, or center the full logo on a square canvas with even padding (it will
> letterbox — fine, but a square mark fills best). The Pillow trim/center script in
> step 1e produces exactly this; reuse it for the favicon/webclip too.

**Inline logo (the nav/footer wordmark)** is vector path data in
[src/config/logo-paths.ts](../../../src/config/logo-paths.ts) — `LOGO_MARK_PATHS`
(the monogram), `LOGO_WORDMARK_PATHS` (the wordmark), and `LOGO_VIEWBOX`. To
re-brand it, replace those `d=…` path strings (and the viewBox) from the new
logo's SVG; the front-end [Logo.astro](../../../src/components/global/Logo.astro)
renders from this file. The CLI already updates `LOGO_LABEL` to the new site name.
**The Sanity Studio logo + dashboard icon are a separate job** — see step 1e (the
starter ships them reading from `logo-paths.ts`, but the dashboard rail icon needs
the self-contained data-URI approach below, so re-point them per 1e during setup).

#### 1e. Sanity Studio branding — navbar logo + dashboard rail icon
Make the fork's Studio show **the project's own logo in BOTH places:** (1) the
Studio **navbar** (top-left inside the studio app), and (2) the Sanity **dashboard
app rail** (the vertical icon strip in the outer `www.sanity.io` dashboard shell,
one icon per deployed studio). The starter ships placeholder versions of these two
components reading from `logo-paths.ts`; this step replaces them with the
data-URI approach that the dashboard rail requires. **Apply this during setup;
verify it after `npx sanity deploy` (step 4).**

**Why this is tricky (the mechanism — do not skip).** The dashboard does NOT render
your icon component live. Per Sanity's docs (`/docs/dashboard/dashboard-configure`):
- The workspace `icon` from `sanity.config.ts` is **extracted into the studio
  manifest** (`<host>.sanity.studio/static/create-manifest.json`,
  `workspaces[0].icon`) on every `npx sanity deploy`.
- The dashboard then renders that icon inside a **sandboxed `srcdoc` iframe** whose
  stylesheet forces `svg { width:100%; aspect-ratio:1 }`.

Hard rules that follow:
- The icon MUST be a **static, self-contained SVG** (no hooks, context, imports of
  external values, or dynamic logic).
- Size it with the `width`/`height` **ATTRIBUTES** (`width="1em" height="1em"`) plus
  a `viewBox`. Do NOT use an inline `style` for size — it beats the iframe's
  stylesheet and pins the icon tiny.
- Do NOT use an `<img>` for the icon — the iframe's `svg{width:100%}` rule doesn't
  target `<img>`, so it renders at intrinsic (tiny) size, and a bundled asset URL
  404s in the dashboard's outer document.
- A raster logo CAN be used by embedding it as a base64 data URI inside an
  `<svg><image href="data:..."/></svg>` — the data URI is self-contained, so it
  serializes into the manifest and renders in the sandbox. (A pure-vector inline
  `<svg>` works too and is crisper — if the brand has clean vector paths, keep the
  `logo-paths.ts` inline-`<svg>` approach instead; the data-URI route below is for
  raster/webclip-only logos.)

**Input:** a square logo badge PNG with the logo centered — in this starter,
`public/images/webclip.png` (the apple-touch/webclip image, step 1d). A wide logo
will letterbox in the square tile; a square mark fills best.

**Step 1 — generate the trimmed square data URI.** The source badge usually has
built-in transparent padding, making the logo float small in the tile. Trim it to
its content bbox, re-center on a tight square, embed as base64. Requires Pillow
(`python3 -m pip install --user Pillow`). This WRITES
`src/sanity/components/studioIconData.ts`:

```bash
python3 - <<'PY'
from PIL import Image
import base64, io
src = Image.open("public/images/webclip.png").convert("RGBA")
logo = src.crop(src.getbbox())            # trim transparent padding
w, h = logo.size
margin = round(0.05 * max(w, h))
side = max(w, h) + 2 * margin
canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
canvas.paste(logo, ((side - w)//2, (side - h)//2), logo)   # center on tight square
buf = io.BytesIO(); canvas.save(buf, "PNG", optimize=True)
b64 = base64.b64encode(buf.getvalue()).decode()
open("src/sanity/components/studioIconData.ts","w").write(
'/**\n * Square brand badge for the Studio workspace `icon` + navbar logo, as a\n'
' * base64 data URI. Derived from the square webclip with padding trimmed and the\n'
' * logo re-centered on a tight square. Data URI (not an asset import) because the\n'
' * dashboard serializes the icon into its manifest and renders it in a sandboxed\n'
' * iframe where a bundled URL 404s. Regenerate with the Pillow trim script.\n */\n'
'export const STUDIO_ICON_DATA_URI =\n  "data:image/png;base64,' + b64 + '";\n')
print("wrote studioIconData.ts; square side =", side)
PY
```

**Step 2 — `StudioIcon.tsx` (dashboard rail icon): inline SVG, attribute-sized.**
Set the `viewBox` and `<image>` width/height to the square `side` **the script
printed** (it's `132` below only as an example — substitute the printed value).

```tsx
import { STUDIO_ICON_DATA_URI } from "./studioIconData";

export function StudioIcon() {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 132 132"            /* match the square `side` from step 1 */
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="<Brand> icon"
    >
      <image href={STUDIO_ICON_DATA_URI} x={0} y={0} width={132} height={132} />
    </svg>
  );
}
export default StudioIcon;
```

**Step 3 — `StudioLogo.tsx` (navbar): plain `<img>` is fine here.** The navbar
renders in-app (NOT serialized, NOT sandboxed), so an `<img>` data URI works and is
simplest.

```tsx
import { STUDIO_ICON_DATA_URI } from "./studioIconData";

export function StudioLogo() {
  return (
    <img
      src={STUDIO_ICON_DATA_URI}
      alt="<Brand> logo"
      style={{ height: "32px", width: "auto", display: "block" }}
    />
  );
}
export default StudioLogo;
```

**Step 4 — wire them in `sanity.config.ts`** (already wired in the starter; confirm
the imports still resolve after the edits above):

```ts
import { StudioLogo } from "./src/sanity/components/StudioLogo";
import { StudioIcon } from "./src/sanity/components/StudioIcon";

export default defineConfig({
  // ...
  icon: StudioIcon,                              // DASHBOARD RAIL icon (serialized to manifest)
  studio: { components: { logo: StudioLogo } },  // NAVBAR logo
});
```

**Step 5 — deploy & VERIFY (in step 4 below; do not skip the manifest check).**
After `npx sanity build` + `npx sanity deploy`, confirm the icon serialized as an
inline `<svg>` (NOT an `<img>`, NOT empty):

```bash
curl -s "https://<your-studio-host>.sanity.studio/static/create-manifest.json" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['workspaces'][0]['icon'][:200])"
```

Expected output begins with:
`<svg width="1em" height="1em" viewBox="0 0 132 132" ...><image href="data:image/png;base64,...`
If it shows an `<img …>` or is empty, the rail icon will be broken/tiny.

**Gotchas to tell the user:**
- Changes only appear after `npx sanity deploy`; the dashboard caches the rail icon
  hard — hard-refresh (Cmd/Ctrl+Shift+R), possibly twice.
- A wide (non-square) logo sits centered with space above/below in the square tile —
  inherent, not a bug. For edge-to-edge fill, supply a square mark (symbol only, no
  wordmark).

### 2. Create the Sanity project (MCP)
1. `list_organizations` → pick the target org (ask if more than one).
2. `create_project` with the site name as the title.
3. `create_dataset` named `production`.
4. Capture the new **projectId** — it feeds the CLI and the `.env`.

If the Sanity MCP isn't available, have the user run `npx sanity init` and report
back the projectId.

### 3. Write the config files (CLI)
Write the gathered answers to a temp JSON and run the CLI non-interactively:

```bash
node scripts/setup.mjs --config /tmp/setup-answers.json --yes
```

Answer keys (all optional — omitted keys keep the current file value):
`siteName, siteUrl, email, founder, tagline, defaultDescription, summary,`
`localBusinessDescription, xHandle, phoneDisplay, phoneE164, phoneTel, hours,`
`addressLocality, addressRegion, addressCountry, priceRange, brandColor,`
`sanityProjectId, sanityDataset, sanityApiVersion, studioHost, workerName,`
`gtmId, mailerLiteAccount, usercentricsId, honeybookPlacementId`

Plus two optional color maps (from the Figma step, or set by hand):
- `cssColors` — raw swatches for colors.css, e.g.
  `{ "--color-brand-500": "#1a73e8", "--color-dark-900": "#0b1020" }`.
  `--color-brand-500` here overrides the scalar `brandColor` and feeds the
  `SITE.brand.color` mirror.
- `themeColors` — per-theme alias overrides for themes.css, scoped by block, e.g.
  `{ "brand": { "--background": "var(--color-brand-600)" } }`. Usually unneeded.
- `fluidType` — fluid type min/max knobs (step 1c), e.g.
  `{ "h1": { "min": 2.5, "max": 4 } }`.

The CLI rewrites `site.shared.mjs`, `site.ts`, `wrangler.jsonc`, `colors.css`,
`themes.css` (if `themeColors`), `typography.css` (if `fluidType`),
`logo-paths.ts` (the `LOGO_LABEL`), `sanity.cli.ts` (it clears `appId` — the new
project issues its own on first deploy), and creates `.env` (token left blank). It
warns and skips any swatch/theme/type var it can't find rather than failing.
Delete the temp JSON after. **Fonts and image/SVG assets (steps 1b/1d) are not
written by the CLI — guide those separately.**

> It deliberately **does not** touch the content scaffolding — `areaServed`,
> `social`, `sameAs`, FAQs, `site-structure.ts`. Per the starter design those
> stay as a working skeleton. **Remind the user** to review and replace that
> scaffolding (service-area cities, social links, FAQ copy) for their business —
> it currently holds placeholder values.

### 4. Deploy the schema + Studio, then verify it's correct
This is the load-bearing step — get it right so the new project's Studio and the
site's queries actually work. **Prerequisite:** step 3 already pointed
`sanity.cli.ts` / `site.shared.mjs` at the new `projectId` + `dataset`, so the
Sanity CLI now targets the new project. Make sure you're logged in to the same
Sanity account that owns it (`npx sanity login` if needed). **Also apply the Studio
branding (step 1e) before this deploy** — the workspace `icon` is extracted into the
manifest *at deploy time*, so the navbar logo + dashboard rail icon must already be
in place when you run `npx sanity deploy`.

1. **Validate the schema compiles first** — catch errors before they hit the new
   project: `npx sanity build` (compiles the Studio incl. the schema). Fix any
   schema error before deploying. The schema is 13 types defined in
   [src/sanity/schemaTypes/](../../../src/sanity/schemaTypes/) (`index.ts` is the
   registry) — don't edit them to set up a fork; they ship ready.
2. **Deploy the schema manifest:** `npx sanity schema deploy`. This publishes the
   schema to the project so Presentation overlays, TypeGen, and the Sanity MCP
   `get_schema` can read it. (The MCP `deploy_schema` tool is an alternative if the
   CLI isn't available — but prefer the CLI, which uses `sanity.cli.ts`.)
3. **Deploy the hosted Studio:** `npx sanity deploy` → publishes to
   `https://<studioHost>.sanity.studio`. Grab the issued **appId**, write it into
   `deployment.appId` in [sanity.cli.ts](../../../sanity.cli.ts) (step 3 cleared
   it), and commit — so future deploys target the same app.

   > **⚠️ Deploying staging-first?** If the site lives on a staging
   > `*.workers.dev` URL (no real domain yet — see step 1), the Studio's
   > Presentation must point there, so deploy with `SANITY_STUDIO_PREVIEW_URL` set
   > **on the same line before `npx`**:
   > ```bash
   > SANITY_STUDIO_PREVIEW_URL=https://<worker>.<account>.workers.dev npx sanity deploy
   > ```
   > A plain `npx sanity deploy` bakes in the `SITE_URL` fallback (the
   > not-yet-existing production domain) and Presentation will load that instead of
   > staging. At launch, redeploy the Studio with `SANITY_STUDIO_PREVIEW_URL` set to
   > the real origin (or unset it to fall back to the now-correct `SITE_URL`). The
   > code already trusts any `https://*.workers.dev` origin via `allowOrigins` in
   > [sanity.config.ts](../../../sanity.config.ts) — no per-fork edit. Full runbook:
   > §4a in [docs/new-project-checklist.md](../../../docs/new-project-checklist.md).
4. **Verify the schema landed correctly** (don't skip — this is the whole point):
   - Sanity MCP `get_schema` on the new project should list **all 13 types**:
     `author, blogCta, blogCtaInline, blogFaq, blogPost, callout, caseStudy,
     ctaSection, glossaryTerm, seo, siteSettings, testimonial, videoEmbed`.
   - Open `https://<studioHost>.sanity.studio` → the desk shows **Site Settings**
     (pinned singleton) on top, then **Blog Posts / Case Studies / Glossary Terms**,
     then the **Reusable Content** and **People & Social** folders. If a type is
     missing from the desk, it's not in the `structureTool` resolver in
     [sanity.config.ts](../../../sanity.config.ts) — but for an unmodified fork it's
     already complete.
   - **`apiVersion` consistency:** the queries/Studio pin `2025-03-15`. If you
     changed `sanityApiVersion` in step 3, also update the matching literals in
     `sanity.config.ts` (`STRUCTURE_API_VERSION`, `visionTool` default) and
     `astro.config.mjs` so they agree.
5. **Verify the Studio branding landed** (step 1e) — check the deployed manifest
   serialized the icon as an inline `<svg><image href="data:…">` (not an `<img>`,
   not empty), then hard-refresh the dashboard rail:
   ```bash
   curl -s "https://<studioHost>.sanity.studio/static/create-manifest.json" \
     | python3 -c "import sys,json; print(json.load(sys.stdin)['workspaces'][0]['icon'][:200])"
   ```
   And confirm the navbar logo shows the brand mark inside the Studio.

> **No content seeding required.** A fresh project is empty and the site is
> null-safe — `siteSettings` is queried with `?.… ?? null`, so pages render
> default CTAs/empty states and the build passes (verified in step 7). Optionally,
> offer to seed an initial **Site Settings** document (MCP `create_documents` +
> `publish_documents`) so editors don't start from nothing — but it's not needed
> for the site to work; opening "Site Settings" in Studio creates it on first edit.

> **When the fork later adds a new document type:** per CLAUDE.md, do all four —
> add it to `schemaTypes/index.ts`, an `S.listItem()` in the desk resolver, an
> `icon`, and a Presentation location in `resolve.ts` — or it won't show in the
> desk / preview. Setup itself doesn't require this; it's for future schema work.

### 5. CORS origins (MCP)
Add all four to the new project (with credentials allowed):
`https://www.<newdomain>`, `https://<studioHost>.sanity.studio`,
`http://localhost:4321`, `http://localhost:3333`. Use `add_cors_origin` per
origin. `npx sanity deploy` usually adds the studio host automatically — verify.

> **Staging-first:** if the site is on a staging `*.workers.dev` URL (step 1), add
> `https://<worker>.<account>.workers.dev` as a CORS origin **with credentials
> allowed** too — Presentation's draft fetches are credentialed and will fail
> without it. At launch, add the real `https://www.<newdomain>` the same way.

### 6. Sanity Viewer token (manual — guide)
There's no MCP tool to mint tokens. Tell the user: sanity.io/manage → the new
project → API → Tokens → create a **Viewer** token. Put it in `.env` as
`SANITY_API_READ_TOKEN`, and later add it as a Cloudflare **encrypted secret**
(never a plain wrangler var).

### 7. Verify
```bash
npm run check:config   # wrangler ↔ site.shared.mjs agree
npm run build          # full build (re-queries Sanity; empty project is fine)
```
Fix anything that fails before handing off. A brand-new empty Sanity project
builds clean — content routes just render empty states.

### 8. Hand off the dashboard checklist (manual)
You cannot click these; list them and point at the checklist:
- **Cloudflare** (§4): create the worker + connect the repo, set `vars`, add
  `SANITY_API_READ_TOKEN` as an encrypted secret, attach the domain, "Always Use
  HTTPS" on, and the **WAF rate-limit rule** for any public POST endpoint.
  - **Shipping before the real domain?** Point at **§4a "Staging-first deploy"**:
    create the SESSION KV namespace + pin its id, set the `SITE_URL` build var to
    the staging `https://<worker>.<account>.workers.dev` URL, toggle the Production
    `workers.dev` route on, add that URL to Sanity CORS, and deploy the Studio with
    `SANITY_STUDIO_PREVIEW_URL` pointed at it (step 4 above). At launch, swap the
    `SITE_URL` build var to the real origin and redeploy — no code commit.
- **GitHub** (§5): enable Dependabot alerts/security updates/malware
  alerts/grouped updates; account-level push protection.
- **Email/lead-capture** (§6): Resend + MailerLite keys/secrets, or drop the
  scorecard if unused.
- **CSP `frame-ancestors`** (§3.5): already correct in code — verify Presentation
  loads in Chrome after deploy.

Then run the **§7 post-launch verification** curl block from the checklist.

## Done criteria
- New Sanity project + `production` dataset exist.
- **Schema deployed and verified** — `npx sanity schema deploy` ran, `get_schema`
  (or the live desk) shows all 13 types, and the Studio desk renders with the
  Site Settings singleton + content lists.
- Studio deployed to `<studioHost>.sanity.studio`; the issued `appId` is written
  back into `sanity.cli.ts` and committed.
- Config files carry the new identity; `npm run check:config` and `npm run build`
  pass.
- **Fonts and font sizes were explicitly discussed** (steps 1b/1c) — the user
  either confirmed the starter defaults or supplied new typefaces / a new fluid
  type scale, and those were applied.
- **Brand assets swapped** (steps 1d/1e) — OG image, favicon, and webclip replaced
  (square versions generated where the logo isn't square), the front-end wordmark
  re-pointed, and the **Sanity Studio navbar logo + dashboard rail icon** show the
  brand mark — verified via the deployed `create-manifest.json` (inline `<svg>`, not
  an `<img>`).
- CORS origins added; Viewer token created and placed.
- The user has the residual Cloudflare/GitHub dashboard list and knows the content
  scaffolding still needs their copy.
