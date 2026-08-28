---
name: seo-discoverability
description: Per-page SEO, structured data, and LLM discoverability reference for this starter. Load BEFORE adding or editing JSON-LD / Schema.org markup (Service, FAQ, LocalBusiness), the serviceFaqJsonLd helper (src/lib/jsonld.ts), the schema prop on BaseLayout, per-page FAQs (src/data/faqs.ts), llms.txt / llms-full.txt, or the PAGES registry in src/data/site-structure.ts — and ALWAYS when adding a new static page (marketing, service, location, legal), which has a manual registration step. Also covers check:schema validation.
---

# Per-page SEO, Structured Data & LLM Discoverability

## Sitewide pieces — already wired, do not duplicate

- **LocalBusiness JSON-LD** lives in
  [src/layouts/BaseLayout.astro](../../../src/layouts/BaseLayout.astro) as a
  single `ProfessionalService` node with `@id: ${SITE.url}/#localbusiness`. It
  renders on **every** page. Per-page `Service` schemas reference it via
  `provider.@id` — never redefine the LocalBusiness on a page.
- **`areaServed`** on the sitewide node comes from `SITE.areaServed` in
  [src/config/site.ts](../../../src/config/site.ts). Add the cities/regions
  the business serves there (once).
- **Baseline per page:** BaseLayout always renders
  `LocalBusiness + WebPage + BreadcrumbList`. Image/logo paths come from
  `SITE.ogImagePath` and `SITE.logoPath`;
  [src/lib/jsonld.ts](../../../src/lib/jsonld.ts) reuses the same `SITE.*`
  values for the blog/case-study/glossary templates.

Most pages need nothing here. Reach for the per-page graph only when a page
should advertise a specific **Service** (and optionally an **FAQ**) — a
marketing/service/landing page.

## Adding a Service (+ optional FAQ) graph to a page

1. Build the graph with `serviceFaqJsonLd()` in
   [src/lib/jsonld.ts](../../../src/lib/jsonld.ts) — never hand-write JSON or
   a raw script block:

   ```ts
   import { serviceFaqJsonLd } from "../lib/jsonld";
   import { SITE } from "../config/site";
   import { generalFaqs } from "../data/faqs";

   // Build the URL from SITE.url — never hardcode the host literal.
   const pageUrl = `${SITE.url}/your-page`;

   const schemaGraph = serviceFaqJsonLd({
     pageUrl,
     serviceType: "Web Design",
     name: "Your service name",
     description: "...",
     areaServed: [
       { type: "City", name: "Your City" },
       { type: "AdministrativeArea", name: "Your County" },
     ],
     audience: { audienceType: "..." }, // type defaults to "BusinessAudience"
     faqs: generalFaqs, // omit to skip the FAQPage node
   });
   ```

   The helper derives `provider.@id` from `SITE.url` so it **always** matches
   the sitewide LocalBusiness `@id`. Keep the per-page `areaServed` tight (the
   specific area this page targets) — the full list belongs on the sitewide
   node only.

2. **Pass it to BaseLayout** via the `schema` prop — BaseLayout renders it
   through `JsonLd.astro` (which escapes `<`) alongside the automatic
   baseline. No manual `<script type="application/ld+json">` tag:

   ```astro
   <BaseLayout title="..." canonical={pageUrl} schema={schemaGraph} />
   ```

3. **Register the page** in the `PAGES` array in
   [src/data/site-structure.ts](../../../src/data/site-structure.ts) with the
   matching `group` (the single registry that feeds `/llms.txt`,
   `/llms-full.txt`, the nav, and the footer), then reference its `path` in
   `NAV_MENU`/`FOOTER_GROUPS` if it should appear there.

4. **Per-page FAQs:** [src/data/faqs.ts](../../../src/data/faqs.ts) ships one
   generic `generalFaqs` set; add more exports there (HTML is allowed in
   answers — `<a class="u-text-style-underline">` links, `<br><br>` breaks,
   `<strong>` bold) and pass the one you want as `faqs`.

## Validate

```bash
npm run dev               # in one terminal
npm run check:schema      # in another
```

[scripts/check-schema.mjs](../../../scripts/check-schema.mjs) validates the
JSON-LD on the pages in its `STATIC_PAGES` array (currently `/` and
`/contact`) plus one live sample of each CMS content type. **Add any page that
ships a custom `schema`** to `STATIC_PAGES`. It catches: JSON parse errors,
missing `@context`/`@type`/required fields, duplicate or malformed `@id`
values, dangling `provider.@id` references (the load-bearing failure mode for
the page→business linkage), empty FAQ entries.

What it doesn't catch: Google's rich-result eligibility rules. After deploy,
paste each script into
[Google's Rich Results Test](https://search.google.com/test/rich-results) or
point it at the live URL.

## Don'ts

- **Don't redefine the LocalBusiness node on a page.** It only lives in
  BaseLayout. Pages reference it via `provider.@id`.
- **Don't list every area in a per-page `Service.areaServed`.** That's the
  sitewide node's job.
- **Don't hardcode contact details.** They live in `SITE`
  ([src/config/site.ts](../../../src/config/site.ts)).

## LLM Discoverability — `llms.txt` & `llms-full.txt`

The site serves two LLM-facing files at the root, following the
[llmstxt.org](https://llmstxt.org) convention:

- **`/llms.txt`** — a concise, curated index: site summary + links (with
  one-line descriptions) to the important pages and every blog post, case
  study, and glossary term.
- **`/llms-full.txt`** — the full body text of every blog post, case study,
  and glossary term, rendered to Markdown for whole-site ingestion.

### How they stay current (no manual work for CMS content)

Both are **Astro endpoint routes that prerender to static files at build time**
([src/pages/llms.txt.ts](../../../src/pages/llms.txt.ts),
[src/pages/llms-full.txt.ts](../../../src/pages/llms-full.txt.ts)). They
re-run their Sanity queries on every build — the same lifecycle as the
sitemap — so new/edited/deleted content flows through automatically on the
next deploy. They reuse the queries in `src/sanity/lib/queries.ts` and mirror
the `comingSoon != true` rule used by the case-study `getStaticPaths` slug
query, so unpublished case studies stay hidden. The full file uses
`portableTextToMarkdown()` in
[src/sanity/lib/portable-text.ts](../../../src/sanity/lib/portable-text.ts).

The built files land in `dist/client/` alongside `sitemap-index.xml`. They are
intentionally **not** in the XML sitemap.

### ⚠️ The one manual step — adding a new static page

Dynamic content is automatic; **static (non-Sanity) marketing pages are
hand-curated** in the `PAGES` registry in
[src/data/site-structure.ts](../../../src/data/site-structure.ts) — the single
source of truth that also drives the nav and footer. **Whenever you add a new
static page**, add one `PAGES` entry with the matching `group`:

| New page type              | `group` value on the `PAGES` entry |
| -------------------------- | ---------------------------------- |
| Top-level marketing page   | `"main"`                           |
| Service (`/services/*`)    | `"service"`                        |
| Location (`/web-design-*`) | `"location"`                       |
| Collection index / landing | `"index"`                          |
| Legal / policy page        | `"optional"`                       |

Each entry is `{ path, title, desc, group }` (plus optional `navLabel` /
`footerLabel` overrides) — `path` is the site-relative URL with no trailing
slash, `title` is the page title with the ` | Your Company` suffix stripped,
and `desc` is the page's meta description. Because nav and footer reference
pages by path from this same registry, adding the page here once + referencing
its path in `NAV_MENU`/`FOOTER_GROUPS` is all that's needed — one registry,
never three separate lists. New **CMS** content needs nothing here.

To verify: `npm run dev`, then open `/llms.txt` and `/llms-full.txt` and
confirm the new page appears.
