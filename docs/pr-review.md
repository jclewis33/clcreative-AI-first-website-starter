# Reviewing pull requests

When more than one person changes a site through Claude Code, every change
goes through a pull request and someone approves it before it goes live.
This repo does most of that review automatically, so the approver's job is
a short look, not a line-by-line read.

## What happens on every pull request

| Check                                        | What it tells you                                                                                                                   | Where                                                           |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **CI** (`ci.yml`)                            | Formatting, types, content, the build, JSON-LD                                                                                      | Red/green on the PR                                             |
| **Links and weight** (`site-review.yml`)     | Broken internal links or `#anchors`, bad redirects, pages over the weight budget                                                    | Red/green on the PR, details in the job summary                 |
| **Visual changes** (`site-review.yml`)       | Which pages look different from the base branch, at desktop and mobile widths                                                       | A comment on the PR, images in the run's `visual-diff` artifact |
| **Claude review** (`claude-review.yml`)      | Breaks of CLAUDE.md's rules, missed reuse, which pages a shared change reaches, accessibility and SEO misses, plus a **risk level** | Inline comments and one summary comment                         |
| **Preview link** (Cloudflare Workers Builds) | The site with the change, live                                                                                                      | Posted on the PR                                                |
| **Code owners** (`.github/CODEOWNERS`)       | Changes to shared components, styles, config or the rules need the owner's approval                                                 | "Review required" on the PR                                     |

## Reviewing one

1. Wait for the checks. Anything red gets fixed first; don't review around
   it.
2. Read Claude's summary comment. Its first line is the risk level:
   - **Low** — glance at the pages it lists on the preview link and
     approve.
   - **Medium** — open those pages on the preview, desktop and mobile.
   - **High** — the PR changes something shared. Read the inline comments,
     check every page it lists, and read the diff of the shared files.
3. Read the visual changes comment. Every "Changed" row should be a page
   the PR meant to change. A change on a page nobody touched is the thing
   to catch.
4. Approve, or comment and request changes. Merging deploys.

Most small PRs take two to five minutes this way. If something slips
through, roll back from the Worker's **Deployments** tab, or revert the
merge commit.

## Keeping it fast

- **One change per PR.** Ten changes in one PR take longer to review than
  ten small PRs.
- **Few people change code at first.** Content editors use the content
  files (or Sanity, with the add-on); only people working through Claude
  Code open code PRs.
- **Agree a turnaround**, e.g. "reviewed within one working day, same day if
  marked urgent", so nobody waits on the reviewer without knowing when.
- **Keep CLAUDE.md current.** When a review catches the same mistake twice,
  add a rule so Claude stops making it.

## Setup (once per repo)

1. **Claude review credentials.** Install the Claude GitHub App on the repo
   (https://github.com/apps/claude, or run `/install-github-app` in Claude
   Code). Then add ONE repository secret (Settings → Secrets and variables
   → Actions):
   - `ANTHROPIC_API_KEY` — an API key from console.anthropic.com (billed per
     use), or
   - `CLAUDE_CODE_OAUTH_TOKEN` — from `claude setup-token` on a Claude
     subscription.

   Without either, the Claude review job skips itself and the rest still
   runs.

2. **Code owner.** In `.github/CODEOWNERS`, replace the owner with the
   developer who maintains this site.
3. **Branch protection** (Settings → Rules → Rulesets → New branch ruleset,
   target `main`):
   - Require a pull request before merging, with 1 approval
   - Require review from Code Owners
   - Require status checks to pass: `checks`, `audit`, `links-and-weight`
     (add `addon-sanity` on the starter itself)
   - Block force pushes

   Private repos need GitHub Pro, Team or Enterprise for rulesets (a public
   repo has them free). Without them everything above still runs and
   reports; it just can't block a merge.

4. **Budgets and key pages.** Adjust `scripts/budget.json` and
   `scripts/visual-pages.json` for the fork: list one page per template as a
   key page.

## Running the checks locally

```bash
npm run build
npm run check:links    # broken links, anchors and redirects
npm run check:budget   # page weight
```

The visual comparison needs two builds and Chromium:

```bash
npx playwright install chromium        # once
cp -r dist/client /tmp/before          # build the "before" first
# …make the change, then:
npm run build
npm run visual:diff -- --base /tmp/before --head dist/client
```

It writes `visual-report/` with a `report.md` and the before, after and
diff images of every changed page.

A link problem you have decided to live with for now can go in
`scripts/check-links.allow.json` with a reason; it is then reported as a
warning. Fix the link instead when you can.
