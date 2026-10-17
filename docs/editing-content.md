# Editing the site's content

This guide is for whoever looks after the site's words and photos: a
client, an editor or a developer new to the project. You need no CMS
account. Every blog post, case study, project, gallery photo, testimonial,
author and call to action is a small file in the `src/content/` folder.
You edit the file, check it, and push it. The site then rebuilds itself.

The full field reference (every field, every allowed value) is
[`.claude/skills/content-files/SKILL.md`](../.claude/skills/content-files/SKILL.md).
This page covers the everyday jobs.

## 1. First-time setup

1. Install **Node.js 22.18 or later** (the LTS download from
   [nodejs.org](https://nodejs.org) is fine).
2. Install [VS Code](https://code.visualstudio.com) (recommended: it
   autocompletes the content files, see section 7).
3. Get a copy of the project (`git clone …`), open the folder in a
   terminal, and run:

   ```bash
   npm install
   ```

   You only do this once (and again whenever `package.json` changes).

## 2. See your changes as you work

```bash
npm run dev
```

Open <http://localhost:4321> in your browser. Leave the command running:
when you save a content file, the page updates. If a file has a mistake
(a wrong field, a missing photo, a name that points nowhere), the terminal
prints an error naming the file and the field (section 5), and prints
`Content check passed` once you have fixed it. Stop the preview with
`Ctrl+C`.

## 3. How the content folder is laid out

| What          | File                                   | Its photos                         |
| ------------- | -------------------------------------- | ---------------------------------- |
| Blog posts    | `src/content/blog/<name>.mdx`          | `src/content/blog/images/`         |
| Authors       | `src/content/authors/<name>.json`      | `src/content/authors/images/`      |
| Case studies  | `src/content/case-studies/<name>.json` | `src/content/case-studies/images/` |
| Projects      | `src/content/projects/<name>.json`     | `src/content/projects/images/`     |
| Gallery       | `src/content/gallery.json` (one list)  | `src/content/gallery/images/`      |
| Testimonials  | `src/content/testimonials/<name>.json` | `src/content/testimonials/images/` |
| Blog CTAs     | `src/content/ctas/blog/<name>.json`    | `src/content/ctas/blog/images/`    |
| CTA sections  | `src/content/ctas/section/<name>.json` | `src/content/ctas/section/images/` |
| Default CTAs  | `src/content/settings.json`            | —                                  |
| Service pages | `src/content/services/<name>.json`     | `src/content/services/images/`     |

Service pages have their own guide:
[`.claude/skills/component-api/references/service-pages.md`](../.claude/skills/component-api/references/service-pages.md).

Rules that apply everywhere:

- **The file name is the web address.** `spring-checklist.mdx` becomes
  `/blog/spring-checklist`. Use lowercase letters, numbers and dashes
  only: `smith-kitchen.json`, never `Smith Kitchen.json`. Other files
  point to an entry by this name, without the extension
  (`"author": "priya-shah"`).
- **Photos** go in the `images/` folder next to the file and are written
  as `"./images/photo-name.webp"`. Use WebP or AVIF, about 2000 pixels
  wide; the site makes the smaller sizes itself. Photos are cropped from
  the centre, so keep the subject in the middle.
- **Every photo needs alt text**: a short description of what it shows,
  for people who cannot see it. It can never be empty.
- **Dates** are written `"2026-04-02"` (year-month-day, in quotes), and
  must be real dates (`"2026-02-30"` is stopped by the check).
- **Formatted text** inside a JSON file (case-study sections, project
  write-ups) uses Markdown: `**bold**`, `*italic*`,
  `[link text](/contact)`, `- list item`, `### Heading`. Start a new line
  with `\n` and a new paragraph with `\n\n`:
  `"body": "### The challenge\n\nFirst paragraph.\n\n- a point"`.
  Photos cannot go inside formatted text; use the photo fields instead.
- **Use curly quotes and real dashes** in sentences (’ “ ” —).

The easiest way to add anything is to **copy a file that already exists,
rename the copy and change its contents.**

## 4. Recipes

### Add a blog post

1. Put the main photo in `src/content/blog/images/`, e.g.
   `kitchen-plan.webp`.
2. Copy an existing post in `src/content/blog/` and rename the copy, e.g.
   `how-to-plan-a-kitchen.mdx`. That name becomes the address
   `/blog/how-to-plan-a-kitchen`.
3. Edit the block between the two `---` lines at the top:

   ```yaml
   ---
   title: "How to Plan a Kitchen Remodel"
   description: "One or two sentences for the card and for search engines (300 characters at most)."
   date: "2026-04-02"
   categories: ["Guides"]
   primaryCategory: "Guides"
   image: "./images/kitchen-plan.webp"
   imageAlt: "A kitchen floor plan sketched on graph paper"
   author: "priya-shah"
   featured: false
   ---
   ```

   - `categories`: one or more of News, Guides, Insights, Tutorials,
     Resources. Each one gets an archive page (`/blog/category/guides`).
   - `primaryCategory` (optional): which section of the `/blog` page the
     post sits in: News, Guides, Insights or Tutorials (Resources has no
     section). Without it, the post sits under its first category. It must
     also be listed in `categories` (the check stops the post otherwise, so
     the post is never missing from that category's archive page).
   - `author`: the name of a file in `src/content/authors/`.
   - `featured: true` puts the post in the slider at the top of `/blog`
     (up to six featured posts; with none featured, the slider shows the
     newest four).
   - Optional extras: `updated: "2026-04-09"` after a real edit,
     `relatedPosts: ["another-post"]` (up to three),
     `video: "https://www.youtube.com/watch?v=…"` to show a YouTube video
     instead of the photo (YouTube `watch` or `youtu.be` links only).

4. Write the post below the second `---` in Markdown. `## Headings`
   become the table of contents, so keep them short and different from
   each other. Use `###` for smaller steps.
5. **A photo inside the post**: put it in `src/content/blog/images/` and
   write, on its own line:

   ```md
   ![What the photo shows](./images/kitchen-sketch.webp)
   ```

   The text in the square brackets is the photo's alt text and can never
   be empty.

6. **A call-to-action box inside the post**: on its own line, with the
   name of a file in `src/content/ctas/blog/` in double quotes:

   ```mdx
   <BlogCta id="free-site-review" />
   ```

   The box at the end of the post is chosen separately: add
   `cta: "free-site-review"` to the top block, or leave it out to use the
   site default (see "Change the default CTAs").

7. **Tips, warnings and videos** inside the post. Put each tag on its
   own line: for a tip, the opening `<Callout …>` line, then the text, then
   the closing `</Callout>` line. A callout written on one line
   (`<Callout>Text</Callout>`) is not supported.

   ```mdx
   <Callout type="tip">
     A helpful tip. The type can be "tip", "warning" or "info".
   </Callout>

   <VideoEmbed
     url="https://www.youtube.com/watch?v=…"
     caption="What the video shows"
   />
   ```

   `VideoEmbed` takes YouTube links (`youtube.com/watch?v=…`, `youtu.be/…`,
   `youtube.com/shorts/…`) and Vimeo links (`vimeo.com/123456`). Any other
   link stops the check with an error naming the post.

8. **Questions and answers** under the post (also marked up for search
   engines): add to the top block:

   ```yaml
   faqs:
     - question: "How long does a kitchen take?"
       answer: "Most kitchens take **four to six weeks**."
     - question: "Where do we start?"
       answer: |
         Start with the rooms you use most:

         - the kitchen
         - the main bathroom
   ```

### Add a case study

1. Put the photos in `src/content/case-studies/images/`.
2. Copy a file in `src/content/case-studies/`, rename it (the name becomes
   `/case-studies/<name>`), and edit it. Required: `title`, `description`,
   `client`, `image`, `imageAlt`, `date`, `categories` and `industries`
   (their allowed values are in `src/config/case-studies.ts`).
3. The page body is the `content` list. Each item is one section, with a
   `type`: `richText` (formatted text), `richTextWithImage`,
   `fullWidthImage`, `imageGrid` (two or more photos) or `stats`
   (numbers with labels). Copy an existing section and change it; the
   field reference lists every option.
4. Not live yet? Set `"comingSoon": true` and `"liveUrl": "https://…"`.
   The card then links to that site and no page is built.
5. The three case studies on the homepage are chosen by name in
   `FEATURED_CASE_STUDIES_SLUGS` in
   `src/components/sections/CaseStudyFeatured.astro`. A case study's own
   `featured` field does not change the homepage; it only matters to a
   case-study grid set to show featured studies.

### Add a project with photos

1. Put the photos in `src/content/projects/images/`.
2. Copy a file in `src/content/projects/` and rename it (the page is
   `/projects/<name>`).
3. Set `title`, `category` (`residential`, `commercial`, `remodel` or
   `repair`), `heroImage` and `imageAlt`.
4. List the other photos, each with its own description and, if you like,
   a `label` of `Before`, `During` or `After`:

   ```json
   "photos": [
     { "src": "./images/nook-before.webp", "alt": "The bare corner before work began", "label": "Before" },
     { "src": "./images/nook-after.webp", "alt": "The finished window seat with cushions", "label": "After" }
   ]
   ```

5. Optional: `location`, `service`, `description` (formatted text),
   `quote` (`{ "text": "…", "name": "…" }`), `completed` (a date; newest
   completed projects are listed first), `featured` (no page shows
   featured projects yet), and `seoDescription` (one or two sentences for search
   engines; set it when the write-up is long).

### Add a gallery photo

1. Put the photo in `src/content/gallery/images/`.
2. Add an entry to the list in `src/content/gallery.json` (mind the comma
   between entries):

   ```json
   {
     "id": "oak-bookshelf",
     "image": "./gallery/images/oak-bookshelf.webp",
     "alt": "A floor-to-ceiling oak bookshelf beside a window",
     "caption": "Oak bookshelf",
     "category": "residential",
     "added": "2026-05-01"
   }
   ```

   `caption` is 60 characters at most. Optional: `location`, and
   `project` (a project's file name, which adds its title to the caption).

### Add a testimonial with a headshot

1. Crop the headshot **square** with the face in the middle (at least 512
   pixels on each side); it is shown as a small circle. Put it in
   `src/content/testimonials/images/`.
2. Copy a file in `src/content/testimonials/`, rename it (e.g.
   `jane-doe.json`) and edit it:

   ```json
   {
     "name": "Jane Doe",
     "role": "Homeowner",
     "quote": "They finished on time and left the house spotless.",
     "avatar": "./images/jane-doe.webp",
     "avatarAlt": "Jane Doe",
     "stars": 5,
     "featured": true,
     "order": 10
   }
   ```

   `featured: true` adds it to the testimonial showcase on the homepage.
   Lower `order` numbers come first. The photo is optional, but if you set
   `avatar` you must set `avatarAlt` (usually the person's name).

### Add an author

1. Put a square headshot in `src/content/authors/images/` (optional).
2. Create `src/content/authors/<name>.json`:

   ```json
   { "name": "Priya Shah", "avatar": "./images/priya-shah.webp" }
   ```

3. Posts name the author by file name: `author: "priya-shah"`.

### Add or edit a blog CTA (the box at the end of a post)

Copy a file in `src/content/ctas/blog/` and edit `heading`, `body` (280
characters at most), `image` + `imageAlt`, `linkUrl` (a site page like
`"/contact"` or a full web address) and `linkLabel`. `aspectRatio` is
`portrait` (default), `square` or `landscape`.

### Add or edit a CTA section (the band at the bottom of a page)

Copy a file in `src/content/ctas/section/` and edit `heading`, `text`
(280 characters at most), `primaryButtonLabel` + `primaryButtonHref`,
`backgroundImage` + `imageAlt`. Optional: a second button (set both
`secondaryButtonLabel` and `secondaryButtonHref`) and `overlayStrength`
(0–100, how dark the photo gets behind the text; default 80). Blog posts
and case studies can pick one with `ctaSection: "<name>"`; everything else
uses the default.

### Change the default CTAs

`src/content/settings.json` names the blog CTA and CTA section a page gets
when it does not pick its own. Keep the `"site"` key exactly as shown (the
check stops if it is missing or misspelled):

```json
{
  "site": {
    "defaultBlogCta": "free-site-review",
    "defaultCtaSection": "start-a-project"
  }
}
```

### Remove something

Delete its file and its photos. If another file still points to it, the
check in section 5 names that file and field; fix or remove the pointer.

Emptying a whole folder is fine too: a site with no testimonials or no
projects can delete every file in that folder. The pages for that type
simply build empty (listings show no cards and no detail pages are
built), and nothing needs clearing first. One catch while previewing: if a
folder was completely empty when `npm run dev` started, a file you add to
it later isn't picked up until you stop and restart `npm run dev` (Astro
stops watching a folder that was empty at startup). Builds are unaffected.

## 5. Check your work

Before you publish, run:

```bash
npm run check
npm run build
```

`npm run check` reads every content file (and the site's code) and stops
with an error if anything is wrong; it takes a few seconds. `npm run build`
then builds the whole site, the same way the live site is built. Both must
finish without an error.

A mistake looks like one of these in the terminal (or in the GitHub
Actions log, if the check runs there):

```text
Content check failed in "projects":
  - src/content/projects/smith-kitchen.json → heroImage: image file not found: "./images/smith-hero.webp"
```

```text
[InvalidContentEntryDataError] caseStudies → acme-rebrand data does not match collection schema.

  imageAlt: Alt text can't be empty
  categories.0: Invalid option: expected one of "Design"|"Development"|…
```

The first line names the file; each line after it is `field: problem`.

| The message says                                       | What to do                                                  |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| `image file not found: "./images/x.webp"`              | Check the spelling and that the photo is in that `images/`  |
| `no entry "x" (expected src/content/authors/x.json)`   | The file it points to is missing or misspelled              |
| `<BlogCta id="x"> names no entry`                      | Fix the name, or add `src/content/ctas/blog/x.json`         |
| `Alt text can't be empty`                              | Describe the photo                                          |
| `body: image "./images/x.webp" has no alt text`        | Describe the photo inside the `![…]` brackets               |
| `<VideoEmbed url="…"> is not a supported YouTube …`    | Use a YouTube or Vimeo link (see "Add a blog post")         |
| `is not a real date`                                   | Check the month and day                                     |
| `primaryCategory: Also list "X" in categories`         | Add it to `categories`, or remove `primaryCategory`         |
| `settings.json → site: missing`                        | Restore the `"site"` key in `settings.json`                 |
| `name: Required` (or any other field)                  | Add the missing field                                       |
| `date: Write the date as quoted text`                  | Put the date in quotes in the post's top block              |
| `Invalid option: expected one of …`                    | Use one of the listed values                                |
| `liveUrl: Add liveUrl — a coming-soon case study …`    | Add `liveUrl`, or set `comingSoon` to false                 |
| `avatarAlt: Add avatarAlt …`                           | Add the person's name as `avatarAlt`                        |
| `must be named in lowercase-kebab-case`                | Rename the file: lowercase letters, numbers and dashes only |
| `failed to parse: Expected ',' or '}' …` (a JSON file) | A missing comma or quote; VS Code underlines it in red      |

## 6. Publish

Commit your changes and push them to the `main` branch:

```bash
git add src/content
git commit -m "Add the kitchen planning post"
git push
```

Cloudflare (Workers Builds) watches the repository and rebuilds the site
from `main` on every push; a build takes a minute or two. If a content
file has a mistake, that build fails and the live site keeps the previous
version. Check the build in the Cloudflare dashboard (Workers & Pages →
the site's Worker → Deployments). GitHub also runs the same checks on
pull requests and on pushes to `main` (the CI workflow in
`.github/workflows/ci.yml`).

Whether a finished build goes live by itself depends on one dashboard
setting: the Workers Builds deploy command must be `npx wrangler deploy`
(see `docs/new-project-checklist.md`, section 4a). If the developer left
the default, which only uploads a version, someone has to promote it in
the Deployments tab. Ask your developer which applies to your site.

## 7. Autocomplete in VS Code

Open the project folder in VS Code and run `npm run dev` (or
`npm run check`) once. After that, in any content JSON file, VS Code
suggests the field names and allowed values as you type (`Ctrl+Space`
shows them) and underlines a missing, misspelled or wrong field in red. It
checks the shape of the file only: missing photos and wrong file names are
caught by the checks in section 5. Blog posts (`.mdx`) are checked by
those commands only.
