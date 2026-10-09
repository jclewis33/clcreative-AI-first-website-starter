# Local-Service Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 12 prop-driven local-service page sections, plus the shared pieces they need: a CTA type, a pop-up lead form, ImagePair, ServiceIcon, and `SITE` fields. Also add a dev-only sample home page that stacks them.

**Architecture:**

- Every section is a new `.astro` file in `src/components/sections/` (UtilityBar goes in `global/`).
- Sections compose the starter's `Section` / `Layout` / `Grid` / `Card` / `Heading` / `Text` / `Visual` / `Overlay` / `Button` and the PR #33 building blocks (SectionHeader, StepList, CheckList, ChipList, Quote, SwipeRow, Breadcrumbs).
- Way and demo markup is a _reference_ for structure and CSS, not copied verbatim. The source paths are named per task.

**Tech Stack:** Astro 7.3.2, plain CSS cascade layers, TypeScript.

**Spec:** `docs/superpowers/specs/2026-10-09-local-service-sections-design.md`

## Global Constraints

- **Precondition:** PR #32 (GoHighLevel) and PR #33 (building blocks) are merged into `main`, and this branch is rebased onto `main`. `LeadForm`, `FORMS`, SectionHeader, StepList, CheckList, ChipList, Quote, SwipeRow, Breadcrumbs and `src/lib/projects.ts` must all exist. Run `npm ci` first. node_modules must be Astro 7.3.2.
- CLAUDE.md in full:
  - Naming: custom class first, `_wrap` root, at most 4 utilities.
  - CSS: `<style is:global>` + `@layer components`; no `px`; tokens only; hover styles behind `@media (hover: hover)`; reduced-motion handled.
  - Props: a `docs` prop + `render` prop; named prop types; prop order `docs, render, content, variant, settings, class, ...rest`; DEV `console.warn` (prefixed `[Name]`), never a throw.
  - Content: real alt text, never `alt=""`. Grid columns are `minmax(0, 1fr)`. No margins between Section/Layout children.
- **Every section skips itself (renders nothing, no throw)** when its required content prop is missing or empty. Array props default to `[]`. Warnings check `Astro.props.<name>`, so a default doesn't hide a missing prop.
- **Section props passed straight through:** `theme`, `padding`, `paddingTop`, `paddingBottom`, `id`, `class`, `...rest`. Reuse `PaddingSize` from `Section.astro`; never re-declare the union.
- No client copy in defaults. Default strings are neutral ("Contact us", "Call us"). Phone comes from `SITE.phone` only.
- Section-level `heading` props that accept accent markup are rendered with `set:html`. The JSDoc says `<strong>` = accent.
- Stars use `var(--heading-accent)`. **Ruling vs spec:** there's no new `--rating-star` token, because the OL demo already used the accent colour and adding a token for one use is speculative.
- Per task:
  - `npm run check` (0 errors) and `npm run check:hover` (pass).
  - A `/components` demo with a `COMPONENT_INDEX` entry.
  - A commit whose message ends `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Dev logs:** Astro 7 `astro dev` is a background daemon. Read server output with `npx astro dev logs`, diffing line counts before and after a request.

## Review Focus

1. **Required content missing** (e.g. `<Reviews reviews={[]}>`, `<Hero heading="">`). The section must render nothing, warn in dev, and never throw. This is pinned by the shared bad-props page in each task (the "skip test").
2. **CTA with `modal` set but no matching Modal on the page.** The button must still render as a `<button>` with `data-modal-trigger`, and nothing should crash. LeadFormModal's docs say to place it once. Task 1's CtaButton demo checks both branches.
3. **ServiceArea area names with spaces or capitals** ("Fort Bend"). Chip and map matching must be exact and quoted (`[data-area="Fort Bend"]` via `CSS.escape`). Task 5 uses a two-word area in its demo map.
4. **Hero `background` variant at 390 with a long heading.** No horizontal overflow, and buttons wrap. Task 2's screenshot check.
5. **UtilityBar with `SITE.utilityBar = null`** (the starter default). There must be no empty bar in the DOM. Task 7 asserts `.utility-bar_wrap` is absent by default and present when set.

---

### Task 1: Shared pieces (SITE fields, phone icon, CTA type + button, LeadFormModal, ImagePair, ServiceIcon)

**Files:**

- Modify: `src/config/site.ts`
- Create:
  - `src/assets/icons/phone.svg`
  - `src/lib/cta.ts`
  - `src/components/ui/CtaButton.astro`
  - `src/components/form/LeadFormModal.astro`
  - `src/components/ui/ImagePair.astro`
  - `src/components/ui/ServiceIcon.astro`
  - `src/data/service-icons.json`
- Modify: `src/pages/components.astro`

**Interfaces (produced):**

- `SITE.founded: number | null` (default `null`)
- `SITE.serviceAreas: string[]` (default `["Your City", "Neighboring City", "North County"]`)
- `SITE.reviewsUrl: string` (default `""`)
- `SITE.utilityBar: { text: string; areaLabel?: string } | null` (default `null`)
- `SectionCta` (`@/lib/cta`): `{ label: string; href?: string; modal?: string }`
- `CtaButton`: props `cta: SectionCta`, `variant?: ButtonVariant` (pass-through), `size?`, `class?`. With `modal`, it renders `<Button data-modal-trigger={modal}>`. Otherwise it renders `<Button href={href ?? "#"}>`.
- `PhoneButton`: lives in `CtaButton.astro` as a named variant via the prop `phone: true`. It renders `href={`tel:${SITE.phone.tel}`}`, label `SITE.phone.display`, and the phone icon at `iconPosition="start"`. Usage: `<CtaButton phone variant="secondary" />`.
- `LeadFormModal`: props `id: string`, `formId: FormId`, `heading`, `text?`, `fields?`, `projectOptions?`.
- `ImagePair`: props `images: { src: ImageMetadata | string; alt: string }[]`. Exactly 2 are used; it warns if the count isn't 2.
- `ServiceIcon`: props `name: ServiceIconName`, where `ServiceIconName = keyof typeof ICONS` (from the JSON).

- [ ] **Step 1: Write the shared skip test page**
  - Create `src/pages/skip-test-tmp.astro` (temporary; deleted before each commit and re-created per task).
  - It renders each component under test with missing or invalid required props, e.g. `<ImagePair images={x as any} />`, `<ServiceIcon name={"nope" as any} />`, `<LeadFormModal id={x} formId={x} heading={x} />`, `<CtaButton cta={x} />`.
- [ ] **Step 2: Watch it fail**
  - Run `npm run dev`. Note `npx astro dev logs | wc -l`, curl `/skip-test-tmp`, then diff the new log lines.
  - Expected: the request errors, or the components aren't found (they don't exist yet).
- [ ] **Step 3: Implement**
  - **`SITE` fields:** add them with JSDoc, placed after `founder`. The SITE object is `as const`, so type `utilityBar` explicitly: `utilityBar: null as { text: string; areaLabel?: string } | null`.
  - **`phone.svg`:** a 24×24 stroke handset path, with `fill="none" stroke="currentColor" stroke-width="2"`.
  - **`ServiceIcon`:** copy `~/Documents/GitHub/way-construction/src/components/ui/ServiceIcon.astro`. Then:
    - type from the JSON keys;
    - JSON from Way's `src/data/service-icons.json` minus `fire`, `storm` and `hail`;
    - plus `tools`, `bolt`, `leaf`, `phone` and `check`, as simple 24×24 stroke paths.
  - **`ImagePair`:**
    - `div.image-pair_wrap` with a 2-column grid of `minmax(0,1fr)`, `align-items: start`, gap `--space-3`;
    - each child is a `Visual ratio="portrait"`;
    - the second gets class `image-pair_img is-offset`, styled `margin-top: var(--space-6)`, reset to 0 under `@container (max-width: 35em)` (the wrap is `container-type: inline-size`).
  - **`CtaButton`:**
    - if `phone`, render the phone button;
    - otherwise, if `!cta?.label`, warn and render nothing;
    - otherwise render a Button with `ariaLabel={cta.label}` and either `data-modal-trigger={cta.modal}` or `href={cta.href}`.
  - **`LeadFormModal`:** `<Modal id variant="small" ariaLabel={heading}>` containing `Heading tag="h2" variant="h3"`, an optional `Text`, and `<LeadForm formId id={`${id}-form`} fields projectOptions />`.
- [ ] **Step 4: Watch the skip test pass**
  - Re-curl and diff the logs.
  - Expected: one `[ImagePair]`, `[ServiceIcon]`, `[LeadFormModal]` and `[CtaButton]` warning each; zero `Cannot read properties` lines; HTTP 200.
  - Delete `skip-test-tmp.astro`.
- [ ] **Step 5: Demos**
  - Add `/components` sections `cta-button`, `image-pair`, `service-icon` (all icons in a grid with their names as captions) and `lead-form-modal`.
  - The modal demo: a CtaButton `{label:"Get an estimate", modal:"demo-estimate"}` plus `<LeadFormModal id="demo-estimate" formId="contact" heading="Get a free estimate" />`, and a second CtaButton `{label:"Orphan trigger", modal:"missing-modal"}`. That one must render a button and not crash (Review Focus 2).
  - Browser check: clicking "Get an estimate" opens the dialog, and Escape closes it.
- [ ] **Step 6: Check and commit:** `git commit -m "Add shared section pieces: CTA button, lead form modal, ImagePair, ServiceIcon, SITE fields"`

---

### Task 2: Hero, StatsStrip, PhotoBand

**Files:** create `src/components/sections/{Hero,StatsStrip,PhotoBand}.astro`, and modify `components.astro`.

**References:**

- Way `src/pages/index.astro` hero (lines ~157–212) and `src/styles/pages/home.css` `.home-hero_*` rules.
- clcreative `demo/ace-electric:src/pages/demo/outdoor-living.astro` hero, stats and band sections, plus `src/styles/pages/demo-outdoor-living.css` (`.demo-stats_*`, `.demo-band_wrap`).

**Interfaces:**

- `Hero` props, in prop order:
  - `docs`, `render`
  - content: `eyebrow?`, `heading` (required; HTML), `text?`, `image?: ImageMetadata | string`, `imageAlt?`, `imagePosition?: {x:number;y:number}`
  - `variant?: HeroVariant` (`"background" | "split" | "text"`, default `"background"` when `image` is set, else `"text"`)
  - `primaryCta?: SectionCta`, `showPhone?: boolean` (default `true`), `secondaryCta?: SectionCta`
  - `breadcrumbs?: {label:string; href?:string}[]`, `proof?: {rating?: number; text: string}`, `badge?: {value:string; label:string}`
  - the Section pass-throughs
- `StatsStrip`: `items: {value:string; label:string}[]`, `valueSize?: "number" | "word"` (default `"number"`), `theme` default `"dark"`.
- `PhotoBand`: `image` (required), `alt` (required), `position?`.

- [ ] **Step 1: Skip test (RED).** Bad-props page for the three: `<Hero heading="" />`, `<StatsStrip items={[]} />`, `<PhotoBand image={x} alt="" />`. Expect "component not found" until they exist.
- [ ] **Step 2: Implement Hero**
  - **`background`:**
    - `Section theme="dark" minHeight` with a `Fragment slot="background"` holding `Visual variant="background" priority` and `Overlay variant="gradient" strengthTop={50} strengthBottom={80}`;
    - then `Layout variant="stack"` containing breadcrumbs, the eyebrow (`Heading variant="eyebrow"`), `<Heading tag="h1" variant="display-lg" set:html={heading} />`, `Text variant="large"`, a ButtonWrapper (primary CtaButton, then the phone CtaButton with `variant="secondary"` if `showPhone`, then the secondary CTA), the proof line and the badge.
  - **`split`:** the same content in `Layout ratio="6-6" verticalAlign="center"`, with `<Visual slot="column2" ratio="landscape" priority />` and the badge positioned over the visual.
  - **`text`:** `Layout variant="stack"` with no image.
  - **Proof line:** `p.hero_proof`. With `rating`, it shows five ★ in `span.hero_stars`, with `aria-label={`${rating} out of 5 stars`}` and colour `--heading-accent`, followed by the text.
  - **Badge:** `p.hero_badge` with `span.hero_badge_value` and `span.hero_badge_label`, on the inverted surface (`data-theme-invert`, `background: var(--background)`, `color: var(--text)`), absolutely positioned at bottom-left inside the split visual wrapper (`div.hero_media`). In the `background` variant it's in flow, after the buttons.
  - Warns when `heading` is empty and when `variant !== "text"` but `image` is missing. Skips itself when there's no heading.
- [ ] **Step 3: Implement StatsStrip**
  - `Section theme={theme ?? "dark"} padding="small"` containing `ul.stats-strip_list` (a grid of 4 `minmax(0,1fr)` columns, gap `--space-5`, dropping to 2 columns below `35em` via a container query on `.stats-strip_list`'s wrapper).
  - Each item is `li.stats-strip_item` with `span.stats-strip_value` (font `--font-primary`, size `--h3-size`, or `--h5-size` when `valueSize="word"` via the combo `.stats-strip_list.is-words`; colour `--heading-accent`) and `span.stats-strip_label` (small, `--text` at 70% using `color-mix`).
- [ ] **Step 4: Implement PhotoBand:** `Section padding="none" container="full"` containing `div.photo-band_wrap` (`position: relative; block-size: clamp(11rem, 26vw, 24rem); overflow: hidden`) with `Visual variant="background"`.
- [ ] **Step 5: Skip test (GREEN).** One warning per component, 0 crashes. Delete the temp page.
- [ ] **Step 6: Demos and Review Focus 4**
  - Demos: `hero-background`, `hero-split` (with breadcrumbs, proof `{rating:5,text:"Rated 4.9 by local homeowners"}` and badge `{value:"Since 2009", label:"Family owned"}`), `hero-text`, `stats-strip` (numbers, and a words variant), `photo-band`.
  - Use a heading of about 12 words in `hero-background`.
  - Screenshot at 390 and assert `document.documentElement.scrollWidth === 390`.
- [ ] **Step 7: Check and commit:** `git commit -m "Add Hero, StatsStrip and PhotoBand sections"`

---

### Task 3: ServiceCards, ProcessSteps, StorySplit, IncludedList

**Files:** create `src/components/sections/{ServiceCards,ProcessSteps,StorySplit,IncludedList}.astro`, and modify `components.astro`.

**References:**

- clcreative `outdoor-living.astro` and `ace-electric.astro` (services, process, owner sections).
- `ace-electric/[service].astro` ("What's included", related services).
- Way `index.astro` "Why Way" (lines ~407–452) and `.home-why_*` CSS.

**Interfaces:**

- `ServiceCards`:
  - `eyebrow?`, `heading?`, `intro?`
  - `items: {title:string; text?:string; image?:ImageMetadata|string; imageAlt?:string; href?:string; icon?:ServiceIconName}[]`
  - `layout?: "grid" | "swipe"` (default `"grid"`), `moreLabel?` (default `"Learn more"`, shown only on linked cards)
  - Section pass-throughs
- `ProcessSteps`: `eyebrow?`, `heading`, `text?`, `steps: {title:string; text:string}[]`, `image?`, `imageAlt?`, `variant?: "list" | "cards"` (default `"list"`).
- `StorySplit`: `eyebrow?`, `heading`, `paragraphs: string[]`, `image`, `imageAlt`, `reasons?: {title:string; text:string}[]`, `cta?: SectionCta`.
- `IncludedList`: `eyebrow?`, `heading`, `text?`, `items: string[]`, `images: {src; alt}[]`.

- [ ] **Step 1: Skip test (RED)** for the four, with empty `items` / `steps` / `paragraphs` and a missing `heading`.
- [ ] **Step 2: ServiceCards**
  - The header is `SectionHeader` (rendered only when `heading` is set).
  - `grid`: `Grid largeColumns={3} mediumColumns={2} smallColumns={1} rowGap={6}`. `swipe`: `SwipeRow columns={3} label={heading ?? "Services"}`.
  - Each card is a `Card` with `href`/`ariaLabel` when linked, `<Visual slot="visual" ratio="landscape">` when an image is set, `ServiceIcon` when an `icon` is set and there's no image, `Heading tag="h3" variant="h5"`, `Text small`, and a `moreLabel` span (`.service-cards_more`, colour `--heading-accent`) when linked.
- [ ] **Step 3: ProcessSteps**
  - `list`: `Layout ratio="5-7"`. Column 1 holds eyebrow, heading, text and an optional `Visual ratio="landscape"`; because a ratio'd Visual shares the column, wrap column 1 in `Layout variant="stack"` per CLAUDE.md. Column 2 is `<StepList slot="column2" steps variant="list" />`.
  - `cards`: `SectionHeader`, then `StepList variant="cards"`.
- [ ] **Step 4: StorySplit**
  - `Layout ratio="5-7" verticalAlign="center"`. Column 1 is `Visual ratio="portrait"`. Column 2 is a `Fragment` with the eyebrow, `Heading tag="h2"`, one `Text` per paragraph, the optional reasons grid and an optional `CtaButton variant="text"`.
  - The reasons grid is `Grid largeColumns={2} mediumColumns={2} smallColumns={1} rowGap={5}` of `div.story-split_reason.u-margin-trim` (border-top `--border-width-main solid var(--border)`, padding-top `--space-4`), each with `Heading tag="h3" variant="h6"` and `Text small muted`.
- [ ] **Step 5: IncludedList:** `Layout ratio="6-6" verticalAlign="center"`. Column 1 holds the eyebrow, heading, text and `<CheckList items columns={2} />`. Column 2 is `<ImagePair slot="column2" images />`.
- [ ] **Step 6: Skip test (GREEN)**, then demos `service-cards` (grid with icons, and swipe with images and hrefs), `process-steps` (both variants), `story-split` (with reasons), `included-list`. Check SwipeRow at 390: page `scrollWidth === 390`.
- [ ] **Step 7: Check and commit:** `git commit -m "Add ServiceCards, ProcessSteps, StorySplit and IncludedList sections"`

---

### Task 4: ServiceArea (map ↔ chips) with a sample map

**Files:** create `src/components/sections/ServiceArea.astro` and `src/assets/maps/sample-service-area.svg`, and modify `components.astro`.

**Reference:** Way `src/components/sections/ServiceArea.astro` (structure, CSS and the hover-sync script).

**Interfaces:**

- Props: `eyebrow?` (default `"Where we work"`), `heading` (required), `text?`, `areas?: string[]` (default `SITE.serviceAreas`), `map?: AstroComponentFactory` (an imported SVG component), `mapLabel?`, `images?: {src; alt}[]`, `cta?: SectionCta`, plus Section pass-throughs.
- **Map contract:** each region is an SVG element with `class="service-area_region"` and `data-area="<exact area string>"`.

- [ ] **Step 1: Skip test (RED):** `<ServiceArea heading="" />`, and `<ServiceArea heading="x" areas={[]} />` with neither map nor images. The second must render nothing and warn `[ServiceArea] needs areas, a map, or images`.
- [ ] **Step 2: Sample map**
  - A small hand-made SVG with `viewBox="0 0 400 300"` and 4 simple polygon regions with `data-area="Your City"`, `"Neighboring City"`, `"North County"` and `"Fort Bend"`. "Fort Bend" is two words, for Review Focus 3.
  - Neutral styling, no fills (CSS styles the regions).
  - Add an SVG comment explaining the contract.
- [ ] **Step 3: Implement the section**
  - Port Way's layout: `Layout ratio="5-6"`, with `ChipList` (items `areas.map(a => ({label:a, key:a}))`) in column 1, and in column 2 either the map wrapper with `<Map class="service-area_svg" role="img" aria-label={mapLabel ?? `Map of ${areas.join(", ")}`} />` or `<ImagePair images />`.
  - Region CSS uses `--heading-accent` for fill and stroke (`fill-opacity` .1 rising to .35 when active), not Way's `--button-primary-background`. The active chip uses an inverted surface.
  - **Script:** port Way's `initServiceArea`, but key on `data-area` (chips get `data-key` from ChipList), select with `` `[data-key="${CSS.escape(k)}"], [data-area="${CSS.escape(k)}"]` ``, and add `focusin`/`focusout` alongside `pointerenter`/`pointerleave`, so keyboard focus on linked chips also highlights.
- [ ] **Step 4: Skip test (GREEN).**
- [ ] **Step 5: Demo `service-area`** with the sample map (`areas` = the 4 names), plus a second demo with `images` and no map.
- [ ] **Step 6: Browser check (Review Focus 3)**
  - Hovering the "Fort Bend" chip adds `.is-active` to the `[data-area="Fort Bend"]` region, and the reverse.
  - With `prefers-reduced-motion`, there's no transition.
- [ ] **Step 7: Check and commit:** `git commit -m "Add ServiceArea section with map/chip highlighting and a sample map"`

---

### Task 5: Reviews, LeadFormSection, CallBand, and the CTASection update

**Files:** create `src/components/sections/{Reviews,LeadFormSection,CallBand}.astro`, and modify `src/components/sections/CTASection.astro` and `components.astro`.

**References:**

- Way `index.astro` reviews (lines ~455–507) and `CallBand.astro`.
- clcreative `src/components/demo/DemoReviews.astro` and the estimate section in `outdoor-living.astro`.

**Interfaces:**

- `Reviews`: `eyebrow?`, `heading` (default `"What our customers say"`), `reviews: {text:string; name:string; meta?:string}[]`, `rating?: number`, `count?: number`, `layout?: "featured" | "grid"` (default `"featured"` when there are at least 3 reviews, else `"grid"`), `allReviewsHref?` (default `SITE.reviewsUrl`; hidden when empty), `allReviewsLabel?` (default `"Read all reviews"`).
- `LeadFormSection`: `eyebrow?`, `heading`, `text?`, `formId: FormId`, `fields?`, `projectOptions?`, `showPhone?` (default `true`), `theme` default `"dark"`.
- `CallBand`: `heading`, `text?`, `secondaryCta?: SectionCta` (default `{label:"Contact us", href:"/contact"}`).
- `CTASection` additions: `primaryCta?: SectionCta` and `secondaryCta?: SectionCta`, which win over `buttonText`/`buttonHref` when set. `heading` renders via `set:html`. Existing defaults are unchanged.

- [ ] **Step 1: Skip test (RED):** `<Reviews reviews={[]} />`, `<LeadFormSection heading="" formId={x} />`, `<CallBand heading="" />`.
- [ ] **Step 2: Reviews**
  - Header: `SectionHeader` with the "all reviews" Button in the `action` slot (`newTab`, `target="_blank" rel="noopener"`).
  - Rating badge (when `rating` is set): `div.reviews_rating` with five stars as inline SVG (`aria-hidden`), visible text `{rating} out of 5`, and `Based on {count} reviews` when `count` is set.
  - `featured`: `Grid largeColumns={2} mediumColumns={1}`. The first is `<Card variant="stacked" theme="brand">` holding `<Quote mark="icon" spread>`. The next two are stacked in `div.reviews_stack` as `Card variant="stacked"` + `Quote size="regular" mark="none" spread`. Layout CSS is ported from Way's `.home-review_*`.
  - `grid`: `Grid largeColumns={3} mediumColumns={2} smallColumns={1}` of `Card variant="stacked"` + `Quote size="regular"`.
  - No JSON-LD.
- [ ] **Step 3: LeadFormSection**
  - `Section theme` (dark) containing `Layout ratio="5-7" verticalAlign="start"`.
  - Column 1: eyebrow, `Heading tag="h2"` (`set:html`), text, and when `showPhone`, `Text small muted` "Rather talk now? Call" plus a link to `tel:` showing `SITE.phone.display`.
  - Column 2: `div.lead-form-section_panel` with `data-theme-invert`, `background: var(--background); color: var(--text)`, padding `--space-5`, radius `--radius-main`, holding `<LeadForm formId fields projectOptions id={`${id ?? "lead"}-section`} />`.
- [ ] **Step 4: CallBand.** Port Way's CallBand: dark, `Layout ratio="7-5"`, with `div.call-band_actions` holding `<CtaButton phone fullWidth />` and `<CtaButton cta={secondaryCta} variant="secondary" />`. `max-width: 22rem` is OK in rem.
- [ ] **Step 5: CTASection update.** Add the props with JSDoc. When `primaryCta` is set, render `<CtaButton cta={primaryCta} />` instead of the current primary Button, and the same for secondary. `heading` renders with `set:html` on the existing Heading. Existing callers (`index.astro`, `contact.astro`) must render identically; diff their built HTML before and after.
- [ ] **Step 6: Skip test (GREEN).** Then demos: `reviews` (featured with rating 4.9 and count 127, and grid), `lead-form-section`, `call-band`, and the `cta-section` demo using `primaryCta: {label, modal:"demo-estimate"}`.
- [ ] **Step 7: Check and commit:** `git commit -m "Add Reviews, LeadFormSection and CallBand; CTASection takes SectionCta and accent headings"`

---

### Task 6: UtilityBar in BaseLayout

**Files:** create `src/components/global/UtilityBar.astro`, and modify `src/layouts/BaseLayout.astro` (format by hand; it's `.prettierignore`d).

**Reference:** Way `src/components/global/UtilityBar.astro` and its BaseLayout usage.

**Interfaces:**

- `UtilityBar`: no content props. It reads `SITE.utilityBar`. Props: `docs`, `render`, `class`.
- BaseLayout renders `<UtilityBar />` between `<SkipLink />` and `<Navbar>`.

- [ ] **Step 1: Test (RED) for Review Focus 5**
  - Build, then `grep -c utility-bar_wrap dist/client/index.html` → expect 0 now, and 0 after (`SITE.utilityBar` defaults to `null`).
  - Then temporarily set `utilityBar: { text: "24/7 emergency service", areaLabel: "Serving Your City" }`, build, and grep → expect 1. Before implementation, that's 0, which is the RED.
- [ ] **Step 2: Implement**
  - Port Way's markup and CSS, replacing the hardcoded copy with `SITE.utilityBar.text` and `areaLabel`.
  - Keep the `--none-small` / `--flex-small` desktop/mobile switch.
  - The mobile bar reads `` `${text} · Call ${SITE.phone.display}` ``.
  - Render nothing when `SITE.utilityBar` is null.
- [ ] **Step 3: GREEN.** The temporary SITE value gives 1, then revert it to `null`, which gives 0.
- [ ] **Step 4:** Screenshot `/` at 1440 and 390 with the temporary value on. Do not commit the temporary value.
- [ ] **Step 5: Check and commit:** `git commit -m "Add optional UtilityBar above the nav, driven by SITE.utilityBar"`

---

### Task 7: Sample page, docs and full verification

**Files:**

- Create `src/pages/demo/local-service.astro`.
- Modify `src/config/seo.shared.mjs` (`DEV_ONLY_PATHS` += `"/demo"`).
- Modify `.claude/skills/component-api/references/local-service.md`, `docs/new-project-checklist.md` and `.claude/skills/component-api/SKILL.md`.

- [ ] **Step 1: Sample page**
  - `/demo/local-service` stacks, in order: Hero (background), StatsStrip, ServiceCards, ServiceArea (sample map), ProcessSteps, PhotoBand, StorySplit (with reasons), Reviews, LeadFormSection, the existing FAQ section with 3 items, CallBand, and `LeadFormModal id="estimate"`. Hero and CallBand CTAs open `estimate`.
  - Neutral copy for a fictional "Your Company" remodeler. Placeholder images come from `src/assets/placeholder-images/`, each with real alt text.
- [ ] **Step 2: Dev-only path**
  - Add `"/demo"` to `DEV_ONLY_PATHS`.
  - Build, then verify `dist/client/demo` doesn't exist, and that `/demo` is absent from the sitemap and llms.
- [ ] **Step 3: Docs**
  - `local-service.md` gets a "Sections" table (every section, key props, use when) and a "Composing a page" snippet that mirrors the sample page.
  - The checklist gets the four new SITE fields.
  - SKILL.md's reference row lists the sections.
- [ ] **Step 4: Full verification**
  - `npm ci` (if not done), then `npm run check && npm run check:hover && npm run format && npm run format:check && npm run build`.
  - Screenshot `/demo/local-service` at 1440 and 390, with `scrollWidth` equal to the viewport.
  - Run `grep -rniE "red oak|dfw|, TX\b|texas|way construction|ace electric|stoneridge|outdoor living" src .claude docs | grep -v superpowers/`. Expect no hits apart from the state list in FormSelect.
- [ ] **Step 5: Commit:** `git commit -m "Add local-service sample page and section docs"`

---

### Task 8: Final review and PR

- [ ] Run the final whole-branch review (fresh reviewer, most capable model) with this plan, the spec and the Review Focus.
- [ ] Fix the Critical and Important findings with RED→GREEN, and ledger the minors.
- [ ] Push, then `gh pr create` with a summary, a testing checklist and the deferred minors.
