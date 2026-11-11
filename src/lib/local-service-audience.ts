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
    /** A second, outline button ("Capabilities statement (PDF)" → "#docs"); `icon: "download"` for a file. */
    secondaryCta?: { label: string; href: string; icon?: "download" };
  };

  /** Quick facts for the reader in a hurry, label over value ("Insurance" / "Fully insured · COI on request"). 3 to 5. */
  facts?: { value: string; label: string }[];

  /** What they cover for this audience: ruled rows beside the heading and a photo (RuledList). */
  scope?: {
    eyebrow?: string;
    heading: string;
    intro?: string;
    items: { title: string; text: string; icon?: ServiceIconName }[];
    image: AudienceImage;
    imageAlt: string;
  };

  /** Equipment, crew, capacity: a photo beside ruled cards, on dark (FeatureSpotlight). */
  capability?: {
    eyebrow?: string;
    heading: string;
    intro?: string;
    items: { title: string; text: string; icon?: ServiceIconName }[];
    image: AudienceImage;
    imageAlt: string;
  };

  /**
   * Their projects in one category (src/config/projects.ts) as case study
   * cards, then more photos and a client quote (CaseStudyCards). Absent or
   * none in that category = no section.
   */
  projects?: {
    eyebrow?: string;
    heading?: string;
    category: string;
    /** Which projects get a card, in order, with their spec rows. */
    cards?: { slug: string; specs: { label: string; value: string }[] }[];
    extras?: {
      image: AudienceImage;
      alt: string;
      caption: string;
      href?: string;
    }[];
    quote?: { text: string; name: string; meta?: string };
  };

  /** The paperwork they keep ready (prequal): ruled rows of what and why, with buttons (RuledList). */
  documents?: {
    eyebrow?: string;
    heading: string;
    text?: string;
    items: { title: string; text: string }[];
    cta?: { label: string; href: string };
    secondaryCta?: { label: string; href: string };
  };

  /** The page's own form: a bid invitation (LeadForm `bid`). */
  form: {
    eyebrow?: string;
    heading: string;
    text?: string;
    /** The "Scope" checkboxes. */
    scopeOptions?: { label: string; value: string }[];
    /** What happens after they send it — only steps the business follows. */
    steps?: string[];
  };

  /** Their pages by city, as one line under the form ("Commercial concrete coatings by city"). */
  /** `link`: each town's page; `{town}` becomes its name in kebab-case. */
  cities?: { heading: string; towns: string[]; link?: string };
}
