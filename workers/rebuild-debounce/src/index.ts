/**
 * Rebuild-debounce Worker
 * ───────────────────────
 * Sits between the Sanity publish webhook and the Cloudflare deploy hook.
 *
 * WHY THIS EXISTS: on this stack the blog / case-study / glossary routes are
 * SSR (`export const prerender = false`), so published content is live
 * instantly — BUT the sitemap and `llms.txt` / `llms-full.txt` are generated
 * at build time, so a Sanity publish must still trigger a Cloudflare rebuild.
 * The Sanity webhook fires once PER published document, so publishing several
 * docs in a row would kick off several builds. This Worker collapses a burst
 * of publishes into a single build using a Durable Object alarm.
 *
 * Chain: publish → this Worker (waits DEBOUNCE_MS) → deploy hook → one build.
 *
 * Deployed manually with `wrangler deploy` — it is NOT part of the site CI.
 * Per-fork setup (secrets, webhook wiring) is in this folder's README.md.
 */

export interface Env {
  REBUILD_DEBOUNCE: DurableObjectNamespace;
  DEPLOY_HOOK_URL: string; // secret — the real Cloudflare deploy hook
  WEBHOOK_TOKEN: string; // secret — must match the Sanity webhook's Authorization header
  DEBOUNCE_MS?: string; // default 300000 (5 min)
  MAX_WAIT_MS?: string; // default 900000 (15 min)
}

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { "content-type": "application/json" },
  });

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "GET") return json({ ok: true, service: "rebuild-debounce" });
    if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

    // The Sanity webhook authenticates with a shared bearer token (set as an
    // HTTP header on the webhook + a Worker secret). Reject anything else so a
    // random POST can't force-trigger builds.
    const expected = `Bearer ${env.WEBHOOK_TOKEN}`;
    if (!env.WEBHOOK_TOKEN || (req.headers.get("authorization") ?? "") !== expected)
      return json({ error: "unauthorized" }, 401);

    const stub = env.REBUILD_DEBOUNCE.get(
      env.REBUILD_DEBOUNCE.idFromName("singleton"),
    );
    return stub.fetch("https://debounce.internal/schedule", { method: "POST" });
  },
};

export class RebuildDebounce {
  constructor(
    private state: DurableObjectState,
    private env: Env,
  ) {}

  async fetch(_req: Request): Promise<Response> {
    const debounceMs = Number(this.env.DEBOUNCE_MS ?? "300000");
    const maxWaitMs = Number(this.env.MAX_WAIT_MS ?? "900000");
    const now = Date.now();

    // Track when the current burst started so the debounce window can't be
    // pushed out forever by a steady stream of publishes — MAX_WAIT_MS caps it.
    let firstHitAt = await this.state.storage.get<number>("firstHitAt");
    if (typeof firstHitAt !== "number") {
      firstHitAt = now;
      await this.state.storage.put("firstHitAt", firstHitAt);
    }

    await this.state.storage.setAlarm(
      Math.min(now + debounceMs, firstHitAt + maxWaitMs),
    );
    return json({ scheduled: true }, 202);
  }

  async alarm(): Promise<void> {
    const retries = (await this.state.storage.get<number>("retries")) ?? 0;
    let ok = false;
    try {
      ok = (await fetch(this.env.DEPLOY_HOOK_URL, { method: "POST" })).ok;
    } catch {
      ok = false;
    }

    if (ok) {
      await this.state.storage.delete("firstHitAt");
      await this.state.storage.delete("retries");
      return;
    }

    // Deploy hook failed — retry a few times a minute apart, then give up so a
    // persistently-broken hook doesn't loop forever.
    if (retries < 5) {
      await this.state.storage.put("retries", retries + 1);
      await this.state.storage.setAlarm(Date.now() + 60_000);
    } else {
      await this.state.storage.delete("firstHitAt");
      await this.state.storage.delete("retries");
    }
  }
}
