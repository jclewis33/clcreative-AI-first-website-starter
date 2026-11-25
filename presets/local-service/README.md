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
| `audience.astro` | A page for contractors or property managers, installed at demo.json's `audience.path` — only with `audience`                   |
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

A file in `pages/` beside demo.json with the name of a preset page
(`index.astro`, `contact.astro`, `about.astro`, `reviews.astro`) is
installed instead of the preset's, and kept on every re-run. That is
where a demo's hand-designed home page lives: start from the preset's
page and compose it from its sections and new ones. Delete
the file to go back to the preset's page.

Any other file under `pages/` is installed at the same path under
`src/pages/` too: `pages/services/[slug].astro` replaces the service
route with the demo's own service page. To undo, delete it and restore
the starter's file (`git checkout src/pages/services`).

## demo.json in short

Start from `fixture/demo.json`. Every image field is a source: a path
relative to demo.json (`./assets/hero.jpg`) or an https URL.

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
- `serviceAreas`, `founded?`, `reviewsUrl?`, `social?` (`{ "Facebook": url }`),
  `utilityBar?`
- `look` — `fresh` | `warm` | `rugged` | `natural` (by trade; see
  `src/config/looks.ts`), and `license?` for the footer
- `brand` — `color` (`#rrggbb`), `logo: { file, plate? }`, `favicon?`
- `seo` — `tagline`, `description` (at most 160 characters)
- `home.layout` — `contractor` (default; LocalServiceHome, conversion-led)
  or `showcase` (LocalServiceShowcase, photo-led; skips offer, symptoms,
  comparison and the hero panel)
- `home.about` — the About page intro (`eyebrow`, `heading`, `text`) and
  longer story `paragraphs`; optional (the page leads with `story` without it)
- `home` — `LocalServiceHomeData` (`src/lib/local-service-home.ts`) with image
  sources. The optional sections are `symptoms`, `offer`, `recentWork`,
  `guarantee`, `comparison` and `reviews`; each appears only when it's set,
  and only with real material
- `services` — 1 to 8 entries in the service-file shape
  (`src/content.config.ts`, guide: `.claude/skills/component-api/references/service-pages.md`)
  plus a `slug`. A service without its own `reviews` gets the
  `home.reviews` items and rating, so every service page carries real reviews
- `home.reviews.cards: "google"` — the reviews page and the About page show
  Google-style review cards (`ReviewCards variant="google"`, with `keywords`
  and `featured`), for a demo whose own home page uses them
- `home.estimate.questions` — a qualifying estimate form: one-tap steps
  (who's asking, new or returning, project, what they need help with, size,
  timing, budget) before the contact fields; `multiple: true` makes a step
  "pick all that apply" (checkboxes and a Next button)
- `home.spotFinder` ("Where does it hurt?": body areas with causes, how
  they help and service links), `home.office` (a photo beside the office
  card: address, `contact.openingHours`, directions) and `home.profile`
  (meet the doctor/owner: badge, credential tiles, optional schema.org
  Person). `hero.formQuestions` puts `estimate.questions` in the hero card;
  `hero.edge: "wave"` and `hero.proof.source: "google"` style the hero
- `home.paths` (homeowner / contractor panels under the hero) and
  `home.beforeAfter` (their own before-and-after pairs)
- `audience` — a page for contractors or property managers at its own
  `path` (keep the prospect's URL), in the nav: hero, facts, scopes,
  equipment, projects, prequal paperwork, next steps, its own form
- `projects` — their real jobs (the projects-file shape plus a `slug`):
  `/projects` and `/projects/<slug>`, in the nav; they replace the sample
  projects and the sample gallery
- `notes.confirmOrCut` — everything inferred rather than found, for Casey to
  check before sending
