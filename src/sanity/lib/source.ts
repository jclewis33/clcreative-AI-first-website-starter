/**
 * The Sanity implementation of the content interface (src/lib/content).
 * src/lib/content/source.ts selects it; nothing else imports this file.
 *
 * Three layers, one direction:
 *   page-data.ts — GROQ fetching (loaders, placeholder-safe listings,
 *                  getStaticPaths helpers)
 *   map/*.ts     — query results → view models (the only code that uses
 *                  urlFor, hotspotPosition, stegaClean, Portable Text
 *                  serialisation and the TypeGen types)
 *   source.ts    — composes the two into the ContentSource functions
 *
 * Stega (Presentation draft mode). With a perspective cookie, loadQuery
 * stega-encodes strings so Presentation can draw click-to-edit overlays over
 * the text it renders. The mappers therefore clean ONLY values used as logic
 * or plumbing and leave display strings encoded:
 *   cleaned — slugs, URLs/hrefs, enums and categories, dates, numbers,
 *             booleans, image sources and alt text, CSS-ish values (aspect
 *             ratios, spacing, max widths, object-fit), SEO fields, derived
 *             text (FAQ answer text, read time, Markdown, plain-text
 *             fallbacks), and any string the mapper trims (trimming would
 *             corrupt the invisible payload)
 *   encoded — titles, descriptions, names, captions, quotes, labels and
 *             rich text (HTML strings and Portable Text keep their text)
 *   exception — every field of a CTA section is cleaned (see map/cta.ts)
 * Consumers that need a display string as data (a search data-attribute)
 * call `plainText()` from @/lib/content — stegaClean here.
 *
 * Public routes are prerendered with no cookie, so nothing is encoded there;
 * all of this only affects /preview/*.
 */
import { stegaClean } from "@sanity/client/stega";
import type {
  ContentOptions,
  ContentSource,
  CtaDefaults,
  TestimonialData,
  TestimonialFilter,
} from "@/lib/content/types";
import { loadSiteSettings, loadTestimonials } from "./page-data";
import { toBlogCta, toCtaSection } from "./map/cta";
import { toTestimonial } from "./map/testimonials";

/* ── Shared ────────────────────────────────────────────────────────────── */

function plainText<T extends string | null | undefined>(value: T): T {
  return stegaClean(value) as T;
}

/* ── CTAs ──────────────────────────────────────────────────────────────── */

async function getCtaDefaults(opts?: ContentOptions): Promise<CtaDefaults> {
  const settings = await loadSiteSettings(opts);
  return {
    blogCta: toBlogCta(settings?.defaultBlogCta),
    ctaSection: toCtaSection(settings?.defaultCtaSection),
  };
}

/* ── Testimonials ──────────────────────────────────────────────────────── */

async function getTestimonials(
  filter: TestimonialFilter = {},
  opts?: ContentOptions,
): Promise<TestimonialData[]> {
  const rows = await loadTestimonials(filter.featured ?? false, opts);
  const all = rows.map(toTestimonial);
  return filter.limit ? all.slice(0, filter.limit) : all;
}

async function getTestimonialByName(
  name: string,
  opts?: ContentOptions,
): Promise<TestimonialData | undefined> {
  const wanted = name.toLowerCase();
  // Names stay stega-encoded for display; compare the cleaned text.
  return (await getTestimonials({}, opts)).find(
    (t) => stegaClean(t.name)?.toLowerCase() === wanted,
  );
}

/* `satisfies` fails `npm run check` when a ContentSource function is
   missing here or its signature drifts. */
const sanitySource = {
  plainText,
  getCtaDefaults,
  getTestimonials,
  getTestimonialByName,
} satisfies ContentSource;

export default sanitySource;
