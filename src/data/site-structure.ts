/**
 * Site structure — the SINGLE source of truth for every internal page, the
 * navigation menu, the footer link groups, and the announcement banner.
 *
 * Before this file, the same pages were listed three independent times: the
 * navbar `navItems` array, the footer link markup, and `site-pages.ts` (llms
 * index). They drifted. Now:
 *   - `PAGES`        — every internal page, defined once (path + per-context labels + desc)
 *   - `NAV_MENU`     — nav order/grouping, referencing pages by path
 *   - `FOOTER_GROUPS`/`FOOTER_LOCATIONS` — footer order/grouping, by path
 *   - `BANNER`       — the announcement bar (sitewide default + per-page overrides)
 *
 * The llms endpoints consume `PAGES` (via the `*_PAGES` group exports).
 *
 * Labels differ per surface on purpose (e.g. nav "Web Development" vs footer
 * "Webflow Development"), so each page can carry `navLabel` / `footerLabel`
 * overrides; both fall back to `title`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  HOW TO MAKE COMMON CHANGES (everything below is just data — no markup edits)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  ── Add a brand-new page ────────────────────────────────────────────────
 *   1. Add one entry to `PAGES` (below): { path, title, desc, group }.
 *      - `group` controls which llms.txt section it lands in
 *        ("main" | "service" | "location" | "index" | "optional").
 *      - Add `navLabel` / `footerLabel` ONLY if the menu text should differ
 *        from `title`.
 *   2. To show it in the nav: add its `path` to `NAV_MENU` (as a top-level
 *      `{ path }` or inside a dropdown's `children: [...]`).
 *   3. To show it in the footer: add its `path` to a `FOOTER_GROUPS` group's
 *      `links: [...]`.
 *   (A page can be in PAGES without appearing in the nav or footer — it will
 *    still show up in llms.txt. The two are independent.)
 *
 *  ── Add a link to the NAVBAR ────────────────────────────────────────────
 *   The page must exist in `PAGES` first (so its label resolves). Then add its
 *   path to `NAV_MENU`:
 *     • simple top-level link → `{ path: "/new-page" }`
 *     • inside a dropdown      → add the path to that item's `children` array
 *   The label shown = that page's `navLabel` (or `title` if no navLabel).
 *   Both the desktop and mobile menus update automatically.
 *
 *  ── Add a link to the FOOTER ────────────────────────────────────────────
 *   The page must exist in `PAGES` first. Then add its path to the relevant
 *   group in `FOOTER_GROUPS` (Services / Resources / Company / Industries):
 *     • normal link              → just the path string, e.g. "/new-page"
 *     • custom label or anchor   → an object, e.g.
 *         { path: "/how-we-work", label: "Pricing", href: "/how-we-work#investment" }
 *   The label shown = that page's `footerLabel` (or `title`), unless overridden.
 *   Add a whole new column by adding a new `{ title, links: [...] }` group.
 *
 *  ── Add a location to the footer "Locations Served" dropdown ─────────────
 *   Add the page to `PAGES` (group: "location") with a short `footerLabel`
 *   (e.g. "Dallas"), then add its path to `FOOTER_LOCATIONS`.
 *
 *  ── Change the announcement banner ──────────────────────────────────────
 *   Edit `BANNER` at the bottom of this file: `default` is sitewide; add a path
 *   to `overrides` to change or hide it on one page (`null` = hide there).
 *
 *  ── Rename a label or change a URL ──────────────────────────────────────
 *   Edit the single `PAGES` entry — it propagates to nav, footer, and llms.txt.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** llms.txt section a page belongs to (also its broad category). */
export type PageGroup = "main" | "service" | "location" | "index" | "optional";

export interface SitePage {
  /** Site-relative path, no trailing slash. Acts as the page's id. */
  path: string;
  /** Canonical title — used by llms.txt and as the default label everywhere. */
  title: string;
  /** One-line description (page meta description) for the llms index. */
  desc: string;
  /** Nav label override (falls back to `title`). */
  navLabel?: string;
  /** Footer label override (falls back to `title`). */
  footerLabel?: string;
  /** llms.txt section / broad category. */
  group: PageGroup;
}

/**
 * Every internal page, in the order each group should render in llms.txt.
 * Keep group blocks contiguous (main → service → location → index → optional).
 */
export const PAGES: SitePage[] = [
  // ── Main marketing pages ─────────────────────────────────────────────────
  {
    path: "/",
    title: "Home",
    desc: "Growth-stage web design, development, and SEO for businesses ready to scale.",
    group: "main",
  },
  {
    path: "/about",
    title: "About",
    desc: "Meet the team behind CL Creative. We build conversion-focused websites for growth-stage businesses using strategic positioning, Webflow, and SEO.",
    group: "main",
  },
  {
    path: "/how-we-work",
    title: "How We Work",
    desc: "A complete marketing foundation — strategy, messaging, website, content, and tools — not just a website.",
    group: "main",
  },
  {
    path: "/why-webflow",
    title: "Why Webflow",
    desc: "After 100+ projects, we've built on every platform that matters. Webflow is the one we keep coming back to.",
    group: "main",
  },
  {
    path: "/m2m-framework",
    title: "The M2M Framework",
    navLabel: "M2M Framework",
    footerLabel: "M2M Framework",
    desc: "Our research-first process for turning unclear positioning into a website that attracts, qualifies, and converts the clients you actually want.",
    group: "main",
  },
  {
    path: "/marketing-scorecard",
    title: "Marketing Foundation Scorecard",
    navLabel: "Marketing Health Check",
    footerLabel: "Marketing Health Check",
    desc: "How solid is your marketing foundation? Score yourself across 7 areas in 5 minutes. Free self-assessment for growth-stage business owners.",
    group: "main",
  },
  {
    path: "/contact",
    title: "Contact",
    desc: "Get in touch with CL Creative. Book a free strategy meeting to discuss your next web design, development, or SEO project.",
    group: "main",
  },
  {
    path: "/book-a-call",
    title: "Strategy Call",
    footerLabel: "Free Strategy Call",
    desc: "Book a free strategy meeting. We'll dig into how you're currently marketing your business and how you can improve.",
    group: "main",
  },
  // Industry pages (live in the llms "Main Pages" section; nav/footer show them
  // under an "Industries" group with short labels).
  {
    path: "/web-design/recruiting-firm",
    title: "Web Design for Recruiting Firms",
    navLabel: "Staffing Firms",
    footerLabel: "Staffing Firms",
    desc: "Web design for recruiting and staffing firms that brings in clients and candidates. Built by a team that's worked a desk in recruiting.",
    group: "main",
  },
  {
    path: "/web-design/coaches",
    title: "Web Design for Coaches",
    navLabel: "Coaches",
    footerLabel: "Coaches",
    desc: "Web design for business and executive coaches. Clear, client-focused sites that build trust and turn visitors into booked calls.",
    group: "main",
  },
  {
    path: "/web-design/home-services",
    title: "Web Design for Home Services",
    navLabel: "Home Services",
    footerLabel: "Home Services",
    desc: "Web design for home services companies, built mobile-first to turn local searches into booked jobs. Clear, fast, click-to-call sites.",
    group: "main",
  },
  {
    path: "/web-design/churches",
    title: "Web Design for Churches",
    navLabel: "Churches",
    footerLabel: "Churches",
    desc: "Web design for churches and ministries, built by a former pastor. Clear, welcoming sites that answer a guest's real questions and help them take a next step.",
    group: "main",
  },

  // ── Services ─────────────────────────────────────────────────────────────
  {
    path: "/services/web-design",
    title: "Web Design",
    desc: "Web design for growth-stage companies.",
    group: "service",
  },
  {
    path: "/services/webflow-development",
    title: "Webflow Development",
    navLabel: "Web Development",
    desc: "Webflow development for growth-stage companies.",
    group: "service",
  },
  {
    path: "/services/seo",
    title: "SEO & AEO Services",
    navLabel: "SEO & AEO",
    footerLabel: "SEO & AEO",
    desc: "Strategy-led SEO and AI Optimization built on the M2M Framework. Get cited by AI, and found by your next customer. Monthly retainers from $1,500.",
    group: "service",
  },
  {
    path: "/services/marketing-partner",
    title: "Marketing Partner",
    desc: "Your designer built the site, then disappeared. We stay. We run marketing with you so your website grows your business.",
    group: "service",
  },
  {
    path: "/services/webflow-website-support",
    title: "Webflow Website Support",
    navLabel: "Website Support",
    footerLabel: "Website Support",
    desc: "Get dedicated design and development support from a Webflow Professional Partner, without the overhead of a full-time hire.",
    group: "service",
  },
  {
    path: "/services/m2m-messaging-sprint",
    title: "M2M Messaging Sprint",
    desc: "Lock down who you're talking to and what to say. A focused sprint to fix your messaging across your website, sales calls, and marketing.",
    group: "service",
  },

  // ── Location pages ───────────────────────────────────────────────────────
  {
    path: "/web-design-dallas",
    title: "Web Design in Dallas, TX",
    footerLabel: "Dallas",
    desc: "Web design in Dallas, TX, trusted by companies from Highland Park to Downtown. Clear Webflow sites that bring in the right customers.",
    group: "location",
  },
  {
    path: "/web-design-waxahachie",
    title: "Web Design in Waxahachie, TX",
    footerLabel: "Waxahachie",
    desc: "Web design in Waxahachie, TX from a website designer in your own Chamber of Commerce. Clear sites that bring in the right customers.",
    group: "location",
  },
  {
    path: "/web-design-midlothian",
    title: "Web Design in Midlothian, TX",
    footerLabel: "Midlothian",
    desc: "Web design in Midlothian, TX that brings in the right customers. We build clear Webflow sites that turn visitors into bookings.",
    group: "location",
  },

  // ── Collection index / landing pages ─────────────────────────────────────
  {
    path: "/blog",
    title: "Blog",
    desc: "A web design, development, SEO, and business blog.",
    group: "index",
  },
  {
    path: "/case-studies",
    title: "Case Studies",
    desc: "Explore our portfolio of web design, development, migration, messaging, and SEO projects.",
    group: "index",
  },
  {
    path: "/glossary",
    title: "Glossary",
    desc: "A comprehensive glossary of web design, development, and SEO terms to help you grow your knowledge.",
    group: "index",
  },

  // ── Legal / policy (llms "Optional" + footer bottom bar) ─────────────────
  {
    path: "/privacy-policy",
    title: "Privacy Policy",
    desc: "Privacy Policy for CL Creative.",
    group: "optional",
  },
  {
    path: "/terms-and-conditions",
    title: "Terms and Conditions",
    footerLabel: "Terms & Conditions",
    desc: "Terms and Conditions for CL Creative.",
    group: "optional",
  },
  {
    path: "/cookie-policy",
    title: "Cookie Policy",
    desc: "Cookie Policy for CL Creative.",
    group: "optional",
  },
  {
    path: "/disclaimer",
    title: "Disclaimer",
    desc: "Disclaimer for CL Creative.",
    group: "optional",
  },
];

const PAGE_BY_PATH = new Map(PAGES.map((p) => [p.path, p]));

/** Look up a page by path. */
export function getPage(path: string): SitePage | undefined {
  return PAGE_BY_PATH.get(path);
}

/** Resolve a page's nav label (navLabel → title). Falls back to the raw path. */
export function navLabel(path: string): string {
  const p = getPage(path);
  return p?.navLabel ?? p?.title ?? path;
}

/** Resolve a page's footer label (footerLabel → title). Nav and footer are
 *  independent surfaces, so the footer does NOT fall back to navLabel. */
export function footerLabel(path: string): string {
  const p = getPage(path);
  return p?.footerLabel ?? p?.title ?? path;
}

/** All pages in a group, in PAGES order. */
export function pagesInGroup(group: PageGroup): SitePage[] {
  return PAGES.filter((p) => p.group === group);
}

// ── Group exports consumed by the llms.txt endpoints ────────────────────────
/** Back-compat shape used by the llms endpoints (path + title + desc). */
export type StaticPage = Pick<SitePage, "path" | "title" | "desc">;
export const MAIN_PAGES = pagesInGroup("main");
export const SERVICE_PAGES = pagesInGroup("service");
export const LOCATION_PAGES = pagesInGroup("location");
export const INDEX_PAGES = pagesInGroup("index");
export const OPTIONAL_PAGES = pagesInGroup("optional");

// ── Navigation menu ─────────────────────────────────────────────────────────
/** A simple top-level link (label resolved from the page's navLabel). */
export interface NavMenuLink {
  path: string;
}
/** A dropdown — `children` are page paths, in display order. */
export interface NavMenuDropdown {
  label: string;
  children: string[];
}
export type NavMenuItem = NavMenuLink | NavMenuDropdown;

/**
 * NAVBAR — order and grouping of the navbar (desktop + mobile share this).
 * Each entry is a simple link `{ path }` or a dropdown `{ label, children: [paths] }`.
 * `children` reference pages by path; labels resolve from each page's navLabel.
 * See "Add a link to the NAVBAR" in the header for the recipe.
 */
export const NAV_MENU: NavMenuItem[] = [
  { path: "/about" },
  { path: "/how-we-work" },
  {
    label: "Services",
    children: [
      "/services/m2m-messaging-sprint",
      "/services/webflow-development",
      "/services/web-design",
      "/services/seo",
      "/services/webflow-website-support",
      "/services/marketing-partner",
    ],
  },
  {
    label: "Industries",
    children: [
      "/web-design/churches",
      "/web-design/coaches",
      "/web-design/home-services",
      "/web-design/recruiting-firm",
    ],
  },
  {
    label: "Resources",
    children: [
      "/blog",
      "/why-webflow",
      "/m2m-framework",
      "/marketing-scorecard",
    ],
  },
  { path: "/case-studies" },
];

// ── Footer link groups ──────────────────────────────────────────────────────
/**
 * A footer link. A bare path uses the page's footer label + path as href.
 * An object overrides the label and/or href (e.g. an anchored link).
 */
export type FooterLink = string | { path: string; label?: string; href?: string };
export interface FooterGroup {
  title: string;
  links: FooterLink[];
  /** When set, renders a "Locations Served" accordion (page paths) after the
   *  group's links. Used by the Company column. */
  locations?: string[];
}

/** Footer "Locations Served" dropdown — page paths in display order. */
export const FOOTER_LOCATIONS: string[] = [
  "/web-design-midlothian",
  "/web-design-waxahachie",
  "/web-design-dallas",
];

/**
 * FOOTER — the footer link columns (one `{ title, links }` per column).
 * `links` are page paths (or `{ path, label?, href? }` for a custom label/anchor).
 * The Company group's `locations` renders the "Locations Served" dropdown.
 * See "Add a link to the FOOTER" in the header for the recipe.
 */
export const FOOTER_GROUPS: FooterGroup[] = [
  {
    title: "Services",
    links: [
      "/services/m2m-messaging-sprint",
      "/services/web-design",
      "/services/webflow-development",
      "/services/seo",
      "/services/webflow-website-support",
      "/services/marketing-partner",
    ],
  },
  {
    title: "Resources",
    links: [
      "/blog",
      "/case-studies",
      "/glossary",
      "/why-webflow",
      "/m2m-framework",
      "/marketing-scorecard",
    ],
  },
  {
    title: "Company",
    links: [
      "/about",
      { path: "/how-we-work", label: "Pricing", href: "/how-we-work#investment" },
      "/contact",
      "/book-a-call",
    ],
    locations: FOOTER_LOCATIONS,
  },
  {
    title: "Industries",
    links: [
      "/web-design/churches",
      "/web-design/coaches",
      "/web-design/home-services",
      "/web-design/recruiting-firm",
    ],
  },
];

/** Resolve a FooterLink to a concrete { label, href } pair. */
export function resolveFooterLink(link: FooterLink): { label: string; href: string } {
  if (typeof link === "string") {
    return { label: footerLabel(link), href: link };
  }
  return { label: link.label ?? footerLabel(link.path), href: link.href ?? link.path };
}

// ── Announcement banner ─────────────────────────────────────────────────────
export interface BannerContent {
  text: string;
  href?: string;
}

/**
 * The announcement bar above the nav. Edit here — BaseLayout resolves it per
 * request via `resolveBanner(pathname)`.
 *   - `default` — shown sitewide. Set `text: ""` (or remove default) to hide everywhere.
 *   - `overrides` — per-path: `null` hides the banner on that page; an object replaces it.
 */
export const BANNER: {
  default: BannerContent | null;
  overrides: Record<string, BannerContent | null>;
} = {
  default: {
    text: "How healthy is your marketing? Take the free scorecard",
    href: "/marketing-scorecard",
  },
  overrides: {
    // "/marketing-scorecard": null,                       // hide on the page it points to
    // "/services/seo": { text: "...", href: "/contact" }, // custom banner for one page
  },
};

/** Resolve the banner for a given pathname (override → default). */
export function resolveBanner(pathname: string): BannerContent | null {
  const p = pathname.replace(/\/+$/, "") || "/";
  return p in BANNER.overrides ? BANNER.overrides[p] : BANNER.default;
}
