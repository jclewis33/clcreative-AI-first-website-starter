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
 * item to src/content/gallery.json (a single-file collection) and restores
 * the original bytes. Everything is removed or restored after each case, on
 * exit and on Ctrl-C.
 *
 * Usage: npm run check:content
 * Exit 1 when a broken entry syncs, or its error misses the file or field.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { BLOG_CATEGORIES } from "../src/config/blog.ts";
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
  else if (!created.has(abs) && !originals.has(abs))
    originals.set(abs, fs.readFileSync(abs));
  fs.writeFileSync(abs, content);
}

function cleanup() {
  for (const [abs, bytes] of originals) fs.writeFileSync(abs, bytes);
  originals.clear();
  // Deepest paths first, so files go before the folders that hold them.
  for (const abs of [...created].sort((a, b) => b.length - a.length))
    fs.rmSync(abs, { recursive: true, force: true });
  created.clear();
}

process.on("exit", cleanup);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
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
    expect: ["zz-check-post.mdx", "categories"],
  },
  {
    name: "unquoted date",
    apply: () => write(POST_FILE, post({ date: { raw: "2026-01-01" } })),
    expect: ["zz-check-post.mdx", "date", "quoted"],
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
];

/* ── Run ───────────────────────────────────────────────────────────────── */

/** Async (not spawnSync) so SIGINT/SIGTERM handlers run promptly and clean up. */
function sync() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [ASTRO, "sync"], {
      cwd: ROOT,
      env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
    });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    const timer = setTimeout(() => child.kill(), 180_000);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, output });
    });
  });
}

const tail = (text) => text.trim().split("\n").slice(-15).join("\n");

control();
const baseline = await sync();
if (!baseline.ok) {
  console.log(
    `FAIL  the control entries do not sync, so this script is out of date with the schemas:\n${tail(baseline.output)}`,
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

cleanup();
if (!(await sync()).ok) {
  failures++;
  console.log("FAIL  the content does not sync after cleanup");
}

console.log(
  failures
    ? `\n${failures} case(s) failed.`
    : `\nAll ${CASES.length} broken-content cases fail sync, naming the file and the field.`,
);
process.exit(failures ? 1 : 0);
