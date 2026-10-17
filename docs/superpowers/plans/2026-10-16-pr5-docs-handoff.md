# PR 5 — Docs and handoff: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the starter's documentation accurate end to end for the
files-first world, and give the owner a clear, repeatable way to hand a
finished site to a client.

**Architecture:** Docs only (plus comment fixes). PRs 1–4 already updated
the docs they touched; this PR closes the remaining gaps logged in the PR 4
ledger and adds the handoff guide the spec asks for ("README handoff
section").

**Tech Stack:** Markdown docs, Claude skills (`.claude/skills/**`).

**Spec:** [docs/superpowers/specs/2026-10-16-files-first-content-design.md](../specs/2026-10-16-files-first-content-design.md) — Goal ("transferring the GitHub repo or a zip"), Delivery item 5.

## Global Constraints

- Every claim must be checked against the code it describes (script names,
  flags, paths, behaviour). The user asked that all docs and comments be
  accurate and current.
- Audience split: `docs/editing-content.md` and `docs/handing-off.md` are for
  humans (owner, client, new developer) — plain and task-oriented. Skills
  under `.claude/skills/` are for the AI agent. `CLAUDE.md` holds only
  always-in-context rules.
- Files is the default; Sanity is described only as the optional add-on
  (`npm run addon:sanity`, docs in `addons/sanity/README.md` and the add-on's
  `sanity-and-preview` skill).
- Don't edit `docs/superpowers/**` (history).
- `npm run format` before committing; commits end with a blank line then
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Gate: `npm run format:check`, `npm run check`, `npm run check:config`.
  A docs-only change needs no parity run; if a rendered page's text changes,
  rebuild and compare against `.parity/files` and explain the diff.

## Review Focus

1. **A recipient who only has the zip.** No git history, possibly no git
   repo: the handoff guide must say what to run (`npm install`, `npm run
dev`, `npm run build`) and what accounts/secrets they need, without
   assuming access to the owner's dashboards.
2. **Secrets.** The guide must never tell anyone to commit `.env` or paste
   tokens into the repo; it lists which secrets exist and where they live
   (Cloudflare dashboard vars/secrets, GHL).
3. **Dead links.** Every relative link in edited docs resolves.
4. **Sanity forks.** Guidance that only applies with the add-on is clearly
   labelled, not deleted.
5. **Stale numbers.** Counts ("four checks", "13 cases") either match the
   code or are removed.

---

### Task 1: Handoff guide

**Files:**

- Create: `docs/handing-off.md`
- Modify: `README.md` (new "Handing off this project" section linking it),
  `docs/new-project-checklist.md` (link from the post-launch section),
  `CLAUDE.md` (one line in "Other docs")

**Content of `docs/handing-off.md`** (verify each item against the repo):

1. **What the client gets** — the repo (or zip), content in `src/content/`
   edited per `docs/editing-content.md`, no CMS account required (Files
   projects); Sanity projects additionally hand over the Sanity project.
2. **Before you hand off** — replace/delete leftover sample content
   (list the sample ids by collection, from `src/content/`); run the full
   gate (`npm run check`, `npm run check:content`, `npm run build`,
   `npm run check:content-build`); confirm `.env` is not committed
   (`git ls-files .env` empty); decide whether the `.claude/` folder and
   `docs/superpowers/` ship (both are safe; `.claude/` helps a recipient
   using Claude Code; `docs/superpowers/` is build history and can be
   deleted).
3. **Transfer option A — GitHub** — repository transfer to the client's
   account/org (Settings → Transfer), or add them as owner; reconnect
   Cloudflare Workers Builds to the new repo location.
4. **Transfer option B — zip** — `git archive --format=zip -o site.zip HEAD`
   (excludes ignored files like `node_modules`, `.env`, `dist`); the recipient
   runs `git init && git add -A && git commit -m "Initial import"` if they
   want history; note the add-on installer refuses a non-git folder without
   `--force`.
5. **Accounts and secrets to move** — read `wrangler.jsonc`,
   `.env.example`, `src/config/site.ts`, `docs/ghl-forms.md`,
   `docs/new-project-checklist.md` and list every external account the site
   depends on (Cloudflare account + Worker + custom domain, GoHighLevel
   location/API secrets, domain registrar/DNS, Turnstile if used, analytics
   if configured) and where each secret is configured (Cloudflare dashboard
   vars/secrets, never the repo).
6. **What the recipient runs** — Node version from `package.json` engines,
   `npm install`, `npm run dev`, `npm run build`, how deploys happen
   (link the checklist's deploy section).
7. **After handoff** — editing content (`docs/editing-content.md`), adding
   Sanity later (`addons/sanity/README.md` in the starter repo), where to get
   help (README).

- [ ] **Step 1:** Read the source files listed in item 5 and the README
      deploy section; write `docs/handing-off.md`.
- [ ] **Step 2:** Add the README section (3–6 lines + link), the checklist
      link, and the CLAUDE.md "Other docs" entry.
- [ ] **Step 3:** Verify every relative link resolves:
      `grep -o '](\.\{0,2\}/[^)]*)' docs/handing-off.md README.md` and check
      each path exists.
- [ ] **Step 4:** `npm run format && npm run format:check && npm run check`
- [ ] **Step 5:** Commit: "Add a handoff guide for finished sites".

### Task 2: Checklist and remaining stale docs

**Files:** `docs/new-project-checklist.md`, `.github/dependabot.yml` (only
if a comment is stale), any core doc the audit finds stale.

- [ ] **Step 1:** `docs/new-project-checklist.md`:
  - line ~29: replace the pointer to the nonexistent CLAUDE.md
    "Deployment, Sanity Studio & Preview" section with the add-on's
    `sanity-and-preview` skill and `addons/sanity/README.md`;
  - §3 Sanity: retitle "Sanity (only if you installed the add-on)" and make
    its first line point at `npm run addon:sanity`;
  - §4/§7: label Sanity-only steps (rebuild webhook, debounce Worker,
    `/preview` header check) as add-on only;
  - §8 dependency-pins table: re-measure each pin's reason against the
    current `package.json` (Sanity pins now live in
    `addons/sanity/manifest.json`); keep only pins core still has, and add a
    note that the add-on's manifest carries its own.
- [ ] **Step 2:** Whole-repo doc audit. For each of `README.md`,
      `CLAUDE.md`, `AGENTS.md`, `docs/*.md` (not `docs/superpowers/`),
      `scripts/README.md`, every `.claude/skills/**` file in core, and
      `addons/sanity/README.md`: extract concrete claims (npm scripts, file
      paths, flags, counts, behaviour) and check each against the code.
      Fix every wrong one. Record each fix in the report (file:line → what was
      wrong → what it says now).
- [ ] **Step 3:** Grep for counts that go stale:
      `grep -rnE "\b(three|four|five|six|seven|[0-9]+) (checks|cases|tasks|files|types|steps)\b" README.md CLAUDE.md AGENTS.md docs/*.md scripts/README.md .claude/skills addons/sanity/README.md`
      — make each match the code or remove the number.
- [ ] **Step 4:** `npm run format && npm run format:check && npm run check && npm run check:config`
- [ ] **Step 5:** Commit: "Bring the checklist and docs in line with the files-first starter".
