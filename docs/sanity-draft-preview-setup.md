# Sanity Draft Preview Setup — superseded

> ⚠️ **This document describes an earlier architecture that is no longer used.**
> It documented a *separate* SSR preview app (under `preview/`, deployed to
> `preview.clcreative.co`) with a lightweight Studio "Open Preview" action. That
> `preview/` app and its helper files (`src/sanity/lib/preview.ts`,
> `preview-action.ts`) have been removed.

## Current model

Draft preview now runs on the **single** production Worker (`clcreative`,
`www.clcreative.co`) via Sanity's **Presentation tool** and a
`sanity-preview-mode` cookie — there is no separate preview deployment or
subdomain. The CMS content routes (`/blog/**`, `/case-studies/**`,
`/glossary/**`) are SSR (`prerender = false`) so they can fetch drafts
per-request when the cookie is present; everything else stays static.

For the authoritative description of how this works (the enable/disable flow,
`loadQuery` + `getDraftModeProps`, `SanityVisualEditing`, required env vars, and
CORS), see:

- **[CLAUDE.md](../CLAUDE.md)** → "Deployment, Sanity Studio & Preview"
- **[README.md](../README.md)** → "Rendering model" and "Draft preview (Presentation)"

This file is kept only as a pointer; the content above replaces everything that
used to be here.
