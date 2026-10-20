# Demo mode — prospect demos in about 30 minutes

A prospect demo is a branded copy of this starter, built for one business
from a single `demo.json` file. It lives on its own branch of a **private**
demos repo, Cloudflare gives each branch its own URL, and the whole site is
kept out of search. If the prospect signs, the demo becomes their project; if
not, you delete the branch.

- **Making a demo:** ask Claude to "make a demo for <their website>" — the
  `demo` skill (`.claude/skills/demo/SKILL.md`) does the research, writes
  `demo.json`, runs `npm run demo`, builds, checks and pushes.
- **What a demo changes:** `scripts/demo.mjs` (its header lists every file).
- **The preset and the `demo.json` shape:** `presets/local-service/README.md`.

Everything below is **one-time setup**, done once for the demos repo.

## 1. The private demos repo

This starter is a public template, so prospect data must never be committed
to it. `npm run demo` refuses to run there.

1. Create the **private** repo from the template, clone it, and point it at
   the starter so it can take updates:
   ```sh
   gh repo create jclewis33/clcreative-demos --private --template jclewis33/clcreative-AI-first-website-starter
   git clone https://github.com/jclewis33/clcreative-demos.git && cd clcreative-demos
   git remote add upstream https://github.com/jclewis33/clcreative-AI-first-website-starter.git
   ```
2. **Rebase the new repo onto the starter's history — once, while it's
   empty.** A template repo starts with a fresh "Initial commit" that shares
   no history with the starter, so `git merge upstream/main` would refuse
   ("unrelated histories"):
   ```sh
   git fetch upstream && git reset --hard upstream/main && git push --force origin main
   ```
   To update later: `git switch main && git fetch upstream && git merge upstream/main && git push`.
   Old demo branches don't need updating — they're throwaway.
3. In `main`, set the Worker name in `wrangler.jsonc` (`"name": "cl-demos"` —
   keep it short; it's part of every demo URL).
4. Create `demo.defaults.json` at the repo root (it lives only in this repo):
   ```json
   {
     "workersSubdomain": "<your account's workers.dev subdomain>",
     "bannerHref": "https://www.clcreative.co/see-how-it-works-demo?demo={slug}",
     "bannerText": "Built for {name} by CL Creative"
   }
   ```
   Optional: `"ghlTrackingId": "tk_…"` — the GHL demo sub-account's External
   Tracking id, to see when a prospect opens their demo.
   Optional: `"ghlChatWidgetId": "…"` — a chat widget from the GHL demo
   sub-account (Sites → Chat Widget; the id is the `data-widget-id` in its
   embed code). Every demo then shows it, and chats land in the demo
   sub-account's inbox, so you can reply live while the prospect watches.
   It carries the widget's own name and colour, so keep them generic
   ("Hi! How can we help?") or change them in GHL before a call.

## 2. Cloudflare

1. **KV for sessions:** `npx wrangler kv namespace create SESSION`. Put the
   id in `wrangler.jsonc` in **both** `kv_namespaces[0].id` and
   `previews.kv_namespaces[0].id` (one namespace serves both). Commit to `main`.
2. **Create the Worker** with Workers Builds connected to `clcreative-demos`,
   production branch `main`. **Project name `cl-demos`** — it must match
   `wrangler.jsonc` (the dashboard suggests the repo name). `workers_dev` and
   `preview_urls` are already `true` in `wrangler.jsonc`; without them Wrangler
   warns on every deploy.
3. **Settings → Builds → Branch control:** turn on **Enable Preview Builds**.
   The Preview command must be `npx wrangler preview` (the default for new
   Workers; Wrangler 4.135+ is in package.json).
4. **Domains tab:** turn on the **Preview** `workers.dev` URL.
5. **Don't set a `SITE_URL` build variable** — each demo commits its own URL.
   Optionally set `SITE_NOINDEX=1` as a build variable so `main` itself is
   kept out of search too.

Each demo's URL is `https://<preview-name>-cl-demos.<subdomain>.workers.dev`,
where the preview name comes from the branch (`demo/acme-electric` →
`demo-acme-electric`). After the first push, check the real URL in the
Worker's **Previews** section. If it differs from the one `npm run demo`
printed, set `"siteUrl"` in `demo.defaults.json` (with `{slug}`/`{worker}`
placeholders) and re-run the script on that branch.

## 3. GoHighLevel demo sub-account

Demo forms go to a separate GHL sub-account, so prospects testing a form
never touch real client data.

1. Create the sub-account, the custom fields the forms use (see
   `src/config/forms.ts`) and a Private Integration token (contacts write).
2. Give Worker Previews the secrets — Previews don't inherit production's:
   ```sh
   npx wrangler preview base-config secret put GHL_API_TOKEN
   npx wrangler preview base-config secret put GHL_LOCATION_ID
   ```
   Base secrets apply to Previews created **after** they're set.
3. Set one shared password for the demo client tools (`/tools`, linked from
   the demo footer's "Also included" column with the review request page):
   ```sh
   npx wrangler preview base-config secret put TOOLS_PASSWORD
   ```
   Without it `/tools` stays locked (503). With it, submitting really starts
   the automation in the demo sub-account, so on a call you can type in the
   prospect's own phone and they get the review request. Keep the password
   to yourself: anyone who has it can text whoever they enter. The staff
   forms' workflows (`src/config/forms.ts`) need to exist in the demo
   sub-account for anything to send.
4. Leads arrive with the source `Demo: <prospect> — <form>`.

A demo's form always shows success, even if the secrets are missing or GHL
fails (the Worker logs a warning). So after deploying each demo, send one
test lead and confirm it arrived.

## 4. Smoke test

On a branch `demo/brightline-electric`, run the fixture:

```sh
npm run demo -- --config presets/local-service/fixture/demo.json
npm run build
git add -A && git commit -m "Demo: fixture" && git push -u origin demo/brightline-electric
```

Then open the preview URL. Check:

- the banner is there;
- `curl -sI <url> | grep -i x-robots` prints `noindex`;
- a test lead lands in GHL.

Then delete the fixture demo (step 5).

## 5. Cleaning up

Previews are limited per Worker, so delete demos that went nowhere:

```sh
npx wrangler preview delete --name demo-<slug>
git push origin --delete demo/<slug>
```

## When a prospect signs

1. Create the client's own repo from the starter.
2. Copy over the demo's `demo.json` and `assets/`.
3. Run `/setup` with the client's real details.
4. Set `DEMO = null` in `src/config/demo.shared.mjs`. That removes the
   banner, the noindex and the lead fallback in one change.
5. Work through the demo's `confirmOrCut` list with the client.
