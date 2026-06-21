/**
 * Single source of truth for site identity.
 *
 * Everything that used to be hardcoded across BaseLayout, Head, Footer,
 * jsonld.ts, the scorecard API, the contact pages, and the llms endpoints now
 * lives here. When re-skinning this project for a new site, edit THIS file first.
 *
 * The Sanity project id/dataset and the site URL live in `site.shared.mjs` (a
 * dependency-free leaf module) so the config-load contexts that can't import
 * this file — `astro.config.mjs`, `sanity.config.ts`, `sanity.cli.ts`, the
 * `scripts/*.mjs` — can import the SAME values. No more hand-synced copies.
 * `wrangler.jsonc` is the lone exception (it's JSON); `scripts/check-config-sync.mjs`
 * guards it.
 */

import {
  SANITY_PROJECT_ID,
  SANITY_DATASET,
  SANITY_API_VERSION,
  SITE_URL as SHARED_SITE_URL,
} from "./site.shared.mjs";

export interface SocialLink {
  /** Accessible label / platform name. */
  label: string;
  /** Profile URL. Use "#" for a placeholder that should be hidden. */
  href: string;
  /** SVG viewBox for the inline icon. */
  viewBox: string;
  /** Raw inner SVG markup (paths), rendered via `set:html`. */
  paths: string;
}

export interface AreaServed {
  type: "City" | "AdministrativeArea";
  name: string;
}

export const SITE = {
  /** Brand / organization name. */
  name: "CL Creative",

  /** Absolute origin, no trailing slash. Canonical value: site.shared.mjs. */
  url: SHARED_SITE_URL,

  /** Primary contact email. */
  email: "casey@clcreative.co",

  /** Tagline appended to the default page <title> and the OG image alt text. */
  tagline: "Web Design and Development",

  /** Fallback meta description for pages that don't pass their own. */
  defaultDescription:
    "Custom Webflow design and development for growth-stage businesses.",

  /** Social handle (@-form) for the Twitter/X card meta tags. */
  xHandle: "@caseylewis33",

  /** One-line description used by JSON-LD and the llms.txt index. */
  summary:
    "Webflow web design, development, and SEO for growth-stage businesses ready to scale — strategic positioning, conversion-focused websites, content, and ongoing marketing partnership.",

  /** Longer LocalBusiness description (sitewide JSON-LD node). */
  localBusinessDescription:
    "Strategy-first Webflow web design and development for growth-stage businesses across Ellis County and the Dallas-Fort Worth Metroplex.",

  /** Phone in the three formats the markup needs. */
  phone: {
    /** Human-readable, e.g. for visible text. */
    display: "(706) 338-6155",
    /** E.164 for schema.org `telephone`. */
    e164: "+1-706-338-6155",
    /** Digits only, for `tel:` hrefs. */
    tel: "7063386155",
  },

  /** Visible business hours (footer). */
  hours: "M–F, 9 AM–5 PM CST",

  /** Founder / person name (schema.org `founder`, `author` fallback). */
  founder: "Casey Lewis",

  /** Home-based — no street line by design. */
  address: {
    locality: "Midlothian",
    region: "TX",
    country: "US",
  },

  /** schema.org `priceRange`. */
  priceRange: "$$$",

  /** Site-relative paths for Open Graph image + logo (files live in public/images/). */
  ogImagePath: "/images/cl-creative-open-graph.png",
  logoPath: "/images/favicon.png",
  appleTouchIconPath: "/images/webclip.png",

  /**
   * Third-party integration account ids — referenced by Head.astro (and the GTM
   * <noscript> in BaseLayout.astro). These are plain account identifiers, not
   * secrets. To remove a technology, delete its field here and its use in those
   * files; to swap accounts when forking, change the id here only.
   */
  integrations: {
    /** Google Tag Manager container id. */
    gtmId: "GTM-W4L3ZND",
    /** MailerLite Universal account id. */
    mailerLiteAccount: "1127478",
    /** Usercentrics CMP settings id. */
    usercentricsId: "ZZlHoAlNP8xz0A",
    /** Usercentrics custom-translations CDN base URL. */
    usercentricsTranslationsUrl:
      "https://termageddon.ams3.cdn.digitaloceanspaces.com/translations/",
    /**
     * HoneyBook placement id — used by the HoneyBookEmbed components (placement
     * container class, tracking pixel, and loader script `pid`). To remove
     * HoneyBook when forking, delete this and the two components that read it.
     */
    honeybookPlacementId: "626ab64f7810ff0008f579ac",
  },

  /**
   * Brand color as a literal hex — ONLY for render contexts that cannot read
   * CSS custom properties: HTML email (clients strip <style>/vars) and
   * <meta name="theme-color"> (takes a literal string). This is a MIRROR, not
   * the source of truth: the canonical value is `--color-brand-500` in
   * src/styles/variables/colors.css — keep the two in sync when re-skinning.
   * Anything rendered through CSS (incl. GSAP via getComputedStyle) reads the
   * CSS variable directly and must NOT use this.
   */
  brand: {
    color: "#f35423",
  },

  /** Sanity project — canonical values live in site.shared.mjs. */
  sanity: {
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
  },

  /**
   * Social profiles rendered in the footer. Items with `href: "#"` are
   * placeholders and filtered out at render time.
   */
  social: [
    {
      label: "Facebook",
      href: "https://www.facebook.com/clcreativecompany",
      viewBox: "0 0 64 64",
      paths: `<path fill="currentColor" d="M24.92437,62V36H16V24h8.92437v-8.38004C24.92437,6.49153,30.70333,2,38.84651,2 c3.90067,0,7.25309,0.29041,8.23008,0.42022v9.53975l-5.64773,0.00257C37.00014,11.96253,36,14.06699,36,17.15515V24h12l-4,12h-8v26 H24.92437z" />`,
    },
    {
      label: "Instagram",
      href: "#",
      viewBox: "0 0 56 56",
      paths: `<path d="M55.84,16.46c-.05-2.33-.49-4.63-1.3-6.8-1.46-3.76-4.43-6.74-8.2-8.19-2.17-.81-4.47-1.25-6.8-1.3-2.98-.14-3.94-.17-11.54-.17s-8.55.03-11.54.17c-2.32.04-4.62.48-6.8,1.3C5.9,2.92,2.93,5.9,1.47,9.66.66,11.84.22,14.14.17,16.46c-.13,2.98-.17,3.94-.17,11.54s.04,8.56.17,11.54c.05,2.33.49,4.63,1.3,6.8,1.46,3.76,4.43,6.74,8.19,8.19,2.18.82,4.48,1.26,6.8,1.3,2.99.14,3.94.17,11.54.17s8.56-.03,11.55-.17c2.32-.04,4.62-.48,6.8-1.3,3.76-1.45,6.73-4.43,8.19-8.19.81-2.17,1.25-4.47,1.3-6.8.13-2.98.16-3.94.16-11.54s-.03-8.56-.16-11.54ZM28,42.38c-7.94,0-14.37-6.44-14.37-14.38s6.43-14.38,14.37-14.38c3.97,0,7.56,1.61,10.17,4.21,2.6,2.61,4.21,6.2,4.21,10.17,0,7.94-6.44,14.38-14.38,14.38ZM42.95,16.41c-1.86,0-3.36-1.5-3.36-3.36s1.5-3.36,3.36-3.36,3.36,1.51,3.36,3.36-1.5,3.36-3.36,3.36Z" fill="currentColor" /><path d="M37.34,28c0,5.15-4.18,9.33-9.33,9.33h-.01c-5.15,0-9.33-4.18-9.33-9.33s4.18-9.33,9.33-9.33,9.34,4.18,9.34,9.33Z" fill="currentColor" />`,
    },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/jclewis33/",
      viewBox: "0 0 46 46",
      paths: `<path d="M11 5.5C11 8.6 8.6 11 5.5 11C2.4 11 0 8.5 0 5.5C0 2.5 2.5 0 5.5 0C8.5 0 11 2.5 11 5.5Z" fill="currentColor" /><path d="M10.2998 15.1992H0.799805V45.6992H10.2998V15.1992Z" fill="currentColor" /><path d="M45.8002 29V45.7H36.3002V30.9C36.3002 27.4 36.2002 22.8 31.4002 22.8C26.6002 22.8 25.7002 26.7 25.7002 30.6V45.7H16.2002V15.2H25.3002V19.4H25.4002C26.7002 17 29.8002 14.5 34.4002 14.5C44.0002 14.5 45.8002 20.8 45.8002 29Z" fill="currentColor" />`,
    },
    {
      label: "YouTube",
      href: "https://www.youtube.com/@clcreativedallas",
      viewBox: "0 0 48 48",
      paths: `<path fill="currentColor" d="M47.5,14.4c0,0-0.5-3.3-1.9-4.8c-1.8-1.9-3.9-1.9-4.8-2C34.1,7.1,24,7.1,24,7.1h0c0,0-10.1,0-16.8,0.5 c-0.9,0.1-3,0.1-4.8,2c-1.4,1.5-1.9,4.8-1.9,4.8S0,18.3,0,22.2v3.6c0,3.9,0.5,7.8,0.5,7.8s0.5,3.3,1.9,4.8c1.8,1.9,4.2,1.9,5.3,2.1 c3.8,0.4,16.3,0.5,16.3,0.5s10.1,0,16.8-0.5c0.9-0.1,3-0.1,4.8-2c1.4-1.5,1.9-4.8,1.9-4.8s0.5-3.9,0.5-7.8v-3.6 C48,18.3,47.5,14.4,47.5,14.4z M19,30.2l0-13.5l13,6.8L19,30.2z" />`,
    },
    {
      label: "X",
      href: "https://twitter.com/caseylewis33",
      viewBox: "0 0 300 301",
      paths: `<path d="M178.57 127.15L290.27 0H263.81L166.78 110.38L89.34 0H0L117.13 166.93L0 300.25H26.46L128.86 183.66L210.66 300.25H300M36.01 19.54H76.66L263.79 281.67H223.13" fill="currentColor" />`,
    },
  ] satisfies SocialLink[],

  /**
   * Absolute profile URLs for schema.org `sameAs`. Kept explicit (rather than
   * derived from `social`) because the LocalBusiness node also lists the
   * company LinkedIn, which isn't in the footer set.
   */
  sameAs: [
    "https://www.linkedin.com/in/jclewis33/",
    "https://www.linkedin.com/company/cl-creative-agency",
    "https://www.facebook.com/clcreativecompany",
    "https://twitter.com/caseylewis33",
    "https://www.youtube.com/@clcreativedallas",
  ],

  /**
   * Sitewide service area (mirrors the Google Business Profile city list).
   * Per-page Service schemas keep their own tighter `areaServed`.
   */
  areaServed: [
    { type: "City", name: "Midlothian" },
    { type: "City", name: "Waxahachie" },
    { type: "City", name: "Ovilla" },
    { type: "City", name: "Red Oak" },
    { type: "City", name: "Cedar Hill" },
    { type: "City", name: "Dallas" },
    { type: "City", name: "Plano" },
    { type: "City", name: "Richardson" },
    { type: "City", name: "Addison" },
    { type: "City", name: "Denton" },
    { type: "City", name: "Grapevine" },
    { type: "City", name: "Arlington" },
    { type: "City", name: "Fort Worth" },
    { type: "City", name: "Tyler" },
    { type: "AdministrativeArea", name: "Ellis County" },
    { type: "AdministrativeArea", name: "Dallas-Fort Worth Metroplex" },
  ] satisfies AreaServed[],
} as const;

/**
 * Convenience named exports — the canonical home for these values lives here.
 * Consumed by the llms endpoints and `portable-text.ts`.
 */
export const SITE_URL = SITE.url;
export const SITE_NAME = SITE.name;
export const SITE_SUMMARY = SITE.summary;
