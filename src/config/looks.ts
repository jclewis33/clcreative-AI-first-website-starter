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
} as const satisfies Record<string, Look>;

export type SiteLook = keyof typeof LOOKS;

/** The look names, for validation (demo.json, setup). */
export const LOOK_NAMES = Object.keys(LOOKS) as SiteLook[];
