# Page-composed demos — design

**Date:** 2026-11-25 · **Status:** approved in conversation, plan in
`docs/superpowers/plans/2026-11-25-page-composed-demos.md`

## Problem

`npm run demo` turns one `demo.json` into a whole site: it generates
`src/data/home.ts`, `audience.ts` and `process.ts`, and the preset pages hand
that data to whole-page templates (`LocalServiceHome`, `LocalServiceAbout`, …).
That suited the first demos, which were one template refilled. Demos are now
designed per business. Every demo replaces the preset page with its own
(`demo/pages/*.astro`), so copy is written into `demo.json`, wired into a
hand-built page, and edited in two places. `demo.json` is only checked when
the script runs (no editor types). Rules like "exactly 4 highlights" surprise
whoever edits it. Pages built this way can't be edited on the Stacki canvas,
because Stacki follows only literal props and images imported in the page.

## Decisions

1. **Three homes for content, one for config.**
   - **`src/config/site.ts` (`SITE`)** holds everything about the business
     and the site: name, phone, email, address, hours, socials, brand, look,
     the rating, service areas, the service radius, and the demo switch.
   - **Content collections** hold anything repeated with the same layout:
     services, service-area regions, reviews, FAQs, projects, gallery, blog,
     case studies, testimonials, CTAs.
   - **Page files** hold every one-off page, laid out from components. Their
     words are written as props or tag text and their photos are imported in
     the page.
   - **Components** hold anything shared site-wide (nav, footer, call band).
     Edit once, change everywhere.
2. **The demo switch is `SITE.demo`.** `src/config/demo.shared.mjs` goes
   away. Plain Node 26 imports `site.ts` directly, as long as its only
   runtime import is `site.shared.mjs` and the rest are type imports. A
   check enforces that, so `astro.config.mjs`, the shared SEO config and the
   scripts read `SITE.demo` directly. Real site: `demo: null`, which removes
   the banner, noindex, hidden pages and lead fallback.
3. **The map reads `SITE`.**
   - **The town list** stays `SITE.serviceAreas`, one list read by the map,
     footer, contact page, service pages and JSON-LD.
   - **The radius** becomes `SITE.serviceRadius: { center, miles } | null`.
   - **`npm run map`** fetches outlines for any town without one into the
     generated cache (`src/data/service-area-geo.json`,
     `src/data/service-radius.json`, plus a lookup cache
     `src/data/service-area-geo.cache.json`). You never hand-edit these. The
     build warns about a town with no outline.
   - **Region pages** (`src/content/service-areas/*.json`) may only name
     towns in `SITE.serviceAreas`. Anything else is a build error naming the
     file and field.
4. **New collections.**
   - **`reviews`** (`src/content/reviews/<name>.json`): one platform review
     per file. Ratings of 4 or 5 only. An optional list of the `services` it
     is about.
   - **`faqs`** (`src/content/faqs/<name>.json`): the site-wide FAQs. A
     service's own FAQs stay in its service file.
   - **The site-wide process steps** move into the existing `settings` entry
     (`src/content/settings.json`).
   - **The aggregate rating** is `SITE.rating: { value, count, source } | null`.
5. **`npm run demo` writes facts and plumbing only.**
   - **It writes:** `site.ts`, content files (services, regions, reviews,
     FAQs, projects), the nav (`site-structure.ts`), logo, favicon and brand
     colour, the map (through the same code as `npm run map`), and the starter
     pages, on the **first run only**.
   - **It never overwrites an existing page.** The page in `src/pages` is the
     page, and `demo/pages/` copying goes away.
   - **`demo.json` loses `home` and `audience`.** Their copy is written in the
     pages.
   - **The starter pages** (`presets/local-service/*.astro`) become composed
     pages with neutral example copy, laid out from section components and
     collection queries. They are a scaffold to redesign, not a template.
6. **Branches and signing.**
   - **One `demo/<slug>` branch per prospect** in the private demos repo,
     unchanged.
   - **On signing:** push that branch as `main` of the client's new repo
     (it shares the starter's history, so starter updates still merge), set
     `SITE.demo = null`, run `/setup` for the real-site settings, then clear
     `confirmOrCut`.
   - **Existing demo branches built from the old templates are frozen.**
     Don't merge starter `main` into one after this lands until it has been
     converted. The final task deletes the old templates. It is skipped while
     any frozen demo still needs updates.

## Out of scope

Per-town location pages (thin pages; regions stay the only area pages). A
per-site map component. Moving service FAQs out of service files. The Sanity
add-on, which maps the same view models; new fields are flagged in the
plan where they touch it.
