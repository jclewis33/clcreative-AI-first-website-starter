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
(`npm run check:addon`) installs it into a scratch copy of the repo and
runs the checks and builds there; `--keep` leaves the copy for working
in. Edit there, run
`npm run typegen` there after a schema or query change, and copy the
changed files back under `files/`. CI runs the same script on every PR.
