# The no-Sanity branch — a fork without the CMS

**Read this when the fork answered "no" or "not yet" at the CMS gate.** If they
said yes, read [sanity.md](./sanity.md) instead.

## The headline: it already works

The starter ships with `SANITY_PROJECT_ID = "your-sanity-project-id"` and **builds
clean in that state**. This is engineered, not accidental — the helpers in
[page-data.ts](../../../../src/sanity/lib/page-data.ts) detect the placeholder
project id and return `null`/fallback instead of throwing, so:

- `getStaticPaths` enumerates **zero slugs** → no blog/case-study/glossary detail
  pages are emitted.
- The listing pages render their **empty states**.
- The Sanity-fed homepage sections (`SingleTestimonial`, `TestimonialShowcase`,
  `CaseStudyFeatured`) self-erase when they get no data.
- `npm run build` passes and the site deploys to Cloudflare normally.

So "no CMS" is **not** a code-removal prerequisite. A fork can ship a real site —
home, contact, legal pages, the scorecard — without ever creating a Sanity project.

> The guard is deliberately narrow. Once a **real** project id is in place, an
> unreachable dataset **fails the build loudly** on purpose — never ship a deploy
> with the content pages silently missing.

## Ask which of the two they mean

"Not using Sanity" splits into two very different answers. Ask which:

### Option A — Defer ("not yet", "maybe later")

**Recommended default.** Change nothing. Leave the placeholder project id in place,
leave the routes and dependencies alone, and ship.

What to do:

- Skip the whole Sanity branch.
- **Hide the empty content routes from navigation** so visitors don't land on empty
  listings. In [site-structure.ts](../../../../src/data/site-structure.ts), remove
  or comment the `/blog`, `/case-studies`, and `/glossary` entries from the nav
  `PAGES` and from the footer `links` array. The routes still build; they're just
  not linked.
- Tell the user the on-ramp: when they want the CMS later, run `/setup` again and
  answer yes at the CMS gate — the Sanity branch is a self-contained add-on.

Cost: minutes. Risk: none. Nothing is deleted, so nothing has to be rebuilt.

### Option B — Remove it properly ("we will never use a CMS")

A real, bounded refactor. **Only do this if the user explicitly wants the
dependency gone** — for bundle size, for supply-chain surface, or because the
project is a pure brochure site. Confirm before starting; it is not reversible
without a git revert.

**Scope, measured against the current tree — about 64 files deleted and 11
edited:**

| Delete                                                                                 | Count |
| -------------------------------------------------------------------------------------- | ----- |
| `src/sanity/**` (schema, lib, components)                                              | 29    |
| `src/components/portabletext/**`                                                       | 8     |
| Content + preview + draft-mode routes                                                  | 12    |
| Templates (BlogPost, CaseStudy, GlossaryTerm)                                          | 3     |
| Sections (SanityCtaSection, CaseStudyFeatured, SingleTestimonial, TestimonialShowcase) | 4     |
| UI (CaseStudyCard, TestimonialCard)                                                    | 2     |
| React islands (SanityVisualEditing, DisableDraftMode)                                  | 2     |
| Root config (`sanity.config.ts`, `sanity.cli.ts`, `sanity-typegen.json`)               | 3     |

**Edit (Sanity is one concern among several — do not delete these):**

- [BaseLayout.astro](../../../../src/layouts/BaseLayout.astro) — drop the
  `SanityVisualEditing` island and the `perspectiveCookieName` import.
- [middleware.ts](../../../../src/middleware.ts) — drop the Sanity
  `frame-ancestors` CSP entry and the draft-mode cookie handling.
- [astro.config.mjs](../../../../astro.config.mjs) — remove the `sanity()`
  integration, the `cdn.sanity.io` remote image pattern, and the
  `@sanity/astro` vite exclude.
- [package.json](../../../../package.json) — 11 `@sanity/*` + `sanity` +
  `astro-portabletext` deps, and the `studio`, `studio:local`, `typegen` scripts.
- `src/lib/jsonld.ts`, `src/lib/read-time.ts`, `src/pages/llms.txt.ts`,
  `src/pages/llms-full.txt.ts`, `src/pages/components.astro`, `src/env.d.ts`.
- [site-structure.ts](../../../../src/data/site-structure.ts) — remove the
  `/blog`, `/case-studies`, `/glossary` nav and footer entries (as in Option A).

**Order of work:** edit the six mixed files first so nothing imports a deleted
module, then delete, then `npm install` to prune, then run the full CI gate. Expect
`npm run check` to be the thing that finds every straggler — trust it over grep.

**What the site keeps:** home, contact, legal pages (privacy/terms/cookie/
disclaimer), 404, thank-you, the marketing scorecard, the style guide, and every
component that isn't fed by Sanity. That is a complete brochure site.

> **Do not do Option B just because the user said "no CMS" in passing.** Option A
> costs nothing and keeps the door open; Option B is a one-way door. When in doubt,
> take A and say so.

## Either way

- The **rebuild-debounce Worker and the publish webhook are Sanity-only** — skip
  them entirely. Without a CMS there is nothing to publish, so a git push is the
  only thing that should trigger a build.
- `npm run typegen` is Sanity-only — skip it, and note that `npm run check` no
  longer depends on generated types.
- Everything else in the main procedure is unchanged: identity, brand, fonts, type
  scale, assets, photography, the CI gate, and the Cloudflare deploy.

## Done criteria for this branch

- The user chose A or B **explicitly**, and you recorded which.
- Empty content routes are unlinked from nav/footer (both options).
- If B: the full CI gate passes after the removal, and the handoff lists what was
  deleted so nobody goes looking for it later.
