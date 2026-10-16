# PR 1 — Remove the glossary: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete the glossary content type, its routes, and every code, comment,
doc and skill reference to it, leaving the site building green.

**Architecture:** This is a pure deletion. There are no new modules. It is the
first of five PRs in the files-first content spec, and it shrinks the surface
that PR 2 has to move behind the content interface.

**Tech Stack:** Astro 7, Sanity v6 schema, TypeScript.

**Spec:** [docs/superpowers/specs/2026-10-16-files-first-content-design.md](../specs/2026-10-16-files-first-content-design.md) — the "Glossary removal" section.

## Global Constraints

- CLAUDE.md "Renaming anything? Grep the old name before you finish": sort the
  hits into consumers to update, historical notes to keep, and stale
  instructions to rewrite.
- **No historical notes are kept.** Docs must read as if the glossary never
  existed, except the spec and plan files under `docs/superpowers/`.
- `npm run typegen` must be re-run after any schema or GROQ change.
  `sanity.types.ts` and `schema.json` are generated, so never hand-edit them.
- Formatting: run `npm run format` before committing. `BaseLayout.astro` is
  `.prettierignore`d, so edit it by hand.

## Review Focus

1. **Stale links to `/glossary`.** Nav, footer and the `llms.txt` "Optional"
   section must not link to a route that no longer exists. Checked by Task 3's
   grep over `dist/` HTML.
2. **Internal-link annotations.** The Portable Text `internalLink` reference no
   longer accepts `glossaryTerm`, and `resolveInternalLinkHref` drops the case.
   The `switch` must still type-check with no fallthrough.
3. **Prose that reads naturally after the edit.** "Blog, case studies, and
   glossary terms" becomes "blog posts and case studies", not "blog posts, case
   studies, and". Checked during the Task 3 review.
4. **Generated types regenerate cleanly.** After `typegen`, no
   `GLOSSARY_*_RESULT` remains in `sanity.types.ts`.
5. **Redirect for an already-indexed URL.** The starter itself has no indexed
   glossary pages, so no redirect is needed. The PR description says so,
   explicitly.

---

### Task 1: Delete glossary-only files and Sanity wiring

**Files:**

- Delete:
  - `src/pages/glossary/index.astro`
  - `src/pages/glossary/[slug].astro`
  - `src/pages/preview/glossary/[slug].astro`
  - `src/components/templates/GlossaryTermTemplate.astro`
  - `src/styles/pages/glossary.css`
  - `src/sanity/schemaTypes/glossaryTerm.ts`
  - `scripts/migrate-webflow-glossary.mjs`
- Modify:
  - `src/sanity/schemaTypes/index.ts`: remove the import (l.10) and the `types` entry (l.29).
  - `src/sanity/schemaTypes/portableTextConfig.ts`: remove `{ type: "glossaryTerm" }` (l.22); reword the header comment at l.3-6 to "blogPost.ts and caseStudy.ts" / "(blog post or case study)".
  - `sanity.config.ts`: remove `"glossaryTerm"` from the type list (l.47) and the "Glossary Terms" desk list item (l.113-117).
  - `src/sanity/components/studioDocument.ts`: remove the `glossaryTerm: "/glossary"` entry (l.22); comment l.5 becomes "(blog/case-study by slug)".
  - `src/sanity/lib/resolve.ts`: remove the `glossaryTerm: defineLocations(...)` block (l.44-53).
  - `src/sanity/lib/internal-links.ts`: remove the `case "glossaryTerm"` branch (l.36-37).
  - `src/sanity/lib/queries.ts`:
    - Remove `GLOSSARY_TERMS_QUERY`, `GLOSSARY_TERM_QUERY` and `GLOSSARY_SLUGS_QUERY` and their comment blocks (l.~323-377).
    - In the `internalLink.target` projection (l.~92-99), replace `coalesce(title, term)` with `title`, and remove `shortDefinition` from any `coalesce(description, shortDefinition)`, leaving `description`.
  - `src/sanity/lib/page-data.ts`: remove the three `GLOSSARY_*` imports (l.36-38), `loadGlossaryTermPage` (l.~141-167) and `getGlossaryStaticPaths` (l.~310-316).
  - `src/lib/jsonld.ts`: remove `glossaryTermJsonLd` and its doc comment (l.~375-410), plus any type import used only by it (l.3).
  - `src/pages/llms.txt.ts`: remove the `GLOSSARY_TERMS_QUERY` import (l.16), the result type import (l.34), the third `Promise.all` entry (l.86-88, and the `glossary` destructure at l.79), and the "## Glossary" block (l.154-161). Header comment l.6 becomes "blog posts, case studies, and projects".
  - `src/pages/llms-full.txt.ts`: remove every glossary import, fetch, section and Markdown conversion. Run `grep -n -i glossary` for the list; there are 15 hits. Update the header comment the same way.
  - `scripts/check-schema.mjs`: drop the glossary from the `Promise.all` (l.51-59) and the path push (l.66); comment l.42 becomes "blog / case-study templates".
  - `src/data/site-structure.ts`: remove the `/glossary` `PAGES` entry (l.150-155), the `NAV_MENU` entry (l.260) and the `FOOTER_GROUPS` entry (l.304).

- [ ] **Step 1: Capture the baseline**

  Run:

  ```bash
  npm run check && npm run build 2>&1 | tail -5
  ```

  Expected: both pass on the untouched branch. If they fail, stop and report.
  The failure is not caused by this PR.

- [ ] **Step 2: Write the guard that should fail now**

  Run:

  ```bash
  grep -rniE "glossary" src scripts sanity.config.ts astro.config.mjs --exclude-dir=node_modules -l
  ```

  Expected: many hits. This command is the PR's test, and Task 3 requires
  zero output.

- [ ] **Step 3: Delete the files and make the edits listed above.**

- [ ] **Step 4: Regenerate the Sanity types**

  Run:

  ```bash
  npm run typegen
  grep -c -i glossary src/sanity/sanity.types.ts src/sanity/schema.json
  ```

  Expected: `0` for both files.

- [ ] **Step 5: Type-check**

  Run: `npm run check`

  Expected: `0 errors`. Any error that names a removed export points to a
  consumer you missed. Fix it at that consumer; don't re-add the export.

- [ ] **Step 6: Commit**

  ```bash
  git add -A
  git commit -m "Remove the glossary content type, routes and Sanity wiring"
  ```

### Task 2: Reword comments that mention the glossary in passing

**Files (comment-only edits):**

- `astro.config.mjs` l.79: "(blog, case studies, glossary)" becomes "(blog, case studies, projects)".
- `src/sanity/schemaTypes/ctaSection.ts` l.10 and `siteSettings.ts` l.22: "blog posts, case studies, and glossary terms" becomes "blog posts, case studies, and projects".
- `src/sanity/lib/portable-text.ts` l.6: "case studies, and glossary term detail pages" becomes "case study and project detail pages".
- `src/components/sections/SanityCtaSection.astro` l.5: "(blog posts, case studies, glossary terms)" becomes "(blog posts, case studies, projects)".
- `src/components/portabletext/InternalLinkMark.astro` l.6: "(blog post, case study, or glossary term)" becomes "(blog post, case study, or project)".
- `src/layouts/BaseLayout.astro` l.79: drop "glossary, " (hand-format; the file is prettierignored).
- `src/styles/pages/blog-post.css` l.297: "(matches style-guide/glossary pattern)" becomes "(matches the style-guide pattern)".
- `src/pages/components.astro` l.392: "glossary and blog templates use" becomes "blog template uses".
- `workers/rebuild-debounce/src/index.ts` l.6 and `workers/rebuild-debounce/README.md` l.8: "blog / case-study / glossary routes" becomes "blog / case-study / project routes".

- [ ] **Step 1:** Make the edits above. Before saving each one, re-read the
      whole sentence and confirm the grammar still holds (Review Focus 3).
- [ ] **Step 2:** Run the Task 1 Step 2 grep again.

  Expected: no output.

- [ ] **Step 3:** Commit:

  ```bash
  git commit -am "Drop glossary mentions from code comments"
  ```

### Task 3: Update docs and skills, and verify the whole PR

**Files:**

- `README.md` l.33: the route list becomes "`/blog/[slug]`, `/case-studies/[slug]`, and `/projects/[slug]`".
- `scripts/README.md` l.88-101: delete the whole `migrate-webflow-glossary.mjs` section.
- `.claude/skills/component-api/SKILL.md` l.35: remove the glossary mention.
- `.claude/skills/sanity-and-preview/SKILL.md` l.60, 322, 329, 336, 389: remove the glossary rows, routes and examples. Where a list of content types appears, the list is "blog posts, case studies, projects (and gallery items)".
- `.claude/skills/seo-discoverability/SKILL.md` l.22, 116, 118: remove the `glossaryTermJsonLd` rows and the glossary `llms.txt` section mention.
- `.claude/skills/setup/SKILL.md` l.120: "the blog, case studies, and glossary" becomes "the blog, case studies, projects and gallery".
- `.claude/skills/setup/references/sanity.md` l.77, 79, and `no-cms.md` l.13, 41, 64, 84: remove `/glossary` from the route lists. These files are rewritten again in PR 5, so keep the edits minimal.

- [ ] **Step 1:** Make the edits.

- [ ] **Step 2: Run the repo-wide guard**

  Run:

  ```bash
  grep -rniE "glossary" . --exclude-dir={node_modules,dist,.astro,.git} -l | grep -v "^./docs/superpowers/"
  ```

  Expected: no output.

- [ ] **Step 3: Run the full gate**

  Run:

  ```bash
  npm run format && npm run format:check && npm run check:config && npm run check && npm run check:hover && npm run build
  ```

  Expected: all pass.

- [ ] **Step 4: Check that no built page links to the glossary (Review Focus 1)**

  Run:

  ```bash
  grep -rl "/glossary" dist/client | head
  ```

  Expected: no output. This covers the sitemap, `llms.txt` and every page's
  nav and footer.

- [ ] **Step 5: Smoke-test in the browser**

  Run `npm run dev`. Load `/`, `/blog`, `/components`.

  Expected: the nav and footer have no Glossary link, and there are no console
  errors.

  Load `/glossary`.

  Expected: the 404 page.

- [ ] **Step 6: Commit and open the PR**

  ```bash
  git commit -am "Remove glossary from docs and skills"
  ```

  PR title: "Remove the glossary". The PR body:
  - lists the deleted files;
  - notes that no redirect is needed, because the starter has no indexed
    glossary URLs (Review Focus 5);
  - links the spec.
