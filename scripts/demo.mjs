#!/usr/bin/env node
// @ts-check
/**
 * Prospect demo generator — `npm run demo -- --config demo.json`
 * ════════════════════════════════════════════════════════════════════════════
 * Turns one `demo.json` (a prospect's name, contact details, brand, copy,
 * services and photos — see presets/<preset>/preset.mjs for the shape) into
 * a branded demo site, on a `demo/<slug>` branch of the PRIVATE demos repo.
 * The /demo skill (.claude/skills/demo) researches the prospect and writes
 * demo.json; this script does every file write, the same way every time.
 *
 * What it writes (every step regenerates its files whole, so re-running
 * after an edit to demo.json is the normal way to change a demo):
 *   1. Images — each source (a path relative to demo.json, or an https URL)
 *      converted to webp: home photos → src/assets/demo/, service photos →
 *      src/content/services/images/. Logo → public/images/logo.<ext>, plus
 *      favicon.png, webclip.png and og-image.png (from the hero photo).
 *   2. Identity — scripts/setup.mjs --config (name, phone, hours, brand
 *      colour and its contrast text, service areas, logo, social, …).
 *   3. Services — src/content/services/*.json replaced by the prospect's.
 *   4. Home — src/data/home.ts (LocalServiceHomeData) and the default
 *      process steps (src/data/process.ts).
 *   5. Pages — the preset's pages copied into src/pages; their PAGES
 *      descriptions updated.
 *   6. The demo switch — DEMO in src/config/demo.shared.mjs: whole-site
 *      noindex, the "Built for …" banner, nav pruning, the lead fallback.
 *   7. Prettier on what it wrote, then `astro sync` (the content schema
 *      names any bad service field) and `astro check`.
 * Git is left to the caller: review the diff, commit, push.
 *
 * Defaults shared by every demo live in `demo.defaults.json` at the repo
 * root of the demos repo (never in the public starter):
 *   { "workersSubdomain": "clcreative", "bannerHref": "…", "bannerText": "…",
 *     "ghlTrackingId": "tk_…" }
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
import { serviceAreaGeo } from "./lib/service-area-geo.mjs";

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
   here costs nothing at runtime. */
async function webp(/** @type {Buffer} */ buf, width = 2400) {
  return sharp(buf)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
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

  // 1a. Home photos.
  await emptyDir("src/assets/demo");
  const home = structuredClone(demo.home);
  /** @type {Array<[string, string]>} identifier → asset path */
  const homeImports = [];
  /** @param {any} holder @param {string} key @param {string} id */
  async function homeImage(holder, key, id, width = 2400) {
    if (!holder?.[key]) return;
    const rel = `src/assets/demo/${id}.webp`;
    await write(rel, await webp(await img(holder[key]), width));
    homeImports.push([
      `${id.replace(/-(\w)/g, (_, c) => c.toUpperCase())}Image`,
      rel,
    ]);
    holder[key] = `__IMAGE_${homeImports.length - 1}__`;
  }
  await homeImage(home.hero, "image", "hero");
  await homeImage(home.process, "image", "process");
  await homeImage(home.photoBand, "image", "photo-band");
  await homeImage(home.story, "image", "story");
  await homeImage(home.about, "image", "about");
  await homeImage(home.contact, "image", "contact");
  await homeImage(home.callBand, "image", "call-band");
  for (const [i, job] of (home.recentWork?.items ?? []).entries())
    await homeImage(job, "image", `work-${i + 1}`, 1600);
  for (const [i, member] of (home.team?.members ?? []).entries())
    await homeImage(member, "image", `team-${i + 1}`, 800);
  for (const [i, badge] of (home.hero.trust ?? []).entries())
    await homeImage(badge, "image", `trust-${i + 1}`, 320);

  // 1a'. The service-area street map: each town's real boundary from
  // OpenStreetMap, cached beside demo.json (service-area.geo.json) so a
  // re-run — and check:demo — needs no network. Written to
  // src/data/service-area-geo.json, which the home page, the service pages
  // and the town pages all read. A failed lookup only costs the map.
  /** @type {unknown[]} */
  let areaGeo = [];
  try {
    areaGeo = await serviceAreaGeo(
      demo.serviceAreas,
      demo.contact.region,
      path.join(baseDir, "service-area.geo.json"),
      (m) => console.warn(`! ${m}`),
    );
  } catch (err) {
    console.warn(
      `! Service-area map skipped: ${/** @type {Error} */ (err).message}`,
    );
  }
  await write("src/data/service-area-geo.json", `${JSON.stringify(areaGeo)}\n`);

  // The service radius ("within 60 miles of Palmer"): its centre town looked
  // up like the others (same cache), then the middle of its outline.
  /** @type {{ lat: number; lng: number; miles: number } | null} */
  let serviceRadius = null;
  if (demo.serviceRadius) {
    try {
      const [hit] = await serviceAreaGeo(
        [demo.serviceRadius.center],
        demo.contact.region,
        path.join(baseDir, "service-area.geo.json"),
        (m) => console.warn(`! ${m}`),
      );
      if (hit) {
        /** @type {number[][]} */
        const points = [];
        const walk = (/** @type {unknown} */ c) =>
          Array.isArray(c) && typeof c[0] === "number"
            ? points.push(/** @type {number[]} */ (c))
            : Array.isArray(c) && c.forEach(walk);
        walk(
          /** @type {{ coordinates: unknown }} */ (hit.geometry).coordinates,
        );
        const lngs = points.map((p) => p[0]);
        const lats = points.map((p) => p[1]);
        const mid = (/** @type {number[]} */ v) =>
          Math.round(((Math.min(...v) + Math.max(...v)) / 2) * 1e4) / 1e4;
        serviceRadius = {
          lat: mid(lats),
          lng: mid(lngs),
          miles: demo.serviceRadius.miles,
        };
      }
    } catch (err) {
      console.warn(
        `! Service radius skipped: ${/** @type {Error} */ (err).message}`,
      );
    }
  }
  await write(
    "src/data/service-radius.json",
    `${JSON.stringify(serviceRadius)}\n`,
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
  const logoMeta = await sharp(logoBuf).metadata();
  await write(
    `public/images/logo.${logoExt}`,
    logoExt === "svg" ? logoBuf : await sharp(logoBuf).png().toBuffer(),
  );
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
    await sharp(await img(demo.home.hero.image))
      .rotate()
      .resize(1200, 630, { fit: "cover" })
      .png()
      .toBuffer(),
  );

  // 2. Identity, through setup.mjs (one engine for forks and demos).
  const lightBrand = luminance(demo.brand.color) > 0.4;
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
    // Structured fields — always written whole, so a field removed from
    // demo.json is removed from the site on the next run.
    serviceAreas: demo.serviceAreas,
    areaServed: demo.serviceAreas.map((/** @type {string} */ area) => ({
      type: "City",
      name: area,
    })),
    founded: demo.founded ?? null,
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
    // mobile bar, modal) from home.estimate, and the license line.
    look: demo.look,
    quote: {
      label: demo.home.estimate.label,
      heading: demo.home.estimate.heading,
      ...(demo.home.estimate.text ? { text: demo.home.estimate.text } : {}),
      ...(demo.home.estimate.question
        ? { question: demo.home.estimate.question }
        : {}),
    },
    license: demo.license ?? "",
    // A page per service per town (/services/<service>/<town>).
    cityPages: demo.cityPages,
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
  // published email must not inherit the starter's placeholder.
  if (!DRY_RUN) {
    const site = await fs.readFile(at("src/config/site.ts"), "utf8");
    await fs.writeFile(
      at("src/config/site.ts"),
      site.replace(
        /(\bemail\s*:\s*)"(?:\\.|[^"])*"/,
        (_, lead) => `${lead}${JSON.stringify(demo.contact.email ?? "")}`,
      ),
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
    service.cardImage = await image(service.cardImage, "card", 2400);
    service.hero.image = await image(service.hero.image, "hero", 2400);
    if (service.scope.image)
      service.scope.image = await image(service.scope.image, "scope", 2400);
    for (const [i, pic] of service.included.images.entries())
      pic.src = await image(pic.src, `included-${i + 1}`);
    for (const [i, review] of (service.reviews ?? []).entries())
      if (review.avatar)
        review.avatar = await image(review.avatar, `review-${i + 1}`, 256);
    await write(
      `src/content/services/${id}.json`,
      `${JSON.stringify(service, null, 2)}\n`,
    );
  }

  // 4. Home data and the default process steps.
  home.title ??= `${name} | ${demo.seo.tagline}`;
  home.description ??= demo.seo.description;
  let homeJson = JSON.stringify(home, null, 2);
  homeImports.forEach(([id], i) => {
    homeJson = homeJson.replace(`"__IMAGE_${i}__"`, id);
  });
  await write(
    "src/data/home.ts",
    `/**
 * The home page's content — GENERATED by \`npm run demo\` from demo.json.
 * Edit demo.json and re-run the script; changes made here are overwritten.
 */
import type { LocalServiceHomeData } from "@/lib/local-service-home";
${homeImports.map(([id, rel]) => `import ${id} from "@/${rel.replace(/^src\//, "")}";`).join("\n")}

export const HOME = ${homeJson} satisfies LocalServiceHomeData;
`,
  );
  if (demo.home.process) {
    await write(
      "src/data/process.ts",
      `/**
 * The default "how it works" steps every service page shows when its own
 * file doesn't set \`process\`. GENERATED by \`npm run demo\` from demo.json
 * (home.process) — edit demo.json and re-run the script.
 */
export const DEFAULT_PROCESS = ${JSON.stringify(
        { heading: demo.home.process.heading, steps: demo.home.process.steps },
        null,
        2,
      )};
`,
    );
  }

  // 5. The preset's pages, and their registry descriptions.
  for (const page of preset.PAGES)
    await write(
      page.to,
      await fs.readFile(path.join(presetDir, page.from), "utf8"),
    );
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
  // The preset's extra pages in the nav, the footer and llms.txt — a
  // generated file site-structure.ts merges in, so the registry itself is
  // never rewritten beyond the descriptions above.
  {
    const aboutDesc =
      demo.home.about?.description ?? `Who ${name} is and how we work.`;
    await write(
      "src/data/preset-pages.ts",
      `/**
 * Pages the local-service preset adds — generated by \`npm run demo\`
 * (scripts/demo.mjs) from demo.json. Don't edit; re-run the script.
 */
import type { FooterLink, NavMenuItem, SitePage } from "./site-structure";

export const PRESET_PAGES: SitePage[] = [
  {
    path: "/about",
    title: "About",
    desc: ${JSON.stringify(aboutDesc)},
    group: "main",
  },
];
export const PRESET_NAV: NavMenuItem[] = [{ path: "/about" }];
export const PRESET_FOOTER: FooterLink[] = ["/about"];
`,
    );
  }

  // 6. The demo switch.
  {
    const switchFile = await fs.readFile(
      at("src/config/demo.shared.mjs"),
      "utf8",
    );
    const config = {
      slug,
      prospect: name,
      preset: demo.preset,
      hiddenPaths: preset.HIDDEN_PATHS,
      bannerText: fill(defaults.bannerText ?? DEFAULT_BANNER_TEXT, vars),
      bannerHref: fill(defaults.bannerHref ?? DEFAULT_BANNER_HREF, vars),
    };
    if (!/export const DEMO = /.test(switchFile))
      fail("src/config/demo.shared.mjs has no `export const DEMO =`.");
    await write(
      "src/config/demo.shared.mjs",
      switchFile.replace(
        /export const DEMO = [\s\S]*$/,
        () => `export const DEMO = ${JSON.stringify(config, null, 2)};\n`,
      ),
    );
  }

  if (DRY_RUN) {
    console.log(
      `✓ demo.json is valid. Would write ${written.size} files for ${name} (${siteUrl}).`,
    );
    return;
  }

  // 7. Format, then validate with the real content schema and types.
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
