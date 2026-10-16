import { defineCollection, reference } from "astro:content";
import { file, glob } from "astro/loaders";
import { z } from "astro/zod";
import ICONS from "./data/service-icons.json";
import {
  BLOG_CATEGORIES,
  BLOG_CTA_ASPECT_RATIOS,
  BLOG_SECTION_CATEGORIES,
} from "./config/blog";
import {
  CASE_STUDY_ASPECT_RATIOS,
  CASE_STUDY_CATEGORIES,
  CASE_STUDY_INDUSTRIES,
  CASE_STUDY_MAX_WIDTHS,
  SECTION_SPACINGS,
} from "./config/case-studies";
import {
  PROJECT_CATEGORY_VALUES,
  PROJECT_PHOTO_LABELS,
} from "./config/projects";
import { checked, type RefTarget } from "./lib/content/checks";
import { renderRichText } from "./lib/content/markdown";

/**
 * Content collections — build-time, local files, read through @/lib/content
 * (the Files backend, src/lib/content/files/). How to add and edit entries:
 * .claude/skills/content-files/SKILL.md (services:
 * .claude/skills/component-api/references/service-pages.md).
 *
 * - One file per entry. Its filename is its id and URL slug, in
 *   lowercase-kebab-case (enforced below). `gallery` and `settings` are
 *   single files (`file()` loader).
 * - Photos sit in an `images/` folder beside the entries, referenced by
 *   relative path ("./images/kitchen-hero.webp"); `image()` imports them.
 *   Every image carries non-empty alt text.
 * - Rich text inside JSON is a Markdown string, rendered here once, at
 *   content sync (`richText`): entries carry `{ markdown, html, text }`.
 * - `checked()` (src/lib/content/checks.ts) fails the sync when an image
 *   file, a referenced entry or an MDX body's inline `<BlogCta id>` target
 *   is missing, naming the file and the field — Astro itself only logs a
 *   dangling reference.
 * - Enums come from src/config/, which the Sanity schema reads too.
 */

/** Where each folder-based collection lives (repo-relative). */
const DIR = {
  services: "src/content/services",
  blog: "src/content/blog",
  authors: "src/content/authors",
  blogCtas: "src/content/ctas/blog",
  ctaSections: "src/content/ctas/section",
  caseStudies: "src/content/case-studies",
  projects: "src/content/projects",
  testimonials: "src/content/testimonials",
} as const;

/** A reference target: entries are `<dir>/<id>.json` (or `.mdx`). */
const json = (dir: string): RefTarget => ({ dir, ext: "json" });
const mdx = (dir: string): RefTarget => ({ dir, ext: "mdx" });

/**
 * A glob loader whose entry ids are the filenames, rejected unless they are
 * lowercase-kebab-case. Astro's default would slugify them — so
 * "Deck Building.json" would build /services/deck-building while links
 * built from the filename pointed at "/services/Deck Building" (a 404). A
 * "slug" key inside a file is ignored for the same reason. `example`
 * finishes the error message.
 */
function filesIn(dir: string, ext: "json" | "mdx", example: string) {
  return glob({
    pattern: `*.${ext}`,
    base: `./${dir}`,
    generateId: ({ entry }) => {
      const id = entry.slice(0, -(ext.length + 1));
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
        throw new Error(
          `"${entry}" in ${dir}/ must be named in lowercase-kebab-case, e.g. ${example}.`,
        );
      }
      return id;
    },
  });
}

/* ── Shared field rules ────────────────────────────────────────────────── */

const iconNames = Object.keys(ICONS) as [
  keyof typeof ICONS,
  ...(keyof typeof ICONS)[],
];

/** Alt text is required and never empty (CLAUDE.md: no alt=""). */
const alt = z.string().min(1, "Alt text can't be empty");

/** A calendar date. In MDX frontmatter it must be quoted (YAML would
    otherwise read it as a Date). */
const isoDate = z
  .string({ error: 'Write the date as quoted text, e.g. "2026-03-01"' })
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Use the format "YYYY-MM-DD", e.g. "2026-03-01"',
  );

/** A site path ("/contact") or a full URL. */
const href = z
  .string()
  .regex(
    /^(\/|https?:\/\/|mailto:|tel:)/,
    'Use a site path like "/contact" or a full URL like "https://example.com"',
  );

/** A full web address. */
const webUrl = z.url({
  protocol: /^https?$/,
  error: 'Use a full URL starting with "https://"',
});

/** Markdown, rendered at content sync to { markdown, html, text }. */
const richText = z.string().min(1).transform(renderRichText);

/** Per-page SEO overrides; every field optional. */
const seo = <I extends z.ZodType>(ogImage: I) =>
  z
    .object({
      metaTitle: z.string().min(1).optional(),
      metaDescription: z.string().min(1).optional(),
      ogTitle: z.string().min(1).optional(),
      ogDescription: z.string().min(1).optional(),
      ogImage: ogImage.optional(),
    })
    .optional();

/* ── Collections ───────────────────────────────────────────────────────── */

/* `services`: one JSON file per service page; the filename is the URL slug
   (/services/<filename>), used as-is by both the page route and the nav
   (src/lib/service-nav.ts). Field guide and copy rules:
   .claude/skills/component-api/references/service-pages.md. */
const services = defineCollection({
  loader: checked(
    filesIn(
      DIR.services,
      "json",
      '"deck-building.json" — the filename becomes the URL /services/<name>',
    ),
  ),
  schema: ({ image }) =>
    z.object({
      /** Service name — page title base, breadcrumb, card title. */
      title: z.string().min(1),
      /** Shorter label for the nav dropdown and footer (defaults to title). */
      navLabel: z.string().optional(),
      /** Sort order in the nav, footer and related cards (lower first). */
      order: z.number().default(100),
      seoTitle: z.string().min(1),
      seoDescription: z.string().min(1).max(160),
      /** Text on this service's card in "related services". */
      cardText: z.string().min(1),
      cardImage: image(),
      cardImageAlt: alt,
      icon: z.enum(iconNames).optional(),
      hero: z.object({
        eyebrow: z.string().optional(),
        /** HTML allowed; wrap accent words in <strong>. */
        heading: z.string().min(1),
        text: z.string().min(1),
        image: image(),
        imageAlt: alt,
      }),
      /** Exactly four proof points for the StatsStrip. */
      highlights: z
        .array(z.object({ value: z.string().min(1), label: z.string().min(1) }))
        .length(4),
      scope: z.object({
        heading: z.string().min(1),
        intro: z.string().optional(),
        items: z
          .array(
            z.object({
              title: z.string().min(1),
              text: z.string().min(1),
              icon: z.enum(iconNames).optional(),
            }),
          )
          .min(1),
      }),
      included: z.object({
        heading: z.string().min(1),
        text: z.string().optional(),
        items: z.array(z.string().min(1)).min(1),
        images: z.array(z.object({ src: image(), alt })).length(2),
      }),
      /** Optional: falls back to DEFAULT_PROCESS in src/data/process.ts. */
      process: z
        .object({
          heading: z.string().min(1),
          steps: z
            .array(
              z.object({ title: z.string().min(1), text: z.string().min(1) }),
            )
            .min(1),
        })
        .optional(),
      reviews: z
        .array(
          z
            .object({
              text: z.string().min(1),
              name: z.string().min(1),
              meta: z.string().optional(),
              /** Optional reviewer photo; needs avatarAlt. */
              avatar: image().optional(),
              avatarAlt: alt.optional(),
            })
            .superRefine((review, ctx) => {
              if (review.avatar && !review.avatarAlt)
                ctx.addIssue({
                  code: "custom",
                  path: ["avatarAlt"],
                  message:
                    'Add avatarAlt (usually the reviewer\'s name) — "avatar" is set, and every image needs alt text.',
                });
            }),
        )
        .optional(),
      faqs: z
        .array(
          z.object({ question: z.string().min(1), answer: z.string().min(1) }),
        )
        .min(2),
      cta: z.object({
        heading: z.string().min(1),
        text: z.string().optional(),
      }),
    }),
});

/** Blog posts: MDX — frontmatter here, the body is the post. */
const blog = defineCollection({
  loader: checked(
    filesIn(
      DIR.blog,
      "mdx",
      '"spring-checklist.mdx" — the filename becomes the URL /blog/<name>',
    ),
    {
      refs: {
        author: json(DIR.authors),
        relatedPosts: mdx(DIR.blog),
        cta: json(DIR.blogCtas),
        ctaSection: json(DIR.ctaSections),
      },
      bodyCtas: json(DIR.blogCtas),
    },
  ),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1),
      /** Card excerpt and meta description. */
      description: z.string().min(1).max(300),
      date: isoDate,
      /** Last meaningful edit (JSON-LD dateModified); defaults to `date`. */
      updated: isoDate.optional(),
      categories: z.array(z.enum(BLOG_CATEGORIES)).min(1),
      /** The /blog section this post appears under (else its first category). */
      primaryCategory: z.enum(BLOG_SECTION_CATEGORIES).optional(),
      image: image(),
      imageAlt: alt,
      author: reference("authors"),
      featured: z.boolean().default(false),
      /** A YouTube watch or youtu.be URL shown instead of the hero image
          (Shorts and Vimeo links do not embed here; use <VideoEmbed> in
          the body). */
      video: webUrl.optional(),
      /** Up to three hand-picked related posts. */
      relatedPosts: z.array(reference("blog")).max(3).default([]),
      faqs: z
        .array(z.object({ question: z.string().min(1), answer: richText }))
        .default([]),
      /** Overrides the site default end-of-post CTA (settings.json). */
      cta: reference("blogCtas").optional(),
      /** Overrides the site default CTA section (settings.json). */
      ctaSection: reference("ctaSections").optional(),
      seo: seo(image()),
    }),
});

const authors = defineCollection({
  loader: checked(
    filesIn(
      DIR.authors,
      "json",
      '"jane-doe.json" — posts name it as author: "jane-doe"',
    ),
  ),
  schema: ({ image }) =>
    z.object({
      name: z.string().min(1),
      avatar: image().optional(),
      /** Defaults to the author's name. */
      avatarAlt: alt.optional(),
    }),
});

const blogCtas = defineCollection({
  loader: checked(
    filesIn(
      DIR.blogCtas,
      "json",
      '"free-estimate.json" — posts name it as cta: "free-estimate"',
    ),
  ),
  schema: ({ image }) =>
    z.object({
      heading: z.string().min(1),
      body: z.string().min(1).max(280),
      image: image(),
      imageAlt: alt,
      aspectRatio: z.enum(BLOG_CTA_ASPECT_RATIOS).default("portrait"),
      linkUrl: href,
      linkLabel: z.string().min(1),
    }),
});

const ctaSections = defineCollection({
  loader: checked(
    filesIn(
      DIR.ctaSections,
      "json",
      '"book-a-call.json" — pages name it as ctaSection: "book-a-call"',
    ),
  ),
  schema: ({ image }) =>
    z
      .object({
        heading: z.string().min(1),
        text: z.string().min(1).max(280),
        primaryButtonLabel: z.string().min(1),
        primaryButtonHref: href,
        secondaryButtonLabel: z.string().min(1).optional(),
        secondaryButtonHref: href.optional(),
        backgroundImage: image(),
        imageAlt: alt,
        /** Darkness of the overlay on the photo, 0–100 (default 80). */
        overlayStrength: z.number().int().min(0).max(100).optional(),
      })
      .superRefine((cta, ctx) => {
        if (
          Boolean(cta.secondaryButtonLabel) !== Boolean(cta.secondaryButtonHref)
        )
          ctx.addIssue({
            code: "custom",
            path: [
              cta.secondaryButtonLabel
                ? "secondaryButtonHref"
                : "secondaryButtonLabel",
            ],
            message:
              "Set both secondaryButtonLabel and secondaryButtonHref, or neither.",
          });
      }),
});

/** Site-wide defaults: one object keyed "site". */
const settings = defineCollection({
  loader: checked(file("src/content/settings.json"), {
    refs: {
      defaultBlogCta: json(DIR.blogCtas),
      defaultCtaSection: json(DIR.ctaSections),
    },
  }),
  schema: z.object({
    defaultBlogCta: reference("blogCtas").optional(),
    defaultCtaSection: reference("ctaSections").optional(),
  }),
});

const caseStudies = defineCollection({
  loader: checked(
    filesIn(
      DIR.caseStudies,
      "json",
      '"smith-kitchen.json" — the filename becomes the URL /case-studies/<name>',
    ),
    { refs: { ctaSection: json(DIR.ctaSections) } },
  ),
  schema: ({ image }) => {
    const spacing = {
      sectionSpacing: z.enum(SECTION_SPACINGS).optional(),
      sectionSpacingTop: z.enum(SECTION_SPACINGS).optional(),
      sectionSpacingBottom: z.enum(SECTION_SPACINGS).optional(),
    };
    const ratio = {
      aspectRatio: z.enum(CASE_STUDY_ASPECT_RATIOS).optional(),
      customAspectRatio: z
        .string()
        .regex(
          /^\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?$/,
          'Write a ratio as "width / height", e.g. "4 / 3"',
        )
        .optional(),
    };
    /* The flexible body: one block per layout, the same fields as the
       Sanity blocks (src/sanity/schemaTypes/caseStudy.ts). */
    const block = z.discriminatedUnion("type", [
      z.object({
        type: z.literal("richText"),
        body: richText,
        maxWidth: z.enum(CASE_STUDY_MAX_WIDTHS).optional(),
        ...spacing,
      }),
      z.object({
        type: z.literal("richTextLeft"),
        body: richText,
        maxWidth: z.enum(CASE_STUDY_MAX_WIDTHS).optional(),
        ...spacing,
      }),
      z.object({
        type: z.literal("richTextColumns"),
        body: richText,
        ...spacing,
      }),
      z.object({
        type: z.literal("richTextWithImage"),
        body: richText,
        image: image(),
        imageAlt: alt,
        transparent: z.boolean().optional(),
        objectFit: z.enum(["cover", "contain"]).optional(),
        ...ratio,
        ...spacing,
      }),
      z.object({
        type: z.literal("fullWidthImage"),
        image: image(),
        imageAlt: alt,
        transparent: z.boolean().optional(),
        ...ratio,
        ...spacing,
      }),
      z.object({
        type: z.literal("imageGrid"),
        images: z
          .array(
            z.object({
              image: image(),
              alt,
              transparent: z.boolean().optional(),
            }),
          )
          .min(2),
        ...ratio,
        ...spacing,
      }),
      z.object({
        type: z.literal("stats"),
        items: z
          .array(
            z.object({ value: z.string().min(1), label: z.string().min(1) }),
          )
          .min(1),
        ...spacing,
      }),
    ]);
    return z
      .object({
        title: z.string().min(1),
        description: z.string().min(1).max(300),
        client: z.string().min(1),
        image: image(),
        imageAlt: alt,
        date: isoDate,
        updated: isoDate.optional(),
        featured: z.boolean().default(false),
        /** Not published yet: the card links to liveUrl, no page is built. */
        comingSoon: z.boolean().default(false),
        categories: z.array(z.enum(CASE_STUDY_CATEGORIES)).min(1),
        industries: z.array(z.enum(CASE_STUDY_INDUSTRIES)).min(1),
        timeline: z.string().min(1).optional(),
        liveUrl: webUrl.optional(),
        /** The hero slider. */
        galleryImages: z.array(z.object({ src: image(), alt })).default([]),
        content: z.array(block).default([]),
        ctaSection: reference("ctaSections").optional(),
        seo: seo(image()),
      })
      .superRefine((study, ctx) => {
        if (study.comingSoon && !study.liveUrl)
          ctx.addIssue({
            code: "custom",
            path: ["liveUrl"],
            message:
              "Add liveUrl — a coming-soon case study links to the live site instead of a page.",
          });
      });
  },
});

const projects = defineCollection({
  loader: checked(
    filesIn(
      DIR.projects,
      "json",
      '"smith-kitchen.json" — the filename becomes the URL /projects/<name>',
    ),
  ),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1),
      category: z.enum(PROJECT_CATEGORY_VALUES),
      /** As it should read, e.g. "Springfield, IL". */
      location: z.string().min(1).optional(),
      /** The service the job used, e.g. "Kitchen remodeling". */
      service: z.string().min(1).optional(),
      /** The write-up (Markdown). */
      description: richText.optional(),
      quote: z
        .object({
          text: z.string().min(1),
          name: z.string().min(1).optional(),
        })
        .optional(),
      heroImage: image(),
      imageAlt: alt,
      photos: z
        .array(
          z.object({
            src: image(),
            alt,
            label: z.enum(PROJECT_PHOTO_LABELS).optional(),
          }),
        )
        .default([]),
      completed: isoDate.optional(),
      featured: z.boolean().default(false),
      /** Meta description; else the start of the write-up. */
      seoDescription: z.string().min(1).optional(),
    }),
});

/** Gallery: one array in src/content/gallery.json; each item needs an id. */
const gallery = defineCollection({
  loader: checked(file("src/content/gallery.json"), {
    refs: { project: json(DIR.projects) },
  }),
  schema: ({ image }) =>
    z.object({
      image: image(),
      alt,
      caption: z.string().min(1).max(60),
      category: z.enum(PROJECT_CATEGORY_VALUES),
      location: z.string().min(1).optional(),
      /** The project the photo belongs to (adds its title to the caption). */
      project: reference("projects").optional(),
      added: isoDate,
    }),
});

const testimonials = defineCollection({
  loader: checked(
    filesIn(
      DIR.testimonials,
      "json",
      '"jane-doe.json" — <SingleTestimonial name> looks testimonials up by name',
    ),
  ),
  schema: ({ image }) =>
    z
      .object({
        name: z.string().min(1),
        role: z.string().min(1).optional(),
        company: z.string().min(1).optional(),
        quote: z.string().min(1),
        avatar: image().optional(),
        /** Required with an avatar — usually the person's name. */
        avatarAlt: alt.optional(),
        website: webUrl.optional(),
        stars: z.number().int().min(1).max(5).optional(),
        featured: z.boolean().default(false),
        /** Sort order, lowest first. */
        order: z.number().int().min(0).default(100),
      })
      .superRefine((t, ctx) => {
        if (t.avatar && !t.avatarAlt)
          ctx.addIssue({
            code: "custom",
            path: ["avatarAlt"],
            message:
              'Add avatarAlt (usually the person\'s name) — "avatar" is set, and every image needs alt text.',
          });
      }),
});

export const collections = {
  services,
  blog,
  authors,
  blogCtas,
  ctaSections,
  settings,
  caseStudies,
  projects,
  gallery,
  testimonials,
};
