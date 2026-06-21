# Strip to Starter — removing Your Company pages & content

How to turn a fresh clone of this repo into a **clean, content-free starter** that
still builds and keeps the entire design system. This is a **one-time** pass that
produces the canonical starter; each real project later runs `/setup` (or
`npm run setup`) to brand it and stand up its own Sanity project.

## When & where

- **Do this in the new starter repo** (e.g. `your-starter-repo`),
  after cloning with fresh history — **not** on the production `your-worker-name` repo.
- **End state:** all components / layouts / styles / CMS templates intact, no CL
  Creative marketing copy, and `npm run build` + `npm run check:schema` pass.
- **Relationship to `/setup`:** opposite jobs. The strip *removes example content*;
  `/setup` *re-values the system* (identity, colors, Sanity ids) per project. Do
  not hand-edit identity/brand here — that's setup's job. Strip first → commit the
  clean starter → each project uses the template + runs setup.

## Principle

Keep the **system**, remove the **content**. Same guardrails as the setup skill:
don't restructure components, variables, or conventions — only delete CL pages and
neutralize the must-keep routes to placeholders.

## ✅ Keep — do not touch

- **All components:** `src/components/**` (ui, sections, form, global, blog,
  case-study, templates, icons, portabletext) + `src/layouts/**`.
- **All system CSS:** `src/styles/base/**`, `src/styles/variables/**`,
  `src/styles/components/**`, and `src/styles/global.css` (it imports only
  variables/base/components — no page CSS).
- **CMS route templates:** `src/pages/blog/**`, `src/pages/case-studies/**`,
  `src/pages/glossary/**`. These render *whatever is in Sanity* — a new project's
  empty dataset just yields empty states. Not CL content; keep them.
- **Infra:** `src/pages/api/**`, `src/pages/llms.txt.ts`,
  `src/pages/llms-full.txt.ts`, `src/pages/404.astro` (neutralize copy — see below).
- **Design-system showcase:** `src/pages/components.astro`,
  `src/pages/style-guide.astro` (+ `src/styles/pages/style-guide.css`). Worth
  keeping — they document the library for the next builder.
- **Config & data shells:** `src/config/**`, `src/sanity/**`, and
  `src/data/site-structure.ts` + `src/data/faqs.ts` (edit these, don't delete).

## 🗑️ Delete — Your Company marketing pages + their content

Delete each page **and** its matching `src/styles/pages/*.css` (page CSS is imported
only by its own page, so there's no `global.css` line to remove):

| Page (`src/pages/`) | Page CSS (`src/styles/pages/`) |
|---|---|
| `about.astro` | `about.css` |
| `how-we-work.astro` | `how-we-work.css` |
| `m2m-framework.astro` | — |
| `why-webflow.astro` | `why-webflow.css` |
| `book-a-call.astro` | `strategy-call.css` *(if unused elsewhere)* |
| `services/web-design.astro` | `web-design.css` |
| `services/webflow-development.astro` | `web-development.css` |
| `services/seo.astro` | `seo.css` |
| `services/marketing-partner.astro` | `marketing-partner.css` |
| `services/webflow-website-support.astro` | `webflow-website-support.css` |
| `services/m2m-messaging-sprint.astro` | `m2m-messaging-sprint.css` |
| `web-design-midlothian.astro` | *(uses shared CSS)* |
| `web-design-waxahachie.astro` | — |
| `web-design-dallas.astro` | — |
| `web-design/churches.astro` | `churches.css` |
| `web-design/coaches.astro` | `coaches.css` |
| `web-design/home-services.astro` | `home-services.css` |
| `web-design/recruiting-firm.astro` | `recruiting-firm.css` |

> Confirm each CSS file is imported **only** by the page you're deleting before
> removing it: `rg -n "pages/<name>.css" src`.

## 🤔 Decide per starter — gray area

- **`index.astro` (home) + `home.css`** — every site needs a home, so **replace
  with a minimal placeholder** (hero + a couple of component examples), don't delete.
- **Legal pages** — `privacy-policy`, `terms-and-conditions`, `cookie-policy`,
  `disclaimer`: keep as skeletons with placeholder body copy (recommended — every
  site needs them), or delete and re-add per project.
- **Scorecard lead-gen feature** — `marketing-scorecard.astro`,
  `src/components/MarketingScorecard.tsx`, `src/pages/api/scorecard.ts`,
  `thank-you.astro`, `thank-you-m2m-worksheet.astro`: keep as an example funnel, or
  strip it whole (then also drop the WAF rule note in the checklist).
- **`contact.astro` + `contact.css`** — keep as a generic contact skeleton or remove.
- **Static section data** — `src/data/case-studies.ts` is consumed by
  `src/components/sections/CaseStudyGrid.astro`. **Neutralize** to one or two
  placeholder examples (don't delete the file unless you also update the
  component). Testimonials/blog/case studies otherwise come from Sanity.

## 🔗 Reference cleanup — do this for every deleted page

Deleting a page without this breaks the build or leaves 404 links:

1. **`src/data/site-structure.ts`** — remove the page's `PAGES` entry, plus any
   reference in `NAV_MENU`, `FOOTER_GROUPS`, and `FOOTER_LOCATIONS`. Reduce
   `BANNER` to a placeholder/empty default.
2. **`src/data/faqs.ts`** — remove the per-page FAQ export(s) for deleted pages.
3. **`scripts/check-schema.mjs`** — remove deleted paths from the `STATIC_PAGES`
   array (currently lists the location/service pages).
4. **`public/_redirects`** — remove the `/location/web-design-*` redirect lines for
   deleted location pages (and the `/location/* …` catch-all if no longer relevant).
5. **Internal links in kept files** — grep and fix/remove any href pointing at a
   deleted route:
   ```
   rg -n "/about|/how-we-work|/m2m-framework|/why-webflow|/book-a-call|/services/|/web-design" \
     src/components src/pages src/data
   ```
   Likely hits: `Footer.astro`, CTA sections, `HowWeWorkPromo`, `CaseStudyFeatured`,
   any `Button href`. Repoint to a kept route or remove.
6. **Orphaned assets** — delete now-unused images in `src/assets/` (check each:
   `rg -n "<image-name>" src`).

## 🧹 Neutralize the must-keep routes

- **`index.astro`** → minimal placeholder home.
- **Legal pages + `404.astro`** → keep structure, swap body copy for neutral
  placeholder text (no brand name, founder name, or city names).
- **Leave `src/config/site.ts`, the color/logo files as-is** — `/setup` re-values
  them per project; don't brand them in the starter.

## ✔️ Verify before committing the starter

```bash
npm run check:config
npm run build                 # must succeed with zero dangling imports/links
npm run dev                   # one terminal
npm run check:schema          # other terminal — after trimming STATIC_PAGES
```

Then sweep for stray brand references in kept files (config is fine — setup owns it).
Replace the terms below with the source brand's name, founder, city names, and any
third-party integration names:

```bash
rg -n "BrandName|Founder Name|City1|City2|HoneyBook" \
  src --glob '!src/config/**'
```

## After the strip

1. Commit as the starter baseline.
2. Mark the repo a **Template repository** (GitHub → Settings → General).
3. Per project: **Use this template** → run `/setup` (or `npm run setup`) to brand
   it and create its own Sanity project.
