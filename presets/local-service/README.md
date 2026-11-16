# Preset: local-service

A demo preset for trades and home-service businesses (electrical, plumbing,
roofing, remodeling, outdoor living). `npm run demo` reads it; the `demo`
skill (`.claude/skills/demo/SKILL.md`) explains the whole workflow and
`docs/demo-mode.md` the one-time setup.

| File             | What it is                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `preset.mjs`     | The `demo.json` schema (validated before anything is written), the pages this preset installs, the nav links a demo hides      |
| `index.astro`    | The home page: `LocalServiceHome` + the generated `src/data/home.ts`                                                           |
| `reviews.astro`  | The reviews page (`/reviews`, in the nav): `LocalServiceReviews` — only when `home.reviews` is set                             |
| `contact.astro`  | The contact page: `LocalServiceContact`                                                                                        |
| `audience.astro` | The audience page (`LocalServiceAudience`), installed at demo.json's `audience.path` — only with `audience`                    |
| `fixture/`       | A fictional prospect (Brightline Electric) — `npm run check:demo` builds it; also the worked example of a complete `demo.json` |

The page markup lives in `src/components/templates/` (LocalServiceHome,
LocalServiceContact), not here, so the starter's own CI type-checks and
builds it through the dev sample at `/demo/local-service`. This folder is
excluded from the starter's `tsconfig.json`: `index.astro` imports
`src/data/home.ts`, which exists only in a demo.

## demo.json in short

Start from `fixture/demo.json`. Every image field is a source: a path
relative to demo.json (`./assets/hero.jpg`) or an https URL.

- `prospect` — `name`, `legalName?`, `slug` (kebab-case, up to 30
  characters; the branch is `demo/<slug>`), `website?`, `owner?`
- `contact` — `phone` (US), `email?` (leave out if they don't publish one),
  `hours`, `street?` + `postalCode?` (only a published shop or office
  address; leave out for a home-based business), `locality`, `region`
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
- `home.estimate.questions` — a qualifying estimate form: one-tap steps
  (who's asking, project, size, timing, budget) before the contact fields
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
