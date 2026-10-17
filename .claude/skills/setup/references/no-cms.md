# The Files branch — content in the repo

**Read this when the fork keeps content in files (the default).** If it
chose Sanity, read [sanity.md](./sanity.md) instead.

## The headline: it already works

Content lives in `src/content/`: one MDX file per blog post, one JSON file
per case study, project, service, testimonial, author and CTA, plus
`gallery.json` and `settings.json`, with photos in the folders' `images/`.
Every file is validated when the site syncs and builds: a missing photo,
empty alt text, a bad category or a reference to an entry that doesn't
exist fails the build, naming the file and the field. The starter ships
sample content in all of them, so every content page renders from the
first build.

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
