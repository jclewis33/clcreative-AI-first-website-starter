# The Sanity branch — stand up the CMS

**Only run this if the fork answered "yes, Sanity" at the CMS gate.** If they said
no or not-yet, read [no-cms.md](./no-cms.md) instead and skip everything here.

Work top to bottom. Confirm each external action before taking it.

## S0. Preflight

Check the Sanity MCP is connected and the user is authenticated: call `whoami`. If
it isn't connected/authed, tell the user to connect the Sanity MCP, or fall back to
the `npx sanity` CLI for every step below.

## S1. Create the project

1. `list_organizations` → pick the target org (ask if more than one).
2. `create_project` with the site name as the title.
3. `create_dataset` named `production`.
4. Capture the new **projectId** — it feeds the setup CLI and the `.env`.

If the Sanity MCP isn't available, have the user run `npx sanity init` and report
back the projectId.

> Feed the projectId into the setup CLI's `sanityProjectId` answer (main SKILL.md,
> "Write the config files"). Do that **before** the deploys below — they read
> `sanity.cli.ts` / `site.shared.mjs` to know which project to target.

## S2. Studio branding — do this BEFORE deploying

The workspace `icon` is extracted into the studio manifest **at deploy time**, so
the navbar logo and dashboard rail icon must already be in place when you run
`npx sanity deploy`. Full procedure, including the sandboxed-iframe mechanism that
makes the rail icon fussy: [studio-branding.md](./studio-branding.md).

## S3. Deploy the schema + Studio

This is the load-bearing step — get it right so the new project's Studio and the
site's queries actually work. Make sure you're logged in to the same Sanity account
that owns the project (`npx sanity login` if needed).

1. **Validate the schema compiles first** — catch errors before they hit the new
   project: `npx sanity build` (compiles the Studio incl. the schema). Fix any
   schema error before deploying. The schema is 13 types defined in
   [src/sanity/schemaTypes/](../../../../src/sanity/schemaTypes/) (`index.ts` is the
   registry) — don't edit them to set up a fork; they ship ready.
2. **Deploy the schema manifest:** `npx sanity schema deploy`. This publishes the
   schema to the project so Presentation overlays, TypeGen, and the Sanity MCP
   `get_schema` can read it. (The MCP `deploy_schema` tool is an alternative if the
   CLI isn't available — but prefer the CLI, which uses `sanity.cli.ts`.)
3. **Deploy the hosted Studio:** `npx sanity deploy` → publishes to
   `https://<studioHost>.sanity.studio`. Grab the issued **appId**, write it into
   `deployment.appId` in [sanity.cli.ts](../../../../sanity.cli.ts) (the setup CLI
   cleared it), and commit — so future deploys target the same app.

> **⚠️ Deploying staging-first?** If the site lives on a staging `*.workers.dev`
> URL (no real domain yet), the Studio's Presentation must point there, so deploy
> with `SANITY_STUDIO_PREVIEW_URL` set **on the same line before `npx`**:
>
> ```bash
> SANITY_STUDIO_PREVIEW_URL=https://<worker>.<account>.workers.dev npx sanity deploy
> ```
>
> A plain `npx sanity deploy` bakes in the `SITE_URL` fallback (the not-yet-existing
> production domain) and Presentation will load that instead of staging. At launch,
> redeploy the Studio with `SANITY_STUDIO_PREVIEW_URL` set to the real origin (or
> unset it to fall back to the now-correct `SITE_URL`). The code already trusts any
> `https://*.workers.dev` origin via `allowOrigins` in
> [sanity.config.ts](../../../../sanity.config.ts) — no per-fork edit. Full runbook:
> §4a in [docs/new-project-checklist.md](../../../../docs/new-project-checklist.md).

## S4. Verify the schema landed

Don't skip — this is the whole point of S3.

- Sanity MCP `get_schema` on the new project should list **all 13 types**:
  `author, blogCta, blogCtaInline, blogFaq, blogPost, callout, caseStudy,
ctaSection, glossaryTerm, seo, siteSettings, testimonial, videoEmbed`.
- Open `https://<studioHost>.sanity.studio` → the desk shows **Site Settings**
  (pinned singleton) on top, then **Blog Posts / Case Studies / Glossary Terms**,
  then the **Reusable Content** and **People & Social** folders. If a type is
  missing from the desk, it's not in the `structureTool` resolver in
  [sanity.config.ts](../../../../sanity.config.ts) — but for an unmodified fork it's
  already complete.
- **`apiVersion` consistency:** the queries/Studio pin `2025-03-15`. If you changed
  `sanityApiVersion`, also update the matching literals in `sanity.config.ts`
  (`STRUCTURE_API_VERSION`, `visionTool` default) and `astro.config.mjs` so they
  agree.
- **Verify the Studio branding landed** — check the deployed manifest serialized the
  icon as an inline `<svg><image href="data:…">` (not an `<img>`, not empty), then
  hard-refresh the dashboard rail:

  ```bash
  curl -s "https://<studioHost>.sanity.studio/static/create-manifest.json" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['workspaces'][0]['icon'][:200])"
  ```

  And confirm the navbar logo shows the brand mark inside the Studio.

> **No content seeding required.** A fresh project is empty and the site is
> null-safe — `siteSettings` is queried with `?.… ?? null`, so pages render default
> CTAs/empty states and the build passes. Optionally, offer to seed an initial
> **Site Settings** document (MCP `create_documents` + `publish_documents`) so
> editors don't start from nothing — but it's not needed for the site to work;
> opening "Site Settings" in Studio creates it on first edit.

> **When the fork later adds a new document type:** per CLAUDE.md, do all four —
> add it to `schemaTypes/index.ts`, an `S.listItem()` in the desk resolver, an
> `icon`, and a Presentation location in `resolve.ts` (pointing at
> `/preview/<type>/<slug>`) — or it won't show in the desk / preview. A type with
> its own detail route additionally needs the **four route pieces** from CLAUDE.md →
> "Adding a new content type". Setup itself doesn't require this; it's for future
> schema work.

> **Deploy order for preview:** Presentation iframes the site's `/preview/*` routes,
> so the **site** must be deployed before Presentation can connect (locally,
> `npm run studio:local` + `npm run dev` works immediately). Any later change to
> `resolve.ts` needs `npx sanity deploy` — a site deploy alone leaves Presentation
> loading stale URLs.

## S5. CORS origins (MCP)

Add all four to the new project (with credentials allowed):
`https://www.<newdomain>`, `https://<studioHost>.sanity.studio`,
`http://localhost:4321`, `http://localhost:3333`. Use `add_cors_origin` per origin.
`npx sanity deploy` usually adds the studio host automatically — verify.

> **Staging-first:** if the site is on a staging `*.workers.dev` URL, add
> `https://<worker>.<account>.workers.dev` as a CORS origin **with credentials
> allowed** too — Presentation's draft fetches are credentialed and will fail
> without it. At launch, add the real `https://www.<newdomain>` the same way.

## S6. Viewer token (manual — guide)

There's no MCP tool to mint tokens. Tell the user: sanity.io/manage → the new
project → API → Tokens → create a **Viewer** token. Put it in `.env` as
`SANITY_API_READ_TOKEN`, and later add it as a Cloudflare **encrypted secret**
(never a plain wrangler var).

## S7. Regenerate the types

```bash
npm run typegen
```

`npm run check` type-checks against `src/sanity/sanity.types.ts`, which is generated
from the deployed schema — so run this **after** S3's `sanity schema deploy` so the
types match the new project. (The generated `sanity.types.ts` is committed; the
intermediate `schema.json` is gitignored and regenerated each time.)

## S8. The publish webhook — REQUIRED to surface

**Always raise this.** The content routes are **prerendered**, so this webhook
chain is **the only path by which published content reaches the live site** (the
sitemap and `llms.txt` / `llms-full.txt` regenerate on the same build). Until it's
wired, clicking Publish changes nothing on production — only draft preview under
`/preview/*` reflects edits.

The webhook fires once per document, so the starter ships a standalone
**rebuild-debounce Worker** that collapses a burst of publishes into one build:

**publish → debounce Worker (waits ~5 min) → Cloudflare deploy hook → one build**

Deploying that Worker and setting its two secrets is Cloudflare-side work —
see [cloudflare.md](./cloudflare.md) §"Rebuild-debounce Worker". Once the Worker is
up and you have its URL + `WEBHOOK_TOKEN`, the webhook itself is **always a Sanity
dashboard step** (manage.sanity.io → project → API → Webhooks). Give the user these
exact values:

- **URL** → the Worker's `*.workers.dev` URL (**not** the deploy hook directly).
- **HTTP header** → `Authorization: Bearer <WEBHOOK_TOKEN>`.
- **Trigger on** → Create, Update, Delete.
- **Filter** → `!(_id in path("drafts.**"))` — intentionally broad (any published
  doc of any type; see the main README).
- Leave Sanity's **"Secret"** field blank (a different HMAC feature we don't use).

> **If the user defers this**, warn clearly: with prerendered content routes,
> **publishing in Sanity will not change the live site at all** until the next git
> push or manual rebuild — this is not a cosmetic sitemap lag. Draft preview in the
> Studio keeps working. Treat deferral as a launch blocker to revisit, and record it
> in the handoff.

## Done criteria for this branch

- New project + `production` dataset exist.
- **Schema deployed and verified** — `get_schema` (or the live desk) shows all 13
  types, and the desk renders with the Site Settings singleton + content lists.
- Studio deployed to `<studioHost>.sanity.studio`; the issued `appId` is written
  back into `sanity.cli.ts` and committed.
- Studio navbar logo + dashboard rail icon show the brand mark — verified via the
  deployed `create-manifest.json` (inline `<svg>`, not an `<img>`).
- CORS origins added; Viewer token created and placed in `.env`.
- `npm run typegen` run against the new schema.
- Publish webhook wired **or** explicitly deferred and listed in the handoff.
