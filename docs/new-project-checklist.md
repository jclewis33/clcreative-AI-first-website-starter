# New Project Checklist — Forking This Codebase

This repo doubles as a template. When you fork/duplicate it for a new project, the code carries most of the security hardening with it — but several protections live in **dashboards** (Cloudflare, GitHub, GoHighLevel, and Sanity when the fork uses the Sanity add-on) and must be re-created per project. This checklist covers both: what to verify and what to set up.

Work top to bottom. Items marked **🔁 per-fork** must be done for every new project. Items marked **✅ in-code** ship with the repo — verify them, don't rebuild them. Steps marked **Sanity add-on only** apply only to a fork that installed the add-on (`npm run addon:sanity`); a fork that keeps its content in files (the default) skips them.

> ## ⚡ Fastest path: let the tooling do it
>
> Two helpers automate most of this list so you rarely hand-edit config:
>
> - **`/setup` (Claude Code skill)** — _recommended._ In a Claude Code session on the fork, run `/setup`. Claude asks whether content stays in files (the default) or uses the Sanity add-on, gathers your identity info, and — for Sanity — **creates the new Sanity project + dataset, deploys the schema, and adds the CORS origins** via the Sanity MCP. It runs the CLI below for the file edits, verifies with a build, then hands you the short list of dashboard items only a human can finish. It also **pulls brand colors from a Figma file** (when a Figma MCP is connected), asks about your **fluid type scale**, and walks you through swapping **fonts, the OG image, favicon, and logos**. This is the only path that automates standing up the Sanity backend. See [.claude/skills/setup/SKILL.md](../.claude/skills/setup/SKILL.md).
> - **`npm run setup` (CLI)** — the deterministic engine. Prompts for each identity value and rewrites `site.shared.mjs`, `site.ts`, `wrangler.jsonc`, `colors.css`, `themes.css`, `typography.css`, `logo-paths.ts` and `.env` (plus, for Sanity, `sanity.shared.mjs`, `sanity.cli.ts` and the rebuild-debounce Worker's name, after installing the add-on). It asks Files or Sanity first; Sanity runs `npm run addon:sanity`, and either way it deletes `addons/` at the end. Also accepts `cssColors` / `themeColors` / `fluidType` maps (via `--config`) so a Figma palette and type scale land deterministically. No AI, no network — works for anyone forking. (`/setup` calls this under the hood.) It does **not** create the Sanity project, swap fonts/images, or touch any dashboard.
>
> Both deliberately **leave the content scaffolding** (`areaServed`, `social`, `sameAs`, `faqs.ts`, `site-structure.ts`) in place as a working skeleton — review and replace that copy for your business after setup. The sections below remain the source of truth for the **dashboard work neither tool can perform** (Cloudflare secrets/WAF/domain, GitHub Dependabot, the GoHighLevel secrets and `/tools` gate, and, with the Sanity add-on, the Sanity Viewer token).

---

## Architecture this fork sets up (the Your Company default)

Every fork lands on the same shape, chosen to keep client builds low-maintenance:

- **Content in local files** (`src/content/`, MDX and JSON) by default, validated at build. Sanity is the optional CMS alternative (the add-on in `addons/sanity/`); the bullets marked _Sanity add-on_ below, and §3, apply only to a fork that installs it.
- **Astro static-first site** on one Cloudflare Worker — every public page (marketing AND content) prerendered; SSR only for `/api/*` and the staff-only Client tools under `/tools/*` (and, with the Sanity add-on, the editor-only `/preview/*` draft-preview twins that Sanity Presentation iframes, cookie-based drafts perspective). Files content ships on a git push; with the Sanity add-on, a publish triggers a rebuild via the rebuild-debounce Worker (§4.6).
- _Sanity add-on:_ **Sanity Studio hosted by Sanity** — a Core app at `<studioHost>.sanity.studio`, deployed with `npx sanity deploy`. **Not embedded** at `/studio` (that's the legacy alternative). Hosting decouples Studio updates from site deploys, removes the React-bundle fragility, and auto-updates.
- _Sanity add-on:_ **Cross-origin Presentation** — the hosted Studio iframes the live site for draft preview; the site allows the Sanity app origins via CSP `frame-ancestors` (§3.5).
- _Sanity add-on:_ **Org-level hosted Dashboard** for the overview (no in-Studio dashboard plugin), and a **content-first** Studio desk — most-edited types as direct lists at the top, one click to content, Settings pinned at the bottom.
- _Sanity add-on:_ **Sanity 6** — no Sanity package is version-held; majors arrive as normal cooldown'd Dependabot PRs and are reviewed like any other upgrade (see §8).

Full narrative for the Sanity add-on: its guide, `addons/sanity/README.md` (`npm run setup` deletes `addons/`; the file stays in the starter repo), and its `sanity-and-preview` skill (`.claude/skills/sanity-and-preview/SKILL.md` once installed; `addons/sanity/files/.claude/skills/sanity-and-preview/SKILL.md` in the starter repo). The embedded-Studio alternative is in the Notion guide _"Sanity + Astro + Cloudflare: Setup Guide"_.

---

## 1. What carries over with the code (✅ in-code — verify only)

| Protection                                                    | Where it lives                                                                                   | How to verify                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTP security headers (SSR)                                   | `src/middleware.ts`                                                                              | `curl -sI` an SSR route (`/api/*`; with the Sanity add-on, `/preview/blog/<slug>`) → CSP `frame-ancestors` (`'self'`; the Sanity add-on allows the hosted Studio origins), HSTS, nosniff, Referrer-Policy, Permissions-Policy, plus `Cache-Control: private, no-store` on `/api/*`, and `X-Robots-Tag: noindex` + `Cache-Control: private, no-cache` on `/preview/*` |
| HTTP security headers (static)                                | `public/_headers`                                                                                | `curl -sI` the homepage after deploy — same five headers                                                                                                                                                                                                                                                                                                             |
| CI gates                                                      | `.github/workflows/ci.yml`                                                                       | Runs automatically on the new repo: format, config + `_headers` sync, boundary, add-on installer and setup tests, content checks, `astro check`, hover, build, built-site checks, JSON-LD, the Sanity add-on install test (`addon-sanity` job) and `npm audit` (fails on critical). The Sanity add-on replaces this workflow with its own (`checks` and `audit`)     |
| Dependabot config                                             | `.github/dependabot.yml`                                                                         | Weekly grouped updates + **review the ignore rules** (§8 — they may be obsolete by the time you fork)                                                                                                                                                                                                                                                                |
| Draft-mode security (Sanity add-on)                           | `@sanity/preview-url-secret` validation, then an HMAC-signed httpOnly session gating `loadQuery` | Drafts can't leak to public visitors — the `sanity-and-preview` skill                                                                                                                                                                                                                                                                                                |
| JSON-LD escaping, trailing-slash config, iOS-zoom-safe inputs | Various                                                                                          | Already enforced by code + CLAUDE.md conventions                                                                                                                                                                                                                                                                                                                     |

---

## 2. Identity & config (🔁 per-fork — the "one file" edits)

1. **[src/config/site.ts](../src/config/site.ts)** — name, URL, email, phone, founder, address, hours, socials, `areaServed`, brand color mirror. This is the single source for site identity.
2. **[src/config/site.shared.mjs](../src/config/site.shared.mjs)** — the site URL (the config-file-safe leaf; Sanity forks: the ids are in `src/config/sanity.shared.mjs`).
3. **[wrangler.jsonc](../wrangler.jsonc)** — worker `name` (Sanity forks: the `PUBLIC_SANITY_*` vars too). `npm run check:config` (and every build) verifies the vars and `public/_headers` against `src/config`.
4. **`.env`** — copy from [.env.example](../.env.example), fill in. **Never commit it** (gitignore already covers it; GitHub push protection is the backstop).
5. Brand: `--color-brand-500` in [colors.css](../src/styles/variables/colors.css) + the `SITE.brand.color` mirror; [logo-paths.ts](../src/config/logo-paths.ts) for the wordmark.
6. `src/data/site-structure.ts` — pages, nav, footer, banner for the new site.
7. Third-party integration ids in `SITE.integrations` ([site.ts](../src/config/site.ts)) — GTM, MailerLite, and Usercentrics. **All ship blank (`""`) = off**; fill in the ones the new site uses (Head.astro only injects each script when its id is set).
8. Local-service fields in [site.ts](../src/config/site.ts), used by the sections in `src/components/sections/`:
   - `founded`: the Hero badge year (`null` = no badge).
   - `serviceAreas`: the ServiceArea chips. Each must match a `data-area` in the client's map exactly.
   - `reviewsUrl`: the Reviews "Read all reviews" link (blank = hidden).
   - `utilityBar`: the bar above the nav (`null` = off).
9. **Replace the two sample services** in `src/content/services/` (and their photos in `images/`) with the client's real services. Each file becomes a page, a nav item and a footer link. See `.claude/skills/component-api/references/service-pages.md`.
10. **Replace the sample content** in `src/content/`: blog posts, case
    studies, projects, gallery, testimonials, authors and CTAs, with their
    photos in each folder's `images/`. Update `settings.json` and
    `FEATURED_CASE_STUDIES_SLUGS` (`src/components/sections/CaseStudyFeatured.astro`)
    and the `<SingleTestimonial name>` on the homepage to match (a missing one hides that homepage section without failing the build; `npm run dev` logs a warning naming it). Hand the client
    [`docs/editing-content.md`](editing-content.md) (the plain editing
    guide); the field reference is `.claude/skills/content-files/SKILL.md`. `npm run check:content`
    keeps working with your own content.

---

## 3. Sanity (only if you installed the add-on) (🔁 per-fork)

> First: `npm run addon:sanity` (or choose Sanity in `npm run setup`),
> then `npm install`. Content lives in files in `src/content/` by default,
> and a files-only site skips this section and every step marked
> **Sanity add-on only** in §4, §4a and §7. The `/setup` skill's Sanity
> branch (`.claude/skills/setup/references/sanity.md`) walks through it.

1. Create the Sanity project + `production` dataset (`sanity.io/manage`).
2. Generate a **Viewer token** → local `.env` (`SANITY_API_READ_TOKEN`) and later as a Cloudflare **encrypted secret** (§4). Never a plain wrangler var.
3. **CORS origins** (sanity.io/manage → API): add `https://www.<newdomain>`, the hosted Studio origin `https://<studioHost>.sanity.studio`, AND `http://localhost:3333` (local `sanity dev`) + `http://localhost:4321` (the site, for the visual-editing loader) — all with **Allow credentials** checked. `npx sanity deploy` usually adds the studio host automatically; verify it's present.
4. Set `studioHost` (+ `deployment.appId` after first deploy) in `sanity.cli.ts` (added by `npm run addon:sanity`), then `npx sanity schema deploy && npx sanity deploy`. Confirm the Studio loads at `https://<studioHost>.sanity.studio`. The Studio is **hosted, not embedded** — there is no `/studio` on the site (run `npx sanity dev` for local Studio work).
5. **Frame the site in Presentation:** the hosted Studio iframes the live site cross-origin. The branded `<studioHost>.sanity.studio` is only a redirect shim → the Studio app is sandboxed under `*.sanity.studio` nested inside the `www.sanity.io` dashboard shell, so CSP `frame-ancestors` must allow **both families** — the add-on sets them in `FRAME_ANCESTORS` in `src/config/cms.shared.mjs`, which [src/middleware.ts](../src/middleware.ts) sends and [public/_headers](../public/_headers) repeats (`npm run check:config` keeps the two in step): `https://*.sanity.io https://*.sanity.studio http://localhost:3333` — **not** just the branded host and **not** just `www.sanity.io` (a single-origin value silently blocks Presentation). Presentation's `previewUrl.initial` / `allowOrigins` in `sanity.config.ts` (added by `npm run addon:sanity`) must name the new **site** origin. ⚠️ The cross-site draft cookie can be blocked by Safari/ITP — **verify Presentation in Chrome first**; fall back to a same-site `studio.<domain>` Studio if Safari is a hard requirement.

---

## 4. Cloudflare (🔁 per-fork — all dashboard work)

1. **Workers Builds**: create the worker, connect the GitHub repo, production branch = `main`. On the **Set up your application** screen:
   - **Project name** must equal `"name"` in `wrangler.jsonc` (the dashboard suggests the repo name — change it). A mismatch fails the build or deploys under the wrong name.
   - **Build command** `npm run build` · **Deploy command** `npx wrangler deploy` (pushes to `main` go live) · **Preview command** `npx wrangler preview`.
   - **Enable Preview builds** ON — every other branch gets its own Preview URL (§4b). **Protect with Cloudflare Access** OFF unless every reviewer can log in to Access.
   - Set `vars` from wrangler.jsonc. Secrets go in as **encrypted secrets**: the GoHighLevel ones (§6) and, Sanity add-on only, `SANITY_API_READ_TOKEN`. **Previews don't inherit them** — repeat each one for Previews from the repo folder (it prompts for the value; nothing echoes):
     ```sh
     npx wrangler preview base-config secret put GHL_API_TOKEN
     npx wrangler preview base-config secret put GHL_LOCATION_ID
     # Sanity add-on only:
     npx wrangler preview base-config secret put SANITY_API_READ_TOKEN
     ```
     Base secrets reach Previews created **after** they're set, so do this before pushing the first review branch.
   - ⚠️ **Never add `limits: { cpu_ms }` to `wrangler.jsonc`** — CPU limits exist only on **Workers Paid**. On the Free plan the build stays green and then `wrangler versions upload` fails (`CPU limits are not supported for the Free plan. [code: 100328]`) — nothing ships and production silently keeps the previous build, which reads as "all my changes broke" during verification. It's unnecessary anyway: the content routes are prerendered, so the only SSR surface is `/api/*` and `/tools/*` (plus `/preview/*` with the Sanity add-on).
2. **Custom domain** attached to the worker; DNS through Cloudflare.
3. **SSL/TLS → Edge Certificates → "Always Use HTTPS" = On** (pairs with the HSTS header the code already sends).
4. **WAF rate-limiting rule** — for the public POST endpoint `/api/lead` (the GoHighLevel form handler, §6). Security → Security rules → Create rule → Rate limiting rule (free plan includes one):
   - Custom filter expression:
     ```
     (http.request.uri.path eq "/api/lead" and http.request.method eq "POST")
     ```
   - 5 requests / 10 seconds per IP → **Block**, 10 s duration
   - Every public POST endpoint should sit behind a rule like this.
5. Optional: **Security.txt** (Security → Settings) — publishes `/.well-known/security.txt` with your contact for vulnerability reports.
6. **Rebuild-debounce Worker + Sanity publish webhook — Sanity add-on only, and REQUIRED there.** A files-only site skips this: a git push is its only rebuild trigger. The content routes are **prerendered**, so a Sanity publish reaches the live site only via a rebuild: until this webhook chain is wired, publishing changes **nothing** on production (draft preview in the Studio still works — `/preview/*` fetches live). A standalone Worker in `workers/rebuild-debounce/` (added by `npm run addon:sanity`) debounces a burst of publishes into one build (~5 min quiet window, so publish-to-live is typically ~5–20 min). Deploy it and wire the webhook per its own README (`workers/rebuild-debounce/README.md`, also added by the add-on):
   - `cd workers/rebuild-debounce && npm install && npx wrangler deploy` (rename `name` in its `wrangler.jsonc` to match this fork's worker first).
     - ⚠️ If `wrangler deploy` errors with `redirected configuration path … does not exist`, delete the root `.wrangler/deploy/config.json` (a gitignored `@astrojs/cloudflare` artifact) and retry.
   - `wrangler secret put DEPLOY_HOOK_URL` (the site worker's deploy hook: Settings → Builds → Deploy hooks, targeting `main`) and `wrangler secret put WEBHOOK_TOKEN` (random, e.g. `openssl rand -hex 32`).
   - In Sanity (manage.sanity.io → API → Webhooks): **URL** = the Worker's `*.workers.dev` URL, **header** `Authorization: Bearer <WEBHOOK_TOKEN>`, **Trigger on** Create/Update/Delete, **Filter** `!(_id in path("drafts.**"))` (intentionally broad — see the `sanity-and-preview` skill), Sanity "Secret" field left blank.

### 4a. Staging-first deploy (ship to `*.workers.dev` before the real domain exists)

You can stand up a fully working site — including, with the Sanity add-on, **Presentation / visual editing** — on the Worker's free `https://<worker>.<account>.workers.dev` URL before any custom domain is attached. The code already supports this with **no per-fork edits**: `SITE_URL` (in `src/config/site.shared.mjs`) is env-overridable, and with the add-on `sanity.config.ts` drives `previewUrl.initial` + `allowOrigins` from it (plus a `https://*.workers.dev` wildcard). Per-client steps (a files-only site skips the ones marked **Sanity add-on only**):

1. **Create the Worker** from the client repo (Workers Builds connected, building from the production branch); select your deploy API token. (A missing `ai_search_write` permission warning is irrelevant — ignore it.)
2. **Create a KV namespace** for sessions and pin its id (Astro SSR sessions require it — deploy fails on the placeholder):
   - `npx wrangler kv namespace create SESSION` (or dashboard → Storage & Databases → KV → Create)
   - Put the returned 32-char id into `wrangler.jsonc` → `kv_namespaces[0].id` (binding stays `SESSION`), and into `previews.kv_namespaces[0].id` too (Worker Previews — non-production branches — inherit nothing from the top level; one namespace can serve both). Commit + push.
   - A staging site that must stay out of search: build with `SITE_NOINDEX=1` (build variable). Every page gets the noindex meta, robots.txt disallows everything, and no sitemap ships — see `src/config/seo.shared.mjs`.
3. **Sanity add-on only — add the read token secret:** create a **Viewer** token (manage.sanity.io → project → API → Tokens) and add it to the Worker as an **encrypted secret** named exactly `SANITY_API_READ_TOKEN` (Worker → Settings → Variables and Secrets).
4. **Set the build var** `SITE_URL=https://<worker>.<account>.workers.dev` in the Worker's **build** environment (read at build time for canonical URLs / sitemap / Studio preview).
5. **Make the site live:** Worker → **Domains** tab → confirm the **Production** and **Preview** `workers.dev` URLs are ON (`workers_dev` / `preview_urls` in `wrangler.jsonc` set them on every deploy). With the deploy command `npx wrangler deploy` (§4 step 1) pushes to `main` go live by themselves; an older Worker whose deploy command is still `npx wrangler versions upload` only stages a version — change it, or promote the version to 100% on the Deployments tab.
6. **Sanity add-on only — add the staging URL to Sanity CORS** with **Allow credentials** checked: manage.sanity.io → project → API → CORS Origins → add `https://<worker>.<account>.workers.dev`. (Or via Sanity MCP `add_cors_origin` with `allowCredentials: true`.)
7. **Sanity add-on only — deploy the Studio pointed at staging** (locally, from the client repo, on the deployed branch):
   ```
   SANITY_STUDIO_PREVIEW_URL=https://<worker>.<account>.workers.dev npx sanity deploy
   ```
   ⚠️ The env var **must** be on the same line before `npx`. A plain `npx sanity deploy` bakes in the `SITE_URL` fallback (the not-yet-existing production domain) and Presentation points there instead. If `sanity deploy` prints a NEW appId, write it into `sanity.cli.ts` → `deployment.appId` and commit.
8. **Sanity add-on only — verify in Chrome:** open `<studioHost>.sanity.studio` → **Presentation** → confirm the staging site loads in the frame with click-to-edit overlays. (Safari/Brave can block the cross-site draft cookie — use Chrome.)

### 4b. Preview links for client review (any branch that isn't `main`)

Worker Previews give each branch its own live copy of the site, under the same Worker, so a client can review a change before it ships:

1. Work on a branch (`git switch -c homepage-refresh`), push it. Workers Builds runs the build and then `npx wrangler preview`.
2. The link is `https://<branch>-<worker>.<account>.workers.dev` (slashes become dashes: `feat/new-hero` → `feat-new-hero-…`). It's in the Worker's **Previews** section, and Workers Builds posts it on the branch's pull request. Every push to the branch updates the same link; each deploy also gets a fixed **Deployment URL** for comparing versions.
3. Send the client the Preview link. It's public but kept out of search: Cloudflare adds `X-Robots-Tag: noindex` to workers.dev Preview URLs. (A Preview on a custom domain does NOT get that header — protect it with Access instead.)
4. Merge the branch to ship it to production. Then delete the Preview: `npx wrangler preview delete --name <branch-name>` (the free plan allows 100 per Worker).

What a Preview uses: the `previews` block in `wrangler.jsonc` (bindings and vars — `npm run check:config` keeps its vars matching the top level) and the Previews **base-config** secrets (§4 step 1). It does not use production's dashboard secrets. Forms on a Preview post to whatever GHL location the Preview secrets name — point them at a test sub-account if real leads must not mix with review clicks. Sanity add-on only: add `https://*.<account>.workers.dev` to Sanity CORS (with credentials) so Presentation and `/preview/*` work on Preview URLs.

**At launch (real domain ready) — no code commit:**

1. Attach the real domain to the Worker (DNS through Cloudflare).
2. Change the Cloudflare `SITE_URL` build var to `https://www.<realdomain>` → redeploy.
3. Sanity add-on only: add the real domain to Sanity CORS (with credentials); redeploy the Studio with `SANITY_STUDIO_PREVIEW_URL=https://www.<realdomain>` (or unset it to fall back to `SITE_URL`).

---

## 5. GitHub (🔁 per-fork)

On the new repo → Settings → Advanced Security:

1. **Dependabot alerts** — Enable
2. **Dependabot security updates** — Enable
3. **Dependabot malware alerts** — Enable
4. **Grouped security updates** — Enable
5. **Dependabot version updates** — nothing to click; activates from the committed `dependabot.yml`
6. Skip: "Automatic dependency submission" (Gradle/Maven ecosystems) and "self-hosted runners"

Account-level (once per GitHub account, not per repo): **Push protection for yourself** ([github.com/settings/security_analysis](https://github.com/settings/security_analysis)) — blocks pushes containing detectable secrets to _any_ repo. If already enabled on your account, forks inherit it automatically.

Know the private-repo limits (GitHub Free): repo-level secret scanning and branch protection rulesets require Pro or a public repo. The compensating controls: account-level push protection (above) + CI visibly red/green on every PR + solo-dev PR discipline.

Finally: open one trivial PR (or wait for Dependabot's first) and confirm every CI job runs green: `checks`, `addon-sanity` and `audit` (with the Sanity add-on installed, its workflow has `checks` and `audit`).

---

## 6. GoHighLevel forms (🔁 per-fork)

The starter ships a GoHighLevel lead pipeline. `<LeadForm>` posts to `/api/lead`, and the staff-only Client tools page lives at `/tools`. Each form's tags are set in `src/config/forms.ts`. Per fork:

- [ ] Set the tags in `src/config/forms.ts` to match the client's GHL workflows ("Contact Tag added" triggers; turn "Allow re-entry" on for `retrigger` forms).
- [ ] Add `GHL_API_TOKEN` and `GHL_LOCATION_ID` as Cloudflare **secrets** (never plain vars), and put them in local `.env`.
- [ ] Add the WAF rate-limit rule from §4 (item 4) for `/api/lead`.
- [ ] Gate `/tools` — ONE of: Cloudflare Access on the `/tools` path + `CF_ACCESS_TEAM_DOMAIN` / `CF_ACCESS_AUD` (domain on Cloudflare in our account), **or** a `TOOLS_PASSWORD` **Secret** (Settings → Variables and Secrets — not the Builds section) for sites served through Cloudflare for SaaS. With neither, `/tools` is locked (503).
- [ ] Leave `SITE.smsOptIn` **false** until the client's A2P 10DLC registration is approved (no Phone field or SMS consent on public forms meanwhile). Put any "we'll call you back" phrases in `SMS_OFF_COPY_SWAPS` (`src/config/sms-consent.ts`). Flip to `true` once approved.
- [ ] Set `SITE.legalName` (used in the SMS consent wording) and `SITE.googleReviewUrl` (the Google "write a review" link `/leave-a-review` sends happy customers to).
- [ ] Edit the offer copy on `/get-your-discount`, and point the GHL review-request and 1-year follow-up messages at `/leave-a-review` and `/get-your-discount`.
- [ ] Optional: `SITE.integrations.ghlChatWidgetId` (chat widget) and `ghlTrackingId` (Settings → External Tracking → the `tk_…` id).

Full walkthrough: [ghl-forms.md](ghl-forms.md).

---

## 7. Post-launch verification (🔁 per-fork — ~5 minutes, copy/paste)

```bash
# Security headers — static page (served via public/_headers)
curl -sI https://www.<domain>/ | grep -iE "content-security|strict-transport|x-content-type|referrer|permissions"

# Security headers — content page (prerendered → served via public/_headers)
curl -sI https://www.<domain>/blog/<slug> | grep -iE "content-security|cache-control"

# Sanity add-on only — security + robots headers on an SSR preview page (served via middleware):
# expect X-Robots-Tag: noindex, nofollow and Cache-Control: private, no-cache
curl -sI https://www.<domain>/preview/blog/<slug> | grep -iE "content-security|cache-control|x-robots"

# Sitemap sanity: entries present, no /preview or /thank-you URLs
curl -s https://www.<domain>/sitemap-0.xml | grep -c "<loc>"
curl -s https://www.<domain>/sitemap-0.xml | grep -E "/preview|/thank-you" || echo "OK: no excluded URLs"

# Dependency health
npm audit --omit=dev --audit-level=critical   # expect 0 critical (matches the CI gate)
```

Plus, in a browser: one full form submission reaches the client's GoHighLevel sub-account (§6), and — Sanity add-on only — the hosted Studio loads at `https://<studioHost>.sanity.studio` and its Presentation tool previews the live site (click-to-edit overlays appear).

Handing the finished site to the client: [handing-off.md](handing-off.md) (sample content, transfer by GitHub or zip, the accounts and secrets that move).

---

## 8. Ongoing security rhythm (applies to this repo AND every fork)

- **Dependabot PR triage**: CI green → generally merge. **Exception (Sanity add-on only): anything touching `sanity`, `@sanity/*`, `styled-components`, or `react` gets a 60-second local check first** — run `npx sanity dev` and confirm the Studio loads, then `npm run dev`, enter draft preview, and confirm the React visual-editing islands (`SanityVisualEditing` / `DisableDraftMode`) mount without an "Invalid hook call". CI cannot catch this (it's a client-side runtime failure).
- **"Invalid hook call" in dev** (Sanity add-on only) ≠ broken dependencies. If the Studio or the React islands suddenly break mid-session, restart the dev server first (Vite optimizer artifact). Only suspect packages if a _fresh_ server with cleared `node_modules/.vite` + `.astro` still fails.
- **Current pins** (review at fork time — these may be resolved by then). Core's `overrides` in `package.json` (`npm ls <pkg>` shows what pulls each one in):

  | Override                                                     | Why                                                                                                                                                                                                                                                                                    | Remove when                                                                                      |
  | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
  | `esbuild` ^0.28.1                                            | Forces the patched esbuild through `astro`, `vite` and `wrangler` (the advisory §9 uses as its example)                                                                                                                                                                                | `astro`, `vite` and `wrangler` all depend on a patched esbuild themselves                        |
  | `ws` ^8.21.0                                                 | `ws` ≤8.20.1 DoS advisory, reaching core through `@astrojs/cloudflare` → `@cloudflare/vite-plugin` / `miniflare`. A same-major patch bump, which avoids npm's `audit fix --force` (a **major downgrade** of `@astrojs/cloudflare`). Build/dev tooling only, not in the deployed Worker | `@astrojs/cloudflare`'s chain ships `ws` ≥8.21 itself; drop it and re-run `npm audit --omit=dev` |
  | `undici` ^7.28.0 (also nested under `miniflare` and `jsdom`) | Floors undici through `astro` (`unifont`) and `miniflare`. `npm audit` still lists undici as a standing **high** (the `audit` job comment in `ci.yml`), so raise the floor when a patched release exists. Nothing in core pulls in `jsdom` (`npm ls jsdom` is empty)                   | `astro` and `miniflare` depend on a patched undici themselves                                    |
  | `form-data` ^4.0.6                                           | `form-data` 4.0.0–4.0.5 advisory. Nothing in core uses it: it reaches a fork only through the Sanity add-on's `sanity` → `@sanity/cli` chain. Kept in core because the add-on's manifest carries no `overrides`                                                                        | `sanity`/`@sanity/cli` ship a patched `form-data`, or the add-on is never used                   |

  Nothing holds `typescript` back: it is `^5` only because no TypeScript 6 bump has been taken yet (`@astrojs/check` and the Sanity Studio's `react-i18next` both accept 6), so Dependabot proposes the major like any other. No TypeScript 6 build has been run here yet, so check and build that PR before merging; majors above 6 aren't accepted by `@astrojs/check` (its peer range is `^5.0.0 || ^6.0.0`).

  > **Sanity add-on:** its packages and their ranges live in `addons/sanity/manifest.json` (merged into `package.json` on install), not here. `@sanity/astro` rides at `^3.5.1`. If a duplicate-React "Invalid hook call" appears in dev after a bump ([sanity-astro#406](https://github.com/sanity-io/sanity-astro/issues/406)), pin `@sanity/astro` to the last-good version and add a Dependabot ignore until the upstream fix lands.

- **Audit cadence**: the CI `audit` job runs `npm audit --omit=dev --audit-level=critical` and fails any PR that introduces a **critical** advisory in production dependencies.

  The gate sits at `critical`, not `high`, because the standing high advisories in this tree can't be fixed from here: they arrive through **Astro's**, the **Cloudflare adapter's** and **wrangler's** own dependencies (the list is in the comment above the `audit` job in `.github/workflows/ci.yml`), so the fix is an upstream release. A fork with the Sanity add-on also carries the **Sanity CLI** chain's highs, where npm's only offered "fix" is a **major downgrade** of `sanity`; the add-on's workflow keeps the same `critical` gate.

  Because the gate no longer catches highs automatically, review them deliberately: run `npm audit --omit=dev --audit-level=high` periodically, and when upstream ships patched releases, tighten `ci.yml` back to `--audit-level=high`.

---

## 9. Responding to a security flag (CI `audit` fails, or a Dependabot/GitHub alert)

The `audit` job re-checks dependencies against GitHub's **live** advisory database on every push, so a PR can fail for a vulnerability that has nothing to do with its changes — a new advisory was simply published since the last green run. This is the gate working, not a bug. Triage it in ~60 seconds:

1. **Severity** — the gate only blocks **critical**; review a new **high** by hand (§8). Moderate/low are batched later, not urgent.
2. **Runtime vs. build/dev-only** — _does the package run inside the deployed Worker, or only locally / in CI during the build?_ Build tools (esbuild, vite, wrangler, typescript, @astrojs/*) can't be reached by a site visitor — low real-world risk. A flaw in something that runs in the Worker (request handling, page rendering, anything in `src/`) is serious.
3. **Reachability** — does the flaw apply to how you actually use it? (e.g. a "Deno registry" or "Windows dev server" flaw doesn't apply to a Mac/Cloudflare setup.)
4. **Fix available?** — if a patched version exists, adopt it (see below). If npm's only offered fix is a **major downgrade** of a framework package (`sanity`, `astro`, `@astrojs/cloudflare`), don't take it: note the advisory and wait for an upstream patch.

**Decision:** high/critical **and** runs in production **and** reachable **and** unfixed → drop everything. Anything less → calm, scheduled fix.

### Adopting a fix — three tools, in order of preference

- **Plain bump** — `npm install <pkg>@<patched>`. Works when the vulnerable package is a direct dependency.
- **`overrides`** (in `package.json`) — forces a single _transitive_ sub-dependency to a patched version across the whole tree, even when the parents still ask for the old one. Use when `npm audit fix` only offers a breaking parent downgrade. Example (how the esbuild advisory was handled):
  ```jsonc
  "overrides": { "esbuild": "^0.28.1" }
  ```
  After editing: `npm install` (updates the lockfile), then verify `npm audit --omit=dev --audit-level=critical`, `npm run check`, and `npm run build` all pass before committing. Revisit/remove the override later once the parent packages catch up on their own.
- **Exact pin** (no caret, e.g. `"pkg": "1.2.3"`) — for a package whose _newer_ versions are broken (not vulnerable). Pair with a `dependabot.yml` ignore rule so it isn't re-proposed. (The `@sanity/astro` note in §8 is the likely case.)

### `npm audit` ≠ malware protection

`npm audit` finds **known bugs (CVEs)** in legitimate packages. It does **not** catch **supply-chain malware** — a malicious version injected into a real package (the 2025 npm worm / maintainer-account compromises). Those are defended differently, and these are already in place:

- **Dependabot malware alerts** (enabled in §5) — GitHub flags known-malicious packages.
- **The lockfile** — `npm ci` installs only the exact vetted versions in `package-lock.json`; a compromised release can't reach you until something updates that lockfile through a PR you review.
- **Cooldown** (`dependabot.yml`) — version-update PRs wait 7 days (14 for majors) before being proposed, so freshly-published malware is detected and pulled from npm before you'd ever adopt it. Security/CVE updates bypass cooldown and still arrive immediately.
- **Review, never auto-merge** dependency PRs — and apply the Sanity visual-editing check from §8 where relevant.
- **Fewer dependencies = smaller attack surface** — weigh that before adding any new package.
