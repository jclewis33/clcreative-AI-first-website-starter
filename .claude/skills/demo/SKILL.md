---
name: demo
description: Build a branded prospect demo site for one local-service business, in about 30 minutes, ready to send. Use when Casey says "make a demo for <business or URL>", "build a demo site for <prospect>", "send <prospect> a demo", "update the <prospect> demo", or "clean up old demos". Researches the prospect's current site, writes demo.json, runs `npm run demo`, builds, checks and pushes a `demo/<slug>` branch of the PRIVATE demos repo, and reports the preview URL plus what to confirm before sending.
---

# Prospect demo — research → demo.json → `npm run demo` → push

A demo is the prospect's own business, shown as the site CL Creative would
build them. It must look real, be accurate, and promise nothing that isn't
true. The deterministic work (every file write) is `scripts/demo.mjs`. Your
job is the parts a script can't do: research, copy, photos, and judgement.

Read first, once per session:

- `presets/local-service/README.md` — the `demo.json` shape
- `presets/local-service/fixture/demo.json` — a complete worked example
- `docs/demo-mode.md` — only if the one-time setup isn't done yet

## Non-negotiables

- **The private demos repo only.** `git remote get-url origin` must be the
  private `clcreative-demos` repo. The starter is a public template, and
  prospect data never goes in it (the script refuses).
- **No invented proof.**
  - Only quote reviews that are real, attributed and public (theirs, on
    their site or their Google profile). If there are none, leave
    `home.reviews` out; the section disappears.
  - No made-up numbers: a stat like "1,200 jobs" or "4.9 rating" must come
    from them. Otherwise use non-numeric highlights, such as "Licensed",
    "Upfront pricing", "Same-week".
  - No invented certifications, awards or warranties.
- **No street address,** even if their site shows one.
- **Everything you inferred goes in `notes.confirmOrCut`:** service areas
  guessed from a city name, hours read from a Google listing, a brand colour
  pulled from the logo, a service you grouped or renamed, any AI-generated
  photo. Casey reads this list before sending.

## Workflow (target times in brackets)

### 1. Branch (1 min)

```sh
git switch main && git pull
git switch -c demo/<slug>
```

- `<slug>`: their business name in kebab-case, up to 30 characters (e.g.
  `acme-electric`).
- Updating an existing demo: `git switch demo/<slug>` and skip to step 5.

### 2. Research their current site (6–8 min)

- **Tools:**
  - WebFetch the homepage, the services page(s), and the about and contact pages.
  - If the site is JS-heavy or WebFetch comes back thin, use the Playwright MCP.
  - Check the Google Business Profile if they link one.
- **What to collect:**
  - legal name
  - phone
  - email (only if published)
  - city/region
  - service areas
  - hours
  - founded year
  - socials
  - their services: 3–4 core ones, merging tiny ones
  - real reviews, with names as shown
  - what makes them different, in their own words
- **Brand:**
  - **Logo:** download their logo file, the largest PNG/SVG you can find.
    Set `plate: true` if it's dark-on-white.
  - **Colour:** the dominant brand colour from their CSS or logo, as `#rrggbb`.
- **Photos:** pick real job/team photos large enough for a hero (1600px
  wide or more is ideal). Save them all into a scratch `assets/` folder next
  to demo.json.

### 3. Write the copy (6–8 min)

- Use the `cl-creative-storybrand-copywriter` skill for the home page (hero,
  story, call band) and each service (hero, scope, included, FAQs, CTA).
- Keep their real facts and their tone. A demo is their business on a better
  site, not a different business.
- **Lengths:**
  - `seo.description` and each `seoDescription`: at most 160 characters.
  - `highlights`: exactly 4.
  - `included.images`: exactly 2.
  - Service `faqs`: at least 2.

### 3b. Pick the look and the home-service pieces (1 min)

- **`look`**, by trade (see `src/config/looks.ts`):
  - `fresh`: lawn, pest, cleaning, pool
  - `warm`: HVAC, insulation, remodeling
  - `rugged`: electrical, roofing, plumbing, commercial
  - `natural`: hardscape, landscaping, decks, outdoor living

  If their current brand clearly fights the default for their trade, pick
  the closer look and say why in your report.

- **Hero:**
  - `ctaStyle: "panel"` is the default: the estimate button, "or", and
    "Call or text us".
  - `variant: "split"` when you have a strong portrait job photo; otherwise
    the background photo.
  - Put a **real** offer from their site in `<mark>` in the heading
    ("Call today for <mark>$100 off</mark>"). No offer on their site means no
    `<mark>`.
  - `trust`: only credentials they actually show (licensed & insured, BBB,
    manufacturer dealer), with the seal file as `image` when you have it.
- **`callBand`:** `variant: "photo-card"` with a wide texture-like job photo
  (a lawn, a roofline, a finished patio). Otherwise leave out `variant` for
  the dark band.
- **Optional home sections:** include each one only when the material is
  real. Leaving one out removes it from the page, which is better than
  filling it with something made up.
  - `symptoms`: 3 or 4 problems their customers describe ("AC blowing warm
    air", "Water under the sink"), from their FAQ, service pages or reviews.
  - `offer`: an offer **from their site**, with its terms in `note`.
  - `recentWork`: their own job photos, captioned with the town.
  - `guarantee`: their written guarantee or warranty, given a short name.
  - `comparison`: honest rows on how they work versus common industry
    practice. Never name a competitor.
  - `emergency`: only if they really offer 24/7 or after-hours service.
    Their own words go in `text`.
  - `plans`: their maintenance or membership plans, at their real prices.
  - `team`: their real people, with their own photos.
- **Town pages:** `cityPages` is on by default, so every service gets a page
  in every town. Keep `serviceAreas` to the towns they actually serve.
- `home.estimate.question` heads step 1 of the estimate form, above the
  service tiles. The default is "What do you need help with?". Phrase it for
  their trade ("What's going on with your AC?").
- **Service-area map:** automatic. `npm run demo` looks each service area
  up on OpenStreetMap and draws a street map with the towns outlined,
  caching the boundaries in `service-area.geo.json` beside demo.json. Commit
  that file with the demo. A town it can't find is skipped with a warning;
  check the spelling, or use the town's official name.
- **`license`:** their license number, if their site or the state lookup
  shows it.

### 4. Photos (3–5 min)

Use the first source that works:

1. **Theirs** (best).
2. **Magnific stock** that matches the trade and region.
3. **The starter's placeholders** (`src/assets/placeholder-images/`) — a last
   resort, and list it in `confirmOrCut`.

If you use any AI-generated images, check them for artifacts (hands, text,
tools) and list them in `confirmOrCut`. Every image needs real alt text.

### 5. Write demo.json and run the script (2 min)

```sh
npm run demo -- --config <path>/demo.json
```

- Keep `demo.json` and its `assets/` folder in the repo at `demo/` (committed
  with the branch), so the demo can be regenerated or promoted later.
- The script validates first: a bad field is reported as
  `demo.json › services.1.highlights: …`. Fix it and re-run.
- Re-running is the normal way to change anything. Never hand-edit the
  generated files (`src/data/home.ts`, `src/content/services/*`, …).

### 6. Build and look (5–7 min)

```sh
npm run build && npm run check:content-build
npx wrangler dev   # serves the build locally
```

Screenshot at 1440 and 390 wide with the Playwright MCP:

- home
- one service page
- contact
- the estimate modal

Scroll the page first so the scroll animations fire. Fix anything off by
editing demo.json and re-running, especially:

- a logo that's too small or that vanishes (try `plate`)
- an unreadable brand colour
- a hero photo that crops badly

### 7. Commit and push (1 min)

```sh
git add -A && git commit -m "Demo: <Business name>"
git push -u origin demo/<slug>
```

### 8. Verify the live preview (5–9 min)

1. Wait for the Workers Builds preview build to finish.
2. Open the preview URL, from the Worker's Previews section or the script's output.
3. If the real URL differs from the one the script printed, follow
   docs/demo-mode.md §2.
4. Then check:
   - `curl -sI <url> | grep -i x-robots` shows `noindex`.
   - The banner links to the see-how-it-works page.
   - **Send one test lead** from the form and confirm it arrived in the GHL
     demo sub-account. The form always shows success, so this is the only
     way to know.

### 9. Report to Casey

Give Casey:

- **The preview URL.**
- **Screenshots** (desktop and mobile).
- **The `confirmOrCut` list,** as a short checklist to clear before sending.
- **A one-line message he can send the prospect** (e.g. "I put together a
  quick look at what your site could be — <url>").

## Cleaning up old demos

To list them: `git branch -r --list 'origin/demo/*'`.

For each demo Casey says is dead:

```sh
npx wrangler preview delete --name demo-<slug>
git push origin --delete demo/<slug>
```

## When a prospect signs

Follow docs/demo-mode.md, "When a prospect signs". Their demo.json and
assets carry over, then `/setup` sets up the real project.
