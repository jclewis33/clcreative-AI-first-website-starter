#!/usr/bin/env node
/**
 * check-content-validation — proves bad content fails `astro sync` (and so
 * `npm run build`, `astro check` and `astro dev`) with a message that names
 * the file and the field. Spec: "Every content file is schema-validated at
 * build time. Bad content fails the build with a message naming the file and
 * the field."
 *
 * It never edits your entries. A run writes a small set of temporary
 * `zz-check-*` entries (and a 1×1 PNG beside them) that are valid together —
 * the control set, which must sync cleanly — then, per case, rewrites ONE of
 * them with ONE broken field, runs `astro sync`, and expects a non-zero exit
 * whose output contains every `expect` string. The gallery case appends an
 * item to src/content/gallery.json, and the settings case rewrites
 * src/content/settings.json (single-file collections); both restore the
 * original bytes. Everything is removed or restored after each case, on
 * exit, on Ctrl-C and on SIGTERM/SIGHUP. A hard kill (SIGKILL, power loss)
 * cannot run cleanup, so every run starts by sweeping src/content for the
 * leftovers: `zz-check*` files are deleted, and any file with a
 * `.zz-check-backup` sidecar is restored from it.
 *
 * Two more cases empty a whole folder (Astro's glob() loader keeps what it
 * stored last time when its folder has no files; checked() prunes those
 * entries): the testimonials are hidden — renamed to `.zz-check-backup`
 * sidecars, restored like the rewrites above — and the sync must pass with
 * none of them left in Astro's content store; then the projects are hidden
 * and a build (into node_modules/.cache/zz-check-build, never dist/) must
 * contain no page for any of them.
 *
 * While it runs, the transient files exist on disk, so a dev server running
 * at the same time will briefly see them (and may log errors). Stop the dev
 * server first, or ignore the noise.
 *
 * Usage: npm run check:content
 * Exit 1 when a broken entry syncs, its error misses the file or field, or
 * an emptied folder leaves its old entries behind.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  BLOG_CATEGORIES,
  BLOG_SECTION_CATEGORIES,
} from "../src/config/blog.ts";
import {
  CASE_STUDY_CATEGORIES,
  CASE_STUDY_INDUSTRIES,
} from "../src/config/case-studies.ts";
import { PROJECT_CATEGORY_VALUES } from "../src/config/projects.ts";

const ROOT = process.cwd();
const ASTRO = path.join(ROOT, "node_modules", "astro", "bin", "astro.mjs");
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

/* ── Temporary files: tracked, and always cleaned up ───────────────────── */

/** Files and folders this run created (removed afterwards). */
const created = new Set();
/** Files this run overwrote → their original bytes (restored afterwards). */
const originals = new Map();
const BACKUP = ".zz-check-backup";
const CONTENT = path.join(ROOT, "src", "content");
/** The astro sync currently running, so a signal can stop it. */
let child = null;

/** Folders that held a leftover file; removed too once empty. */
const sweptEmpty = new Set();

/** Remove leftovers of a run that was killed before it could clean up. */
function sweep(dir = CONTENT) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      sweep(abs);
      if (
        /^zz[- ]check/i.test(entry.name) ||
        (sweptEmpty.has(abs) && !fs.readdirSync(abs).length)
      )
        fs.rmSync(abs, { recursive: true, force: true });
    } else if (entry.name.endsWith(BACKUP)) {
      fs.writeFileSync(abs.slice(0, -BACKUP.length), fs.readFileSync(abs));
      fs.rmSync(abs);
    } else if (/^zz[- ]check/i.test(entry.name)) {
      fs.rmSync(abs);
      sweptEmpty.add(dir);
    }
  }
}

function write(rel, content) {
  const abs = path.join(ROOT, rel);
  const missingDirs = [];
  for (
    let dir = path.dirname(abs);
    !fs.existsSync(dir);
    dir = path.dirname(dir)
  )
    missingDirs.unshift(dir);
  for (const dir of missingDirs) {
    fs.mkdirSync(dir);
    created.add(dir);
  }
  if (!fs.existsSync(abs)) created.add(abs);
  else if (!created.has(abs) && !originals.has(abs)) {
    const bytes = fs.readFileSync(abs);
    originals.set(abs, bytes);
    // Sidecar copy, so a hard kill can still be undone by the next run.
    fs.writeFileSync(abs + BACKUP, bytes);
    created.add(abs + BACKUP);
  }
  fs.writeFileSync(abs, content);
}

/**
 * Hide an existing file for one case: renamed to its backup sidecar, so
 * cleanup (or the next run's sweep) puts it back.
 */
function hide(rel) {
  const abs = path.join(ROOT, rel);
  if (created.has(abs)) {
    fs.rmSync(abs, { force: true });
    return;
  }
  if (originals.has(abs)) return;
  originals.set(abs, fs.readFileSync(abs));
  created.add(abs + BACKUP);
  fs.renameSync(abs, abs + BACKUP);
}

/** The repo-relative `*.<ext>` files directly in a src/content folder. */
const entriesIn = (dir, ext) =>
  fs
    .readdirSync(path.join(CONTENT, dir))
    .filter((f) => f.endsWith(`.${ext}`) && !f.endsWith(BACKUP))
    .map((f) => `src/content/${dir}/${f}`);

function cleanup() {
  for (const [abs, bytes] of originals) fs.writeFileSync(abs, bytes);
  originals.clear();
  // Deepest paths first, so files go before the folders that hold them.
  for (const abs of [...created].sort((a, b) => b.length - a.length))
    fs.rmSync(abs, { recursive: true, force: true });
  created.clear();
}

process.on("exit", cleanup);
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"])
  process.on(signal, () => {
    child?.kill();
    cleanup();
    process.exit(130);
  });

/* ── The control set: valid together ───────────────────────────────────── */

const json = (data) => `${JSON.stringify(data, null, 2)}\n`;
const IMG = "./images/zz-check.png";
const POST_FILE = "src/content/blog/zz-check-post.mdx";
const PROJECT = {
  title: "Check project",
  category: PROJECT_CATEGORY_VALUES[0],
  heroImage: IMG,
  imageAlt: "A check image",
};
const STUDY = {
  title: "Check study",
  description: "Check.",
  client: "Check",
  image: IMG,
  imageAlt: "A check image",
  date: "2026-01-01",
  categories: [CASE_STUDY_CATEGORIES[0]],
  industries: [CASE_STUDY_INDUSTRIES[0]],
};
const TESTIMONIAL = {
  name: "Check Person",
  quote: "Check.",
  avatar: IMG,
  avatarAlt: "Check Person",
};

/** An MDX post. A `{ raw }` value is written into the YAML unquoted. */
function post(overrides = {}, body = "## Check\n\nBody text.\n") {
  const fields = {
    title: "Check post",
    description: "Check.",
    date: "2026-01-01",
    categories: [BLOG_CATEGORIES[0]],
    image: IMG,
    imageAlt: "A check image",
    author: "zz-check-author",
    relatedPosts: [],
    cta: "zz-check-cta",
    ctaSection: "zz-check-section",
    ...overrides,
  };
  const yaml = Object.entries(fields)
    .map(
      ([key, value]) =>
        `${key}: ${value && typeof value === "object" && "raw" in value ? value.raw : JSON.stringify(value)}`,
    )
    .join("\n");
  return `---\n${yaml}\n---\n\n${body}`;
}

function control() {
  for (const dir of [
    "authors",
    "ctas/blog",
    "ctas/section",
    "projects",
    "case-studies",
    "testimonials",
    "blog",
  ])
    write(`src/content/${dir}/images/zz-check.png`, PNG);
  write(
    "src/content/authors/zz-check-author.json",
    json({ name: "Check Author" }),
  );
  write(
    "src/content/ctas/blog/zz-check-cta.json",
    json({
      heading: "Check",
      body: "Check body.",
      image: IMG,
      imageAlt: "A check image",
      linkUrl: "/contact",
      linkLabel: "Go",
    }),
  );
  write(
    "src/content/ctas/section/zz-check-section.json",
    json({
      heading: "Check",
      text: "Check text.",
      primaryButtonLabel: "Go",
      primaryButtonHref: "/contact",
      backgroundImage: IMG,
      imageAlt: "A check image",
    }),
  );
  write("src/content/projects/zz-check-project.json", json(PROJECT));
  write("src/content/case-studies/zz-check-study.json", json(STUDY));
  write(
    "src/content/testimonials/zz-check-testimonial.json",
    json(TESTIMONIAL),
  );
  write(POST_FILE, post());
}

/* ── The cases: each breaks ONE field ──────────────────────────────────── */

const { avatarAlt: _droppedAlt, ...TESTIMONIAL_WITHOUT_ALT } = TESTIMONIAL;

const CASES = [
  {
    name: "missing data image",
    apply: () =>
      write(
        "src/content/projects/zz-check-project.json",
        json({ ...PROJECT, heroImage: "./images/zz-missing.png" }),
      ),
    expect: [
      "src/content/projects/zz-check-project.json",
      "heroImage",
      "zz-missing.png",
    ],
  },
  {
    name: "missing body image",
    apply: () =>
      write(
        POST_FILE,
        post({}, "## Check\n\n![A missing photo](./images/zz-missing.png)\n"),
      ),
    expect: [POST_FILE, "body", "zz-missing.png"],
  },
  {
    name: "missing body image (no ./, with a title)",
    apply: () =>
      write(
        POST_FILE,
        post(
          {},
          '## Check\n\n![A missing photo](images/zz-missing-bare.png "A title")\n',
        ),
      ),
    expect: [POST_FILE, "body", "zz-missing-bare.png"],
  },
  {
    name: "missing data image (no ./)",
    apply: () =>
      write(
        "src/content/projects/zz-check-project.json",
        json({ ...PROJECT, heroImage: "images/zz-missing-bare.png" }),
      ),
    expect: [
      "src/content/projects/zz-check-project.json",
      "heroImage",
      "zz-missing-bare.png",
    ],
  },
  {
    name: "body image without alt",
    apply: () =>
      write(POST_FILE, post({}, "## Check\n\n![](./images/zz-check.png)\n")),
    expect: [
      POST_FILE,
      "body",
      'image "./images/zz-check.png" has no alt text',
    ],
  },
  {
    name: "empty alt",
    apply: () =>
      write(
        "src/content/case-studies/zz-check-study.json",
        json({ ...STUDY, imageAlt: "" }),
      ),
    expect: ["zz-check-study.json", "imageAlt", "Alt text can't be empty"],
  },
  {
    name: "bad category enum",
    apply: () => write(POST_FILE, post({ categories: ["zz-not-a-category"] })),
    expect: ["zz-check-post.mdx", "categories.0", "expected one of"],
  },
  {
    name: "unquoted date",
    apply: () => write(POST_FILE, post({ date: { raw: "2026-01-01" } })),
    expect: ["zz-check-post.mdx", "date", "quoted"],
  },
  {
    name: "impossible date",
    apply: () => write(POST_FILE, post({ date: "2026-02-30" })),
    expect: ["zz-check-post.mdx", "date", "not a real date"],
  },
  {
    name: "primaryCategory not in categories",
    apply: () =>
      write(
        POST_FILE,
        post({
          categories: [
            BLOG_CATEGORIES.find((c) => c !== BLOG_SECTION_CATEGORIES[0]),
          ],
          primaryCategory: BLOG_SECTION_CATEGORIES[0],
        }),
      ),
    expect: ["zz-check-post.mdx", "primaryCategory", "Also list"],
  },
  {
    name: "dangling author",
    apply: () => write(POST_FILE, post({ author: "zz-nobody" })),
    expect: [POST_FILE, "author", "zz-nobody"],
  },
  {
    name: "dangling related post",
    apply: () => write(POST_FILE, post({ relatedPosts: ["zz-no-post"] })),
    expect: [POST_FILE, "relatedPosts", "zz-no-post"],
  },
  {
    name: "dangling CTA",
    apply: () => write(POST_FILE, post({ cta: "zz-no-cta" })),
    expect: [POST_FILE, "cta", "zz-no-cta"],
  },
  {
    name: "dangling CTA section",
    apply: () => write(POST_FILE, post({ ctaSection: "zz-no-section" })),
    expect: [POST_FILE, "ctaSection", "zz-no-section"],
  },
  {
    name: "dangling gallery project",
    apply: () => {
      const file = "src/content/gallery.json";
      const abs = path.join(ROOT, file);
      const items = fs.existsSync(abs)
        ? JSON.parse(fs.readFileSync(abs, "utf8"))
        : [];
      write("src/content/gallery/images/zz-check.png", PNG);
      write(
        file,
        json([
          ...items,
          {
            id: "zz-check",
            image: "./gallery/images/zz-check.png",
            alt: "A check image",
            caption: "Check",
            category: PROJECT_CATEGORY_VALUES[0],
            project: "zz-gone",
            added: "2026-01-01",
          },
        ]),
      );
    },
    expect: ["src/content/gallery.json", "project", "zz-gone"],
  },
  {
    name: "comingSoon without liveUrl",
    apply: () =>
      write(
        "src/content/case-studies/zz-check-study.json",
        json({ ...STUDY, comingSoon: true }),
      ),
    expect: ["zz-check-study.json", "liveUrl"],
  },
  {
    name: "avatar without avatarAlt",
    apply: () =>
      write(
        "src/content/testimonials/zz-check-testimonial.json",
        json(TESTIMONIAL_WITHOUT_ALT),
      ),
    expect: ["zz-check-testimonial.json", "avatarAlt"],
  },
  {
    name: "filename not kebab-case",
    apply: () =>
      write(
        "src/content/testimonials/zz Check Bad.json",
        json({ name: "Bad", quote: "Bad." }),
      ),
    expect: ["zz Check Bad.json", "lowercase-kebab-case"],
  },
  {
    name: "dangling inline CTA",
    apply: () =>
      write(POST_FILE, post({}, '## Check\n\n<BlogCta id="zz-no-cta" />\n')),
    expect: [POST_FILE, "body", "zz-no-cta"],
  },
  {
    name: "unsupported VideoEmbed url",
    apply: () =>
      write(
        POST_FILE,
        post(
          {},
          '## Check\n\n<VideoEmbed url="https://example.com/zz-video" />\n',
        ),
      ),
    expect: [
      POST_FILE,
      "body",
      '<VideoEmbed url="https://example.com/zz-video"> is not a supported YouTube or Vimeo link',
    ],
  },
  {
    name: "settings.json without its site key",
    apply: () => {
      const file = "src/content/settings.json";
      const abs = path.join(ROOT, file);
      const settings = fs.existsSync(abs)
        ? JSON.parse(fs.readFileSync(abs, "utf8"))
        : {};
      write(file, json({ zzCheckSite: settings.site ?? {} }));
    },
    expect: ["src/content/settings.json → site"],
  },
];

/* ── Run ───────────────────────────────────────────────────────────────── */

/**
 * `astro sync` (or `args`, e.g. a build). Async, not spawnSync, so
 * SIGINT/SIGTERM handlers run promptly and clean up.
 */
function sync(args = ["sync"]) {
  return new Promise((resolve) => {
    child = spawn(process.execPath, [ASTRO, ...args], {
      cwd: ROOT,
      env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
    });
    let output = "";
    const run = child;
    run.stdout.on("data", (chunk) => (output += chunk));
    run.stderr.on("data", (chunk) => (output += chunk));
    const timer = setTimeout(() => run.kill(), 600_000);
    run.on("close", (code) => {
      clearTimeout(timer);
      child = null;
      resolve({ ok: code === 0, output });
    });
  });
}

const tail = (text) => text.trim().split("\n").slice(-15).join("\n");

sweep();
control();
const baseline = await sync();
if (!baseline.ok) {
  console.log(
    `FAIL  the current content does not sync, even before any case breaks it. The error below may be in the content itself (fix it, then run \`npm run check\` to confirm), or this script's control entries may be out of date with the schemas:\n${tail(baseline.output)}`,
  );
  process.exit(1);
}
console.log("ok    control entries sync");

let failures = 0;
for (const testCase of CASES) {
  cleanup();
  control();
  testCase.apply();
  const { ok, output } = await sync();
  const missing = testCase.expect.filter((text) => !output.includes(text));
  if (ok) {
    failures++;
    console.log(`FAIL  ${testCase.name}: astro sync passed`);
  } else if (missing.length) {
    failures++;
    console.log(
      `FAIL  ${testCase.name}: the error does not mention ${missing.map((m) => `"${m}"`).join(", ")}\n${tail(output)}`,
    );
  } else console.log(`ok    ${testCase.name}`);
}

/* ── Emptied folders: no deleted entry may outlive its file ─────────── */

/** Where the build case writes (gitignored, never the real dist/). */
const BUILD_DIR = path.join(ROOT, "node_modules", ".cache", "zz-check-build");
/** Astro's content store, which the build reads. */
const DATA_STORE = path.join(ROOT, "node_modules", ".astro", "data-store.json");

const EMPTIED = [
  {
    name: "emptied folder syncs clean (testimonials)",
    /** @returns {Promise<string | null>} the problem, if any */
    run: async () => {
      const files = entriesIn("testimonials", "json");
      for (const rel of files) hide(rel);
      // The stale-entry symptom: the control testimonial's photo is gone too.
      hide("src/content/testimonials/images/zz-check.png");
      const { ok, output } = await sync();
      if (!ok) return `astro sync failed\n${tail(output)}`;
      const store = fs.existsSync(DATA_STORE)
        ? fs.readFileSync(DATA_STORE, "utf8")
        : "";
      const left = files.filter((rel) => store.includes(rel));
      return left.length
        ? `the content store still holds ${left.join(", ")}`
        : null;
    },
  },
  {
    name: "emptied folder builds no deleted pages (projects)",
    run: async () => {
      const files = entriesIn("projects", "json");
      for (const rel of files) hide(rel);
      // Gallery photos may name a project; drop those links with them.
      const gallery = "src/content/gallery.json";
      if (fs.existsSync(path.join(ROOT, gallery))) {
        const items = JSON.parse(
          fs.readFileSync(path.join(ROOT, gallery), "utf8"),
        );
        write(
          gallery,
          json(items.map(({ project: _project, ...item }) => item)),
        );
      }
      fs.rmSync(BUILD_DIR, { recursive: true, force: true });
      created.add(BUILD_DIR);
      const { ok, output } = await sync(["build", "--outDir", BUILD_DIR]);
      if (!ok) return `astro build failed\n${tail(output)}`;
      const built = files
        .map((rel) => path.basename(rel, ".json"))
        .filter((id) =>
          fs.existsSync(path.join(BUILD_DIR, "client", "projects", id)),
        );
      return built.length
        ? `the build still has pages for ${built.map((id) => `/projects/${id}/`).join(", ")}`
        : null;
    },
  },
];

for (const testCase of EMPTIED) {
  cleanup();
  control();
  // Load every entry first, so a stale one would have something to outlive.
  const before = await sync();
  const problem = before.ok
    ? await testCase.run()
    : `the control entries did not sync\n${tail(before.output)}`;
  if (problem) {
    failures++;
    console.log(`FAIL  ${testCase.name}: ${problem}`);
  } else console.log(`ok    ${testCase.name}`);
}

cleanup();
if (!(await sync()).ok) {
  failures++;
  console.log("FAIL  the content does not sync after cleanup");
}

console.log(
  failures
    ? `\n${failures} case(s) failed.`
    : `\nAll ${CASES.length} broken-content cases fail sync, naming the file and the field; ${EMPTIED.length} emptied-folder cases leave no deleted entry behind.`,
);
process.exit(failures ? 1 : 0);
