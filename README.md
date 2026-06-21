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
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run check:schema`    | Validate JSON-LD on key pages (dev server must be running) |
| `npm run check:config`    | Verify `wrangler.jsonc` matches `src/config/site.shared.mjs` (also runs automatically before `build`) |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |

## 🏗️ Rendering model — static by default, CMS routes SSR

The site is **static by default**: every route prerenders to HTML at build time. A small set of routes opt into **server-side rendering** with `export const prerender = false;` so the Sanity Presentation tool can show live drafts (per-request fetch with the `drafts` perspective):

- `src/pages/blog/**`, `src/pages/case-studies/**`, `src/pages/glossary/**` — the CMS-driven content routes
- `src/pages/api/draft-mode/*` — the cookie set/clear routes
- `/studio/*` — auto-injected as SSR by the `@sanity/astro` integration

Everything else (home, about, services, location/industry pages, legal pages, `llms.txt`) stays prerendered. `astro.config.mjs` is `output: "static"` with the Cloudflare adapter; new pages default to static automatically.

> The published SSR content routes use Sanity's CDN + edge caching (`s-maxage=300` in `src/middleware.ts`), so edits to content shown only on those routes go live within ~5 minutes **without** a rebuild.

## 🚢 Deployment & content rebuilds

`www.example.com` is served by a single Cloudflare Worker (the `your-worker-name` project). There is no separate preview deployment — draft preview runs on the same URL via a cookie set by Sanity's Presentation tool (see below).

**Two things trigger a production rebuild (`astro build`, ~60–90s):**

1. **Git push to `main`** — Cloudflare watches the repo and auto-builds on commit.
2. **Sanity publish** — a webhook POSTs to a Cloudflare deploy hook whenever a published (non-draft) document of a watched type is created, updated, or deleted.

Because the build re-queries Sanity on every run, a rebuild regenerates the sitemap and `llms.txt` / `llms-full.txt` automatically — the same lifecycle as the pages.

**Need a manual rebuild?** Either click **Retry deployment** in the Cloudflare dashboard (Workers & Pages → `your-worker-name` → Deployments), or `POST` the deploy-hook URL (handy from a script or an iOS Shortcut). No new infrastructure required.

### Sanity webhook

Configured at [manage.sanity.io](https://www.sanity.io/manage) → project `your-sanity-project-id` → API → Webhooks.

| Field | Value |
|---|---|
| URL | Cloudflare deploy hook (Workers & Pages → `your-worker-name` → Settings → Builds → Deploy hooks, targeting `main`) |
| Dataset | `production` |
| Trigger on | Create, Update, Delete |
| HTTP method | `POST` |
| Filter | `_type in ["blogPost", "caseStudy", "glossaryTerm", "testimonial", "author"] && !(_id in path("drafts.**"))` |

The `!(_id in path("drafts.**"))` clause means **only published documents rebuild the site** — autosaved drafts are ignored, so typing in Studio doesn't thrash the build. Clicking **Publish** (or a release going live) writes to the non-draft ID and passes the filter; unpublishing fires it too, so removed content clears on the next build.

Update is kept on (not just Create/Delete) because several of these types render on **static** pages — testimonials and case-study cards appear sitewide, and blog posts surface in the navbar and on the `web-design` pages — so an edit needs a rebuild to show. At a couple of posts a week the rebuild volume is negligible.

**Adding a new content type?** Add its `_type` to the filter array, otherwise publishing docs of that type won't trigger rebuilds.

### Draft preview (Presentation)

Editors open `/studio`, click **Presentation**, and the same public URL renders drafts inside the Studio iframe. This works via the `sanity-preview-mode` cookie set by `/api/draft-mode/enable` — public visitors never have the cookie, so drafts can't leak. Full flow is documented in [`CLAUDE.md`](CLAUDE.md) under "Deployment, Sanity Studio & Preview".

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

## 👀 Want to learn more?

See [`CLAUDE.md`](CLAUDE.md) for the full front-end system (class conventions, component APIs, JSON-LD, SEO/location-page checklist), or the [Astro docs](https://docs.astro.build).
