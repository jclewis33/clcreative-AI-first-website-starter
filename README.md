# Your Company

Marketing site for Your Company, built with [Astro](https://astro.build), with its content in local files (Markdown/MDX and JSON; [Sanity](https://www.sanity.io) is the optional CMS alternative), and deployed to a single [Cloudflare Worker](https://developers.cloudflare.com/workers/). The front-end follows a structured class system — see [`CLAUDE.md`](CLAUDE.md) for the full conventions, component reference, and architecture notes.

## 🍴 Forking this as a starter

This repo doubles as a template. After forking it for a new project:

- **In Claude Code:** run **`/setup`** — an orchestrator that takes you from a fresh fork to a deployed site. It scopes the project (including the **content source**: local files, the default, or the opt-in Sanity add-on), gathers your identity, **pulls your brand colors from Figma** (if a Figma MCP is connected), asks about your **fluid type scale**, walks you through swapping **fonts, the OG image, favicon, logos, and the placeholder photography**, rewrites the config files, runs the full CI gate, and hands you the remaining dashboard steps. If you choose Sanity, it installs the add-on and **creates the project + dataset, deploys the schema and Studio, and adds CORS origins**. ([skill](.claude/skills/setup/SKILL.md))
- **In a plain terminal:** run **`npm run setup`** — an interactive, zero-dependency CLI that rewrites the per-fork identity/config files (`site.shared.mjs`, `site.ts`, `wrangler.jsonc`, `colors.css`, `themes.css`, `typography.css`, `logo-paths.ts`, `.env`, plus the Sanity ids when you choose Sanity). It asks Files or Sanity first; Sanity runs `npm run addon:sanity`. It can't stand up the Sanity project, swap fonts/images, or touch dashboards — `/setup` guides those.

Both leave the content scaffolding (service areas, socials, location pages, FAQs) in place as a working skeleton for you to edit. The full per-fork reference — including the Cloudflare/GitHub/Sanity dashboard work the tooling can't do — lives in [`docs/new-project-checklist.md`](docs/new-project-checklist.md).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                       | Action                                                                                                                                 |
| :---------------------------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| `npm install`                 | Installs dependencies                                                                                                                  |
| `npm run setup`               | Interactive fork setup — rewrites per-fork identity/config files (see [Forking](#-forking-this-as-a-starter))                          |
| `npm run dev`                 | Starts local dev server at `localhost:4321`                                                                                            |
| `npm run build`               | Build your production site to `./dist/`                                                                                                |
| `npm run preview`             | Preview your build locally, before deploying (Astro's local server — unrelated to the Sanity add-on's `/preview` draft-preview routes) |
| `npm run check:schema`        | Validate JSON-LD on key pages (`-- --dist dist/client` after a build, or with the dev server running)                                  |
| `npm run check:config`        | Verify `wrangler.jsonc` vars and `public/_headers` match `src/config` (also runs before `build`)                                       |
| `npm run check:content`       | Prove bad content fails the build, naming the file and field                                                                           |
| `npm run check:content-build` | After a build: check coming-soon studies, OG/JSON-LD image URLs, resized local images and TOC anchors                                  |
| `npm run check:addon`         | Install the Sanity add-on into a scratch copy and prove it checks, builds and matches the Files site (slow; needs the network)         |
| `npm run addon:sanity`        | Install the Sanity add-on (`addons/sanity/`): Sanity as the content source                                                             |
| `npm run astro ...`           | Run CLI commands like `astro add`, `astro check`                                                                                       |

## 📝 Content

Blog posts, case studies, projects, gallery photos, testimonials, authors
and CTAs are files in [`src/content/`](src/content/), one per entry: MDX
for posts, JSON for everything else, with photos in each folder's
`images/`. Every file is validated when the site builds. A missing photo,
empty alt text or a reference to an entry that does not exist fails the
build, naming the file and the field. Edit a file, rebuild, done; no CMS
account or API token involved. Editors start with the step-by-step
guide, [`docs/editing-content.md`](docs/editing-content.md) (setup,
recipes, reading errors, publishing). The full field reference is
[`.claude/skills/content-files/SKILL.md`](.claude/skills/content-files/SKILL.md),
and VS Code autocompletes the JSON fields (`.vscode/settings.json`).

## 🏗️ Rendering model — everything public is prerendered

**Every public route prerenders to static HTML at build time — including the content routes.** `/blog/[slug]`, `/case-studies/[slug]`, and `/projects/[slug]` enumerate their slugs with `getStaticPaths` (helpers exported from `src/lib/content`, read from the files in `src/content/`) and are served by the Cloudflare assets binding at zero Worker CPU. Only these routes are server-rendered (`export const prerender = false;`):

- `src/pages/api/**` — the lead form and other API routes.
- With the Sanity add-on: `src/pages/preview/**`, the SSR draft-preview
  twins its Studio iframes, and the draft-mode cookie routes under
  `src/pages/api/draft-mode/`.

`astro.config.mjs` is `output: "static"` with the Cloudflare adapter; new pages default to static automatically.

> **Why not show drafts on the public URLs?** With `@astrojs/cloudflare`, a prerendered path is returned by the assets binding **before** Astro middleware ever runs, so a cookie-keyed draft rewrite there is impossible. And serving the content routes as SSR just for preview burns Worker CPU per request — on a production site built from this stack it caused `exceededCpu` 503s under crawler load. Hence the Sanity add-on's parallel `/preview` tree: SSR for editors only, static for everyone else.

## 🚢 Deployment & content rebuilds

`www.example.com` is served by a single Cloudflare Worker (the `your-worker-name` project): prerendered pages come from its assets binding, and the same Worker server-renders `/api/*` (and, with the Sanity add-on, its `/preview/*` draft tree).

**Two things trigger a production rebuild (`astro build`, ~60–90s):**

1. **Git push to `main`** — Cloudflare watches the repo and auto-builds on commit.
2. **With the Sanity add-on:** a Sanity publish, through its rebuild-debounce Worker (the `sanity-and-preview` skill, installed with the add-on).

**Need a manual rebuild?** Either click **Retry deployment** in the Cloudflare dashboard (Workers & Pages → `your-worker-name` → Deployments), or `POST` the deploy-hook URL (handy from a script or an iOS Shortcut). No new infrastructure required.

**No domain yet?** A fork can deploy to the Worker's free `*.workers.dev` URL before any custom domain exists — `SITE_URL` is env-overridable, so the staging→production switch is a no-code env change. Per-client runbook: **§4a "Staging-first deploy"** in [docs/new-project-checklist.md](docs/new-project-checklist.md).

## 📦 Handing off this project

A finished site hands over as the GitHub repository (transfer it to the
client) or as a zip (`git archive --format=zip -o site.zip HEAD`, which
leaves out `.env`, `node_modules/` and `dist/`). Before you do, clear the
sample content, run the checks and list the accounts and secrets the client
takes over. Step by step, for you and for the recipient:
[`docs/handing-off.md`](docs/handing-off.md).

## 🎨 Cloning this as a template

The site identity is centralized so a new site is mostly config, not find-and-replace:

1. **`src/config/site.ts`** — the single source of truth: name, URL, email, phone, founder, address, social links + `xHandle`, `sameAs`, `areaServed`, OG/logo/apple-touch-icon paths, SEO defaults (`tagline`, `defaultDescription`), `brand.color`, and the `integrations` block (Google Tag Manager, MailerLite, Usercentrics account ids). Edit this first. Everything (Head, the GTM `<noscript>` in BaseLayout, footer, JSON-LD, `llms.txt`, contact pages) reads from it.
2. **`src/config/site.shared.mjs`** — a tiny dependency-free module holding the site `url`, the ONE place it lives: `site.ts`, `astro.config.mjs` and the `scripts/*.mjs` all import it. (The Sanity add-on keeps its ids the same way, in `src/config/sanity.shared.mjs`.)
3. **`src/data/site-structure.ts`** — the page/menu registry: `PAGES` (every internal page, once) plus `NAV_MENU`, `FOOTER_GROUPS`, and `BANNER`. The navbar, footer, `llms.txt`, and the announcement banner all derive from it — edit pages/menus/banner here, in one file.
4. **Fonts** — swap files in `src/assets/fonts/`, then update the `fonts` block in `astro.config.mjs` and the font variables in `src/styles/variables/typography.css`.
5. **Brand color** — change `--color-brand-500` in `src/styles/variables/colors.css` (the canonical source). Then mirror the new hex into `SITE.brand.color` in `site.ts` — that literal is used only by HTML email and the `<meta theme-color>` tag, which can't read CSS variables.
6. **Logo** — edit the SVG path data in `src/config/logo-paths.ts`; the front-end logo renders from it (and the Sanity add-on's Studio logo).
7. **Worker** — update the worker name / KV id in `wrangler.jsonc`. The `site` URL in `astro.config.mjs` comes from `site.shared.mjs` automatically.

That covers identity. For everything else a fork needs — the Sanity project (Sanity forks), Cloudflare worker/domain/**WAF rate-limit rule**, GitHub Dependabot/security settings, email services, and the post-launch security verification commands — work through **[docs/new-project-checklist.md](docs/new-project-checklist.md)** top to bottom. It separates what ships with the code (verify only) from what must be re-created in dashboards per project, and lists the current dependency pins with their removal conditions.

## 🤖 Building pages with an AI agent — best practices

This repo is designed to be built on by an AI coding agent (e.g. Claude Code).
When the agent is set up well, whole pages can be built in roughly one pass —
most sections correct on the first try, with only spacing/image/color tweaks
afterward. That outcome comes from _what the agent is given_, not luck. If you
want the same result, do these things.

### Why it works (and what to lean on)

1. **[`CLAUDE.md`](CLAUDE.md) is the contract.** It documents every component's
   props/slots, the CSS variable tiers, the responsive flag system, and an
   explicit **anti-patterns** list. The agent composes from this known
   vocabulary instead of inventing one. Keep it current — it does most of the
   heavy lifting.
2. **Point at a reference page.** Existing pages (e.g.
   [`src/pages/index.astro`](src/pages/index.astro),
   [`src/pages/contact.astro`](src/pages/contact.astro)) are worked examples of
   the house style and reusable sections (`CTASection`, `BlogPostGrid`, etc.).
   "Match how `index.astro` is built" is worth a paragraph of instructions.
3. **Give the source of truth, not a description of it.** If you connect design
   and content MCP connectors (Figma for design, a CMS like Sanity/Webflow for
   copy and images), the agent reads _exact_ structure, copy, and design — so
   almost nothing about content has to be guessed, and therefore almost nothing
   has to be corrected later.

### What to give the agent (checklist)

- [ ] **The goal**, in one line ("build the About page").
- [ ] **Composition rules:** "use the existing components and utility classes;
      keep new CSS minimal; use the responsive flag system for breakpoints; new
      bespoke sections are fine, but reuse components where you can."
- [ ] **Design source** — if you have a design, share it section by section
      (e.g. Figma frame links), each with a short note on intent ("this is
      already a section elsewhere — make it a reusable component," "see the
      open/expanded state," "check it at all breakpoints").
- [ ] **Content + color source — and which source wins for what.** Be explicit
      about where copy, images, and colors come from, especially if they live in
      different places than the layout. If the page is adapted from an existing
      site (a previous build, a sibling brand, a competitor's structure you're
      matching), say so and name the split — e.g. _"the layout matches [design
      source]; pull all copy, images, and colors from [live site URL]."_ One
      sentence like that tells the agent **design = layout, live site = content + color** and prevents a whole class of rework (like copying the wrong
      brand color).
- [ ] **Where CMS-backed content lives** — "team members come from Sanity,"
      "testimonials are in the CMS," etc., so the agent wires data instead of
      hard-coding it.
- [ ] **Specific assets when they matter** — name the exact image/asset to use
      for a given slot (e.g. the founder's headshot, a particular logo) rather
      than letting the agent pick. Surgical, concrete feedback on each pass
      ("this section is text-only, no images," "use the dark theme here," "use
      _that_ headshot for the founder") beats "this feels off."

### A prompt that works (template)

Copy, fill in the brackets, and paste. Drop the bracketed lines that don't apply
to your build:

```text
Build out the [PAGE NAME] page. Use the components from this project wherever
possible, and use the utility classes. Keep any new CSS minimal — reuse what we
have, and use the responsive flag system for breakpoints. Some sections may need
new bespoke markup; that's fine, but compose from existing components first.
Match how src/pages/[REFERENCE PAGE].astro is built.

[IF ADAPTED FROM AN EXISTING DESIGN/SITE] Important context: this page is
adapted from [DESIGN/SITE SOURCE] — the layout/structure is the same, but
[what differs, e.g. "only the colors differ"]. So:
  • [Design source, e.g. Figma] = the layout/design (shared section by section below).
  • [Live site / CMS] = the source for all copy, images, and colors.
Pull copy + images + colors from [the live site/CMS]. View it at multiple
breakpoints — some sections stack/show/hide differently on mobile.

[CMS NOTE, if any]: [e.g. "Team members should come from Sanity — add them there
and pull them in."]

Design, section by section:
  • [section]: [link]   — [intent note, e.g. "already a section elsewhere, make
                          it a reusable component and use it here too"]
  • [section]: [link]   — [e.g. "see the expanded/open state at all breakpoints"]
  • ...

Content / images / colors source: [URL or CMS]
```

### Let the agent reach your sources (network allowlist)

MCP connector traffic (Figma/Sanity/Webflow tools) is proxied through Anthropic,
so **reading** via those tools works with no setup. But when the agent's _shell_
needs to reach the internet directly — downloading image **bytes**, running
`npm run build` with Sanity as the content source (it fetches the CMS at build time), or running a
data-migration script — that's governed by the **environment's network access**
in Claude Code on the web, which defaults to **Trusted** (package registries +
GitHub only).

To let those steps through, edit the environment → set **Network access** to
**Custom** → add one domain per line under **Allowed domains**, and tick **"Also
include default list of common package managers"** so npm/GitHub still work. Add
the domains _your_ sources live on. For this stack (Sanity CMS + Figma, plus a
Webflow live site as a content source) that's:

```text
*.sanity.io
*.apicdn.sanity.io
cdn.sanity.io
cdn.prod.website-files.com
*.figma.com
```

(Drop or swap any line that doesn't match your sources — e.g. remove the Webflow
CDN if you're not pulling from a Webflow site.) Without this, the agent can still
_read_ designs/content over MCP and commit code, but can't pull image files into
the repo or complete a local Sanity-backed `npm run build` (it'll 403 on the CMS). Full
reference: Anthropic's
[Claude Code on the web — Network access](https://code.claude.com/docs/en/claude-code-on-the-web#network-access)
docs. (GitHub goes through a separate proxy and always works.)

## 👀 Want to learn more?

See [`CLAUDE.md`](CLAUDE.md) for the full front-end system (class conventions, component APIs, JSON-LD, SEO & structured data), or the [Astro docs](https://docs.astro.build).
