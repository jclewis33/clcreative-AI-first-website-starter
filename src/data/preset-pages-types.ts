/**
 * Types for src/data/preset-pages.ts, which `npm run demo` regenerates —
 * kept here so the generated file stays data only.
 */
/** The /projects page's own words (the estate pages); null = the starter's page. */
export interface ProjectsPageCopy {
  eyebrow?: string;
  heading: string;
  text?: string;
  /** The projects in this order (their file names); the rest follow, newest first. */
  order?: string[];
  /** The closing band: its heading and line; the main button opens the estimate form. */
  cta: {
    heading: string;
    text?: string;
    label?: string;
    secondaryCta?: { label: string; href: string };
  };
  /**
   * Each project page's closing band, by the project's category
   * ("commercial": "Have a floor like this on an upcoming job?"). The
   * buttons link; without `cta` the main one opens the estimate form.
   */
  projectCta?: Record<
    string,
    {
      heading: string;
      text?: string;
      cta?: { label: string; href: string };
      secondaryCta?: { label: string; href: string };
    }
  >;
}
