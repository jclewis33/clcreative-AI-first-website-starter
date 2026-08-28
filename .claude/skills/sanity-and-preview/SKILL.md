---
name: sanity-and-preview
description: The Sanity CMS + Cloudflare deployment architecture reference for this starter. Load BEFORE touching anything involving Sanity, GROQ queries, TypeGen, sanity.types.ts, schema types, the Studio (sanity.config.ts, desk structure, Presentation, Vision), draft mode / preview routes (src/pages/preview/**), loadQuery/getDraftModeProps/page-data.ts loaders, adding a new content type or detail route, the sitemap, trailing slashes, wrangler.jsonc, env vars (SANITY_API_READ_TOKEN, PUBLIC_SANITY_*), rebuild webhooks, or the rendering model (prerender vs SSR). Also load when a build fails at prerender with a CSS-extension error, when Presentation shows "Unable to connect", or when content pages 503.
---

# Sanity, Deployment & Preview

## Sanity types — generated, never hand-written

Sanity data is typed from the schema and the queries, by TypeGen. There are no
hand-written interfaces mirroring a document shape.

**After editing any GROQ query or Sanity schema, run `npm run typegen`.** It
extracts the schema to `src/sanity/schema.json` (gitignored) and regenerates
`src/sanity/sanity.types.ts` (committed, so a fresh clone type-checks without
running anything).

**Every query lives in `src/sanity/lib/queries.ts`, wrapped in `defineQuery()`.**
TypeGen only finds queries through that call — a bare template literal is
invisible to it, and a query defined in an `.astro` file is not scanned at all.

`defineQuery()` preserves the query's literal string type, and TypeGen maps
those literals onto result types, so `loadQuery` infers with no generic:

```ts
const { data } = await loadQuery({ query: BLOG_POST_QUERY });
// data: BLOG_POST_QUERY_RESULT | null — a query cannot be paired
// with the wrong shape, because you never name the shape.
```

**Templates take their prop types from the loader that feeds them**, so the two
cannot drift:

```ts
type PageData = NonNullable<Awaited<ReturnType<typeof loadBlogPostPage>>>;
interface Props {
  post: PageData["post"];
  relatedPosts: PageData["relatedPosts"];
}
```

**Sanity fields are nullable.** A document exists the moment an editor creates
it, before any field is filled in, so the generated types say `string | null`
almost everywhere. Component prop types must allow that — a contract claiming
`title: string` is asserting something the CMS does not guarantee. Where a
component boundary wants `undefined` instead (Astro props, `BaseLayout`),
coalesce at the call site with `?? undefined` rather than widening the
component.

**A field the query does not project does not exist**, however plausibly it
reads. Two live bugs came from exactly this — a `comingSoon` guard that never
fired and a `maxWidth` control in the Studio that did nothing — both invisible
while the data was typed `any`. If a field is missing, add it to the projection
and re-run typegen.

## Deployment architecture

The site runs on a **single** Cloudflare Worker (the `your-worker-name`
project). `www.example.com` is the only public URL. The public CMS content
routes (`/blog/**`, `/case-studies/**`, `/glossary/**`) are **prerendered
static HTML** served by the Worker's assets binding at zero CPU; draft preview
happens on a parallel **SSR `/preview/*` tree** (`/preview/blog/[slug]`, etc.)
that renders the identical templates through the identical loaders — only the
perspective differs. A second, tiny Worker (`workers/rebuild-debounce/`)
collapses Sanity publish webhooks into a single rebuild so published content
ships on the next build. The Studio is **hosted by Sanity** (deployed with
`npx sanity deploy`), not embedded in the app. Its Presentation tool iframes
the `/preview/*` routes **cross-origin**, via a cookie set by the
`/api/draft-mode/enable` route on `www.example.com`. Because the frame is
cross-origin, the site allows the Studio origin via CSP `frame-ancestors` (in
[src/middleware.ts](../../../src/middleware.ts) for SSR responses and
[public/_headers](../../../public/_headers) for static assets — keep both in
sync), and the enable route sets the cookie `SameSite=None; Secure`.

**Why a `/preview` tree instead of drafts on the public URLs:** with
`@astrojs/cloudflare`, the request handler returns a matching static asset
**before** `app.render()` is ever called — Astro middleware never runs for a
prerendered path, so a cookie-keyed draft rewrite on the public URL is
impossible (including with `run_worker_first`). And serving the CMS routes as
SSR just to enable preview is not an acceptable workaround: it burns Worker CPU
per request and causes production 503s (`exceededCpu`) under crawler load. The
`/preview` tree is the supported pattern — don't reach for either alternative.

**Studio URLs (Sanity app model):** the branded host
`your-studio.sanity.studio` is a **redirect shim** — it 302s (preserving deep
`/intent/...` paths) to the actual app at
`https://www.sanity.io/@your-org-id/studio/<appId>`, which is itself sandboxed
under `*.sanity.studio` nested inside the `www.sanity.io` dashboard shell. So
`frame-ancestors` (in `src/middleware.ts` + `public/_headers`) must allow
**both** `https://*.sanity.io` **and** `https://*.sanity.studio` (plus
`http://localhost:3333` for `sanity dev`) — NOT just the branded host, and NOT
just `www.sanity.io` (a single-origin value silently blocks Presentation).
`stega.studioUrl` can still point at the branded `your-studio.sanity.studio`
(overlay deep-links redirect through correctly). The backing app id is pinned
in [sanity.cli.ts](../../../sanity.cli.ts) (`deployment.appId`). ⚠️ The
cross-site draft cookie can be blocked by Safari/ITP — verify Presentation in
Chrome; a same-site `studio.example.com` Studio is the fallback.

**Forking this repo as a template?** Work through
[docs/new-project-checklist.md](../../../docs/new-project-checklist.md) — it
lists the security/infra setup that lives in dashboards (Cloudflare WAF
rate-limit rule, GitHub Dependabot settings, Sanity CORS, encrypted secrets)
and must be re-created per project, plus post-launch verification commands.

Architecture reference: [Sanity's Visual Editing with Astro guide](https://www.sanity.io/docs/astro/astro-visual-editing).

## How draft mode works

1. Editor opens `your-studio.sanity.studio` and clicks **Presentation** in
   Studio's left rail. Per-document locations
   ([src/sanity/lib/resolve.ts](../../../src/sanity/lib/resolve.ts)) point at
   the **`/preview/<type>/<slug>`** SSR twins — never the public URLs, which
   are static files where the cookie can't do anything.
2. Presentation calls `/api/draft-mode/enable`
   ([src/pages/api/draft-mode/enable.ts](../../../src/pages/api/draft-mode/enable.ts))
   with a Sanity-signed preview secret. The route validates the secret via
   `@sanity/preview-url-secret`'s `validatePreviewUrl` against the live
   dataset — if the request isn't from a legitimate Studio session, it
   returns 401.
3. On success the route sets the `sanity-preview-mode` cookie
   (`perspectiveCookieName` from `@sanity/preview-url-secret/constants`) with
   the editor's chosen perspective (default `"drafts"`) and redirects to the
   target path.
4. The Presentation iframe loads the `/preview/*` path. The preview route calls
   the same shared loader as its public twin
   ([src/sanity/lib/page-data.ts](../../../src/sanity/lib/page-data.ts)),
   passing `getDraftModeProps(Astro)`
   ([src/sanity/lib/draft-mode.ts](../../../src/sanity/lib/draft-mode.ts))
   which reads the cookie and spreads `{ perspectiveCookie }` into `loadQuery`
   ([src/sanity/lib/load-query.ts](../../../src/sanity/lib/load-query.ts)).
   When present, `loadQuery` fetches drafts with stega encoding and
   authenticates using `SANITY_API_READ_TOKEN`.
5. [src/layouts/BaseLayout.astro](../../../src/layouts/BaseLayout.astro) checks
   `Astro.cookies.has(perspectiveCookieName)` (guarded by `Astro.isPrerendered`)
   and conditionally mounts
   [src/components/SanityVisualEditing.tsx](../../../src/components/SanityVisualEditing.tsx)
   (click-to-edit overlays + history sync + content refresh) and
   [src/components/DisableDraftMode.tsx](../../../src/components/DisableDraftMode.tsx)
   (exit button, hidden inside the iframe).
6. When an editor changes a field, `SanityVisualEditing`'s `refresh` callback
   reloads the page. The server re-fetches with drafts perspective.
7. Clicking "Disable Draft Mode" (only visible outside the iframe) hits
   `/api/draft-mode/disable`, which clears the cookie.

Public visitors get prerendered HTML with `published` content baked in, and
never have the cookie on the SSR routes → `<SanityVisualEditing>` isn't
mounted. **Drafts can't leak.**

The `/preview` tree is invisible to search and never edge-cached, via three
required layers: `Disallow: /preview` in
[public/robots.txt](../../../public/robots.txt); `X-Robots-Tag: noindex,
nofollow` + forced `private, no-cache` from
[src/middleware.ts](../../../src/middleware.ts) (forced **regardless of the
cookie** — Cloudflare's edge cache doesn't vary on cookies, so a cached
published render would otherwise be served back to editors); and exclusion from
the sitemap in [astro.config.mjs](../../../astro.config.mjs).

**Publishing requires a rebuild.** Prerendered content ships on the next build,
so a Sanity publish must trigger one: Sanity webhook (filter
`!(_id in path("drafts.**"))`, on Create/Update/Delete) → the rebuild-debounce
Worker ([workers/rebuild-debounce/](../../../workers/rebuild-debounce/README.md),
~5 min quiet period / ~15 min hard cap via a Durable Object alarm) → Cloudflare
deploy hook → **one** build. The debounce matters because Sanity fires once per
document — publishing a batch without it means one build per document.
Publish-to-live lands ~5–20 minutes depending on the debounce window.

## Rendering model — prerender public, SSR only /preview and /api

`astro.config.mjs` uses `output: "static"` with `@astrojs/cloudflare`. **All
public routes are prerendered**, including the CMS content routes — each
dynamic route exports a `getStaticPaths` fed by a minimal slug-only query
(helpers in [src/sanity/lib/page-data.ts](../../../src/sanity/lib/page-data.ts)).
Only two kinds of routes opt into SSR with `export const prerender = false;`:

- `src/pages/preview/**` — the draft-preview twins that Presentation iframes
- `src/pages/api/**` — the scorecard endpoint and draft-mode cookie routes

Rules that keep this model healthy:

- **Keep slug queries thin.** `getStaticPaths` fetches the whole collection at
  build time — enumerate `slug.current` only.
- **Exclude "not published yet" flags from the slug query** (e.g.
  `comingSoon != true` on case studies), or you'll build pages that immediately
  redirect to /404. Those documents remain previewable under `/preview`.
- **`getStaticPaths` is extracted into its own module at build time.** Only
  _imports_ are in scope inside it — sibling consts in the same frontmatter are
  **not**. Keep its helpers in an imported module (`page-data.ts`). Symptom of
  getting this wrong: `<helper> is not defined` at build, pointing into an
  Astro-generated chunk.
- **Fresh forks build green:** the `page-data.ts` static-path helpers return
  `[]` (with a warning) when the Sanity project id is still the template
  placeholder. For a **real** project id they rethrow — a Sanity outage
  mid-build must fail the build loudly, not silently ship a site with every
  content page missing.

## Trailing slash config

URLs must resolve without trailing slashes. Two places must stay in sync:

1. **[astro.config.mjs](../../../astro.config.mjs)** — `trailingSlash: 'never'`
   on the root config so Astro emits canonical URLs, sitemap entries, and
   internal links without trailing slashes.
2. **[wrangler.jsonc](../../../wrangler.jsonc)** — inside the `assets` block,
   `"html_handling": "drop-trailing-slash"` so the Worker serves `/contact`
   instead of redirecting at the edge.

If only one side is set, you get edge redirects or 404s that don't show up in
local dev.

## Sitemap

Every public route is prerendered, so `@astrojs/sitemap` enumerates the whole
site — **including the CMS content routes** — automatically from the route
table. There is **no** `customPages` option and **no** `getSanityUrls()`-style
helper — a `customPages` list is only ever needed for SSR routes (which are
invisible to the sitemap), and no content route here is SSR. A new content type
only needs a prerendered route with `getStaticPaths` and it appears in the
sitemap on the next build.

**Exclusions** live in [astro.config.mjs](../../../astro.config.mjs) as **two
lists with two different matching modes** (a single loose `page.includes(path)`
gets it wrong in both directions):

- `NOINDEX_PATHS` (src/config/seo.shared.mjs) — whole path segments (`/x` and
  `/x/…`, never `/blog/x-…`): the dev-only pages and `/preview`.
- `NOINDEX_PREFIXES` — literal prefixes mirroring robots.txt `Disallow`
  semantics: one `/thank-you` entry covers every `/thank-you*` variant.
  `isNoindexRoute()` combines both and feeds the sitemap filter, the generated
  `robots.txt`, the `noindex` meta tag, the SSR `X-Robots-Tag`, and the
  llms.txt index — one fact, five surfaces.

Keep both lists in sync with [public/robots.txt](../../../public/robots.txt).
To verify after a change: build and inspect `dist/sitemap-0.xml` — count
entries, confirm no robots-disallowed URL appears, confirm no real content page
is missing.

## Studio

Sanity Studio is **hosted by Sanity** at `your-studio.sanity.studio` — not
embedded in the app. The `@sanity/astro` integration in `astro.config.mjs`
intentionally omits `studioBasePath` (so no `/studio` route is injected) but is
still present because it provides the `sanity:client` virtual module used by
`src/sanity/lib/load-query.ts`. Studio config lives in
[sanity.config.ts](../../../sanity.config.ts) and is shared by the hosted
Studio, `npx sanity deploy`, and `npx sanity dev`. `stega.studioUrl` is the
absolute hosted URL so overlay clicks deep-link into the hosted Studio.

**Deploying the Studio:** `npx sanity schema deploy` then `npx sanity deploy`
(publishes to `your-studio.sanity.studio` using the `studioHost` /
`deployment.appId` already set in `sanity.cli.ts`). Studio updates ship
independently of the site build.

**Local workflow:** run `npm run studio:local` (Studio at `localhost:3333`,
iframing the local site) and `npm run dev` (site at `localhost:4321`) in
separate terminals — there is no `/studio` on the dev site. `studio:local` sets
`SANITY_STUDIO_PREVIEW_URL=http://localhost:4321` inline; a plain
`npm run studio` / `sanity dev` falls back to `SITE_URL`, which iframes
**production** — local route changes appear to do nothing, and if the route
doesn't exist in production yet Presentation shows **"Unable to connect"**
(that means "wrong origin", not broken code). The env var lives in
`package.json` on purpose — do **not** put `SANITY_STUDIO_PREVIEW_URL` in
`.env`, where it leaks into `sanity deploy` and ships a Studio pointing at
localhost. `frame-ancestors` already allows `localhost:3333`.

**Staging-first deploy (ship before the real domain exists).** A fork can run
on the Worker's free `https://<worker>.<account>.workers.dev` URL — including
Presentation — before any custom domain is attached, with **no per-fork code
edits**. `SITE_URL` in
[src/config/site.shared.mjs](../../../src/config/site.shared.mjs) is
**env-overridable** (`process.env.SITE_URL || "<literal>"`), so the Cloudflare
_build_ env supplies the staging origin; `sanity.config.ts` drives
`presentationTool`'s `previewUrl.initial` and `allowOrigins` from `SITE_URL`
plus a `https://*.workers.dev` wildcard. Deploy the Studio with
`SANITY_STUDIO_PREVIEW_URL=https://<worker>.<account>.workers.dev npx sanity
deploy` (env var on the same line). At launch, change the Cloudflare `SITE_URL`
build var to the real origin and redeploy — no code commit. Full runbook:
**§4a** in [docs/new-project-checklist.md](../../../docs/new-project-checklist.md).

## Studio editing experience (desk, groups, icons, Vision)

The Studio UI is configured entirely in code — `sanity.config.ts` for the
desk/plugins/branding, and each schema file for per-type icons and field
groups. None of this touches content data.

**Branding.** `defineConfig` sets `name`, `title`, a workspace `icon`
(`StudioIcon`) and a navbar `logo` (`StudioLogo`), both in
[src/sanity/components/](../../../src/sanity/components/) as TSX SVGs using
`currentColor`. `StudioLogo` and the front-end `Logo.astro` both render their
SVG paths from the shared
[src/config/logo-paths.ts](../../../src/config/logo-paths.ts) — edit that one
file to restyle the wordmark everywhere.

**Landing view / Dashboard.** There is **no in-Studio dashboard** — the
org-level overview is Sanity's **hosted Dashboard**. `structureTool` is the
first plugin, so opening the Studio lands on the content desk. Quick-link
widgets belong in the hosted Dashboard — don't add `@sanity/dashboard`.

**Sanity version policy — track current.** The Studio runs on **Sanity 6**; no
Sanity package is version-held. A Sanity major deserves a real review —
re-verify the Studio plugins (`sanity-plugin-media`, `@sanity/code-input`,
`visionTool`), the desk structure, and the visual-editing islands — but treat
it as an ordinary upgrade. Verify in this order: `npm ci` (on a **Linux**
runner, where native/optional-peer resolution bugs surface) → `npm run check`
→ `npm run build` → `npx sanity build` → Presentation in a browser. If an
"Invalid hook call" appears in dev after an `@sanity/astro` bump, that's a
duplicate-React issue
([sanity-astro#406](https://github.com/sanity-io/sanity-astro/issues/406)) —
pin `@sanity/astro` to the last-good version.

⚠️ **Never import `sanity/*` Studio modules from site code.** The Studio
dependency tree includes packages that ship CSS imports, which the prerender
step cannot load (`Unknown file extension ".css"`) — the build fails at the
prerender stage, well after the bundle looks fine. This is why the Presentation
location map ([resolve.ts](../../../src/sanity/lib/resolve.ts), Studio-only)
and the public content-link helper
([internal-links.ts](../../../src/sanity/lib/internal-links.ts), site-only,
zero Studio imports) are **separate modules**. Keep them separate.

**Desk structure** (the `structureTool({ structure })` resolver). An explicit
`S.list()` — **every new document type must be added here by hand** or it will
not appear in the desk. Layout: Site Settings (pinned singleton) · Blog Posts /
Case Studies / Glossary at top level with curated sub-views (Featured, Drafts,
Coming Soon — plain GROQ filters on `S.documentList()`) · Reusable Content and
People & Social folders. The `SINGLETON_TYPES` / `SINGLETON_ACTIONS` logic
keeps `siteSettings` a singleton — leave it intact.

**Field groups.** `blogPost`, `caseStudy`, `glossaryTerm` split fields into
tabs via `groups:` on the type + `group:` per field. Convention: `content`
(default), then `media`, `meta`, `seo`. Editor-UI only — no data migration, so
always safe. Object/array-member sub-fields do not take groups.

**Icons.** Every document type sets `icon:` on its `defineType` (from
`@sanity/icons`). Current mapping: blogPost→`DocumentTextIcon`,
caseStudy→`CaseIcon`, glossaryTerm→`BookIcon`, author→`UserIcon`,
testimonial→`CommentIcon`, blogCta→`BellIcon`, ctaSection→`BlockElementIcon`,
siteSettings→`CogIcon`.

**Vision (GROQ playground).** `visionTool` is dev-gated:
`...(import.meta.env?.DEV ? [visionTool({ defaultApiVersion: "2025-03-15" })] : [])`.
The `?.` keeps it safe when `sanity.config.ts` is loaded by the Sanity CLI
(Node has no `import.meta.env`). Keep `defaultApiVersion` in sync with
`astro.config.mjs`.

**Document actions & badges.** Extended via
[src/sanity/components/studioDocument.ts](../../../src/sanity/components/studioDocument.ts):
a "View on site" action on `PREVIEWABLE_TYPES` plus Featured / Coming Soon
badges. The singleton `actions` filter for `siteSettings` is preserved — keep
it intact.

**SEO length nudges.** `blogPost`/`caseStudy` `description` fields return an
**array of validation rules**: a hard `required().max(300)` error plus a
`max(155).warning(...)` non-blocking nudge.

**When adding a new document type, do all four:** (1) an `S.listItem()` in the
right desk group, (2) an `icon`, (3) field `groups` if field-heavy, (4) a
Presentation location if previewable. A detail route also needs the **four
route pieces** below.

## Image alt text (asset-level fallback)

Editors set **Alt text** once per asset in the Media tab
(`sanity-plugin-media` writes the asset's native `altText`). Queries project
every image alt as `"imageAlt": coalesce(imageAlt, <image>.asset->altText, "")`
(galleries also fold in their per-block default). Precedence: per-placement
field → asset alt → empty string; the trailing `""` guarantees a **string** so
`<Image>`/`Visual` never receives `null`. The same projection is duplicated in
the one inline query in `CaseStudyFeatured.astro` — update both when adding an
image query. Per-field `imageAlt` inputs stay **optional** (they override the
asset alt); body inline-image alt stays `required` (contextual, per insertion).

**When adding a new image field + query:** mirror the
`coalesce(…, asset->altText, "")` projection.

## Presentation locations

Per-document iframe URLs are mapped in
[src/sanity/lib/resolve.ts](../../../src/sanity/lib/resolve.ts) via
`defineLocations`. Location hrefs must point at the **`/preview/<type>/<slug>`**
SSR twins.

⚠️ **Two URL maps exist — separate modules on purpose:**

| Module              | Used by                                         | Returns                                           |
| ------------------- | ----------------------------------------------- | ------------------------------------------------- |
| `resolve.ts`        | the Studio only (imports `sanity/presentation`) | `/preview/<type>/<slug>` — draft-preview targets  |
| `internal-links.ts` | site code only (zero Studio imports)            | `/blog/…`, `/case-studies/…`, `/glossary/…` links |

`resolve.ts` is compiled into the **hosted Studio bundle**, so location changes
require `npx sanity deploy`. Deploy order: **site first** (so the `/preview`
route exists), **then the Studio**.

## Required env vars

| Name                       | Where                                          | Purpose                                                                                            |
| -------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `PUBLIC_SANITY_PROJECT_ID` | `wrangler.jsonc` `vars` + local `.env`         | Sanity project                                                                                     |
| `PUBLIC_SANITY_DATASET`    | `wrangler.jsonc` `vars` + local `.env`         | Dataset name                                                                                       |
| `SANITY_API_READ_TOKEN`    | Cloudflare **encrypted secret** + local `.env` | Viewer token — validates preview secrets, authenticates draft fetches. Never a plain wrangler var. |

The Sanity project needs `https://www.example.com` (and
`http://localhost:4321` for dev) as CORS origins with **Allow credentials**.

## Data fetching pattern

Every page and Sanity-fetching component goes through `loadQuery` and forwards
the perspective via `getDraftModeProps(Astro)` — pass the **whole `Astro`
global**, not `Astro.cookies`. The helper checks `isPrerendered` and
short-circuits, so the _same call_ is safe on prerendered public routes (build
time → `published`) and SSR preview routes (request time → cookie perspective).

```astro
---
import { loadQuery } from "../sanity/lib/load-query";
import { getDraftModeProps } from "../sanity/lib/draft-mode";
import { BLOG_POSTS_QUERY } from "../sanity/lib/queries";

const { data: posts } = await loadQuery({
  query: BLOG_POSTS_QUERY,
  ...getDraftModeProps(Astro),
});
---
```

Helpers that fetch Sanity data (e.g. `src/sanity/lib/testimonials.ts`) accept
`perspectiveCookie` as an option so the calling page can forward it.

**Detail pages use the shared loaders in `src/sanity/lib/page-data.ts`** — one
function per content type, called by both the public prerendered route and its
`/preview` twin so the two can never drift. Loader rules:

- Fetch the single document **first** (related-content queries depend on its
  categories/slug), then `Promise.all` everything independent — never stack
  sequential awaits.
- **Related content is filtered in GROQ, never in JS over the whole
  collection.** Fetching all posts to render 3 related cards is the pattern
  that caused production `exceededCpu` 503s. Query the few cards you need,
  with a small buffer over the card slot (`[0...4]` for a 2-card slot) when
  the template applies its own final filter.
- Return `null` for "not found" / "not publicly visible" and let the route
  decide the response.

**Adding a new content type with a detail route needs four pieces:**

1. **Public prerendered route** — `src/pages/<type>/[slug].astro` with
   `export const getStaticPaths = get<Type>StaticPaths;` (helper in
   `page-data.ts`; slug-only query, "not published" flags excluded).
2. **`/preview` SSR twin** — `src/pages/preview/<type>/[slug].astro` with
   `prerender = false`, same template, same loader.
3. **Shared loader** — `load<Type>Page()` in `page-data.ts`.
4. **Presentation location** — a `defineLocations` entry in `resolve.ts`
   pointing at `/preview/<type>/<slug>`, followed by a Studio deploy.

The sitemap and llms endpoints pick the new route up automatically.
