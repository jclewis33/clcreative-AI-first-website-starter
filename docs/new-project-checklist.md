# New Project Checklist — Forking This Codebase

This repo doubles as a template. When you fork/duplicate it for a new project, the code carries most of the security hardening with it — but several protections live in **dashboards** (Cloudflare, GitHub, Sanity) and must be re-created per project. This checklist covers both: what to verify and what to set up.

Work top to bottom. Items marked **🔁 per-fork** must be done for every new project. Items marked **✅ in-code** ship with the repo — verify them, don't rebuild them.

> ## ⚡ Fastest path: let the tooling do it
>
> Two helpers automate most of this list so you rarely hand-edit config:
>
> - **`/setup` (Claude Code skill)** — *recommended.* In a Claude Code session on the fork, run `/setup`. Claude gathers your identity info, **creates the new Sanity project + dataset, deploys the schema, and adds the CORS origins** via the Sanity MCP, runs the CLI below for the file edits, verifies with a build, then hands you the short list of dashboard items only a human can finish. It also **pulls brand colors from a Figma file** (when a Figma MCP is connected), asks about your **fluid type scale**, and walks you through swapping **fonts, the OG image, favicon, and logos**. This is the only path that automates standing up the Sanity backend. See [.claude/skills/setup/SKILL.md](../.claude/skills/setup/SKILL.md).
> - **`npm run setup` (CLI)** — the deterministic engine. Prompts for each identity value and rewrites `site.shared.mjs`, `site.ts`, `wrangler.jsonc`, `colors.css`, `themes.css`, `typography.css`, `logo-paths.ts`, `sanity.cli.ts`, and `.env`. Also accepts `cssColors` / `themeColors` / `fluidType` maps (via `--config`) so a Figma palette and type scale land deterministically. No AI, no network — works for anyone forking. (`/setup` calls this under the hood.) It does **not** create the Sanity project, swap fonts/images, or touch any dashboard.
>
> Both deliberately **leave the content scaffolding** (`areaServed`, `social`, `sameAs`, `faqs.ts`, `site-structure.ts`) in place as a working skeleton — review and replace that copy for your business after setup. The sections below remain the source of truth for the **dashboard work neither tool can perform** (Cloudflare secrets/WAF/domain, GitHub Dependabot, the Sanity Viewer token).

---

## Architecture this fork sets up (the Your Company default)

Every fork lands on the same proven shape — chosen to lean into what Sanity is actively investing in (Core apps, the hosted Dashboard, an auto-updating hosted Studio) and to keep client builds low-maintenance:

- **Astro hybrid site** on one Cloudflare Worker — static marketing pages + SSR CMS routes (blog / case studies / glossary) with cookie-based draft preview ("Option A").
- **Sanity Studio hosted by Sanity** — a Core app at `<studioHost>.sanity.studio`, deployed with `npx sanity deploy`. **Not embedded** at `/studio` (that's the legacy alternative). Hosting decouples Studio updates from site deploys, removes the React-bundle fragility, and auto-updates.
- **Cross-origin Presentation** — the hosted Studio iframes the live site for draft preview; the site allows the Sanity app origins via CSP `frame-ancestors` (§3.5).
- **Org-level hosted Dashboard** for the overview (no in-Studio dashboard plugin), and a **content-first** Studio desk — most-edited types as direct lists at the top, one click to content, Settings pinned at the bottom.
- **Sanity 5** — v6 is **deferred** (a known upstream npm bug blocks it on CI; see the pins note in §8). Stay on v5; the hosted Studio stays current within it.

Full narrative + the embedded alternative: the Notion guide *"Sanity + Astro + Cloudflare: Setup Guide"* and CLAUDE.md's *"Deployment, Sanity Studio & Preview"* section.

---

## 1. What carries over with the code (✅ in-code — verify only)

| Protection | Where it lives | How to verify |
|---|---|---|
| HTTP security headers (SSR) | `src/middleware.ts` | `curl -sI` any SSR route → CSP `frame-ancestors` (allows the hosted Studio origin), HSTS, nosniff, Referrer-Policy, Permissions-Policy |
| HTTP security headers (static) | `public/_headers` | `curl -sI` the homepage after deploy — same five headers |
| API input hardening | `src/pages/api/scorecard.ts` | 50 KB body cap (413), strict field-by-field validation (400), honeypot fake-success — see §7 test commands |
| Form honeypot | `MarketingScorecard.tsx` (`company` field) + `.scorecard_hp_field` CSS | Hidden field present in the email-gate form |
| CI gates | `.github/workflows/ci.yml` | Runs automatically on the new repo: config sync, `astro check`, build, `npm audit` (fails on high/critical) |
| Dependabot config | `.github/dependabot.yml` | Weekly grouped updates + **review the ignore rules** (§8 — they may be obsolete by the time you fork) |
| Draft-mode security | `@sanity/preview-url-secret` validation, cookie-gated `loadQuery` | Drafts can't leak to public visitors — architecture note in CLAUDE.md |
| JSON-LD escaping, trailing-slash config, iOS-zoom-safe inputs | Various | Already enforced by code + CLAUDE.md conventions |

---

## 2. Identity & config (🔁 per-fork — the "one file" edits)

1. **[src/config/site.ts](../src/config/site.ts)** — name, URL, email, phone, founder, address, hours, socials, `areaServed`, brand color mirror. This is the single source for site identity.
2. **[src/config/site.shared.mjs](../src/config/site.shared.mjs)** — new Sanity projectId/dataset + site URL (the config-file-safe leaf).
3. **[wrangler.jsonc](../wrangler.jsonc)** — worker `name`, `PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET`. `npm run check:config` (and every build) verifies it matches site.shared.mjs.
4. **`.env`** — copy from [.env.example](../.env.example), fill in. **Never commit it** (gitignore already covers it; GitHub push protection is the backstop).
5. Brand: `--color-brand-500` in [colors.css](../src/styles/variables/colors.css) + the `SITE.brand.color` mirror; [logo-paths.ts](../src/config/logo-paths.ts) for the wordmark.
6. `src/data/site-structure.ts` — pages, nav, footer, banner for the new site.
7. Third-party integration ids in `SITE.integrations` ([site.ts](../src/config/site.ts)) — GTM, MailerLite, Usercentrics, and the HoneyBook placement id. **All ship blank (`""`) = off**; fill in the ones the new site uses (Head.astro only injects each script when its id is set). The `HoneyBookEmbed*` components ([src/components/ui/](../src/components/ui/)) are currently **unused** — wire one in where you want a booking/contact form, or delete them.

---

## 3. Sanity (🔁 per-fork)

1. Create the Sanity project + `production` dataset (`sanity.io/manage`).
2. Generate a **Viewer token** → local `.env` (`SANITY_API_READ_TOKEN`) and later as a Cloudflare **encrypted secret** (§4). Never a plain wrangler var.
3. **CORS origins** (sanity.io/manage → API): add `https://www.<newdomain>`, the hosted Studio origin `https://<studioHost>.sanity.studio`, AND `http://localhost:3333` (local `sanity dev`) + `http://localhost:4321` (the site, for the visual-editing loader) — all with **Allow credentials** checked. `npx sanity deploy` usually adds the studio host automatically; verify it's present.
4. Set `studioHost` (+ `deployment.appId` after first deploy) in [sanity.cli.ts](../sanity.cli.ts), then `npx sanity schema deploy && npx sanity deploy`. Confirm the Studio loads at `https://<studioHost>.sanity.studio`. The Studio is **hosted, not embedded** — there is no `/studio` on the site (run `npx sanity dev` for local Studio work).
5. **Frame the site in Presentation:** the hosted Studio iframes the live site cross-origin. The branded `<studioHost>.sanity.studio` is only a redirect shim → the Studio app is sandboxed under `*.sanity.studio` nested inside the `www.sanity.io` dashboard shell, so [src/middleware.ts](../src/middleware.ts) + [public/_headers](../public/_headers) must allow **both families** via CSP `frame-ancestors`: `https://*.sanity.io https://*.sanity.studio http://localhost:3333` — **not** just the branded host and **not** just `www.sanity.io` (an early single-origin value silently blocked Presentation). Presentation's `previewUrl.initial` / `allowOrigins` in [sanity.config.ts](../sanity.config.ts) must name the new **site** origin. ⚠️ The cross-site draft cookie can be blocked by Safari/ITP — **verify Presentation in Chrome first**; fall back to a same-site `studio.<domain>` Studio if Safari is a hard requirement.

---

## 4. Cloudflare (🔁 per-fork — all dashboard work)

1. **Workers Builds**: create the worker, connect the GitHub repo, production branch = `main`. Set `vars` from wrangler.jsonc; add `SANITY_API_READ_TOKEN` as an **encrypted secret**.
2. **Custom domain** attached to the worker; DNS through Cloudflare.
3. **SSL/TLS → Edge Certificates → "Always Use HTTPS" = On** (pairs with the HSTS header the code already sends).
4. **WAF rate-limiting rule** (Security → Security rules → Create rule → Rate limiting rule — free plan includes one):
   - Name: `Scorecard API limit` (or the fork's form endpoint)
   - Custom filter expression:
     ```
     (http.request.uri.path eq "/api/scorecard" and http.request.method eq "POST")
     ```
   - 5 requests / 10 seconds per IP → **Block**, 10 s duration
   - Adjust the path if the fork renames or adds POST endpoints — every public POST endpoint should sit behind a rule like this.
5. Optional: **Security.txt** (Security → Settings) — publishes `/.well-known/security.txt` with your contact for vulnerability reports.

---

## 5. GitHub (🔁 per-fork)

On the new repo → Settings → Advanced Security:

1. **Dependabot alerts** — Enable
2. **Dependabot security updates** — Enable
3. **Dependabot malware alerts** — Enable
4. **Grouped security updates** — Enable
5. **Dependabot version updates** — nothing to click; activates from the committed `dependabot.yml`
6. Skip: "Automatic dependency submission" (Gradle/Maven ecosystems) and "self-hosted runners"

Account-level (once per GitHub account, not per repo): **Push protection for yourself** ([github.com/settings/security_analysis](https://github.com/settings/security_analysis)) — blocks pushes containing detectable secrets to *any* repo. If already enabled on your account, forks inherit it automatically.

Know the private-repo limits (GitHub Free): repo-level secret scanning and branch protection rulesets require Pro or a public repo. The compensating controls: account-level push protection (above) + CI visibly red/green on every PR + solo-dev PR discipline.

Finally: open one trivial PR (or wait for Dependabot's first) and confirm both CI jobs (`checks`, `audit`) run green.

---

## 6. Email / lead-capture services (🔁 per-fork, if keeping the scorecard or similar forms)

1. **Resend**: API key, verify the new sending domain, set `RESEND_FROM` (or update the fallback in `scorecard.ts` — search for `fork:`).
2. **MailerLite**: API key + group ID.
3. Set `MAILERLITE_API_KEY`, `MAILERLITE_GROUP_ID`, `RESEND_API_KEY`, `RESEND_FROM`, `NOTIFICATION_EMAIL` in Cloudflare (secrets for keys, vars for the rest) and local `.env`.
4. If the fork drops the scorecard: delete `src/pages/api/scorecard.ts`, `MarketingScorecard.tsx`, and the WAF rule — don't leave a dead authenticated endpoint around.

---

## 7. Post-launch verification (🔁 per-fork — ~5 minutes, copy/paste)

```bash
# Security headers — static page (served via public/_headers)
curl -sI https://www.<domain>/ | grep -iE "x-frame|strict-transport|x-content-type|referrer|permissions"

# Security headers — SSR page (served via middleware) — use a blog/case-study slug
curl -sI https://www.<domain>/blog/<slug> | grep -iE "x-frame|cache-control"

# API validation: bad email -> 400, oversized -> 413, honeypot -> fake 200
curl -s -w " [%{http_code}]" -X POST https://www.<domain>/api/scorecard \
  -H 'content-type: application/json' -d '{"firstName":"T","email":"bad","totalScore":1,"maxScore":105,"tier":"x","rooms":[{"name":"a","subtitle":"b","score":1,"max":15,"questions":[]}]}'
curl -s -w " [%{http_code}]" -X POST https://www.<domain>/api/scorecard \
  -H 'content-type: application/json' -d '{"company":"bot","firstName":"T","email":"t@example.com","totalScore":1,"maxScore":105,"tier":"x","rooms":[]}'

# Rate limit: 9 rapid POSTs -> first 5 reach the API (400), rest blocked (429), recovers after ~10s
for i in $(seq 1 9); do curl -s -o /dev/null -w "%{http_code} " -X POST https://www.<domain>/api/scorecard -H 'content-type: application/json' -d '{}'; done; echo

# Dependency health
npm audit --omit=dev   # expect 0 high / 0 critical
```

Plus, in a browser: the hosted Studio loads at `https://<studioHost>.sanity.studio` and its Presentation tool previews the live site (click-to-edit overlays appear), and one full form submission delivers the complete notification email.

---

## 8. Ongoing security rhythm (applies to this repo AND every fork)

- **Dependabot PR triage**: CI green → generally merge. **Exception: anything touching `sanity`, `@sanity/*`, `styled-components`, or `react` gets a 60-second local check first** — run `npx sanity dev` and confirm the Studio loads, then `npm run dev`, enter draft preview, and confirm the React visual-editing islands (`SanityVisualEditing` / `DisableDraftMode`) mount without an "Invalid hook call". CI cannot catch this (it's a client-side runtime failure).
- **"Invalid hook call" in dev** ≠ broken dependencies. If the Studio or the React islands suddenly break mid-session, restart the dev server first (Vite optimizer artifact). Only suspect packages if a *fresh* server with cleared `node_modules/.vite` + `.astro` still fails.
- **Current pins** (review at fork time — these may be resolved by then):

  | Pin | Why | Remove when |
  |---|---|---|
  | `sanity` + `@sanity/vision` majors held in Dependabot | **Sanity 6 attempted June 2026 and DEFERRED.** Runtime is fine (site build, `sanity build`, Studio + visual editing), but `sanity@6`'s native dep tree breaks `npm ci` on the **Linux CI/Cloudflare runners** — an upstream npm bug ([npm/cli#8320](https://github.com/npm/cli/issues/8320)): `@emnapi/wasi-threads` (an optional peer) is written to the lockfile versionless, and npm's Linux dedup throws `TypeError: Invalid Version:`. Passes on macOS. Not fixed by clean lockfile regen, Node 24 / npm 11, or `@emnapi` overrides. **Stay on Sanity 5** (it's fully supported; the hosted Studio auto-updates within it). | The npm/@emnapi bug is fixed upstream — then retry v6 (drop these ignores), checking [are-we-v6-yet.sanity.dev](https://are-we-v6-yet.sanity.dev/) |
  | `typescript` ^5 (not 6) | `react-i18next` (inside Sanity Studio) peers typescript ^5 | The Sanity chain accepts TS 6 |
  | `overrides`: `ws` ^8.21.0, `form-data` ^4.0.6 (June 2026) | Forced patched transitive versions to clear the 6 **high** `audit` advisories (`ws` ≤8.20.1 DoS; `form-data` 4.0.0–4.0.5) reaching us via `@astrojs/cloudflare` (Cloudflare vite-plugin/miniflare/wrangler) and `sanity` → `@sanity/cli`. Same-major patch bumps — avoids npm's `audit fix --force` "fix" which would **downgrade** `@astrojs/cloudflare` 13→12.6.13 and `sanity` 5→3.70.0. Build/CLI tooling only (not in the deployed Worker runtime). | `@astrojs/cloudflare` + `sanity`/`@sanity/cli` ship the patched `ws`/`form-data` themselves — then drop the two overrides and re-run `npm audit --omit=dev --audit-level=high` |

  > **Note (June 2026):** `@sanity/astro` was previously pinned to exactly `3.3.1` because `3.4.x` caused a duplicate-React "Invalid hook call" in dev ([sanity-astro#406](https://github.com/sanity-io/sanity-astro/issues/406)). That pin was **lifted to `^3.4.1`** after the embedded Studio (the trigger) moved to Sanity hosting and `3.4.1` tested clean (build + dev islands). If the hook error reappears in dev after a future bump, re-pin and reopen the ignore.

- **Audit cadence**: the CI `audit` job fails any PR that introduces a high/critical advisory, so the tree stays clean passively. If a transitive CVE blocks merges and can't be fixed quickly, the documented loosening is `--audit-level=critical` in `ci.yml`.

---

## 9. Responding to a security flag (CI `audit` fails, or a Dependabot/GitHub alert)

The `audit` job re-checks dependencies against GitHub's **live** advisory database on every push, so a PR can fail for a vulnerability that has nothing to do with its changes — a new advisory was simply published since the last green run. This is the gate working, not a bug. Triage it in ~60 seconds:

1. **Severity** — the gate only blocks **high/critical**. Moderate/low are batched later, not urgent.
2. **Runtime vs. build/dev-only** — *does the package run inside the deployed Worker, or only locally / in CI during the build?* Build tools (esbuild, vite, wrangler, typescript, @astrojs/*) can't be reached by a site visitor — low real-world risk. A flaw in something that runs in the Worker (request handling, page rendering, anything in `src/`) is serious.
3. **Reachability** — does the flaw apply to how you actually use it? (e.g. a "Deno registry" or "Windows dev server" flaw doesn't apply to a Mac/Cloudflare setup.)
4. **Fix available?** — if a patched version exists, adopt it (see below). If not, accept temporarily or, as a last resort, loosen the gate to `--audit-level=critical` in `ci.yml`.

**Decision:** high/critical **and** runs in production **and** reachable **and** unfixed → drop everything. Anything less → calm, scheduled fix.

### Adopting a fix — three tools, in order of preference

- **Plain bump** — `npm install <pkg>@<patched>`. Works when the vulnerable package is a direct dependency.
- **`overrides`** (in `package.json`) — forces a single *transitive* sub-dependency to a patched version across the whole tree, even when the parents still ask for the old one. Use when `npm audit fix` only offers a breaking parent downgrade. Example (how the esbuild advisory was handled):
  ```jsonc
  "overrides": { "esbuild": "^0.28.1" }
  ```
  After editing: `npm install` (updates the lockfile), then verify `npm audit --omit=dev --audit-level=high`, `npm run check`, and `npm run build` all pass before committing. Revisit/remove the override later once the parent packages catch up on their own.
- **Exact pin** (no caret, e.g. `"pkg": "1.2.3"`) — for a package whose *newer* versions are broken (not vulnerable). Pair with a `dependabot.yml` ignore rule so it isn't re-proposed. (See the `@sanity/astro` pin above.)

### `npm audit` ≠ malware protection

`npm audit` finds **known bugs (CVEs)** in legitimate packages. It does **not** catch **supply-chain malware** — a malicious version injected into a real package (the 2025 npm worm / maintainer-account compromises). Those are defended differently, and these are already in place:

- **Dependabot malware alerts** (enabled in §5) — GitHub flags known-malicious packages.
- **The lockfile** — `npm ci` installs only the exact vetted versions in `package-lock.json`; a compromised release can't reach you until something updates that lockfile through a PR you review.
- **Cooldown** (`dependabot.yml`) — version-update PRs wait 7 days (14 for majors) before being proposed, so freshly-published malware is detected and pulled from npm before you'd ever adopt it. Security/CVE updates bypass cooldown and still arrive immediately.
- **Review, never auto-merge** dependency PRs — and apply the Sanity visual-editing check from §8 where relevant.
- **Fewer dependencies = smaller attack surface** — weigh that before adding any new package.
