/**
 * Looks — the site's visual personality, picked by `SITE.look`.
 *
 * A look is a set of token overrides (src/styles/variables/looks.css, keyed
 * on `<html data-look="…">`, which BaseLayout sets): fonts, heading case and
 * tracking, corner radii, button shape, and the neutral swatches (paper and
 * ink). Components never change; they read the same tokens, so every section
 * follows the look. The brand colour stays the client's own
 * (`--color-brand-500`), whatever the look.
 *
 *   studio   the starter's own look — grotesk display, mono labels (agency)
 *   fresh    white paper, warm brown ink, condensed uppercase headings,
 *            squared-off buttons — lawn, pest, cleaning, pool (Hatch)
 *   warm     cream paper, navy ink, sentence-case Montserrat, very round
 *            corners, pill buttons — HVAC, insulation, remodeling (Thermal Plan)
 *   rugged   cool paper, deep navy ink, heavy Archivo uppercase, tight
 *            corners — electrical, roofing, plumbing, commercial (ACE)
 *   natural  stone paper, deep green-brown ink, Fraunces serif headings —
 *            hardscape, landscaping, decks, outdoor living
 *   estate   warm paper, light Fraunces headings, squared buttons, a dark
 *            nav with the name beside the logo — high-end finishes for
 *            homes and commercial work (decorative concrete, custom builds)
 *
 * `fonts` lists the Astro Fonts API variables (astro.config.mjs) the look
 * uses; Head.astro preloads only those, so the other looks cost nothing.
 * `nav` is the navbar's theme (BaseLayout): home-service sites read best
 * with the customer's logo on a light bar.
 */

type LookFont =
  | "--font-bdo-grotesk"
  | "--font-inter"
  | "--font-ibm-plex-mono"
  | "--font-barlow-condensed"
  | "--font-montserrat"
  | "--font-archivo"
  | "--font-fraunces";

type Look = {
  label: string;
  fonts: readonly LookFont[];
  nav: "light" | "dark";
  /** The business name set beside the logo in the nav. @default false */
  wordmark?: boolean;
  /** "Call or text" and the number in the desktop nav (the utility bar carries it otherwise). @default true */
  navPhone?: boolean;
  /**
   * `full` — contact list, social, every link column, the towns as a
   * column; `brief` — the logo and a line, the service menus, a Contact
   * column, the towns as one "Proudly serving" line. @default 'full'
   */
  footer?: "full" | "brief";
  /**
   * The page templates: `standard`, or `estate` — the service pages
   * (ServicePageEstate: a dark split hero, before-and-after, options, a
   * gallery, a plain quote band) and /projects (a dark header with the
   * category pills, ProjectsEstate). @default 'standard'
   */
  pages?: "standard" | "estate";
};

export const LOOKS = {
  studio: {
    label: "Studio",
    fonts: ["--font-bdo-grotesk", "--font-inter", "--font-ibm-plex-mono"],
    nav: "dark",
  },
  fresh: {
    label: "Fresh & friendly",
    fonts: ["--font-barlow-condensed", "--font-inter"],
    nav: "light",
  },
  warm: {
    label: "Warm & premium",
    fonts: ["--font-montserrat", "--font-inter"],
    nav: "dark",
  },
  rugged: {
    label: "Bold & rugged",
    fonts: ["--font-archivo", "--font-inter"],
    nav: "light",
  },
  natural: {
    label: "Outdoor & natural",
    fonts: ["--font-fraunces", "--font-inter"],
    nav: "light",
  },
  estate: {
    label: "Estate & refined",
    fonts: ["--font-fraunces", "--font-inter"],
    nav: "dark",
    wordmark: true,
    navPhone: false,
    footer: "brief",
    pages: "estate",
  },
} as const satisfies Record<string, Look>;

export type SiteLook = keyof typeof LOOKS;

/** The look names, for validation (demo.json, setup). */
export const LOOK_NAMES = Object.keys(LOOKS) as SiteLook[];

/** A look's nav chrome: the name beside the logo, and the nav's phone. */
export function lookChrome(name: SiteLook): {
  wordmark: boolean;
  navPhone: boolean;
  footer: "full" | "brief";
  pages: "standard" | "estate";
} {
  const look: Look = LOOKS[name];
  return {
    wordmark: look.wordmark ?? false,
    navPhone: look.navPhone ?? true,
    footer: look.footer ?? "full",
    pages: look.pages ?? "standard",
  };
}
