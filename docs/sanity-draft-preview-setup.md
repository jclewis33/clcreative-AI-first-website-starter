# Sanity Draft Preview — pointer

> This file is a pointer, not the authority. The full architecture lives in
> **[CLAUDE.md](../CLAUDE.md)** → "Deployment, Sanity Studio & Preview" and
> **[README.md](../README.md)** → "Rendering model" / "Draft preview
> (Presentation)".

## Current model — prerendered public routes + an SSR `/preview` tree

The public CMS routes (`/blog/**`, `/case-studies/**`, `/glossary/**`) are
**prerendered** at build time (`getStaticPaths` fed by slug-only queries) and
served as static HTML. Sanity's Presentation tool iframes the parallel **SSR
twins** under `/preview/*` (`/preview/blog/<slug>`, etc. — `prerender = false`)
on the **same** production Worker. Both trees render the identical templates
through the identical loaders in
[`src/sanity/lib/page-data.ts`](../src/sanity/lib/page-data.ts); the preview
tree simply runs per-request, so the `sanity-preview-mode` cookie can switch
the fetch to the drafts perspective.

Why not drafts on the public URLs: `@astrojs/cloudflare` returns a matching
static asset **before** Astro middleware runs, so a cookie-keyed rewrite on a
prerendered path is impossible — and making the content routes SSR instead
(the previous model here) burned Worker CPU per request and caused production
`exceededCpu` 503s. Do not resurrect either variant.

The `/preview` tree is editor-only: robots-disallowed
([`public/robots.txt`](../public/robots.txt)), noindexed and never edge-cached
([`src/middleware.ts`](../src/middleware.ts)), and excluded from the sitemap.
Presentation's per-document URLs are mapped in
[`src/sanity/lib/resolve.ts`](../src/sanity/lib/resolve.ts) — location hrefs
point at `/preview/...`, while `resolveInternalLinkHref` (same file) keeps
returning **public** URLs for links rendered inside content. `resolve.ts`
ships in the **Studio** bundle: deploy the site first, then `npx sanity
deploy`.

## History

Two earlier architectures are gone; don't confuse this model with either:

1. A separate SSR preview **app** deployed to `preview.example.com` with a
   Studio "Open Preview" action (`src/sanity/lib/preview.ts`,
   `preview-action.ts`) — removed long ago.
2. SSR **public** content routes (`prerender = false` on `/blog/**` etc.) with
   cookie-switched drafts on the public URLs — replaced by the prerendered +
   `/preview` model above after it caused CPU-limit 503s in production.
