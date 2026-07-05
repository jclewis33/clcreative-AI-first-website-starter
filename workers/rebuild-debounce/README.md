# rebuild-debounce Worker

Collapses a burst of Sanity publish webhooks into a **single** Cloudflare
rebuild.

## Why it exists

The blog / case-study / glossary routes are **SSR** (`export const prerender =
false`), so published content is live instantly. But the **sitemap** and
**`llms.txt` / `llms-full.txt`** are generated at **build time**, so a Sanity
publish must still trigger a Cloudflare rebuild.

The Sanity webhook fires **once per published document**, so publishing several
docs in a row would kick off several builds. This Worker debounces them:

```
publish → this Worker (waits ~5 min) → Cloudflare deploy hook → ONE build
```

The deploy hook stays on the **site** worker; this Worker only calls it. It's a
standalone Worker (Durable Object alarm), deployed **manually** — it is **not**
part of the site's CI build.

## Per-fork setup (run once per project — not at template-authoring time)

> These are dashboard / CLI steps a fork owner performs. The code and config in
> this folder ship ready; only the names, secrets, and the Sanity webhook wiring
> are per-fork.

1. **Name it.** In [`wrangler.jsonc`](wrangler.jsonc), set `name` to match your
   site worker, e.g. `your-worker-name-rebuild-debounce`.

2. **Deploy the Worker:**

   ```bash
   cd workers/rebuild-debounce
   npm install
   npx wrangler deploy
   ```

   > ⚠️ **Gotcha:** if `@astrojs/cloudflare` has generated a
   > `.wrangler/deploy/config.json` at the **repo root** (from a local `astro
   > build`), `wrangler deploy` in this subfolder follows that redirect and
   > errors with `redirected configuration path … does not exist`. Fix:
   > `rm ../../.wrangler/deploy/config.json`, then deploy again. (It's a
   > gitignored artifact that regenerates — deleting it is safe.)

3. **Set the two secrets:**

   ```bash
   # The real Cloudflare deploy hook: Workers & Pages → your SITE worker →
   # Settings → Builds → Deploy hooks → create one targeting `main`, copy its URL.
   npx wrangler secret put DEPLOY_HOOK_URL

   # A random shared token the Sanity webhook must send (see step 4).
   npx wrangler secret put WEBHOOK_TOKEN     # e.g. paste: openssl rand -hex 32
   ```

4. **Wire the Sanity webhook** (manage.sanity.io → your project → API →
   Webhooks):
   - **URL** → this Worker's `*.workers.dev` URL (from the `wrangler deploy`
     output) — **not** the deploy hook directly.
   - **HTTP header** → `Authorization: Bearer <WEBHOOK_TOKEN>` (the same random
     string from step 3).
   - **Trigger on** → Create, Update, Delete.
   - **Filter** → `!(_id in path("drafts.**"))` — intentionally broad; see the
     main [README](../../README.md#sanity-webhook).
   - Leave the Sanity **"Secret"** field **blank** — that's a separate HMAC
     feature this Worker doesn't use (it authenticates on the bearer header).

## Config

| Var / secret      | Type   | Default        | Purpose                                              |
| ----------------- | ------ | -------------- | ---------------------------------------------------- |
| `DEPLOY_HOOK_URL` | secret | —              | The real Cloudflare deploy hook this Worker calls    |
| `WEBHOOK_TOKEN`   | secret | —              | Shared bearer token the Sanity webhook must send     |
| `DEBOUNCE_MS`     | var    | `300000` (5m)  | Quiet window after the last publish before building  |
| `MAX_WAIT_MS`     | var    | `900000` (15m) | Hard cap so a steady stream can't defer forever      |

## Local checks

```bash
npm run check   # tsc --noEmit
npm run tail    # live logs from the deployed Worker
```
