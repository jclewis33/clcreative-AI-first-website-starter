# PR 4 — Sanity add-on: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every piece of Sanity out of the default starter into an
opt-in add-on (`addons/sanity/`: a manifest plus an overlay of files at
their repo paths) that `npm run addon:sanity` installs, behind replaceable
CMS seams, so the default site ships no Sanity code, packages, config or
env vars while its build output stays unchanged, and CI proves on every PR
that the add-on installs, type-checks, builds and renders the sample
content the same way the Files site does.

**Architecture:** Five kinds of seam files decide everything a content
source changes: `src/lib/content/source.ts` (the backend),
`src/config/cms.mjs` (build-time integrations, image hosts, Vite bits),
`src/config/cms.shared.mjs` (runtime values: CSP frame ancestors and the
draft-preview cookie), `src/components/global/CmsEditing.astro` (in-page
editing) and `src/components/blog/BlogBody.astro` (body formats), plus
`public/_headers` and the CI workflow. `astro.config.mjs`,
`BaseLayout.astro` and `middleware.ts` import seams and never mention
Sanity. Core ships the Files version of each seam; the add-on overlay
carries the Sanity version and the installer copies it over the top. The
installer (`scripts/addon-sanity.mjs` on `scripts/lib/addon-install.mjs`)
plans every write first, then copies the overlay and merges
`manifest.json` into `package.json`, `wrangler.jsonc` (a JSONC editor that
keeps comments), `tsconfig.json`, `.env.example` and `.gitignore`.
`scripts/check-addon-sanity.mjs` installs it into a scratch copy of the
repo and proves it, in CI and locally against the PR 2/3 parity baselines.

**Tech Stack:** Astro 7.3.2 (`@astrojs/cloudflare` 14, `@astrojs/mdx` 8),
TypeScript module augmentation, Node 22.18+ built-ins only for every
script the add-on path runs (`node:fs`, `node:child_process`), Prettier 3
(as the test oracle for merged config files), node-html-parser (existing
dist diffs), GitHub Actions.

**Spec:** [docs/superpowers/specs/2026-10-16-files-first-content-design.md](../specs/2026-10-16-files-first-content-design.md).
This plan covers "Delivery" item 4 plus the "CMS seams", "The add-on",
"Setup" and "Testing" sections as they apply to PR 4. PR 5 does the
comprehensive docs pass; this PR updates only the docs it would otherwise
leave wrong.

## Global Constraints

- **The default site does not change.** After every task, the Files build
  is identical to `.parity/files` (`Identical: <n> files.`). The only
  planned exception is `_headers`, re-baselined once in Task 6 (its CSP
  becomes `frame-ancestors 'self'`). If a build moves inlined `<style>`
  blocks, re-baseline only after `compare-dist --layers` passes and every
  `DIFF` line is read (the PR 2 ruling).
- **Sanity mode does not change.** Through Task 5 the PR 3 test switch
  (`CONTENT_SOURCE=sanity`) still exists and the Sanity builds must match
  `.parity/empty`, `.parity/fixtures` and `.parity/sample`, with
  `--equivalent` against `.parity/files` passing. From Task 6 on, the same
  four comparisons run in a scratch copy with the add-on installed (the
  Scratch-install procedure below, automated by Task 8).
- **Seams are overwritten wholesale.** The installer never edits inside a
  source file. It copies overlay files and merges only `package.json`,
  `wrangler.jsonc`, `tsconfig.json`, `.env.example` and `.gitignore`.
- **`astro.config.mjs`, `src/layouts/BaseLayout.astro` and
  `src/middleware.ts` never mention Sanity** (from Task 6:
  `grep -in sanity astro.config.mjs src/layouts/BaseLayout.astro src/middleware.ts`
  prints nothing; BaseLayout and middleware from Task 3).
- **After Task 7 core has no Sanity or React package:**
  `npm ls react react-dom sanity @sanity/client @astrojs/react astro-portabletext`
  prints `└── (empty)`.
- **Zero dependencies:** `scripts/addon-sanity.mjs`,
  `scripts/lib/{jsonc,addon-install,scratch}.mjs` and `scripts/setup.mjs`
  import node built-ins only. Test scripts may import `prettier`.
- **Config-context files stay `.mjs`** with `// @ts-check` and JSDoc types
  (`cms.mjs`, `cms.shared.mjs`, `headers.shared.mjs`, `sanity.shared.mjs`,
  the new scripts).
- **Move with `git mv`** so history follows every file into
  `addons/sanity/files/`.
- **Do not edit any GROQ query string** in `src/sanity/lib/queries.ts`.
  The fixtures key on them.
- **CLAUDE.md conventions apply to every touched component:** a `docs`
  prop with JSDoc, named prop types, the prop-order rule, no stray `<` or
  `>` in frontmatter comments, CSS co-located in `@layer components`, and
  `npm run check:hover` passing.
- **`BaseLayout.astro` is `.prettierignore`d.** Edit it by hand, matching
  its existing `from"…"` import style.
- **Node 22.18+** (`engines` already says so): the scripts import `.ts`
  files directly.
- **Per-task gate:** `npm run check` (0 errors), `npm run check:hover`,
  `npm run check:boundary`, `npm run check:content`, `npm run build` then
  `npm run check:content-build`, and the Files parity command. Tasks that
  touch the add-on also run the Sanity comparisons (see the first bullet
  pair), and every task's gate lists `format:check` where it adds files.
- **Commits:** end the message with a blank line, then exactly
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Don't push.

## Decisions this plan makes

These settle what the spec leaves open. Each was measured where it could
be (Astro 7.3.2, Prettier 3.6, this repo, 2026-10-16).

1. **Two CMS config seams, not one.** `src/config/cms.mjs` holds the
   build-time pieces (integrations, remote image patterns, `vite.define`,
   `optimizeDeps`) and is imported only by `astro.config.mjs`.
   `src/config/cms.shared.mjs` holds runtime values (`FRAME_ANCESTORS`,
   `PREVIEW_COOKIE`) and is what `middleware.ts` reads. The spec puts
   `frameAncestors` in `cms.mjs`, but middleware importing a module that
   imports `@astrojs/react` and `@sanity/astro` would pull Vite plugin code
   into the Worker bundle.
2. **One security-header list.** `src/config/headers.shared.mjs` exports
   `SECURITY_HEADERS` (the CSP built from `FRAME_ANCESTORS`; empty means
   `'self'`). Middleware sends it; `public/_headers` repeats it for static
   files and becomes an overlay file; `check:config` now fails when
   `_headers` drifts from the list. Files mode sends
   `frame-ancestors 'self'`, which changes `_headers` (the one planned
   re-baseline).
3. **Body formats are a registry.** `types.ts` defines
   `interface BlogBodyFormats { mdx: { Content } }` and derives
   `BlogBodyContent` from it. The add-on registers
   `"portable-text": { blocks }` through module augmentation in
   `src/sanity/lib/body-format.ts`. Core then knows only MDX and
   type-checks alone. Measured with `tsc` 5.9: augmenting
   `"@/lib/content/types"` through the `paths` alias works, and removing
   the augmentation turns every `kind: "portable-text"` into a type error.
   A generic `{ kind: "blocks"; blocks: unknown }` variant was rejected:
   core would carry a variant it can't render.
4. **`ContentOptions.perspectiveCookie` becomes `preview`** — the request's
   draft-preview state, opaque to everything but the backend that issued
   it. `getDraftModeProps()` returns `{ preview }` and `loadQuery` takes
   `preview`.
5. **`SITE.sanity` is removed.** Nothing reads it. The ids move to
   `src/config/sanity.shared.mjs`, which exports `WRANGLER_VARS`.
   `check-config-sync.mjs` checks every `WRANGLER_VARS` export of any
   `src/config/*.shared.mjs` against `wrangler.jsonc`, so it needs no
   Sanity knowledge.
6. **The boundary guard loads add-on rule files.** Core
   `check-content-boundary.mjs` keeps only its own restricted rules and
   reads any `scripts/boundary/*.json`. The add-on ships
   `scripts/boundary/sanity.json` (forbidden packages and paths, plus its
   allow list). In Files mode no rule mentions Sanity, and nothing can
   import it anyway because the packages are gone.
7. **The test-only `CONTENT_SOURCE` switch is deleted** in Task 6. The
   add-on's own `cms.mjs` defines `__PARITY_FIXTURES__`, so the parity
   fixtures, `check-stega-leaks.mjs` and `check-fixture-markdown.mjs` move
   into the add-on with it.
8. **`compare-dist.mjs` is split.** Core keeps plain, `--canonical` and
   `--layers`. The add-on overwrites it with the full copy, which adds
   `--equivalent` and a new rule (row 16): skip `_headers`, whose CSP
   now differs by source.
9. **`buildToc` (a Portable Text walker) moves** from `src/lib/toc.ts` to
   the add-on's `src/sanity/lib/portable-text.ts`. `TocItem` and
   `slugifyHeading` stay in core.
10. **Installer semantics.** It refuses when the manifest's `marker`
    (`src/sanity/lib/source.ts`) exists, and refuses a dirty tree or a
    folder that isn't a git repository unless `--force` is given (a zip
    download has no git). It plans every write before writing anything.
    Manifest values win on merge, and every change is reported ("updated
    X", "overwrite path"). It skips `node_modules` and `.DS_Store` in the
    overlay. It refuses an overlay that contains a file it merges.
    Besides `package.json` and `wrangler.jsonc` (the spec's list), it
    merges `tsconfig.json` (`jsx`, `jsxImportSource`, `types` are
    React/Sanity-only), `.env.example` and `.gitignore`.
11. **JSONC is edited, not re-serialised.** `scripts/lib/jsonc.mjs`
    tokenises the file and inserts or replaces text in place, so comments
    survive. Measured: Prettier ends every member of a `.jsonc` file with
    a comma and never adds one to `.json`. `setMembers()` follows each,
    and the tests run Prettier over the merged output.
12. **Setup deletes `addons/` in both branches.** Files: nothing in it
    applies. Sanity: setup runs the installer first, before any identity
    write, so the clean-tree rule holds. After install the overlay copy
    is stale. Setup refuses to treat an installed project as Files.
    Post-install docs (including how to remove the add-on) live in the
    add-on's `sanity-and-preview` skill, which the overlay installs.
13. **CI is a seam too.** Core `.github/workflows/ci.yml` gates the Files
    site and runs the `addon-sanity` job. The overlay replaces the
    workflow with a Sanity-mode one: it drops `check:content-build` and
    `check:schema`, which assume the Files sample pages, and adds the
    fixture and stega checks. `check-addon-sanity.mjs` exits 0 with a
    note when `addons/sanity/` is absent, so a Files fork's CI stays
    green.
14. **`check:schema` "against the built site" is a new `--dist <dir>`
    mode** that reads `dist/client/<path>/index.html` instead of fetching
    a server.
15. **The add-on proof is a script, not a CI recipe.** `check-addon-sanity.mjs`
    copies the working tree (tracked plus unignored files) into a temp
    dir, commits it, builds Files, installs, runs a second install (which
    must refuse), checks the merge, installs packages and runs `check`,
    `check:hover`, `check:boundary`, `check:config` and `format:check`.
    It then builds placeholder, `sample` (plus `--equivalent` against the
    Files build, then `check:schema --dist`), `PARITY_FIXTURES=1` and
    `preview` (plus `check-stega-leaks`). `--baselines .parity` adds the
    exact comparisons. `--lockfile` pins the add-on's packages to PR 3's
    resolution.
16. **Sanity-only docs ship in the overlay:** the `sanity-and-preview`
    skill, `studio-branding.md`, `skills-lock.json` (it locks only Sanity
    agent skills) and the rebuild-debounce Worker. `references/sanity.md`
    stays in core, because it is read before installing and begins with
    the installer. `no-cms.md` keeps its name, as the spec says, and is
    rewritten as the Files branch.
17. **Core `tsconfig.json` sets `"types": []`.** It used to be
    `["@sanity/astro/module"]`, which kept every `@types/*` package out of
    the program. An empty list keeps that ambient set minus Sanity. The
    add-on sets `jsx`, `jsxImportSource` and `types` back. Task 6 measures
    it and, if core needs Node globals, uses `["node"]` in both places.
18. **The audit gate is measured, not assumed.** Task 7 runs
    `npm audit --omit=dev --audit-level=high` on the Sanity-free tree. If
    it passes, core CI tightens to `high`. The overlay workflow keeps
    `critical`, with the existing Sanity-CLI explanation.

## Review Focus

1. **Adopting Sanity later in a project that isn't a clean git checkout**
   (a client's zip download, or uncommitted edits). Expected: the
   installer refuses before writing anything, says why, and names
   `--force`. Pinned by Task 4's `dirty tree` and `not a git repository`
   cases.
2. **A seam file the fork had customised** (`public/_headers`,
   `BlogBody.astro`, the CI workflow). Expected: overwritten as designed,
   but listed as `overwrite <path>` in the installer's output, and the
   clean-tree rule means `git diff` shows exactly what to re-apply. Pinned
   by Task 4's dry-run listing (`overwrite public/_headers`).
3. **Running `npm run setup` again on a project with the add-on
   installed** and answering Files, or omitting the answer. Expected:
   omitting it defaults to Sanity; answering Files is refused with
   nothing written. Setup never half-removes the add-on. Pinned by
   Task 9's `installed + files` and `installed + default` cases.
4. **`public/_headers` drifting from what middleware sends** — a Files
   `_headers` left behind after installing, or a hand edit to one side.
   Expected: `check:config`, which also runs before every build, fails
   naming the header and both values. Pinned by Task 3's
   `check-config-sync-cases.mjs`.
5. **Merging into a `wrangler.jsonc` that has comments, trailing commas,
   an empty `vars: {}`, a trailing comment on its last var, or strings
   containing `//` and `{`.** Expected: comments and formatting survive,
   the result passes Prettier, and a second merge changes nothing. Pinned
   by Task 4's `jsonc` cases.

## Parity procedure

The baselines live in `.parity/` (git-ignored), captured by PRs 2 and 3:

| Directory          | Build                                                              |
| ------------------ | ------------------------------------------------------------------ |
| `.parity/files`    | Files source, the sample content (re-baselined `_headers` in T6)   |
| `.parity/empty`    | Sanity source, placeholder project (no content)                    |
| `.parity/fixtures` | Sanity source, `PARITY_FIXTURES=1` (PR 2 edge dataset)             |
| `.parity/sample`   | Sanity source, `PARITY_FIXTURES=sample` (derived from src/content) |

Every build sets `KEEP_DEV_PAGES=1`, so `/components` is compared too.

**Files (every task):**

```bash
KEEP_DEV_PAGES=1 npm run build && node scripts/compare-dist.mjs .parity/files dist/client
```

Expected: `Identical: <n> files.`

**Sanity, Tasks 1–5** (the PR 3 switch still exists):

```bash
KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity npm run build && node scripts/compare-dist.mjs .parity/empty dist/client
KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity PARITY_FIXTURES=1 npm run build && node scripts/compare-dist.mjs .parity/fixtures dist/client
KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity PARITY_FIXTURES=sample npm run build && node scripts/compare-dist.mjs .parity/sample dist/client
node scripts/compare-dist.mjs --equivalent .parity/sample .parity/files
```

Expected: `Identical: <n> files.` three times, then `Equivalent: <n> files.`

**Sanity, Tasks 6–7** — the Scratch-install procedure below. **Task 8
on:** `node scripts/check-addon-sanity.mjs --baselines .parity --lockfile /tmp/pr3-package-lock.json`.

Create the pinned lockfile once (PR 3's tip, so the add-on's packages
resolve to the versions the baselines were built with):

```bash
git show 01c2890:package-lock.json > /tmp/pr3-package-lock.json
```

### Scratch-install procedure (Tasks 6 and 7)

Run from the repo root. It copies the working tree (uncommitted edits
included) to a temp dir, commits it there, and installs the add-on.

```bash
REPO=$(pwd)
SCRATCH=$(mktemp -d)/starter
mkdir -p "$SCRATCH"
git ls-files -z --cached --others --exclude-standard | while IFS= read -r -d '' f; do
  [ -f "$f" ] && mkdir -p "$SCRATCH/$(dirname "$f")" && cp "$f" "$SCRATCH/$f"
done
cd "$SCRATCH"
git init -q && git add -A && git -c user.name=s -c user.email=s@example.invalid commit -qm scratch
npm ci --no-audit --no-fund
npm run addon:sanity
npm run addon:sanity; test $? -ne 0 && echo "second run refused: OK"
cp /tmp/pr3-package-lock.json package-lock.json
npm install --no-audit --no-fund
npm run check && npm run check:hover && npm run check:boundary && npm run check:config && npm run format:check
KEEP_DEV_PAGES=1 npm run build && node scripts/compare-dist.mjs "$REPO/.parity/empty" dist/client
KEEP_DEV_PAGES=1 PARITY_FIXTURES=1 npm run build && node scripts/compare-dist.mjs "$REPO/.parity/fixtures" dist/client
KEEP_DEV_PAGES=1 PARITY_FIXTURES=sample npm run build && node scripts/compare-dist.mjs "$REPO/.parity/sample" dist/client
node scripts/compare-dist.mjs --equivalent dist/client "$REPO/.parity/files"
KEEP_DEV_PAGES=1 PARITY_FIXTURES=preview npm run build && node scripts/check-stega-leaks.mjs
node scripts/check-fixture-markdown.mjs
cd "$REPO" && rm -rf "$(dirname "$SCRATCH")"
```

Expected: the second install prints
`✗ addon:sanity: the Sanity add-on is already installed` and the echo
prints `second run refused: OK`; every check passes; `Identical: <n> files.`
three times; `Equivalent: <n> files.`; check-stega-leaks prints no
`LEAK` line and exits 0; `check-fixture-markdown: ok`.

If a Sanity comparison differs, `npm ls <package>` in the scratch dir
against `/tmp/pr3-package-lock.json` tells a dependency drift from a
real regression. Fix a regression in the repo and rerun; never
re-baseline the Sanity directories in this PR.

---

## File map

**Create (core):**

- `src/config/cms.mjs`, `src/config/cms.shared.mjs`: the Files versions of
  the config seams (Task 3 creates the Sanity versions, Task 6 moves them
  to the overlay and writes these).
- `src/config/headers.shared.mjs`: `SECURITY_HEADERS`.
- `src/components/global/CmsEditing.astro`: the editing seam.
- `scripts/lib/jsonc.mjs`, `scripts/lib/addon-install.mjs`,
  `scripts/lib/scratch.mjs`: zero-dependency helpers.
- `scripts/addon-sanity.mjs`: the installer CLI (`npm run addon:sanity`).
- `scripts/check-addon-installer.mjs`, `scripts/check-config-sync-cases.mjs`,
  `scripts/check-boundary-rules.mjs`, `scripts/check-setup.mjs`: tests.
- `scripts/check-addon-sanity.mjs`: the end-to-end add-on check.

**Create (add-on):**

- `addons/sanity/manifest.json`, `addons/sanity/README.md`.
- `addons/sanity/files/src/lib/content/source.ts`,
  `addons/sanity/files/src/sanity/env.d.ts`,
  `addons/sanity/files/src/sanity/lib/body-format.ts` (Task 2 creates it
  in `src/sanity/lib/`; it moves with the folder),
  `addons/sanity/files/src/config/sanity.shared.mjs` (same: created in
  Task 3), `addons/sanity/files/scripts/boundary/sanity.json` (Task 5),
  `addons/sanity/files/public/_headers`,
  `addons/sanity/files/.github/workflows/ci.yml`.

**Move into `addons/sanity/files/` (same relative path):** `src/sanity/**`,
`src/pages/preview/**`, `src/pages/api/draft-mode/**`,
`src/components/portabletext/**`, `src/components/SanityVisualEditing.tsx`,
`src/components/DisableDraftMode.tsx`, `sanity.config.ts`, `sanity.cli.ts`,
`sanity-typegen.json`, `skills-lock.json`, `workers/rebuild-debounce/**`,
`scripts/check-stega-leaks.mjs`, `scripts/check-fixture-markdown.mjs`,
`scripts/migrate-webflow-blog.mjs`, `.claude/skills/sanity-and-preview/**`,
`.claude/skills/setup/references/studio-branding.md`, and the Sanity
versions of `src/config/cms.mjs`, `src/config/cms.shared.mjs`,
`src/components/global/CmsEditing.astro`,
`src/components/blog/BlogBody.astro` and `scripts/compare-dist.mjs`.

**Modify:** `astro.config.mjs`, `src/layouts/BaseLayout.astro`,
`src/middleware.ts`, `src/env.d.ts`, `tsconfig.json`, `package.json`,
`package-lock.json`, `wrangler.jsonc`, `.env.example`, `.gitignore`,
`public/_headers`, `.github/workflows/ci.yml`, `src/config/site.shared.mjs`,
`src/config/site.ts`, `src/lib/content/{types,index,source}.ts`,
`src/lib/content/files/{index,mdx-text}.ts`, `src/lib/toc.ts`,
`scripts/{check-config-sync,check-content-boundary,check-content-text,check-schema,compare-dist,setup}.mjs`,
comment-only edits in the files listed in Task 6 Step 7, and docs
(Task 10).

---

### Task 1: Carried minors from PR 3

**Files:**

- Modify: `src/lib/content/files/mdx-text.ts`
- Test: `scripts/check-content-text.mjs`
- Modify: `package.json`, `package-lock.json` (`yaml` devDependency)
- Modify: `CLAUDE.md` (the Formatting bullet)

**Interfaces:**

- Consumes: nothing new.
- Produces: `inlineCtaIds`, `mdxImages` and `videoEmbedUrls` (unchanged
  signatures) now ignore inline code spans as well as fenced code.
  `yaml` is a direct devDependency (`scripts/check-content-build.mjs`
  imports it).

- [ ] **Step 1: Write the failing test**

In `scripts/check-content-text.mjs`, insert before the final
`console.log("check-content-text: ok");`:

```js
// Inline code spans are code samples too: a tag or an image written inside
// backticks in prose is not a real CTA, image or video. A lone backtick is
// not a span, so the real tags after it still count.
const PROSE_WITH_CODE_SPANS = [
  'Write `<BlogCta id="demo" />` on its own line.',
  "Images look like ``![Alt](./images/skipped.webp)`` in Markdown.",
  'Embed one with `<VideoEmbed url="https://example.com/skipped" />`.',
  "A lone ` backtick opens nothing, so these still count:",
  '<BlogCta id="real-one" />',
  "![Real](./images/real.webp)",
  '<VideoEmbed url="https://youtu.be/real" />',
].join("\n\n");
assert.deepEqual(inlineCtaIds(PROSE_WITH_CODE_SPANS), ["real-one"]);
assert.deepEqual(mdxImages(PROSE_WITH_CODE_SPANS), [
  { alt: "Real", src: "./images/real.webp" },
]);
assert.deepEqual(videoEmbedUrls(PROSE_WITH_CODE_SPANS), [
  "https://youtu.be/real",
]);
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node scripts/check-content-text.mjs`
Expected: FAIL — `AssertionError` showing `[ 'demo', 'real-one' ]` against
`[ 'real-one' ]`.

- [ ] **Step 3: Implement**

In `src/lib/content/files/mdx-text.ts`:

1. In the header comment, change the three bullets to say "outside code":

```ts
 * - inlineCtaIds — the ids that `<BlogCta id="…" />` tags name outside
 *   code (fenced blocks and inline code spans).
 * - mdxImages — the Markdown images (`![alt](src "title")`) outside code,
 *   for the sync-time image checks.
 * - videoEmbedUrls — the literal `url="…"` of each `<VideoEmbed>` outside
 *   code, for the sync-time video check.
```

2. After the `FENCE` constant, add:

```ts
/**
 * An inline code span on one line: a run of backticks, then the same run.
 * A span that wraps onto the next line is not matched, so its content is
 * still checked (the safe direction).
 */
const CODE_SPAN = /(`+)[^\n]*?\1/g;

/** The body with fenced code and inline code spans blanked out. */
const outsideCode = (body: string): string =>
  body.replace(FENCE, " ").replace(CODE_SPAN, " ");
```

3. In `inlineCtaIds`, `mdxImages` and `videoEmbedUrls`, replace
   `body.replace(FENCE, " ")` with `outsideCode(body)`. In their doc
   comments, replace "Fenced code is skipped" / "outside fenced code" with
   "Code (fenced blocks and inline spans) is skipped" / "outside code".

- [ ] **Step 4: Run the test to make sure it passes**

Run: `node scripts/check-content-text.mjs`
Expected: `check-content-text: ok`

- [ ] **Step 5: Make `yaml` a direct devDependency**

Run: `npm install --save-dev yaml@^2.9.1 --no-audit --no-fund`
Expected: `package.json` `devDependencies` gains `"yaml": "^2.9.1"`;
`node -e "import('yaml').then(m => console.log(typeof m.parse))"` prints
`function`.

- [ ] **Step 6: CLAUDE.md Formatting bullet**

Before:

```md
- **Formatting:** Prettier owns it — `npm run format` before committing;
  `format:check` gates CI. `Head.astro` and `BaseLayout.astro` are
  `.prettierignore`d (format by hand).
```

After:

```md
- **Formatting:** Prettier owns it — `npm run format` before committing;
  `format:check` gates CI. `Head.astro` and `BaseLayout.astro` are
  `.prettierignore`d (format by hand). So is `src/content/`: clients edit
  content outside a formatting editor, and formatting must never block a
  content deploy.
```

- [ ] **Step 7: Gate**

Run: `npm run check && npm run check:hover && npm run check:boundary && npm run check:content && npm run format:check`
Expected: 0 errors; each check prints its OK line.

Run: `KEEP_DEV_PAGES=1 npm run build && npm run check:content-build && node scripts/compare-dist.mjs .parity/files dist/client`
Expected: check-content-build OK; `Identical: <n> files.`

- [ ] **Step 8: Commit**

```bash
git add src/lib/content/files/mdx-text.ts scripts/check-content-text.mjs package.json package-lock.json CLAUDE.md
git commit -m "Skip inline code spans in MDX content checks; add yaml devDependency

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Neutral content contract

Rename the Sanity-flavoured option, make the blog body format an open
registry, and move the Portable Text TOC walker into the Sanity code.

**Files:**

- Modify: `src/lib/content/types.ts`, `src/lib/content/index.ts`,
  `src/lib/content/files/index.ts`, `src/lib/toc.ts`
- Create: `src/sanity/lib/body-format.ts`
- Modify: `src/sanity/lib/draft-mode.ts`, `src/sanity/lib/load-query.ts`,
  `src/sanity/lib/page-data.ts`, `src/sanity/lib/portable-text.ts`,
  `src/sanity/lib/map/blog.ts`
- Test: a temporary probe, `src/lib/content/__probe-contract.ts`

**Interfaces:**

- Consumes: nothing new.
- Produces:
  - `interface ContentOptions { preview?: string | undefined }`
  - `interface BlogBodyFormats { mdx: { Content: MdxContent } }` and
    `type BlogBodyContent = { [K in keyof BlogBodyFormats]: { kind: K } & BlogBodyFormats[K] }[keyof BlogBodyFormats]`
    (both exported from `@/lib/content`)
  - `getDraftModeProps(ctx): ContentOptions`, returning `{ preview }`
  - `loadQuery({ query, params, preview })`
  - `buildToc(body: any[]): { body: any[]; items: TocItem[] }`, now
    exported from `src/sanity/lib/portable-text.ts`

- [ ] **Step 1: Write the failing type probe**

Create `src/lib/content/__probe-contract.ts`:

```ts
/* Temporary type probe (PR 4 Task 2). Deleted in Step 8. */
import type {
  BlogBodyContent,
  BlogBodyFormats,
  ContentOptions,
} from "@/lib/content";

export const mdxOf = (b: BlogBodyContent) =>
  b.kind === "mdx" ? b.Content : null;
export const sanityBody: BlogBodyContent = {
  kind: "portable-text",
  blocks: [],
};
export const opts: ContentOptions = { preview: "drafts" };
export type MdxFormat = BlogBodyFormats["mdx"];
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npm run check`
Expected: errors in `__probe-contract.ts` — `Module '"@/lib/content"' has
no exported member 'BlogBodyFormats'` and `Object literal may only specify
known properties, and 'preview' does not exist in type 'ContentOptions'`.

- [ ] **Step 3: Rewrite the contract in `src/lib/content/types.ts`**

Header comment, before → after:

```ts
/**
 * The content interface's types — the view models every page, template,
 * section and component renders from, and the ContentSource contract each
 * backend implements (./files/ by default; a CMS add-on brings its own).
 *
 * Nothing in here knows which backend is active. Consumers import these
 * through `@/lib/content`; backend code imports this file directly.
 *
 * Nullability mirrors what a backend can genuinely hand over: a CMS draft
 * is incomplete until an editor fills it in, so most display fields are
 * `string | null`. Listings drop entries that cannot be linked to.
 */
```

Replace the `ContentOptions` block:

```ts
/**
 * Per-call options. `preview` is the current request's draft-preview
 * state, opaque to everything but the backend that issued it: a CMS
 * add-on's preview routes read it off their own cookie and pass it, and
 * that backend returns draft content. Every other caller passes nothing
 * and gets published content; backends without drafts ignore it.
 */
export interface ContentOptions {
  preview?: string | undefined;
}
```

Replace the `BlogBodyContent` block (its comment and the union):

```ts
/**
 * The body formats `<BlogBody>` can render, keyed by `kind`. Core knows
 * MDX. A content add-on with its own format registers it by augmenting
 * this interface (`declare module "@/lib/content/types"`) and ships the
 * BlogBody that renders it.
 */
export interface BlogBodyFormats {
  mdx: { Content: MdxContent };
}

/** A post body, in whichever registered format its backend keeps it. */
export type BlogBodyContent = {
  [K in keyof BlogBodyFormats]: { kind: K } & BlogBodyFormats[K];
}[keyof BlogBodyFormats];
```

In `ContentSource`, replace the `plainText` and `getCtaDefaults` doc
comments:

```ts
  /**
   * Strip any invisible markers a backend's draft preview embeds in
   * strings (click-to-edit metadata). Identity for a backend without
   * them. Use it before a display string is compared, written into a
   * search data-attribute, or used as SEO or structured data.
   */
  plainText<T extends string | null | undefined>(value: T): T;
  /** The site-wide CTA defaults (the backend's site settings). */
  getCtaDefaults(opts?: ContentOptions): Promise<CtaDefaults>;
```

- [ ] **Step 4: Update the two comments that describe `opts`**

`src/lib/content/index.ts`, the header's last two paragraphs, after:

```ts
 * - The active backend: ./source.ts (one line; the Files implementation in
 *   ./files/ unless a CMS add-on has replaced it)
 *
 * Every content function takes an optional trailing `opts`
 * ({ preview }) that only a CMS backend reads. Callers here pass none and
 * get published content; a CMS add-on's draft-preview routes pass the
 * request's preview state.
 */
```

`src/lib/content/files/index.ts`, after:

```ts
 * There are no drafts here: every function ignores the trailing `opts`
 * the interface allows (only a CMS add-on's preview routes pass it), and
 * plainText() returns its input unchanged.
```

- [ ] **Step 5: Register the Sanity body format**

Create `src/sanity/lib/body-format.ts`:

```ts
/**
 * Registers the Sanity body format with the content interface: a post
 * body can be `{ kind: "portable-text", blocks }` (Portable Text, each h2
 * carrying `_slug`), which this add-on's BlogBody renders. Type-only:
 * nothing imports this file; TypeScript picks it up from the project.
 */
export {};

declare module "@/lib/content/types" {
  interface BlogBodyFormats {
    "portable-text": { blocks: Array<{ _type: string; _key?: string }> };
  }
}
```

- [ ] **Step 6: Rename `perspectiveCookie` to `preview` in the Sanity code**

`src/sanity/lib/draft-mode.ts` — the function and the comment line that
names the return value:

```ts
import type { AstroCookies } from "astro";
import { perspectiveCookieName } from "@sanity/preview-url-secret/constants";
import type { ContentOptions } from "@/lib/content/types";
```

```ts
 * Prerendered pages always resolve to `{ preview: undefined }`, which
 * makes `loadQuery` use the `published` perspective. That's correct:
 * prerendered pages are baked at build time and can't support live draft
 * preview anyway.
 */
export function getDraftModeProps(ctx: {
  cookies: AstroCookies;
  isPrerendered?: boolean;
}): ContentOptions {
  if (ctx.isPrerendered) {
    return { preview: undefined };
  }
  return {
    preview: ctx.cookies.get(perspectiveCookieName)?.value ?? undefined,
  };
}
```

`src/sanity/lib/load-query.ts` — the parameter (three references):

```ts
export async function loadQuery<const Q extends string>({
  query,
  params,
  preview = undefined,
}: {
  query: Q;
  params?: QueryParams;
  /** The perspective cookie's value (ContentOptions.preview); set only in draft mode. */
  preview?: string | undefined;
}) {
  const draftMode = preview ? true : false;
```

and further down, `? (parsePerspective(preview) ?? "drafts")`.

`src/sanity/lib/page-data.ts` — add
`import type { ContentOptions } from "@/lib/content/types";` after the
`categoryToSlug` import, and replace lines 53–54:

```ts
/** Perspective forwarding — the `opts` a content function received. */
type DraftProps = ContentOptions;
```

- [ ] **Step 7: Move `buildToc` into the Sanity code**

Cut `buildToc` (the whole function) from `src/lib/toc.ts` and paste it at
the end of `src/sanity/lib/portable-text.ts`, preceded by:

```ts
/**
 * Ids each h2 in a Portable Text body and collects the table of contents:
 * `slugifyHeading`, with `section-<key>` for an empty or repeated slug.
 */
```

and add `import { slugifyHeading, type TocItem } from "@/lib/toc";` to the
imports of `portable-text.ts`. Replace the header comment of
`src/lib/toc.ts` with:

```ts
/**
 * Table-of-contents types and the heading slugger, shared by every content
 * source. (The Sanity add-on's Portable Text walker, buildToc, lives in its
 * src/sanity/lib/portable-text.ts.)
 */
```

In `src/sanity/lib/map/blog.ts`, delete `import { buildToc } from "@/lib/toc";`
and add `buildToc,` to the existing `from "../portable-text"` import list.

- [ ] **Step 8: Run the probe to make sure it passes, then prove the augmentation is what admits Portable Text**

Run: `npm run check`
Expected: 0 errors.

Run: `mv src/sanity/lib/body-format.ts /tmp/ && npm run check; mv /tmp/body-format.ts src/sanity/lib/`
Expected: the check fails with `Type '"portable-text"' is not assignable
to type '"mdx"'` in `__probe-contract.ts` and the same family of errors
in `src/sanity/lib/map/blog.ts` and `BlogBody.astro`. The file is then
restored.

Run: `rm src/lib/content/__probe-contract.ts && npm run check`
Expected: 0 errors.

Run: `grep -rnw "perspectiveCookie" src scripts`
Expected: no output (only `perspectiveCookieName` remains).

- [ ] **Step 9: Gate**

Run: `npm run check:hover && npm run check:boundary && npm run check:content`
Expected: each OK.

Run the Files parity command and the four Sanity commands (Parity
procedure, Tasks 1–5).
Expected: `Identical` four times, `Equivalent` once.

- [ ] **Step 10: Commit**

```bash
git add src/lib/content src/lib/toc.ts src/sanity/lib
git commit -m "Neutralise the content contract: preview option, body-format registry

ContentOptions.perspectiveCookie becomes preview; BlogBodyContent derives
from a BlogBodyFormats interface the Sanity code augments with
portable-text; buildToc moves into src/sanity/lib/portable-text.ts.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: CMS seams, still wired to Sanity

Create every seam and route the three shared files through them. The
seam files hold the Sanity versions for now, so both builds stay
byte-identical; Task 6 moves those versions into the add-on and writes the
Files ones.

**Files:**

- Create: `src/config/sanity.shared.mjs`, `src/config/cms.mjs`,
  `src/config/cms.shared.mjs`, `src/config/headers.shared.mjs`,
  `src/components/global/CmsEditing.astro`,
  `scripts/check-config-sync-cases.mjs`
- Modify: `astro.config.mjs`, `src/layouts/BaseLayout.astro`,
  `src/middleware.ts`, `src/config/site.shared.mjs`, `src/config/site.ts`,
  `scripts/check-config-sync.mjs`, `package.json` (`check:config`),
  `sanity.config.ts`, `sanity.cli.ts`, `src/sanity/lib/page-data.ts`,
  `scripts/migrate-webflow-blog.mjs`, `scripts/setup.mjs`,
  `scripts/check-content-boundary.mjs` (ALLOW), `.env.example`

**Interfaces:**

- Consumes: nothing new.
- Produces:
  - `src/config/cms.mjs`: `integrations: AstroIntegration[]`,
    `remotePatterns`, `viteDefine: Record<string, string>`,
    `optimizeDeps: DepOptimizationOptions` (imported only by
    `astro.config.mjs`)
  - `src/config/cms.shared.mjs`: `FRAME_ANCESTORS: readonly string[]`,
    `PREVIEW_COOKIE: string | null`
  - `src/config/headers.shared.mjs`:
    `SECURITY_HEADERS: Readonly<Record<string, string>>`
  - `src/config/sanity.shared.mjs`: `SANITY_PROJECT_ID`, `SANITY_DATASET`,
    `SANITY_API_VERSION`, `WRANGLER_VARS`
  - Convention: any `src/config/*.shared.mjs` may export
    `WRANGLER_VARS: Record<string, string>`; `check-config-sync.mjs`
    requires each in `wrangler.jsonc` `vars`
  - `scripts/check-config-sync.mjs --root <dir>`
  - `CmsEditing.astro`: `Props { docs?: string }`, rendered once by
    BaseLayout

- [ ] **Step 1: Write the failing drift test**

Create `scripts/check-config-sync-cases.mjs`:

```js
#!/usr/bin/env node
// @ts-check
/**
 * check-config-sync-cases — proves scripts/check-config-sync.mjs catches
 * drift, by running it (`--root`) against small fixture projects in the
 * OS temp dir: wrangler.jsonc vars against the WRANGLER_VARS exports, and
 * public/_headers against SECURITY_HEADERS.
 *
 * Usage: node scripts/check-config-sync-cases.mjs (part of npm run check:config)
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = path.join(REPO, "scripts", "check-config-sync.mjs");
const HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": "frame-ancestors https://editor.example",
};
/** @type {string[]} */
const roots = [];

/**
 * A fixture project: the real headers.shared.mjs, a stand-in CMS seam and
 * a stand-in add-on module that exports WRANGLER_VARS.
 * @param {{ frameAncestors?: string[], vars?: Record<string, string>, headers?: Record<string, string> }} [options]
 */
function project({
  frameAncestors = ["https://editor.example"],
  vars = { PUBLIC_DEMO_ID: "demo" },
  headers = HEADERS,
} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "config-sync-"));
  roots.push(root);
  const write = (/** @type {string} */ rel, /** @type {string} */ text) => {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, text);
  };
  write(
    "src/config/headers.shared.mjs",
    fs.readFileSync(path.join(REPO, "src/config/headers.shared.mjs"), "utf8"),
  );
  write(
    "src/config/cms.shared.mjs",
    `export const FRAME_ANCESTORS = ${JSON.stringify(frameAncestors)};\nexport const PREVIEW_COOKIE = null;\n`,
  );
  write(
    "src/config/demo.shared.mjs",
    `export const WRANGLER_VARS = { PUBLIC_DEMO_ID: "demo" };\n`,
  );
  write(
    "wrangler.jsonc",
    `{\n  // Fixture.\n  "name": "fixture",\n  "vars": ${JSON.stringify(vars)},\n}\n`,
  );
  write(
    "public/_headers",
    `# Fixture.\n/*\n${Object.entries(headers)
      .map(([k, v]) => `  ${k}: ${v}`)
      .join("\n")}\n`,
  );
  return root;
}

const check = (/** @type {string} */ root) =>
  spawnSync(process.execPath, [CHECK, "--root", root], { encoding: "utf8" });
const passes = (/** @type {string} */ root) => {
  const r = check(root);
  assert.equal(r.status, 0, r.stderr);
};
const fails = (/** @type {string} */ root, /** @type {RegExp} */ pattern) => {
  const r = check(root);
  assert.equal(r.status, 1, `expected a failure matching ${pattern}`);
  assert.match(r.stderr, pattern);
};

// In sync. A var of the fork's own (in no WRANGLER_VARS) is fine.
passes(project({ vars: { PUBLIC_DEMO_ID: "demo", CF_ACCESS_AUD: "x" } }));
// No frame ancestors means only the site itself may frame its pages.
passes(
  project({
    frameAncestors: [],
    headers: {
      ...HEADERS,
      "Content-Security-Policy": "frame-ancestors 'self'",
    },
  }),
);
// A var that drifted, and one that is missing.
fails(
  project({ vars: { PUBLIC_DEMO_ID: "other" } }),
  /vars\.PUBLIC_DEMO_ID: "other", expected "demo" \(from src\/config\/demo\.shared\.mjs\)/,
);
fails(project({ vars: {} }), /vars\.PUBLIC_DEMO_ID: "\(unset\)"/);
// public/_headers drifting from the code: another source's CSP, a dropped header.
fails(
  project({
    headers: {
      ...HEADERS,
      "Content-Security-Policy": "frame-ancestors 'self'",
    },
  }),
  /Content-Security-Policy: "frame-ancestors 'self'", expected "frame-ancestors https:\/\/editor\.example"/,
);
const { "Permissions-Policy": _dropped, ...withoutOne } = HEADERS;
fails(project({ headers: withoutOne }), /Permissions-Policy: "\(missing\)"/);

for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
console.log("check-config-sync-cases: ok");
```

In `package.json`, change the script:

```json
"check:config": "node scripts/check-config-sync-cases.mjs && node scripts/check-config-sync.mjs",
```

(`prebuild` keeps running `check-config-sync.mjs` alone.)

- [ ] **Step 2: Run it to make sure it fails**

Run: `node scripts/check-config-sync-cases.mjs`
Expected: FAIL — `ENOENT … src/config/headers.shared.mjs` (the module
doesn't exist yet).

- [ ] **Step 3: Create the shared-constant modules**

`src/config/sanity.shared.mjs`:

```js
// @ts-check
/**
 * The Sanity project's shared constants — the ONE place its id, dataset and
 * API version are defined. Plain .mjs with zero imports (like
 * site.shared.mjs), so every context can import it: src/config/cms.mjs
 * (Astro's config), sanity.config.ts, sanity.cli.ts and the scripts.
 *
 * wrangler.jsonc is JSON and can't import, so it carries literal copies of
 * WRANGLER_VARS; `npm run check:config` (and every build) fails when they
 * drift. `npm run setup` writes these values on the Sanity branch.
 */

/** Sanity project id (public — appears in every Sanity API URL). */
export const SANITY_PROJECT_ID = "your-sanity-project-id";

/** Sanity dataset. */
export const SANITY_DATASET = "production";

/** Sanity API version (date-pinned). Keep in sync with Studio/Vision. */
export const SANITY_API_VERSION = "2025-03-15";

/** The public runtime vars wrangler.jsonc must carry, by name. */
export const WRANGLER_VARS = {
  PUBLIC_SANITY_PROJECT_ID: SANITY_PROJECT_ID,
  PUBLIC_SANITY_DATASET: SANITY_DATASET,
};
```

`src/config/cms.shared.mjs` (the Sanity version for now; the text is the
comment that sat on `SECURITY_HEADERS` in middleware.ts):

```js
// @ts-check
/**
 * CMS seam — runtime values, safe for the Worker bundle (no integration
 * imports). Read by src/config/headers.shared.mjs (the CSP) and
 * src/middleware.ts. This is the Sanity add-on's version; the Files
 * version (no editor, no drafts) is empty, and the add-on installer
 * overwrites one with the other.
 */
import { perspectiveCookieName } from "@sanity/preview-url-secret/constants";

/**
 * Origins allowed to frame site pages (CSP `frame-ancestors`).
 *
 * The Studio is hosted by Sanity. Its Presentation tool iframes site pages
 * for draft preview, but in the Core-app/dashboard model the Studio app is
 * sandboxed under *.sanity.studio (nested inside the www.sanity.io shell),
 * so BOTH families must be allowed — *.sanity.io (dashboard) +
 * *.sanity.studio (the sandboxed Studio app, the actual immediate framing
 * origin), plus localhost:3333 for local `sanity dev`. This is Sanity's
 * documented set.
 * @type {readonly string[]}
 */
export const FRAME_ANCESTORS = [
  "https://*.sanity.io",
  "https://*.sanity.studio",
  "http://localhost:3333",
];

/**
 * The cookie that marks a draft-preview session (set by
 * /api/draft-mode/enable). Middleware never caches a response to a request
 * that carries it.
 * @type {string | null}
 */
export const PREVIEW_COOKIE = perspectiveCookieName;
```

`src/config/headers.shared.mjs`:

```js
// @ts-check
/**
 * Security headers — the ONE list. src/middleware.ts sets them on every
 * SSR response, and public/_headers repeats them for prerendered pages and
 * assets, which the assets binding serves without running the Worker.
 * _headers is plain text, so `npm run check:config` (and every build)
 * fails when it drifts from this list.
 *
 * The CSP's frame-ancestors come from the CMS seam
 * (src/config/cms.shared.mjs): only the origins a content source names may
 * frame the site's pages, and with none, only the site itself.
 */
import { FRAME_ANCESTORS } from "./cms.shared.mjs";

/** @type {Readonly<Record<string, string>>} */
export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  // CSP frame-ancestors (not X-Frame-Options): it can name the origins allowed.
  "Content-Security-Policy": `frame-ancestors ${
    FRAME_ANCESTORS.length > 0 ? FRAME_ANCESTORS.join(" ") : "'self'"
  }`,
};
```

- [ ] **Step 4: Rewrite `scripts/check-config-sync.mjs`**

Replace the whole file:

```js
#!/usr/bin/env node
// @ts-check
/**
 * check-config-sync — guards the config files that can't import the
 * shared constants because they aren't JavaScript, so a fork (or an edit
 * to one side only) can't silently drift them apart:
 *
 *   wrangler.jsonc `vars` — every `WRANGLER_VARS` export of a
 *     src/config/*.shared.mjs module (a content add-on's project ids, for
 *     one) must be there with the same value. Other vars are the fork's
 *     own and are left alone.
 *   public/_headers — its `/*` block must send every header in
 *     SECURITY_HEADERS (src/config/headers.shared.mjs) with the same
 *     value, so prerendered pages (served straight from the assets
 *     binding) and SSR responses (src/middleware.ts) carry the same set.
 *
 * Run: npm run check:config (and automatically as `prebuild`).
 * `--root <dir>` checks another project tree (check-config-sync-cases.mjs).
 * Exits 1 naming every mismatch.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const rootAt = args.indexOf("--root");
const ROOT = path.resolve(rootAt >= 0 ? args[rootAt + 1] : process.cwd());
const CONFIG = path.join(ROOT, "src", "config");
/** @type {string[]} */
const problems = [];

/**
 * wrangler.jsonc → object. Strips comments and trailing commas; naive but
 * enough: wrangler.jsonc has no string containing `//` after a non-colon.
 * @param {string} raw
 */
function parseJsonc(raw) {
  return JSON.parse(
    raw
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1")
      .replace(/,(\s*[}\]])/g, "$1"),
  );
}

/**
 * The headers under one path-pattern line (e.g. "/*") of a _headers file,
 * keyed by lower-cased name.
 * @param {string} text
 * @param {string} pattern
 */
function headerBlock(text, pattern) {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.trimEnd() === pattern);
  if (start === -1) return null;
  /** @type {Map<string, string>} */
  const block = new Map();
  for (const line of lines.slice(start + 1)) {
    if (!/^\s+\S/.test(line)) break;
    const colon = line.indexOf(":");
    block.set(
      line.slice(0, colon).trim().toLowerCase(),
      line.slice(colon + 1).trim(),
    );
  }
  return block;
}

/* 1. wrangler.jsonc vars against every WRANGLER_VARS export. */
/** @type {Map<string, { value: string, from: string }>} */
const expectedVars = new Map();
const sharedModules = fs
  .readdirSync(CONFIG)
  .filter((f) => f.endsWith(".shared.mjs"))
  .sort();
for (const file of sharedModules) {
  const mod = await import(pathToFileURL(path.join(CONFIG, file)).href);
  for (const [name, value] of Object.entries(mod.WRANGLER_VARS ?? {}))
    expectedVars.set(name, {
      value: String(value),
      from: `src/config/${file}`,
    });
}
/** @type {Record<string, unknown>} */
let vars = {};
try {
  vars =
    parseJsonc(fs.readFileSync(path.join(ROOT, "wrangler.jsonc"), "utf8"))
      .vars ?? {};
} catch (err) {
  problems.push(
    `wrangler.jsonc could not be parsed: ${/** @type {Error} */ (err).message}`,
  );
}
for (const [name, { value, from }] of expectedVars)
  if (vars[name] !== value)
    problems.push(
      `wrangler.jsonc vars.${name}: "${vars[name] ?? "(unset)"}", expected "${value}" (from ${from})`,
    );

/* 2. public/_headers against SECURITY_HEADERS. */
const { SECURITY_HEADERS } = await import(
  pathToFileURL(path.join(CONFIG, "headers.shared.mjs")).href
);
const block = headerBlock(
  fs.readFileSync(path.join(ROOT, "public", "_headers"), "utf8"),
  "/*",
);
if (!block) problems.push('public/_headers has no "/*" block');
else
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    const got = block.get(name.toLowerCase());
    if (got !== value)
      problems.push(
        `public/_headers ${name}: "${got ?? "(missing)"}", expected "${value}" (from src/config/headers.shared.mjs)`,
      );
  }

if (problems.length) {
  console.error(
    "✗ check-config-sync: config files out of sync with src/config:",
  );
  for (const problem of problems) console.error(`    ${problem}`);
  console.error(
    "  Fix: copy the expected value into the file named. The .mjs module is the source of truth.",
  );
  process.exit(1);
}
console.log(
  `✓ check-config-sync: wrangler.jsonc vars (${expectedVars.size}) and public/_headers (${Object.keys(SECURITY_HEADERS).length} headers) match src/config`,
);
```

- [ ] **Step 5: Run the drift test and the real check**

Run: `npm run check:config`
Expected: `check-config-sync-cases: ok`, then
`✓ check-config-sync: wrangler.jsonc vars (2) and public/_headers (5 headers) match src/config`.

- [ ] **Step 6: The build-time seam and `astro.config.mjs`**

Create `src/config/cms.mjs` (the Sanity version for now; the comments are
the ones that sat in `astro.config.mjs`):

```js
// @ts-check
/**
 * CMS seam — build-time config. astro.config.mjs spreads these into its
 * integrations, image and vite settings, and never names a CMS itself.
 * Imported only by astro.config.mjs: integration packages must never reach
 * the Worker bundle (runtime values live in cms.shared.mjs).
 *
 * This is the Sanity add-on's version. The Files version exports empty
 * values, and the add-on installer overwrites one with the other.
 */
import { loadEnv } from "vite";
import react from "@astrojs/react";
import sanity from "@sanity/astro";
import {
  SANITY_API_VERSION,
  SANITY_DATASET,
  SANITY_PROJECT_ID,
} from "./sanity.shared.mjs";

const env = loadEnv(process.env.NODE_ENV ?? "", process.cwd(), "");
// Fallbacks come from the shared leaf module (src/config/sanity.shared.mjs)
// — CI (Cloudflare Workers Builds) has no root .env, so env-only lookup
// silently bakes empty strings into the sanity:client module.
const projectId = env.PUBLIC_SANITY_PROJECT_ID || SANITY_PROJECT_ID;
const dataset = env.PUBLIC_SANITY_DATASET || SANITY_DATASET;

/** @type {import("astro").AstroIntegration[]} */
export const integrations = [
  // React must be registered BEFORE Sanity — the visual-editing islands
  // (SanityVisualEditing / DisableDraftMode) are React components that need
  // the React renderer available when draft mode mounts them.
  react(),
  sanity({
    projectId,
    dataset,
    useCdn: true,
    apiVersion: SANITY_API_VERSION,
    // No `studioBasePath` — the Studio is hosted by Sanity at
    // <studioHost>.sanity.studio (deployed via `npx sanity deploy`), not
    // embedded in this app. The integration still provides the
    // `sanity:client` virtual module used by src/sanity/lib/load-query.ts.
    stega: {
      // Required for Visual Editing overlays — when stega encoding is on,
      // text fields rendered from Sanity contain hidden source links that
      // the overlay reads to map clicks back to the corresponding Studio
      // field. The studioUrl tells the overlay which Studio to deep-link —
      // the hosted Studio origin (cross-origin from the site).
      studioUrl: "https://your-studio.sanity.studio",
    },
  }),
];

/**
 * Remote image hosts Astro may optimise: Sanity's CDN, without requiring
 * width/height.
 * @type {import("astro").RemotePattern[]}
 */
export const remotePatterns = [
  { protocol: "https", hostname: "cdn.sanity.io" },
];

/**
 * Build-time constants (`vite.define`). Parity fixtures switch
 * (src/sanity/lib/load-query.ts): baked in at build time so a normal build
 * dead-code-eliminates the fixture import and no runtime variable can turn
 * it on. Never set in production.
 * @type {Record<string, string>}
 */
export const viteDefine = {
  __PARITY_FIXTURES__: JSON.stringify(process.env.PARITY_FIXTURES ?? ""),
};

/**
 * Vite dependency pre-bundling. Astro 6 + @sanity/visual-editing compat
 * workaround: several transitive deps are CJS modules that Vite doesn't
 * pre-bundle automatically. Without this, the VisualEditing component fails
 * to hydrate. Per the official Sanity + Astro guide. (Production builds use
 * Rollup, which handles this; the issue is primarily dev-server, but
 * harmless to include for both.)
 * @type {import("vite").DepOptimizationOptions}
 */
export const optimizeDeps = {
  include: [
    "react/compiler-runtime",
    "lodash/isObject.js",
    "lodash/groupBy.js",
    "lodash/keyBy.js",
    "lodash/partition.js",
    "lodash/sortedIndex.js",
  ],
  exclude: ["@sanity/astro"],
};
```

In `astro.config.mjs`:

Replace the import block and the env/fallback block (lines 1–27) with:

```js
// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import cloudflare from "@astrojs/cloudflare";
import { normalizePath } from "vite";
import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import * as cms from "./src/config/cms.mjs";
import { SITE_URL } from "./src/config/site.shared.mjs";
import { DEV_ONLY_PATHS, isNoindexRoute } from "./src/config/seo.shared.mjs";
```

Replace the integrations array:

```js
  integrations: [
    excludeDevOnlyPages(),
    sitemap({
      filter: (page) => !isNoindexRoute(new URL(page).pathname),
    }),
    mdx(),
    // The content source's integrations (src/config/cms.mjs): none for
    // content in local files; a CMS add-on supplies its own.
    ...cms.integrations,
  ],
```

Replace the `// Allow Sanity CDN images…` comment and `remotePatterns`
array inside `image`:

```js
    // Remote image hosts the content source serves from (src/config/cms.mjs).
    remotePatterns: cms.remotePatterns,
```

Replace the `vite` block:

```js
  vite: {
    plugins: [contentSourceSwitch()],
    // Build-time constants and dependency pre-bundling hints the content
    // source needs (src/config/cms.mjs).
    define: cms.viteDefine,
    optimizeDeps: cms.optimizeDeps,
  },
```

(`contentSourceSwitch` and its `normalizePath` import stay until Task 6.)

- [ ] **Step 7: The editing seam and BaseLayout**

Create `src/components/global/CmsEditing.astro` (Sanity version for now):

```astro
---
/**
 * CmsEditing — the CMS editing seam. BaseLayout renders it once, at the
 * end of `<body>`. This is the Sanity add-on's version: in draft mode (the
 * Presentation perspective cookie is set, which happens only on SSR
 * routes) it mounts the visual-editing overlay and the "Disable Draft
 * Mode" button. The Files version renders nothing, and the add-on
 * installer overwrites one with the other.
 */
import SanityVisualEditing from "@/components/SanityVisualEditing";
import DisableDraftMode from "@/components/DisableDraftMode";
import { perspectiveCookieName } from "@sanity/preview-url-secret/constants";

interface Props {
  /**
   * **CmsEditing** — the CMS editing seam. BaseLayout renders it once at
   * the end of `<body>`; it takes no props.
   */
  docs?: string;
}

const { docs } = Astro.props;

// Prerendered pages are baked at build time with no request, so cookies
// aren't available. Short-circuit to avoid "Astro.request.headers was used"
// build warnings. Draft mode only ever applies to SSR routes (the
// /preview/* twins and API routes); public content routes are prerendered.
const draftMode = Astro.isPrerendered
  ? false
  : Astro.cookies.has(perspectiveCookieName);
---

{
  draftMode && (
    <>
      <SanityVisualEditing client:only="react" />
      <DisableDraftMode client:only="react" />
    </>
  )
}
```

Edit `src/layouts/BaseLayout.astro` by hand (it is prettier-ignored; keep
its `from"…"` style):

1. Delete these three import lines:

```astro
import SanityVisualEditing from"@/components/SanityVisualEditing"; import
DisableDraftMode from"@/components/DisableDraftMode"; import {
  perspectiveCookieName
} from "@sanity/preview-url-secret/constants";
```

and add, after `import UtilityBar from"@/components/global/UtilityBar.astro";`:

```astro
import CmsEditing from"@/components/global/CmsEditing.astro";
```

2. Delete the draft-mode block (the four comment lines starting
   `// Prerendered pages are baked at build time` and the
   `const draftMode = …;` statement after them, plus the blank line that
   follows).

3. Replace the final block:

```astro
{
  draftMode && (
    <>
      <SanityVisualEditing client:only="react" />
      <DisableDraftMode client:only="react" />
    </>
  )
}
```

with:

```astro
{
  /* The CMS editing seam: nothing for content in files; a CMS add-on's
        in-page editing tools in its draft preview. */
}
<CmsEditing />
```

- [ ] **Step 8: Middleware reads the seams**

In `src/middleware.ts`, replace the imports and the `SECURITY_HEADERS`
constant (lines 1–26) with:

```ts
import { defineMiddleware } from "astro:middleware";
import { isNoindexRoute } from "@/config/seo.shared.mjs";
import { PREVIEW_COOKIE } from "@/config/cms.shared.mjs";
import { SECURITY_HEADERS } from "@/config/headers.shared.mjs";
import { SITE } from "@/config/site";
import { SMS_OFF_COPY_SWAPS } from "@/config/sms-consent";
import { checkToolsAuth, isToolsPath } from "@/lib/tools-auth";

// Security headers for every SSR response come from
// src/config/headers.shared.mjs. Static assets bypass the worker entirely
// (no run_worker_first in wrangler.jsonc), so public/_headers repeats the
// same list for the assets binding; `npm run check:config` fails when the
// two drift.
```

Replace `const isDraftMode = context.cookies.has(perspectiveCookieName);`
with:

```ts
// A draft-preview session, when the content source has one (the CMS
// seam's PREVIEW_COOKIE; null for content in files).
const isDraftMode =
  PREVIEW_COOKIE !== null && context.cookies.has(PREVIEW_COOKIE);
```

In the `/preview` cache comment, replace "an editor who DOES have the
cookie — Presentation silently shows stale content and "preview looks
broken" with nothing in the logs." with "an editor who DOES have the
cookie — the CMS preview silently shows stale content with nothing in the
logs." `...SECURITY_HEADERS` in `headersToSet` stays as it is.

- [ ] **Step 9: Move the Sanity ids out of `site.shared.mjs`**

`src/config/site.shared.mjs` — replace the header comment and delete the
three `SANITY_*` exports (with their doc comments), keeping `SITE_URL`:

```js
/**
 * Shared primitive constants — the ONE place the site origin is defined.
 *
 * Why this file exists (and why it's plain `.mjs` with zero imports):
 * `src/config/site.ts` is the canonical site config, but a few files are
 * evaluated OUTSIDE the app's module graph and can't import a `.ts` that
 * pulls in app code — `astro.config.mjs` and the `scripts/*.mjs`. This leaf
 * module has no dependencies, so every one of those contexts CAN import it
 * instead of carrying its own literal copy. `site.ts` imports it too — so
 * there is exactly one source of truth. (A content add-on keeps its own ids
 * the same way, in its own `src/config/<name>.shared.mjs`.)
 *
 * When forking for a new site: `npm run setup` writes SITE_URL here, and it
 * propagates to every config and to `SITE` in site.ts.
 */
```

`src/config/site.ts`:

- header lines 9–14, after:

```ts
 * The site URL lives in `site.shared.mjs` (a dependency-free leaf module) so
 * the config-load contexts that can't import this file — `astro.config.mjs`
 * and the `scripts/*.mjs` — can import the SAME value. One definition, no
 * hand-synced copies.
 */

import { SITE_URL as SHARED_SITE_URL } from "./site.shared.mjs";
```

- delete the `/** Sanity project — canonical values live in site.shared.mjs. */`
  comment, the `sanity: { … },` member and the blank line after it.
- line 250, after: `* Consumed by the llms endpoints (and the Sanity add-on's portable-text.ts).`

Re-point the importers:

- `src/sanity/lib/page-data.ts:50`:
  `import { SANITY_PROJECT_ID } from "@/config/sanity.shared.mjs";`
- `sanity.config.ts:25-29`:

```ts
import {
  SANITY_PROJECT_ID,
  SANITY_DATASET,
} from "./src/config/sanity.shared.mjs";
import { SITE_URL } from "./src/config/site.shared.mjs";
```

and in the comment at line 70, `(src/config/site.shared.mjs)` becomes
`(src/config/sanity.shared.mjs)`.

- `sanity.cli.ts:2-5`:

```ts
import {
  SANITY_PROJECT_ID,
  SANITY_DATASET,
} from "./src/config/sanity.shared.mjs";
```

- `scripts/migrate-webflow-blog.mjs:35`:
  `import { SANITY_DATASET } from "../src/config/sanity.shared.mjs";`
- `.env.example`: line 3 becomes
  `# Non-secret site identity (name, URL, email, phone, socials) is`, and
  the line `# Mirrors SITE.sanity in src/config/site.ts. astro.config.mjs carries a`
  becomes `# Mirrors src/config/sanity.shared.mjs. src/config/cms.mjs carries a`.

`scripts/setup.mjs` (Task 9 adds the content-source question; this step
only re-points paths):

- after `const SHARED = "src/config/site.shared.mjs";` add
  `const SANITY_SHARED = "src/config/sanity.shared.mjs";`
- the three Sanity prompts: `from: [SHARED, "SANITY_…"]` →
  `from: [SANITY_SHARED, "SANITY_…"]`
- in `buildChanges`, replace step 1 with:

```js
// 1. site.shared.mjs — the site URL.
{
  const before = await readSrc(SHARED);
  const r = replaceAssignedString(before, "SITE_URL", a.siteUrl);
  changes.push({
    rel: SHARED,
    before,
    after: r.src,
    edits: r.changed && r.src !== before ? ["SITE_URL"] : [],
  });
}

// 1b. sanity.shared.mjs — the Sanity project's ids.
{
  const before = await readSrc(SANITY_SHARED);
  let src = before;
  const edits = [];
  for (const [name, value] of [
    ["SANITY_PROJECT_ID", a.sanityProjectId],
    ["SANITY_DATASET", a.sanityDataset],
    ["SANITY_API_VERSION", a.sanityApiVersion],
  ]) {
    const r = replaceAssignedString(src, name, value);
    if (r.changed && r.src !== src) {
      src = r.src;
      edits.push(name);
    }
  }
  changes.push({ rel: SANITY_SHARED, before, after: src, edits });
}
```

- header comment: the `site.shared.mjs` line becomes
  `•  src/config/site.shared.mjs       — the site URL`, and add
  `•  src/config/sanity.shared.mjs     — Sanity projectId/dataset/apiVersion`.
- `--help` "Writes:" list: add `${SANITY_SHARED}` after `${SHARED}`.
- next steps line 2:
  `2. ${c.bold}npm run check:config${c.reset}   verify wrangler.jsonc and public/_headers match src/config`.

- [ ] **Step 10: Boundary allow list**

In `scripts/check-content-boundary.mjs` `ALLOW`, delete the
`src/layouts/BaseLayout.astro` and `src/middleware.ts` entries and add:

```js
  "src/config/cms.mjs", // CMS seam: the Sanity integrations
  "src/config/cms.shared.mjs", // CMS seam: Studio origins, preview cookie
  "src/components/global/CmsEditing.astro", // CMS seam: visual editing
```

- [ ] **Step 11: Verify**

Run: `grep -in sanity src/layouts/BaseLayout.astro src/middleware.ts`
Expected: no output.

Run: `npm run check && npm run check:hover && npm run check:boundary && npm run check:config && npm run check:content`
Expected: 0 errors; each OK.

Run the Files parity command and the four Sanity commands (Parity
procedure, Tasks 1–5).
Expected: `Identical` four times, `Equivalent` once (`_headers` is
unchanged: SECURITY_HEADERS reproduces it).

- [ ] **Step 12: Commit**

```bash
git add src/config src/components/global/CmsEditing.astro src/layouts/BaseLayout.astro src/middleware.ts astro.config.mjs scripts package.json sanity.config.ts sanity.cli.ts src/sanity/lib/page-data.ts .env.example
git commit -m "Route Sanity through CMS seams; check _headers against the header list

astro.config, BaseLayout and middleware now read src/config/cms.mjs,
cms.shared.mjs, headers.shared.mjs and CmsEditing.astro; Sanity ids move
to src/config/sanity.shared.mjs; check-config-sync checks any
WRANGLER_VARS export and public/_headers.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The add-on installer

A generic, zero-dependency installer, tested against a throwaway fixture
add-on. The real Sanity add-on arrives in Task 6.

**Files:**

- Create: `scripts/lib/jsonc.mjs`, `scripts/lib/addon-install.mjs`,
  `scripts/addon-sanity.mjs`
- Test: `scripts/check-addon-installer.mjs`
- Modify: `scripts/check-config-sync.mjs` (use `parseJsonc`),
  `package.json` (scripts `addon:sanity`, `check:addon-installer`)

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces:
  - `scripts/lib/jsonc.mjs`: `tokenize(text): Token[]`,
    `parseJsonc(text): any`,
    `setMembers(text, key, entries, { trailingCommas, comment? }): { text, changed: string[] }`
    (`changed` holds `"added X"` / `"updated X"` in entry order)
  - `scripts/lib/addon-install.mjs`: `class AddonError extends Error`,
    `planInstall({ root, addonDir, force? }): Plan`,
    `applyPlan(root, plan): void`, where
    `Plan = { manifest, writes: { path, content, action: "add" | "overwrite" | "update" }[], deletes: string[], notes: string[] }`
  - The manifest schema (the `Manifest` typedef below): `name`,
    `marker`, `dependencies?`, `devDependencies?`, `scripts?`,
    `wrangler?: { vars, comment? }`, `tsconfig?` (compilerOptions
    entries), `env?: string[]`, `gitignore?: string[]`,
    `delete?: string[]`, `nextSteps?: string[]`
  - CLI `npm run addon:sanity [-- --dry-run] [-- --force]`: exit 0 on
    install or dry run, 1 on refusal (message on stderr, prefixed
    `✗ addon:sanity: `)

- [ ] **Step 1: Write the failing tests**

Create `scripts/check-addon-installer.mjs`:

```js
#!/usr/bin/env node
// @ts-check
/**
 * check-addon-installer — tests for scripts/lib/jsonc.mjs and the add-on
 * installer (scripts/lib/addon-install.mjs and its CLI,
 * scripts/addon-sanity.mjs), against throwaway fixture projects in the OS
 * temp dir. Merged config files must come out Prettier-clean under this
 * repo's config, so format:check stays green after an install. The real
 * Sanity add-on is exercised end to end by scripts/check-addon-sanity.mjs.
 *
 * Usage: npm run check:addon-installer   (needs git)
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as prettier from "prettier";
import { parseJsonc, setMembers, tokenize } from "./lib/jsonc.mjs";
import { AddonError, applyPlan, planInstall } from "./lib/addon-install.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/** @type {string[]} */
const temps = [];

/** Prettier-clean under the repo's config, as `format:check` would see it. */
async function assertPrettier(
  /** @type {string} */ text,
  /** @type {string} */ filepath,
) {
  const config =
    (await prettier.resolveConfig(path.join(REPO, filepath))) ?? {};
  assert.ok(
    await prettier.check(text, { ...config, filepath }),
    `${filepath} is not Prettier-formatted:\n${text}`,
  );
}

/* ── jsonc ─────────────────────────────────────────────────────────────── */

// Comments, trailing commas, and strings holding comment and bracket characters.
assert.deepEqual(
  parseJsonc(
    '{ "url": "https://x.dev/{a}//b", /* c */ "n": 1, // d\n "list": [1, 2,], }',
  ),
  { url: "https://x.dev/{a}//b", n: 1, list: [1, 2] },
);
assert.throws(() => tokenize('{ "a": "unterminated }'), /Unterminated string/);

const WRANGLER = `{
  // Worker name.
  "name": "site",
  // Public vars.
  "vars": {},
  "assets": { "directory": "./dist" },
}
`;

// Into an empty object: own lines, comment above, a comma after each (.jsonc).
{
  const { text, changed } = setMembers(
    WRANGLER,
    "vars",
    { PUBLIC_A: "a", PUBLIC_B: "b" },
    { trailingCommas: true, comment: "Added by the demo add-on." },
  );
  assert.deepEqual(changed, ["added PUBLIC_A", "added PUBLIC_B"]);
  assert.equal(
    text,
    `{
  // Worker name.
  "name": "site",
  // Public vars.
  "vars": {
    // Added by the demo add-on.
    "PUBLIC_A": "a",
    "PUBLIC_B": "b",
  },
  "assets": { "directory": "./dist" },
}
`,
  );
  await assertPrettier(text, "wrangler.jsonc");
  // A second merge changes nothing.
  assert.deepEqual(
    setMembers(
      text,
      "vars",
      { PUBLIC_A: "a", PUBLIC_B: "b" },
      { trailingCommas: true },
    ),
    { text, changed: [] },
  );
  // A different value is replaced in place; everything else stays.
  const updated = setMembers(
    text,
    "vars",
    { PUBLIC_A: "z" },
    { trailingCommas: true },
  );
  assert.deepEqual(updated.changed, ["updated PUBLIC_A"]);
  assert.equal(parseJsonc(updated.text).vars.PUBLIC_A, "z");
  assert.equal(
    updated.text,
    text.replace('"PUBLIC_A": "a"', '"PUBLIC_A": "z"'),
  );
}

// After a last member with no comma and a trailing comment.
{
  const src = `{\n  "vars": {\n    "KEEP": "1" // kept\n  },\n}\n`;
  const { text } = setMembers(
    src,
    "vars",
    { NEW: "2" },
    { trailingCommas: true },
  );
  assert.equal(
    text,
    `{\n  "vars": {\n    "KEEP": "1", // kept\n    "NEW": "2",\n  },\n}\n`,
  );
}

// A missing member is created before the root's closing brace.
{
  const src = `{\n  "name": "site",\n}\n`;
  const { text, changed } = setMembers(
    src,
    "vars",
    { A: "a" },
    { trailingCommas: true },
  );
  assert.deepEqual(changed, ["added A"]);
  assert.equal(
    text,
    `{\n  "name": "site",\n  "vars": {\n    "A": "a",\n  },\n}\n`,
  );
  await assertPrettier(text, "wrangler.jsonc");
}

// .json (tsconfig.json): no trailing commas; arrays on one line.
{
  const src = `{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "types": [],
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
`;
  const { text, changed } = setMembers(
    src,
    "compilerOptions",
    { jsx: "react-jsx", types: ["demo/module"] },
    { trailingCommas: false },
  );
  assert.deepEqual(changed, ["added jsx", "updated types"]);
  assert.equal(
    text,
    `{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "types": ["demo/module"],
    "paths": {
      "@/*": ["./src/*"]
    },
    "jsx": "react-jsx"
  }
}
`,
  );
  await assertPrettier(text, "tsconfig.json");
}

/* ── installer ─────────────────────────────────────────────────────────── */

const git = (/** @type {string} */ cwd, /** @type {string[]} */ ...args) =>
  execFileSync(
    "git",
    [
      "-c",
      "user.name=check",
      "-c",
      "user.email=check@example.invalid",
      ...args,
    ],
    { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );

/**
 * A committed fixture project with a demo add-on at addons/sanity/ (the
 * folder the CLI reads).
 * @param {{ withCli?: boolean }} [options]
 */
function fixture({ withCli = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "addon-installer-"));
  temps.push(root);
  const write = (/** @type {string} */ rel, /** @type {string} */ text) => {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  };
  const json = (/** @type {unknown} */ value) =>
    `${JSON.stringify(value, null, 2)}\n`;
  write(
    "package.json",
    json({
      name: "fixture",
      scripts: { build: "astro build" },
      dependencies: { astro: "^7.0.0", gsap: "^3.0.0" },
      devDependencies: { prettier: "^3.0.0" },
    }),
  );
  write("wrangler.jsonc", WRANGLER);
  write(
    "tsconfig.json",
    `{\n  "compilerOptions": {\n    "types": []\n  }\n}\n`,
  );
  write(".env.example", "SITE_URL=https://www.example.com\n");
  write(".gitignore", "node_modules/\n");
  write("public/_headers", "files version\n");
  write("src/old.txt", "remove me\n");
  write(
    "addons/sanity/manifest.json",
    json({
      name: "Demo",
      marker: "src/demo/marker.ts",
      dependencies: { react: "^19.0.0" },
      devDependencies: { "csv-parse": "^6.0.0" },
      scripts: { studio: "demo dev" },
      wrangler: { vars: { PUBLIC_DEMO_ID: "demo" }, comment: "Demo add-on." },
      tsconfig: { jsx: "react-jsx", types: ["demo/module"] },
      env: ["# Demo add-on", "PUBLIC_DEMO_ID=", "DEMO_TOKEN="],
      gitignore: ["# Demo add-on", ".demo/", "node_modules/"],
      delete: ["src/old.txt"],
      nextSteps: ["npm install"],
    }),
  );
  write("addons/sanity/files/src/demo/marker.ts", "export {};\n");
  write("addons/sanity/files/public/_headers", "demo version\n");
  write("addons/sanity/files/node_modules/skip.js", "skipped\n");
  write("addons/sanity/files/.DS_Store", "skipped\n");
  if (withCli)
    for (const rel of [
      "scripts/addon-sanity.mjs",
      "scripts/lib/addon-install.mjs",
      "scripts/lib/jsonc.mjs",
    ])
      write(rel, fs.readFileSync(path.join(REPO, rel), "utf8"));
  git(root, "init", "-q");
  git(root, "add", "-A");
  git(root, "commit", "-qm", "fixture");
  return { root, addonDir: path.join(root, "addons", "sanity") };
}
const refused =
  (/** @type {RegExp} */ pattern) => (/** @type {unknown} */ err) =>
    err instanceof AddonError && pattern.test(err.message);

// Planning lists every write and touches nothing.
{
  const { root, addonDir } = fixture();
  const plan = planInstall({ root, addonDir });
  assert.deepEqual(plan.writes.map((w) => `${w.action} ${w.path}`).sort(), [
    "add src/demo/marker.ts",
    "overwrite public/_headers",
    "update .env.example",
    "update .gitignore",
    "update package.json",
    "update tsconfig.json",
    "update wrangler.jsonc",
  ]);
  assert.deepEqual(plan.deletes, ["src/old.txt"]);
  assert.equal(git(root, "status", "--porcelain"), "");
}

// Installing produces the expected merge.
{
  const { root, addonDir } = fixture();
  applyPlan(root, planInstall({ root, addonDir }));
  const read = (/** @type {string} */ rel) =>
    fs.readFileSync(path.join(root, rel), "utf8");
  const pkg = JSON.parse(read("package.json"));
  assert.deepEqual(pkg.dependencies, {
    astro: "^7.0.0",
    gsap: "^3.0.0",
    react: "^19.0.0",
  });
  assert.deepEqual(Object.keys(pkg.dependencies), ["astro", "gsap", "react"]);
  assert.deepEqual(Object.keys(pkg.devDependencies), ["csv-parse", "prettier"]);
  assert.deepEqual(pkg.scripts, { build: "astro build", studio: "demo dev" });
  await assertPrettier(read("package.json"), "package.json");
  const wrangler = read("wrangler.jsonc");
  assert.deepEqual(parseJsonc(wrangler).vars, { PUBLIC_DEMO_ID: "demo" });
  assert.match(wrangler, /\/\/ Worker name\.\n[\s\S]*\/\/ Demo add-on\.\n/);
  await assertPrettier(wrangler, "wrangler.jsonc");
  assert.deepEqual(parseJsonc(read("tsconfig.json")).compilerOptions, {
    types: ["demo/module"],
    jsx: "react-jsx",
  });
  await assertPrettier(read("tsconfig.json"), "tsconfig.json");
  assert.equal(
    read(".env.example"),
    "SITE_URL=https://www.example.com\n\n# Demo add-on\nPUBLIC_DEMO_ID=\nDEMO_TOKEN=\n",
  );
  assert.equal(read(".gitignore"), "node_modules/\n\n# Demo add-on\n.demo/\n");
  assert.equal(read("public/_headers"), "demo version\n");
  assert.equal(read("src/demo/marker.ts"), "export {};\n");
  assert.ok(!fs.existsSync(path.join(root, "src/old.txt")));
  assert.ok(!fs.existsSync(path.join(root, "node_modules/skip.js")));
  assert.ok(!fs.existsSync(path.join(root, ".DS_Store")));
  // A second run refuses (before the clean-tree check: the tree is dirty now).
  assert.throws(
    () => planInstall({ root, addonDir }),
    refused(/already installed/),
  );
}

// A dirty tree refuses, naming the change; force proceeds.
{
  const { root, addonDir } = fixture();
  fs.appendFileSync(path.join(root, ".env.example"), "LOCAL=1\n");
  assert.throws(
    () => planInstall({ root, addonDir }),
    refused(/uncommitted changes:[\s\S]*\.env\.example[\s\S]*--force/),
  );
  assert.ok(planInstall({ root, addonDir, force: true }).writes.length > 0);
}

// Not a git repository (a zip download): refuses unless forced.
{
  const { root, addonDir } = fixture();
  fs.rmSync(path.join(root, ".git"), { recursive: true, force: true });
  assert.throws(
    () => planInstall({ root, addonDir }),
    refused(/not a git repository[\s\S]*--force/),
  );
  assert.ok(planInstall({ root, addonDir, force: true }).writes.length > 0);
}

// No add-on folder (a fork that deleted addons/).
{
  const { root } = fixture();
  assert.throws(
    () => planInstall({ root, addonDir: path.join(root, "addons", "missing") }),
    refused(/manifest\.json not found[\s\S]*Copy the add-on folder/),
  );
}

// An overlay must not carry a file the manifest merges.
{
  const { root, addonDir } = fixture();
  fs.writeFileSync(path.join(addonDir, "files", "package.json"), "{}\n");
  git(root, "add", "-A");
  git(root, "commit", "-qm", "bad overlay");
  assert.throws(
    () => planInstall({ root, addonDir }),
    refused(/must not contain package\.json/),
  );
}

// The CLI: a dry run writes nothing; install; a second run exits 1.
{
  const { root } = fixture({ withCli: true });
  const run = (/** @type {string[]} */ ...args) =>
    spawnSync(process.execPath, ["scripts/addon-sanity.mjs", ...args], {
      cwd: root,
      encoding: "utf8",
    });
  const dry = run("--dry-run");
  assert.equal(dry.status, 0, dry.stderr);
  assert.match(dry.stdout, /overwrite\s+public\/_headers/);
  assert.match(dry.stdout, /Nothing written/);
  assert.equal(git(root, "status", "--porcelain"), "");
  const first = run();
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /Demo add-on installed[\s\S]*1\. npm install/);
  const second = run();
  assert.equal(second.status, 1);
  assert.match(
    second.stderr,
    /^✗ addon:sanity: the Demo add-on is already installed/,
  );
}

for (const dir of temps) fs.rmSync(dir, { recursive: true, force: true });
console.log("check-addon-installer: ok");
```

Add to `package.json` `scripts`:

```json
"addon:sanity": "node scripts/addon-sanity.mjs",
"check:addon-installer": "node scripts/check-addon-installer.mjs",
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npm run check:addon-installer`
Expected: FAIL — `ERR_MODULE_NOT_FOUND` for `scripts/lib/jsonc.mjs`.

- [ ] **Step 3: Write `scripts/lib/jsonc.mjs`**

```js
// @ts-check
/**
 * Minimal JSONC — JSON with comments and trailing commas — for the config
 * files the scripts read and edit (wrangler.jsonc, tsconfig.json). Zero
 * dependencies.
 *
 *   tokenize(text)    strings, punctuation and bare literals with their
 *                     offsets; whitespace and comments are skipped, so a
 *                     `//` or `{` inside a string can't confuse anything
 *   parseJsonc(text)  the value, as JSON.parse would return it
 *   setMembers(text, key, entries, options)
 *                     sets entries inside the top-level object member
 *                     `key` (creating it), editing only the text it must:
 *                     comments and formatting elsewhere are untouched
 *
 * Output follows Prettier (measured on 3.6): a .jsonc file ends every
 * member with a comma (`trailingCommas: true`); a .json file never does.
 */

/**
 * @typedef {"string" | "literal" | "{" | "}" | "[" | "]" | ":" | ","} TokenType
 * @typedef {{ type: TokenType, start: number, end: number, value?: unknown }} Token
 * @typedef {{ start: number, end: number, text: string }} Edit
 * @typedef {{ trailingCommas: boolean, comment?: string }} SetOptions
 */

/**
 * @param {string} text
 * @returns {Token[]}
 */
export function tokenize(text) {
  /** @type {Token[]} */
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      i++;
    } else if (ch === "/" && text[i + 1] === "/") {
      const end = text.indexOf("\n", i);
      i = end === -1 ? text.length : end;
    } else if (ch === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      if (end === -1) throw new Error(`Unterminated comment at offset ${i}`);
      i = end + 2;
    } else if (ch === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j += text[j] === "\\" ? 2 : 1;
      if (j >= text.length)
        throw new Error(`Unterminated string at offset ${i}`);
      tokens.push({
        type: "string",
        start: i,
        end: j + 1,
        value: JSON.parse(text.slice(i, j + 1)),
      });
      i = j + 1;
    } else if ("{}[]:,".includes(ch)) {
      tokens.push({
        type: /** @type {TokenType} */ (ch),
        start: i,
        end: i + 1,
      });
      i++;
    } else {
      let j = i;
      while (j < text.length && !/[\s{}[\]:,"/]/.test(text[j])) j++;
      if (j === i) throw new Error(`Unexpected "${ch}" at offset ${i}`);
      tokens.push({
        type: "literal",
        start: i,
        end: j,
        value: JSON.parse(text.slice(i, j)),
      });
      i = j;
    }
  }
  return tokens;
}

/**
 * Index of the token that closes the bracket at tokens[open].
 * @param {Token[]} tokens
 * @param {number} open
 */
function closing(tokens, open) {
  let depth = 0;
  for (let k = open; k < tokens.length; k++) {
    const type = tokens[k].type;
    if (type === "{" || type === "[") depth++;
    else if (type === "}" || type === "]") {
      depth--;
      if (depth === 0) return k;
    }
  }
  throw new Error(
    `Unclosed "${tokens[open].type}" at offset ${tokens[open].start}`,
  );
}

/**
 * Last token index of the value that starts at tokens[k].
 * @param {Token[]} tokens
 * @param {number} k
 */
const valueEnd = (tokens, k) =>
  tokens[k].type === "{" || tokens[k].type === "[" ? closing(tokens, k) : k;

/**
 * tokens[from..to] as strict JSON: comments gone, trailing commas dropped.
 * @param {string} text
 * @param {Token[]} tokens
 * @param {number} from
 * @param {number} to
 */
function toJson(text, tokens, from, to) {
  let json = "";
  for (let k = from; k <= to; k++) {
    const next = tokens[k + 1]?.type;
    if (tokens[k].type === "," && (next === "}" || next === "]")) continue;
    json += text.slice(tokens[k].start, tokens[k].end);
  }
  return json;
}

/**
 * @param {string} text
 * @returns {any}
 */
export function parseJsonc(text) {
  const tokens = tokenize(text);
  if (tokens.length === 0) throw new Error("Empty document");
  return JSON.parse(toJson(text, tokens, 0, tokens.length - 1));
}

/**
 * The object at tokens[open]: each member's key → its value's first token.
 * @param {Token[]} tokens
 * @param {number} open
 */
function members(tokens, open) {
  const close = closing(tokens, open);
  /** @type {Map<string, number>} */
  const out = new Map();
  let k = open + 1;
  while (k < close) {
    if (tokens[k].type !== "string" || tokens[k + 1]?.type !== ":")
      throw new Error(`Expected "key": at offset ${tokens[k].start}`);
    out.set(String(tokens[k].value), k + 2);
    k = valueEnd(tokens, k + 2) + 1;
    if (tokens[k]?.type === ",") k++;
  }
  return out;
}

/**
 * The whitespace that starts the line containing `offset`.
 * @param {string} text
 * @param {number} offset
 */
function lineIndent(text, offset) {
  const start = text.lastIndexOf("\n", offset - 1) + 1;
  return /^[ \t]*/.exec(text.slice(start))?.[0] ?? "";
}

/**
 * `"key": value` as lines; a plain-object value opens its own block.
 * @param {string} key
 * @param {unknown} value
 * @param {string} indent
 * @param {boolean} trailingCommas
 * @param {boolean} last
 * @returns {string[]}
 */
function renderMember(key, value, indent, trailingCommas, last) {
  const comma = trailingCommas || !last ? "," : "";
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value);
    return [
      `${indent}${JSON.stringify(key)}: {`,
      ...entries.flatMap(([k, v], i) =>
        renderMember(
          k,
          v,
          `${indent}  `,
          trailingCommas,
          i === entries.length - 1,
        ),
      ),
      `${indent}}${comma}`,
    ];
  }
  return [`${indent}${JSON.stringify(key)}: ${JSON.stringify(value)}${comma}`];
}

/**
 * Edits that add `entries` before the closing brace of the object at
 * tokens[open], one per line, indented one level past the line that opens
 * it.
 * @param {string} text
 * @param {Token[]} tokens
 * @param {number} open
 * @param {Array<[string, unknown]>} entries
 * @param {SetOptions} options
 * @returns {Edit[]}
 */
function insertInto(text, tokens, open, entries, { trailingCommas, comment }) {
  const close = closing(tokens, open);
  const outer = lineIndent(text, tokens[open].start);
  const indent = `${outer}  `;
  const lines = [
    ...(comment
      ? comment.split("\n").map((line) => `${indent}// ${line}`)
      : []),
    ...entries.flatMap(([k, v], i) =>
      renderMember(k, v, indent, trailingCommas, i === entries.length - 1),
    ),
  ].join("\n");
  if (close === open + 1)
    return [
      {
        start: tokens[open].end,
        end: tokens[close].start,
        text: `\n${lines}\n${outer}`,
      },
    ];
  /** @type {Edit[]} */
  const edits = [];
  const last = tokens[close - 1];
  if (last.type !== ",")
    edits.push({ start: last.end, end: last.end, text: "," });
  const lineStart = text.lastIndexOf("\n", tokens[close].start - 1) + 1;
  if (/^[ \t]*$/.test(text.slice(lineStart, tokens[close].start)))
    edits.push({ start: lineStart, end: lineStart, text: `${lines}\n` });
  else
    edits.push({
      start: tokens[close].start,
      end: tokens[close].start,
      text: `\n${lines}\n${outer}`,
    });
  return edits;
}

/**
 * Set `entries` inside the top-level object member `key`, creating the
 * member when it is absent. An entry whose value is already equal is left
 * alone; a different value is replaced in place (on one line); a missing
 * entry is added before the object's closing brace, with `comment` as
 * `//` lines above the first added entry.
 * @param {string} text
 * @param {string} key
 * @param {Record<string, unknown>} entries
 * @param {SetOptions} options
 * @returns {{ text: string, changed: string[] }}
 */
export function setMembers(text, key, entries, options) {
  const tokens = tokenize(text);
  if (tokens[0]?.type !== "{")
    throw new Error("The top level must be an object");
  const at = members(tokens, 0).get(key);
  /** @type {Edit[]} */
  let edits = [];
  /** @type {string[]} */
  const changed = [];
  if (at === undefined) {
    if (Object.keys(entries).length === 0) return { text, changed };
    edits = insertInto(text, tokens, 0, [[key, entries]], options);
    changed.push(...Object.keys(entries).map((k) => `added ${k}`));
  } else {
    if (tokens[at].type !== "{") throw new Error(`"${key}" is not an object`);
    const current = members(tokens, at);
    /** @type {Array<[string, unknown]>} */
    const missing = [];
    for (const [k, value] of Object.entries(entries)) {
      const v = current.get(k);
      if (v === undefined) {
        missing.push([k, value]);
        changed.push(`added ${k}`);
        continue;
      }
      const end = valueEnd(tokens, v);
      const existing = JSON.parse(toJson(text, tokens, v, end));
      if (JSON.stringify(existing) === JSON.stringify(value)) continue;
      edits.push({
        start: tokens[v].start,
        end: tokens[end].end,
        text: JSON.stringify(value),
      });
      changed.push(`updated ${k}`);
    }
    if (missing.length)
      edits.push(...insertInto(text, tokens, at, missing, options));
  }
  let out = text;
  for (const edit of edits.sort((a, b) => b.start - a.start))
    out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
  return { text: out, changed };
}
```

- [ ] **Step 4: Write `scripts/lib/addon-install.mjs`**

```js
// @ts-check
/**
 * The add-on installer's engine. scripts/addon-sanity.mjs is its CLI and
 * scripts/check-addon-installer.mjs its tests. Zero dependencies.
 *
 * An add-on is a folder, addons/<name>/, holding:
 *   manifest.json — what to merge into the project's own files (the
 *                   Manifest typedef below)
 *   files/        — an overlay that mirrors repo paths, copied over the
 *                   top: a file already there is overwritten (the CMS
 *                   seams are designed to be)
 *
 * planInstall() decides every write before anything is written, so a
 * refusal leaves the tree untouched; applyPlan() then writes.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setMembers } from "./jsonc.mjs";

/** A refusal or bad input: the CLI prints the message and exits 1. */
export class AddonError extends Error {}

/**
 * @typedef {object} Manifest
 * @property {string} name  Shown in messages, e.g. "Sanity".
 * @property {string} marker  A repo path that exists once installed.
 * @property {Record<string, string>} [dependencies]
 * @property {Record<string, string>} [devDependencies]
 * @property {Record<string, string>} [scripts]  npm scripts.
 * @property {{ vars: Record<string, string>, comment?: string }} [wrangler]  Set in wrangler.jsonc `vars`.
 * @property {Record<string, unknown>} [tsconfig]  Set in tsconfig.json `compilerOptions`.
 * @property {string[]} [env]  Appended to .env.example unless its first `NAME=` line is already there.
 * @property {string[]} [gitignore]  Appended to .gitignore: each missing rule, with the block's comments.
 * @property {string[]} [delete]  Repo paths removed.
 * @property {string[]} [nextSteps]  Printed after installing.
 */

/** @typedef {{ path: string, content: string | Buffer, action: "add" | "overwrite" | "update" }} Write */
/** @typedef {{ manifest: Manifest, writes: Write[], deletes: string[], notes: string[] }} Plan */

/** Never copied from an overlay. */
const SKIP = new Set(["node_modules", ".DS_Store"]);
/** Merged from the manifest, so an overlay must not carry them. */
const MERGED = [
  "package.json",
  "wrangler.jsonc",
  "tsconfig.json",
  ".env.example",
  ".gitignore",
];

/**
 * Every file under `dir` as a POSIX path relative to it.
 * @param {string} dir
 * @param {string} [prefix]
 * @returns {string[]}
 */
function overlayFiles(dir, prefix = "") {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIP.has(entry.name)) return [];
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory()
      ? overlayFiles(path.join(dir, entry.name), rel)
      : [rel];
  });
}

/**
 * Refuse unless `root` is a clean git checkout.
 * @param {string} root
 */
function assertClean(root) {
  let status;
  try {
    status = execFileSync("git", ["status", "--porcelain"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new AddonError(
      "can't confirm the working tree is clean: this is not a git repository (or git is not installed). Back the project up, then run again with --force.",
    );
  }
  if (status.trim())
    throw new AddonError(
      `the working tree has uncommitted changes:\n${status
        .trimEnd()
        .split("\n")
        .slice(0, 10)
        .map((line) => `    ${line}`)
        .join(
          "\n",
        )}\n  Commit or stash them first, so \`git diff\` afterwards shows exactly what the installer changed, or run again with --force.`,
    );
}

/**
 * @param {string} current
 * @param {string[]} block
 */
const appendBlock = (current, block) =>
  current
    ? `${current.replace(/\n*$/, "\n")}\n${block.join("\n")}\n`
    : `${block.join("\n")}\n`;

/**
 * @param {{ root: string, addonDir: string, force?: boolean }} options
 * @returns {Plan}
 */
export function planInstall({ root, addonDir, force = false }) {
  const manifestPath = path.join(addonDir, "manifest.json");
  if (!fs.existsSync(manifestPath))
    throw new AddonError(
      `${path.relative(root, manifestPath)} not found. Copy the add-on folder from the starter repo (addons/<name>/) into this project, commit it, then run again.`,
    );
  /** @type {Manifest} */
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (fs.existsSync(path.join(root, manifest.marker)))
    throw new AddonError(
      `the ${manifest.name} add-on is already installed (${manifest.marker} exists). Nothing to do.`,
    );
  if (!force) assertClean(root);

  const filesDir = path.join(addonDir, "files");
  const overlay = overlayFiles(filesDir);
  const clash = overlay.find((rel) => MERGED.includes(rel));
  if (clash)
    throw new AddonError(
      `the add-on overlay must not contain ${clash}: put those changes in manifest.json.`,
    );

  const exists = (/** @type {string} */ rel) =>
    fs.existsSync(path.join(root, rel));
  const read = (/** @type {string} */ rel) => {
    if (!exists(rel)) throw new AddonError(`${rel} not found in the project.`);
    return fs.readFileSync(path.join(root, rel), "utf8");
  };
  /** @type {Write[]} */
  const writes = [];
  /** @type {string[]} */
  const notes = [];

  // 1. The overlay.
  for (const rel of overlay) {
    const content = fs.readFileSync(path.join(filesDir, rel));
    if (!exists(rel)) writes.push({ path: rel, content, action: "add" });
    else if (!fs.readFileSync(path.join(root, rel)).equals(content))
      writes.push({ path: rel, content, action: "overwrite" });
  }

  // 2. package.json: dependencies (kept sorted, as npm does) and scripts.
  if (manifest.dependencies || manifest.devDependencies || manifest.scripts) {
    const pkg = JSON.parse(read("package.json"));
    /** @type {string[]} */
    const changes = [];
    for (const field of /** @type {const} */ ([
      "dependencies",
      "devDependencies",
      "scripts",
    ])) {
      const add = manifest[field];
      if (!add) continue;
      const target = (pkg[field] ??= {});
      for (const [name, value] of Object.entries(add)) {
        if (target[name] === value) continue;
        changes.push(
          name in target ? `${name} ${target[name]} → ${value}` : name,
        );
        target[name] = value;
      }
      if (field !== "scripts")
        pkg[field] = Object.fromEntries(
          Object.entries(target).sort(([a], [b]) => a.localeCompare(b, "en")),
        );
    }
    if (changes.length) {
      writes.push({
        path: "package.json",
        content: `${JSON.stringify(pkg, null, 2)}\n`,
        action: "update",
      });
      notes.push(`package.json: ${changes.join(", ")}`);
    }
  }

  // 3. wrangler.jsonc vars and 4. tsconfig.json compilerOptions — edited in place.
  for (const [file, key, entries, options] of /** @type {const} */ ([
    [
      "wrangler.jsonc",
      "vars",
      manifest.wrangler?.vars,
      { trailingCommas: true, comment: manifest.wrangler?.comment },
    ],
    [
      "tsconfig.json",
      "compilerOptions",
      manifest.tsconfig,
      { trailingCommas: false },
    ],
  ])) {
    if (!entries) continue;
    const { text, changed } = setMembers(read(file), key, entries, options);
    if (changed.length) {
      writes.push({ path: file, content: text, action: "update" });
      notes.push(`${file} ${key}: ${changed.join(", ")}`);
    }
  }

  // 5. .env.example: the block, unless its first variable is already there.
  if (manifest.env?.length) {
    const current = exists(".env.example") ? read(".env.example") : "";
    const names = manifest.env.flatMap(
      (line) => /^([A-Z][A-Z0-9_]*)=/.exec(line)?.[1] ?? [],
    );
    if (names.length && !new RegExp(`^${names[0]}=`, "m").test(current)) {
      writes.push({
        path: ".env.example",
        content: appendBlock(current, manifest.env),
        action: current ? "update" : "add",
      });
      notes.push(`.env.example: ${names.join(", ")}`);
    }
  }

  // 6. .gitignore: the missing rules, with the block's comments.
  if (manifest.gitignore?.length) {
    const current = exists(".gitignore") ? read(".gitignore") : "";
    const have = new Set(current.split("\n").map((line) => line.trim()));
    const isRule = (/** @type {string} */ line) =>
      line.trim() !== "" && !line.trim().startsWith("#");
    const missing = manifest.gitignore.filter(
      (line) => isRule(line) && !have.has(line.trim()),
    );
    if (missing.length) {
      const block = manifest.gitignore.filter(
        (line) => !isRule(line) || !have.has(line.trim()),
      );
      writes.push({
        path: ".gitignore",
        content: appendBlock(current, block),
        action: current ? "update" : "add",
      });
      notes.push(`.gitignore: ${missing.join(", ")}`);
    }
  }

  // 7. Deletions.
  const deletes = (manifest.delete ?? []).filter(exists);

  return { manifest, writes, deletes, notes };
}

/**
 * Carry out a plan from planInstall().
 * @param {string} root
 * @param {Plan} plan
 */
export function applyPlan(root, plan) {
  for (const rel of plan.deletes)
    fs.rmSync(path.join(root, rel), { recursive: true, force: true });
  for (const write of plan.writes) {
    const abs = path.join(root, write.path);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, write.content);
  }
}
```

- [ ] **Step 5: Write the CLI, `scripts/addon-sanity.mjs`**

```js
#!/usr/bin/env node
// @ts-check
/**
 * npm run addon:sanity — installs the Sanity add-on (addons/sanity/):
 * copies its overlay over the project and merges its manifest into
 * package.json, wrangler.jsonc, tsconfig.json, .env.example and
 * .gitignore. What it adds and how to remove it: addons/sanity/README.md.
 *
 *   npm run addon:sanity                 install
 *   npm run addon:sanity -- --dry-run    list what would change; write nothing
 *   npm run addon:sanity -- --force      install on a dirty or non-git tree
 *
 * Refuses when the add-on is already installed and, without --force, when
 * the git tree has uncommitted changes (so `git diff` afterwards shows
 * exactly what changed). Zero dependencies.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AddonError, applyPlan, planInstall } from "./lib/addon-install.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const flags = new Set(process.argv.slice(2));
const dryRun = flags.has("--dry-run");

try {
  const plan = planInstall({
    root: ROOT,
    addonDir: path.join(ROOT, "addons", "sanity"),
    force: flags.has("--force"),
  });
  console.log(
    `${dryRun ? "Would install" : "Installing"} the ${plan.manifest.name} add-on:`,
  );
  for (const write of plan.writes)
    console.log(`  ${write.action.padEnd(9)} ${write.path}`);
  for (const rel of plan.deletes) console.log(`  delete    ${rel}`);
  for (const note of plan.notes) console.log(`  · ${note}`);
  if (dryRun) {
    console.log("\n(dry run) Nothing written.");
  } else {
    applyPlan(ROOT, plan);
    console.log(`\n✓ ${plan.manifest.name} add-on installed. Next:`);
    (plan.manifest.nextSteps ?? []).forEach((step, i) =>
      console.log(`  ${i + 1}. ${step}`),
    );
  }
} catch (err) {
  if (err instanceof AddonError) {
    console.error(`✗ addon:sanity: ${err.message}`);
    process.exit(1);
  }
  throw err;
}
```

- [ ] **Step 6: Run the tests to make sure they pass**

Run: `npm run check:addon-installer`
Expected: `check-addon-installer: ok`

Run: `npm run addon:sanity -- --dry-run; echo "exit=$?"`
Expected: `✗ addon:sanity: addons/sanity/manifest.json not found. Copy the add-on folder …`
and `exit=1` (the real add-on arrives in Task 6).

- [ ] **Step 7: `check-config-sync.mjs` uses the shared JSONC parser**

In `scripts/check-config-sync.mjs`, delete the local `parseJsonc`
function (with its doc comment) and add after the `node:url` import:

```js
import { parseJsonc } from "./lib/jsonc.mjs";
```

Run: `npm run check:config`
Expected: `check-config-sync-cases: ok`, then `✓ check-config-sync: …`.

- [ ] **Step 8: Gate**

Run: `npm run check && npm run check:hover && npm run check:boundary && npm run check:content && npx prettier --check scripts`
Expected: 0 errors; each OK; Prettier clean (run `npx prettier --write scripts/lib scripts/addon-sanity.mjs scripts/check-addon-installer.mjs` first if not).

Run the Files parity command. Expected: `Identical: <n> files.`
(No Sanity-side change in this task; its four commands are not needed.)

- [ ] **Step 9: Commit**

```bash
git add scripts/lib scripts/addon-sanity.mjs scripts/check-addon-installer.mjs scripts/check-config-sync.mjs package.json
git commit -m "Add the add-on installer: overlay copy plus manifest merge, JSONC kept intact

npm run addon:sanity plans every write first, refuses a second install
and a dirty or non-git tree without --force, and merges package.json,
wrangler.jsonc (comments preserved), tsconfig.json, .env.example and
.gitignore. Tested against a fixture add-on, Prettier as the oracle.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Boundary guard reads add-on rule files

**Files:**

- Modify: `scripts/check-content-boundary.mjs`
- Create: `scripts/boundary/sanity.json`
- Test: `scripts/check-boundary-rules.mjs`
- Modify: `package.json` (`check:boundary`)

**Interfaces:**

- Consumes: nothing new.
- Produces: rule-file format
  `{ "why": string, "packages": string[], "paths": string[], "allow": string[] }`
  in `scripts/boundary/<name>.json` (a trailing `*` in `packages` matches a
  prefix; a bare name matches itself and `name/…`; `paths` are repo paths
  without extension; a trailing `/` in `allow` covers a folder).
  `check-content-boundary.mjs --root <dir>`.

- [ ] **Step 1: Write the failing test**

Create `scripts/check-boundary-rules.mjs`:

```js
#!/usr/bin/env node
// @ts-check
/**
 * check-boundary-rules — proves scripts/check-content-boundary.mjs applies
 * its core rules and any add-on rule file (scripts/boundary/*.json), by
 * running it (`--root`) against fixture trees in the OS temp dir.
 *
 * Usage: node scripts/check-boundary-rules.mjs (part of npm run check:boundary)
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GUARD = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "check-content-boundary.mjs",
);
/** @type {string[]} */
const roots = [];
const RULE = {
  why: "demo add-on",
  packages: ["sanity", "@sanity/*", "sanity:*"],
  paths: ["src/sanity"],
  allow: ["src/sanity/", "src/config/cms.mjs"],
};

/**
 * @param {Record<string, string>} files
 * @param {Record<string, unknown>} [rules]  scripts/boundary/<name>.json
 */
function tree(files, rules = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "boundary-"));
  roots.push(root);
  const all = {
    ...files,
    ...Object.fromEntries(
      Object.entries(rules).map(([name, rule]) => [
        `scripts/boundary/${name}.json`,
        JSON.stringify(rule),
      ]),
    ),
  };
  for (const [rel, text] of Object.entries(all)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  }
  return root;
}
const guard = (/** @type {string} */ root) =>
  spawnSync(process.execPath, [GUARD, "--root", root], { encoding: "utf8" });
const ok = (/** @type {string} */ root) => {
  const r = guard(root);
  assert.equal(r.status, 0, r.stderr);
};
const bad = (/** @type {string} */ root, /** @type {RegExp} */ pattern) => {
  const r = guard(root);
  assert.equal(r.status, 1, `expected a violation matching ${pattern}`);
  assert.match(r.stderr, pattern);
};
const astro = (/** @type {string} */ line) => `---\n${line}\n---\n`;

// No add-on rule: a CMS import is not this guard's business (and the
// package would not even be installed).
ok(
  tree({ "src/components/A.astro": astro('import x from "@sanity/client";') }),
);

// With the add-on's rule: forbidden outside its allow list, by package…
bad(
  tree(
    {
      "src/components/A.astro": astro(
        'import { stegaClean } from "@sanity/client/stega";',
      ),
    },
    { demo: RULE },
  ),
  /src\/components\/A\.astro:2\s+@sanity\/client\/stega\s+\(demo add-on\)/,
);
bad(
  tree(
    {
      "src/components/A.astro": astro(
        'import { sanityClient } from "sanity:client";',
      ),
    },
    { demo: RULE },
  ),
  /sanity:client/,
);
bad(
  tree(
    { "src/components/A.astro": astro('import { defineType } from "sanity";') },
    { demo: RULE },
  ),
  /A\.astro:2\s+sanity\s/,
);
// …by path, through the alias or relatively…
bad(
  tree(
    {
      "src/components/A.astro": astro(
        'import { q } from "@/sanity/lib/queries";',
      ),
    },
    { demo: RULE },
  ),
  /@\/sanity\/lib\/queries/,
);
bad(
  tree(
    { "src/lib/x.ts": 'import { q } from "../sanity/lib/queries";\n' },
    { demo: RULE },
  ),
  /src\/lib\/x\.ts:1/,
);
// …and in comments (a stale doc example is a stale instruction).
bad(
  tree(
    {
      "src/components/A.astro": astro('// e.g. import x from "@sanity/client"'),
    },
    { demo: RULE },
  ),
  /@sanity\/client/,
);
// Allowed where the rule allows it; a lookalike package name is not "sanity".
ok(
  tree(
    {
      "src/sanity/lib/a.ts": 'import { createClient } from "@sanity/client";\n',
      "src/config/cms.mjs": 'import sanity from "@sanity/astro";\n',
      "src/components/B.astro": astro('import x from "sanity-like-package";'),
    },
    { demo: RULE },
  ),
);

// Core rules apply with or without add-ons: the Files backend from a page.
bad(
  tree({
    "src/pages/x.astro": astro(
      'import { getBlogCtaById } from "@/lib/content/files/ctas";',
    ),
  }),
  /the Files backend is reached through @\/lib\/content/,
);

for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
console.log("check-boundary-rules: ok");
```

In `package.json`:

```json
"check:boundary": "node scripts/check-boundary-rules.mjs && node scripts/check-content-boundary.mjs",
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node scripts/check-boundary-rules.mjs`
Expected: FAIL — the first case exits 1, because the current guard
forbids `@sanity/client` everywhere and ignores `--root` (it walks this
repo).

- [ ] **Step 3: Rewrite the guard**

Replace `scripts/check-content-boundary.mjs` with:

```js
#!/usr/bin/env node
// @ts-check
/**
 * check-content-boundary — keeps content behind the content interface.
 *
 * Pages, templates, sections and components get content ONLY from
 * `@/lib/content` (src/lib/content). Each rule names modules (repo paths
 * and/or packages) and the files allowed to import them; importing a
 * rule's module from any other file under src/ is a violation.
 *
 * Core rules (RESTRICTED below): the node-only content-sync helpers
 * (src/lib/content/markdown.ts, checks.ts — importing them from a page
 * would ship them to the Worker), and the Files backend
 * (src/lib/content/files/), reached only through @/lib/content, except by
 * the MDX body components (src/components/blog/mdx/: `<BlogCta id>` looks
 * its CTA up by id).
 *
 * Add-on rules: a content add-on that brings its own backend ships
 * scripts/boundary/<name>.json, loaded when present:
 *
 *   {
 *     "why": "…",                    printed with each violation
 *     "packages": ["@sanity/*", …],  a trailing * matches a prefix; a bare
 *                                    name matches itself and name/…
 *     "paths": ["src/sanity"],       repo paths without extension; a
 *                                    folder covers everything inside
 *     "allow": ["src/sanity/", …]    importers exempt from the rule (a
 *                                    trailing "/" covers a folder)
 *   }
 *
 * The default site (content in src/content) ships none. Comments count: a
 * doc example importing a forbidden module is a stale instruction, so it
 * fails too.
 *
 * Usage: npm run check:boundary   (`--root <dir>` checks another tree, as
 * scripts/check-boundary-rules.mjs does). Exit 1 on any violation.
 */
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const rootAt = args.indexOf("--root");
const ROOT = path.resolve(rootAt >= 0 ? args[rootAt + 1] : process.cwd());
const SRC = path.join(ROOT, "src");

/** @typedef {{ why: string, paths: string[], packages: string[], allow: string[] }} Rule */

/** @type {Rule[]} */
const RESTRICTED = [
  {
    paths: ["src/lib/content/markdown"],
    packages: [],
    allow: ["src/content.config.ts"],
    why: "node-only: rich text is rendered at content sync by src/content.config.ts",
  },
  {
    paths: ["src/lib/content/checks"],
    packages: [],
    allow: ["src/content.config.ts"],
    why: "node-only: content-sync checks that read the filesystem",
  },
  {
    paths: ["src/lib/content/files"],
    packages: [],
    allow: ["src/lib/content/", "src/components/blog/mdx/"],
    why: "the Files backend is reached through @/lib/content; only the MDX body components (src/components/blog/mdx/) read it directly",
  },
];

/** @returns {Rule[]} */
function addonRules() {
  const dir = path.join(ROOT, "scripts", "boundary");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => {
      const rule = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
      return {
        why: rule.why ?? `scripts/boundary/${file}`,
        paths: rule.paths ?? [],
        packages: rule.packages ?? [],
        allow: rule.allow ?? [],
      };
    });
}
const RULES = [...RESTRICTED, ...addonRules()];

/** @param {string} rel @param {string[]} list */
const allowedBy = (rel, list) =>
  list.some((a) => rel === a || (a.endsWith("/") && rel.startsWith(a)));

/** @param {string} spec @param {string} pattern */
const packageMatch = (spec, pattern) =>
  pattern.endsWith("*")
    ? spec.startsWith(pattern.slice(0, -1))
    : spec === pattern || spec.startsWith(`${pattern}/`);

/**
 * The repo path (no extension) a specifier points at; null for a package.
 * @param {string} spec
 * @param {string} file
 */
function targetOf(spec, file) {
  const abs = spec.startsWith("@/")
    ? path.join(SRC, spec.slice(2))
    : spec.startsWith(".")
      ? path.resolve(path.dirname(file), spec)
      : null;
  return abs
    ? path
        .relative(ROOT, abs)
        .split(path.sep)
        .join("/")
        .replace(/\.(ts|tsx|mjs|js|astro)$/, "")
    : null;
}

/** @param {Rule} rule @param {string} spec @param {string | null} to */
const hits = (rule, spec, to) =>
  to
    ? rule.paths.some((p) => to === p || to.startsWith(`${p}/`))
    : rule.packages.some((p) => packageMatch(spec, p));

const EXTENSIONS = new Set([".astro", ".ts", ".tsx", ".mjs", ".js"]);
const SPECIFIER =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|<reference\s+types=)["']([^"']+)["']/g;

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
}

/** @type {string[]} */
const violations = [];
for (const file of walk(SRC)) {
  if (!EXTENSIONS.has(path.extname(file))) continue;
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  fs.readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      for (const [, spec] of line.matchAll(SPECIFIER)) {
        const to = targetOf(spec, file);
        for (const rule of RULES)
          if (hits(rule, spec, to) && !allowedBy(rel, rule.allow))
            violations.push(`${rel}:${i + 1}  ${spec}  (${rule.why})`);
      }
    });
}

if (violations.length) {
  console.error(
    `Content boundary violations (get content from @/lib/content; rules in scripts/check-content-boundary.mjs and scripts/boundary/):\n${violations
      .map((v) => `  ${v}`)
      .join("\n")}`,
  );
  process.exit(1);
}
console.log(
  `Content boundary OK: ${RULES.length} rules (${RULES.length - RESTRICTED.length} from add-ons), no violations.`,
);
```

- [ ] **Step 4: The Sanity rule file**

Create `scripts/boundary/sanity.json` (it moves into the add-on in
Task 6; until then the repo itself needs it):

```json
{
  "why": "Sanity code stays in the Sanity add-on's own files; everything else gets content from @/lib/content",
  "packages": [
    "sanity",
    "sanity-plugin-*",
    "@sanity/*",
    "sanity:*",
    "astro-portabletext"
  ],
  "paths": ["src/sanity"],
  "allow": [
    "src/sanity/",
    "src/lib/content/source.ts",
    "src/config/cms.mjs",
    "src/config/cms.shared.mjs",
    "src/components/global/CmsEditing.astro",
    "src/components/blog/BlogBody.astro",
    "src/components/portabletext/",
    "src/components/SanityVisualEditing.tsx",
    "src/components/DisableDraftMode.tsx",
    "src/pages/preview/",
    "src/pages/api/draft-mode/",
    "src/env.d.ts"
  ]
}
```

- [ ] **Step 5: Run the tests and the real guard**

Run: `npm run check:boundary`
Expected: `check-boundary-rules: ok`, then
`Content boundary OK: 4 rules (1 from add-ons), no violations.`

- [ ] **Step 6: Gate**

Run: `npm run check && npm run check:hover && npm run check:content && npx prettier --check scripts`
Expected: 0 errors; each OK.

Run the Files parity command. Expected: `Identical: <n> files.`

- [ ] **Step 7: Commit**

```bash
git add scripts/check-content-boundary.mjs scripts/check-boundary-rules.mjs scripts/boundary package.json
git commit -m "Boundary guard: core rules plus add-on rule files in scripts/boundary/

The guard no longer knows about Sanity; the Sanity rule (forbidden
packages and paths, its allow list) is a JSON file the add-on will ship.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Move Sanity into `addons/sanity/`

Everything Sanity-only moves into the overlay, the seams get their Files
versions, the test switch goes, and the add-on gets its manifest and
README. Core still lists the Sanity packages (Task 7 removes them); the
manifest's merge is a no-op for them here, so the scratch install proves
the overlay's files are complete.

**Files:**

- Move (`git mv`): see Step 1.
- Create (core, Files versions): `src/config/cms.mjs`,
  `src/config/cms.shared.mjs`, `src/components/global/CmsEditing.astro`,
  `src/components/blog/BlogBody.astro`, `scripts/compare-dist.mjs`
- Create (add-on): `addons/sanity/manifest.json`, `addons/sanity/README.md`,
  `addons/sanity/files/src/lib/content/source.ts`,
  `addons/sanity/files/src/sanity/env.d.ts`,
  `addons/sanity/files/public/_headers`
- Modify (add-on): `addons/sanity/files/scripts/compare-dist.mjs` (row 16),
  `addons/sanity/files/scripts/boundary/sanity.json`, the three
  `addons/sanity/files/src/pages/preview/**/[slug].astro` headers,
  `addons/sanity/files/src/config/cms.mjs` and `cms.shared.mjs` headers
- Modify (core): `astro.config.mjs`, `src/env.d.ts`, `tsconfig.json`,
  `src/lib/content/source.ts`, `public/_headers`,
  `.github/workflows/ci.yml`, and comment-only edits (Step 7)

**Interfaces:**

- Consumes: the seams (Task 3), the installer and manifest schema
  (Task 4), the rule-file format (Task 5), `BlogBodyFormats` (Task 2).
- Produces: `addons/sanity/manifest.json` (fields below, used by Tasks
  7–9); the overlay layout (repo-relative paths under
  `addons/sanity/files/`); the manifest `marker`
  `src/sanity/lib/source.ts` (Task 9's "installed?" test).

> `npm run setup` reads `src/config/sanity.shared.mjs` and `sanity.cli.ts`
> for its Sanity defaults, and both leave core in this task. Setup is
> broken from here until Task 9 rewires it (CI does not run it before
> then). Don't run it in between.

- [ ] **Step 1: Move the Sanity-only files**

```bash
A=addons/sanity/files
mkdir -p $A/src/pages/api $A/src/components/global $A/src/components/blog $A/src/config $A/scripts $A/.claude/skills/setup/references $A/workers $A/public
git mv src/sanity $A/src/sanity
git mv src/pages/preview $A/src/pages/preview
git mv src/pages/api/draft-mode $A/src/pages/api/draft-mode
git mv src/components/portabletext $A/src/components/portabletext
git mv src/components/SanityVisualEditing.tsx src/components/DisableDraftMode.tsx $A/src/components/
git mv sanity.config.ts sanity.cli.ts sanity-typegen.json skills-lock.json $A/
git mv workers/rebuild-debounce $A/workers/rebuild-debounce
git mv scripts/check-stega-leaks.mjs scripts/check-fixture-markdown.mjs scripts/migrate-webflow-blog.mjs $A/scripts/
git mv scripts/boundary $A/scripts/boundary
git mv .claude/skills/sanity-and-preview $A/.claude/skills/sanity-and-preview
git mv .claude/skills/setup/references/studio-branding.md $A/.claude/skills/setup/references/
# The Sanity versions of the seams move; Step 2 writes the Files versions.
git mv src/config/cms.mjs src/config/cms.shared.mjs src/config/sanity.shared.mjs $A/src/config/
git mv src/components/global/CmsEditing.astro $A/src/components/global/
git mv src/components/blog/BlogBody.astro $A/src/components/blog/
git mv scripts/compare-dist.mjs $A/scripts/
cp public/_headers $A/public/_headers && git add $A/public/_headers
# Untracked leftovers that moved with their folders.
rm -rf $A/workers/rebuild-debounce/node_modules $A/src/sanity/schema.json
rmdir workers 2>/dev/null || true
```

Expected: `git status --short | grep -c '^R'` counts the renames (about
110); `ls src/sanity src/pages/preview 2>&1` reports both missing.

- [ ] **Step 2: The Files versions of the seams**

`src/config/cms.mjs`:

```js
// @ts-check
/**
 * CMS seam — build-time config. astro.config.mjs spreads these into its
 * integrations, image and vite settings, and never names a CMS itself.
 * With content in local files (src/content) there is nothing to add.
 *
 * A CMS add-on's installer overwrites this file wholesale (the Sanity
 * add-on: addons/sanity/). Imported only by astro.config.mjs: integration
 * packages must never reach the Worker bundle, so runtime values live in
 * cms.shared.mjs.
 */

/** @type {import("astro").AstroIntegration[]} */
export const integrations = [];

/**
 * Remote image hosts Astro may optimise.
 * @type {import("astro").RemotePattern[]}
 */
export const remotePatterns = [];

/**
 * Build-time constants (`vite.define`).
 * @type {Record<string, string>}
 */
export const viteDefine = {};

/**
 * Vite dependency pre-bundling hints.
 * @type {import("vite").DepOptimizationOptions}
 */
export const optimizeDeps = {};
```

`src/config/cms.shared.mjs`:

```js
// @ts-check
/**
 * CMS seam — runtime values, safe for the Worker bundle (no integration
 * imports). Read by src/config/headers.shared.mjs (the CSP) and
 * src/middleware.ts. With content in local files there is no editor to
 * frame the site and no draft session. A CMS add-on's installer
 * overwrites this file wholesale.
 */

/**
 * Origins allowed to frame site pages (CSP `frame-ancestors`). Empty
 * means only the site itself ('self').
 * @type {readonly string[]}
 */
export const FRAME_ANCESTORS = [];

/**
 * The cookie that marks a draft-preview session; middleware never caches
 * a response to a request that carries it. Null: no draft preview.
 * @type {string | null}
 */
export const PREVIEW_COOKIE = null;
```

`src/components/global/CmsEditing.astro`:

```astro
---
/**
 * CmsEditing — the CMS editing seam. BaseLayout renders it once, at the
 * end of `<body>`. With content in local files there is no in-page
 * editing, so it renders nothing. A CMS add-on's installer overwrites
 * this file with a version that mounts its editing tools in draft mode
 * (the Sanity add-on: the visual-editing overlay on its /preview routes).
 */

interface Props {
  /**
   * **CmsEditing** — the CMS editing seam. BaseLayout renders it once at
   * the end of `<body>`; it takes no props and renders nothing unless a
   * CMS add-on replaces it.
   */
  docs?: string;
}

const { docs } = Astro.props;
---
```

`src/components/blog/BlogBody.astro`:

```astro
---
/**
 * BlogBody — renders a blog post's body (`post.body` from `getBlogPost()`
 * in `@/lib/content`): a compiled MDX `Content` component, rendered with
 * `mdxComponents` below, so a post body can use `<Callout>`,
 * `<VideoEmbed>` and `<BlogCta id>` without importing them. Fenced code
 * renders through the `pre` override (mdx/CodeBlock.astro).
 *
 * It emits only the body markup. The caller owns the wrapping prose
 * element (`blog_post_prose u-rich-text` in BlogPostTemplate).
 *
 * This is a CMS seam: a content add-on with its own body format
 * (registered in BlogBodyFormats, src/lib/content/types.ts) overwrites
 * this file with a version that renders that format too.
 */
import Callout from "@/components/blog/Callout.astro";
import VideoEmbed from "@/components/blog/VideoEmbed.astro";
import MdxBlogCta from "@/components/blog/mdx/BlogCta.astro";
import MdxCodeBlock from "@/components/blog/mdx/CodeBlock.astro";
import type { BlogBodyContent } from "@/lib/content";

interface Props {
  /**
   * **BlogBody** — renders `post.body` (MDX) from `getBlogPost()`. It
   * emits no wrapper element; put it inside the prose container.
   */
  docs?: string;

  /** The post body from `@/lib/content` (`post.body`). */
  body: BlogBodyContent;
}

const { docs, body } = Astro.props;

/* The components an MDX body may use by tag name, without an import, and
   the `pre` override every fenced code block renders through. Keep the
   list in step with the content guide (.claude/skills/content-files). */
const mdxComponents = {
  Callout,
  VideoEmbed,
  BlogCta: MdxBlogCta,
  pre: MdxCodeBlock,
};

/* A component reference must be a capitalised identifier: Astro treats a
   lowercase tag such as `body.Content` as an HTML element. */
const { Content } = body;
---

<Content components={mdxComponents} />
```

`public/_headers` (core):

```text
# Security headers for static assets served directly by the Cloudflare
# Workers assets binding (prerendered pages, /_astro/*, images), which bypass
# the worker. SSR responses get the same list from src/middleware.ts, which
# reads src/config/headers.shared.mjs; `npm run check:config` fails when this
# file drifts from it. CSP frame-ancestors (not X-Frame-Options) lets only
# this site frame its pages; a CMS add-on widens it for its editor.
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: frame-ancestors 'self'
```

(`addons/sanity/files/public/_headers` stays byte-identical to the old
file, so the Sanity baselines still match it.)

`src/lib/content/source.ts`:

```ts
/**
 * Selects the active content backend: the Files backend (content
 * collections in src/content). Kept to ONE re-export on purpose. It is a
 * CMS seam: a CMS add-on's installer overwrites this file to point at its
 * own backend, and nothing else changes. Never import a backend from any
 * other file.
 */
export { default } from "./files";
```

- [ ] **Step 3: The core `compare-dist.mjs`, without `--equivalent`**

```bash
git show HEAD:scripts/compare-dist.mjs > scripts/compare-dist.mjs
```

Then edit `scripts/compare-dist.mjs`:

1. Header: replace the whole `--equivalent` paragraph (from
   ` * \`--equivalent\` compares two builds of the SAME content`through` * node scripts/compare-dist.mjs --equivalent .parity/sample .parity/files`and the` *` line after it) with:

```js
 * The Sanity add-on (addons/sanity/) installs its own copy of this file,
 * which adds `--equivalent`: Files and Sanity builds of the same content,
 * compared with the documented renderer differences normalised.
 *
```

2. Usage string: `[--canonical | --layers]`.
3. Delete `const equivalent = flags.includes("--equivalent");`.
4. Delete everything from `/* ── --equivalent ──` through the end of the
   `const outline = (text) => …;` statement (the `fired` counters,
   `IMAGE_URL`, `IMG_SIZING`, `BLOCK_TAGS`, `tagOf`, `isElement`,
   `isBlock`, `normStyle`, `loneImage`, `canonEq`, `canonEqScriptsLifted`,
   `styleLayerDiff`, `outline`).
5. Replace `read()`:

```js
/** Read a build file, normalised. */
function read(dir, file) {
  return normalize(fs.readFileSync(path.join(dir, file), "utf8"));
}
```

6. In the comparison loop, delete the `if (equivalent) { … }` block, and
   change `if (!equivalent && canonical && …` to `if (canonical && …` and
   `if (!equivalent && layers && …` to `if (layers && …`.
7. The summary: replace the ternary with

```js
console.log(
  failures
    ? `\n${failures} difference(s) across ${base.length} baseline files.`
    : `Identical: ${base.length} files.`,
);
```

and delete the `if (equivalent) { … Normalisations fired … }` block.

Run: `node scripts/compare-dist.mjs .parity/files .parity/files && node scripts/compare-dist.mjs --layers .parity/files .parity/files`
Expected: `Identical: <n> files.` twice.

- [ ] **Step 4: The add-on's own new and adjusted files**

`addons/sanity/files/src/lib/content/source.ts`:

```ts
/**
 * Selects the active content backend: the Sanity add-on's source
 * (src/sanity/lib/source.ts). Kept to ONE re-export on purpose. It is a
 * CMS seam the add-on installer overwrote; the Files version re-exports
 * ./files. Never import a backend from any other file.
 */
export { default } from "@/sanity/lib/source";
```

`addons/sanity/files/src/sanity/env.d.ts`:

```ts
/// <reference types="@sanity/astro/module" />

// Build-time constant, replaced by `vite.define` (viteDefine in
// src/config/cms.mjs) from process.env.PARITY_FIXTURES ("" in a normal
// build). Read only by src/sanity/lib/load-query.ts, page-data.ts and
// fixtures/index.ts to switch on the parity fixtures.
declare const __PARITY_FIXTURES__: string;
```

`addons/sanity/files/scripts/boundary/sanity.json`: delete the
`"src/env.d.ts"` entry (the add-on's `env.d.ts` is under `src/sanity/`).

`addons/sanity/files/src/config/cms.mjs` and `cms.shared.mjs`: in each
header, replace "This is the Sanity add-on's version. The Files version
… overwrites one with the other." with "The Sanity add-on's version,
installed over the Files one by `npm run addon:sanity`."

The three `addons/sanity/files/src/pages/preview/**/[slug].astro`: replace
the paragraph that begins ` * Draft preview is a Sanity feature, so this
twin reads the Sanity source` and ends `the Sanity add-on.` with:

```astro
* Part of the Sanity add-on, so the Sanity source is also the active *
@/lib/content source and the shared template's plainText() strips * stega.
```

`addons/sanity/files/scripts/compare-dist.mjs` — add row 16:

1. In the header's `--equivalent` paragraph, after "llms-full.txt bodies
   (only its outline — headings, URL:, Client: and index lines — is
   compared)," insert "`_headers` (row 16: its CSP frame-ancestors differ
   by source — the Studio's origins against 'self' — and check:config
   guards the rest),".
2. Add `"_headers skipped (frame-ancestors differ by source)": 0,` to
   `fired`.
3. As the first statement inside the loop's `if (equivalent) {`:

```js
    if (file === "_headers") {
      // Row 16: the CSP frame-ancestors differ by content source; the rest
      // is the one SECURITY_HEADERS list, which check:config guards.
      if (a !== b) fired["_headers skipped (frame-ancestors differ by source)"]++;
      continue;
    }
```

- [ ] **Step 5: The manifest**

Create `addons/sanity/manifest.json`. The dependency versions are exactly
the ones in `package.json` now (Task 7 removes them from core):

```json
{
  "name": "Sanity",
  "marker": "src/sanity/lib/source.ts",
  "dependencies": {
    "@astrojs/react": "^6.0.5",
    "@sanity/astro": "^3.5.1",
    "@sanity/client": "^7.22.1",
    "@sanity/code-input": "^7.1.2",
    "@sanity/icons": "^3.7.4",
    "@sanity/image-url": "^2.1.1",
    "@sanity/preview-url-secret": "^4.0.7",
    "@sanity/vision": "^6.8.0",
    "@sanity/visual-editing": "^5.4.3",
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "astro-portabletext": "^0.13.0",
    "react": "^19.2.7",
    "react-dom": "^19.2.7",
    "sanity": "^6.8.0",
    "sanity-plugin-media": "^4.3.1",
    "styled-components": "^6.4.2"
  },
  "devDependencies": {
    "csv-parse": "^6.2.1"
  },
  "scripts": {
    "studio": "sanity dev",
    "studio:local": "SANITY_STUDIO_PREVIEW_URL=http://localhost:4321 sanity dev",
    "typegen": "sanity schema extract --path ./src/sanity/schema.json --force && sanity typegen generate",
    "check:fixtures": "node scripts/check-fixture-markdown.mjs",
    "check:stega": "node scripts/check-stega-leaks.mjs"
  },
  "wrangler": {
    "comment": "Sanity add-on: the project id and dataset (src/config/sanity.shared.mjs;\nnpm run check:config keeps these in step). SANITY_API_READ_TOKEN is an\nENCRYPTED secret, never a var.",
    "vars": {
      "PUBLIC_SANITY_PROJECT_ID": "your-sanity-project-id",
      "PUBLIC_SANITY_DATASET": "production"
    }
  },
  "tsconfig": {
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "types": ["@sanity/astro/module"]
  },
  "env": [
    "# Sanity add-on — public config (also set in wrangler.jsonc `vars`).",
    "# Mirrors src/config/sanity.shared.mjs. src/config/cms.mjs falls back to",
    "# that module for CI (Cloudflare Workers Builds has no .env at config",
    "# load), so a build still succeeds if these are blank — but set them locally.",
    "PUBLIC_SANITY_PROJECT_ID=",
    "PUBLIC_SANITY_DATASET=production",
    "",
    "# Sanity Viewer token — required in every environment. Used by",
    "# /api/draft-mode/enable to validate Presentation preview URLs, and by",
    "# loadQuery when the sanity-preview-perspective cookie is set. Public",
    "# visitors never trigger token use (the cookie is only set via the",
    "# authenticated Studio → Presentation flow). Store as an encrypted",
    "# Cloudflare secret — never a plain wrangler var. Generate at",
    "# https://www.sanity.io/manage → API → Tokens with the Viewer role.",
    "SANITY_API_READ_TOKEN="
  ],
  "gitignore": [
    "# Sanity add-on: the CLI's runtime cache, TypeGen's intermediate schema",
    "# dump (regenerated by `npm run typegen`; the committed output is",
    "# src/sanity/sanity.types.ts), and its skill (.claude/skills/* is",
    "# ignored except the skills the repo commits).",
    ".sanity/",
    "src/sanity/schema.json",
    "!.claude/skills/sanity-and-preview"
  ],
  "delete": [],
  "nextSteps": [
    "npm install — the add-on's packages (Sanity, React).",
    "npm run check && npm run build — the placeholder project id builds an empty site, by design.",
    "Set up the Sanity project, Studio, Viewer token, CORS and publish webhook: the /setup skill's Sanity branch (.claude/skills/setup/references/sanity.md). Run `npm run typegen` once the schema is deployed.",
    "Commit the install as its own commit: reverting it removes the add-on (the sanity-and-preview skill → \"Removing the add-on\")."
  ]
}
```

- [ ] **Step 6: Core config — the switch goes, types and env shrink**

`astro.config.mjs`:

1. Delete `import { normalizePath } from "vite";`.
2. Replace the sitemap NOTE comment block with:

```js
/**
 * NOTE: the sitemap deliberately has NO `customPages` option. A
 * customPages list is only ever needed for SSR routes (which are invisible
 * to `@astrojs/sitemap`), and every content route here is PRERENDERED via
 * `getStaticPaths` (helpers from @/lib/content) — the sitemap enumerates
 * them automatically from the route table. When adding a new content type,
 * add a getStaticPaths helper, never a customPages list.
 */
```

3. Delete the whole test-only switch: the `TEST-ONLY content-source switch`
   comment, `CONTENT_SOURCES` and `contentSourceSwitch()`.
4. Replace the comment above `output: "static",` with:

```js
// Static by default — INCLUDING the content routes (blog, case studies,
// projects), which enumerate their slugs with `getStaticPaths` (helpers
// from @/lib/content) and ship as prerendered HTML at zero Worker CPU.
// Only `src/pages/api/**` opts into SSR (`export const prerender =
// false;`), plus any draft-preview routes a CMS add-on brings.
```

5. In the adapter's `imageService` comment, replace "any <Image> on the
   /preview draft-preview routes would otherwise fail to render." with
   "any <Image> on an SSR route would otherwise fail to render."
6. In `vite`, delete the line `plugins: [contentSourceSwitch()],`.

`src/env.d.ts`: delete `/// <reference types="@sanity/astro/module" />`
and the `__PARITY_FIXTURES__` comment and declaration (both now live in
the add-on's `src/sanity/env.d.ts`).

`tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "workers", "addons"],
  "compilerOptions": {
    "types": [],
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

(`workers` stays excluded: the add-on puts its Worker there. `types: []`
keeps the ambient set as it was minus `@sanity/astro/module`.)

`.github/workflows/ci.yml`: delete the header's last sentence ("A
second, test-only build compiles the Sanity source until PR 4 moves it
into the add-on, whose own CI job replaces that step."), and the two
comment lines and the `- run: CONTENT_SOURCE=sanity npm run build` step
at the end of `checks`.

- [ ] **Step 7: Core comments that named moved files**

Each edit is comment text only (no rendered output changes). Before → after:

- `src/content.config.ts:44`: "which the Sanity schema reads too" →
  "which the Sanity add-on's schema reads too".
- `src/content.config.ts:431-432`: "Sanity blocks
  (src/sanity/schemaTypes/caseStudy.ts)" → "Sanity add-on's blocks (its
  src/sanity/schemaTypes/caseStudy.ts)".
- `src/config/projects.ts:2-3`: "read by the Sanity schema AND the site" →
  "read by the site AND the Sanity add-on's schema".
- `src/config/blog.ts:3`: "the Sanity schema (src/sanity/schemaTypes/)" →
  "the Sanity add-on's schema (its src/sanity/schemaTypes/)".
- `src/config/case-studies.ts:3-4`: "the Sanity schema
  (src/sanity/schemaTypes/caseStudy.ts)" → "the Sanity add-on's schema
  (its src/sanity/schemaTypes/caseStudy.ts)".
- `src/config/logo-paths.ts:9`: "Sanity Studio navbar logo
  ([src/sanity/components/StudioLogo.tsx])" → "Sanity add-on's Studio
  navbar logo (its src/sanity/components/StudioLogo.tsx)".
- `src/components/sections/ContentCtaSection.astro:18-20`: "The Sanity
  source hands … see src/sanity/lib/map/cta.ts." → "The Sanity add-on's
  source hands … see its src/sanity/lib/map/cta.ts."
- `src/components/blog/Callout.astro:6-7`: "and a Portable Text `callout`
  node renders through src/components/portabletext/Callout.astro" → "and,
  with the Sanity add-on, a Portable Text `callout` node renders through
  its src/components/portabletext/Callout.astro".
- `src/components/blog/VideoEmbed.astro:6-7`: "and a Portable Text
  `videoEmbed` node renders through
  src/components/portabletext/VideoEmbed.astro" → "and, with the Sanity
  add-on, a Portable Text `videoEmbed` node renders through its
  src/components/portabletext/VideoEmbed.astro".
- `src/components/blog/mdx/BlogCta.astro:10-11`: "a Portable Text body uses
  src/components/portabletext/BlogCtaInline.astro" → "a Portable Text body
  (Sanity add-on) uses its src/components/portabletext/BlogCtaInline.astro".
- `src/components/blog/BlogCta.astro:11-12`: "or an inline CTA from a
  Portable Text body (BlogCtaInline maps it)" → "or an inline CTA from a
  post body (MDX `<BlogCta id>`, or the Sanity add-on's BlogCtaInline)".
- `src/lib/blog-categories.ts:2-3`: "(the category archive's
  getStaticPaths in src/sanity/lib/page-data.ts)" → "(each backend's
  category-archive getStaticPaths)".
- `src/lib/projects.ts:2-3`: "shared by the content source
  (src/sanity/lib/map/projects.ts) and the project pages" → "shared by the
  content sources and the project pages".
- `src/lib/jsonld.ts:270-271`: "Draft-mode values arrive stega-encoded
  (see the policy in src/sanity/lib/source.ts)." → "Draft-mode values from
  a CMS preview may carry invisible markers (the Sanity add-on's stega)."
- `src/pages/blog/[slug].astro:7-8`: "Draft preview does NOT happen here —
  Sanity's Presentation tool loads the SSR twin at /preview/blog/[slug]" →
  "Draft preview does NOT happen here. With the Sanity add-on, its
  Presentation tool loads the SSR twin at /preview/blog/[slug]".
- `src/pages/blog/index.astro:3-4` and
  `src/pages/case-studies/index.astro:3-4`: "a Sanity publish triggers a
  rebuild via the rebuild-debounce Worker webhook" → "with the Sanity
  add-on, a publish triggers a rebuild via its rebuild-debounce Worker".

Where the new wording makes a line longer than 80 columns, re-wrap the
comment paragraph by hand (Prettier does not re-wrap comments).

Run: `grep -rnE "src/sanity/|src/components/portabletext/|SanityVisualEditing|CONTENT_SOURCE|workers/rebuild-debounce" src astro.config.mjs scripts`
Expected: every remaining hit is on a line (or in a comment) that also
says "Sanity add-on" or "its", or is in `src/lib/toc.ts`'s header (Task 2
wording). No hit in `scripts/`.

- [ ] **Step 8: The add-on README**

Create `addons/sanity/README.md`:

```md
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
  `scripts/compare-dist.mjs` with `--equivalent`,
  `scripts/migrate-webflow-blog.mjs`, and the boundary rule
  `scripts/boundary/sanity.json`.
- **Docs:** the `sanity-and-preview` skill and the Studio-branding
  reference for `/setup`.
- **Merged into your files** (from `manifest.json`): the Sanity and React
  packages and the `studio`, `studio:local`, `typegen`, `check:fixtures`
  and `check:stega` scripts in `package.json`; the
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
   the starter repo into the project.
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
`npm install` removes it. The installed `sanity-and-preview` skill
("Removing the add-on") lists the files by hand for a project that
didn't keep that commit.

## Maintaining it (in the starter repo)

The overlay in `files/` is not built or type-checked in place
(`tsconfig.json` excludes `addons/`). `node scripts/check-addon-sanity.mjs`
installs it into a scratch copy of the repo and runs the checks and
builds there; `--keep` leaves the copy for working in. Edit there, run
`npm run typegen` there after a schema or query change, and copy the
changed files back under `files/`. CI runs the same script on every PR.
```

- [ ] **Step 9: Verify core**

Run: `grep -in sanity astro.config.mjs src/layouts/BaseLayout.astro src/middleware.ts`
Expected: no output.

Run: `npm run check 2>&1 | tee /tmp/check.log | tail -3; grep -c "addons/" /tmp/check.log`
Expected: 0 errors; `0` (nothing under `addons/` is checked). If it
reports `Cannot find name 'process'` (or another Node global) in a core
file, set `"types": ["node"]` in `tsconfig.json` and change the
manifest's `tsconfig.types` to `["node", "@sanity/astro/module"]`, then
rerun.

Run: `npm run check:hover && npm run check:boundary && npm run check:config && npm run check:content && npm run format:check`
Expected: each OK; `Content boundary OK: 3 rules (0 from add-ons), no violations.`;
check-config-sync reports `wrangler.jsonc vars (0)` (the vars are still
there, and allowed).

Run: `KEEP_DEV_PAGES=1 npm run build && npm run check:content-build && node scripts/compare-dist.mjs .parity/files dist/client`
Expected: one difference, `DIFF     _headers` (the comment and the CSP
line). Read it, then re-baseline that file only:

```bash
cp dist/client/_headers .parity/files/_headers
node scripts/compare-dist.mjs .parity/files dist/client
```

Expected: `Identical: <n> files.` If any HTML file differs, it is a
regression (or a style reorder: run `--layers`, and re-baseline only if
it passes and every DIFF is read).

- [ ] **Step 10: Verify the overlay is complete**

Run the Scratch-install procedure.
Expected: as listed under it. (The packages are still in core here, so
`npm install` changes nothing; this run proves the overlay's files.)

- [ ] **Step 11: Commit**

```bash
git add -A
git status --short   # review: renames into addons/sanity/files, the new seams, and the edits above only
git commit -m "Move Sanity into addons/sanity/; Files versions of every CMS seam

src/sanity, the preview twins, draft-mode routes, Portable Text
components, React islands, Studio config, rebuild-debounce Worker,
Sanity-only scripts and skills move into the add-on overlay with
history. Core gets the Files seams (no integrations, frame-ancestors
'self', CmsEditing renders nothing, BlogBody renders MDX), loses the
CONTENT_SOURCE test switch, and compare-dist drops --equivalent (the
add-on's copy keeps it). .parity/files/_headers re-baselined.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Sanity and React leave core's config

The packages, scripts, wrangler vars, env block and ignore rules move to
the manifest only. After this task the scratch install proves the
manifest is complete, not just the overlay.

**Files:**

- Modify: `package.json`, `package-lock.json`, `wrangler.jsonc`,
  `.env.example`, `.gitignore`, `.github/workflows/ci.yml` (the `audit`
  job comment and, if measured, its level)

**Interfaces:**

- Consumes: `addons/sanity/manifest.json` (Task 6) — its `dependencies`,
  `devDependencies`, `scripts`, `wrangler.vars`, `env` and `gitignore`
  are exactly what this task removes from core.
- Produces: a core `package.json` with no Sanity or React package and no
  `studio`, `studio:local` or `typegen` script; `wrangler.jsonc` with
  `"vars": {}`.

- [ ] **Step 1: Write the failing check**

Run:

```bash
node --input-type=module -e '
import fs from "node:fs";
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const m = JSON.parse(fs.readFileSync("addons/sanity/manifest.json", "utf8"));
const left = [
  ...Object.keys(m.dependencies).filter((d) => d in (pkg.dependencies ?? {})),
  ...Object.keys(m.devDependencies).filter((d) => d in (pkg.devDependencies ?? {})),
  ...Object.keys(m.scripts).filter((s) => s in pkg.scripts),
];
if (left.length) { console.error("still in core:", left.join(", ")); process.exit(1); }
console.log("core package.json is Sanity-free");'
```

Expected: FAIL — `still in core: @astrojs/react, @sanity/astro, …,
studio, studio:local, typegen`. (`check:fixtures` and `check:stega` were
never in core.)

- [ ] **Step 2: Remove them from `package.json`**

Delete from `dependencies`: `@astrojs/react`, `@sanity/astro`,
`@sanity/client`, `@sanity/code-input`, `@sanity/icons`,
`@sanity/image-url`, `@sanity/preview-url-secret`, `@sanity/vision`,
`@sanity/visual-editing`, `@types/react`, `@types/react-dom`,
`astro-portabletext`, `react`, `react-dom`, `sanity`,
`sanity-plugin-media`, `styled-components`. From `devDependencies`:
`csv-parse`. From `scripts`: `studio`, `studio:local`, `typegen`.

Run: `npm install --no-audit --no-fund`
Expected: the lockfile shrinks; `npm ls react react-dom sanity @sanity/client @astrojs/react astro-portabletext`
prints `└── (empty)`.

Rerun the Step 1 command. Expected: `core package.json is Sanity-free`.

Run (the merge reproduces PR 3's package set):

```bash
git show 01c2890:package.json > /tmp/pr3-package.json
node --input-type=module -e '
import fs from "node:fs";
import assert from "node:assert/strict";
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const [pr3, core, m] = [read("/tmp/pr3-package.json"), read("package.json"), read("addons/sanity/manifest.json")];
assert.deepEqual({ ...core.dependencies, ...m.dependencies }, pr3.dependencies);
const { yaml, ...devWithoutYaml } = core.devDependencies;
assert.deepEqual({ ...devWithoutYaml, ...m.devDependencies }, pr3.devDependencies);
for (const s of ["studio", "studio:local", "typegen"]) assert.equal(m.scripts[s], pr3.scripts[s]);
console.log("core + manifest = PR 3 packages (plus yaml)");'
```

Expected: `core + manifest = PR 3 packages (plus yaml)`.

- [ ] **Step 3: `wrangler.jsonc`**

In the header comment, replace "so the only SSR surface is /api/* and
the editor-only /preview tree." with "so the only SSR surface is /api/*
(plus a CMS add-on's editor-only preview routes)."

Replace the vars comment and block (from `// Public, non-secret runtime
vars. Draft-mode perspective…` through the closing `},` of `"vars"`):

```jsonc
  // Public, non-secret runtime vars. None by default; a content add-on
  // adds its own, and `npm run check:config` keeps them in step with its
  // src/config/*.shared.mjs. Secrets are ENCRYPTED Cloudflare secrets
  // (dashboard or `wrangler secret put`), never vars.
  //
  // GHL lead pipeline: GHL_API_TOKEN and GHL_LOCATION_ID are ENCRYPTED
  // secrets, never vars. The Client tools gate needs EITHER
  // CF_ACCESS_TEAM_DOMAIN + CF_ACCESS_AUD (Cloudflare Access) OR the
  // encrypted secret TOOLS_PASSWORD (shared password) — set them in the
  // dashboard, or add the Access pair here per fork. See docs/ghl-forms.md.
  "vars": {},
```

- [ ] **Step 4: `.env.example`**

Replace the top banner (the first eight lines) with:

```bash
# ─────────────────────────────────────────────────────────────────────────
# Non-secret site identity (name, URL, email, phone, socials) is
# centralized in src/config/site.ts — edit that first when re-skinning. The
# values below are the deploy-time/build-time env inputs only. Secrets are
# Cloudflare ENCRYPTED secrets in production, never plain wrangler `vars`.
# ─────────────────────────────────────────────────────────────────────────
```

Delete the Sanity block: from `# Sanity CMS — public config` through
`SANITY_API_READ_TOKEN=` and the blank line after it (the manifest's
`env` lines carry it now).

- [ ] **Step 5: `.gitignore`**

Delete these lines (the manifest's `gitignore` block carries them):

```text
# sanity cli runtime cache
.sanity/

# TypeGen's intermediate schema dump. Regenerated by `npm run typegen`; the
# committed output is src/sanity/sanity.types.ts.
src/sanity/schema.json

```

and `!.claude/skills/sanity-and-preview`. Change
`# sanity skills install — sources are managed by skills-lock.json` to
`# agent skills installed from skills-lock.json (the Sanity add-on ships one)`.

- [ ] **Step 6: Measure the audit gate**

Run: `npm audit --omit=dev --audit-level=high; echo "exit=$?"`

If `exit=0`: in `.github/workflows/ci.yml`, change the `audit` job's
`--audit-level=critical` to `--audit-level=high` and replace its comment
with:

```yaml
# Fails on any high or critical advisory in production dependencies. The
# Sanity CLI's dependency chain, which carried the standing highs, is in
# the Sanity add-on now; its own workflow keeps the critical gate.
# This gate is about the deployed runtime, so it always runs with
# `--omit=dev`. Review any NEW advisory on its merits.
```

If `exit` is non-zero: keep `critical`, and replace the comment's first
paragraph with one naming the packages `npm audit` lists (the Sanity CLI
chain is no longer one of them), keeping the "deployed runtime" and
"tighten back" sentences.

- [ ] **Step 7: Gate**

Run: `npm run check && npm run check:hover && npm run check:boundary && npm run check:config && npm run check:content && npm run format:check`
Expected: 0 errors; each OK.

Run: `KEEP_DEV_PAGES=1 npm run build && npm run check:content-build && node scripts/compare-dist.mjs .parity/files dist/client`
Expected: `Identical: <n> files.` (No React or Sanity integration has been
registered since Task 6, so removing the packages changes no output. A
style reorder needs `--layers` and the ruling.)

Run the Scratch-install procedure.
Expected: as listed. `npm install` now adds the add-on's packages; the
pinned lockfile resolves them to PR 3's versions.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json wrangler.jsonc .env.example .gitignore .github/workflows/ci.yml
git commit -m "Remove Sanity and React from core packages, vars, env and ignores

They live in addons/sanity/manifest.json; the scratch install reproduces
PR 3's package set and Sanity builds. Audit gate re-measured.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The add-on check, and CI

Automate the Scratch-install procedure, give `check:schema` a built-site
mode, and restructure CI: the Files gate adds `check:hover` and
`check:schema`; a second job proves the add-on; the overlay carries the
workflow a Sanity site runs.

**Files:**

- Create: `scripts/lib/scratch.mjs`, `scripts/check-addon-sanity.mjs`,
  `addons/sanity/files/.github/workflows/ci.yml`
- Modify: `scripts/check-schema.mjs` (`--dist`), `.github/workflows/ci.yml`,
  `package.json` (`check:addon`)

**Interfaces:**

- Consumes: `npm run addon:sanity` (Task 4), the manifest (Task 6),
  `parseJsonc` (Task 4), the overlay's `compare-dist --equivalent`,
  `check-stega-leaks.mjs` and `check-fixture-markdown.mjs` (Task 6).
- Produces:
  - `scripts/lib/scratch.mjs`: `scratchCopy(from: string): string` (a
    committed temp copy of the working tree),
    `git(cwd: string, ...args: string[]): string`
  - `node scripts/check-addon-sanity.mjs [--baselines <dir>] [--lockfile <path>] [--keep]`
  - `node scripts/check-schema.mjs --dist <dir>`

- [ ] **Step 1: Write the failing checks**

Run: `KEEP_DEV_PAGES=1 npm run build && node scripts/check-schema.mjs --dist dist/client`
Expected: FAIL — `✗ fetch failed: … is the dev server running?` on every
page (`--dist` is not implemented, so it fetches localhost).

Run: `node scripts/check-addon-sanity.mjs`
Expected: FAIL — `Cannot find module …/scripts/check-addon-sanity.mjs`.

- [ ] **Step 2: `check-schema.mjs --dist`**

After the `BASE` constant add:

```js
// --dist <dir>: read the built pages (<dir>/<path>/index.html) instead of
// fetching a server, e.g. `npm run check:schema -- --dist dist/client`.
const distIdx = args.indexOf("--dist");
const DIST = distIdx >= 0 ? args[distIdx + 1] : null;
```

Replace the loop's `const url = …` line, the `console.log` after it and
the whole `let html; try { … } catch { … }` block with:

```js
  const where = DIST
    ? path.join(DIST, pagePath, "index.html")
    : `${BASE}${pagePath}`;
  console.log(`\n${c("bold", c("cyan", `→ ${where}`))}`);

  let html;
  try {
    if (DIST) {
      html = fs.readFileSync(where, "utf8");
    } else {
      const res = await fetch(where);
      if (!res.ok) {
        console.log(c("red", `  ✗ fetch failed: HTTP ${res.status}`));
        pageFailures++;
        continue;
      }
      html = await res.text();
    }
  } catch (err) {
    console.log(
      c(
        "red",
        DIST
          ? `  ✗ not built: ${err.message}`
          : `  ✗ fetch failed: ${err.message} — is the dev server running?`,
      ),
    );
    pageFailures++;
    continue;
  }
```

In the header's usage, add:

```js
 * Or check a build without a server:
 *   npm run build && node scripts/check-schema.mjs --dist dist/client
```

Run: `node scripts/check-schema.mjs --dist dist/client`
Expected: `✓ all pages passed schema checks` (four pages: `/`,
`/contact`, the first sample post and the first published case study).

- [ ] **Step 3: `scripts/lib/scratch.mjs`**

```js
// @ts-check
/**
 * Scratch copies of this repo for end-to-end checks (check-addon-sanity.mjs,
 * check-setup.mjs): the working tree as git sees it — tracked files plus
 * untracked ones that aren't ignored, uncommitted edits included —
 * committed in a fresh repository, so tools that insist on a clean tree
 * (the add-on installer) run unforced. node_modules, dist and .parity are
 * ignored, so they are not copied. Zero dependencies.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * git with a throwaway identity (CI runners have none).
 * @param {string} cwd
 * @param {...string} args
 */
export function git(cwd, ...args) {
  return execFileSync(
    "git",
    [
      "-c",
      "user.name=scratch",
      "-c",
      "user.email=scratch@example.invalid",
      ...args,
    ],
    {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    },
  );
}

/**
 * Copy the repo at `from` into a new temp dir and commit it there.
 * @param {string} from
 * @returns {string} the copy's root
 */
export function scratchCopy(from) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "starter-scratch-"));
  const files = git(
    from,
    "ls-files",
    "-z",
    "--cached",
    "--others",
    "--exclude-standard",
  )
    .split("\0")
    .filter(Boolean);
  for (const rel of files) {
    const source = path.join(from, rel);
    if (!fs.existsSync(source) || !fs.lstatSync(source).isFile()) continue; // deleted in the working tree
    const target = path.join(dir, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "scratch copy");
  return dir;
}
```

- [ ] **Step 4: `scripts/check-addon-sanity.mjs`**

```js
#!/usr/bin/env node
// @ts-check
/**
 * check-addon-sanity — proves the Sanity add-on (addons/sanity/) installs
 * into this starter and works. In a scratch copy of the repo
 * (scripts/lib/scratch.mjs) it:
 *
 *   1. npm ci, then builds the Files site: the reference for step 5
 *   2. runs `npm run addon:sanity`; a second run must refuse
 *   3. checks the merge: package.json and wrangler.jsonc vars are exactly
 *      the starter's plus addons/sanity/manifest.json
 *   4. npm install, then check, check:hover, check:boundary, check:config
 *      and format:check
 *   5. builds the placeholder project (an empty site), then
 *      PARITY_FIXTURES=sample, which must be equivalent to step 1
 *      (compare-dist --equivalent) and pass check:schema
 *   6. builds PARITY_FIXTURES=1 (the edge fixtures) and
 *      PARITY_FIXTURES=preview + check-stega-leaks; runs
 *      check-fixture-markdown
 *
 * Every build sets KEEP_DEV_PAGES=1, so /components is covered.
 *
 *   --baselines <dir>  also compare exactly: Files vs <dir>/files, the
 *                      placeholder build vs <dir>/empty, sample vs
 *                      <dir>/sample, PARITY_FIXTURES=1 vs <dir>/fixtures
 *   --lockfile <path>  use this package-lock.json for the install after
 *                      the add-on (pins its packages, e.g. to the
 *                      resolution the baselines were built with)
 *   --keep             keep the scratch copy (path printed at the end)
 *
 * A project without addons/sanity/ (a fork that deleted it) has nothing to
 * check: exit 0. Needs the network (npm). CI: the `addon-sanity` job.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseJsonc } from "./lib/jsonc.mjs";
import { scratchCopy } from "./lib/scratch.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (/** @type {string} */ name) => {
  const i = args.indexOf(name);
  return i >= 0 ? path.resolve(args[i + 1]) : null;
};
const BASELINES = option("--baselines");
const LOCKFILE = option("--lockfile");
const KEEP = args.includes("--keep");

if (!fs.existsSync(path.join(REPO, "addons", "sanity", "manifest.json"))) {
  console.log(
    "check-addon-sanity: no addons/sanity/ in this project, nothing to check.",
  );
  process.exit(0);
}

const dir = scratchCopy(REPO);
const refs = fs.mkdtempSync(path.join(os.tmpdir(), "addon-refs-"));
console.log(`Scratch copy: ${dir}`);

/** @param {string} message */
function fail(message) {
  console.error(
    `\n✗ check-addon-sanity: ${message}\n  Scratch copy kept: ${dir}`,
  );
  process.exit(1);
}
/**
 * Run a command in the scratch copy; fail on a non-zero exit.
 * @param {string} cmd
 * @param {string[]} cmdArgs
 * @param {Record<string, string>} [env]
 */
function run(cmd, cmdArgs, env = {}) {
  const prefix = Object.entries(env)
    .map(([k, v]) => `${k}=${v} `)
    .join("");
  console.log(`\n$ ${prefix}${cmd} ${cmdArgs.join(" ")}`);
  const r = spawnSync(cmd, cmdArgs, {
    cwd: dir,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (r.status !== 0)
    fail(`${prefix}${cmd} ${cmdArgs.join(" ")} exited ${r.status}`);
}
const read = (/** @type {string} */ rel) =>
  fs.readFileSync(path.join(dir, rel), "utf8");
const DIST = path.join(dir, "dist", "client");
const build = (/** @type {Record<string, string>} */ env = {}) =>
  run("npm", ["run", "build"], { KEEP_DEV_PAGES: "1", ...env });
/** Exact comparison against a baseline, when --baselines is given. */
const againstBaseline = (/** @type {string} */ name) => {
  if (BASELINES)
    run("node", ["scripts/compare-dist.mjs", path.join(BASELINES, name), DIST]);
};

try {
  // 1. The Files site, before the add-on.
  run("npm", ["ci", "--no-audit", "--no-fund"]);
  build();
  againstBaseline("files");
  const filesRef = path.join(refs, "files");
  fs.cpSync(DIST, filesRef, { recursive: true });

  // 2. Install; a second run must refuse.
  const pkgBefore = JSON.parse(read("package.json"));
  const varsBefore = parseJsonc(read("wrangler.jsonc")).vars ?? {};
  run("npm", ["run", "addon:sanity"]);
  const again = spawnSync("npm", ["run", "addon:sanity"], {
    cwd: dir,
    encoding: "utf8",
  });
  if (
    again.status === 0 ||
    !/already installed/.test(`${again.stdout}${again.stderr}`)
  )
    fail("a second `npm run addon:sanity` did not refuse");

  // 3. The merge is exactly the starter's files plus the manifest.
  const manifest = JSON.parse(read("addons/sanity/manifest.json"));
  const pkg = JSON.parse(read("package.json"));
  for (const field of ["dependencies", "devDependencies", "scripts"])
    assert.deepEqual(
      pkg[field],
      { ...pkgBefore[field], ...manifest[field] },
      `package.json ${field}`,
    );
  assert.deepEqual(
    parseJsonc(read("wrangler.jsonc")).vars,
    { ...varsBefore, ...manifest.wrangler.vars },
    "wrangler.jsonc vars",
  );

  // 4. Packages, then the static checks.
  if (LOCKFILE) fs.copyFileSync(LOCKFILE, path.join(dir, "package-lock.json"));
  run("npm", ["install", "--no-audit", "--no-fund"]);
  for (const script of [
    "check",
    "check:hover",
    "check:boundary",
    "check:config",
    "format:check",
  ])
    run("npm", ["run", script]);

  // 5. The placeholder project, then the sample content from both sources.
  build();
  againstBaseline("empty");
  build({ PARITY_FIXTURES: "sample" });
  againstBaseline("sample");
  run("node", ["scripts/compare-dist.mjs", "--equivalent", DIST, filesRef]);
  run("node", ["scripts/check-schema.mjs", "--dist", DIST]);

  // 6. Edge fixtures, preview safety, the fixture converter.
  build({ PARITY_FIXTURES: "1" });
  againstBaseline("fixtures");
  build({ PARITY_FIXTURES: "preview" });
  run("node", ["scripts/check-stega-leaks.mjs", DIST]);
  run("node", ["scripts/check-fixture-markdown.mjs"]);
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}

console.log(
  "\n✓ check-addon-sanity: the Sanity add-on installs, type-checks and builds, and renders the sample content like the Files site.",
);
fs.rmSync(refs, { recursive: true, force: true });
if (KEEP) console.log(`Scratch copy kept: ${dir}`);
else fs.rmSync(dir, { recursive: true, force: true });
```

Add to `package.json` `scripts`: `"check:addon": "node scripts/check-addon-sanity.mjs",`

- [ ] **Step 5: The workflows**

Replace `.github/workflows/ci.yml` (keep the `on`, `concurrency` and
`audit` blocks exactly as Task 7 left them):

```yaml
# Checks-only CI — deploys are handled by Cloudflare Workers Builds, not
# Actions.
#
#   checks        the site as it ships: content from src/content (Files).
#   addon-sanity  installs the Sanity add-on (addons/sanity/) into a
#                 scratch copy and proves it type-checks, builds, and
#                 renders the sample content like the Files site
#                 (scripts/check-addon-sanity.mjs). A fork that deleted
#                 addons/ passes it with nothing to check.
#
# Installing the Sanity add-on replaces this file with its own workflow.
name: CI

on:
  pull_request:
  push:
    branches: [main, development]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run format:check
      - run: npm run check:config
      - run: npm run check:boundary
      - run: npm run check:addon-installer
      - run: npm run check:content
      - run: npm run check
      - run: npm run check:hover
      - run: npm run build
      - run: npm run check:content-build
      - run: npm run check:schema -- --dist dist/client

  addon-sanity:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: npm
      - run: node scripts/check-addon-sanity.mjs
```

followed by the unchanged `audit:` job.

Create `addons/sanity/files/.github/workflows/ci.yml`:

```yaml
# Checks-only CI for a site with the Sanity add-on installed — deploys are
# handled by Cloudflare Workers Builds, not Actions. The add-on installer
# put this file here in place of the starter's workflow.
#
# The build reads Sanity (the placeholder project id builds an empty site).
# The fixture builds exercise the templates and draft-preview safety with
# no Sanity project.
name: CI

on:
  pull_request:
  push:
    branches: [main, development]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run format:check
      - run: npm run check:config
      - run: npm run check:boundary
      - run: npm run check:content
      - run: npm run check:fixtures
      - run: npm run check
      - run: npm run check:hover
      - run: npm run build
      # Draft preview must never leak stega into an attribute, the <title>
      # or JSON-LD (scripts/check-stega-leaks.mjs).
      - run: KEEP_DEV_PAGES=1 PARITY_FIXTURES=preview npm run build && npm run check:stega

  # Fails on any critical advisory in production dependencies.
  #
  # The gate sits at `critical` rather than `high` because the standing high
  # advisories in this tree are unfixable from here: they come in through the
  # Sanity CLI's dependency chain (adm-zip, js-yaml — build tooling, never
  # shipped in the deployed Worker) and through Astro's own sharp/vite deps,
  # where npm's only "fix" is a major downgrade of sanity or astro. Tighten
  # this back to `--audit-level=high` once upstream ships patched releases;
  # check with `npm audit --omit=dev --audit-level=high`.
  #
  # This gate is about the deployed runtime, so it always runs with
  # `--omit=dev`. Review any NEW high advisory on its merits rather than
  # assuming this threshold covers it.
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm audit --omit=dev --audit-level=critical
```

Run: `npx prettier --check .github addons/sanity/files/.github`
Expected: clean (run `--write` if not).

- [ ] **Step 6: Run it against the baselines**

Run: `git show 01c2890:package-lock.json > /tmp/pr3-package-lock.json && node scripts/check-addon-sanity.mjs --baselines .parity --lockfile /tmp/pr3-package-lock.json`
Expected (about 10–15 minutes): `Identical: <n> files.` four times,
`Equivalent: <n> files.` with `_headers skipped …` counted once, every
check OK, ending with `✓ check-addon-sanity: …`.

Run (no add-on folder: nothing to check):
`mv addons /tmp/addons-held && node scripts/check-addon-sanity.mjs; status=$?; mv /tmp/addons-held addons; echo "exit=$status"`
Expected: `check-addon-sanity: no addons/sanity/ in this project, nothing to check.` and `exit=0`.

- [ ] **Step 7: Gate**

Run: `npm run check && npm run check:hover && npm run check:boundary && npm run check:config && npm run check:content && npm run check:addon-installer && npm run format:check`
Expected: 0 errors; each OK.

Run: `npm run build && npm run check:content-build && npm run check:schema -- --dist dist/client`
Expected: each OK (this is the new CI `checks` sequence, end to end).

Run the Files parity command. Expected: `Identical: <n> files.`

- [ ] **Step 8: Commit**

```bash
git add scripts/lib/scratch.mjs scripts/check-addon-sanity.mjs scripts/check-schema.mjs .github/workflows/ci.yml addons/sanity/files/.github package.json
git commit -m "Prove the Sanity add-on in CI; check:hover and check:schema join the gate

check-addon-sanity installs the add-on into a scratch copy and runs the
checks plus placeholder, sample (equivalent to Files), edge-fixture and
preview builds; --baselines adds the PR 2/3 parity comparisons.
check:schema gains --dist. The overlay carries a Sanity-mode workflow.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Setup asks for the content source

**Files:**

- Modify: `scripts/setup.mjs`
- Test: `scripts/check-setup.mjs`
- Modify: `package.json` (`check:setup`), `.github/workflows/ci.yml`
  (run it in `checks`)

**Interfaces:**

- Consumes: `scripts/addon-sanity.mjs` and its exit codes (Task 4), the
  manifest `marker` `src/sanity/lib/source.ts` (Task 6), `scratchCopy` and
  `git` (Task 8).
- Produces: setup answer key `contentSource: "files" | "sanity"` (in
  `--config` JSON and interactively). It defaults to `"sanity"` when the
  add-on is installed, else `"files"`. `--force` is passed through to the
  installer. Setup deletes `addons/` after either branch.

- [ ] **Step 1: Write the failing tests**

Create `scripts/check-setup.mjs`:

```js
#!/usr/bin/env node
// @ts-check
/**
 * check-setup — runs `npm run setup` non-interactively (--config … --yes)
 * in scratch copies of this repo (scripts/lib/scratch.mjs) and checks both
 * content-source branches and the refusals. No network: setup and the
 * add-on installer have no dependencies.
 *
 * Usage: npm run check:setup
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { git, scratchCopy } from "./lib/scratch.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const answersDir = fs.mkdtempSync(path.join(os.tmpdir(), "setup-answers-"));
/** @type {string[]} */
const temps = [answersDir];
let runs = 0;

/**
 * Run setup in `dir` with these --config answers.
 * @param {string} dir
 * @param {Record<string, string>} answers
 * @param {...string} flags
 */
function setup(dir, answers, ...flags) {
  const file = path.join(answersDir, `answers-${runs++}.json`);
  fs.writeFileSync(file, JSON.stringify(answers));
  return spawnSync(
    process.execPath,
    ["scripts/setup.mjs", "--config", file, "--yes", ...flags],
    {
      cwd: dir,
      encoding: "utf8",
    },
  );
}
const copy = () => {
  const dir = scratchCopy(REPO);
  temps.push(dir);
  return dir;
};
const read = (/** @type {string} */ dir, /** @type {string} */ rel) =>
  fs.readFileSync(path.join(dir, rel), "utf8");
const exists = (/** @type {string} */ dir, /** @type {string} */ rel) =>
  fs.existsSync(path.join(dir, rel));
const out = (/** @type {{ stdout: string, stderr: string }} */ r) =>
  `${r.stdout}\n${r.stderr}`;

// Files: identity written, no Sanity anywhere, addons/ gone.
{
  const dir = copy();
  const r = setup(dir, {
    contentSource: "files",
    siteName: "Acme Roofing",
    workerName: "acme-roofing",
  });
  assert.equal(r.status, 0, out(r));
  assert.match(read(dir, "src/config/site.ts"), /name: "Acme Roofing"/);
  assert.match(read(dir, "wrangler.jsonc"), /"name": "acme-roofing"/);
  assert.doesNotMatch(read(dir, "wrangler.jsonc"), /SANITY/);
  assert.doesNotMatch(read(dir, ".env"), /SANITY/);
  assert.ok(!exists(dir, "src/sanity"));
  assert.ok(!exists(dir, "addons"));
}

// Sanity: the add-on installed first, then its ids written; addons/ gone.
{
  const dir = copy();
  const r = setup(dir, {
    contentSource: "sanity",
    siteName: "Acme Roofing",
    workerName: "acme-roofing",
    sanityProjectId: "abc123xy",
    studioHost: "acme-roofing",
  });
  assert.equal(r.status, 0, out(r));
  assert.match(r.stdout, /Sanity add-on installed/);
  assert.match(
    read(dir, "src/lib/content/source.ts"),
    /@\/sanity\/lib\/source/,
  );
  assert.match(
    read(dir, "src/config/sanity.shared.mjs"),
    /SANITY_PROJECT_ID = "abc123xy"/,
  );
  assert.match(
    read(dir, "wrangler.jsonc"),
    /"PUBLIC_SANITY_PROJECT_ID": "abc123xy"/,
  );
  assert.match(read(dir, "sanity.cli.ts"), /studioHost: "acme-roofing"/);
  assert.match(read(dir, ".env"), /^PUBLIC_SANITY_PROJECT_ID=abc123xy$/m);
  assert.ok(!exists(dir, "addons"));

  // Re-running on the installed project: Files is refused, nothing written…
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "installed");
  const files = setup(dir, { contentSource: "files" });
  assert.equal(files.status, 1);
  assert.match(
    files.stderr,
    /Sanity add-on is installed[\s\S]*Nothing was written/,
  );
  assert.equal(git(dir, "status", "--porcelain"), "");
  // …and leaving the answer out keeps Sanity.
  const again = setup(dir, { siteName: "Acme Roofing Co" });
  assert.equal(again.status, 0, out(again));
  assert.match(read(dir, "src/config/site.ts"), /name: "Acme Roofing Co"/);
}

// Sanity on a dirty tree: the installer refuses and setup writes nothing.
{
  const dir = copy();
  fs.appendFileSync(path.join(dir, "README.md"), "\nA local note.\n");
  const siteBefore = read(dir, "src/config/site.ts");
  const r = setup(dir, { contentSource: "sanity", siteName: "Acme Roofing" });
  assert.equal(r.status, 1);
  assert.match(
    r.stderr,
    /addon:sanity: the working tree has uncommitted changes/,
  );
  assert.match(r.stderr, /installer stopped/);
  assert.ok(!exists(dir, "src/sanity"));
  assert.equal(read(dir, "src/config/site.ts"), siteBefore);
}

// A dry run on the Sanity branch changes nothing, and shows the ids it would write.
{
  const dir = copy();
  const r = setup(
    dir,
    { contentSource: "sanity", sanityProjectId: "abc123xy" },
    "--dry-run",
  );
  assert.equal(r.status, 0, out(r));
  assert.match(r.stdout, /Would install the Sanity add-on/);
  assert.match(
    r.stdout,
    /src\/config\/sanity\.shared\.mjs[^\n]*→ SANITY_PROJECT_ID/,
  );
  assert.equal(git(dir, "status", "--porcelain"), "");
}

// Sanity without the add-on folder, and an unknown source.
{
  const dir = copy();
  fs.rmSync(path.join(dir, "addons"), { recursive: true, force: true });
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "no add-on");
  const r = setup(dir, { contentSource: "sanity" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /addons\/sanity\/ is missing/);
  const unknown = setup(dir, { contentSource: "wordpress" });
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /contentSource must be "files" or "sanity"/);
}

for (const dir of temps) fs.rmSync(dir, { recursive: true, force: true });
console.log("check-setup: ok");
```

Add to `package.json` `scripts`: `"check:setup": "node scripts/check-setup.mjs",`

- [ ] **Step 2: Run them to make sure they fail**

Run: `npm run check:setup`
Expected: FAIL — the first case exits 1 (`ENOENT … src/config/sanity.shared.mjs`:
setup still reads the Sanity files unconditionally).

- [ ] **Step 3: Rewrite the parts of `scripts/setup.mjs` that touch Sanity**

1. Header comment: replace the paragraph that starts "Sanity is optional
   for a fork." and the "Files this touches" list with:

```js
 * Content source. The first question is Files (the default: content in
 * src/content) or Sanity. Sanity runs the add-on installer
 * (`npm run addon:sanity`, addons/sanity/) BEFORE writing anything else,
 * then asks for and writes the Sanity ids. Either way, setup then deletes
 * addons/: a Files fork re-adds the folder from the starter repo if it
 * ever adopts Sanity, and a Sanity fork has installed it. Setup refuses to
 * treat a project with the add-on installed as Files.
 *
 * Files this touches:
 *   • src/config/site.shared.mjs       — the site URL
 *   • src/config/site.ts               — scalar identity fields (keyed replace)
 *   • wrangler.jsonc                   — worker `name` (+ the two PUBLIC_SANITY_* vars, Sanity)
 *   • src/styles/variables/colors.css  — --color-brand-500 (the canonical brand hue)
 *   • src/config/logo-paths.ts         — LOGO_LABEL
 *   • .env                             — created from .env.example (secrets left blank)
 *   Sanity only (after installing the add-on):
 *   • src/config/sanity.shared.mjs     — projectId/dataset/apiVersion
 *   • sanity.cli.ts                    — studioHost (+ clears appId for the new project)
 *   • workers/rebuild-debounce/wrangler.jsonc — debounce worker `name`
```

and in the Usage block add
` *   node scripts/setup.mjs --force          pass --force to the add-on installer (dirty/non-git tree)`.

2. Imports: `import { readFile, writeFile, access, rm } from "node:fs/promises";`
   and add `import { spawnSync } from "node:child_process";`.

3. After `const CONFIG_PATH = getFlagValue("--config");` add
   `const FORCE = FLAGS.has("--force");`. After the `CLI` constant add:

```js
const ADDON_DIR = "addons/sanity";
/** Exists once the Sanity add-on is installed (its manifest's marker). */
const SANITY_MARKER = "src/sanity/lib/source.ts";
```

4. `PROMPTS`: insert as the first entry:

```js
  // ── Content source ────────────────────────────────────────────────────────
  // Files (content in src/content) is the default. Sanity installs the
  // add-on in addons/sanity/ and asks the Sanity questions below.
  {
    key: "contentSource",
    q: "Content source — files (default) or sanity",
    validate: (v) =>
      v === "files" || v === "sanity" || 'Answer "files" or "sanity"',
  },
```

and add `cms: "sanity",` to each of the four Sanity prompts
(`sanityProjectId`, `sanityDataset`, `sanityApiVersion`, `studioHost`).

5. `readSrc` — read the overlay's copy of a Sanity file that isn't
   installed yet:

```js
/**
 * Read a repo file. A Sanity file that isn't installed yet is read from
 * the add-on's overlay instead (prompt defaults and dry runs).
 */
async function readSrc(rel) {
  const overlay = `${ADDON_DIR}/files/${rel}`;
  if (!(await fileExists(rel)) && (await fileExists(overlay)))
    return readFile(p(overlay), "utf8");
  return readFile(p(rel), "utf8");
}
```

6. `resolveDefault` — first line of the function:

```js
if (prompt.key === "contentSource")
  return (await fileExists(SANITY_MARKER)) ? "sanity" : "files";
```

7. `gatherInteractive` — first line inside `for (const prompt of PROMPTS) {`:

```js
    if (prompt.cms && prompt.cms !== answers.contentSource) continue;
```

8. `gatherFromConfig` — the loop and a check after it:

```js
for (const prompt of PROMPTS) {
  if (prompt.cms && prompt.cms !== answers.contentSource) continue;
  answers[prompt.key] =
    json[prompt.key] !== undefined && json[prompt.key] !== ""
      ? json[prompt.key]
      : await resolveDefault(prompt, cache);
}
if (answers.contentSource !== "files" && answers.contentSource !== "sanity")
  throw new Error(
    `contentSource must be "files" or "sanity" (got "${answers.contentSource}").`,
  );
```

9. `buildChanges` — add `const sanity = a.contentSource === "sanity";` at
   the top; wrap step 1b (sanity.shared.mjs) and step 5 (sanity.cli.ts)
   in `if (sanity) { … }`; in step 3 the list becomes:

```js
    for (const [key, value] of [
      ["name", a.workerName],
      ...(sanity
        ? [
            ["PUBLIC_SANITY_PROJECT_ID", a.sanityProjectId],
            ["PUBLIC_SANITY_DATASET", a.sanityDataset],
          ]
        : []),
    ]) {
```

10. `ensureEnv` — the final message:

```js
ok(
  a.contentSource === "sanity"
    ? "Created .env (fill in SANITY_API_READ_TOKEN — it's intentionally blank)"
    : "Created .env",
);
```

11. Add, before `async function confirm(`:

```js
/** addons/ is spent once the content source is chosen: delete it. */
async function removeAddons(sanity) {
  if (!(await fileExists("addons"))) return;
  if (DRY_RUN) {
    info("(dry-run) would delete addons/");
    return;
  }
  await rm(p("addons"), { recursive: true, force: true });
  ok(
    sanity
      ? "Deleted addons/ — the Sanity add-on is installed, so that copy is no longer needed."
      : "Deleted addons/ — content stays in src/content. To adopt Sanity later, copy addons/sanity/ from the starter repo and run npm run addon:sanity.",
  );
}

/** Install the Sanity add-on (scripts/addon-sanity.mjs) before anything else is written. */
async function installSanity() {
  if (!(await fileExists(`${ADDON_DIR}/manifest.json`)))
    throw new Error(
      `${ADDON_DIR}/ is missing. Copy it from the starter repo, commit, and run setup again. Nothing was written.`,
    );
  heading("Sanity add-on");
  if (
    !DRY_RUN &&
    !(await confirm("Install the Sanity add-on now (npm run addon:sanity)?"))
  ) {
    warn("Aborted. No files written.");
    exit(1);
  }
  const r = spawnSync(
    process.execPath,
    [
      p("scripts/addon-sanity.mjs"),
      ...(DRY_RUN ? ["--dry-run"] : []),
      ...(FORCE ? ["--force"] : []),
    ],
    { cwd: ROOT, stdio: "inherit" },
  );
  if (r.status !== 0)
    throw new Error(
      "the add-on installer stopped (see above). Nothing else was written.",
    );
}
```

12. `main()` — between gathering the answers and `buildChanges`:

```js
const sanity = answers.contentSource === "sanity";
const installed = await fileExists(SANITY_MARKER);
if (installed && !sanity)
  throw new Error(
    `the Sanity add-on is installed (${SANITY_MARKER} exists), and setup can't remove it. Answer "sanity" (or leave contentSource out), or remove the add-on first (the sanity-and-preview skill → "Removing the add-on"). Nothing was written.`,
  );
if (sanity && !installed) await installSanity();
```

In the `if (DRY_RUN) { … }` branch, add `await removeAddons(sanity);`
after `await ensureEnv(answers);`. After the write loop, replace
`await ensureEnv(answers);` with
`await ensureEnv(answers);\n  await removeAddons(sanity);`.

13. `main()` — replace the whole "Next steps" output with:

```js
heading("Next steps");
const steps = [
  ...(sanity
    ? [
        `${c.bold}npm install${c.reset}            the add-on's packages (Sanity, React)`,
      ]
    : []),
  `${c.bold}npm run format${c.reset}         re-format the files just written`,
  `${c.bold}npm run check:config${c.reset}   verify wrangler.jsonc and public/_headers match src/config`,
  `${c.bold}npm run check${c.reset}          type-check (astro check)`,
  `${c.bold}npm run build${c.reset}          confirm the site still builds`,
  `Swap the ${c.bold}placeholder photography${c.reset} (src/assets/placeholder-images/) and the ${c.bold}sample content${c.reset} (src/content/)`,
  ...(sanity
    ? [
        `The ${c.bold}Sanity branch${c.reset}: .claude/skills/setup/references/sanity.md (project, Studio, Viewer token in .env, CORS, typegen)`,
        `Deploy the ${c.bold}rebuild-debounce Worker${c.reset} + wire the publish webhook (workers/rebuild-debounce/README.md) — REQUIRED: content pages are prerendered, so a publish reaches the live site only through this rebuild chain`,
      ]
    : []),
  `Finish the dashboard steps in ${c.bold}docs/new-project-checklist.md${c.reset} (Cloudflare secrets + WAF + domain, GitHub Dependabot)`,
];
steps.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
console.log(`${c.dim}  CI runs these checks and more — see .github/workflows/ci.yml.
  The /setup Claude skill runs the checks for you and guides the rest.${c.reset}`);
```

14. `--help` text: add a line under the usage lines,
    `  node scripts/setup.mjs --force       pass --force to the add-on installer`,
    change the `Writes:` line to
    `Writes: ${SHARED}, ${SITE}, ${WRANGLER}, ${COLORS}, ${THEMES}, ${LOGO_PATHS}, .env — and, on the Sanity branch, ${SANITY_SHARED}, ${CLI}, ${WRANGLER_DEBOUNCE}`,
    and add a paragraph:

```text
Content source ("contentSource" in --config; asked first interactively):
  files  (default) content stays in src/content; addons/ is deleted
  sanity runs npm run addon:sanity first, then writes the Sanity ids;
         addons/ is deleted after installing
```

- [ ] **Step 4: Run the tests to make sure they pass**

Run: `npm run check:setup`
Expected: `check-setup: ok`

- [ ] **Step 5: CI runs it**

In `.github/workflows/ci.yml`, `checks` job, after
`- run: npm run check:addon-installer` add `- run: npm run check:setup`.

- [ ] **Step 6: Gate**

Run: `npm run check && npm run check:hover && npm run check:boundary && npm run check:config && npm run check:content && npm run format:check`
Expected: 0 errors; each OK.

Run the Files parity command. Expected: `Identical: <n> files.`

- [ ] **Step 7: Commit**

```bash
git add scripts/setup.mjs scripts/check-setup.mjs package.json .github/workflows/ci.yml
git commit -m "Setup asks Files or Sanity; Sanity installs the add-on first

contentSource defaults to files (sanity when installed); the Sanity
branch runs addon:sanity before any other write and then writes the ids;
both branches delete addons/; Files on an installed project is refused.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Docs that would otherwise be wrong

PR 5 does the full docs pass. This task fixes what PR 4 made wrong: the
setup skill (the content-source question, `no-cms.md` as the Files
branch, `sanity.md` starting with the installer), CLAUDE.md's skill
table, file map, verification commands and anti-patterns, the README's
setup, commands and Sanity sections, `scripts/README.md`, `AGENTS.md`,
the new-project checklist's identity lines, the `content-files`,
`component-api` and `seo-discoverability` mentions of moved files, and
the add-on's own `sanity-and-preview` skill.

**Files:**

- Modify: `.claude/skills/setup/SKILL.md`,
  `.claude/skills/setup/references/no-cms.md`,
  `.claude/skills/setup/references/sanity.md`, `CLAUDE.md`, `README.md`,
  `AGENTS.md`, `scripts/README.md`, `docs/new-project-checklist.md`,
  `.claude/skills/content-files/SKILL.md`,
  `.claude/skills/component-api/SKILL.md`,
  `.claude/skills/seo-discoverability/SKILL.md`,
  `addons/sanity/files/.claude/skills/sanity-and-preview/SKILL.md`,
  `addons/sanity/README.md`

**Interfaces:**

- Consumes: everything above: command names (`addon:sanity`,
  `check:addon`, `check:addon-installer`, `check:setup`,
  `check:schema -- --dist`), paths and the `contentSource` answer.
- Produces: docs only.

- [ ] **Step 1: Find the stale references (the failing check)**

Run:

```bash
grep -rnE 'CONTENT_SOURCE|perspectiveCookie\b|Option B|Are you using Sanity|SANITY_PROJECT_ID = "your|Sanity ids \+ site URL|Sanity `projectId`/`dataset`/`apiVersion` and the site|new Sanity projectId/dataset \+ site URL' \
  CLAUDE.md README.md AGENTS.md scripts/README.md docs/new-project-checklist.md .claude/skills addons/sanity/files/.claude
```

Expected: about 20 hits — `CLAUDE.md:265`, `README.md:111`,
`docs/new-project-checklist.md:49`, `.claude/skills/content-files/SKILL.md`,
`.claude/skills/setup/SKILL.md`, `.claude/skills/setup/references/no-cms.md`
and the add-on's `sanity-and-preview` skill. Steps 2–9 clear them (and
make the other edits listed, which this grep can't express); Step 10
re-runs it.

- [ ] **Step 2: `.claude/skills/setup/SKILL.md`**

1. Reference table: replace the three CMS rows with:

```md
| [references/no-cms.md](references/no-cms.md) | The fork keeps content in files (the default) |
| [references/sanity.md](references/sanity.md) | The fork chooses Sanity |
| `references/studio-branding.md` | Branding the Sanity Studio (installed by the add-on) |
```

2. The fork guard paragraph: replace "and that `src/config/site.shared.mjs`
   still holds the placeholders (`SANITY_PROJECT_ID = "your-sanity-project-id"`,
   `SITE_URL = "https://www.example.com"`)." with "and that
   `src/config/site.shared.mjs` still holds the placeholder
   `SITE_URL = "https://www.example.com"` and `addons/sanity/` is
   present (setup deletes it)."

3. Replace section "1.1 — Are you using Sanity as your CMS?" (heading
   through the "Not yet / No" bullet) with:

```md
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
```

4. Step 2: replace "default `dataset` to `production` and `apiVersion` to
   the value already in `site.shared.mjs`." with "default `dataset` to
   `production` and `apiVersion` to the value in
   `addons/sanity/files/src/config/sanity.shared.mjs` (Sanity forks)."

5. Step 4: the answer-keys list starts with `contentSource,` (and the
   paragraph above it: "**Sanity forks:** create the project first …" stays).
   Replace "The CLI rewrites `site.shared.mjs`, `site.ts`, `wrangler.jsonc`,
   …, and creates `.env` (token left blank)." with "The CLI rewrites
   `site.shared.mjs`, `site.ts`, `wrangler.jsonc`, `colors.css`,
   `themes.css` (if `themeColors`), `typography.css` (if `fluidType`) and
   `logo-paths.ts`, and creates `.env`. With `contentSource: "sanity"` it
   first installs the add-on, then also writes `sanity.shared.mjs` and
   `sanity.cli.ts` (clearing `appId`). Either way it deletes `addons/`
   at the end. The add-on installer refuses a dirty tree: commit before
   running the CLI on the Sanity branch."

6. Step 5: replace the "No CMS" bullet with "**Files** → work through
   [references/no-cms.md](references/no-cms.md) (the content handoff),
   then come back here." and, in the Sanity bullet, prepend "run
   `npm install` (the add-on's packages), then".

7. Step 6: replace the opening paragraph and code block with:

````md
**Run the full gate, not a subset.**
[.github/workflows/ci.yml](../../../.github/workflows/ci.yml) is what every
push must pass; verifying with less leaves the fork's first build red on
something setup caused.

```bash
npm run format:check
npm run check:config   # wrangler.jsonc and public/_headers ↔ src/config
npm run check:boundary
npm run check:content
npm run check          # astro check (types)
npm run check:hover
npm run build
# Files forks:
npm run check:content-build && npm run check:schema -- --dist dist/client
```
````

and replace the following "Two more checks exist…" paragraph with
"Sanity forks: run `npm run typegen` **before** `npm run check` once
the schema is deployed (sanity.md §S7), and run the workflow the add-on
installed (it adds `check:fixtures` and a draft-preview stega check)."

8. Done criteria: change the first bullet ("**The CMS question was asked
   and answered explicitly** (Step 1.1)…") to "**The content-source
   question (Files or Sanity) was asked and answered explicitly**
   (Step 1.1), and the matching branch was completed or explicitly
   deferred." (Step 7's "Sanity forks only" wording stays as it is.)

- [ ] **Step 3: Rewrite `.claude/skills/setup/references/no-cms.md` as the Files branch**

Replace the whole file:

```md
# The Files branch — content in the repo

**Read this when the fork keeps content in files (the default).** If it
chose Sanity, read [sanity.md](./sanity.md) instead.

## The headline: it already works

Content lives in `src/content/`: one MDX file per blog post, one JSON file
per case study, project, testimonial, author and CTA, plus `gallery.json`
and `settings.json`, with photos in each folder's `images/`. Every file is
validated when the site syncs and builds: a missing photo, empty alt text,
a bad category or a reference to an entry that doesn't exist fails the
build, naming the file and the field. The starter ships sample content in
all of them, so every content page renders from the first build.

`npm run setup` with `contentSource: "files"` deletes `addons/` at the
end: nothing in it applies. The site has no Sanity code, packages,
config or env vars.

## What to do

1. **Replace the sample content** with the client's, or delete what they
   won't use. The field reference and recipes are in the `content-files`
   skill (`.claude/skills/content-files/SKILL.md`). Keep at least one
   entry per collection the site links to, or unlink that section (next
   item).
2. **Unlink sections the client won't use.** In
   [site-structure.ts](../../../../src/data/site-structure.ts) remove the
   `/blog`, `/case-studies`, `/projects` or `/gallery` entries from
   `NAV_MENU` and `FOOTER_GROUPS` (and `PAGES` if the route is going too).
3. **Hand over the editing guide.** `docs/editing-content.md` is the
   plain-language guide for clients and editors (setup, recipes, reading
   errors, publishing). Point the client at it.
4. **Skip** the Sanity project, Studio, Viewer token, CORS, `typegen`, and
   the rebuild-debounce Worker. A git push to `main` is the only thing
   that triggers a build.

## Adopting Sanity later

Copy `addons/sanity/` from the starter repo into the project, commit, and
run `npm run addon:sanity` — then the Sanity branch
([sanity.md](./sanity.md)) from S1. Content already in `src/content/` is
not migrated into Sanity.

## Done criteria for this branch

- Sample content replaced, or explicitly deferred and listed in the
  handoff.
- Sections the client won't use are unlinked from nav and footer.
- The client knows where content lives and has `docs/editing-content.md`.
```

- [ ] **Step 4: `.claude/skills/setup/references/sanity.md`**

1. Replace the first paragraph ("**Only run this if the fork answered
   "yes, Sanity" at the CMS gate.** …") with:

```md
**Only run this if the fork chose Sanity at the content-source gate.** If
it keeps content in files, read [no-cms.md](./no-cms.md) instead.

Sanity is an add-on: `npm run setup` with `"contentSource": "sanity"`
installs it (`npm run addon:sanity`) before writing anything else. If the
fork is past setup, install it yourself: commit, then
`npm run addon:sanity`, then `npm install`. The installer refuses a dirty
tree and a second run. What it adds and overwrites:
`addons/sanity/README.md` in the starter repo. Everything below assumes
it is installed.
```

2. S1 note: replace "they read `sanity.cli.ts` / `site.shared.mjs` to
   know which project to target." with "they read `sanity.cli.ts` /
   `src/config/sanity.shared.mjs` to know which project to target."

- [ ] **Step 5: `CLAUDE.md`**

1. Skill table row:

```md
| `sanity-and-preview` | Only with the Sanity add-on installed (`npm run addon:sanity`; the skill ships with it — in the starter repo read `addons/sanity/files/.claude/skills/sanity-and-preview/SKILL.md`): queries, TypeGen, Studio, draft preview, rebuild webhook |
```

2. Fork note: `(\`src/config/site.ts\`, \`site.shared.mjs\`,` stays.
3. File map: in `components/`, drop `· portabletext/`; the `pages/` line
   becomes `# Routes; api/** is the only SSR route (the Sanity add-on adds preview/**)`;
   delete the `sanity/` line; add, after the `src/` tree's closing fence,
   the sentence: "`addons/sanity/` (outside `src/`, not built) is the
   Sanity add-on: an overlay plus a manifest that `npm run addon:sanity`
   installs. The CMS seams it replaces: `src/lib/content/source.ts`,
   `src/config/cms.mjs`, `src/config/cms.shared.mjs`,
   `src/components/global/CmsEditing.astro`,
   `src/components/blog/BlogBody.astro`."
4. Site-wide values bullet: replace "Sanity ids + site URL live in
   `site.shared.mjs` (the config-context leaf); `wrangler.jsonc` mirrors
   them, validated by `npm run check:config` (prebuild)." with "The site
   URL lives in `site.shared.mjs` (the config-context leaf). A content
   add-on keeps its ids in its own `src/config/<name>.shared.mjs`, whose
   `WRANGLER_VARS` export `wrangler.jsonc` mirrors; `npm run check:config`
   (prebuild) validates that and `public/_headers` against
   `src/config/headers.shared.mjs`."
5. Verification commands paragraph, replace with:

```md
`npm run check` (astro check) · `npm run check:hover` (prop tooltips) ·
`npm run check:config` (wrangler vars and `_headers` ↔ src/config; runs
prebuild) · `npm run check:boundary` (content files read only through
`@/lib/content`; add-on rules in `scripts/boundary/`) ·
`npm run check:content` (bad content must fail `astro sync` naming file and field) ·
`npm run check:content-build` (after a build: coming-soon studies, OG/JSON-LD
image URLs, resized local images, TOC anchors) ·
`npm run check:schema -- --dist dist/client` (JSON-LD on the built site) ·
`npm run check:addon-installer` · `npm run check:setup` ·
`npm run check:addon` (installs the Sanity add-on in a scratch copy and
builds it; network, ~10 min) · `npm run build` · `npm run format:check`.
```

6. Anti-patterns: replace the first bullet with "Importing a CMS package
   or `src/sanity` outside the add-on's allow list
   (`scripts/boundary/*.json`, shipped by the add-on) — content, types and
   image helpers come from `@/lib/content`." In the "Making CMS content
   routes SSR" bullet, replace "preview lives on the `/preview/*` SSR
   twins" with "a CMS add-on's preview lives on its own SSR twins (the
   Sanity add-on's `/preview/*`)". Add a bullet: "Wiring a CMS by editing
   `astro.config.mjs`, `BaseLayout.astro` or `middleware.ts` — they read
   the CMS seams (`src/config/cms.mjs`, `cms.shared.mjs`,
   `CmsEditing.astro`); a CMS add-on replaces the seams."

- [ ] **Step 6: `README.md`, `AGENTS.md`, `scripts/README.md`**

`README.md`:

1. Line 9 (the `/setup` bullet): replace "(including **whether you want
   Sanity as your CMS at all** — it's optional, and the repo builds and
   deploys fine without it)" with "(including the **content source**:
   local files, the default, or the opt-in Sanity add-on)" and "If you do
   want Sanity, it also" with "If you choose Sanity, it installs the
   add-on and".
2. Line 10 (the `npm run setup` bullet): replace the file list with
   "(`site.shared.mjs`, `site.ts`, `wrangler.jsonc`, `colors.css`,
   `themes.css`, `typography.css`, `logo-paths.ts`, `.env`, plus the
   Sanity ids when you choose Sanity)" and add "It asks Files or Sanity
   first; Sanity runs `npm run addon:sanity`."
3. Commands table: delete the `studio` and `studio:local` rows; change
   the `check:schema` row to
   `| \`npm run check:schema\` | Validate JSON-LD on key pages (\`-- --dist dist/client\` after a build, or with the dev server running) |`;
change the `check:config`row's action to "Verify`wrangler.jsonc`vars
and`public/_headers`match`src/config`(also runs before`build`)";
add a row
`| \`npm run addon:sanity\` | Install the Sanity add-on (\`addons/sanity/\`): Sanity as the content source |`.
Re-align the table with `npx prettier --write README.md`.
4. Rendering model: replace the two route bullets with:

```md
- `src/pages/api/**` — the lead form and other API routes.
- With the Sanity add-on: `src/pages/preview/**`, the SSR draft-preview
  twins its Studio iframes, and the draft-mode cookie routes under
  `src/pages/api/draft-mode/`.
```

5. Deployment: in the first paragraph, replace "and the same Worker
   server-renders `/preview/*` and `/api/*`. There is no separate preview
   deployment — draft preview is the `/preview/*` route tree on the same
   Worker (see below). The only other Worker is the tiny rebuild-debounce
   Worker that collapses publish webhooks into one build." with "and the
   same Worker server-renders `/api/*` (and, with the Sanity add-on, its
   `/preview/*` draft tree)." Replace item 2 of the rebuild triggers and
   the paragraph after it with "2. **With the Sanity add-on:** a Sanity
   publish, through its rebuild-debounce Worker (the `sanity-and-preview`
   skill, installed with the add-on)."
6. Cut the three subsections `### Sanity webhook`, `### Rebuild-debounce
Worker` and `### Draft preview (Presentation)` (from `### Sanity
webhook` up to, not including, `## 🎨 Cloning this as a template`)
   and paste them, unchanged, at the end of `addons/sanity/README.md`
   under a new heading `## Operating it`, with each `###` kept. In the
   pasted text, `.claude/skills/sanity-and-preview/SKILL.md` and
   `workers/rebuild-debounce/` are paths after install — leave them.
7. Cloning item 2: replace it with "**`src/config/site.shared.mjs`** — a
   tiny dependency-free module holding the site `url`, the ONE place it
   lives: `site.ts`, `astro.config.mjs` and the `scripts/*.mjs` all import
   it. (The Sanity add-on keeps its ids the same way, in
   `src/config/sanity.shared.mjs`.)" Item 6: "both the front-end logo and
   the Sanity Studio logo render from it" → "the front-end logo renders
   from it (and the Sanity add-on's Studio logo)". The closing paragraph:
   "Sanity project + CORS," → "the Sanity project (Sanity forks),".

`AGENTS.md`: replace "`sanity-and-preview`, `seo-discoverability`,
`setup`)" with "`content-files`, `seo-discoverability`, `setup`, and
`sanity-and-preview` once the Sanity add-on is installed)".

`scripts/README.md`:

1. Replace the second and third paragraphs (from "The Sanity-reading
   scripts get project config…" through "…are already in `package.json`.")
   with: "The Sanity add-on (`addons/sanity/`) brings its own scripts
   (`check-stega-leaks.mjs`, `check-fixture-markdown.mjs`,
   `migrate-webflow-blog.mjs`, and a `compare-dist.mjs` with
   `--equivalent`); `addons/sanity/README.md` describes them."
2. `setup.mjs` section: replace "per-fork identity values: … and a `.env`
   scaffold." with "per-fork identity values: `src/config/site.shared.mjs`,
   `src/config/site.ts`, `wrangler.jsonc`, brand color + optional
   theme/typography variables, `logo-paths.ts`, and a `.env` scaffold. It
   asks Files or Sanity first: Sanity runs the add-on installer, then also
   writes `src/config/sanity.shared.mjs`, `sanity.cli.ts` and the
   rebuild-debounce Worker's name. It deletes `addons/` at the end."
3. Replace the `check-config-sync.mjs` section body with: "Fails the build
   if `wrangler.jsonc` `vars` drift from any `WRANGLER_VARS` export of a
   `src/config/*.shared.mjs` module, or `public/_headers` drifts from
   `SECURITY_HEADERS` (`src/config/headers.shared.mjs`). Runs
   automatically via `prebuild`; `check-config-sync-cases.mjs` is its
   test."
4. Add sections before `## check-schema.mjs`:

```md
## `addon-sanity.mjs` — install the Sanity add-on (`npm run addon:sanity`)

Copies `addons/sanity/files/` over the project and merges
`addons/sanity/manifest.json` into `package.json`, `wrangler.jsonc`
(comments kept), `tsconfig.json`, `.env.example` and `.gitignore`.
`--dry-run` lists every change; it refuses a second install and, without
`--force`, a dirty or non-git tree. Engine: `lib/addon-install.mjs` and
`lib/jsonc.mjs`; tests: `check-addon-installer.mjs`. End to end:
`check-addon-sanity.mjs` (`npm run check:addon`) installs it in a scratch
copy (`lib/scratch.mjs`) and runs the checks and builds.

---
```

5. Move the `## \`migrate-webflow-blog.mjs\``section (heading to end of
file) to the end of`addons/sanity/README.md`, under `## Operating it`.

- [ ] **Step 7: `docs/new-project-checklist.md`**

1. Line 12 (the CLI bullet): replace the file list "`site.shared.mjs`,
   `site.ts`, `wrangler.jsonc`, …, `sanity.cli.ts`, and `.env`" with
   "`site.shared.mjs`, `site.ts`, `wrangler.jsonc`, `colors.css`,
   `themes.css`, `typography.css`, `logo-paths.ts` and `.env` (plus, for
   Sanity, `sanity.shared.mjs` and `sanity.cli.ts`, after installing the
   add-on)".
2. Item 2 of the identity list: "new Sanity projectId/dataset + site URL"
   → "the site URL (Sanity forks: the ids are in
   `src/config/sanity.shared.mjs`)".
3. Item 3: "worker `name`, `PUBLIC_SANITY_PROJECT_ID`,
   `PUBLIC_SANITY_DATASET`. `npm run check:config` … matches
   site.shared.mjs" → "worker `name` (Sanity forks: the
   `PUBLIC_SANITY_*` vars too). `npm run check:config` (and every build)
   verifies the vars and `public/_headers` against `src/config`."
4. §3's opening note: append "Install the add-on first:
   `npm run addon:sanity` (or choose Sanity in `npm run setup`)."

- [ ] **Step 8: Skill mentions of moved files**

`.claude/skills/content-files/SKILL.md`:

1. In "Adding a content type", replace "The Sanity source needs the same
   functions (`sanity-and-preview` → "Data fetching pattern")." with "The
   Sanity add-on's source must implement them too
   (`src/lib/content/types.ts` is the contract): CI's `addon-sanity` job
   fails until it does (`sanity-and-preview` → "Data fetching pattern",
   in the add-on)."
2. Replace the section "### The Sanity source and `CONTENT_SOURCE`" with:

```md
### The Sanity add-on

- **The Sanity source** lives in the add-on (`addons/sanity/`); installed,
  it is `src/sanity/lib/source.ts` and `src/lib/content/source.ts` points
  at it. `npm run check:addon` installs it into a scratch copy and proves
  that the same sample content renders equivalently from both sources
  (`compare-dist --equivalent`, the add-on's copy).
```

and keep any following bullet of that section that doesn't mention
`CONTENT_SOURCE`.

`.claude/skills/component-api/SKILL.md:37`: replace "(`BlogBody`, which
renders an MDX or Portable Text post body;" with "(`BlogBody`, which
renders an MDX post body — the Sanity add-on's version adds Portable
Text;".

`.claude/skills/seo-discoverability/SKILL.md:137`: replace the link
`[src/sanity/lib/portable-text.ts](../../../src/sanity/lib/portable-text.ts)`
with "`src/sanity/lib/portable-text.ts` (Sanity add-on)".

- [ ] **Step 9: The add-on's `sanity-and-preview` skill**

In `addons/sanity/files/.claude/skills/sanity-and-preview/SKILL.md`:

1. Frontmatter `description`: insert after "for this starter." the
   sentence "Installed by the Sanity add-on (`npm run addon:sanity`)."
2. Replace the opening blockquote with:

```md
> **This skill comes with the Sanity add-on.** Files is the starter's
> default content source (the `content-files` skill); `npm run
addon:sanity` installed this add-on, which replaced the CMS seams
> (`src/lib/content/source.ts`, `src/config/cms.mjs`,
> `src/config/cms.shared.mjs`, `src/components/global/CmsEditing.astro`,
> `src/components/blog/BlogBody.astro`, `public/_headers`,
> `.github/workflows/ci.yml`) with the Sanity versions.
```

3. "How draft mode works", step 4: replace "The Sanity source forwards
   `{ perspectiveCookie }`" with "The Sanity source forwards
   `{ preview }` (the `ContentOptions` field)". Step 5: replace the
   BaseLayout sentence with "[src/components/global/CmsEditing.astro](../../../src/components/global/CmsEditing.astro)
   (the CMS editing seam, rendered by BaseLayout) checks
   `Astro.cookies.has(perspectiveCookieName)` (guarded by
   `Astro.isPrerendered`) and conditionally mounts".
4. Wherever it says middleware sets the Studio `frame-ancestors`, name
   `src/config/cms.shared.mjs` (`FRAME_ANCESTORS`) as the place to edit;
   `src/config/headers.shared.mjs` builds the CSP and `check:config`
   keeps `public/_headers` in step.
5. Staging-first paragraph: "`SITE_URL` in
   [src/config/site.shared.mjs]" stays; the ids are in
   `src/config/sanity.shared.mjs` — add that clause.
6. Required env vars table: the `Where` column for the two
   `PUBLIC_SANITY_*` rows becomes "`wrangler.jsonc` `vars` (mirrors
   `src/config/sanity.shared.mjs`) + local `.env`".
7. "Draft perspective" bullet: `opts?: { perspectiveCookie }` →
   `opts?: { preview }`; and the body bullet: "the blog body is a
   `{ kind: "portable-text" | "mdx" }` union rendered by `<BlogBody>`" →
   "the blog body is `{ kind: "portable-text" }` here (registered in
   `BlogBodyFormats` by `src/sanity/lib/body-format.ts`) or `{ kind:
"mdx" }`, both rendered by this add-on's `<BlogBody>`".
8. "Parity and preview-safety checks": replace "Sanity builds need
   `CONTENT_SOURCE=sanity` now that Files is the default. Do it twice:
   once with `KEEP_DEV_PAGES=1 CONTENT_SOURCE=sanity` (no fixtures, the
   empty-site case), once adding `PARITY_FIXTURES=1` (the populated
   case)." with "Do it twice: once with `KEEP_DEV_PAGES=1` (no fixtures,
   the empty-site case), once adding `PARITY_FIXTURES=1` (the populated
   case). In the starter repo, `npm run check:addon -- --baselines .parity`
   does all of this in a scratch install." In the preview-safety command
   drop `CONTENT_SOURCE=sanity` and replace "It is a script, not an npm
   script." with "`npm run check:stega` runs the check." In "Boundary",
   replace "keeps Sanity imports inside `src/sanity` and the allow list"
   with "keeps Sanity imports inside `src/sanity` and the allow list in
   `scripts/boundary/sanity.json`".
9. Append two sections at the end:

```md
## Removing the add-on

If the install was committed on its own, `git revert <that commit>` and
`npm install` remove it. Otherwise, by hand:

1. Delete what the overlay added: `src/sanity/`, `src/pages/preview/`,
   `src/pages/api/draft-mode/`, `src/components/portabletext/`,
   `src/components/SanityVisualEditing.tsx`,
   `src/components/DisableDraftMode.tsx`, `sanity.config.ts`,
   `sanity.cli.ts`, `sanity-typegen.json`, `skills-lock.json`,
   `workers/rebuild-debounce/`, `scripts/boundary/sanity.json`,
   `scripts/check-stega-leaks.mjs`, `scripts/check-fixture-markdown.mjs`,
   `scripts/migrate-webflow-blog.mjs`, `src/config/sanity.shared.mjs`,
   `.claude/skills/sanity-and-preview/` and
   `.claude/skills/setup/references/studio-branding.md`.
2. Restore the Files versions of the seams from the starter repo:
   `src/lib/content/source.ts`, `src/config/cms.mjs`,
   `src/config/cms.shared.mjs`, `src/components/global/CmsEditing.astro`,
   `src/components/blog/BlogBody.astro`, `public/_headers`,
   `scripts/compare-dist.mjs`, `.github/workflows/ci.yml`.
3. Remove what the manifest merged (`addons/sanity/manifest.json` in the
   starter repo lists it): the packages and scripts in `package.json`, the
   `PUBLIC_SANITY_*` vars in `wrangler.jsonc`, `jsx`, `jsxImportSource`
   and the Sanity `types` entry in `tsconfig.json` (back to `[]`), the
   Sanity block in `.env.example`, and the three `.gitignore` rules.
4. `npm install`, then `npm run check && npm run build`.

## Maintaining the add-on (starter repo only)

In the starter repo this skill lives at
`addons/sanity/files/.claude/skills/sanity-and-preview/SKILL.md`, and all
Sanity code under `addons/sanity/files/`, which is not built or
type-checked in place. `npm run check:addon -- --keep` installs it into a
scratch copy and leaves it there: work in that copy (it type-checks,
`npm run typegen` and the Studio run there) and copy changed files back
under `addons/sanity/files/`. A new `ContentSource` method in core must be
implemented in `src/sanity/lib/source.ts` too; CI's `addon-sanity` job
fails until it is.
```

- [ ] **Step 10: Re-run the stale-reference grep and format**

Run the Step 1 command again.
Expected: no output.

Run: `grep -rn "studio-branding.md\|no-cms.md\|addons/sanity" .claude/skills/setup CLAUDE.md README.md`
Expected: every hit names a file that exists, or is marked as installed
by the add-on (`studio-branding.md`) or as living in the starter repo
(`addons/sanity/…`).

Run: `npm run format && npm run format:check`
Expected: clean.

- [ ] **Step 11: Final gate**

Run: `npm run check && npm run check:hover && npm run check:boundary && npm run check:config && npm run check:content && npm run check:addon-installer && npm run check:setup`
Expected: 0 errors; each OK.

Run: `KEEP_DEV_PAGES=1 npm run build && npm run check:content-build && node scripts/check-schema.mjs --dist dist/client && node scripts/compare-dist.mjs .parity/files dist/client`
Expected: each OK; `Identical: <n> files.`

Run: `node scripts/check-addon-sanity.mjs --baselines .parity --lockfile /tmp/pr3-package-lock.json`
Expected: `✓ check-addon-sanity: …` (the add-on skill and README changed
in this task; the scratch copy's `format:check` covers them).

Run: `grep -in sanity astro.config.mjs src/layouts/BaseLayout.astro src/middleware.ts; npm ls react sanity @sanity/client @astrojs/react`
Expected: no grep output; `└── (empty)`.

- [ ] **Step 12: Commit**

```bash
git add -A CLAUDE.md README.md AGENTS.md scripts/README.md docs/new-project-checklist.md .claude addons/sanity
git commit -m "Docs for the Sanity add-on: setup branches, CLAUDE.md map, README

The setup skill asks Files or Sanity; no-cms.md is the Files branch;
sanity.md starts with the installer; README's Sanity operations sections
and the migration script docs move into addons/sanity/README.md; the
add-on's sanity-and-preview skill documents the seams, removal and
maintenance.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
