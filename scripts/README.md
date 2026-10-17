# `scripts/`

Standalone Node utilities run with `node scripts/<name>.mjs` (they are **not**
part of the Astro build). Most have an npm alias in `package.json`: `setup`,
`addon:sanity`, and the `check:*` scripts — `check:config`
(`check-config-sync.mjs`) also runs automatically before every build via the
`prebuild` hook. Shared helpers live in `lib/`. The installer, setup and their
helpers import Node built-ins only.

The Sanity add-on (`addons/sanity/`) brings its own scripts
(`check-stega-leaks.mjs`, `check-fixture-markdown.mjs`,
`check-preview-session.mjs`, `migrate-webflow-blog.mjs`, and a `compare-dist.mjs` with `--equivalent`);
`addons/sanity/README.md` describes them.

---

## `setup.mjs` — deterministic fork setup (`npm run setup`)

Interactive (or `--config <json> --yes`, or `--dry-run`) rewriter of the
per-fork identity values: `src/config/site.shared.mjs`, `src/config/site.ts`,
`wrangler.jsonc`, brand color + optional theme/typography variables,
`logo-paths.ts`, and a `.env` scaffold. It asks Files or Sanity first: Sanity
runs the add-on installer (`npm run addon:sanity`; `--force` is passed
through) before writing anything else, then also writes
`src/config/sanity.shared.mjs`, the two `PUBLIC_SANITY_*` wrangler vars,
`sanity.cli.ts` (`studioHost`, clears `appId`) and the rebuild-debounce
Worker's name. It deletes `addons/` at the end, and it refuses to treat a
project that has the add-on installed as Files. It only **replaces values of
declarations that already exist** — it never scaffolds content types, routes,
or queries. The `/setup` skill orchestrates this script plus the cross-system
work (on the Sanity branch: project creation, schema/Studio deploys, CORS,
verification).

`check-setup.mjs` (`npm run check:setup`) runs setup in scratch copies of the
repo: both branches and the refusals in the starter, plus itself inside a
fork set up each way; in a fork, the cases that still apply.

---

## `addon-sanity.mjs` — install the Sanity add-on (`npm run addon:sanity`)

Copies `addons/sanity/files/` over the project and merges
`addons/sanity/manifest.json` into `package.json`, `wrangler.jsonc`
(comments kept), `tsconfig.json`, `.env.example` and `.gitignore`.
`--dry-run` lists every change; it refuses a second install and, without
`--force`, a dirty or non-git tree. Engine: `lib/addon-install.mjs` and
`lib/jsonc.mjs`; tests: `check-addon-installer.mjs`
(`npm run check:addon-installer`). End to end: `check-addon-sanity.mjs`
(`npm run check:addon`) installs it in a scratch copy (`lib/scratch.mjs`)
and runs the checks and builds; `--baselines <dir>` adds exact comparisons
against saved builds, `--lockfile <path>` pins the add-on's packages, and
`--keep` leaves the copy. It exits 0 with nothing to check when
`addons/sanity/` is absent or the add-on is already installed.

### `lib/`

- `addon-install.mjs` — the installer's engine: `planInstall()` validates
  the manifest and decides every write before anything is written;
  `applyPlan()` writes.
- `jsonc.mjs` — a minimal JSONC tokenizer/parser plus `setMembers()`, which
  edits `wrangler.jsonc` / `tsconfig.json` in place so comments survive
  (output follows Prettier).
- `scratch.mjs` — `scratchCopy()`: the working tree as git sees it (tracked
  plus unignored files, uncommitted edits included), committed in a fresh
  temp repository; used by `check-addon-sanity.mjs` and `check-setup.mjs`.

---

## `check-content-validation.mjs` — bad content must fail (`npm run check:content`)

`npm run check:content` runs `check-content-text.mjs` (unit checks for the
content text helpers) and then this script, which writes temporary
`zz-check-*` entries that are valid together, breaks one field per case and expects `astro sync` to fail
naming the file and the field. It never edits your entries (the gallery and
settings cases back up `gallery.json` and `settings.json` and restore them).
Cleanup runs on exit, Ctrl-C, SIGTERM and SIGHUP; after a hard kill the next
run sweeps the leftovers. Two `EMPTIED` cases then hide every file of a
folder (testimonials, then projects, as `.zz-check-backup` sidecars) and
expect no deleted entry to survive in the content store or in a build
written to `node_modules/.cache/zz-check-build` (never `dist/`). Stop
`npm run dev` first: it would briefly see the
transient files (and log their errors). New cases go in the `CASES` array. It
is a test harness for the checks themselves; to check your content, run
`npm run check` or `npm run build`.

---

## `check-config-sync.mjs` — wrangler and `_headers` ↔ src/config guard (`npm run check:config`)

Fails the build if `wrangler.jsonc` `vars` drift from any `WRANGLER_VARS`
export of a `src/config/*.shared.mjs` module, or `public/_headers` drifts
from `SECURITY_HEADERS` (`src/config/headers.shared.mjs`). Runs
automatically via `prebuild`; `check-config-sync-cases.mjs` is its test
(`npm run check:config` runs both).

---

## `check-content-boundary.mjs` — content only through `@/lib/content` (`npm run check:boundary`)

Fails when a file under `src/` imports a restricted module from outside its
allow list: the Files backend and the node-only content helpers, plus any
add-on rule file in `scripts/boundary/*.json` (the Sanity add-on ships
`scripts/boundary/sanity.json`). `check-boundary-rules.mjs` is its test
(`npm run check:boundary` runs both).

---

## `check-projects.mjs` — project/gallery formatter fixtures

`node scripts/check-projects.mjs` runs fixture checks for the pure
formatters in `src/config/projects.ts` and `src/lib/project-format.ts`
(renamed categories, missing locations, deleted project references). No
npm alias, and CI does not run it; run it after touching those helpers.

---

## `check-schema.mjs` — JSON-LD validator (reusable)

Validates the structured-data (`<script type="application/ld+json">`) on the
static pages in its `STATIC_PAGES` array (currently `/` and `/contact`) plus
one sample page per content type (the first blog post and live case study in
`src/content`). Catches JSON parse errors, missing `@context`/`@type`,
duplicate/dangling `@id` references, and empty FAQ entries. See the
`seo-discoverability` skill.

```bash
npm run dev            # in one terminal
npm run check:schema   # in another (defaults to http://localhost:4321)
# or point at a deployed site:
node scripts/check-schema.mjs --base https://www.example.com
# or read a build, no server (what CI runs):
npm run build && npm run check:schema -- --dist dist/client
```

To validate a new static page, add its path to the `STATIC_PAGES` array at the
top of the file.

> Fork note: `STATIC_PAGES` and the content samples are tuned to this
> project's routes — edit them for your own pages.
