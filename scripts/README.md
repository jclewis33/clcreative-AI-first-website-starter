# `scripts/`

Standalone Node utilities run with `node scripts/<name>.mjs` (they are **not**
part of the Astro build). npm aliases: `npm run setup` (`setup.mjs`),
`npm run check:schema` (`check-schema.mjs`), and `npm run check:config`
(`check-config-sync.mjs`, also run automatically before every build via the
`prebuild` hook); the migration scripts are run ad-hoc.

The Sanity-reading scripts get project config the same way: `PUBLIC_SANITY_PROJECT_ID`
and `PUBLIC_SANITY_DATASET`, resolved from the environment **or** from the
project's `.env` file (the same vars the app uses — see CLAUDE.md → _Required
env vars_). Writes additionally need a `SANITY_TOKEN` (Editor or above; create
one at <https://www.sanity.io/manage> → API → Tokens).

Dev deps used by the migration scripts (`csv-parse`, `node-html-parser`,
`@sanity/client`) are already in `package.json`.

---

## `setup.mjs` — deterministic fork setup (`npm run setup`)

Interactive (or `--config <json> --yes`, or `--dry-run`) rewriter of the
per-fork identity values: `src/config/site.shared.mjs`, `src/config/site.ts`,
both `wrangler.jsonc` files (site + rebuild-debounce Worker names/vars), brand
color + optional theme/typography variables, `logo-paths.ts`, `sanity.cli.ts`
(`studioHost`, clears `appId`), and a `.env` scaffold. It only **replaces
values of declarations that already exist** — it never scaffolds content
types, routes, or queries (see CLAUDE.md → "Adding a new content type" for
the four route pieces a new type needs). The `/setup` skill orchestrates this
script plus the cross-system work (Sanity project creation, schema/Studio
deploys, CORS, verification).

---

## `check-content-validation.mjs` — bad content must fail (`npm run check:content`)

Runs `check-content-text.mjs`, then writes temporary `zz-check-*` entries that
are valid together, breaks one field per case and expects `astro sync` to fail
naming the file and the field. It never edits your entries (the gallery and
settings cases back up `gallery.json` and `settings.json` and restore them).
Cleanup runs on exit, Ctrl-C, SIGTERM and SIGHUP; after a hard kill the next
run sweeps the leftovers. Stop `npm run dev` first: it would briefly see the
transient files (and log their errors). New cases go in the `CASES` array. It
is a test harness for the checks themselves; to check your content, run
`npm run check` or `npm run build`.

---

## `check-config-sync.mjs` — wrangler ↔ shared-config guard (`npm run check:config`)

Fails the build if `wrangler.jsonc` `vars` drift from
`src/config/site.shared.mjs` (JSON can't import the shared module, so this
check is the sync guarantee). Runs automatically via `prebuild`.

---

## `check-schema.mjs` — JSON-LD validator (reusable)

Validates the structured-data (`<script type="application/ld+json">`) on the
static pages in its `STATIC_PAGES` array (currently `/` and `/contact`) plus one
live sample of each CMS content type. Catches JSON parse errors, missing
`@context`/`@type`, duplicate/dangling `@id` references, and empty FAQ entries.
See _Per-page SEO & Structured Data_ in CLAUDE.md.

```bash
npm run dev            # in one terminal
npm run check:schema   # in another (defaults to http://localhost:4321)
# or point at a deployed site:
node scripts/check-schema.mjs --base https://www.example.com
```

To validate a new static page, add its path to the `STATIC_PAGES` array at the
top of the file.

> Fork note: `STATIC_PAGES` and the live-sample queries are tuned to this
> project's routes — edit them for your own pages.

---

## `migrate-webflow-blog.mjs` — Webflow CSV → Sanity blog posts

One-time importer (kept as a **template**). Reads a Webflow blog CSV export and
creates an author document plus `blogPost` documents — uploading the featured
and inline images to Sanity and converting the Post Body HTML to Portable Text.
Existing posts (matched by slug) and draft rows are skipped, so it is safe to
re-run.

```bash
SANITY_TOKEN=<token> node scripts/migrate-webflow-blog.mjs <path-to.csv> [--author "Author Name"]
```

- `<path-to.csv>` — required; the Webflow CSV export (any `*.csv` arg).
- `--author "Name"` (or `AUTHOR_NAME` env) — author doc name; defaults to `"Author"`.

> Fork note: `CATEGORY_MAP` maps this project's Webflow category slugs to the
> `blogPost` schema's category strings — adjust it for your taxonomy. The
> expected CSV columns (`Slug`, `Title`, `Post Body`, `Main Image`,
> `Categories`, `Featured?`, …) match Webflow's default blog export.
