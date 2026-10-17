---
name: setup
description: Walk a forked copy of this Astro + Cloudflare starter through first-time project setup, ending at a deployed site. Use when the user forks/duplicates this repo for a NEW site and says "set up this project/fork", "/setup", "initialize this starter", "rebrand this for my new client", "stand up the Sanity project", or asks how to get a forked copy running. Orchestrates the deterministic `npm run setup` CLI (file edits) plus the cross-system work a script can't do — brand, fonts, assets, photography, the optional Sanity CMS branch, the CI gate, and the Cloudflare deploy.
license: MIT
---

# Fork Setup — turn this starter into a new project

You are the **orchestrator**. This file is the spine: it asks the questions that
decide what work exists, runs the common path, and hands off to a reference file
whenever a step needs depth. Read a reference **only when you reach its step** —
they are long on purpose so this file can stay short.

| Reference                                                    | Read it when                                            |
| ------------------------------------------------------------ | ------------------------------------------------------- |
| [references/brand-and-type.md](references/brand-and-type.md) | Mapping a real palette, Figma tokens, fonts, type scale |
| [references/no-cms.md](references/no-cms.md)                 | The fork keeps content in files (the default)           |
| [references/sanity.md](references/sanity.md)                 | The fork chooses Sanity                                 |
| `references/studio-branding.md`                              | Branding the Sanity Studio (installed by the add-on)    |
| [references/cloudflare.md](references/cloudflare.md)         | Deploying — every fork ends here                        |

## When to use this skill

The user has **forked or duplicated this repo** to start a new site. This repo
ships with **placeholder** identity values; setup swaps in the real identity,
optionally stands up a CMS, and gets the site deployed. The components and page
structure stay — only identity, config, assets, and the CMS change.

**Run this on your own fork/duplicate, not the canonical starter-template repo.**
Confirm this is a fresh, not-yet-configured copy: check `git remote -v` (it should
be the user's own repo) and that `src/config/site.shared.mjs` still holds the
placeholder `SITE_URL = "https://www.example.com"` and `addons/sanity/` is
present (setup deletes it). If the remote points at the upstream
starter template and the user hasn't said they're testing, stop and ask.

## Scope — re-value and swap content; never touch the system

This project is a **deliberate system of guardrails** — the class-naming
conventions, the CSS variable architecture, the typed component APIs, the
single-source config files, and the conventions in [CLAUDE.md](../../../CLAUDE.md).
That system is what keeps every future AI edit consistent. **Setup must not change
any of it.** Its only job is to:

- **Re-value existing knobs in place** — the _values_ of variables and config
  fields that already exist (identity, Sanity ids, brand swatches, type scale).
- **Swap the person's own content & assets in/out** — their copy, fonts, logo, OG
  image, photography, pages, FAQs.

It must **NOT change how the system works**:

- no ad-hoc CSS, no hard-coded hex on a theme block or component, no parallel
  mechanism that does the same job a different way;
- don't rename, restructure, or change how the existing variables / themes /
  typography / spacing **compute**, or alter selectors, layout, or component
  internals;
- **don't move a stylesheet between directories, and don't reorder the imports in
  [global.css](../../../src/styles/global.css)** — see the two rules below;
- don't edit [CLAUDE.md](../../../CLAUDE.md) or any convention doc, the component
  library, or the `check:*` / build scripts that enforce the system;
- don't refactor, reformat, "improve," or "tidy" anything beyond the targeted value
  swaps and the person's content/assets.

**Two structural rules govern where any CSS you touch lives:**

1. **A directory's name is its cascade layer.** `styles/variables/*` →
   `layer(variables)`, `styles/base/*` → `layer(base)`, `styles/utilities/*` →
   `layer(utilities)`; the full order is declared at the top of
   [global.css](../../../src/styles/global.css). A brand swatch goes in
   `variables/colors.css` because that is the variables layer — never in a
   component, a page sheet, or `overrides.css`. Import order _within_ the utilities
   layer is load-bearing; leave it alone.
2. **Component CSS is co-located, not in `styles/components/`.** Each component
   carries its styles in a `<style is:global>` block wrapping
   `@layer components { … }`. Only `forms.css` remains in `styles/components/`,
   because it has no single owning component. Don't
   create a new file there and don't add an import to global.css.

**Strongly prefer what the starter already provides; adding is rare.** Map the new
brand into the existing structure — the three theme modes (light / brand / dark) —
and stay within it. Equally, **don't force the user to fabricate values they don't
have**. When you genuinely must add something, add it the **exact same way** the
existing equivalents exist (same file, same naming, same derivation, same cascade)
— [references/brand-and-type.md](references/brand-and-type.md) has the full rules.
If you're unsure how a pattern extends, ask rather than guessing.

The deterministic CLI stays strictly in the _re-value_ lane: it writes a fixed
allowlist of files and only replaces declarations that **already exist**, skipping
(never adding) anything it can't find. Any genuinely new token is a manual edit you
make by copying the existing pattern.

## How to run this

> **Every step is MANDATORY to surface.** The user may decline any item ("skip that
> for now") — that's fine, and you record it — but you may **not** decide on their
> behalf that an item isn't worth bringing up. Track every decline, and present a
> "still needs doing" list in the final handoff. **Done** means every item was
> either completed or explicitly deferred, not that every item was done.

---

## Step 0 — Preflight

- Confirm this is a fork (see the guard above).
- Read [docs/new-project-checklist.md](../../../docs/new-project-checklist.md) for
  the current per-fork specifics and any updated dependency pins.

## Step 1 — Scope the project (the decision gate)

**Ask these before doing any work.** They decide which branches exist, so asking
them later means throwing work away.

### 1.1 — Content source: Files (default) or Sanity?

This is the big fork in the road. Content lives in local files by
default: Markdown/MDX and JSON in `src/content/`, validated at build, and
edited in the repo (the `content-files` skill; `docs/editing-content.md`
for clients). Sanity is an opt-in add-on (`addons/sanity/`) that
`npm run setup` installs when chosen.

Present it plainly:

> **Files (default).** The blog, case studies, projects, gallery and
> testimonials are files in the repo. Handing the site over is handing
> over the repo: no CMS account, tokens or webhooks. Edits go through git
> (or a client editing the files and pushing).
>
> **Sanity.** A hosted Studio for editors, draft preview inside it, and a
> publish → rebuild webhook. Adds a Sanity project, the Studio, a Viewer
> token, CORS setup and the rebuild-debounce Worker.

Then branch:

- **Files** → read [references/no-cms.md](references/no-cms.md). Pass
  `"contentSource": "files"` at Step 4; skip Step 5's Sanity work and the
  rebuild-debounce Worker at Step 7.
- **Sanity** → pass `"contentSource": "sanity"` at Step 4: the CLI
  installs the add-on before it writes anything. Then Step 5 runs
  [references/sanity.md](references/sanity.md). You need the projectId at
  Step 4, so create the project first (sanity.md §S1).

Adopting Sanity later stays possible: copy `addons/sanity/` from the
starter repo and run `npm run addon:sanity` (the add-on's README).

### 1.2 — Is the real domain ready?

If not, a staging `https://<worker>.<account>.workers.dev` URL is a **valid answer**
for `siteUrl` — no logic changes, and no code edit is needed to switch later
(`SITE_URL` is env-overridable at deploy time). See
[references/cloudflare.md](references/cloudflare.md) for the staging→production
runbook, and surface it whenever the domain isn't ready.

## Step 2 — Gather identity (conversational)

Collect the values the CLI needs. **You may draft copy** and propose it — don't
force the user to write everything. Smart defaults: derive `studioHost` and the
Cloudflare worker `name` from a slug of the site name; build `phone.e164`/`tel`
from the display number; default `dataset` to `production` and `apiVersion` to the
value in `addons/sanity/files/src/config/sanity.shared.mjs` (Sanity forks).

**Required:** site name, site URL, email, founder, brand hex.
**Optional** (keep current if blank): tagline, descriptions, X handle, phone,
hours, address (locality/region/country), priceRange, legal name (the SMS
consent wording), GTM/MailerLite/Usercentrics ids, GoHighLevel chat widget and
External Tracking ids.

> **⚠️ Four questions are REQUIRED every run — do not skip any.** These are what
> make a fork look like the user's site instead of the starter, and every one is
> invisible in the config the CLI writes:
>
> 1. **Which typefaces** the new brand uses (or confirm they're keeping BDO Grotesk
>    / Inter / IBM Plex Mono).
> 2. **Whether the heading & body sizes** should change from the default fluid type
>    scale — show them the current min→max values.
> 3. **Whether the brand color is light or dark**, which sets `--color-brand-text`
>    (the text painted on brand-colored sections). Get this wrong and the brand
>    sections ship unreadable — it does **not** follow from the brand hue.
> 4. **Whether they have their own photography** to replace the 20 stock
>    placeholders (Step 3).
>
> Don't assume the defaults are wanted. All four are detailed in
> [references/brand-and-type.md](references/brand-and-type.md) (1–3) and Step 3 (4).
> The user may decline any; record the declines for the handoff.

**Brand colors:** if the user has a Figma file, offer to pull the palette instead of
asking for hex codes. The swatch mapping, the `--color-brand-text` decision, theme
modes, fonts, and the fluid type scale are all in
[references/brand-and-type.md](references/brand-and-type.md) — read it now if the
brand is anything more than a single accent color.

> **Always recommend a starter meta description — don't leave the placeholder.**
> Draft and propose a sitewide default (`defaultDescription` → `SITE.defaultDescription`,
> the fallback for any page that doesn't set its own, and a key SEO signal). Give a
> concrete line rather than a blank prompt. Guidelines: **≤ 155 characters**, one
> sentence; lead with what the business does + for whom, weave in the primary
> service and location naturally, end with a light value or CTA. Keep it distinct
> from the `tagline` (short, for the `<title>`) and the `summary` (one-liner for
> JSON-LD / llms.txt) — but draft all three together so they're consistent.
> Template: _"{Service} for {audience} in {place} — {differentiator}."_
>
> Offer (don't force) to also draft starter `description`s for the key pages in
> [site-structure.ts](../../../src/data/site-structure.ts) `PAGES` (the `desc`
> field, which also feeds llms.txt) — flag that those still hold placeholder text.

> **Integrations:** the GTM, MailerLite, Usercentrics and GoHighLevel chat /
> External Tracking ids in `SITE.integrations` all ship **blank (`""`) = off**. Fill in the ones the new site uses (Head.astro
> only injects each script when its id is set). To drop one permanently, delete
> the field + its use in `Head.astro` / `BaseLayout.astro`.

## Step 3 — Swap the assets

### 3.1 Brand chrome — OG image, favicon, webclip

Binary swaps you guide (the CLI auto-syncs only the logo's accessible `LOGO_LABEL`
to the site name). Keep the **filenames** and nothing else needs touching; if they
rename, update the matching `SITE.*Path` in
[site.ts](../../../src/config/site.ts). **Swap every one — don't leave a
placeholder logo behind.**

| Asset                  | File (in [public/images/](../../../public/images/))     | Notes                           |
| ---------------------- | ------------------------------------------------------- | ------------------------------- |
| Open Graph image       | `og-image.png` (`SITE.ogImagePath`)                     | 1200×630, the social-share card |
| Favicon                | `favicon.png` (`SITE.logoPath` — also the JSON-LD logo) | **square**                      |
| Apple touch / web clip | `webclip.png` (`SITE.appleTouchIconPath`)               | **square**, 180×180             |

> **If the brand logo isn't square, make a square version.** The favicon, the
> webclip, and the Sanity Studio badge all render in square tiles. If the user only
> has a wide logo, **generate a square asset yourself** — take the symbol/monogram
> alone (drop the wordmark) and center it on a tight transparent square. The Pillow
> trim/center script in `references/studio-branding.md` (installed by the
> Sanity add-on; until setup deletes `addons/`, it is at
> `addons/sanity/files/.claude/skills/setup/references/studio-branding.md`)
> produces exactly this; reuse it for the favicon/webclip too.

**Inline logo (the nav/footer wordmark)** is vector path data in
[logo-paths.ts](../../../src/config/logo-paths.ts) — `LOGO_MARK_PATHS`,
`LOGO_WORDMARK_PATHS`, `LOGO_VIEWBOX`. Replace those `d=…` strings and the viewBox
from the new logo's SVG; [Logo.astro](../../../src/components/global/Logo.astro)
renders from this file. The CLI already updates `LOGO_LABEL`.

**Sanity forks:** the Studio navbar logo and dashboard rail icon are a separate job
— `references/studio-branding.md` (installed by the add-on), applied before
the Studio deploy.

### 3.2 Placeholder photography (REQUIRED ASK)

**Always raise this.** The starter ships **20 stock photos** in
[src/assets/placeholder-images/](../../../src/assets/placeholder-images/),
imported by the pages and sections in the table below — hero, services grid,
pricing, CTA sections, the blog post template. A fork that skips this ships a branded shell full of
someone else's photography. The CLI does **not** touch `src/assets/`.

| Where              | Files                                                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Home page + hero   | `src/pages/index.astro`                                                                                                |
| Section components | `Services`, `Pricing`, `WhyWorkWithUs`, `HowItWorks`, `CTASection`, `ImagePromo`, `PostLaunchSupport`, `ProjectImages` |
| Templates          | `src/components/templates/BlogPostTemplate.astro`                                                                      |
| Other pages        | `contact.astro`, `components.astro`, `demo/local-service.astro`                                                        |

The sample content's photos are separate: they live beside the entries in
`src/content/**/images/` and go when the sample content is replaced (the
content-files skill).

**Two ways to do it — offer both:**

1. **Keep the filenames (simplest).** Drop their own `.webp` files into
   `src/assets/placeholder-images/` using the same `ai-first-starter-<n>.webp`
   names. **Zero code changes.**
2. **Rename to something meaningful.** Add images under real names and update the
   matching `import` statements — better long-term, but touches every file in the
   table. Only
   if they ask; `npm run check` catches any import you miss.

Either way: **`.webp`, and let Astro handle sizing** — these go through
`<Visual>`/`<Image>`, so supply the largest reasonable source. And the **`alt` text
lives at the call site**, not the filename — swapping an image without updating its
`alt` leaves a description of the old photo, an accessibility and SEO regression.
Offer to re-draft the `alt` strings once you know what the new images show.

> Any images the user doesn't supply, leave as the placeholder — a working
> placeholder beats a broken import. Record every un-swapped area in the handoff.

## Step 4 — Write the config files (CLI)

**Sanity forks:** create the project first (
[references/sanity.md](references/sanity.md) §S1) so you have the projectId to pass
here.

Write the gathered answers to a temp JSON and run the CLI non-interactively:

```bash
node scripts/setup.mjs --config /tmp/setup-answers.json --yes
```

Answer keys (all optional — omitted keys keep the current file value;
`contentSource` defaults to `files`, or `sanity` once the add-on is installed):
`contentSource, siteName, siteUrl, email, founder, tagline, defaultDescription, summary,`
`localBusinessDescription, xHandle, phoneDisplay, phoneE164, phoneTel, hours,`
`addressLocality, addressRegion, addressCountry, priceRange, legalName, brandColor,`
`sanityProjectId, sanityDataset, sanityApiVersion, studioHost, workerName,`
`gtmId, mailerLiteAccount, usercentricsId, ghlChatWidgetId, ghlTrackingId`

Plus three optional maps:

- `cssColors` — raw swatches for colors.css, e.g.
  `{ "--color-brand-500": "#1a73e8", "--color-brand-text": "var(--color-dark-900)" }`.
  `--color-brand-500` here overrides the scalar `brandColor` and feeds the
  `SITE.brand.color` mirror.
- `themeColors` — per-theme alias overrides, scoped by block, e.g.
  `{ "brand": { "--background": "var(--color-brand-600)" } }`. Usually unneeded.
- `fluidType` — type min/max knobs, e.g. `{ "h1": { "min": 2.5, "max": 4 } }`.

The CLI rewrites `site.shared.mjs`, `site.ts`, `wrangler.jsonc`, `colors.css`,
`themes.css` (if `themeColors`), `typography.css` (if `fluidType`) and
`logo-paths.ts` (the `LOGO_LABEL`), and creates `.env`. With
`contentSource: "sanity"` it first installs the add-on, then also writes
`sanity.shared.mjs`, `sanity.cli.ts` (clearing `appId`) and the
rebuild-debounce Worker's `name`; `.env` gets the ids, with the token left
blank. Either way it deletes `addons/` at the end. The add-on installer
refuses a dirty tree: commit before running the CLI on the Sanity branch
(`--force` overrides). On that branch, **commit right after the CLI**: the
install and setup's writes are one change, so the add-on can't be removed
later by reverting an install-only commit (removal steps: the
`sanity-and-preview` skill → "Removing the add-on"). It warns and skips any var it can't find rather than failing. Delete
the temp JSON after.

**Then re-format.** The CLI writes values in place and does not run Prettier, but
CI gates on `format:check` — skipping this means a red first build for whitespace:

```bash
npm run format
```

> The CLI deliberately **does not** touch the content scaffolding — `areaServed`,
> `social`, `sameAs`, FAQs, `site-structure.ts`. Those stay as a working skeleton.
> **Remind the user** to review and replace it for their business.

## Step 5 — CMS branch

- **Sanity fork** → run `npm install` (the add-on's packages), then work
  through [references/sanity.md](references/sanity.md) end to end (schema deploy, Studio deploy, CORS, Viewer token, typegen, publish
  webhook), then come back here.
- **Files** → work through [references/no-cms.md](references/no-cms.md) (the
  content handoff), then come back here.

## Step 6 — Verify: run exactly what CI runs

**Run the full gate, not a subset.**
[.github/workflows/ci.yml](../../../.github/workflows/ci.yml) is what every
push must pass; verifying with less leaves the fork's first build red on
something setup caused. On a Files fork its `checks` job runs:

```bash
npm run format:check
npm run check:config   # wrangler.jsonc and public/_headers ↔ src/config
npm run check:boundary
npm run check:addon-installer
npm run check:setup
npm run check:content
npm run check          # astro check (types)
npm run check:hover
npm run build
npm run check:content-build
npm run check:schema -- --dist dist/client
```

CI also runs an `audit` job (`npm audit --omit=dev --audit-level=critical`)
and the `addon-sanity` job, which passes with nothing to check once
`addons/` is deleted.

Sanity forks: the add-on replaced `ci.yml` with its own workflow (it drops
`check:addon-installer`, `check:setup`, `check:content-build` and
`check:schema`, and adds `check:fixtures` and a draft-preview stega
check) — run that list. Run `npm run typegen` **before** `npm run check`
once the schema is deployed ([references/sanity.md](references/sanity.md)
§S7).

Fix anything that fails before handing off. A brand-new empty Sanity project builds
clean — `getStaticPaths` enumerates zero slugs, so no detail pages are emitted and
listing pages render empty states.

## Step 7 — Deploy to Cloudflare

Every fork ends here. Work through
[references/cloudflare.md](references/cloudflare.md): the site Worker and repo
connection, `vars`, encrypted secrets, the domain, "Always Use HTTPS", the WAF
rate-limit rule, and — **Sanity forks only** — the rebuild-debounce Worker that
turns Publish into a live rebuild.

## Step 8 — Hand off what's left

You cannot click the dashboard items; list them and point at
[docs/new-project-checklist.md](../../../docs/new-project-checklist.md). **Include
every item the user deferred in earlier steps** so nothing is silently dropped:

- **Cloudflare** (§4) — anything not completed in Step 7, plus §4a staging→launch
  if shipping on a `workers.dev` URL.
- **Sanity** (Sanity forks) — the Viewer token and the publish webhook if deferred.
  Repeat the warning: with prerendered content routes, publishing does nothing on
  the live site until that webhook exists.
- **GitHub** (§5) — Dependabot alerts / security updates / malware alerts / grouped
  updates; account-level push protection.
- **GoHighLevel forms** (§6) — the `GHL_API_TOKEN` / `GHL_LOCATION_ID` secrets,
  the form tags, the `/tools` gate and `SITE.smsOptIn`.
- **Content & images still holding placeholders** — any un-swapped photography
  (Step 3.2), plus the scaffolding the CLI leaves alone: `areaServed`, `social` /
  `sameAs`, FAQ copy, and the page `desc` fields in
  [site-structure.ts](../../../src/data/site-structure.ts). List these
  specifically; they're invisible until someone reads the live site.

Then run the **§7 post-launch verification** curl block from the checklist.

## Done criteria

- **The content-source question (Files or Sanity) was asked and answered
  explicitly** (Step 1.1), and the matching branch was completed or explicitly
  deferred.
- Config files carry the new identity, and **every CI check passes** (Step 6).
- **Fonts and font sizes were explicitly discussed** — the user either confirmed
  the defaults or supplied new typefaces / a new type scale, and those were applied.
- **`--color-brand-text` was decided** — the user confirmed whether the brand color
  takes light or dark text, rather than leaving the default to collide with a new
  hue.
- **Brand assets swapped** — OG image, favicon, and webclip replaced (square
  versions generated where the logo isn't square), the front-end wordmark
  re-pointed, and for Sanity forks the Studio navbar logo + dashboard rail icon
  verified via the deployed `create-manifest.json`.
- **Placeholder photography was raised** — the user either supplied their own images
  or explicitly deferred, with every un-swapped area listed in the handoff, and
  `alt` text updated wherever an image changed.
- **Every mandatory-to-surface step was raised** — each item was either completed or
  explicitly deferred, and every deferred item appears in the Step 8 handoff.
- The user has the residual dashboard list and knows the content scaffolding still
  needs their copy.
