// @ts-check
/**
 * The "local-service" demo preset: what a prospect demo's `demo.json` must
 * hold, and which pages the preset installs. `scripts/demo.mjs` reads it.
 *
 * The schema checks the shape a demo needs before anything is written, so
 * a mistake is reported as `demo.json › home.hero.imageAlt: …` instead of
 * a half-written branch. Service entries are checked again, fully, by the
 * real content schema (src/content.config.ts) when the script runs
 * `astro sync` — only the fields the script itself handles are checked here.
 *
 * Image fields hold a SOURCE: a path relative to demo.json
 * ("./assets/hero.jpg") or an https URL. The script converts each to webp
 * and writes it where the site expects it.
 */
import { z } from "astro/zod";

const text = z.string().trim().min(1);
const image = text;
const item = z.object({ title: text, text: text });

const homeSchema = z.object({
  /** contractor (conversion-led) or showcase (photo-led, editorial). */
  layout: z.enum(["contractor", "showcase"]).default("contractor"),
  /** The About page (/about). Optional: it leads with the story without it. */
  about: z
    .object({
      title: text.optional(),
      description: text.optional(),
      eyebrow: text.optional(),
      heading: text.optional(),
      text: text.optional(),
      image: image.optional(),
      imageAlt: text.optional(),
      storyHeading: text.optional(),
      paragraphs: z.array(text).optional(),
    })
    .optional(),
  /** Defaults to "<name> | <tagline>". */
  title: text.optional(),
  /** Defaults to seo.description. */
  description: text.optional(),
  estimate: z
    .object({
      label: text,
      heading: text,
      text: text.optional(),
      /** The estimate form's first step, over the service tiles. */
      question: text.optional(),
    })
    .default({
      label: "Get a free estimate",
      heading: "Get a free estimate",
      text: "Tell us a little about the job and we'll be in touch.",
    }),
  hero: z.object({
    eyebrow: text.optional(),
    /** HTML: <strong> = accent words, <mark> = a highlighted offer. */
    heading: text,
    text: text.optional(),
    image,
    imageAlt: text,
    variant: z.enum(["background", "split"]).optional(),
    /** "panel" = estimate button + "or" + "Call or text us". */
    ctaStyle: z.enum(["buttons", "panel"]).default("panel"),
    ctaNote: text.optional(),
    proof: z
      .object({ rating: z.number().min(1).max(5).optional(), text })
      .optional(),
    /** Credentials they really hold; `image` is a logo source. */
    trust: z
      .array(z.object({ label: text, image: image.optional() }))
      .max(5)
      .optional(),
  }),
  stats: z
    .array(z.object({ value: text, label: text }))
    .length(4)
    .optional(),
  services: z.object({
    eyebrow: text.optional(),
    heading: text,
    intro: text.optional(),
  }),
  /** "Sound familiar?" — problems in the homeowner's words. */
  symptoms: z
    .object({
      eyebrow: text.optional(),
      heading: text.optional(),
      intro: text.optional(),
      items: z
        .array(z.object({ title: text, text, icon: text.optional() }))
        .min(2)
        .max(6),
    })
    .optional(),
  /** One REAL offer from their site — never invent one. */
  offer: z
    .object({
      seal: z.object({ value: text, label: text }).optional(),
      eyebrow: text.optional(),
      heading: text,
      text: text.optional(),
      items: z.array(text).optional(),
      /** The terms — required: an offer without terms isn't shown. */
      note: text,
      ctaLabel: text.optional(),
    })
    .optional(),
  /** Their own job photos only. */
  recentWork: z
    .object({
      eyebrow: text.optional(),
      heading: text.optional(),
      intro: text.optional(),
      items: z
        .array(
          z.object({
            image,
            imageAlt: text,
            title: text,
            place: text.optional(),
          }),
        )
        .min(3)
        .max(9),
    })
    .optional(),
  /** Only when they really answer around the clock / after hours. */
  emergency: z
    .object({ heading: text.optional(), text: text.optional() })
    .optional(),
  /** Their real maintenance / membership plans, at their prices. */
  plans: z
    .object({
      eyebrow: text.optional(),
      heading: text.optional(),
      intro: text.optional(),
      note: text.optional(),
      items: z
        .array(
          z.object({
            name: text,
            price: text,
            period: text.optional(),
            description: text.optional(),
            perks: z.array(text).min(1),
            featured: z.boolean().optional(),
            ctaLabel: text.optional(),
          }),
        )
        .min(1)
        .max(3),
    })
    .optional(),
  /** The real people, with their own photos. */
  team: z
    .object({
      eyebrow: text.optional(),
      heading: text.optional(),
      intro: text.optional(),
      members: z
        .array(
          z.object({
            name: text,
            role: text,
            image,
            imageAlt: text.optional(),
            bio: text.optional(),
          }),
        )
        .min(1)
        .max(8),
    })
    .optional(),
  /** A guarantee they actually give, named. */
  guarantee: z
    .object({
      eyebrow: text.optional(),
      name: text,
      text: text.optional(),
      items: z.array(text).optional(),
      sealLabel: text.optional(),
    })
    .optional(),
  /** Us vs. a typical contractor — common practice, never a named competitor. */
  comparison: z
    .object({
      eyebrow: text.optional(),
      heading: text.optional(),
      intro: text.optional(),
      themLabel: text.optional(),
      rows: z.array(z.object({ label: text, us: text, them: text })).min(3),
    })
    .optional(),
  serviceArea: z.object({
    heading: text,
    text: text.optional(),
    areas: z.array(text).min(1).optional(),
  }),
  process: z
    .object({
      eyebrow: text.optional(),
      heading: text,
      text: text.optional(),
      steps: z.array(item).min(2),
      image: image.optional(),
      imageAlt: text.optional(),
    })
    .refine((p) => !p.image || p.imageAlt, {
      message: "imageAlt is required when image is set",
      path: ["imageAlt"],
    })
    .optional(),
  photoBand: z
    .object({
      image,
      alt: text,
      /** Focal point in percent; keep faces in the crop. */
      position: z
        .object({
          x: z.number().min(0).max(100),
          y: z.number().min(0).max(100),
        })
        .optional(),
    })
    .optional(),
  story: z
    .object({
      eyebrow: text.optional(),
      heading: text,
      paragraphs: z.array(text).optional(),
      image,
      imageAlt: text,
      reasons: z.array(item).optional(),
      ctaLabel: text.optional(),
    })
    .optional(),
  /** Real, attributed reviews only — leave it out otherwise. */
  reviews: z
    .object({
      rating: z.number().min(1).max(5).optional(),
      count: z.number().int().positive().optional(),
      items: z
        .array(z.object({ text, name: text, meta: text.optional() }))
        .min(1),
      layout: z.enum(["cards", "featured", "grid"]).optional(),
    })
    .optional(),
  leadForm: z.object({
    eyebrow: text.optional(),
    heading: text,
    text: text.optional(),
    projectOptions: z
      .array(z.object({ label: text, value: text }))
      .min(2)
      .optional(),
  }),
  faqs: z
    .object({
      eyebrow: text.optional(),
      items: z.array(z.object({ question: text, answer: text })).min(2),
    })
    .optional(),
  callBand: z
    .object({
      heading: text,
      text: text.optional(),
      /** photo-card / split need `image` + `imageAlt`. */
      variant: z.enum(["band", "photo-card", "split"]).optional(),
      image: image.optional(),
      imageAlt: text.optional(),
      ctaNote: text.optional(),
    })
    .refine((c) => !c.image || c.imageAlt, {
      message: "imageAlt is required when image is set",
      path: ["imageAlt"],
    }),
});

/** A service: the content schema's fields, plus its slug. */
const serviceSchema = z
  .object({
    /** lowercase-kebab-case — the URL /services/<slug> and the filename. */
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "use lowercase-kebab-case")
      .refine((slug) => slug !== "contact", 'can\'t be "contact"'),
    title: text,
    cardImage: image,
    hero: z.object({ image }).passthrough(),
    scope: z.object({ image: image.optional() }).passthrough(),
    included: z
      .object({
        images: z.array(z.object({ src: image, alt: text })).length(2),
      })
      .passthrough(),
    reviews: z
      .array(z.object({ avatar: image.optional() }).passthrough())
      .optional(),
  })
  .passthrough();

/** The looks (src/config/looks.ts) a demo can wear. */
export const LOOK_NAMES = ["fresh", "warm", "rugged", "natural", "studio"];

export const demoSchema = z.object({
  preset: z.literal("local-service"),
  /**
   * fresh (lawn, pest, cleaning) · warm (HVAC, insulation, remodeling) ·
   * rugged (electrical, roofing, plumbing) · natural (hardscape, landscaping)
   */
  look: z.enum(LOOK_NAMES).default("fresh"),
  /** Contractor license, shown in the footer, e.g. "TECL #25414". */
  license: text.optional(),
  /** A page per service per town in `serviceAreas`. */
  cityPages: z.boolean().default(true),
  prospect: z.object({
    name: text,
    legalName: text.optional(),
    /** The branch is demo/<slug>; it ends up in the preview URL. */
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "use lowercase-kebab-case")
      .max(30, "keep it to 30 characters — it becomes part of a hostname"),
    /** Their current site — the research source. */
    website: z.url().optional(),
    /** Schema.org founder; defaults to the business name. */
    owner: text.optional(),
  }),
  contact: z.object({
    /** As shown on the site, e.g. "(512) 555-0142". US numbers. */
    phone: text,
    /** Leave out when they don't publish one — the footer then shows none. */
    email: z.email().optional(),
    hours: text,
    locality: text,
    region: text,
  }),
  serviceAreas: z.array(text).min(1),
  /**
   * When they describe their area as a distance ("within 60 miles of
   * Palmer"): a circle on the street map, centred on that town.
   */
  serviceRadius: z
    .object({ center: text, miles: z.number().positive().max(250) })
    .optional(),
  founded: z.number().int().min(1800).max(2100).optional(),
  reviewsUrl: z.url().optional(),
  /** Footer profiles by label: { "Facebook": "https://…" }. */
  social: z.record(z.string(), z.url()).optional(),
  utilityBar: z.object({ text, areaLabel: text.optional() }).optional(),
  brand: z.object({
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "a six-digit hex like #1a4fd8"),
    logo: z.object({
      /** PNG, WebP or SVG. */
      file: image,
      /** A light backing for a dark-on-white logo on the dark nav. */
      plate: z.boolean().default(false),
    }),
    /** A square icon; derived from the logo when left out. */
    favicon: image.optional(),
  }),
  seo: z.object({
    tagline: text,
    /** The default meta description — at most 160 characters. */
    description: text.max(160),
  }),
  home: homeSchema,
  services: z.array(serviceSchema).min(1).max(8),
  notes: z
    .object({
      sourceUrl: z.url().optional(),
      /** Anything Claude inferred rather than found — Casey checks these. */
      confirmOrCut: z.array(text).default([]),
    })
    .default({ confirmOrCut: [] }),
});

/** Pages this preset installs, from this folder into src/pages. */
export const PAGES = [
  { from: "index.astro", to: "src/pages/index.astro" },
  { from: "contact.astro", to: "src/pages/contact.astro" },
  { from: "about.astro", to: "src/pages/about.astro" },
];

/** Nav and footer links a demo drops (the sample content stays unlinked). */
export const HIDDEN_PATHS = ["/blog", "/case-studies", "/projects", "/gallery"];
