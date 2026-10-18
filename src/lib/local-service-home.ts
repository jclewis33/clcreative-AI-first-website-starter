import type { ImageMetadata } from "astro";
import type { FAQItem } from "@/data/faqs";

/**
 * The data a local-service home page is made of — everything
 * LocalServiceHome (src/components/templates/LocalServiceHome.astro) renders
 * except the services, which it reads from the services content itself.
 *
 * Two producers: the dev sample (src/data/local-service-sample.ts, with the
 * placeholder photos) and a prospect demo, whose src/data/home.ts
 * `npm run demo` generates from demo.json. Optional sections are left out
 * of the page when their data is absent — never filled with placeholders.
 * In particular, a page with no `reviews` shows no Reviews section: reviews
 * must be real and attributed.
 */

type HomeImage = ImageMetadata | string;
type HomeItem = { title: string; text: string };
type HomeStat = { value: string; label: string };
type HomeReview = { text: string; name: string; meta?: string };
type HomeOption = { label: string; value: string };
/** An SVG imported as a component (ServiceArea's interactive map). */
type HomeMap = (props: Record<string, unknown>) => unknown;

export interface LocalServiceHomeData {
  /** Page `<title>` and meta description. */
  title: string;
  description: string;

  /** The "get an estimate" modal every estimate CTA on the page opens. */
  estimate: { label: string; heading: string; text?: string };

  hero: {
    eyebrow?: string;
    /** HTML allowed (`<strong>` marks the accent words). */
    heading: string;
    text?: string;
    image: HomeImage;
    imageAlt: string;
    /** Star line under the CTAs — only with a real rating to quote. */
    proof?: { rating?: number; text: string };
  };

  /** Four short numbers or words. Leave out anything you can't back up. */
  stats?: HomeStat[];

  /** Heading for the service cards (the cards come from src/content/services). */
  services: { eyebrow?: string; heading: string; intro?: string };

  serviceArea: {
    heading: string;
    text?: string;
    /** Defaults to SITE.serviceAreas. */
    areas?: string[];
    map?: HomeMap;
  };

  process?: {
    eyebrow?: string;
    heading: string;
    text?: string;
    steps: HomeItem[];
    image?: HomeImage;
    imageAlt?: string;
  };

  photoBand?: { image: HomeImage; alt: string };

  story?: {
    eyebrow?: string;
    heading: string;
    paragraphs?: string[];
    image: HomeImage;
    imageAlt: string;
    reasons?: HomeItem[];
  };

  /** Real, attributed reviews only. Absent = no Reviews section. */
  reviews?: { rating?: number; count?: number; items: HomeReview[] };

  leadForm: {
    eyebrow?: string;
    heading: string;
    text?: string;
    /** The "what's the project" choices. Defaults to the service titles. */
    projectOptions?: HomeOption[];
  };

  /** Absent = no FAQ section (never the generic lorem defaults). */
  faqs?: { eyebrow?: string; items: FAQItem[] };

  callBand: { heading: string; text?: string };
}
