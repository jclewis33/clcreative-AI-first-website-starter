# Preset: local-service

A demo preset for trades and home-service businesses (electrical, plumbing,
roofing, remodeling, outdoor living). `npm run demo` reads it; the `demo`
skill (`.claude/skills/demo/SKILL.md`) explains the whole workflow and
`docs/demo-mode.md` the one-time setup.

| File             | What it is                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `preset.mjs`     | The `demo.json` schema (validated before anything is written), the pages this preset installs, the nav links a demo hides      |
| `index.astro`    | The home page                                                                                                                  |
| `about.astro`    | The About page                                                                                                                 |
| `reviews.astro`  | The reviews page (`/reviews`, in the nav) — only when the demo has reviews                                                     |
| `contact.astro`  | The contact page                                                                                                               |
| `audience.astro` | A page for contractors or property managers, installed at demo.json's `audiencePage.path` — only with `audiencePage`           |
| `fixture/`       | A fictional prospect (Brightline Electric) — `npm run check:demo` builds it; also the worked example of a complete `demo.json` |

## The pages are a scaffold, not a template

Each page is composed in the file itself: section components laid out in
order, with the copy written as props and tag text and the photos
imported at the top. Repeated content comes from the collections
(services, reviews, FAQs, the process steps in `settings.json`) and the
business's facts (phone, towns, rating, the estimate button) from `SITE`.
Nothing is generated into them, so they can be edited on the Stacki
canvas.

The copy is neutral example copy and the photos are the starter's
placeholders. They are where a demo starts, not what it ships: redesign
each page for the business, rewrite every line from what they really say
and do, swap in their photos, and add, drop or reorder sections to fit
the design. The home page follows the contractor home's order (hero,
services, symptoms, reviews, map, how it works, story, comparison, lead
form, FAQ, call band).

This folder is excluded from the starter's `tsconfig.json`, so
`npm run check` doesn't see these pages; `npm run check:demo` builds
them in the fixture demo.

## A demo's own pages

`npm run demo` copies each preset page into `src/pages/` only where no
page is there yet. From then on the page in `src/pages/` is the demo's
own: design and rewrite it there, and a re-run never touches it. (The
first run on a fresh starter is the one exception: the preset's home and
contact pages replace the starter's.) To start a page over, delete it
and re-run.

## demo.json in short

demo.json holds the business's facts and its repeated content, never
page copy: that is written in the pages. Start from `fixture/demo.json`.
Every image field is a source: a path relative to demo.json
(`./assets/hero.jpg`) or an https URL.

- `prospect` — `name`, `legalName?`, `slug` (kebab-case, up to 30
  characters; the branch is `demo/<slug>`), `website?`, `owner?`,
  `priceRange?` (`$`–`$$$$`, only as their Google or Facebook listing
  shows it; left out, the structured data has none)
- `contact` — `phone` (US), `texts?` (true only when they say the number
  takes texts; the nav then reads "Call or text", otherwise "Call us"),
  `email?` (leave out if they don't publish one),
  `hours`, `street?` + `postalCode?` (only a published shop or office
  address; leave out for a home-based business), `locality`, `region`,
  `openingHours?` (day by day, for a place people visit:
  `[{ "days": ["Mo", "Tu"], "opens": "09:00", "closes": "18:00" }]`; days
  not listed are closed — feeds OfficeCard and the JSON-LD hours)
- `businessType?` — the schema.org type, most specific that fits
  ("Plumber", "HVACBusiness", "Chiropractor"; the list is in
  `src/config/site.ts`). Default `ProfessionalService`
- `smsOptIn?` — the Phone field and SMS consent box on the demo's forms
  (default on; `false` for email-only, as on a real site before A2P approval)
- `serviceAreas`, `serviceRadius?` (`{ "center": "Palmer", "miles": 60 }`,
  a circle on the street map), `founded?`, `reviewsUrl?`, `social?`
  (`{ "Facebook": url }`), `utilityBar?`
- `look` — `fresh` | `warm` | `rugged` | `natural` | `trusted` | `estate`
  (by trade; see `src/config/looks.ts`), and `license?` for the footer
- `brand` — `color` (`#rrggbb`), `logo: { file, plate? }`, `text?`, `favicon?`
- `seo` — `tagline`, `description` (at most 160 characters), `image` (the
  share image, usually the home hero photo)
- `quote` — the site-wide estimate button and form (`SITE.quote`): `label`,
  `heading`, `text?`, `question?` (the form's first step), `questions?` (a
  qualifying form: one-tap steps — who's asking, new or returning,
  project, what they need help with, size, timing, budget — before the
  contact fields; `multiple: true` makes a step "pick all that apply")
- `rating?` — their public star rating as their profile shows it:
  `{ "value": 4.9, "count": 86, "source": "google" }` (`SITE.rating`)
- `reviews` — every real 4 and 5 star review, word for word
  (`src/content/reviews`; `[]` for none): `text`, `name`, `meta?` (also
  names the platform: "Google review"), `full?`, `rating?`, `date?`,
  `role?`, `avatar?` + `avatarAlt?`, `featured?`. The reviews page is
  installed only when there are reviews
- `faqs` — the site-wide questions, `{ question, answer }`, word for word
  (`src/content/faqs`; `[]` for none)
- `process?` — the site-wide "how it works" steps: `heading`, `text?`,
  `steps: [{ title, text }]` (settings.json `process`)
- `services` — 1 to 8 entries in the service-file shape
  (`src/content.config.ts`, guide: `.claude/skills/component-api/references/service-pages.md`)
  plus a `slug`, and optionally that service's own `reviews` (the review
  shape above). A service without its own `reviewSummary` gets `rating`
- `areas?` — service-area regions (`/service-areas/<slug>`) grouping every
  town in `serviceAreas`, each town in exactly one
- `audiencePage?` — `{ path, navLabel?, navButton?, group? }`: installs
  `audience.astro` once at `src/pages/<path>.astro` (keep the prospect's
  URL) for contractors or property managers, linked in the nav
  (`navLabel`, default "For contractors"), or at the top of a service
  `group`'s menu; `navButton` adds a second nav button to it
- `aboutNavLabel?` — the About page's name in the nav ("Our Process")
- `projects?` — their real jobs (the projects-file shape plus a `slug`):
  `/projects` and `/projects/<slug>`, in the nav; they replace the sample
  projects and the sample gallery. `projectsPage?` holds that page's words
- `notes.confirmOrCut` — everything inferred rather than found, for Casey to
  check before sending

A demo.json from before this shape (with `home` or `audience`) is refused
before anything is written: move the copy into the pages, and the reviews,
FAQs, process steps and rating into the top-level keys above.
