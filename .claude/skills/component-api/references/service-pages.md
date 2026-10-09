# Service pages (`src/content/services/` → `/services/[slug]`)

Every service page is one JSON file. The template
(`src/pages/services/[slug].astro`) renders it with the local-service
sections, and the Services nav dropdown, footer group, `PAGES` registry,
sitemap and llms.txt all come from the same files
(`src/lib/service-nav.ts`). There is nothing else to register.

## Adding a service

1. Copy `src/content/services/kitchen-remodeling.json` to
   `src/content/services/<slug>.json`. The filename is the URL:
   `/services/<slug>`. Never use `contact` or another existing route name.
2. Put its photos in `src/content/services/images/` (WebP, about 2000px
   wide for the hero and 1400px for the rest) and point at them with
   `"./images/<file>.webp"`.
3. Write the copy (rules below) and set `order` to place it in the nav.
4. Run `npm run check`. A missing field, an empty alt, an unknown icon or a
   wrong photo path fails with a message naming the field. A missing photo
   fails `npm run build` with `ImageNotFound`.

To remove a service, delete its file and its photos.

## Field guide

| Field                                           | Shown as                                                                |
| ----------------------------------------------- | ----------------------------------------------------------------------- |
| `title`, `navLabel`, `order`                    | Page title / breadcrumb; nav & footer label; sort order                 |
| `seoTitle`, `seoDescription`                    | `<title>` and meta description (≤ 160 characters)                       |
| `cardText`, `cardImage`, `cardImageAlt`, `icon` | This service's card in other pages' "Related services"                  |
| `hero`                                          | Split Hero with breadcrumbs (`heading` takes `<strong>` for the accent) |
| `highlights`                                    | StatsStrip — exactly 4 `{ value, label }`                               |
| `scope`                                         | ServiceCards "what we work on" (`icon` per item)                        |
| `included`                                      | IncludedList — checklist + exactly 2 photos                             |
| `process` (optional)                            | ProcessSteps; omit to use `src/data/process.ts`                         |
| `reviews` (optional)                            | Reviews; omit to leave the section out                                  |
| `faqs`                                          | FAQ section + FAQPage schema (2 or more, plain text)                    |
| `cta`                                           | CallBand heading and line                                               |

Icon names are the keys of `src/data/service-icons.json`.

## Copy rules (from the ACE and Way builds)

- Write each page. Don't template the prose across services.
- Hero formula: what you do, for whom, and the problem it solves.
- The customer is the hero; talk about their result, not the company.
- Use specific trade nouns ("tub-to-shower conversion", not "solutions").
- Confirm or cut: for a real client, never invent reviews, numbers,
  licences or response times. Unconfirmed claims stay out.
- No em dashes in visible copy. Contractions on. Numbers as digits.

## Recipes

Dev-only sample pages to copy when building a client site (stripped from
the build via `DEV_ONLY_PATHS`):

- `/demo/local-service`: home page. Its ServiceCards link to the service
  pages and carry `id="services"`, the target of the service breadcrumb.
- `/demo/local-service-contact`: contact page. LeadForm beside
  ContactCards, "what happens next", a LinkList of services, FAQ.

There is no `/services` index page yet. The Services breadcrumb points at
`SERVICES_INDEX_PATH` (`/#services`) in `src/lib/services.ts`, so the
client's home page needs a services section with `id="services"`.
