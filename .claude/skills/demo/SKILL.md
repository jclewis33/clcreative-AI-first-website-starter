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
- **Street address: use the one their site or Google profile publishes**
  (`contact.street` + `contact.postalCode`; it shows in the footer, the
  contact page and the JSON-LD). Leave both out when they publish none,
  as a home-based business usually doesn't. Never guess one from a map.
- **Everything you inferred goes in `notes.confirmOrCut`:** service areas
  guessed from a city name, hours read from a Google listing, a brand colour
  pulled from the logo, a service you grouped or renamed, any AI-generated
  photo. Casey reads this list before sending.

## Scope first: a demo is not a site build

Ask Casey (or read from his message) what this demo needs before you
research. A demo has one job: make the prospect say "I want that". The
first real demo (a pest control company, Oct 2026) grew into a full
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
  The fictional Ironwood Pest Control (`demo/ironwood-pest-control`) is
  the pest-control and "fresh" look reference, safe to show anyone.
- **Every fix and every new section goes into the starter**, never only
  into the demo branch: branch the starter, PR, CI, merge, then
  `git merge upstream/main` on the demo branch.

## Page flow (contractor home)

The template's order, settled on the Jerry's Plumbing demo — fill it, don't
re-argue it: hero (rating pill, form) → stats → emergency → services →
symptoms ("Sound familiar?", button centred) → **reviews scrolling across
the screen** → service-area map → how it works → story (their real photo,
`story.imageSide: "right"`) → comparison → lead form → FAQ → call band.
Service pages get the same reviews automatically.

**Reviews:** quote each reviewer's strongest line, not the whole review —
cut with "…", otherwise their exact words — and say so in `confirmOrCut`.
`reviews.layout: "marquee"` scrolls them (swipeable, pauses on hover);
5+ reviews fill it.

## Working with Casey on a demo

- **Show, then build.** For a visual call (hero treatment, a background,
  mascot vs. photo) send 2–3 quick mockups or screenshots first; build the
  one he picks.
- **Screenshot every change** at 1440, 1200 and 390 wide and look before
  reporting: crops, wrapping phone numbers, text over faces, overflow.
- **Every claim traceable.** When he asks "where did this come from?",
  answer with the line from their site.
- **Fixes and new options go into the starter** (one PR branch per demo
  session), merged into the demo branch as you go; never only the demo.

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
  - real reviews, with names as shown — **every written review**, not just
    the first few: on Google Maps open the Reviews tab in Playwright, scroll
    the panel and click each "More" (Google only shows text for some; the
    rest are star-only and can't be quoted)
  - what makes them different, in their own words — including any "us vs.
    other companies" section (it feeds `comparison` almost verbatim)
- **Save their site's text** (each page's HTML into the scratch folder).
  Every claim on the demo gets checked against it later ("where did this
  come from?" should take one grep, not a re-crawl).
- **Brand:**
  - **Logo:** download their logo file, the largest PNG/SVG you can find.
    Set `plate: true` if it's dark-on-white.
  - **Colour:** the dominant brand colour from their CSS or logo, as `#rrggbb`.
- **Photos:** pick real job/team photos large enough for a hero (1600px
  wide or more is ideal). Save them all into a scratch `assets/` folder next
  to demo.json. Go through their **Facebook photos** too — trucks, job
  sites, crew, mascots live there, not on the website. The photo viewer
  (`facebook.com/photo/?fbid=…`) serves full size without a login. Ask
  Casey early whether the prospect has more (a wrapped truck, job photos, a
  current logo file): real photos beat every generated one.

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

- **Hero** (contractor layout). The recipe that landed on the Jerry's
  Plumbing demo, after Mike Healey Plumbing's site:
  - `variant: "background"` + `overlay: "side"`: the photo on the right
    two-thirds, melting into the dark background behind the text, with the
    form card on top of it. **With the form, the photo is texture, not a
    subject**: a close-up of the trade (a wrench on a P-trap, copper and
    valves, an AC coil, a breaker panel), no posed person — anyone in it
    ends up half behind the card or behind the headline. Generate it
    16:9; it can be moodier than the other photos.
  - Without the form (`ctaStyle: "panel"`), the photo can carry people:
    tech and homeowners on its right half, in the bright style below.
  - `ctaStyle: "form"` (the default): the two-step estimate form on a card
    beside the headline — step 1 is one tap on a service tile (under
    `estimate.question`), step 2 just Name, Phone and an optional note. Casey picked two-step
    over a long form: one easy question first, and a lighter-looking hero. `"panel"` is the lighter
    alternative.
  - `proofPosition: "above"` (the default) with `proof: { rating, text:
"5.0 on Google · 14 reviews" }`: the rating as a pill over the headline
    — proof before the pitch. Only with a real rating; no rating, no `proof`.
  - Forms ask for a phone number (`smsOptIn` is on by default for demos).
  - `variant: "split"` when you have a strong portrait job photo instead;
    `imageFit: "cutout"` + `imageBackdrop` for a transparent mascot.
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
- **`smsOptIn`:** on by default for demos (forms ask for a phone, with the
  SMS consent box); `false` for email-only.
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

1. **Theirs** (always first — their website, then their Facebook): truck, job sites, crew, finished work. Upscale small
   ones with Magnific `images_upscale` (`mode: "ultra-photo"`, 2x) and check
   any lettering survived unchanged. Brighten dark phone shots a little,
   don't restyle them.
2. **Generated** (below), only for the slots their own photos can't fill.
3. **The starter's placeholders** (`src/assets/placeholder-images/`) — a last
   resort, and list it in `confirmOrCut`.

**The generated style Casey approved** (Nano Banana 2.1:
`mode: "imagen-nano-banana-2-1"`, `resolution: "2k"`, 3:2 for cards and
pages, 21:9 for wide bands). Start every prompt with "Bright, modern
commercial photograph shot on a Canon R5 with a 35mm lens, straight
horizon." and end it with "Crisp, clean, high-key lighting, true-to-life
neutral colors, sharp focus, upbeat and natural, like a modern
home-services brand campaign. No vintage grading, no film grain, no haze,
no warm color cast. No text, no logos."

- **Vary the people and the angles.** Not the same tech in the same kind of
  room in every shot: that sameness is what reads as AI. Different techs,
  different ages, different camera angles (eye level, low, over the
  shoulder, top-down), different settings — kitchen, garage, yard,
  restaurant back lot, shop.
- **Mix the framing:** wide scenes with the tech and homeowners, _and_
  close-ups — hands on a fitting, the faucet going in, tools, the finished
  work. Not every photo needs a person posing in the room.
- **Repair shots must look like real jobs.** Neat, staged scenes read as AI
  (a perfectly square hole, tools laid out in rows). Prompt those as a
  "candid documentary photo taken on a phone by a plumber on the job" —
  rough edges, dust, gloves, no faces.
- **Never Magnific One** (`magnific-one`) or any filmic grade: its
  vintage/AI wash is the first thing Casey rejects. Realistic beats
  stylized.
- **Avoid:** cheesy stock poses (clipboard, thumbs up), older-looking leads in the
  hero, tilted or murky shots.
- **Never** a street photo of their house, even when it's their listed
  address.
- **Contact page photo** (`home.contact.image`): sits behind the heading
  under a dark overlay — a trade texture (copper and valves, tools), not a
  person.
- **Their mascot or cartoon** goes on the About page hero (`about.imageFit:
"cutout"`, transparent PNG via `images_remove_background`), not the home
  hero.
- **Generate a few per slot (`count: 2–3`), make a contact sheet, pick.**
- **Check every photo for correctness at full size, not just the
  thumbnail:** objects built right and in proportion (a trailer's bed square
  on its frame, wheels and axles where they belong — the first Jerry's dump
  trailer had its bed twisted sideways and shipped unnoticed), hands, tools,
  pipes that connect, lettering, and heads not cropped at the sizes the site
  uses (tall on desktop, square on phones). Reject and regenerate rather
  than ship one that's "close".

List every generated image in `confirmOrCut`. Every image needs real alt
text.

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

**Every phone number must be clickable** (a `tel:` link) — the utility
bar's numbers, the CTAs, FAQ answers, footer. Check it: on each page, at
1440 and 390, no visible text matching a phone number outside an
`a[href^="tel:"]`.

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
