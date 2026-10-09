# Service Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Data-driven service pages (a content collection, one template, and nav/footer/PAGES generated from it), ContactCards + LinkList, and dev-only contact recipe page.

**Architecture:**

- An Astro content collection of JSON files (`src/content/services/*.json`, schema in `src/content.config.ts` with `image()`) feeds `src/pages/services/[slug].astro`. The template composes PR #34's sections.
- `src/lib/services.ts` holds the async collection helpers.
- A synchronous `import.meta.glob` view of the same JSON files feeds `site-structure.ts`.

**Tech Stack:** Astro 7.3.2 content layer, `astro/zod`, existing section components.

**Spec:** `docs/superpowers/specs/2026-10-09-service-pages-design.md`

## Global Constraints

- **CLAUDE.md in full:**
  - naming, layered CSS, no `px`;
  - docs and render props, named types, DEV warnings, skip when empty;
  - real alt text;
  - hover behind `(hover: hover)`;
  - `@/` imports.
- Branch `feat/service-pages` is cut from `main` (which has PRs #32–#34). Astro must be 7.3.2.
- **No client copy.** The two sample services use neutral placeholder content for "Your Company" (kitchen and bathroom remodeling), following the copy rules in the spec.
- **Each task:**
  - `npm run check` passes with 0 errors.
  - `npm run check:hover` passes.
  - The task ends with a commit whose message ends in `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Dev server:** `npx astro dev --background`. Read logs with `npx astro dev logs`. If it loops or drops logs: `npx astro dev stop; rm -rf node_modules/.vite`, restart, then warm up.

## Review Focus

1. **A broken service JSON** (missing field, unknown icon, missing image, empty alt). It must fail `astro check` or `build` with a readable message. Task 1 tests each case with a temporary entry.
2. **Only one service.** `relatedServices` must return `[]`, not the page itself, and the related row must be omitted. Task 2's helper check covers it.
3. **A service JSON added later.** It appears in the nav, footer, PAGES and the sitemap with no other edit. Task 3 adds a temporary third sample and checks every surface.
4. **Two forms on a service page** (the IncludedList page has no LeadFormSection, but the modal's form and any page form must not share ids). The template uses only the modal, so the check is that the page has no duplicate ids. Task 2 checks it.
5. **ContactCards with an urgent card only, or info cards only.** Each renders alone. Empty cards render nothing. Task 4's skip test covers it.

---

### Task 1: Content collection, schema and two sample services

**Files:**

- Create: `src/content.config.ts`
- Create: `src/content/services/kitchen-remodeling.json`
- Create: `src/content/services/bathroom-remodeling.json`
- Create: `src/content/services/images/*.webp` (copied from `src/assets/placeholder-images/`)
- Create: `src/data/process.ts` (the shared default steps)

**Steps:**

- [ ] **RED.** Create `src/pages/services/collection-test-tmp.astro`, which calls `getCollection("services")` and prints the count. `astro check` fails because there's no collection.
- [ ] **Write the schema.**
  - Schema-in-function form: `schema: ({ image }) => z.object({...})`.
  - `icon` is `z.enum(Object.keys(ICONS) as [ServiceIconName, ...ServiceIconName[]])`, importing ICONS from `../src/data/service-icons.json` with a relative path.
  - Alts are `z.string().min(1)`.
  - `highlights` is `.length(4)`.
  - `faqs` is `.min(2)`.
  - `seoDescription` is `.max(160)`.
  - Every field follows the spec table.
- [ ] **Write the two sample JSON files** with full neutral copy and real alt text.
- [ ] **GREEN.**
  - `npm run check` passes, and the temp page shows count 2.
  - **Review Focus 1:** copy kitchen to `zz-bad-tmp.json` and break one thing at a time: delete `title`, set `icon: "nope"`, point `cardImage` at a missing file, set `cardImageAlt: ""`. Run `npx astro sync` each time and record a readable failure for every case.
  - Delete the bad file and the temp page.
- [ ] **Commit:** "Add services content collection with two sample services".

### Task 2: Helpers and service template

**Files:**

- Create: `src/lib/services.ts`
- Create: `src/pages/services/[slug].astro`

**Steps:**

- [ ] **RED.** `curl /services/kitchen-remodeling` returns 404.
- [ ] **Write the helpers** in `src/lib/services.ts`: `getServices()`, `servicePath()`, `relatedServices()` (**Review Focus 2:** return `[]` when there's only one service, and never return the page itself).
- [ ] **Write the template** with the spec's section order, BaseLayout `breadcrumbs`, `serviceFaqJsonLd` (read its options type first), and LeadFormModal `id="estimate-modal"`.
- [ ] **GREEN.**
  - Both pages return 200 in dev.
  - The page has no duplicate ids (**Review Focus 4**; parse the HTML with a regex `Counter`).
  - The estimate modal opens from the Hero CTA in the browser.
  - The related row links to the other sample.
  - Screenshots at 1440 and 390, with `scrollWidth` equal to the viewport.
- [ ] **Commit:** "Add data-driven service page template".

### Task 3: Nav, footer and PAGES from the services

**Files:**

- Modify: `src/lib/services.ts` (`SERVICE_NAV`)
- Modify: `src/data/site-structure.ts`

**Steps:**

- [ ] **RED.** Build, then grep `dist/client/index.html` for `/services/kitchen-remodeling`. There are 0 matches, because the nav and footer don't list it.
- [ ] **Add `SERVICE_NAV`** using `import.meta.glob("/src/content/services/*.json", { eager: true, import: "default" })`. Map each file to `{ id (from the filename), title, navLabel, order, seoDescription }`, sorted.
- [ ] **Update `site-structure.ts`:**
  - PAGES gets service entries with `group: "service"`.
  - NAV_MENU gets a Services dropdown first.
  - FOOTER_GROUPS gets a Services group first.
- [ ] **GREEN.**
  - The build's home page contains both service paths in the nav and footer.
  - The sitemap lists both.
  - llms.txt has a "Services" section with both.
  - **Review Focus 3:** add a temporary third JSON (copy of kitchen, `"order": 1`), rebuild, and check it appears in the nav, footer, sitemap and llms, and first in order. Then remove it.
- [ ] **Commit:** "Generate Services nav, footer and page registry from the service files".

### Task 4: ContactCards and LinkList

**Files:**

- Create: `src/components/ui/ContactCards.astro`
- Create: `src/components/ui/LinkList.astro`
- Modify: `components.astro` (demos)

**Steps:**

- [ ] **RED.** Skip-test page with bad and empty props.
- [ ] **Implement ContactCards:**
  - The urgent card uses `data-theme="dark"` on its own wrapping class, with `color: var(--text)` and a big `SITE.phone` link.
  - Info cards are on `--background-2` with a border and padding `--space-5`; chips render with ChipList.
  - Cards are a vertical stack with gap `--space-4`.
- [ ] **Implement LinkList:**
  - A `ul` of rows split by a border-bottom.
  - Each row is `a.link-list_link`, a grid of `minmax(0,1fr) auto` holding the title (`--h5-size`), a hint (small, muted) and an arrow SVG with `aria-hidden`.
  - On hover (behind `(hover: hover)`), the arrow moves `0.25rem` and the title turns `--heading-accent`.
  - Reduced motion is honoured.
- [ ] **GREEN.** The skip test passes: dev warnings appear, nothing renders, nothing throws, and urgent-only and info-only each render (**Review Focus 5**). Add demos.
- [ ] **Commit:** "Add ContactCards and LinkList".

### Task 5: Contact recipe, home recipe links, docs, verification

**Files:**

- Create: `src/pages/demo/local-service-contact.astro`
- Modify: `src/pages/demo/local-service.astro` (ServiceCards from `getServices()` with real hrefs, plus `id="services"`)
- Modify: `src/config/seo.shared.mjs` (`DEV_ONLY_PATHS` adds `/demo/local-service-contact`)
- Create: `.claude/skills/component-api/references/service-pages.md`
- Modify: the `component-api` SKILL.md row
- Modify: `docs/new-project-checklist.md`
- Modify: `.claude/skills/seo-discoverability/SKILL.md`

**Steps:**

- [ ] **Build the contact recipe** following the spec layout.
- [ ] **Full verification:**
  - Run `npm run check && npm run check:hover && npm run format && npm run format:check && npm run build`.
  - Neither recipe page is in `dist`; the service pages are.
  - Grep for client names returns nothing.
  - Screenshot the contact recipe at 390 and 1440.
- [ ] **Commit:** "Add contact recipe and service page docs".

### Task 6: Final review and PR

Run the whole-branch review (most capable model), fix the Critical and Important findings with RED→GREEN, push, and `gh pr create`.
