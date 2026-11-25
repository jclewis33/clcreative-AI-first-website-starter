#!/usr/bin/env node
// @ts-check
/**
 * check-demo — runs `npm run demo` on the fictional fixture prospect
 * (presets/local-service/fixture) in a scratch copy of this repo
 * (scripts/lib/scratch.mjs), builds it, and checks the result:
 *
 *   - a second run writes the identical tree (the script is re-runnable),
 *     and a hand edit to an installed page survives a re-run
 *   - an old-format demo.json (`home` or `audience`) fails before writing
 *   - reviews and FAQs land in the collections, never src/data/home.ts
 *   - the whole site is noindex: the meta on every page, robots.txt
 *     `Disallow: /`, no sitemap, X-Robots-Tag in the built _headers, stub
 *     llms.txt
 *   - the banner, the prospect's name and services are on the page, the
 *     starter's sample services and the hidden nav links are gone
 *   - bad input fails naming the field: one caught by the preset schema,
 *     one by the content schema (via astro sync)
 *
 * node_modules is linked from this repo, so no install and no network.
 * Before the demo is written the starter itself (`demo: null`) is built
 * once, to prove the switch is off: indexable, a sitemap, no banner.
 *
 * Usage: npm run check:demo
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { git, requireGitRepo, scratchCopy } from "./lib/scratch.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
requireGitRepo(REPO, "npm run check:demo");
const FIXTURE = "presets/local-service/fixture/demo.json";
const SLUG = "brightline-electric";

const dir = scratchCopy(REPO);
const defaults = path.join(dir, "..", `demo-defaults-${process.pid}.json`);
const read = (/** @type {string} */ rel) =>
  fs.readFileSync(path.join(dir, rel), "utf8");
const out = (
  /** @type {import("node:child_process").SpawnSyncReturns<string>} */ r,
) => `${r.stdout}\n${r.stderr}`;

/** @param {string} config @param {...string} flags */
function demo(config, ...flags) {
  return spawnSync(
    process.execPath,
    [
      "scripts/demo.mjs",
      "--config",
      config,
      "--defaults",
      defaults,
      "--allow-public",
      "--no-check",
      ...flags,
    ],
    { cwd: dir, encoding: "utf8" },
  );
}
/** The tree git would commit — equal ids mean byte-identical files. */
const tree = () => {
  git(dir, "add", "-A");
  return git(dir, "write-tree").trim();
};

try {
  // The preset's pages are composed pages: copy in the page, content from
  // the collections and SITE, never a generated data file or a template.
  for (const page of [
    "index.astro",
    "about.astro",
    "contact.astro",
    "reviews.astro",
    "audience.astro",
  ])
    assert.doesNotMatch(
      read(`presets/local-service/${page}`),
      /@\/data\/home|@\/data\/audience|LocalService(Home|Showcase|Estate|About|Contact|Audience|Reviews)/,
      `presets/local-service/${page} must be a composed page`,
    );

  fs.symlinkSync(
    path.join(REPO, "node_modules"),
    path.join(dir, "node_modules"),
  );
  // .gitignore's `node_modules/` matches a folder, not this link.
  fs.appendFileSync(
    path.join(dir, ".git", "info", "exclude"),
    "node_modules\n",
  );
  fs.writeFileSync(defaults, JSON.stringify({ workersSubdomain: "example" }));
  // A demos repo has its Worker named; the starter's placeholder is refused.
  const wrangler = path.join(dir, "wrangler.jsonc");
  fs.writeFileSync(
    wrangler,
    fs
      .readFileSync(wrangler, "utf8")
      .replace('"your-worker-name"', '"cl-demos"'),
  );
  git(dir, "commit", "-qam", "name the Worker");

  // The starter as it ships (SITE.demo is null) is not a demo.
  {
    const r = spawnSync("npm", ["run", "build"], {
      cwd: dir,
      encoding: "utf8",
    });
    assert.equal(r.status, 0, out(r).slice(-4000));
    const client = path.join(dir, "dist", "client");
    assert.doesNotMatch(
      fs.readFileSync(path.join(client, "robots.txt"), "utf8"),
      /^Disallow: \/$/m,
    );
    assert.ok(fs.existsSync(path.join(client, "sitemap-index.xml")));
    assert.doesNotMatch(
      fs.readFileSync(path.join(client, "index.html"), "utf8"),
      /Built for/,
    );
    fs.rmSync(path.join(dir, "dist"), { recursive: true, force: true });
  }

  // Refuses the wrong branch, before writing anything.
  {
    const r = demo(FIXTURE);
    assert.equal(r.status, 1, out(r));
    assert.match(r.stderr, /switch to demo\/brightline-electric first/);
    assert.equal(git(dir, "status", "--porcelain").trim(), "");
  }
  git(dir, "switch", "-qc", `demo/${SLUG}`);

  const fixture = JSON.parse(read(FIXTURE));
  /** Runs the script on a copy of the fixture, edited. */
  const edited = (/** @type {(d: any) => void} */ edit) => {
    const copy = structuredClone(fixture);
    edit(copy);
    const file = path.join(dir, "presets/local-service/fixture/bad.json");
    fs.writeFileSync(file, JSON.stringify(copy));
    const r = demo(file);
    fs.rmSync(file);
    return r;
  };

  // An old-format demo.json (page copy in `home` or `audience`) fails
  // before anything is written.
  for (const key of ["home", "audience"]) {
    const r = edited((d) => (d[key] = {}));
    assert.equal(r.status, 1, out(r));
    assert.match(
      r.stderr,
      new RegExp(`demo.json has "${key}": page copy now lives in the pages`),
    );
    assert.equal(git(dir, "status", "--porcelain").trim(), "");
  }

  // A first run that fails part-way (a missing photo, after site.ts is
  // written) still leaves the preset's pages, so the re-run that follows
  // the fix is a demo, not the starter's home page.
  {
    const r = edited(
      (d) => (d.services[0].cardImage = "./assets/missing.webp"),
    );
    assert.equal(r.status, 1, out(r));
    assert.match(r.stderr, /Image not found: \.\/assets\/missing\.webp/);
    const fixed = demo(FIXTURE);
    assert.equal(fixed.status, 0, out(fixed));
    for (const page of ["index.astro", "contact.astro"])
      assert.equal(
        read(`src/pages/${page}`),
        read(`presets/local-service/${page}`),
        `src/pages/${page} is not the preset's page after a failed first run`,
      );
  }

  // Writes the demo, and a second run changes nothing.
  {
    const r = demo(FIXTURE);
    assert.equal(r.status, 0, out(r));
    assert.match(r.stdout, /Demo written for Brightline Electric/);
    const first = tree();
    const again = demo(FIXTURE);
    assert.equal(again.status, 0, out(again));
    assert.equal(tree(), first, "a second run changed the tree");
  }

  // The pages are the demo's once installed: a re-run never overwrites one.
  {
    fs.appendFileSync(
      path.join(dir, "src/pages/index.astro"),
      "<!-- hand edit -->\n",
    );
    const before = tree();
    const r = demo(FIXTURE);
    assert.equal(r.status, 0, out(r));
    assert.match(read("src/pages/index.astro"), /<!-- hand edit -->/);
    assert.equal(tree(), before, "a re-run changed the tree");
  }

  // A merged demo branch: its own pages, `demo` back to null (the starter's
  // line won the merge) but its `quote` kept. Not a fresh starter, so a
  // re-run leaves every page alone.
  {
    fs.appendFileSync(
      path.join(dir, "src/pages/contact.astro"),
      "<!-- hand edit -->\n",
    );
    const site = path.join(dir, "src/config/site.ts");
    fs.writeFileSync(
      site,
      fs
        .readFileSync(site, "utf8")
        .replace(
          /(\n {2}demo: )\{[\s\S]*?\n {2}\}( as DemoConfig \| null,)/,
          "$1null$2",
        ),
    );
    assert.match(read("src/config/site.ts"), /\n {2}demo: null as /);
    assert.doesNotMatch(read("src/config/site.ts"), /\n {2}quote: null as /);
    tree();
    const pagesBefore = git(dir, "write-tree", "--prefix=src/pages/").trim();
    const r = demo(FIXTURE);
    assert.equal(r.status, 0, out(r));
    tree();
    assert.equal(
      git(dir, "write-tree", "--prefix=src/pages/").trim(),
      pagesBefore,
      "a re-run on a merged branch changed src/pages",
    );
  }

  // Facts and repeated content go to the collections, never a data file.
  assert.equal(
    fs
      .readdirSync(path.join(dir, "src/content/reviews"))
      .filter((f) => f.endsWith(".json")).length,
    fixture.reviews.length +
      fixture.services.reduce(
        (/** @type {number} */ n, /** @type {{ reviews?: unknown[] }} */ s) =>
          n + (s.reviews?.length ?? 0),
        0,
      ),
  );
  assert.ok(
    !fs.existsSync(path.join(dir, "src/data/home.ts")),
    "src/data/home.ts must not be written",
  );
  assert.ok(!fs.existsSync(path.join(dir, "src/data/audience.ts")));
  // demo.json's aboutDescription is the About page's registry (llms.txt)
  // line; a demo build serves a stub llms.txt, so read the generated file.
  assert.ok(
    read("src/data/preset-pages.ts").includes(
      JSON.stringify(fixture.aboutDescription),
    ),
    "aboutDescription is missing from the generated page registry",
  );
  assert.match(
    read("src/config/site.ts"),
    /rating: \{\s*value: 4\.9,\s*count: 86/,
  );
  assert.match(
    read("src/content/settings.json"),
    /From first call to final inspection/,
  );
  assert.match(
    read("src/config/site.ts"),
    /demo: \{\s*slug: "brightline-electric"/,
  );
  assert.match(read("src/config/site.ts"), /prospect: "Brightline Electric"/);
  assert.ok(
    !fs.existsSync(path.join(dir, "src/config/demo.shared.mjs")),
    "src/config/demo.shared.mjs must not exist; the switch is SITE.demo",
  );
  assert.match(read("src/config/site.ts"), /name: "Brightline Electric"/);
  assert.match(read("src/config/site.ts"), /email: ""/);
  assert.match(read("src/config/site.ts"), /priceRange: ""/);
  assert.match(read("src/config/site.ts"), /texts: false/);
  assert.match(
    read("src/styles/variables/colors.css"),
    /--color-brand-500: #1a4fd8;/,
  );
  assert.ok(
    !fs.existsSync(
      path.join(dir, "src/content/services/kitchen-remodeling.json"),
    ),
  );

  // Builds, and the build is a demo.
  {
    const r = spawnSync("npm", ["run", "build"], {
      cwd: dir,
      encoding: "utf8",
    });
    assert.equal(r.status, 0, out(r).slice(-4000));
  }
  const client = path.join(dir, "dist", "client");
  const html = (/** @type {string} */ rel) =>
    fs.readFileSync(path.join(client, rel), "utf8");
  const pages = fs
    .readdirSync(client, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".html"));
  assert.ok(pages.length > 5, `only ${pages.length} pages built`);
  for (const page of pages)
    assert.match(
      html(page),
      /<meta name="robots" content="noindex, nofollow">/,
      page,
    );
  assert.match(html("robots.txt"), /^Disallow: \/$/m);
  assert.ok(!fs.existsSync(path.join(client, "sitemap-index.xml")));
  assert.match(
    html("_headers"),
    /^\/\*\n {2}X-Robots-Tag: noindex, nofollow$/m,
  );
  assert.match(html("llms.txt"), /not for indexing/);
  const home = html("index.html");
  assert.match(home, /Built for Brightline Electric by CL Creative/);
  assert.match(home, /see-how-it-works-demo\?demo=brightline-electric/);
  // The home page is the preset's composed page: its copy is the scaffold's,
  // so these check the facts it reads from site.ts and the collections.
  assert.match(
    home,
    /<title>Brightline Electric \| Licensed electricians in Austin<\/title>/,
  );
  assert.match(home, /Serving Austin and nearby/);
  assert.match(home, /4\.9 stars from 86 reviews/);
  assert.match(home, /They swapped our panel in a day/);
  assert.match(home, /From first call to final inspection/);
  assert.match(home, /Are you licensed and insured\?/);
  assert.match(home, /href="\/services\/panel-upgrades"/);
  assert.doesNotMatch(home, /href="\/blog"/);
  // The demo footer links the pages nothing else links to.
  assert.match(home, /href="\/leave-a-review"/);
  // Service areas: a hub and one page per region, never per town.
  assert.match(home, /href="\/service-areas"/);
  for (const page of [
    "service-areas/index.html",
    "service-areas/austin-metro/index.html",
    "service-areas/williamson-county/index.html",
  ])
    assert.ok(fs.existsSync(path.join(client, page)), `missing ${page}`);
  assert.ok(
    !fs.existsSync(path.join(client, "services/panel-upgrades/austin")),
    "per-town service pages must not be built",
  );
  assert.match(home, /href="\/get-your-discount"/);
  assert.match(home, /href="\/tools"/);
  // The local-service chrome: the fixture's look, the nav phone, the
  // site-wide estimate form (once per page), the mobile bar, the license.
  assert.match(home, /<html[^>]* data-look="rugged"/);
  assert.match(home, /class="nav_phone_wrap"/);
  assert.equal(home.match(/id="estimate-modal"/g)?.length, 1);
  assert.match(home, /class="mobile-bar_wrap"/);
  assert.match(home, /License TECL #12345/);
  assert.match(home, /class="cta-panel_wrap/);
  assert.match(home, /class="trust-badges_wrap/);
  assert.match(home, /reviews_card is-rated/);
  assert.match(home, /call-band_wrap is-photo-card/);
  // The scaffold's sections, and the two-step estimate form in the
  // site-wide modal.
  for (const cls of [
    "service-cards_wrap",
    "symptom-cards_wrap",
    "process-steps_wrap",
    "story-split_wrap",
    "comparison-table_wrap",
    "lead-form-section_wrap",
  ])
    assert.match(home, new RegExp(`class="[^"]*\\b${cls}\\b`), cls);
  assert.match(home, /class="lead-form_tiles"/);
  assert.match(home, /What do you need help with\?/);
  // The street map, from the fixture's cached boundaries (no network).
  assert.match(home, /class="service-map_wrap/);
  assert.match(home, /"name":"Round Rock","geometry":\{"type":"Polygon"/);
  assert.match(html("contact/index.html"), /Contact \| Brightline Electric/);
  // The other composed pages read the same collections.
  assert.match(html("about/index.html"), /They swapped our panel in a day/);
  assert.match(html("reviews/index.html"), /Reviews \| Brightline Electric/);
  assert.match(html("reviews/index.html"), /Dana M\./);
  // Service pages carry one estimate form (the site-wide one), not two.
  const service = html("services/panel-upgrades/index.html");
  assert.equal(service.match(/id="estimate-modal"/g)?.length, 1);
  // A service page shows every review tagged for that service (not a
  // capped few) and none of the others; a service with none tagged shows
  // all the site's reviews, including ones tagged for other services.
  const tagged = fixture.services[0].reviews;
  assert.ok(tagged.length > 6, "fixture must tag more than 6 reviews");
  for (const review of tagged)
    assert.ok(
      service.includes(review.text),
      `service page is missing its tagged review from ${review.name}`,
    );
  for (const review of fixture.reviews)
    assert.ok(
      !service.includes(review.text),
      `service page shows an untagged review from ${review.name}`,
    );
  const fallback = html("services/ev-chargers/index.html");
  for (const review of fixture.reviews)
    assert.ok(
      fallback.includes(review.text),
      `a service with no tags is missing the site review from ${review.name}`,
    );
  // A review tagged for a different service still shows (the demo bridge
  // tags a review that is also a home review with its service).
  for (const review of tagged)
    assert.ok(
      fallback.includes(review.text),
      "a service with no tags must still show reviews tagged for another service",
    );
  // Region pages: their own title, the region's towns on the map, the
  // services linking to their main pages, the form on the page; the
  // service page's town chips link to the region.
  const region = html("service-areas/williamson-county/index.html");
  assert.match(
    region,
    /<title>Electricians in Round Rock, Cedar Park and Pflugerville \| Brightline Electric/,
  );
  assert.match(region, /href="\/services\/panel-upgrades"/);
  assert.match(region, /200-amp panel upgrade/);
  assert.match(region, /class="[^"]*\bform_wrap\b/);
  assert.match(service, /href="\/service-areas\/williamson-county"/);
  assert.match(
    html("service-areas/index.html"),
    /href="\/service-areas\/austin-metro"/,
  );
  assert.ok(
    fs.existsSync(path.join(client, "services", "ev-chargers", "index.html")),
  );
  assert.ok(
    !fs.existsSync(path.join(client, "services", "kitchen-remodeling")),
  );
  // The audience page, installed once at demo.json's audiencePage.path, and
  // its nav button.
  assert.ok(
    fs.existsSync(path.join(client, "for-contractors", "index.html")),
    "missing the audience page (for-contractors/index.html)",
  );
  assert.match(home, /href="\/for-contractors"/);
  assert.match(html("for-contractors/index.html"), /Brightline Electric/);

  // Bad input names the field.
  {
    // Only 4 and 5 star reviews go on the site.
    const r = edited((d) => (d.reviews[0].rating = 3));
    assert.equal(r.status, 1, out(r));
    assert.match(r.stderr, /demo\.json › reviews\.0\.rating/);
  }
  {
    const r = edited((d) => d.services[0].highlights.pop());
    assert.equal(r.status, 1, out(r));
    assert.match(out(r), /panel-upgrades[\s\S]*highlights/);
  }
  {
    // Every town needs a region: none quietly dropped.
    const r = edited((d) => d.areas[1].towns.pop());
    assert.equal(r.status, 1, out(r));
    assert.match(out(r), /"Pflugerville" is in serviceAreas but in no region/);
  }
  {
    // A review must come from one of the region's own towns.
    const r = edited(
      (d) =>
        (d.areas[0].reviews = [
          { text: "Great.", name: "Sam", town: "Round Rock" },
        ]),
    );
    assert.equal(r.status, 1, out(r));
    assert.match(out(r), /"Round Rock" isn't one of this region's towns/);
  }

  console.log(
    "check-demo: ok (fixture demo written twice, pages kept, built, noindex, bad input named)",
  );
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.rmSync(defaults, { force: true });
}
