#!/usr/bin/env node
// @ts-check
/**
 * Prospect demo generator — `npm run demo -- --config demo.json`
 * ════════════════════════════════════════════════════════════════════════════
 * Turns one `demo.json` (a prospect's facts — name, contact details, brand,
 * rating — and their repeated content: services, regions, reviews, FAQs,
 * projects; see presets/<preset>/preset.mjs for the shape) into a branded
 * demo site, on a `demo/<slug>` branch of the PRIVATE demos repo. The /demo
 * skill (.claude/skills/demo) researches the prospect and writes demo.json;
 * this script does every file write, the same way every time. Page copy is
 * never in demo.json: it is written in the pages.
 *
 * What it writes (every step but 0 regenerates its files whole, so
 * re-running after an edit to demo.json is the normal way to change them):
 *   0. Pages — the preset's pages (and audiencePage's) copied into
 *      src/pages, only where no page is there yet: once a page exists it
 *      is the demo's, and a re-run never touches it. The one exception is
 *      the first run on a fresh starter (SITE.demo and SITE.quote both
 *      null), where the preset's home and contact pages replace the
 *      starter's own. First, before anything else is written.
 *   1. Images — each source (a path relative to demo.json, or an https URL)
 *      converted to webp beside the content file that uses it. Logo →
 *      public/images/logo.<ext>, plus favicon.png, webclip.png and
 *      og-image.png (from seo.image). The service-area map (src/data/).
 *   2. Identity — scripts/setup.mjs --config (name, phone, hours, brand
 *      colour and its contrast text, service areas, logo, social, the
 *      estimate CTA, …), then SITE.rating and SITE.serviceRadius.
 *   3. Collections — src/content/services, service-areas, reviews, faqs
 *      and projects replaced by the prospect's; settings.json `process`.
 *   4. The nav — PAGES descriptions in site-structure.ts and the preset's
 *      extra pages in src/data/preset-pages.ts.
 *   5. The demo switch — `demo` in SITE (src/config/site.ts): whole-site
 *      noindex, the "Built for …" banner, nav pruning, the lead fallback.
 *   6. Prettier on what it wrote, then `astro sync` (the content schema
 *      names any bad service field) and `astro check`.
 * Git is left to the caller: review the diff, commit, push.
 *
 * Defaults shared by every demo live in `demo.defaults.json` at the repo
 * root of the demos repo (never in the public starter):
 *   { "workersSubdomain": "clcreative", "bannerHref": "…", "bannerText": "…",
 *     "ghlTrackingId": "tk_…", "ghlChatWidgetId": "…" }
 * `{slug}`, `{name}` and `{worker}` are filled in where they appear.
 *
 * Usage:
 *   npm run demo -- --config demo.json              # write it
 *   npm run demo -- --config demo.json --dry-run    # validate, write nothing
 *   flags: --defaults <file>   another defaults file
 *          --allow-public      run in the public starter (check:demo only)
 *          --no-check          skip `astro check` (check:demo builds instead)
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { parseJsonc } from "./lib/jsonc.mjs";
import { buildMap } from "./lib/service-area-geo.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const at = (/** @type {string[]} */ ...rel) => path.join(ROOT, ...rel);
const args = process.argv.slice(2);
const flag = (/** @type {string} */ name) => args.includes(name);
const value = (/** @type {string} */ name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const DRY_RUN = flag("--dry-run");

/** The public starter repo — prospect data must never be committed there. */
const PUBLIC_STARTER = /clcreative-AI-first-website-starter/i;
const DEFAULT_BANNER_TEXT = "Built for {name} by CL Creative";
const DEFAULT_BANNER_HREF =
  "https://www.clcreative.co/see-how-it-works-demo?demo={slug}";

class DemoError extends Error {}
const fail = (/** @type {string} */ message) => {
  throw new DemoError(message);
};

/** @param {string[]} cmd */
function run(cmd, { quiet = false } = {}) {
  const r = spawnSync(cmd[0], cmd.slice(1), {
    cwd: ROOT,
    encoding: "utf8",
    stdio: quiet ? "pipe" : "inherit",
  });
  if (r.status !== 0)
    fail(
      `\`${cmd.join(" ")}\` failed${quiet ? `:\n${r.stdout}${r.stderr}` : ""}`,
    );
  return r.stdout ?? "";
}
const git = (/** @type {string[]} */ ...a) => {
  const r = spawnSync("git", a, { cwd: ROOT, encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : "";
};
const fill = (
  /** @type {string} */ s,
  /** @type {Record<string, string>} */ v,
) => s.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);

// ── 0. Read and validate ─────────────────────────────────────────────────────
async function load() {
  const configPath = value("--config");
  if (!configPath) fail("Pass --config <demo.json>.");
  const file = path.resolve(/** @type {string} */ (configPath));
  /** @type {any} */
  let raw;
  try {
    raw = JSON.parse(await fs.readFile(file, "utf8"));
  } catch (err) {
    fail(
      `${configPath} could not be read as JSON: ${/** @type {Error} */ (err).message}`,
    );
  }
  // An old demo.json carried the page copy; it now lives in the pages.
  for (const key of ["home", "audience"])
    if (raw && typeof raw === "object" && key in raw)
      fail(
        `demo.json has "${key}": page copy now lives in the pages (src/pages/*.astro), not demo.json.\n` +
          `  Move the copy into the pages, and reviews, FAQs, process and rating into the top-level keys (presets/local-service/README.md).`,
      );
  const presetDir = at(`presets/${raw?.preset}`);
  if (!raw?.preset || !existsSync(path.join(presetDir, "preset.mjs")))
    fail(`demo.json › preset: "${raw?.preset}" is not a folder in presets/.`);
  const preset = await import(path.join(presetDir, "preset.mjs"));
  const parsed = preset.demoSchema.safeParse(raw);
  if (!parsed.success)
    fail(
      `demo.json is not valid:\n${parsed.error.issues
        .map(
          (/** @type {{ path: PropertyKey[], message: string }} */ i) =>
            `  demo.json › ${i.path.map(String).join(".") || "(root)"}: ${i.message}`,
        )
        .join("\n")}`,
    );
  const demo = parsed.data;

  const defaultsFile = path.resolve(
    value("--defaults") ?? at("demo.defaults.json"),
  );
  /** @type {Record<string, string>} */
  const defaults = existsSync(defaultsFile)
    ? JSON.parse(await fs.readFile(defaultsFile, "utf8"))
    : {};
  return { demo, defaults, preset, presetDir, baseDir: path.dirname(file) };
}

/** @param {any} demo */
function preflight(demo) {
  const origin = git("remote", "get-url", "origin");
  if (PUBLIC_STARTER.test(origin) && !flag("--allow-public"))
    fail(
      `origin is the public starter (${origin}). Demos hold prospect data — run this in the private demos repo (docs/demo-mode.md).`,
    );
  const branch = git("branch", "--show-current");
  const want = `demo/${demo.prospect.slug}`;
  if (branch !== want)
    fail(
      `You're on "${branch || "(no branch)"}" — switch to ${want} first: git switch -c ${want}`,
    );
  const worker = String(
    parseJsonc(readFileSync(at("wrangler.jsonc"), "utf8")).name ?? "",
  );
  if (!worker || worker === "your-worker-name")
    fail(
      "wrangler.jsonc has no Worker name yet — set the demos Worker's name (docs/demo-mode.md).",
    );
  return { worker };
}

// ── 1. Images ────────────────────────────────────────────────────────────────
/** @type {Map<string, Buffer>} */
const sourceCache = new Map();
/** @param {string} src @param {string} baseDir */
async function source(src, baseDir) {
  const hit = sourceCache.get(src);
  if (hit) return hit;
  /** @type {Buffer} */
  let buf;
  if (/^https?:\/\//.test(src)) {
    const res = await fetch(src);
    if (!res.ok) fail(`Image ${src}: HTTP ${res.status}`);
    buf = Buffer.from(await res.arrayBuffer());
  } else {
    const abs = path.resolve(baseDir, src);
    if (!existsSync(abs)) fail(`Image not found: ${src} (looked in ${abs})`);
    buf = await fs.readFile(abs);
  }
  sourceCache.set(src, buf);
  return buf;
}
/** A web-ready webp, capped at `width` (never enlarged). */
/* Photos keep up to 2400px: sections crop them (a landscape photo into a
   tall portrait, a wide band), and a smaller source stretched into the
   crop looked blurry. The build serves right-sized copies, so the size
   here costs nothing at runtime. The build also publishes each original
   (share images, structured data), so the long side stays at `width` and
   the quality steps down until the file fits under check:budget's 400 KB
   with room for the build's own re-encode. */
async function webp(/** @type {Buffer} */ buf, width = 2400) {
  /* Quality first; a very busy photo that still doesn't fit steps down in
     size. */
  const tries = [82, 74, 66, 58].map((quality) => ({ size: width, quality }));
  tries.push({ size: Math.min(width, 2000), quality: 66 });
  tries.push({ size: Math.min(width, 1600), quality: 66 });
  let out = Buffer.alloc(0);
  for (const { size, quality } of tries) {
    out = await sharp(buf)
      .rotate()
      .resize({
        width: size,
        height: size,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality })
      .toBuffer();
    if (out.length <= 320 * 1024) break;
  }
  return out;
}

/** @type {Set<string>} */
const written = new Set();
async function write(
  /** @type {string} */ rel,
  /** @type {string | Buffer} */ data,
) {
  written.add(rel);
  if (DRY_RUN) return;
  await fs.mkdir(path.dirname(at(rel)), { recursive: true });
  await fs.writeFile(at(rel), data);
}
async function emptyDir(
  /** @type {string} */ rel,
  /** @type {RegExp} */ keep = /^$/,
) {
  if (DRY_RUN || !existsSync(at(rel))) return;
  for (const f of await fs.readdir(at(rel)))
    if (!keep.test(f))
      await fs.rm(at(rel, f), { recursive: true, force: true });
}

// ── Phone ────────────────────────────────────────────────────────────────────
function e164(/** @type {string} */ display) {
  const d = display.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return fail(
    `demo.json › contact.phone: "${display}" isn't a 10-digit US number.`,
  );
}

/** WCAG relative luminance — the same rule setup.mjs warns with. */
function luminance(/** @type {string} */ hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Platform names a review's `meta` can carry ("Google review"). */
const REVIEW_PLATFORMS = /** @type {const} */ ([
  ["google", /google/i],
  ["facebook", /facebook/i],
  ["yelp", /yelp/i],
  ["angi", /angi/i],
  ["nextdoor", /nextdoor/i],
  ["thumbtack", /thumbtack/i],
  ["bbb", /\bbbb\b|better business/i],
]);

async function main() {
  const { demo, defaults, preset, presetDir, baseDir } = await load();
  const { worker } = preflight(demo);
  const { slug, name } = demo.prospect;
  const vars = { slug, name, worker };
  const siteUrl = defaults.siteUrl
    ? fill(defaults.siteUrl, vars)
    : defaults.workersSubdomain
      ? `https://demo-${slug}-${worker}.${defaults.workersSubdomain}.workers.dev`
      : fail(
          'Set "workersSubdomain" (or "siteUrl") in demo.defaults.json — the demo needs its preview URL for canonical links and the share image.',
        );
  const img = (/** @type {string} */ src) => source(src, baseDir);
  // The starter as it ships — not yet a demo, not yet a local-service site:
  // the only run that may replace existing pages (step 0).
  const startSite = readFileSync(at("src/config/site.ts"), "utf8");
  const freshStarter =
    /\n {2}demo: null as /.test(startSite) &&
    /\n {2}quote: null as /.test(startSite);

  // 0. The preset's pages, each only where src/pages has none yet: once a
  // page is there it is the demo's own, and a re-run leaves it alone. On
  // the first run (the starter as it ships) the preset's home and contact
  // pages replace the starter's. This runs before any other write, so a
  // run that fails later (a missing photo, after setup.mjs has set
  // SITE.quote) has already installed them, and the re-run that follows
  // the fix is not mistaken for a branch with pages of its own.
  /** @type {Array<{ from: string; to: string; replacesStarter: boolean }>} */
  const pages = [
    ...preset.PAGES.filter(
      (/** @type {{ when?: (d: any) => boolean }} */ page) =>
        !page.when || page.when(demo),
    ).map((/** @type {{ from: string; to: string }} */ page) => ({
      from: page.from,
      to: page.to,
      replacesStarter: true,
    })),
    ...(demo.audiencePage
      ? [
          {
            from: "audience.astro",
            to: `src/pages/${demo.audiencePage.path}.astro`,
            replacesStarter: false,
          },
        ]
      : []),
  ];
  for (const page of pages) {
    if (existsSync(at(page.to)) && !(freshStarter && page.replacesStarter))
      continue;
    console.log(`  ${page.to}: installed from presets/${demo.preset}`);
    await write(
      page.to,
      await fs.readFile(path.join(presetDir, page.from), "utf8"),
    );
  }

  // 1a. The service-area street map: each town's real boundary from
  // OpenStreetMap (scripts/lib/service-area-geo.mjs, the same function
  // `npm run map` runs), cached beside demo.json (service-area.geo.json) so a
  // re-run — and check:demo — needs no network. Written to
  // src/data/service-area-geo.json (the home page, the service pages and
  // the town pages read it) and src/data/service-radius.json ("within 60
  // miles of Palmer"). The cache is copied to src/data/ too, so a later
  // `npm run map` on the demo's branch starts from it. A failed lookup only
  // costs the map.
  const geoCache = path.join(baseDir, "service-area.geo.json");
  const map = await buildMap({
    areas: demo.serviceAreas,
    radius: demo.serviceRadius ?? null,
    region: demo.contact.region,
    cacheFile: geoCache,
    warn: (m) => console.warn(`! ${m}`),
  });
  await write("src/data/service-area-geo.json", `${JSON.stringify(map.geo)}\n`);
  await write(
    "src/data/service-radius.json",
    `${JSON.stringify(map.radius)}\n`,
  );
  await write(
    "src/data/service-area-geo.cache.json",
    existsSync(geoCache) ? await fs.readFile(geoCache, "utf8") : "{}\n",
  );

  // 1b. Logo, favicon, webclip, share image.
  const logoSrc = demo.brand.logo.file;
  const logoBuf = await img(logoSrc);
  const logoExt = /\.svg(\?|$)/i.test(logoSrc) ? "svg" : "png";
  for (const ext of ["svg", "png"])
    if (
      ext !== logoExt &&
      existsSync(at(`public/images/logo.${ext}`)) &&
      !DRY_RUN
    )
      await fs.rm(at(`public/images/logo.${ext}`));
  /* A logo shows at most a few hundred pixels wide; 1200 keeps it sharp on
     any screen and the file inside check:budget. */
  const logoOut =
    logoExt === "svg"
      ? logoBuf
      : await sharp(logoBuf)
          .resize({
            width: 1200,
            height: 1200,
            fit: "inside",
            withoutEnlargement: true,
          })
          .png({ palette: true, quality: 90, effort: 10, compressionLevel: 9 })
          .toBuffer();
  const logoMeta = await sharp(logoOut).metadata();
  await write(`public/images/logo.${logoExt}`, logoOut);
  const iconBuf = demo.brand.favicon ? await img(demo.brand.favicon) : logoBuf;
  const square = (/** @type {number} */ size, /** @type {boolean} */ solid) =>
    sharp(iconBuf)
      .resize(size, size, {
        fit: "contain",
        background: solid ? "#ffffff" : { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .flatten(solid ? { background: "#ffffff" } : false)
      .png()
      .toBuffer();
  await write("public/images/favicon.png", await square(64, false));
  await write("public/images/webclip.png", await square(180, true));
  await write(
    "public/images/og-image.png",
    await sharp(await img(demo.seo.image))
      .rotate()
      .resize(1200, 630, { fit: "cover" })
      // A palette PNG: a photo as full-colour PNG is over 1 MB.
      .png({ palette: true, quality: 90, effort: 10, compressionLevel: 9 })
      .toBuffer(),
  );

  // 2. Identity, through setup.mjs (one engine for forks and demos).
  const lightBrand = demo.brand.text
    ? demo.brand.text === "dark"
    : luminance(demo.brand.color) > 0.4;
  const answers = {
    contentSource: "files",
    siteName: name,
    legalName: demo.prospect.legalName ?? name,
    siteUrl,
    founder: demo.prospect.owner ?? name,
    tagline: demo.seo.tagline,
    defaultDescription: demo.seo.description,
    summary: demo.seo.description,
    localBusinessDescription: demo.seo.description,
    phoneDisplay: demo.contact.phone,
    phoneE164: e164(demo.contact.phone),
    phoneTel: e164(demo.contact.phone),
    hours: demo.contact.hours,
    addressLocality: demo.contact.locality,
    addressRegion: demo.contact.region,
    addressCountry: "US",
    brandColor: demo.brand.color,
    cssColors: {
      "--color-brand-text": lightBrand
        ? "var(--color-dark-900)"
        : "var(--color-light-100)",
    },
    ...(defaults.ghlTrackingId
      ? { ghlTrackingId: defaults.ghlTrackingId }
      : {}),
    ...(defaults.ghlChatWidgetId
      ? { ghlChatWidgetId: defaults.ghlChatWidgetId }
      : {}),
    // Structured fields — always written whole, so a field removed from
    // demo.json is removed from the site on the next run.
    serviceAreas: demo.serviceAreas,
    areaServed: demo.serviceAreas.map((/** @type {string} */ area) => ({
      type: "City",
      name: area,
    })),
    founded: demo.founded ?? null,
    openingHours: demo.contact.openingHours ?? [],
    businessType: demo.businessType ?? "ProfessionalService",
    utilityBar: demo.utilityBar ?? null,
    reviewsUrl: demo.reviewsUrl ?? "",
    googleReviewUrl: "",
    social: demo.social ?? {},
    sameAs: Object.values(demo.social ?? {}),
    logoImage: {
      src: `/images/logo.${logoExt}`,
      width: logoMeta.width ?? 320,
      height: logoMeta.height ?? 96,
      plate: demo.brand.logo.plate,
    },
    // Local-service chrome: the look, the site-wide estimate CTA (nav,
    // mobile bar, modal), the license line and the audience page's button.
    look: demo.look,
    quote: demo.quote,
    license: demo.license ?? "",
    navSecondaryCta: demo.audiencePage?.navButton
      ? {
          label: demo.audiencePage.navButton,
          href: `/${demo.audiencePage.path}`,
        }
      : null,
  };
  const answersFile = path.join(
    os.tmpdir(),
    `demo-answers-${process.pid}.json`,
  );
  await fs.writeFile(answersFile, JSON.stringify(answers));
  try {
    run(
      [
        process.execPath,
        "scripts/setup.mjs",
        "--config",
        answersFile,
        "--yes",
        ...(DRY_RUN ? ["--dry-run"] : []),
      ],
      { quiet: true },
    );
  } finally {
    await fs.rm(answersFile, { force: true });
  }
  [
    "src/config/site.ts",
    "src/config/site.shared.mjs",
    "src/config/logo-paths.ts",
    "src/styles/variables/colors.css",
  ].forEach((f) => written.add(f));
  // setup keeps the current value for an empty answer; a prospect with no
  // published email (or street address, or price range) must not inherit
  // the starter's placeholder or a previous run's value.
  if (!DRY_RUN) {
    let site = await fs.readFile(at("src/config/site.ts"), "utf8");
    for (const [key, value] of [
      ["email", demo.contact.email],
      ["street", demo.contact.street],
      ["postalCode", demo.contact.postalCode],
      ["priceRange", demo.prospect.priceRange],
    ])
      site = site.replace(
        new RegExp(`(\\b${key}\\s*:\\s*)"(?:\\\\.|[^"])*"`),
        (_, lead) => `${lead}${JSON.stringify(value ?? "")}`,
      );
    site = site.replace(
      /(\bsmsOptIn\s*:\s*)(?:true|false)/,
      (_, lead) => `${lead}${demo.smsOptIn ? "true" : "false"}`,
    );
    site = site.replace(
      /(\btexts\s*:\s*)(?:true|false)/,
      (_, lead) => `${lead}${demo.contact.texts ? "true" : "false"}`,
    );
    // The map's radius and the public rating live in SITE too.
    for (const [key, value] of [
      ["serviceRadius", demo.serviceRadius ?? null],
      ["rating", demo.rating ?? null],
    ])
      site = site.replace(
        new RegExp(`(\\n  ${key}: )(?:null|\\{[^}]*\\})(\\s+as\\s)`),
        (_, lead, tail) => `${lead}${JSON.stringify(value)}${tail}`,
      );
    await fs.writeFile(at("src/config/site.ts"), site);
  }

  // 3a. Reviews — one file each in src/content/reviews: the site's
  // reviews, then each service's own, tagged with that service. A review in
  // both places is one file with every service it belongs to.
  await emptyDir("src/content/reviews", /^images$/);
  await emptyDir("src/content/reviews/images");
  /** @type {Map<string, Record<string, any>>} */
  const reviewFiles = new Map();
  const reviewIds = new Set();
  /** The platform named in a review's `meta`; google when it has no meta. */
  const platformOf = (/** @type {string | undefined} */ meta) =>
    !meta
      ? "google"
      : (REVIEW_PLATFORMS.find(([, pattern]) => pattern.test(meta))?.[0] ??
        "google");
  const addReview = (
    /** @type {Record<string, any>} */ review,
    /** @type {string | undefined} */ serviceId,
  ) => {
    const key = `${review.name}\n${review.text}`;
    const have = reviewFiles.get(key);
    if (have) {
      if (serviceId && !have.services?.includes(serviceId))
        (have.services ??= []).push(serviceId);
      return;
    }
    const base =
      review.name
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "review";
    let id = base;
    for (let n = 2; reviewIds.has(id); n++) id = `${base}-${n}`;
    reviewIds.add(id);
    reviewFiles.set(key, {
      id,
      name: review.name,
      rating: review.rating ?? 5,
      text: review.text,
      ...(review.full ? { full: review.full } : {}),
      ...(review.date ? { date: review.date } : {}),
      ...(review.meta ? { meta: review.meta } : {}),
      ...(review.role ? { role: review.role } : {}),
      ...(review.avatar ? { avatar: review.avatar } : {}),
      ...(review.avatarAlt ? { avatarAlt: review.avatarAlt } : {}),
      platform: platformOf(review.meta),
      ...(review.featured ? { featured: true } : {}),
      ...(serviceId ? { services: [serviceId] } : {}),
      order: reviewFiles.size,
    });
  };
  for (const review of demo.reviews) addReview(review, undefined);
  for (const entry of demo.services)
    for (const review of entry.reviews ?? []) addReview(review, entry.slug);
  for (const { id, ...review } of reviewFiles.values()) {
    if (review.avatar) {
      await write(
        `src/content/reviews/images/${id}.webp`,
        await webp(await img(review.avatar), 256),
      );
      review.avatar = `./images/${id}.webp`;
    }
    await write(
      `src/content/reviews/${id}.json`,
      `${JSON.stringify(review, null, 2)}\n`,
    );
  }

  // 3. Services.
  await emptyDir("src/content/services", /^images$/);
  await emptyDir("src/content/services/images");
  for (const [index, entry] of demo.services.entries()) {
    const { slug: id, ...service } = structuredClone(entry);
    const image = async (
      /** @type {string} */ src,
      /** @type {string} */ field,
      width = 2400,
    ) => {
      const file = `${id}-${field}.webp`;
      await write(
        `src/content/services/images/${file}`,
        await webp(await img(src), width),
      );
      return `./images/${file}`;
    };
    service.order ??= (index + 1) * 10;
    // Reviews live in src/content/reviews (step 3a), not in the service.
    delete service.reviews;
    if (!service.reviewSummary && demo.rating)
      service.reviewSummary = {
        rating: demo.rating.value,
        count: demo.rating.count,
      };
    service.cardImage = await image(service.cardImage, "card", 2400);
    service.hero.image = await image(service.hero.image, "hero", 2400);
    if (service.scope.image)
      service.scope.image = await image(service.scope.image, "scope", 2400);
    for (const [i, pic] of service.included.images.entries())
      pic.src = await image(pic.src, `included-${i + 1}`);
    // The estate service page's photos (each section optional).
    for (const [i, pair] of (service.beforeAfter?.items ?? []).entries()) {
      pair.before = await image(pair.before, `before-${i + 1}`);
      pair.after = await image(pair.after, `after-${i + 1}`);
    }
    for (const [i, option] of (service.options?.items ?? []).entries())
      option.image = await image(option.image, `option-${i + 1}`, 1600);
    for (const [i, pic] of (service.gallery?.images ?? []).entries())
      pic.src = await image(pic.src, `gallery-${i + 1}`, 1600);
    if (service.equipment?.image)
      service.equipment.image = await image(
        service.equipment.image,
        "equipment",
      );
    for (const [i, item] of (service.work?.items ?? []).entries())
      item.image = await image(item.image, `work-${i + 1}`, 1600);
    await write(
      `src/content/services/${id}.json`,
      `${JSON.stringify(service, null, 2)}\n`,
    );
  }

  // 3b. Service-area regions (never a page per town).
  await emptyDir("src/content/service-areas", /^images$/);
  await emptyDir("src/content/service-areas/images");
  for (const [index, entry] of (demo.areas ?? []).entries()) {
    const { slug: id, ...area } = structuredClone(entry);
    const image = async (
      /** @type {string} */ src,
      /** @type {string} */ field,
      width = 2400,
    ) => {
      const file = `${id}-${field}.webp`;
      await write(
        `src/content/service-areas/images/${file}`,
        await webp(await img(src), width),
      );
      return `./images/${file}`;
    };
    area.order ??= (index + 1) * 10;
    area.hero.image = await image(area.hero.image, "hero");
    for (const [i, job] of (area.jobs ?? []).entries())
      job.image = await image(job.image, `job-${i + 1}`, 1600);
    await write(
      `src/content/service-areas/${id}.json`,
      `${JSON.stringify(area, null, 2)}\n`,
    );
  }

  // 3c. Projects — their own jobs, replacing the starter's samples (and the
  // sample gallery, whose photos point at those samples).
  if (demo.projects) {
    await emptyDir("src/content/projects", /^images$/);
    await emptyDir("src/content/projects/images");
    for (const entry of demo.projects) {
      const { slug: id, ...project } = structuredClone(entry);
      const image = async (
        /** @type {string} */ src,
        /** @type {string} */ field,
        width = 2400,
      ) => {
        const file = `${id}-${field}.webp`;
        await write(
          `src/content/projects/images/${file}`,
          await webp(await img(src), width),
        );
        return `./images/${file}`;
      };
      project.heroImage = await image(project.heroImage, "hero");
      for (const [i, photo] of (project.photos ?? []).entries())
        photo.src = await image(photo.src, `photo-${i + 1}`, 1600);
      await write(
        `src/content/projects/${id}.json`,
        `${JSON.stringify(project, null, 2)}\n`,
      );
    }
    await write("src/content/gallery.json", "[]\n");
  }

  // 3d. The site-wide process steps: settings.json's `process` (the file's
  // other keys stay).
  if (demo.process && !DRY_RUN) {
    const settingsFile = at("src/content/settings.json");
    const settings = JSON.parse(await fs.readFile(settingsFile, "utf8"));
    const { heading, text, steps } = demo.process;
    settings.site.process = {
      heading,
      ...(text ? { text } : {}),
      steps: steps.map(
        (/** @type {{ title: string; text: string }} */ step) => ({
          title: step.title,
          text: step.text,
        }),
      ),
    };
    await write(
      "src/content/settings.json",
      `${JSON.stringify(settings, null, 2)}\n`,
    );
  }

  // 3e. The site-wide FAQs: one file each in src/content/faqs, word for
  // word, named for the question, in source order.
  await emptyDir("src/content/faqs");
  const faqIds = new Set();
  for (const [position, faq] of demo.faqs.entries()) {
    const base =
      faq.question
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80)
        .replace(/-+$/g, "") || "faq";
    let id = base;
    for (let n = 2; faqIds.has(id); n++) id = `${base}-${n}`;
    faqIds.add(id);
    await write(
      `src/content/faqs/${id}.json`,
      `${JSON.stringify({ question: faq.question, answer: faq.answer, order: position }, null, 2)}\n`,
    );
  }

  // 4a. The nav: the PAGES descriptions of the home and contact pages.
  const hasPage = (/** @type {string} */ to) =>
    existsSync(at(to)) || pages.some((page) => page.to === to);
  const hasReviewsPage = hasPage("src/pages/reviews.astro");
  {
    let structure = await fs.readFile(at("src/data/site-structure.ts"), "utf8");
    for (const [pagePath, desc] of [
      ["/", demo.seo.description],
      ["/contact", `Contact ${name}: call or send the form.`],
    ]) {
      const re = new RegExp(
        `(path:\\s*${JSON.stringify(pagePath).replace(/\//g, "\\/")},[^}]*?desc:\\s*)"(?:\\\\.|[^"])*"`,
      );
      if (!re.test(structure))
        fail(`site-structure.ts: no PAGES entry for ${pagePath}`);
      structure = structure.replace(
        re,
        (_, lead) => `${lead}${JSON.stringify(desc)}`,
      );
    }
    await write("src/data/site-structure.ts", structure);
  }
  // 4b. The preset's extra pages in the nav, the footer and llms.txt — a
  // generated file site-structure.ts merges in, so the registry itself is
  // never rewritten beyond the descriptions above.
  {
    const aboutDesc =
      demo.aboutDescription ?? `Who ${name} is and how we work.`;
    const audiencePath = demo.audiencePage
      ? `/${demo.audiencePage.path}`
      : null;
    const audienceGroup = demo.audiencePage?.group;
    const navPaths = [
      ...(audiencePath && !audienceGroup ? [audiencePath] : []),
      ...(demo.projects ? ["/projects"] : []),
      "/about",
      ...(hasReviewsPage ? ["/reviews"] : []),
      // Contact is in the nav as well as the footer's Company list.
      "/contact",
    ];
    const footerPaths = navPaths.filter(
      (p) => p !== "/projects" && p !== "/contact",
    );
    const groupLinks =
      audiencePath && audienceGroup ? { [audienceGroup]: [audiencePath] } : {};
    await write(
      "src/data/preset-pages.ts",
      `/**
 * Pages the local-service preset adds — generated by \`npm run demo\`
 * (scripts/demo.mjs) from demo.json. Don't edit; re-run the script.
 */
import type { FooterLink, NavMenuItem, SitePage } from "./site-structure";
import type { ProjectsPageCopy } from "./preset-pages-types";

export const PRESET_PAGES: SitePage[] = [${
        demo.audiencePage
          ? `
  {
    path: ${JSON.stringify(audiencePath)},
    title: ${JSON.stringify(demo.audiencePage.navLabel ?? "For contractors")},
    desc: ${JSON.stringify(demo.audiencePage.desc ?? `${name} works with general contractors and property managers.`)},
    group: "main",
  },`
          : ""
      }
  {
    path: "/about",
    title: "About",
    desc: ${JSON.stringify(aboutDesc)},
    group: "main",
  },${
    hasReviewsPage
      ? `
  {
    path: "/reviews",
    title: "Reviews",
    desc: ${JSON.stringify(`What customers say about ${name}, in their own words.`)},
    group: "main",
  },`
      : ""
  }
];
export const PRESET_NAV: NavMenuItem[] = ${JSON.stringify(
        navPaths.map((p) =>
          p === "/about" && demo.aboutNavLabel
            ? { path: p, label: demo.aboutNavLabel }
            : { path: p },
        ),
      )};
export const PRESET_FOOTER: FooterLink[] = ${JSON.stringify(footerPaths)};
export const PRESET_GROUP_LINKS: Record<string, string[]> = ${JSON.stringify(groupLinks)};
export const PRESET_PROJECTS_PAGE: ProjectsPageCopy | null = ${JSON.stringify(demo.projectsPage ?? null)};
`,
    );
  }

  // 5. The demo switch — SITE.demo in src/config/site.ts.
  {
    const siteSource = await fs.readFile(at("src/config/site.ts"), "utf8");
    const config = {
      slug,
      prospect: name,
      preset: demo.preset,
      hiddenPaths: demo.projects
        ? preset.HIDDEN_PATHS.filter(
            (/** @type {string} */ p) => p !== "/projects",
          )
        : preset.HIDDEN_PATHS,
      bannerText: fill(defaults.bannerText ?? DEFAULT_BANNER_TEXT, vars),
      bannerHref: fill(defaults.bannerHref ?? DEFAULT_BANNER_HREF, vars),
    };
    const value = `{\n${Object.entries(config)
      .map(([key, v]) => `    ${key}: ${JSON.stringify(v)},`)
      .join("\n")}\n  }`;
    const switchPattern =
      /(\n  demo: )(?:null|\{[\s\S]*?\n  \})( as DemoConfig \| null,)/;
    if (!switchPattern.test(siteSource))
      fail("src/config/site.ts has no `demo: … as DemoConfig | null,`.");
    await write(
      "src/config/site.ts",
      siteSource.replace(
        switchPattern,
        (_, lead, tail) => `${lead}${value}${tail}`,
      ),
    );
  }

  if (DRY_RUN) {
    console.log(
      `✓ demo.json is valid. Would write ${written.size} files for ${name} (${siteUrl}).`,
    );
    return;
  }

  // 6. Format, then validate with the real content schema and types.
  const formattable = [...written].filter((f) =>
    /\.(astro|ts|mjs|css)$/.test(f),
  );
  run(["npx", "prettier", "--write", "--log-level", "warn", ...formattable], {
    quiet: true,
  });
  run(["npx", "astro", "sync"], { quiet: true });
  if (!flag("--no-check"))
    run(["npx", "astro", "check", "--minimumSeverity", "error"], {
      quiet: true,
    });

  const confirm = demo.notes.confirmOrCut;
  console.log(`
✓ Demo written for ${name}
  URL (after push):  ${siteUrl}
  Files written:     ${written.size}
  Next: npm run build && npm run preview, check it, then commit and push demo/${slug}.${
    confirm.length
      ? `\n\n  Confirm or cut before sending:\n${confirm.map((/** @type {string} */ c) => `    • ${c}`).join("\n")}`
      : ""
  }`);
}

main().catch((err) => {
  if (err instanceof DemoError) {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  }
  throw err;
});
