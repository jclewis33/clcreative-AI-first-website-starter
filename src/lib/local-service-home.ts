import type { ImageMetadata } from "astro";
import type { FAQItem } from "@/data/faqs";
import type { ServiceIconName } from "@/components/ui/ServiceIcon.astro";

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
type HomeTrust = { label: string; image?: HomeImage };
type HomeAreaGeo = {
  name: string;
  geometry: {
    type: "Polygon" | "MultiPolygon" | "Point";
    coordinates: unknown;
  };
};

export interface LocalServiceHomeData {
  /**
   * The home page's layout: `contractor` (LocalServiceHome — conversion-led:
   * quote panel, offer, symptoms, comparison) or `showcase`
   * (LocalServiceShowcase — photo-led and editorial, after the Outdoor
   * Living demo). @default 'contractor'
   */
  layout?: "contractor" | "showcase";

  /**
   * The About page (LocalServiceAbout, /about). Optional: without it the
   * page leads with the story's heading and paragraphs.
   */
  about?: {
    /** Page `<title>` and meta description. */
    title?: string;
    description?: string;
    eyebrow?: string;
    /** The h1. HTML allowed (`<strong>` = accent). */
    heading?: string;
    /** The intro line under it. */
    text?: string;
    /**
     * The photo beside the intro. @default photoBand's image, else the home
     * hero's — never the story photo, which sits right below.
     */
    image?: HomeImage;
    imageAlt?: string;
    /** The story section's heading on the About page. @default story.heading */
    storyHeading?: string;
    /** Longer story paragraphs for the About page. @default story.paragraphs */
    paragraphs?: string[];
  };

  /**
   * The contact page hero: a headline about what the visitor gets, a line,
   * and a wide photo (defaults to the home hero's).
   */
  contact?: {
    heading?: string;
    text?: string;
    image?: HomeImage;
    imageAlt?: string;
  };

  /** Page `<title>` and meta description. */
  title: string;
  description: string;

  /**
   * The "get an estimate" modal every estimate CTA on the page opens.
   * `question` heads its first step (the service tiles).
   */
  estimate: {
    label: string;
    heading: string;
    text?: string;
    question?: string;
  };

  hero: {
    eyebrow?: string;
    /** HTML allowed: `<strong>` marks the accent words, `<mark>` highlights an offer. */
    heading: string;
    text?: string;
    image: HomeImage;
    imageAlt: string;
    /** Photo behind the text (default) or beside it. */
    variant?: "background" | "split";
    /** `panel` = the estimate button, "or", and the phone on one panel. */
    ctaStyle?: "buttons" | "panel";
    /** Small line under the estimate button in the panel ("And claim $100 off"). */
    ctaNote?: string;
    /** Star line under the CTAs — only with a real rating to quote. */
    proof?: { rating?: number; text: string };
    /** Credentials the business really holds. */
    trust?: HomeTrust[];
  };

  /** Four short numbers or words. Leave out anything you can't back up. */
  stats?: HomeStat[];

  /** Heading for the service cards (the cards come from src/content/services). */
  services: {
    eyebrow?: string;
    heading: string;
    intro?: string;
    /**
     * `cards` — the photo card grid (ServiceCards); `showcase` — the
     * auto-advancing accordion with the photo swapping beside it
     * (ServiceShowcase). @default 'cards'
     */
    layout?: "cards" | "showcase";
  };

  /** "Sound familiar?" — the problems, in the homeowner's words (SymptomCards). */
  symptoms?: {
    eyebrow?: string;
    heading?: string;
    intro?: string;
    items: { title: string; text: string; icon?: ServiceIconName }[];
  };

  /** One real offer — a discount, financing, rebates (OfferBand). Opens the estimate form. */
  offer?: {
    seal?: { value: string; label: string };
    eyebrow?: string;
    heading: string;
    text?: string;
    items?: string[];
    /** The terms. */
    note?: string;
    /** Button text. @default the estimate label */
    ctaLabel?: string;
  };

  /** The business's own job photos, captioned with the town (RecentWork). */
  recentWork?: {
    eyebrow?: string;
    heading?: string;
    intro?: string;
    items: {
      image: HomeImage;
      imageAlt: string;
      title: string;
      place?: string;
    }[];
  };

  /** Real round-the-clock (or after-hours) service only (EmergencyBand). */
  emergency?: { heading?: string; text?: string };

  /** Maintenance / membership plans at real prices (MaintenancePlans). */
  plans?: {
    eyebrow?: string;
    heading?: string;
    intro?: string;
    note?: string;
    items: {
      name: string;
      price: string;
      period?: string;
      description?: string;
      perks: string[];
      featured?: boolean;
      ctaLabel?: string;
    }[];
  };

  /** The real people who show up (TeamGrid). */
  team?: {
    eyebrow?: string;
    heading?: string;
    intro?: string;
    members: {
      name: string;
      role: string;
      image: HomeImage;
      imageAlt?: string;
      bio?: string;
    }[];
  };

  /** A named guarantee the business really gives (Guarantee). */
  guarantee?: {
    eyebrow?: string;
    name: string;
    text?: string;
    items?: string[];
    sealLabel?: string;
  };

  /** Us vs. a typical contractor, honestly (ComparisonTable). */
  comparison?: {
    eyebrow?: string;
    heading?: string;
    intro?: string;
    themLabel?: string;
    rows: { label: string; us: string; them: string }[];
  };

  serviceArea: {
    heading: string;
    text?: string;
    /** Defaults to SITE.serviceAreas. */
    areas?: string[];
    /** Town boundaries for the street map — `npm run demo` fetches them. */
    geo?: HomeAreaGeo[];
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

  photoBand?: {
    image: HomeImage;
    alt: string;
    /** Focal point in percent — `{ x: 50, y: 25 }` keeps heads in frame. @default { x: 50, y: 35 } */
    position?: { x: number; y: number };
  };

  story?: {
    eyebrow?: string;
    heading: string;
    paragraphs?: string[];
    image: HomeImage;
    imageAlt: string;
    reasons?: HomeItem[];
    /** The showcase layout's text link to the estimate form ("Book time with me"). */
    ctaLabel?: string;
  };

  /** Real, attributed reviews only. Absent = no Reviews section. */
  reviews?: {
    rating?: number;
    count?: number;
    items: HomeReview[];
    /** @default 'cards' (stars on every card) */
    layout?: "cards" | "featured" | "grid";
  };

  leadForm: {
    eyebrow?: string;
    heading: string;
    text?: string;
    /** The "what's the project" choices. Defaults to the service titles. */
    projectOptions?: HomeOption[];
  };

  /** Absent = no FAQ section (never the generic lorem defaults). */
  faqs?: { eyebrow?: string; items: FAQItem[] };

  callBand: {
    heading: string;
    text?: string;
    /** `photo-card` / `split` need `image`. @default 'band' */
    variant?: "band" | "photo-card" | "split";
    image?: HomeImage;
    imageAlt?: string;
    ctaNote?: string;
  };
}
