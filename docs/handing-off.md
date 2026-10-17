# Handing off a finished site

This guide is for two people: the developer handing a finished site over,
and whoever receives it (the client, or the next developer). A site built
from this starter is a normal folder of files. You can hand it over by
transferring the GitHub repository or by sending a zip.

Sections 1 to 3 are for the person handing over. Section 4 is for the
person receiving.

## What the client gets

- **The code and the content, together.** Every blog post, case study,
  project, gallery photo, testimonial, author, call to action and service
  page is a file in `src/content/`. Editing them is covered step by step in
  [`editing-content.md`](editing-content.md).
- **No CMS account to look after.** A site that keeps its content in files
  needs only the accounts in section 3, "Accounts and secrets".
- **Sanity projects only:** if the site uses the Sanity add-on, its content
  lives in a Sanity project instead, so that project is handed over too
  (section 3).

---

## 1. Before you hand off

### Remove the sample content

The starter ships sample entries. Replace or delete any that are still
there (each with its photos in the folder's `images/`):

| Folder                      | Sample entries                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/content/blog/`         | `accessibility-guide`, `customer-focused-messaging`, `industry-trends`                                       |
| `src/content/authors/`      | `daniel-reyes`, `priya-shah`                                                                                 |
| `src/content/case-studies/` | `acme-corp-rebrand`, `greenleaf-organics-seo`, `summit-outdoor-migration`                                    |
| `src/content/projects/`     | `breakfast-nook-remodel`, `design-studio-refresh`, `home-office-built-in`                                    |
| `src/content/gallery.json`  | `arched-window-nook`, `oak-shelf-and-arch`, `stone-and-linen-samples`, `studio-workstations`, `swatch-board` |
| `src/content/testimonials/` | `dana-kim`, `hannah-price`, `luis-ortega`, `marcus-bell`                                                     |
| `src/content/ctas/blog/`    | `accessibility-checklist`, `free-site-review`                                                                |
| `src/content/ctas/section/` | `start-a-project`, `talk-to-us`                                                                              |
| `src/content/services/`     | `bathroom-remodeling`, `kitchen-remodeling`                                                                  |

Three places name sample entries and must follow your changes:
`src/content/settings.json` (the default CTAs), `FEATURED_CASE_STUDIES_SLUGS`
in `src/components/sections/CaseStudyFeatured.astro` (the homepage case
studies) and `<SingleTestimonial name="Marcus Bell" />` in
`src/pages/index.astro`. The checks below catch a missed `settings.json`.
The other two don't fail a build: if a featured case study or the named
testimonial no longer exists, that homepage section is left out. The
development server (`npm run dev`) prints a warning naming the missing
entry (`[CaseStudyFeatured]` or `[SingleTestimonial]`) when you open the
homepage, so open it once and look at the terminal.

**Sanity projects:** the sample entries are documents in the dataset.
Delete them in the Studio.

### Run the full check

```bash
npm run check
npm run check:content
npm run build
npm run check:content-build
```

All four must finish without an error. `check:content-build` reads the
built site, so it runs after `build`. The CI workflow
(`.github/workflows/ci.yml`) runs these and the other checks on every
pull request and every push to `main` (and `development`); make sure the
latest run is green.

### Make sure no secrets are in the repository

```bash
git ls-files .env
```

This must print nothing. `.env` holds your local copies of the secrets and
is ignored by git; it never goes to the client. The client gets
`.env.example`, which lists the names with placeholder or empty values.

### Decide what else ships

Both folders below are safe to hand over. Neither holds a secret.

- **`.claude/`**: the instructions and skills for Claude Code. Keep it if
  the recipient (or their next developer) might use Claude Code on the
  site; it is what makes the AI follow the project's conventions.
- **`docs/superpowers/`**: the build history of the starter (plans and
  design notes). Nothing reads it. Delete it if you like.

---

## 2. Transfer the code

Pick one.

### Option A: transfer the GitHub repository

1. On GitHub, open the repository → **Settings** → **General** → **Danger
   Zone** → **Transfer ownership**, and enter the client's account or
   organization. Or, to keep the repository where it is, add the client as
   an owner or admin instead.
2. Cloudflare builds the site from the repository. After a transfer, open
   the Worker in Cloudflare (**Workers & Pages** → the Worker →
   **Settings** → **Builds**) and connect it to the repository at its new
   location. If the client is also moving to their own Cloudflare account,
   they connect it there instead (section 3).
3. Push one small change and confirm a build runs and the CI workflow
   passes on the new repository.

The repository keeps its full history, the CI workflow and the Dependabot
settings file. GitHub's security settings are per repository; check them
on the new one ([`new-project-checklist.md`](new-project-checklist.md),
section 5). The CI workflow uses no GitHub secrets, so nothing needs
re-entering there.

### Option B: send a zip

From the project folder, with everything committed:

```bash
git archive --format=zip -o site.zip HEAD
```

The zip holds exactly the committed files. Ignored files never go in:
no `.env`, no `node_modules/`, no `dist/`, no local Cloudflare state
(`.wrangler/`). Uncommitted changes are left out too, so commit first.

The zip has no git history. The recipient can start a fresh history in the
unzipped folder:

```bash
git init
git add -A
git commit -m "Initial import"
```

This is worth doing: Cloudflare builds from a GitHub repository, and the
Sanity add-on installer (`npm run addon:sanity`) refuses to run in a folder
that is not a git repository unless it is given `--force`.

---

## 3. Accounts and secrets

Secrets are never written into the code. Each one lives in the Cloudflare
dashboard (the Worker → **Settings** → **Variables and Secrets**, type
**Secret**) and, for testing on a computer, in a local `.env` file that is
never committed. Cloudflare does not show a secret's value again once
saved, so whoever sets up the new location needs the values from their
source (the list below), not from Cloudflare.

| Account                   | What the site uses                                                                                                                                                                                  | Where it is configured                                                                                                                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Domain registrar**      | The domain name                                                                                                                                                                                     | The registrar. The domain's DNS runs through Cloudflare.                                                                                                                                                          |
| **Cloudflare**            | The Worker that serves the site, its custom domain, a KV namespace for sessions, the `/api/lead` rate-limit rule, and the build variable `SITE_URL`                                                 | Worker name and KV namespace id: `wrangler.jsonc`. Everything else: the Cloudflare dashboard ([`new-project-checklist.md`](new-project-checklist.md), section 4).                                                 |
| **GoHighLevel**           | The client's sub-account receives every form. Secrets: `GHL_API_TOKEN` (a Private Integration token) and `GHL_LOCATION_ID`                                                                          | Cloudflare secrets. Which tags each form adds: `src/config/forms.ts`. Full guide: [`ghl-forms.md`](ghl-forms.md).                                                                                                 |
| **Client tools gate**     | The staff page `/tools` is locked unless one gate is set: Cloudflare Access (`CF_ACCESS_TEAM_DOMAIN` + `CF_ACCESS_AUD`, plain variables) or a shared password (`TOOLS_PASSWORD`, a secret)          | The Worker's Variables and Secrets ([`ghl-forms.md`](ghl-forms.md), "Gating the Client tools page")                                                                                                               |
| **Analytics and widgets** | Optional, each off when blank: Google Tag Manager, MailerLite, Usercentrics (cookie banner), the GoHighLevel chat widget and External Tracking                                                      | Account ids (not secrets) in `SITE.integrations` in `src/config/site.ts`                                                                                                                                          |
| **Sanity** (Sanity only)  | The Sanity project and dataset, the hosted Studio, `SANITY_API_READ_TOKEN` (a secret), and the rebuild Worker in `workers/rebuild-debounce/` with its secrets `DEPLOY_HOOK_URL` and `WEBHOOK_TOKEN` | Project id and dataset: `src/config/sanity.shared.mjs` and `wrangler.jsonc`. Secrets: Cloudflare. Members and CORS origins: sanity.io/manage ([`new-project-checklist.md`](new-project-checklist.md), section 3). |

Things to check when the client takes over an account:

- **Moving to the client's own Cloudflare account** means setting up the
  Worker there: connect the repository, create a new KV namespace and put
  its id in `wrangler.jsonc`, enter each secret again, set `SITE_URL`, and
  move the domain. Follow sections 4 and 4a of
  [`new-project-checklist.md`](new-project-checklist.md); a site that keeps
  its content in files skips the steps marked **Sanity add-on only**. Cloudflare
  Access on `/tools` needs the domain in the same account as the Access
  app; otherwise use `TOOLS_PASSWORD`.
- **Live deploys.** Pushes go live by themselves only when the Workers
  Builds deploy command is `npx wrangler deploy`; with the default, each
  build has to be promoted in the Deployments tab (checklist section 4a,
  step 5). Tell the client which applies.
- **GoHighLevel External Tracking** loads its script from the address in
  `SITE.integrations.ghlTrackingScript`, which is your agency's
  white-label domain. If the client's sub-account leaves your agency,
  change that address or clear `ghlTrackingId`.
- **Revoke what you no longer need.** After the client has entered their
  own values, delete the GoHighLevel token you created (and, for Sanity,
  your Viewer token) so only the client's copies work.

---

## 4. For the person receiving the site

### Run it on your computer

1. Install **Node.js 22.18 or later** (the project's `package.json`
   requires it). Git is not needed to run the site locally; you need it
   to publish changes through GitHub.
2. In the project folder:

   ```bash
   npm install
   npm run dev
   ```

   Open <http://localhost:4321>. A site that keeps its content in files
   runs without any secrets; only sending a form needs the GoHighLevel
   values.

3. To test forms locally, copy `.env.example` to `.env` and fill in the
   values. Never commit `.env`.
4. Before publishing a change, run `npm run check` and `npm run build`.
   Both must finish without an error.

### How the live site updates

Cloudflare (Workers Builds) rebuilds the site from the `main` branch on
every push. A build takes a minute or two; if it fails, the live site
keeps the previous version. Check builds in the Cloudflare dashboard
(**Workers & Pages** → the Worker → **Deployments**). Setting this up in a
new Cloudflare account is sections 4 and 4a of
[`new-project-checklist.md`](new-project-checklist.md) (skip the steps
marked **Sanity add-on only** unless the site uses Sanity).

**Sanity projects:** publishing in the Studio also rebuilds the site,
through the rebuild Worker.

### After handoff

- **Editing content:** [`editing-content.md`](editing-content.md) covers
  adding posts, projects, photos and testimonials, reading errors and
  publishing.
- **Forms and GoHighLevel:** [`ghl-forms.md`](ghl-forms.md).
- **Adding Sanity later:** a files site can switch its content to Sanity
  with the add-on (`npm run addon:sanity`); its guide is
  `addons/sanity/README.md`. Projects set up with `npm run setup` no longer
  have the `addons/` folder: copy `addons/sanity/` from the starter
  repository into the project first — from the same starter version (commit) the project was created from.
  A newer add-on can mismatch an older site; to use one, update the
  project to that starter version first.
- **Everything else:** the project [`README`](../README.md) lists the
  commands and explains how the site is built.
