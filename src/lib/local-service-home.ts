import type { ImageMetadata } from "astro";
import type { FAQItem } from "@/data/faqs";
import type { ServiceIconName } from "@/components/ui/ServiceIcon.astro";
import type { LeadQuestion } from "@/lib/lead-questions";

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
type HomeReview = {
  /** The line the home page and service pages show (an excerpt is fine). */
  text: string;
  name: string;
  meta?: string;
  /** The whole review, word for word, for the /reviews page. @default text */
  full?: string;
  /** Its stars — 4 or 5 only; the site never shows a worse review. @default 5 */
  rating?: number;
};
type HomeOption = { label: string; value: string };
/** An SVG imported as a component (ServiceArea's interactive map). */
type HomeMap = (props: Record<string, unknown>) => unknown;
type HomeTrust = { label: string; image?: HomeImage };
type HomeCta = { label: string; href?: string; modal?: string };
type HomePath = {
  label?: string;
  title: string;
  text?: string;
  points?: string[];
  cta?: HomeCta;
};
type HomeBeforeAfter = {
  before: ImageMetadata;
  beforeAlt: string;
  after: ImageMetadata;
  afterAlt: string;
  title: string;
  text?: string;
};
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
   * Living demo) or `estate` (LocalServiceEstate — high-end and two-sided:
   * homeowner / contractor panels over the hero, finishes, a before-and-after
   * switcher, a commercial spotlight, projects, process, Google-style
   * reviews and a quote band; after the FDC Coatings design).
   * @default 'contractor'
   */
  layout?: "contractor" | "showcase" | "estate";

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
    /** `cutout` = `image` is a transparent PNG (their mascot) shown whole, with no box. */
    imageFit?: "cover" | "cutout";
    /** Cutout only: a faint texture behind it (diamond plate, brick). */
    imageBackdrop?: HomeImage;
    /** Hero colour theme; `dark` suits a cut-out. */
    theme?: "light" | "dark" | "brand";
    /** The story section's photo on the About page. @default story.image */
    storyImage?: HomeImage;
    storyImageAlt?: string;
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
    /** A qualifying form: one-tap steps before the contact fields (LeadForm `questions`). */
    questions?: LeadQuestion[];
  };

  hero: {
    eyebrow?: string;
    /** HTML allowed: `<strong>` marks the accent words, `<mark>` highlights an offer. */
    heading: string;
    text?: string;
    image: HomeImage;
    imageAlt: string;
    /** Focal point in percent; keeps faces in the crop (the split photo is tall on desktop, square on phones). */
    imagePosition?: { x: number; y: number };
    /** Background only: `side` = dark behind the text, clearing to the right so a truck or team there stays bright. */
    overlay?: "bottom" | "side";
    /** Photo behind the text (default) or beside it. */
    variant?: "background" | "split";
    /** Split only: a photo in a box (`cover`, default) or a transparent cut-out such as a mascot (`cutout`). */
    imageFit?: "cover" | "cutout";
    /** Cutout only: a faint texture behind the cut-out (diamond plate, brick), fading toward the text. */
    imageBackdrop?: HomeImage;
    /** Hero colour theme; `dark` suits a cut-out. Default: dark for background, else the page's. */
    theme?: "light" | "dark" | "brand";
    /** `panel` = the estimate button, "or", and the phone on one panel; `form` = the estimate form itself on a card beside the text. */
    ctaStyle?: "buttons" | "panel" | "form";
    /** `form` only: the card's heading and line. @default estimate.heading and estimate.text */
    formHeading?: string;
    formText?: string;
    /** `above` = the proof line as a pill over the headline. @default 'below' */
    proofPosition?: "below" | "above";
    /** Small line under the estimate button in the panel ("And claim $100 off"). */
    ctaNote?: string;
    /** Star line under the CTAs — only with a real rating to quote. */
    proof?: { rating?: number; text: string };
    /** Credentials the business really holds. */
    trust?: HomeTrust[];
    /** Estate layout: a second hero button ("See our work" → #projects). */
    secondaryCta?: { label: string; href: string };
    /** The estimate button's text here. @default estimate.label */
    ctaLabel?: string;
  };

  /** Four short numbers or words. Leave out anything you can't back up. */
  stats?: HomeStat[];

  /**
   * Two (or three) ways in for different visitors — homeowners and
   * contractors, say — as equal panels under the hero (PathCards). Each
   * path's `cta` links to its own page.
   */
  paths?: {
    eyebrow?: string;
    heading: string;
    intro?: string;
    items: HomePath[];
  };

  /**
   * The business's own before-and-after pairs as drag-to-compare sliders
   * (BeforeAfterGallery), after the services. The same view, before and
   * after, from a real job.
   */
  beforeAfter?: {
    eyebrow?: string;
    heading?: string;
    intro?: string;
    items: HomeBeforeAfter[];
  };

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

  /** The promises the business really makes, as tinted cards (PromiseCards). */
  promises?: {
    eyebrow?: string;
    heading: string;
    intro?: string;
    items: HomeItem[];
  };

  /**
   * "What to expect" — the steps with their when ("Today", "First visit",
   * "Every season") beside the CTA and one real figure (ExpectTimeline).
   * When set it takes the home page's process slot; `process` still feeds
   * the About and service pages.
   */
  expect?: {
    eyebrow?: string;
    heading: string;
    text?: string;
    steps: { label: string; title: string; text: string }[];
    /** One real figure ("100%" / "Recommend us on Facebook"). Never invented. */
    proof?: HomeStat;
  };

  /** Why customers pick them: icon rows beside one big photo (WhyChooseUs). */
  why?: {
    eyebrow?: string;
    heading: string;
    intro?: string;
    items: { title: string; text: string; icon?: ServiceIconName }[];
    image: HomeImage;
    imageAlt: string;
  };

  /**
   * Estate layout: one side of the business in the spotlight on a tinted
   * band (FeatureSpotlight) — the commercial work on a mostly-residential
   * home page. Up to 3 photos, a ruled list with optional codes, two buttons.
   */
  spotlight?: {
    eyebrow?: string;
    heading: string;
    text?: string;
    images: { image: HomeImage; alt: string }[];
    items?: { label: string; meta?: string }[];
    cta?: { label: string; href: string };
    secondaryCta?: { label: string; href: string };
  };

  /**
   * Estate layout: projects from the projects content (ProjectHighlights),
   * with category pills. `slugs` picks and orders them.
   */
  projectHighlights?: {
    eyebrow?: string;
    heading?: string;
    slugs?: string[];
    limit?: number;
    /** The link under the cards. @default 'View all projects' */
    linkLabel?: string;
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
    /** Which side the photo sits on. @default 'left' */
    imageSide?: "left" | "right";
    /** The showcase layout's text link to the estimate form ("Book time with me"). */
    ctaLabel?: string;
  };

  /** Real, attributed reviews only. Absent = no Reviews section. */
  reviews?: {
    rating?: number;
    count?: number;
    items: HomeReview[];
    /** @default 'marquee' with 4+ reviews (scrolling across the screen), else 'cards' */
    layout?: "cards" | "featured" | "grid" | "marquee";
    /** Estate layout: the star line under the heading ("78 five-star reviews on Google"). */
    summary?: string;
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
    /** Estate layout: a second button (another kind of buyer). */
    secondaryCta?: { label: string; href: string };
    /** The estimate button's text here. @default estimate.label */
    ctaLabel?: string;
    /** Estate layout: "What happens when you reach out", in order. */
    steps?: string[];
  };
}
