# Deploying to Cloudflare

Every fork ends here, CMS or not. Most of this is dashboard work you cannot click —
guide it, then verify. The single source of truth for the manual pieces is
[docs/new-project-checklist.md](../../../../docs/new-project-checklist.md) §4.

## Shipping before the real domain exists

A fork can deploy and run on the Worker's free
`https://<worker>.<account>.workers.dev` URL before any custom domain is attached.
If the user doesn't have the domain yet, set `siteUrl` to that staging URL during
the config step — **no code edit is needed to switch later**: `SITE_URL` is
env-overridable at deploy time (see
[site.shared.mjs](../../../../src/config/site.shared.mjs)), so at launch they change
the Cloudflare `SITE_URL` build var to the real origin and redeploy.

Full per-client runbook: **§4a "Staging-first deploy"** in the checklist. Surface it
whenever the domain isn't ready. In short: create the SESSION KV namespace and pin
its id, set the `SITE_URL` build var to the staging URL, toggle the Production
`workers.dev` route on, and (Sanity forks only) add that URL to Sanity CORS and
deploy the Studio with `SANITY_STUDIO_PREVIEW_URL` pointed at it.

## The site Worker (dashboard — guide)

Per §4 of the checklist:

- Create the Worker and connect the repo (Workers Builds).
- Set the `vars` — including `SITE_URL`.
- Add `SANITY_API_READ_TOKEN` as an **encrypted secret** (never a plain wrangler
  var). Sanity forks only.
- Attach the domain, and turn **"Always Use HTTPS"** on.
- Add the **WAF rate-limit rule** for any public POST endpoint.

## Rebuild-debounce Worker (Sanity forks only)

**Skip this entirely for a no-CMS fork** — without a CMS there is nothing to
publish, so a git push is the only thing that should trigger a build.

For Sanity forks this is **required to surface**: the content routes are
prerendered, so the chain **publish → debounce Worker (waits ~5 min) → Cloudflare
deploy hook → one build** is the only path by which published content reaches the
live site. The setup CLI already renamed the Worker's `wrangler.jsonc` `name` to
`<worker>-rebuild-debounce`. Full runbook: the Worker's own
[README](../../../../workers/rebuild-debounce/README.md) and §4.6 of the checklist.

### Detect wrangler auth, then pick the path

The deploy + secrets are ordinary `wrangler` commands, so **you can run them via
Bash** when wrangler is authenticated — the user just approves each command. Probe
first:

```bash
cd workers/rebuild-debounce && npx wrangler whoami
```

- **Authenticated** (prints an account/email) → automated path below.
- **Not authenticated** → guided path. Do **not** try to run `wrangler login` for
  them — it opens a browser OAuth flow you can't complete. Tell them to run it (or
  to set a `CLOUDFLARE_API_TOKEN`), then switch to the automated path. Offer:
  "once you've run `wrangler login`, I can do the rest for you."

### Automated path — you run it

**Ask the user for the deploy-hook URL first** — it's the one value only they can
get (Cloudflare → the **site** worker → Settings → Builds → Deploy hooks → create
one targeting `main`, copy the URL). Confirm each command before running.

```bash
# 1. Deploy the Worker.
cd workers/rebuild-debounce && npm install && npx wrangler deploy
#    ⚠️ If it errors "redirected configuration path … does not exist", the root
#    .wrangler/deploy/config.json (a gitignored @astrojs/cloudflare artifact) is
#    hijacking the subfolder deploy. Remove it and retry:
#    rm ../../.wrangler/deploy/config.json && npx wrangler deploy

# 2. DEPLOY_HOOK_URL secret — pipe the user-provided URL via stdin (avoids it
#    sitting in argv). Replace the placeholder with the real value they gave you.
printf '%s' 'https://api.cloudflare.com/…the-deploy-hook…' | npx wrangler secret put DEPLOY_HOOK_URL

# 3. WEBHOOK_TOKEN secret — generate it, set it, and PRINT IT ONCE so it can go in
#    the Sanity webhook header. This is a shared secret between the Worker and the
#    webhook, so surfacing it once here is expected.
TOKEN="$(openssl rand -hex 32)"; printf '%s' "$TOKEN" | npx wrangler secret put WEBHOOK_TOKEN; echo "WEBHOOK_TOKEN=$TOKEN"
```

Capture the Worker's `*.workers.dev` URL from the deploy output and the printed
`WEBHOOK_TOKEN` — both feed the Sanity webhook (see
[sanity.md](./sanity.md) §S8).

> **Secret hygiene:** the deploy-hook URL and token appear in the transcript
> (unavoidable — the user pastes one, you generate the other). Don't write them to
> any tracked file, don't commit them, and don't echo them again afterwards. Use the
> scratchpad for any temp file and delete it.

### Guided path — print, don't run

```bash
# Authenticate once (browser OAuth) — or export CLOUDFLARE_API_TOKEN instead:
npx wrangler login

# Then, from the repo root:
cd workers/rebuild-debounce && npm install && npx wrangler deploy
#   (if it errors about a redirected config path, run:
#    rm ../../.wrangler/deploy/config.json && npx wrangler deploy)
npx wrangler secret put DEPLOY_HOOK_URL   # paste the site worker's deploy-hook URL
npx wrangler secret put WEBHOOK_TOKEN      # paste a random string, e.g. openssl rand -hex 32
```

Ask them to report back the Worker's `*.workers.dev` URL and the token they used,
so you can finish the webhook wiring.

## GitHub (dashboard — guide)

Per §5: enable Dependabot alerts, security updates, malware alerts, and grouped
updates; plus account-level push protection.

## Email / lead capture (if keeping the scorecard or similar forms)

Per §6: Resend + MailerLite keys and secrets — or drop the scorecard if unused.

## Post-launch verification

- **CSP `frame-ancestors`** (§3.5) is already correct in code — for Sanity forks,
  verify Presentation loads in Chrome after deploy.
- Run the **§7 post-launch verification** curl block from the checklist: security
  headers on a static page, a content page, and an SSR preview page; sitemap
  entries with no `/preview` or `/thank-you` URLs; API validation (bad email → 400,
  oversized → 413, honeypot → fake 200); the rate limit (9 rapid POSTs → first 5
  reach the API, rest 429, recovers after ~10s); and dependency health.
