# Preset: local-service

A demo preset for trades and home-service businesses (electrical, plumbing,
roofing, remodeling, outdoor living). `npm run demo` reads it; the `demo`
skill (`.claude/skills/demo/SKILL.md`) explains the whole workflow and
`docs/demo-mode.md` the one-time setup.

| File            | What it is                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `preset.mjs`    | The `demo.json` schema (validated before anything is written), the pages this preset installs, the nav links a demo hides      |
| `index.astro`   | The home page: `LocalServiceHome` + the generated `src/data/home.ts`                                                           |
| `contact.astro` | The contact page: `LocalServiceContact`                                                                                        |
| `fixture/`      | A fictional prospect (Brightline Electric) — `npm run check:demo` builds it; also the worked example of a complete `demo.json` |

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
  `hours`, `locality`, `region`
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
  plus a `slug`
- `notes.confirmOrCut` — everything inferred rather than found, for Casey to
  check before sending
