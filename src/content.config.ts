import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import ICONS from "./data/service-icons.json";

/**
 * Content collections — build-time, local files.
 *
 * `services`: one JSON file per service page in src/content/services/. The
 * filename is the URL slug (/services/<filename>). Photos sit in
 * src/content/services/images/ and are referenced by relative path
 * ("./images/kitchen-hero.webp"); `image()` imports and checks them, so a
 * missing photo fails the build. Field guide and copy rules:
 * .claude/skills/component-api/references/service-pages.md.
 */

const iconNames = Object.keys(ICONS) as [
  keyof typeof ICONS,
  ...(keyof typeof ICONS)[],
];

/** Alt text is required and never empty (CLAUDE.md: no alt=""). */
const alt = z.string().min(1, "Alt text can't be empty");

const services = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/services" }),
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
          z.object({
            text: z.string().min(1),
            name: z.string().min(1),
            meta: z.string().optional(),
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

export const collections = { services };
