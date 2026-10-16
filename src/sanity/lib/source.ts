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
  BlogPostPage,
  ContentOptions,
  ContentSource,
  CaseStudyPage,
  CaseStudySummary,
  CtaDefaults,
  FeaturedCaseStudy,
  GalleryEntry,
  ProjectCardData,
  ProjectPage,
  TestimonialData,
  TestimonialFilter,
} from "@/lib/content/types";
import {
  getBlogPostStaticPaths,
  getCaseStudyStaticPaths,
  getProjectStaticPaths,
  loadBlogPostPage,
  loadCaseStudies,
  loadCaseStudyPage,
  loadFeaturedCaseStudies,
  loadFeaturedProjects,
  loadGallery,
  loadProjectPage,
  loadProjects,
  loadSiteSettings,
  loadTestimonials,
} from "./page-data";
import { toBlogPostDetail, toBlogPostSummary } from "./map/blog";
import {
  toCaseStudyDetail,
  toCaseStudySummary,
  toFeaturedCaseStudy,
} from "./map/case-studies";
import { toBlogCta, toCtaSection } from "./map/cta";
import { toGalleryEntry, toProjectCard, toProjectDetail } from "./map/projects";
import { toTestimonial } from "./map/testimonials";

/* ── Shared ────────────────────────────────────────────────────────────── */

/** Type guard for dropping the nulls a mapper returns for unlinkable rows. */
export function isPresent<T>(value: T | null): value is T {
  return value !== null;
}

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

/* ── Projects + gallery ────────────────────────────────────────────────── */

async function getProjects(opts?: ContentOptions): Promise<ProjectCardData[]> {
  return (await loadProjects(opts)).map(toProjectCard).filter(isPresent);
}

async function getFeaturedProjects(
  opts?: ContentOptions,
): Promise<ProjectCardData[]> {
  return (await loadFeaturedProjects(opts))
    .map(toProjectCard)
    .filter(isPresent);
}

async function getProject(
  slug: string,
  opts?: ContentOptions,
): Promise<ProjectPage | null> {
  const raw = await loadProjectPage(slug, opts);
  if (!raw) return null;
  return {
    project: toProjectDetail(raw.project),
    relatedProjects: raw.relatedProjects.map(toProjectCard).filter(isPresent),
    ctaSection: toCtaSection(raw.defaultCtaSection),
  };
}

async function getGallery(opts?: ContentOptions): Promise<GalleryEntry[]> {
  return (await loadGallery(opts)).map(toGalleryEntry).filter(isPresent);
}

/* ── Case studies ──────────────────────────────────────────────────────── */

async function getCaseStudies(
  opts?: ContentOptions,
): Promise<CaseStudySummary[]> {
  return (await loadCaseStudies(opts))
    .map(toCaseStudySummary)
    .filter(isPresent);
}

async function getCaseStudy(
  slug: string,
  opts?: ContentOptions,
): Promise<CaseStudyPage | null> {
  const raw = await loadCaseStudyPage(slug, opts);
  if (!raw) return null;
  const study = toCaseStudyDetail(raw.study);
  const upNext = raw.allStudies
    .map(toCaseStudySummary)
    .filter(isPresent)
    .filter((entry) => entry.slug !== study.slug && entry.image)
    .slice(0, 2);
  return {
    study,
    upNext,
    ctaSection: toCtaSection(
      raw.study.ctaSectionOverride ?? raw.defaultCtaSection,
    ),
  };
}

async function getFeaturedCaseStudies(
  slugs: readonly string[],
  opts?: ContentOptions,
): Promise<FeaturedCaseStudy[]> {
  const found = (await loadFeaturedCaseStudies(slugs, opts))
    .map(toFeaturedCaseStudy)
    .filter(isPresent);
  // GROQ returns document order; the caller asked for this order.
  return slugs
    .map((slug) => found.find((s) => s.slug === slug))
    .filter((s): s is FeaturedCaseStudy => s !== undefined);
}

/* ── Blog ──────────────────────────────────────────────────────────────── */

async function getBlogPost(
  slug: string,
  opts?: ContentOptions,
): Promise<BlogPostPage | null> {
  const raw = await loadBlogPostPage(slug, opts);
  if (!raw) return null;
  return {
    post: toBlogPostDetail(raw.post),
    relatedPosts: raw.relatedPosts.map(toBlogPostSummary).filter(isPresent),
    manualRelatedPosts: raw.manualRelatedPosts
      .map(toBlogPostSummary)
      .filter(isPresent),
    cta: toBlogCta(raw.post.ctaOverride ?? raw.defaultCta),
    ctaSection: toCtaSection(
      raw.post.ctaSectionOverride ?? raw.defaultCtaSection,
    ),
  };
}

/* `satisfies` fails `npm run check` when a ContentSource function is
   missing here or its signature drifts. */
const sanitySource = {
  plainText,
  getCtaDefaults,
  getTestimonials,
  getTestimonialByName,
  getProjects,
  getFeaturedProjects,
  getProject,
  getGallery,
  getProjectStaticPaths,
  getCaseStudies,
  getCaseStudy,
  getFeaturedCaseStudies,
  getCaseStudyStaticPaths,
  getBlogPost,
  getBlogPostStaticPaths,
} satisfies ContentSource;

export default sanitySource;
