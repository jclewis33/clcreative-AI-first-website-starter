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
  /** Defaults to "<name> | <tagline>". */
  title: text.optional(),
  /** Defaults to seo.description. */
  description: text.optional(),
  estimate: z
    .object({ label: text, heading: text, text: text.optional() })
    .default({
      label: "Get a free estimate",
      heading: "Get a free estimate",
      text: "Tell us a little about the job and we'll be in touch.",
    }),
  hero: z.object({
    eyebrow: text.optional(),
    heading: text,
    text: text.optional(),
    image,
    imageAlt: text,
    proof: z
      .object({ rating: z.number().min(1).max(5).optional(), text })
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
  photoBand: z.object({ image, alt: text }).optional(),
  story: z
    .object({
      eyebrow: text.optional(),
      heading: text,
      paragraphs: z.array(text).optional(),
      image,
      imageAlt: text,
      reasons: z.array(item).optional(),
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
  callBand: z.object({ heading: text, text: text.optional() }),
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

export const demoSchema = z.object({
  preset: z.literal("local-service"),
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
];

/** Nav and footer links a demo drops (the sample content stays unlinked). */
export const HIDDEN_PATHS = ["/blog", "/case-studies", "/projects", "/gallery"];
