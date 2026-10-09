# Service pages and page recipes — design

Sub-project 4 of the starter-template roadmap. It builds on PR #34's
local-service sections, which are merged.

## Goal

Make a client site's service pages a data job:

- one data file per service;
- one template that renders every service page;
- the Services nav dropdown, footer, sitemap and llms.txt all generated from
  the same files.

It also adds the contact-page pieces deferred from sub-project 3, plus
dev-only home and contact recipes to copy.

**Success means:**

1. Adding a service means adding one JSON file. It then appears at
   `/services/<slug>`, in the Services dropdown, the footer, the sitemap and
   llms.txt, with no other edits.
2. A broken service file fails the build with a clear message. Causes include
   a missing field, a bad icon name or a missing photo.
3. The starter ships two placeholder sample services, live in its nav as
   Casey agreed. Forks replace them.
4. `npm run check`, `check:hover`, `format:check` and `build` all pass.

## Decisions (agreed with Casey)

- **Storage:** an Astro content collection. JSON entries live in
  `src/content/services/`, validated by a Zod schema in
  `src/content.config.ts`, with photos referenced through the schema's
  `image()` helper.
- **Samples:** two sample services stay live in the starter's nav.
- **Recipes:** the starter's own `/` and `/contact` are unchanged. The
  recipes are dev-only pages under `/demo/`.

## Data model

`src/content.config.ts` defines a `services` collection:

```ts
loader: glob({ pattern: "*.json", base: "./src/content/services" });
```

Each entry's id is its filename, and the id is the URL slug.

Images live next to the data, in `src/content/services/images/`, and the
JSON references them by relative path (e.g. `"./images/kitchen-hero.webp"`).

| Field                        | Type                                                                    | Rendered as                                                       |
| ---------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `title`                      | string                                                                  | Page `<title>` base, breadcrumb, card title                       |
| `navLabel`                   | string?                                                                 | Dropdown/footer label (default `title`)                           |
| `order`                      | number (default 100)                                                    | Sort order in nav, footer and related cards                       |
| `seoTitle`, `seoDescription` | string (description ≤ 160 chars)                                        | `<title>`, meta description, PAGES `desc`                         |
| `cardText`                   | string                                                                  | Related-services card text                                        |
| `cardImage`, `cardImageAlt`  | image(), string                                                         | Related-services card photo                                       |
| `icon`                       | ServiceIconName?                                                        | Card icon when there's no card photo                              |
| `hero`                       | `{ eyebrow, heading, text, image, imageAlt }`                           | Hero (split, breadcrumbs)                                         |
| `highlights`                 | `{ value, label }[]` (exactly 4)                                        | StatsStrip                                                        |
| `scope`                      | `{ heading, intro?, items: { title, text, icon? }[] }`                  | ServiceCards "what we do"                                         |
| `included`                   | `{ heading, text?, items: string[], images: [{src, alt}, {src, alt}] }` | IncludedList                                                      |
| `process`                    | `{ heading, steps: { title, text }[] }?`                                | ProcessSteps (default: the shared steps in `src/data/process.ts`) |
| `reviews`                    | `{ text, name, meta? }[]?`                                              | Reviews (section omitted when empty)                              |
| `faqs`                       | `{ question, answer }[]` (2 or more)                                    | FAQ section and FAQPage JSON-LD                                   |
| `cta`                        | `{ heading, text? }`                                                    | CallBand                                                          |

**Validation notes:**

- `icon` is validated against the keys of `src/data/service-icons.json`, so a
  typo fails the build.
- Every `*Alt` field must be a non-empty string; an empty alt fails the build.

## Shared helpers (`src/lib/services.ts`)

- `getServices()` returns every service sorted by `order`, then `title`.
- `servicePath(id)` returns `/services/${id}`.
- `relatedServices(id, n = 3)` returns the next `n` services after this one,
  wrapping round, so every page links onward.
- `SERVICE_NAV`: the synchronous version used by `site-structure.ts`. It
  reads the JSON files with `import.meta.glob(…, { eager: true })` and takes
  only the id, title, navLabel, order and seoDescription.
  - `site-structure.ts` is only ever imported through Vite (pages,
    components, the llms endpoints), so the glob is safe there.
  - It reads the same files as the collection, so the two can't disagree.

## Template: `src/pages/services/[slug].astro`

The page is prerendered, with `getStaticPaths` built from `getCollection`.
Sections, in order:

1. **Hero:** `variant="split"`, with breadcrumbs Home → Services → title. The
   primary CTA opens the estimate modal.
2. **StatsStrip:** the `highlights`.
3. **ServiceCards:** the `scope` items, with icons.
4. **IncludedList.**
5. **ProcessSteps:** the service's own steps, or the shared default.
6. **Reviews:** only when present.
7. **FAQ:** the `faqs`.
8. **ServiceCards**, `layout="swipe"`, `theme="dark"`: "Related services",
   the next 3 services.
9. **CallBand:** its secondary CTA opens the estimate modal.
10. **LeadFormModal** (`id="estimate-modal"`, `formId="contact"`,
    `fields="quote"`). Its project options are the service titles.

**Schema:**

- BaseLayout `breadcrumbs`, set to the same trail as the Hero.
- `schema={serviceFaqJsonLd({ pageUrl, serviceType: title, name: title,
description: seoDescription, areaServed: SITE.areaServed, faqs })}`.
  Check the helper's real signature first.

There is no `/services` index page in this sub-project. The Services
breadcrumb links to `/#services`, the home page's services section.

**Ruling for the spec:** a `/services` index is a small follow-up if Casey
wants one. The breadcrumb target is a single constant.

## Site structure

`src/data/site-structure.ts`:

- **PAGES:** append one entry per service from `SERVICE_NAV`, with
  `group: "service"`. llms.txt already lists `SERVICE_PAGES`.
- **NAV_MENU:** a `{ label: "Services", children: [...service paths] }`
  dropdown placed first.
- **FOOTER_GROUPS:** a "Services" group first, listing every service path.

## Contact-page pieces (`src/components/sections/`)

- **`ContactCards`:**
  - one optional urgent card (`urgent: { heading, text }`) on the dark theme,
    with the big `SITE.phone` call link;
  - then info cards (`cards: { heading, body?, chips?: string[] }[]`, where
    `chips` renders with ChipList);
  - a vertical stack, so it fits in a contact page's narrow column;
  - not a section on its own: it's a component placed in a Layout column, so
    it lives in `src/components/ui/ContactCards.astro`.
- **`LinkList`** (`src/components/ui/`):
  - `items: { title, text?, href }[]`;
  - each row shows a title and a hint, with an arrow that nudges on hover
    (behind `@media (hover: hover)`);
  - the "not sure what to ask for?" service list.

Both follow the CLAUDE.md component checklist: docs and render props, dev
warnings, skip when empty, `/components` demos.

## Recipes (dev-only)

- `/demo/local-service` (home) gets an `id="services"` anchor on its
  ServiceCards, which now link to the real sample service pages. It's
  already dev-only.
- New `/demo/local-service-contact`:
  1. Hero (text variant, with breadcrumbs).
  2. Layout 7-5: LeadForm in a panel on the left; ContactCards on the right
     (an urgent card, a service-areas chips card and an hours card from
     `SITE.hours`).
  3. ProcessSteps (cards variant), titled "What happens next".
  4. Layout 5-7: a "Not sure what to ask for?" LinkList of the services.
  5. FAQ.

  It's added to `DEV_ONLY_PATHS` as `/demo/local-service-contact`. Each
  sample page gets its own entry, never the whole `/demo`.

## Docs

- New `.claude/skills/component-api/references/service-pages.md` covering:
  - adding a service, step by step;
  - a field guide (the table above);
  - the ACE copy rules (each page is written, not templated; customer as
    hero; specific trade nouns; confirm or cut; no em dashes in visible
    copy; numbers as digits);
  - image guidance: WebP, about 2000px wide for heroes and 1400px otherwise;
  - the recipe pages.
- The `component-api` SKILL.md reference table gets the new row.
- `docs/new-project-checklist.md` gets "Replace the two sample services in
  `src/content/services/`".
- `seo-discoverability`: service pages are generated from the collection, so
  there's no manual PAGES step for them.

## Out of scope

- Location / city pages.
- A `/services` index page (see the ruling above).
- Sanity-editable services.

## Verification

- `npm run check`, `check:hover`, `format:check` and `build`.
- The build has `/services/<each sample>`. The sitemap lists them, and llms.txt
  lists them under "Services".
- Bad-data test: in a temporary entry, a missing required field, an unknown
  icon or a missing image path each fail `astro check` or the build with a
  readable message.
- The dropdown shows both samples. The footer has a Services group. The
  related-services swipe row links between the two samples.
- Screenshots of a service page and the contact recipe at 1440 and 390, with
  no horizontal overflow.
- The estimate modal opens from the Hero and the CallBand on a service page.
