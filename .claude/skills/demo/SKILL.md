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

## Scope first: a demo is not a site build

Ask Casey (or read from his message) what this demo needs before you
research. A demo has one job: make the prospect say "I want that". The
first real demo (Just A Dad's Pest Control, Oct 2026) grew into a full
site over a day of back-and-forth. That was useful because every fix
went into the starter, but it is not the target.

- **Quick demo (default, about 30 minutes):** the home page, their 3–4
  services as service pages, the contact page. On the home page, only
  the sections their real material supports: hero, services, a story or
  promises section, the service-area map, the form, the call band. Leave
  out `about`, `areas`, `team`, `plans`, `expect`, `why` and any section
  you would have to pad.
- **Full demo (only when Casey asks):** add the About page, the
  service-area regions (`areas`), and the optional home sections whose
  material is real.
- **Start from the closest previous demo.** Every demo's `demo.json` is
  on its branch in the private repo
  (`git show origin/demo/<slug>:demo/demo.json`). For the same trade,
  copy it and replace the business: the structure, section choices and
  service shapes carry over, and only the facts, copy and photos change.
  Just A Dad's (`demo/just-a-dads-pest-control`) is the pest-control and
  "fresh" look reference.
- **Every fix and every new section goes into the starter**, never only
  into the demo branch: branch the starter, PR, CI, merge, then
  `git merge upstream/main` on the demo branch.

## Copy rules learned on real demos

- **Contact lines say "we" and "us"**: "Call or text us", "we'll get back
  to you", "Tell us what you're seeing". The owner may not answer the
  phone. Use the owner's name only where it's about them: the story, the
  About page, their license, a "dad who…" line.
- **Service copy is the company, not the owner.** Never say or imply the
  owner does every job ("the owner on every visit", "he does the work
  himself", "when he says he'll be there"): businesses grow and the site
  has to still be true. Write "we": "We tell you what your home needs",
  "When we say we'll be there, we're there". The owner's own story (why
  they started, their family, their values) stays first person on the
  story and About sections; credentials read as the company's ("Just A
  Dad's is licensed…").
- **No filler to fill a slot.** No distances from home base, no "we make
  the drive", no restating the town list as a sentence. If a section has
  nothing real to say, leave it out.
- **Hero subtext is a benefit to the customer**, not a list of towns or
  logistics: "Get your home back from ants, mosquitoes and mice, with
  straight answers, a fair price and no hard sell."
- **Region and section names anyone would recognise**, not insider
  nicknames.
- **No time promises** ("same day", "this week") unless their site makes
  them.

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
- Each service's `scope` gets an `intro` line, 2 real `paragraphs` about
  that work (what goes wrong, how they do it, what the customer gets), and
  a **required** `scope.image` + `imageAlt`.
- **No photo twice on one page.** A service page shows its hero, its scope
  photo and its two `included.images`: make all four different (the schema
  can't see duplicates; check the list). Across services, reuse is fine.
- Keep their real facts and their tone. A demo is their business on a better
  site, not a different business.
- **Lengths:**
  - `seo.description` and each `seoDescription`: at most 160 characters.
  - `highlights`: exactly 4.
  - `included.images`: exactly 2.
  - Service `faqs`: at least 2.

### 3b. Pick the layout, the look and the home-service pieces (1 min)

- **`home.layout`** — the page's shape (any look works with either):
  - `contractor` (default): conversion-led. Quote panel in the hero, offer
    seal, symptom cards, comparison table. For call-driven trades —
    electrical, plumbing, HVAC, pest, lawn.
  - `showcase`: photo-led and editorial, after the Outdoor Living demo.
    Full-bleed hero with a calmer headline, recent work on dark, the
    owner's story with a "talk to us" link (`story.ctaLabel`), a cinematic
    photo close. It skips `offer`, `symptoms`, `comparison` and the hero
    panel/trust row. For work bought by looking at it — hardscape, decks,
    remodeling, landscaping. Only pick it with strong real photos: it
    leans on them.

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
- **About page (`/about`):** generated for every demo from the same `home`
  data (story, stats, team, guarantee, process, reviews, map, call band) and
  added to the nav and footer. Give it `home.about` — an `eyebrow`, an h1
  `heading`, an intro `text`, and longer story `paragraphs` in the owner's
  own words (their About section, verbatim where you can), and an
  `about.image` of its own (without one it borrows the home page's photo
  band, which then shows twice across the site). Without `home.about` the
  page just leads with the story.
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
  - `promises`: 3 or 4 promises they really make ("No hard sell", "No
    hidden fees", their license), as tinted cards. Overlaps `comparison`
    (same claims); use one or the other.
  - `expect`: "what to expect" steps, each with its when (`label`: "Today",
    "First visit", "Every season") beside the CTA. Only timings they
    promise: no "same day" or "this week" unless their site says so.
    `proof` is one real figure (`{ value: "100%", label: "Recommend us on
Facebook" }`). When set it takes the home page's process slot;
    `process` still feeds the About and service pages.
  - `why`: 3–5 reasons as icon rows (`icon` from
    src/data/service-icons.json) beside one big photo not used elsewhere on
    the home page. Sits after the story.
- **Service areas (`areas`):** group every town in `serviceAreas` into 3–4
  regions with names anyone would recognise (a county, "Southwest DFW"; not
  insider nicknames like "Best Southwest"),
  never a page per town. Each town in exactly one region; keep every town
  they really serve. Each region needs 2+ local paragraphs. Add `facts`,
  `reviews` or `jobs` only when they're real (from their site or Casey);
  never filler like distances or "we drive there". Note missing proof in
  `confirmOrCut`. Pests, soil, lakes: only what's true and general;
  list anything inferred in `confirmOrCut`. Skip `areas` and there's no
  hub or region page at all.
- `home.estimate.question` heads step 1 of the estimate form, above the
  service tiles. The default is "What do you need help with?". Phrase it for
  their trade ("What's going on with your AC?").
- **`home.services.layout`:** `"cards"` (photo grid, default) or
  `"showcase"` (an auto-advancing accordion with the photo swapping beside
  it; it uses each service's `hero.text`, so write that as a full sentence).
- **`serviceRadius`:** when they describe their area as a distance ("within
  60 miles of Palmer"), set `{ "center": "Palmer", "miles": 60 }`: the map
  draws that circle and frames itself on it. Then pick `serviceAreas` from
  the towns across the whole circle (their own map, Facebook areas), not just
  the home county.
- **`photoBand.position`:** `{ "x": 50, "y": 25 }` (percent) when the
  people in the photo sit high in the frame; check heads aren't cropped.
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
   - The banner links to the see-how-it-works-demo page (no quiz; the video and calendar show straight away).
   - **Send one test lead** from the form and confirm it arrived in the GHL
     demo sub-account. The form always shows success, so this is the only
     way to know.

### 9. Report to Casey

Give Casey:

- **The preview URL.**
- **Screenshots** (desktop and mobile).
- **The `confirmOrCut` list,** as a short checklist to clear before sending.
- **The chat widget** shows on every demo when `ghlChatWidgetId` is in
  `demo.defaults.json` (chats land in the demo GHL inbox).
- **The extras:** the footer's "Also included" column links the review
  request page (`/leave-a-review`), the follow-up discount page
  (`/get-your-discount`) and the client tools (`/tools`, behind
  the shared demo password from docs/demo-mode.md). Set `reviewsUrl` in
  demo.json to their real review page (Google, else Facebook), or 5 stars
  opens the feedback form instead of sending them there.
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
