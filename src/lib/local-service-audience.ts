import type { ImageMetadata } from "astro";
import type { ServiceIconName } from "@/components/ui/ServiceIcon.astro";

/**
 * The data an audience page is made of — LocalServiceAudience
 * (src/components/templates/LocalServiceAudience.astro). An audience page
 * speaks to a second kind of buyer the home page can't serve in passing:
 * general contractors and property managers for a trade that mostly sells
 * to homeowners, say. It answers what they ask before they bid you in —
 * scopes, equipment, past projects, paperwork — and ends in their own form.
 *
 * Two producers: the dev sample (src/data/local-service-sample.ts) and a
 * prospect demo, whose src/data/audience.ts `npm run demo` generates from
 * demo.json's `audience`. Optional sections drop out when absent.
 */

type AudienceImage = ImageMetadata | string;

export interface LocalServiceAudienceData {
  /** Page `<title>` and meta description. */
  title: string;
  description: string;

  /** The page's own URL path, e.g. "/commercial-concrete-coatings". */
  path: string;

  /** Its name in the nav, the footer and the breadcrumbs ("Commercial"). */
  navLabel: string;

  hero: {
    eyebrow?: string;
    /** HTML allowed: `<strong>` marks the accent words. */
    heading: string;
    text?: string;
    image: AudienceImage;
    imageAlt: string;
    /** The main button, which jumps to the form. @default 'Send a bid invitation' */
    ctaLabel?: string;
  };

  /** Quick facts for the reader in a hurry (spec sections, insurance, area). 3 to 5. */
  facts?: { value: string; label: string }[];

  /** What they cover for this audience, beside one photo (WorkScope). */
  scope?: {
    eyebrow?: string;
    heading: string;
    intro?: string;
    items: { title: string; text: string; icon?: ServiceIconName }[];
    image: AudienceImage;
    imageAlt: string;
  };

  /** Equipment, crew, capacity: icon rows beside one big photo (WhyChooseUs). */
  capability?: {
    eyebrow?: string;
    heading: string;
    intro?: string;
    items: { title: string; text: string; icon?: ServiceIconName }[];
    image: AudienceImage;
    imageAlt: string;
  };

  /**
   * Their projects in one category (src/config/projects.ts), as cards
   * linking to /projects/<slug>. Absent or none in that category = no section.
   */
  projects?: {
    eyebrow?: string;
    heading?: string;
    intro?: string;
    category: string;
  };

  /** The paperwork they keep ready (prequal): one checklist. */
  documents?: {
    eyebrow?: string;
    heading: string;
    text?: string;
    items: string[];
  };

  /** What happens after they reach out — only steps the business confirms (ExpectTimeline). */
  expect?: {
    eyebrow?: string;
    heading: string;
    text?: string;
    steps: { label: string; title: string; text: string }[];
  };

  /** The page's own form (bid invitations, say). */
  form: {
    eyebrow?: string;
    heading: string;
    text?: string;
    /** The choices for "Scope" (the project-type select). */
    scopeOptions?: { label: string; value: string }[];
  };

  callBand: {
    heading: string;
    text?: string;
  };
}
