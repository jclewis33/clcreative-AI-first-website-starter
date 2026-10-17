# Sanity add-on

Turns this starter's content source from local files (`src/content/`) into
[Sanity](https://www.sanity.io): a hosted Studio for editors, draft
preview inside the Studio (Presentation), and a publish → rebuild
webhook. Without it, the site has no Sanity code, packages, config or env
vars.

## What it adds

- **Content source:** `src/sanity/` (schemas, GROQ queries, TypeGen
  types, loaders and the mappers to the view models in
  `src/lib/content/types.ts`) and `src/lib/content/source.ts` pointing at
  it. Pages, templates and sections don't change: they read
  `@/lib/content` in both modes.
- **Draft preview:** the SSR `/preview/*` twins of the detail routes,
  `/api/draft-mode/{enable,disable}`, and the React visual-editing islands.
- **Studio:** `sanity.config.ts`, `sanity.cli.ts`, `sanity-typegen.json`.
- **Rebuilds:** `workers/rebuild-debounce/`, the Worker that turns a burst
  of publishes into one Cloudflare build.
- **Checks and tools:** the parity fixtures (`src/sanity/lib/fixtures/`),
  `scripts/check-stega-leaks.mjs`, `scripts/check-fixture-markdown.mjs`,
  `scripts/check-preview-session.mjs`, `scripts/compare-dist.mjs` with `--equivalent`,
  `scripts/migrate-webflow-blog.mjs`, and the boundary rule
  `scripts/boundary/sanity.json`.
- **Docs:** the `sanity-and-preview` skill and the Studio-branding
  reference for `/setup`.
- **Merged into your files** (from `manifest.json`): the Sanity and React
  packages and the `studio`, `studio:local`, `typegen`, `check:fixtures`,
  `check:stega` and `check:preview-session` scripts in `package.json`; the
  `PUBLIC_SANITY_PROJECT_ID` / `PUBLIC_SANITY_DATASET` vars in
  `wrangler.jsonc`; JSX and Sanity types in `tsconfig.json`; the Sanity
  block in `.env.example`; three `.gitignore` rules.

It **overwrites** these files, which are seams designed to be replaced:
`src/lib/content/source.ts`, `src/config/cms.mjs`,
`src/config/cms.shared.mjs`, `src/components/global/CmsEditing.astro`,
`src/components/blog/BlogBody.astro`, `public/_headers`,
`scripts/compare-dist.mjs` and `.github/workflows/ci.yml`. If you
customised one, re-apply your change after installing; `git diff` shows
exactly what changed.

## Install it

At setup: `npm run setup` (or `/setup`) and answer **sanity** to the
content-source question. It runs the installer for you.

Later, in an existing project:

1. If `addons/sanity/` is gone (setup deletes it), copy that folder from
   the starter repo into the project — from the same starter version (commit) the project was created from.
   A newer overlay replaces whole files (`source.ts`, `ci.yml`, …) and
   can mismatch an older fork; to use a newer add-on, first update the
   project to that starter version.
2. Commit, so the tree is clean. The installer refuses uncommitted
   changes so that `git diff` afterwards shows only what it did; a
   project that isn't a git repository needs `--force`.
3. `npm run addon:sanity` (`-- --dry-run` lists every change first).
4. `npm install`, then `npm run check && npm run build`. The placeholder
   project id builds an empty site, by design.
5. Set up the Sanity project, Studio, Viewer token, CORS and the publish
   webhook: the `/setup` skill's Sanity branch
   (`.claude/skills/setup/references/sanity.md`).

Content already in `src/content/` is not migrated into Sanity.

## Remove it

Commit the install as its own commit; `git revert <that commit>` then
`npm install` removes it. That doesn't work after `npm run setup` chose
Sanity (the install and setup's writes are one commit) or when the
install commit wasn't kept: then follow the step-by-step removal in the
`sanity-and-preview` skill, "Removing the add-on"
(`.claude/skills/sanity-and-preview/SKILL.md` once installed;
[`files/.claude/skills/sanity-and-preview/SKILL.md`](files/.claude/skills/sanity-and-preview/SKILL.md)
here). Content in Sanity is not exported back to `src/content/`.

## Maintaining it (in the starter repo)

The overlay in `files/` is not built or type-checked in place
(`tsconfig.json` excludes `addons/`). `node scripts/check-addon-sanity.mjs`
(`npm run check:addon`) installs it into a scratch copy of the repo and
runs the checks and builds there; `--keep` leaves the copy for working
in. Edit there, run
`npm run typegen` there after a schema or query change, and copy the
changed files back under `files/`. CI runs the same script on every PR.

## Operating it

### Sanity webhook

Configured at [manage.sanity.io](https://www.sanity.io/manage) → project `your-sanity-project-id` → API → Webhooks.

| Field       | Value                                                                                                                                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| URL         | The rebuild-debounce Worker's `*.workers.dev` URL (see [Rebuild-debounce Worker](#rebuild-debounce-worker) below) — **not** the deploy hook directly. The Worker holds the real deploy hook as a secret and calls it after debouncing. |
| HTTP header | `Authorization: Bearer <WEBHOOK_TOKEN>` (must match the Worker's `WEBHOOK_TOKEN` secret) — leave Sanity's "Secret" field blank (that's a different HMAC feature we don't use)                                                          |
| Dataset     | `production`                                                                                                                                                                                                                           |
| Trigger on  | Create, Update, Delete                                                                                                                                                                                                                 |
| HTTP method | `POST`                                                                                                                                                                                                                                 |
| Filter      | `!(_id in path("drafts.**"))`                                                                                                                                                                                                          |

The filter is intentionally **broad**: it matches any published document of **any type**. The single clause only excludes autosaved drafts so typing in Studio doesn't thrash the build. Clicking **Publish** (or a release going live) writes to the non-draft ID and passes the filter; unpublishing fires it too, so removed content clears on the next build.

**Why broad rather than a `_type` allowlist?** On this stack nearly every content type surfaces on a built page (sitemap, `llms.txt`, static cards, the navbar), so a per-type allowlist would just be a list you have to remember to update. With the broad filter, **a new content type triggers rebuilds automatically** — nothing to keep in sync. The occasional extra trigger is harmless: the debounce Worker (below) collapses a burst of publishes into a single build.

Update is kept on (not just Create/Delete) because **every content page is static** — an edit to any published document needs a rebuild to show up anywhere on the site.

### Rebuild-debounce Worker

The Sanity webhook fires **once per published document**, so publishing several docs in a row would kick off several builds. A tiny standalone Cloudflare Worker in `workers/rebuild-debounce/` (installed by the add-on) sits between Sanity and the deploy hook and **collapses a burst of publishes into one build** (Durable Object alarm; ~5 min debounce, 15 min max wait).

The chain is: **publish → debounce Worker (waits ~5 min) → Cloudflare deploy hook → one build.** The deploy hook still lives on the site worker; the debounce Worker only calls it. Point the Sanity webhook **URL** at the debounce Worker's `*.workers.dev` URL (not directly at the deploy hook) and add an `Authorization: Bearer <token>` header — see the Worker's own README (`workers/rebuild-debounce/README.md`, installed) for the per-fork deploy + secret + webhook steps. It's a separate Worker, deployed manually with `wrangler deploy`; it is **not** part of the site's CI build.

> ⚠️ With prerendered content routes this Worker is **load-bearing**: until it (or some other rebuild trigger) is wired up, publishing in Sanity changes nothing on the live site. Don't defer it past launch.

### Draft preview (Presentation)

Editors open the hosted Studio, click **Presentation**, and the iframe loads the **`/preview/<type>/<slug>`** SSR twin of the page — same template as the public route, fed by the Sanity source's content function, but fetched per-request so a draft session can switch it to the drafts perspective. `/api/draft-mode/enable` validates Presentation's signed preview URL, then sets an httpOnly `starter-preview-session` cookie (an HMAC-signed expiry keyed with `SANITY_API_READ_TOKEN`, valid 8 hours; re-opening Presentation issues a fresh one) next to Sanity's `sanity-preview-perspective` cookie. Draft content and the read token are used only when that signed session verifies, so a hand-set perspective cookie gets published content, and the perspective itself is checked against an allowlist. Public visitors get the prerendered pages, so drafts can't leak; `/preview` is robots-disallowed, noindexed, and never edge-cached. Full flow is documented in the `sanity-and-preview` skill (`.claude/skills/sanity-and-preview/SKILL.md` once installed; [here](files/.claude/skills/sanity-and-preview/SKILL.md) in the starter repo), "How draft mode works".

**Rolling it back:** the signed session replaced an insecure cookie check (any hand-set `sanity-preview-perspective` cookie used to unlock drafts). If it ever has to be undone, see "Rolling back the signed preview session" in the `sanity-and-preview` skill ([here](files/.claude/skills/sanity-and-preview/SKILL.md) in the starter repo) — it lists what to try first, the `git revert` for the starter, and the file-by-file change for an installed project.

> Changing preview URLs or adding a previewable type touches `src/sanity/lib/resolve.ts`, which ships inside the **Studio** bundle — deploy the site first, then run `npx sanity deploy`, or Presentation keeps loading the old URLs.

**No domain yet?** A fork can deploy to the Worker's free `*.workers.dev` URL with working Presentation **before** any custom domain exists — `SITE_URL` is env-overridable and the Studio trusts `https://*.workers.dev` automatically, so the staging→production switch is a no-code env change. Per-client runbook: **§4a "Staging-first deploy"** in [docs/new-project-checklist.md](../../docs/new-project-checklist.md).

### `migrate-webflow-blog.mjs` — Webflow CSV → Sanity blog posts

One-time importer (kept as a **template**). Reads a Webflow blog CSV export and
creates an author document plus `blogPost` documents — uploading the featured
and inline images to Sanity and converting the Post Body HTML to Portable Text.
Existing posts (matched by slug) and draft rows are skipped, so it is safe to
re-run. It reads the project from `PUBLIC_SANITY_PROJECT_ID` /
`PUBLIC_SANITY_DATASET` (exported, or in `.env`; the dataset falls back to
`src/config/sanity.shared.mjs`), and writes need a `SANITY_TOKEN` (Editor or
above; create one at <https://www.sanity.io/manage> → API → Tokens). Its
packages (`csv-parse`, `node-html-parser`, `@sanity/client`) are in
`package.json` once the add-on is installed.

```bash
SANITY_TOKEN=<token> node scripts/migrate-webflow-blog.mjs <path-to.csv> [--author "Author Name"]
```

- `<path-to.csv>` — required; the Webflow CSV export (any `*.csv` arg).
- `--author "Name"` (or `AUTHOR_NAME` env) — author doc name; defaults to `"Author"`.

> Fork note: `CATEGORY_MAP` maps this project's Webflow category slugs to the
> `blogPost` schema's category strings — adjust it for your taxonomy. The
> expected CSV columns (`Slug`, `Title`, `Post Body`, `Main Image`,
> `Categories`, `Featured?`, …) match Webflow's default blog export.
