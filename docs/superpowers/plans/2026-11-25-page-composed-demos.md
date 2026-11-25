# Page-Composed Demos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Demos and client sites keep config in `SITE`, repeated content in collections, and page copy in the pages, with `npm run demo` writing only facts and plumbing.

**Architecture:** `site.ts` becomes importable by plain Node. That lets the demo switch, the map settings and the rating move into `SITE`, and `demo.shared.mjs` goes away. Two new collections (`reviews`, `faqs`) and a `process` field on `settings` replace the generated `home.ts`, `process.ts` and `data/faqs.ts`. The preset's pages become composed pages, installed once and never overwritten. Every demo branch in the private demos repo is then converted to the same model, and the whole-page templates are deleted once none uses them.

**Tech Stack:** Astro 7 content collections (zod), Node 26 scripts (`node:assert`), the starter's check scripts.

**Spec:** `docs/superpowers/specs/2026-11-25-page-composed-demos-design.md`

**Depends on:** PR #113 (Stacki slot and MDX fixes). Branch this work from `lumos-fixes-and-stacki-config` so it can start before #113 merges; open its PR after #113 merges.

## Global Constraints

- Node 26. `site.ts`'s only runtime import is `./site.shared.mjs`. Every other import is `import type`.
- Every new collection: one JSON file per entry, schema errors name the file and field (`checked()` loader), reader in `src/lib/<name>.ts` like `src/lib/services.ts`.
- Reviews: `rating` is 4 or 5. No review is ever invented. The rule lives in the demo skill and the schema can't prove it.
- No prospect names anywhere in the starter (public repo): code, comments, docs, commits, PRs.
- Composed pages: literal props, images imported in the page. No data objects passed into sections, no conditional slotted elements (CLAUDE.md Stacki rules).
- `npm run demo` never overwrites a file in `src/pages/` that already exists.
- After every task: `npm run check`, `npm run check:hover` (if Props changed), `npm run format:check`, `npm run build`, `npm run check:links`.

## Review Focus

- **An old-format `demo.json` (with `home` or `audience`):** every demo branch is converted in Task 8, but an old file can still turn up (an old checkout, a copied example). Expected: `npm run demo` fails with one message saying to convert. Never a half-written site. Test in Task 6.
- **Re-running `npm run demo` after hand-editing a page:** expected to leave `src/pages/*` byte-identical. Test in Task 6.
- **A town removed from `SITE.serviceAreas` that a region file still lists:** expected to be a build error naming the region file and `towns`. Test in Task 2.
- **`npm run map` offline, or OpenStreetMap not finding a town:** expected to keep the existing cache, warn naming the town, and exit 0. The build only warns. Test in Task 2.
- **A real site (`SITE.demo: null`):** expected to have no banner, no noindex, a sitemap, and nothing hidden from the nav. Test in Task 1.

---

### Task 1: The demo switch moves into `SITE`

**Files:**

- Modify: `src/config/site.ts` (add `demo`), `src/config/seo.shared.mjs`, `src/lib/leads.ts`, `src/data/site-structure.ts`, `scripts/demo.mjs`, `scripts/check-demo.mjs`, `scripts/check-config-sync.mjs`, `package.json` (`engines.node` to `>=26`)
- Delete: `src/config/demo.shared.mjs`
- Docs: `CLAUDE.md` (file map line naming `demo.shared.mjs`), `docs/demo-mode.md`

**Interfaces:**

- Produces: `SITE.demo: DemoConfig | null`, with `interface DemoConfig { slug: string; prospect: string; preset: string; hiddenPaths: string[]; bannerText: string; bannerHref: string }` exported from `site.ts`. The value lives in `site.ts`, the same shape `DEMO` has today.
- Produces: `scripts/demo.mjs` writes `demo: { … }` into `site.ts` with the same regex-patch approach it uses for the other `SITE` fields.

- [ ] **Step 1: Add the failing checks.**
  - **`check-config-sync.mjs`:** a case that runs `node -e 'import("./src/config/site.ts")'` and asserts exit 0. That is the plain-Node import guard, with a failure message naming the rule from Global Constraints.
  - **`check-demo.mjs`:**
    - Replace the `demo.shared.mjs` reads with `assert.match(read("src/config/site.ts"), /demo: \{\s*slug: "brightline-electric"/)`.
    - Assert `!fs.existsSync("src/config/demo.shared.mjs")`.
    - After building the starter itself with `demo: null`, assert `robots.txt` has no `Disallow: /`, `sitemap-index.xml` exists, and the home page has no "Built for" banner.
- [ ] **Step 2: Run `npm run check:config && npm run check:demo`.** Expected: FAIL. The import guard passes already; the demo assertions fail.
- [ ] **Step 3: Implement.** Move `DEMO` into `SITE.demo`. Each consumer imports `SITE` from `site.ts`: `seo.shared.mjs` uses a relative `./site.ts` import, which works in `astro.config.mjs` and plain Node. Update the `demo.mjs` writer and remove `demo.shared.mjs`. `grep -rn "demo.shared\|DEMO\b" src scripts presets CLAUDE.md .claude docs` must show only historical notes.
- [ ] **Step 4: Run all checks** (Global Constraints, plus `check:config`, `check:demo`, `check:setup`). Expected: PASS.
- [ ] **Step 5: Commit** `SITE.demo replaces demo.shared.mjs`.

### Task 2: Map settings in `SITE`, `npm run map`, region towns checked

**Files:**

- Modify: `src/config/site.ts` (add `serviceRadius`, `rating`), `src/lib/service-area-geo.ts`, `src/components/sections/ServiceArea.astro`, `src/content.config.ts` (serviceAreas schema), `scripts/lib/service-area-geo.mjs`, `scripts/demo.mjs` (map step calls the shared function), `package.json` (`"map": "node scripts/map.mjs"`)
- Create: `scripts/map.mjs`
- Generated (committed, never hand-edited): `src/data/service-area-geo.json`, `src/data/service-radius.json`, `src/data/service-area-geo.cache.json`
- Test: `scripts/check-content-validation.mjs` (region case), `scripts/check-map.mjs` (new; add to `package.json` as `check:map`)

**Interfaces:**

- Produces: `SITE.serviceRadius: { center: string; miles: number } | null` and `SITE.rating: SiteRating | null`, with `export interface SiteRating { value: number; count: number; source: "google" | "facebook" | "yelp" }` in `site.ts`.
- Produces: `export async function buildMap({ areas, radius, region, cacheFile, warn }): Promise<{ geo: unknown[]; radius: { lat: number; lng: number; miles: number } | null }>` in `scripts/lib/service-area-geo.mjs`. Both `map.mjs` and `demo.mjs` call it. Cache hits need no network.
- Consumes: `SITE.demo` from Task 1, unchanged here.

- [ ] **Step 1: Write the failing tests.**
  - **`check-content-validation.mjs`:** add a case `{ name: "region names a town not in SITE.serviceAreas", … }`. It writes a `zz-check` region whose `towns` include `"Nowhere Town"` and expects `["zz-check", "towns", "Nowhere Town", "SITE.serviceAreas"]`.
  - **`check-map.mjs`:** with a fixture cache holding the three default towns, run `node scripts/map.mjs` with `MAP_OFFLINE=1` and assert:
    - exit 0;
    - `service-area-geo.json` has 3 entries;
    - one extra town not in the cache prints a warning naming it and still exits 0, keeping the 3.
- [ ] **Step 2: Run `npm run check:content` and `npm run check:map`.** Expected: both FAIL.
- [ ] **Step 3: Implement.**
  - **Region check:** a `superRefine` on the `serviceAreas` schema that compares each `towns` item with `SITE.serviceAreas` (`content.config.ts` imports `SITE` from `./config/site`).
  - **`buildMap`:** extract it from the map block in `demo.mjs` (section "1a'").
  - **`map.mjs`:** reads `SITE` and writes the three generated files. `MAP_OFFLINE=1` skips the network.
  - **Radius:** `ServiceArea` and `service-area-geo.ts` read the radius from the generated `service-radius.json`, as today. Only its source moves to `SITE.serviceRadius`.
  - **Build warning:** a town without an outline is a DEV `console.warn` prefixed `[ServiceArea]`.
- [ ] **Step 4: Run the checks.** Expected: PASS. Then `npm run map` against the real network once, and confirm the starter's 3 towns draw on `/contact`.
- [ ] **Step 5: Commit** `Map settings in SITE; npm run map; region towns checked`.

### Task 3: `reviews` collection

**Files:**

- Modify: `src/content.config.ts` (add `reviews`), `src/components/sections/ReviewCards.astro` and `Reviews.astro` (accept the view model below)
- Create: `src/lib/reviews.ts`, `src/content/reviews/` (3 neutral sample reviews, clearly placeholder names)
- Test: `scripts/check-content-validation.mjs`

**Interfaces:**

- Produces: the schema `{ name: string; rating: 4 | 5; text: string; full?: string; date?: string; platform: "google" | "facebook" | "yelp" | "angi" | "nextdoor" | "thumbtack" | "bbb"; services?: reference("services")[]; featured: boolean (default false); order: number (default 100) }`.
- Produces: `getReviews(opts?: { service?: string; limit?: number }): Promise<Review[]>` in `src/lib/reviews.ts`. It sorts featured first, then `order`. With `service`, reviews tagged with that service come first, then the rest. `Review` is the parsed entry data plus `id`.
- Produces: `getRating(): SiteRating | null` returns `SITE.rating`.

- [ ] **Step 1: Write the failing cases** in `check-content-validation.mjs`:
  - `rating: 3` expects `["zz-check", "rating"]`;
  - `services: ["no-such-service"]` expects `["zz-check", "services", "no-such-service"]`;
  - `platform: "myspace"` expects `["zz-check", "platform"]`.
- [ ] **Step 2: Run `npm run check:content`.** Expected: FAIL (no collection).
- [ ] **Step 3: Implement** the collection with the `checked()` loader and `filesIn(DIR.reviews, "json", …)`, then `src/lib/reviews.ts`. `ServicePage` reads `getReviews({ service: id, limit: 6 })` instead of `s.reviews`. Drop `reviews` from the services schema and its sample files.
- [ ] **Step 4: Run `check:content`, `check:hover` and `build`.** Expected: PASS. The service pages show the sample reviews.
- [ ] **Step 5: Commit** `reviews collection`.

### Task 4: `faqs` collection and site-wide process steps

**Files:**

- Modify: `src/content.config.ts` (add `faqs`; add `process` to `settings`), `src/content/settings.json`, `src/components/sections/FAQ.astro`, `src/components/templates/ServicePage.astro`, `ServicePageEstate.astro`, `src/pages/components.astro`
- Create: `src/lib/faqs.ts`, `src/content/faqs/` (the current `generalFaqs` samples, one file each)
- Delete: `src/data/faqs.ts` (move its `FAQItem` type to `src/lib/faqs.ts`), `src/data/process.ts`
- Test: `scripts/check-content-validation.mjs`

**Interfaces:**

- Produces: the `faqs` schema `{ question: string; answer: string; order: number (default 100) }` and `getFaqs(): Promise<FAQItem[]>`.
- Produces: `settings.process?: { heading: string; text?: string; steps: string[] (min 2) }` and `getProcess(): Promise<Process | null>` in `src/lib/faqs.ts`. It sits beside FAQs because both are site-wide copy read by the same pages; rename the file `site-copy.ts` if a reviewer prefers.

- [ ] **Step 1: Write the failing cases:**
  - an FAQ with an empty `question` expects `["zz-check", "question"]`;
  - `settings.process.steps` with one item expects `["settings.json", "process", "steps"]`.
- [ ] **Step 2: Run `npm run check:content`.** Expected: FAIL.
- [ ] **Step 3: Implement.** `grep -rn "data/faqs\|data/process\|DEFAULT_PROCESS\|generalFaqs" src scripts presets` must come back empty, apart from `scripts/demo.mjs`, which Task 6 handles.
- [ ] **Step 4: Run the checks and the build.** Expected: PASS. The `/components` FAQ demo is unchanged.
- [ ] **Step 5: Commit** `faqs collection; process steps in settings`.

### Task 5: Composed starter pages

**Files:**

- Rewrite: `presets/local-service/index.astro`, `about.astro`, `contact.astro`, `reviews.astro`, `audience.astro`
- Modify: `presets/local-service/README.md`

**Interfaces:**

- Consumes: `getServices()` (`src/lib/services.ts`), `getReviews`/`getRating` (Task 3), `getFaqs`/`getProcess` (Task 4), and `SITE` (Tasks 1–2).
- Produces: pages with no import of `@/data/home`, `@/data/audience` or any `LocalService*` template.

- [ ] **Step 1: Write the failing test.** Add a check to `check-demo.mjs` that greps the five preset files for `@/data/home|@/data/audience|LocalService(Home|Showcase|Estate|About|Contact|Audience|Reviews)` and asserts no match.
- [ ] **Step 2: Run `npm run check:demo`.** Expected: FAIL.
- [ ] **Step 3: Write each page** as the contractor layout's section order, from the demo skill's "Page flow":
  - **Order:** hero, services, symptoms, reviews, map, how it works, story, comparison, lead form, FAQ, call band.
  - **Copy:** neutral example copy written as literal props, images imported from `src/assets/placeholder-images/`.
  - **Collections:** services, reviews, FAQs and process come from the collections; the phone and towns come from `SITE`.
  - **README:** says these are a scaffold to redesign per business, not a template.
- [ ] **Step 4: Run the checks.** Expected: PASS. Then `npm run check:demo`: the fixture demo still builds. Its own copy is now the scaffold copy, so update the fixture assertions that read home copy (`/your first service call/`) to assert facts from `site.ts` and collections instead.
- [ ] **Step 5: Commit** `Composed starter pages`.

### Task 6: `npm run demo` writes facts and plumbing only

**Files:**

- Modify: `scripts/demo.mjs`, `presets/local-service/preset.mjs` (schema), `presets/local-service/fixture/demo.json`, `scripts/check-demo.mjs`

**Interfaces:**

- Consumes: Tasks 1–4 file shapes.
- Produces: the `demo.json` shape without `home` and `audience`, with new top-level `reviews: Review[]`, `faqs: { question; answer }[]`, `process?`, `rating?` and `serviceRadius?` (the existing field, now written to `SITE`).

- [ ] **Step 1: Write the failing tests** in `check-demo.mjs`:
  - **Old format rejected:** a `demo.json` with a `home` key exits 1, with stderr matching `/demo.json has "home": page copy now lives in the pages/`, and the tree is unchanged.
  - **Pages never overwritten:** after one run, append `<!-- hand edit -->` to `src/pages/index.astro`, run again, and assert the edit is still there and `tree()` is otherwise unchanged.
  - **Collections written:** after a run, `src/content/reviews/*.json` count equals `fixture.reviews.length`, and `src/data/home.ts` does not exist.
- [ ] **Step 2: Run `npm run check:demo`.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **Remove** steps 1a (home photos), 3d (audience), 4 (home and process data) and the `demo/pages` install.
  - **Install pages:** preset pages are copied only `if (!exists(target))`.
  - **Write collections:** `reviews` and `faqs` files, `settings.process`, and `SITE.rating`/`SITE.serviceRadius`.
  - **Map:** the map step calls `buildMap`.
  - **Old format:** fail fast on `home`/`audience` keys with the message above.
- [ ] **Step 4: Run `check:demo`, `check:setup` and `build`.** Expected: PASS.
- [ ] **Step 5: Commit** `npm run demo writes facts and plumbing only`.

### Task 7: Docs and skills

**Files:**

- Modify:
  - `.claude/skills/demo/SKILL.md` (workflow steps 2–6, "Building from an approved design", "When a prospect signs");
  - `.claude/skills/content-files/SKILL.md` (reviews, faqs, settings.process);
  - `.claude/skills/component-api/references/local-service.md` and `service-pages.md` (any `home.ts`/`HOME` mention);
  - `docs/demo-mode.md` ("When a prospect signs");
  - `docs/editing-content.md` (table rows for reviews, faqs);
  - `CLAUDE.md` (file map; the content view-model note).

- [ ] **Step 1: List the stale references.** `grep -rn "home\.ts\|HOME\b\|demo/pages\|demo\.shared\|data/faqs\|data/process\|\"home\"" .claude docs CLAUDE.md presets` lists every stale instruction. Each must be rewritten or marked historical.
- [ ] **Step 2: Write the new demo flow.**
  - **The steps:** research, then write `demo.json` (facts, services, regions, reviews, FAQs), then `npm run demo`, then design and compose each page in `src/pages/` with copy written in the page, then the check-and-fix loop.
  - **Signing:** push `demo/<slug>` as `main` of the client's repo, set `SITE.demo = null`, run `/setup`, clear `confirmOrCut`.
  - **Keep the rest:** keep every existing rule in the skill (copy, photos, quality bar) as is.
- [ ] **Step 3: Rerun the Step 1 grep.** Expected: no stale hits. Then `npm run format:check`.
- [ ] **Step 4: Commit** `Docs and skills: page-composed demos`.

### Task 8: Convert every demo branch (private demos repo, not the starter)

Repeat this task once per branch in `git branch -r --list 'origin/demo/*'` (six today). Use one subagent per branch, the most recent branch first, since it already composes its own pages. Never name a branch or prospect in the starter.

**Files (per branch):** `demo/demo.json`, `src/pages/*.astro`, `demo/pages/` (deleted once moved), any builder script beside `demo.json` (stops emitting `home`/`audience`)

**Interfaces:**

- Consumes: the starter branch holding Tasks 1–7 (merged into the demo branch as `upstream/<that branch>`, or `upstream/main` once merged), and the `demo.json` shape from Task 6.
- Produces: a demo branch with no import of `@/data/home`, `@/data/audience` or any `LocalService*` template. Task 9 depends on this for every branch.

- [ ] **Step 1: Snapshot the current site.** Check out the branch, run `npm run build`, and copy `dist/client` to a scratch baseline folder outside the repo.
- [ ] **Step 2: Merge the starter.** On a conflict in a generated file (`src/config/site.ts`, `src/data/preset-pages.ts`, `src/data/site-structure.ts`), take the demo's side, then let Step 4 regenerate it. On a conflict in `src/pages/*`, take the demo's side.
- [ ] **Step 3: Compose the pages.**
  - **Which pages:** every page the branch renders from a template or `HOME`/`AUDIENCE`: home, about, contact, reviews, and the audience page if it has one.
  - **How:** write each as a composed page in `src/pages/` that reproduces its current output. Use the same sections in the same order with the same props, copy written as literal props, and images imported in the page from `src/assets/demo/`.
  - **Where to read the current values:** the template the page used (`LocalServiceHome`, `LocalServiceShowcase` or `LocalServiceEstate` for the home page, by `home.layout`) and the branch's `src/data/home.ts`.
  - **Existing hand-built pages** (`demo/pages/*.astro`) move into `src/pages/`, with their `HOME.*` reads replaced the same way.
- [ ] **Step 4: Convert `demo.json`.** Remove `home` and `audience`. Move their reviews, FAQs, process steps and rating into the Task 6 top-level keys, word for word. Run `npm run demo` once, then delete `src/data/home.ts` and `src/data/audience.ts` if they are still there.
- [ ] **Step 5: Compare against the snapshot.** Run `npm run build`, then `npm run visual:diff -- --base <baseline> --head dist/client`. Expected: no visual differences on any page. Fix every difference, then run it again.
- [ ] **Step 6: Run the demo checks.**
  - `check:links`, `check:content-build`, `check:budget`;
  - the demo skill's width sweep (320–1440) on every page;
  - `grep -rn "@/data/home\|@/data/audience\|LocalService" src` comes back empty;
  - the Stacki slot scan (no conditional slotted elements).
- [ ] **Step 7: Commit and push** `Convert to page-composed demo` on that branch. Its preview redeploys.
- [ ] **Step 8: Check the preview.** Open the preview URL. The banner shows, `x-robots-tag: noindex` is set, and one test lead still arrives (the demo skill's step 8).

### Task 9: Delete the whole-page templates

**Precondition:** Task 8 is done for every branch in `git branch -r --list 'origin/demo/*'`. Confirm with the Task 8 Step 6 grep on each branch.

**Files:**

- Delete: `src/components/templates/LocalService{Home,Showcase,Estate,About,Contact,Audience,Reviews}.astro`, `src/lib/local-service-home.ts`, `src/lib/local-service-audience.ts`, `src/data/local-service-sample.ts`
- Modify: any import left behind (found by grep)

- [ ] **Step 1: Check nothing still uses them.** `grep -rn "LocalService\(Home\|Showcase\|Estate\|About\|Contact\|Audience\|Reviews\)\|local-service-home\|local-service-audience\|local-service-sample" src presets scripts .claude docs` should list only the files being deleted and historical notes.
- [ ] **Step 2: Delete them**, then run all checks plus `check:demo`. Expected: PASS.
- [ ] **Step 3: Commit** `Remove whole-page local-service templates`.
- [ ] **Step 4: Merge into every demo branch.** Merge this into each demo branch, then build and push each one. Expected: every demo builds unchanged.
