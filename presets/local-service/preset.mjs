// @ts-check
/**
 * The "local-service" demo preset: what a prospect demo's `demo.json` must
 * hold, and which pages the preset installs. `scripts/demo.mjs` reads it.
 *
 * demo.json holds the business's facts and its repeated content (services,
 * regions, reviews, FAQs, projects) — never page copy, which is written in
 * the pages themselves. The schema checks the shape before anything is
 * written, so a mistake is reported as `demo.json › reviews.0.rating: …`
 * instead of a half-written branch. Service entries are checked again, fully, by the
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

/**
 * The site-wide estimate CTA (SITE.quote): the nav and mobile-bar button,
 * and the form in the modal every page carries.
 */
const quoteSchema = z
  .object({
    /** The button text everywhere. */
    label: text,
    heading: text,
    text: text.optional(),
    /** The estimate form's first step, over the service tiles. */
    question: text.optional(),
    /**
     * A qualifying form instead: one-tap questions, one step each, before
     * the contact fields (who's asking, project, size, timing, budget).
     * Each `name` is the field its answer is saved as.
     */
    questions: z
      .array(
        z.object({
          name: z.enum([
            "audience",
            "customerStatus",
            "projectType",
            "concerns",
            "projectSize",
            "timeline",
            "budget",
          ]),
          question: text,
          text: text.optional(),
          /** "Pick all that apply": checkboxes and a Next button. */
          multiple: z.boolean().optional(),
          options: z
            .array(
              z.object({
                label: text,
                value: text,
                description: text.optional(),
              }),
            )
            .min(2)
            .max(8),
        }),
      )
      .min(1)
      .max(6)
      .optional(),
  })
  .default({
    label: "Get a free estimate",
    heading: "Get a free estimate",
    text: "Tell us a little about the job and we'll be in touch.",
  });

/**
 * A real, attributed review from a public platform (src/content/reviews).
 * Never invented, never below 4 stars.
 */
const reviewSchema = z.object({
  /** The line the cards show (an excerpt is fine). */
  text,
  name: text,
  /** The line under the name ("Panel upgrade · Round Rock", "Google review"); it also names the platform. */
  meta: text.optional(),
  /** The whole review, word for word, for /reviews. */
  full: text.optional(),
  /** 4 or 5 — worse reviews never go on the site. @default 5 */
  rating: z.number().int().min(4).max(5).optional(),
  /** As the platform shows it ("a year ago"). */
  date: text.optional(),
  /** Who they are, when it matters ("General contractor"). */
  role: text.optional(),
  /** The reviewer's photo (a source); needs avatarAlt. */
  avatar: image.optional(),
  avatarAlt: text.optional(),
  /** Shown before the others. */
  featured: z.boolean().optional(),
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
    /* Each service's "What we work on" photo, distinct from its hero:
       without one the page fell back to the card photo — usually the hero
       again, cropped tall and blurry. */
    scope: z.object({ image, imageAlt: text }).passthrough(),
    included: z
      .object({
        images: z.array(z.object({ src: image, alt: text })).length(2),
      })
      .passthrough(),
    /** Reviews about this service; they show on its page first. */
    reviews: z.array(reviewSchema).optional(),
    /* The estate service page's sections (look "estate"); the content
       schema checks the rest at sync. */
    beforeAfter: z
      .object({
        items: z
          .array(
            z
              .object({
                before: image,
                beforeAlt: text,
                after: image,
                afterAlt: text,
              })
              .passthrough(),
          )
          .min(1)
          .max(4),
      })
      .passthrough()
      .optional(),
    options: z
      .object({
        items: z
          .array(z.object({ image, imageAlt: text }).passthrough())
          .min(2)
          .max(4),
      })
      .passthrough()
      .optional(),
    gallery: z
      .object({
        images: z
          .array(z.object({ src: image, alt: text }))
          .min(2)
          .max(4),
      })
      .passthrough()
      .optional(),
    equipment: z.object({ image, imageAlt: text }).passthrough().optional(),
    work: z
      .object({
        items: z
          .array(z.object({ image, imageAlt: text }).passthrough())
          .min(2)
          .max(4),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

/**
 * A service-area region: the content schema's fields (src/content.config.ts
 * checks them fully at sync), plus its slug. Image fields are sources.
 */
const areaSchema = z
  .object({
    /** lowercase-kebab-case — the URL /service-areas/<slug>. */
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "use lowercase-kebab-case"),
    title: text,
    towns: z.array(text).min(1),
    hero: z.object({ image }).passthrough(),
    jobs: z.array(z.object({ image, imageAlt: text }).passthrough()).optional(),
  })
  .passthrough();

const kebab = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "use lowercase-kebab-case");
/** A project (src/content/projects): /projects/<slug>, their own job only. */
const projectSchema = z
  .object({
    slug: kebab,
    title: text,
    category: z.enum(["residential", "commercial"]),
    heroImage: image,
    imageAlt: text,
    photos: z
      .array(
        z.object({
          src: image,
          alt: text,
          label: z.enum(["Before", "During", "After"]).optional(),
        }),
      )
      .optional(),
  })
  .passthrough();

/** The looks (src/config/looks.ts) a demo can wear. */
export const LOOK_NAMES = [
  "fresh",
  "warm",
  "rugged",
  "natural",
  "trusted",
  "estate",
  "studio",
];

const demoObject = z.object({
  preset: z.literal("local-service"),
  /**
   * fresh (lawn, pest, cleaning) · warm (HVAC, insulation, remodeling) ·
   * rugged (electrical, roofing, plumbing) · natural (hardscape, landscaping) ·
   * trusted (remediation, inspection, restoration) · estate (high-end finishes)
   */
  look: z.enum(LOOK_NAMES).default("fresh"),
  /** Contractor license, shown in the footer, e.g. "TECL #25414". */
  license: text.optional(),
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
    /**
     * Schema.org priceRange, only as their own listing shows it (Google or
     * Facebook "$"). Left out, the structured data carries none.
     */
    priceRange: z.enum(["$", "$$", "$$$", "$$$$"]).optional(),
  }),
  contact: z.object({
    /** As shown on the site, e.g. "(512) 555-0142". US numbers. */
    phone: text,
    /**
     * True only when their site or profile says the number takes texts; the
     * nav then reads "Call or text" instead of "Call us".
     */
    texts: z.boolean().default(false),
    /** Leave out when they don't publish one — the footer then shows none. */
    email: z.email().optional(),
    hours: text,
    /**
     * Only when their site or Google profile publishes one (a shop or
     * office). Leave out for a home-based business — no street line shows.
     */
    street: text.optional(),
    postalCode: text.optional(),
    locality: text,
    region: text,
    /**
     * Day by day, for a place people visit (a clinic, a showroom): the
     * hours table and the JSON-LD hours. Days not listed are closed; times
     * 24-hour. Only hours their site or Google profile shows.
     */
    openingHours: z
      .array(
        z.object({
          days: z
            .array(z.enum(["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]))
            .min(1),
          opens: z.string().regex(/^\d{2}:\d{2}$/),
          closes: z.string().regex(/^\d{2}:\d{2}$/),
        }),
      )
      .optional(),
  }),
  /**
   * The schema.org type of the business, the most specific that fits:
   * "Plumber", "Electrician", "HVACBusiness", "RoofingContractor",
   * "Chiropractor", "Dentist" (the list in src/config/site.ts).
   * Default "ProfessionalService".
   */
  businessType: z
    .string()
    .regex(/^[A-Z][A-Za-z]+$/)
    .optional(),
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
  /**
   * Show the Phone field and SMS consent box on the demo's forms
   * (SITE.smsOptIn). On for demos (Casey wants the phone asked); the real
   * site keeps it off until the client's A2P approval (docs/ghl-forms.md).
   */
  smsOptIn: z.boolean().default(true),
  /** Footer profiles by label: { "Facebook": "https://…" }. */
  social: z.record(z.string(), z.url()).optional(),
  /** `link` (desktop, right side, beside the phone) replaces `areaLabel`. */
  utilityBar: z
    .object({
      text,
      areaLabel: text.optional(),
      link: z.object({ label: text, href: text }).optional(),
    })
    .optional(),
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
    /**
     * The text on brand-coloured buttons: "dark" or "light". Left out, it's
     * picked from the colour's lightness. Mid-tone brands (copper,
     * terracotta) read better with dark text.
     */
    text: z.enum(["dark", "light"]).optional(),
    /** A square icon; derived from the logo when left out. */
    favicon: image.optional(),
  }),
  seo: z.object({
    tagline: text,
    /** The default meta description — at most 160 characters. */
    description: text.max(160),
    /** The share image (public/images/og-image.png): usually the home hero photo. */
    image,
  }),
  quote: quoteSchema,
  /**
   * Their public star rating (SITE.rating): the stars line and the
   * structured data. Only the figure their profile shows.
   */
  rating: z
    .object({
      value: z.number().min(1).max(5),
      count: z.number().int().positive(),
      source: z.enum(["google", "facebook", "yelp"]).default("google"),
    })
    .optional(),
  /** Every real 4 and 5 star review (src/content/reviews); `[]` for none. */
  reviews: z.array(reviewSchema),
  /** The site-wide FAQs (src/content/faqs), word for word; `[]` for none. */
  faqs: z.array(z.object({ question: text, answer: text })),
  /** The site-wide "how it works" steps (settings.json `process`). */
  process: z
    .object({
      heading: text,
      text: text.optional(),
      steps: z.array(item).min(2),
    })
    .optional(),
  services: z.array(serviceSchema).min(1).max(8),
  /**
   * Service-area regions (/service-areas/<slug>): a few regions grouping
   * every town in `serviceAreas`, never a page per town. Each town sits in
   * exactly one region.
   */
  areas: z.array(areaSchema).max(8).optional(),
  /**
   * A page for a second kind of buyer (contractors, property managers):
   * the preset's audience.astro, installed once at src/pages/<path>.astro
   * (keep the prospect's own URL) and linked from the nav. Its copy is
   * written in the page.
   */
  audiencePage: z
    .object({
      /** The URL: "commercial-concrete-coatings" → /commercial-concrete-coatings. */
      path: kebab.refine(
        (p) => !["index", "about", "contact", "reviews"].includes(p),
        "is one of the preset's own pages — pick another path",
      ),
      /** Its name in the nav. @default 'For contractors' */
      navLabel: text.optional(),
      /** A second nav button to this page ("For Contractors"). */
      navButton: text.optional(),
      /**
       * Put the page at the top of a service group's menu ("Commercial")
       * rather than as its own nav link. Services join a group with their
       * `group`.
       */
      group: text.optional(),
    })
    .optional(),
  /** The About page's name in the nav ("Our Process"). @default 'About' */
  aboutNavLabel: text.optional(),
  /**
   * Their real projects: /projects and /projects/<slug>, in the nav. They
   * replace the starter's sample projects (and its sample gallery).
   */
  projects: z.array(projectSchema).min(1).max(24).optional(),
  /** The /projects page's words (estate look); the content schema checks them. */
  projectsPage: z
    .object({
      eyebrow: text.optional(),
      heading: text,
      text: text.optional(),
      order: z.array(text).optional(),
      cta: z.object({
        heading: text,
        text: text.optional(),
        label: text.optional(),
        secondaryCta: z.object({ label: text, href: text }).optional(),
      }),
      projectCta: z
        .record(
          z.string(),
          z.object({
            heading: text,
            text: text.optional(),
            cta: z.object({ label: text, href: text }).optional(),
            secondaryCta: z.object({ label: text, href: text }).optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  notes: z
    .object({
      sourceUrl: z.url().optional(),
      /** Anything Claude inferred rather than found — Casey checks these. */
      confirmOrCut: z.array(text).default([]),
    })
    .default({ confirmOrCut: [] }),
});

export const demoSchema = demoObject.superRefine((demo, ctx) => {
  if (!demo.areas) return;
  const seen = new Map();
  demo.areas.forEach((area, i) =>
    area.towns.forEach((town, j) => {
      if (!demo.serviceAreas.includes(town))
        ctx.addIssue({
          code: "custom",
          path: ["areas", i, "towns", j],
          message: `"${town}" isn't in serviceAreas — add it there or fix the spelling`,
        });
      if (seen.has(town))
        ctx.addIssue({
          code: "custom",
          path: ["areas", i, "towns", j],
          message: `"${town}" is already in the "${seen.get(town)}" region`,
        });
      seen.set(town, area.title);
    }),
  );
  for (const town of demo.serviceAreas)
    if (!seen.has(town))
      ctx.addIssue({
        code: "custom",
        path: ["areas"],
        message: `"${town}" is in serviceAreas but in no region — every town needs one`,
      });
});

/** Pages this preset installs, from this folder into src/pages. */
export const PAGES = [
  { from: "index.astro", to: "src/pages/index.astro" },
  { from: "contact.astro", to: "src/pages/contact.astro" },
  { from: "about.astro", to: "src/pages/about.astro" },
  /* Only with reviews. */
  {
    from: "reviews.astro",
    to: "src/pages/reviews.astro",
    when: (/** @type {any} */ demo) => demo.reviews.length > 0,
  },
];

/**
 * Nav and footer links a demo drops (the sample content stays unlinked).
 * `/projects` stays when demo.json has `projects`.
 */
export const HIDDEN_PATHS = ["/blog", "/case-studies", "/projects", "/gallery"];
