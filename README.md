# Your Company

Marketing site for Your Company, built with [Astro](https://astro.build), [Sanity](https://www.sanity.io) (CMS), and deployed to a single [Cloudflare Worker](https://developers.cloudflare.com/workers/). The front-end follows a structured class system — see [`CLAUDE.md`](CLAUDE.md) for the full conventions, component reference, and architecture notes.

## 🍴 Forking this as a starter

This repo doubles as a template. After forking it for a new project:

- **In Claude Code:** run **`/setup`** — it gathers your identity, **creates a fresh Sanity project + dataset, deploys the schema, adds CORS origins**, rewrites the config files, and verifies the build, then hands you the remaining dashboard steps. It also **pulls your brand colors from Figma** (if a Figma MCP is connected), asks about your **fluid type scale**, and walks you through swapping **fonts, the OG image, favicon, and logos**. ([skill](.claude/skills/setup/SKILL.md))
- **In a plain terminal:** run **`npm run setup`** — an interactive, zero-dependency CLI that rewrites the per-fork identity/config files (`site.shared.mjs`, `site.ts`, `wrangler.jsonc`, `colors.css`, `themes.css`, `typography.css`, `logo-paths.ts`, `sanity.cli.ts`, `.env`). It can't stand up the Sanity project, swap fonts/images, or touch dashboards — `/setup` guides those.

Both leave the content scaffolding (service areas, socials, location pages, FAQs) in place as a working skeleton for you to edit. The full per-fork reference — including the Cloudflare/GitHub/Sanity dashboard work the tooling can't do — lives in [`docs/new-project-checklist.md`](docs/new-project-checklist.md).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run setup`           | Interactive fork setup — rewrites per-fork identity/config files (see [Forking](#-forking-this-as-a-starter)) |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying (Astro's local server — unrelated to the `/preview` draft-preview routes) |
| `npm run studio`          | Run Sanity Studio locally at `localhost:3333` (Presentation iframes **production**) |
| `npm run studio:local`    | Studio at `localhost:3333` with Presentation iframing the **local** site (`localhost:4321`) — use this while developing routes/preview |
| `npm run check:schema`    | Validate JSON-LD on key pages (dev server must be running) |
| `npm run check:config`    | Verify `wrangler.jsonc` matches `src/config/site.shared.mjs` (also runs automatically before `build`) |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |

## 🏗️ Rendering model — everything public is prerendered

**Every public route prerenders to static HTML at build time — including the CMS content routes.** `/blog/[slug]`, `/case-studies/[slug]`, and `/glossary/[slug]` enumerate their slugs with `getStaticPaths` (slug-only GROQ queries; helpers in `src/sanity/lib/page-data.ts`) and are served by the Cloudflare assets binding at zero Worker CPU. Only two kinds of routes are server-rendered (`export const prerender = false;`):

- `src/pages/preview/**` — the SSR **draft-preview twins** that Sanity's Presentation tool iframes (same templates, same loaders as the public routes; only the perspective differs)
- `src/pages/api/**` — the scorecard endpoint and the draft-mode cookie set/clear routes

`astro.config.mjs` is `output: "static"` with the Cloudflare adapter; new pages default to static automatically.

> **Why not show drafts on the public URLs?** With `@astrojs/cloudflare`, a prerendered path is returned by the assets binding **before** Astro middleware ever runs, so a cookie-keyed draft rewrite there is impossible. And serving the content routes as SSR just for preview burns Worker CPU per request — on a production site built from this stack it caused `exceededCpu` 503s under crawler load. Hence the parallel `/preview` tree: SSR for editors only, static for everyone else.

## 🚢 Deployment & content rebuilds

`www.example.com` is served by a single Cloudflare Worker (the `your-worker-name` project): prerendered pages come from its assets binding, and the same Worker server-renders `/preview/*` and `/api/*`. There is no separate preview deployment — draft preview is the `/preview/*` route tree on the same Worker (see below). The only other Worker is the tiny rebuild-debounce Worker that collapses publish webhooks into one build.

**Two things trigger a production rebuild (`astro build`, ~60–90s):**

1. **Git push to `main`** — Cloudflare watches the repo and auto-builds on commit.
2. **Sanity publish** — a webhook POSTs to a Cloudflare deploy hook whenever a published (non-draft) document of a watched type is created, updated, or deleted.

Because the build re-queries Sanity on every run, a rebuild regenerates the content pages themselves plus the sitemap and `llms.txt` / `llms-full.txt` — with prerendered content routes, **the publish→webhook→rebuild chain is how published content reaches the live site** (typically ~5–20 minutes end-to-end with the debounce window). Draft preview in the Studio is unaffected — `/preview/*` always fetches fresh.

**Need a manual rebuild?** Either click **Retry deployment** in the Cloudflare dashboard (Workers & Pages → `your-worker-name` → Deployments), or `POST` the deploy-hook URL (handy from a script or an iOS Shortcut). No new infrastructure required.

### Sanity webhook

Configured at [manage.sanity.io](https://www.sanity.io/manage) → project `your-sanity-project-id` → API → Webhooks.

| Field | Value |
|---|---|
| URL | The rebuild-debounce Worker's `*.workers.dev` URL (see [Rebuild-debounce Worker](#rebuild-debounce-worker) below) — **not** the deploy hook directly. The Worker holds the real deploy hook as a secret and calls it after debouncing. |
| HTTP header | `Authorization: Bearer <WEBHOOK_TOKEN>` (must match the Worker's `WEBHOOK_TOKEN` secret) — leave Sanity's "Secret" field blank (that's a different HMAC feature we don't use) |
| Dataset | `production` |
| Trigger on | Create, Update, Delete |
| HTTP method | `POST` |
| Filter | `!(_id in path("drafts.**"))` |

The filter is intentionally **broad**: it matches any published document of **any type**. The single clause only excludes autosaved drafts so typing in Studio doesn't thrash the build. Clicking **Publish** (or a release going live) writes to the non-draft ID and passes the filter; unpublishing fires it too, so removed content clears on the next build.

**Why broad rather than a `_type` allowlist?** On this stack nearly every content type surfaces on a built page (sitemap, `llms.txt`, static cards, the navbar), so a per-type allowlist would just be a list you have to remember to update. With the broad filter, **a new content type triggers rebuilds automatically** — nothing to keep in sync. The occasional extra trigger is harmless: the debounce Worker (below) collapses a burst of publishes into a single build.

Update is kept on (not just Create/Delete) because **every content page is static** — an edit to any published document needs a rebuild to show up anywhere on the site.

### Rebuild-debounce Worker

The Sanity webhook fires **once per published document**, so publishing several docs in a row would kick off several builds. A tiny standalone Cloudflare Worker in [`workers/rebuild-debounce/`](workers/rebuild-debounce/) sits between Sanity and the deploy hook and **collapses a burst of publishes into one build** (Durable Object alarm; ~5 min debounce, 15 min max wait).

The chain is: **publish → debounce Worker (waits ~5 min) → Cloudflare deploy hook → one build.** The deploy hook still lives on the site worker; the debounce Worker only calls it. Point the Sanity webhook **URL** at the debounce Worker's `*.workers.dev` URL (not directly at the deploy hook) and add an `Authorization: Bearer <token>` header — see the Worker's own [README](workers/rebuild-debounce/README.md) for the per-fork deploy + secret + webhook steps. It's a separate Worker, deployed manually with `wrangler deploy`; it is **not** part of the site's CI build.

> ⚠️ With prerendered content routes this Worker is **load-bearing**: until it (or some other rebuild trigger) is wired up, publishing in Sanity changes nothing on the live site. Don't defer it past launch.

### Draft preview (Presentation)

Editors open the hosted Studio, click **Presentation**, and the iframe loads the **`/preview/<type>/<slug>`** SSR twin of the page — same template and data loader as the public route, but fetched per-request so the `sanity-preview-mode` cookie (set by `/api/draft-mode/enable`) can switch it to the drafts perspective. Public visitors get the prerendered pages and never have the cookie on an SSR route, so drafts can't leak; `/preview` is robots-disallowed, noindexed, and never edge-cached. Full flow is documented in [`CLAUDE.md`](CLAUDE.md) under "Deployment, Sanity Studio & Preview".

> Changing preview URLs or adding a previewable type touches `src/sanity/lib/resolve.ts`, which ships inside the **Studio** bundle — deploy the site first, then run `npx sanity deploy`, or Presentation keeps loading the old URLs.

**No domain yet?** A fork can deploy to the Worker's free `*.workers.dev` URL with working Presentation **before** any custom domain exists — `SITE_URL` is env-overridable and the Studio trusts `https://*.workers.dev` automatically, so the staging→production switch is a no-code env change. Per-client runbook: **§4a "Staging-first deploy"** in [docs/new-project-checklist.md](docs/new-project-checklist.md).

## 🎨 Cloning this as a template

The site identity is centralized so a new site is mostly config, not find-and-replace:

1. **`src/config/site.ts`** — the single source of truth: name, URL, email, phone, founder, address, social links + `xHandle`, `sameAs`, `areaServed`, OG/logo/apple-touch-icon paths, SEO defaults (`tagline`, `defaultDescription`), `brand.color`, and the `integrations` block (Google Tag Manager, MailerLite, Usercentrics account ids). Edit this first. Everything (Head, the GTM `<noscript>` in BaseLayout, footer, JSON-LD, `llms.txt`, scorecard emails, contact pages) reads from it.
2. **`src/config/site.shared.mjs`** — a tiny dependency-free module holding the Sanity `projectId`/`dataset`/`apiVersion` and the site `url`. This is the ONE place those primitives live: `site.ts`, `astro.config.mjs`, `sanity.config.ts`, `sanity.cli.ts`, and the `scripts/*.mjs` all import it (no more hand-synced copies). Also set `PUBLIC_SANITY_PROJECT_ID` / `PUBLIC_SANITY_DATASET` in `.env` and in `wrangler.jsonc` `vars` (JSON can't import — `npm run check:config`, also run automatically before every build, fails if `wrangler.jsonc` drifts from the shared module). Add `SANITY_API_READ_TOKEN` as an encrypted Cloudflare secret.
3. **`src/data/site-structure.ts`** — the page/menu registry: `PAGES` (every internal page, once) plus `NAV_MENU`, `FOOTER_GROUPS`, and `BANNER`. The navbar, footer, `llms.txt`, and the announcement banner all derive from it — edit pages/menus/banner here, in one file.
4. **Fonts** — swap files in `src/assets/fonts/`, then update the `fonts` block in `astro.config.mjs` and the font variables in `src/styles/variables/typography.css`.
5. **Brand color** — change `--color-brand-500` in `src/styles/variables/colors.css` (the canonical source). Then mirror the new hex into `SITE.brand.color` in `site.ts` — that literal is used only by HTML email and the `<meta theme-color>` tag, which can't read CSS variables.
6. **Logo** — edit the SVG path data in `src/config/logo-paths.ts`; both the front-end logo and the Sanity Studio logo render from it.
7. **Worker** — update the worker name / KV id in `wrangler.jsonc`. The `site` URL in `astro.config.mjs` comes from `site.shared.mjs` automatically.

That covers identity. For everything else a fork needs — Sanity project + CORS, Cloudflare worker/domain/**WAF rate-limit rule**, GitHub Dependabot/security settings, email services, and the post-launch security verification commands — work through **[docs/new-project-checklist.md](docs/new-project-checklist.md)** top to bottom. It separates what ships with the code (verify only) from what must be re-created in dashboards per project, and lists the current dependency pins with their removal conditions.

## 🤖 Building pages with an AI agent — best practices

This repo is designed to be built on by an AI coding agent (e.g. Claude Code).
When the agent is set up well, whole pages can be built in roughly one pass —
most sections correct on the first try, with only spacing/image/color tweaks
afterward. That outcome comes from *what the agent is given*, not luck. If you
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
   copy and images), the agent reads *exact* structure, copy, and design — so
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
      matching), say so and name the split — e.g. *"the layout matches [design
      source]; pull all copy, images, and colors from [live site URL]."* One
      sentence like that tells the agent **design = layout, live site = content
      + color** and prevents a whole class of rework (like copying the wrong
      brand color).
- [ ] **Where CMS-backed content lives** — "team members come from Sanity,"
      "testimonials are in the CMS," etc., so the agent wires data instead of
      hard-coding it.
- [ ] **Specific assets when they matter** — name the exact image/asset to use
      for a given slot (e.g. the founder's headshot, a particular logo) rather
      than letting the agent pick. Surgical, concrete feedback on each pass
      ("this section is text-only, no images," "use the dark theme here," "use
      *that* headshot for the founder") beats "this feels off."

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
so **reading** via those tools works with no setup. But when the agent's *shell*
needs to reach the internet directly — downloading image **bytes**, running
`npm run build` (which fetches the CMS at build time), or running a
data-migration script — that's governed by the **environment's network access**
in Claude Code on the web, which defaults to **Trusted** (package registries +
GitHub only).

To let those steps through, edit the environment → set **Network access** to
**Custom** → add one domain per line under **Allowed domains**, and tick **"Also
include default list of common package managers"** so npm/GitHub still work. Add
the domains *your* sources live on. For this stack (Sanity CMS + Figma, plus a
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
*read* designs/content over MCP and commit code, but can't pull image files into
the repo or complete a local `npm run build` (it'll 403 on the CMS). Full
reference: Anthropic's
[Claude Code on the web — Network access](https://code.claude.com/docs/en/claude-code-on-the-web#network-access)
docs. (GitHub goes through a separate proxy and always works.)

## 👀 Want to learn more?

See [`CLAUDE.md`](CLAUDE.md) for the full front-end system (class conventions, component APIs, JSON-LD, SEO & structured data), or the [Astro docs](https://docs.astro.build).
