# `scripts/`

Standalone Node utilities run with `node scripts/<name>.mjs` (they are **not**
part of the Astro build). Only `check-schema.mjs` has an npm alias
(`npm run check:schema`); the migration scripts are run ad-hoc.

All three read Sanity project config the same way: `PUBLIC_SANITY_PROJECT_ID`
and `PUBLIC_SANITY_DATASET`, resolved from the environment **or** from the
project's `.env` file (the same vars the app uses — see CLAUDE.md → _Required
env vars_). Writes additionally need a `SANITY_TOKEN` (Editor or above; create
one at <https://www.sanity.io/manage> → API → Tokens).

Dev deps used by the migration scripts (`csv-parse`, `node-html-parser`,
`@sanity/client`) are already in `package.json`.

---

## `check-schema.mjs` — JSON-LD validator (reusable)

Validates the structured-data (`<script type="application/ld+json">`) on the
location/SEO pages plus one live sample of each CMS content type. Catches JSON
parse errors, missing `@context`/`@type`, duplicate/dangling `@id` references,
and empty FAQ entries. Part of the location-page workflow in CLAUDE.md.

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

---

## `migrate-webflow-glossary.mjs` — Webflow CSV → Sanity glossary terms

One-time importer (kept as a **template**). Reads a Webflow glossary CSV export
and creates `glossaryTerm` documents, skipping draft/archived rows and
converting the Expanded Definition HTML to Portable Text. Uses `createOrReplace`
(id = `glossaryTerm-<slug>`), so it is safe to re-run. Supports a no-write
preview.

```bash
SANITY_TOKEN=<token> node scripts/migrate-webflow-glossary.mjs <path-to.csv>
node scripts/migrate-webflow-glossary.mjs <path-to.csv> --dry-run   # preview, no token needed
```

> Fork note: `CATEGORY_RULES` classify terms into this project's `glossaryTerm`
> category enum (Development | SEO | CSS | Design | Business | Performance) via
> keyword heuristics — replace them to match your schema. Expected CSV columns:
> `Term`, `Slug`, `Short Definition`, `Expanded Definition`, `Draft`, `Archived`.
