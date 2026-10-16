/**
 * The content interface's types — the view models every page, template,
 * section and component renders from, and the ContentSource contract each
 * backend implements (src/sanity/lib/source.ts today).
 *
 * Nothing in here knows which backend is active. Consumers import these
 * through `@/lib/content`; backend code imports this file directly.
 *
 * Nullability mirrors what a backend can genuinely hand over: Sanity drafts
 * are incomplete until an editor fills them in, so most display fields are
 * `string | null`. Listings drop entries that cannot be linked to.
 */
import type { ImageMetadata, MDXInstance } from "astro";
import type { ContentBlock } from "@/components/case-study/types";
import type { TocItem } from "@/lib/toc";
export type { ContentBlock, TocItem };

/** A compiled MDX body's `Content` component. */
type MdxContent = MDXInstance<Record<string, never>>["Content"];

/* ── Images ────────────────────────────────────────────────────────────── */

/** Focal point for object-position: `x` and `y` are 0–100, or centred. */
export type ImagePosition = { x: number; y: number } | "center";

/** Output format a CDN-resized image can be asked for. */
export type ImageFormat = "jpg" | "png" | "webp";

/** A size request for `imageSrc()` / `imageUrl()`. */
export interface ImageUrlOptions {
  width?: number;
  height?: number;
  format?: ImageFormat;
}

/**
 * One image, whichever backend it came from. A local image is
 * `ImageMetadata` (Astro's pipeline sizes it); a CMS image is a URL string
 * plus a `url()` builder that resizes it on the CDN. Never read `src` to get
 * a sized URL — call `imageSrc()` / `imageUrl()` / `sizedImage()`.
 */
export interface ContentImage {
  /** The image: local metadata, or a URL string. */
  src: ImageMetadata | string;
  /** Alt text — always a string, empty only for a genuinely decorative image. */
  alt: string;
  /** Intrinsic width, when known (drives `sizedImage()` heights). */
  width?: number;
  /** Intrinsic height, when known. */
  height?: number;
  /** Focal point, for `<Visual position>`. */
  position?: ImagePosition;
  /** CDN resizer — set by CMS backends; absent for local images. */
  url?: (options: ImageUrlOptions) => string;
}

/* ── Shared ────────────────────────────────────────────────────────────── */

/**
 * Per-call options. `perspectiveCookie` switches a CMS backend to its draft
 * perspective; only the /preview/* twins pass it (getDraftModeProps(Astro)).
 * Backends without drafts ignore it.
 */
export interface ContentOptions {
  perspectiveCookie?: string | undefined;
}

/** One `getStaticPaths` entry for a `[slug]` route. */
export interface SlugPath {
  params: { slug: string };
}

/** One `getStaticPaths` entry for /blog/category/[category]. */
export interface CategoryPath {
  params: { category: string };
  props: { categoryName: string };
}

/* ── CTAs ──────────────────────────────────────────────────────────────── */

/** The image shape a blog CTA uses. */
export type BlogCtaAspectRatio = "portrait" | "square" | "landscape";

/** The end-of-post call to action (also used inline in a post body). */
export interface BlogCtaData {
  heading: string | null;
  body: string | null;
  image: ContentImage | null;
  /** Null renders as portrait. */
  aspectRatio: BlogCtaAspectRatio | null;
  linkUrl: string | null;
  /** Null renders as "Learn more". */
  linkLabel: string | null;
}

/** The bottom-of-page CTA section. */
export interface CtaSectionData {
  heading: string | null;
  text: string | null;
  primaryButtonLabel: string | null;
  primaryButtonHref: string | null;
  secondaryButtonLabel: string | null;
  secondaryButtonHref: string | null;
  backgroundImage: ContentImage | null;
  /** 0–100; null renders as 80. */
  overlayStrength: number | null;
}

/** The site-wide CTA defaults a page falls back to. */
export interface CtaDefaults {
  blogCta: BlogCtaData | null;
  ctaSection: CtaSectionData | null;
}

/* ── Testimonials ──────────────────────────────────────────────────────── */

/** One testimonial. */
export interface TestimonialData {
  id: string;
  name: string | null;
  role: string | null;
  company: string | null;
  quote: string | null;
  avatar: ContentImage | null;
  website: string | null;
  /** 1–5; null hides the stars. */
  stars: number | null;
  featured: boolean;
  order: number | null;
}

/** Which testimonials `getTestimonials()` returns. */
export interface TestimonialFilter {
  /** Only those marked featured. */
  featured?: boolean;
  /** At most this many, after the source's ordering. */
  limit?: number;
}

/* ── Projects + gallery ────────────────────────────────────────────────── */

/** A project as a card renders it. */
export interface ProjectCardData {
  id: string;
  title: string;
  /** The detail page, e.g. "/projects/smith-kitchen". */
  href: string;
  /** Category value (see src/config/projects.ts); "" when unset. */
  category: string;
  categoryLabel: string;
  /** As the editor wrote it, e.g. "Springfield, IL"; "" when not set. */
  location: string;
  /** Card-size hero photo. */
  image: ContentImage | undefined;
}

/** One project photo and its optional stage label. */
export interface ProjectPhoto {
  image: ContentImage;
  label: string | null;
}

/** The customer quote on a project. */
export interface ProjectQuote {
  text: string;
  name: string | null;
}

/** Everything the project detail page renders. */
export interface ProjectDetail {
  slug: string;
  title: string;
  category: string;
  categoryLabel: string;
  location: string;
  service: string;
  /** ISO date; null when not set. */
  completed: string | null;
  hero: ContentImage | null;
  photos: ProjectPhoto[];
  /** The write-up as HTML ("" when there is none). */
  descriptionHtml: string;
  /** The write-up as plain text — the SEO description fallback. */
  descriptionText: string;
  quote: ProjectQuote | null;
  seoDescription: string | null;
}

/** `getProject()`: the project, related cards and the CTA section. */
export interface ProjectPage {
  project: ProjectDetail;
  relatedProjects: ProjectCardData[];
  ctaSection: CtaSectionData | null;
}

/** One gallery photo. */
export interface GalleryEntry {
  id: string;
  image: ContentImage;
  caption: string;
  category: string;
  categoryLabel: string;
  location: string;
  /** "" when unlinked, or when the linked project was deleted. */
  projectTitle: string;
}

/* ── SEO ───────────────────────────────────────────────────────────────── */

/** Per-document SEO overrides; every field optional. */
export interface SeoFields {
  metaTitle: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: ContentImage | null;
}

/* ── Case studies ──────────────────────────────────────────────────────── */

/** A case study as a listing card renders it. */
export interface CaseStudySummary {
  slug: string;
  title: string;
  description: string | null;
  client: string | null;
  categories: string[];
  industries: string[];
  image: ContentImage | null;
  date: string | null;
  featured: boolean;
  /** Not published yet: the card links to `liveUrl` instead. */
  comingSoon: boolean;
  liveUrl: string | null;
}

/** Everything the case study detail page renders. */
export interface CaseStudyDetail {
  slug: string;
  /** Null only in an unfinished draft (the page shows a fallback). */
  title: string | null;
  description: string | null;
  client: string | null;
  categories: string[];
  industries: string[];
  image: ContentImage | null;
  date: string | null;
  updatedAt: string | null;
  featured: boolean;
  comingSoon: boolean;
  timeline: string | null;
  liveUrl: string | null;
  /** The hero slider. */
  gallery: ContentImage[];
  /** The flexible body, ready for CaseStudyBlockRenderer. */
  blocks: ContentBlock[];
  seo: SeoFields | null;
}

/** `getCaseStudy()`: the study, up to two "Up next" cards, the CTA section. */
export interface CaseStudyPage {
  study: CaseStudyDetail;
  upNext: CaseStudySummary[];
  ctaSection: CtaSectionData | null;
}

/** A card in the CaseStudyFeatured strip. */
export interface FeaturedCaseStudy {
  slug: string;
  client: string | null;
  description: string | null;
  image: ContentImage | null;
}

/* ── Blog ──────────────────────────────────────────────────────────────── */

/** A post as a card or listing renders it. */
export interface BlogPostSummary {
  slug: string;
  title: string;
  description: string | null;
  categories: string[];
  /** The listing section a post belongs to; else its first category. */
  primaryCategory: string | null;
  image: ContentImage | null;
  author: string | null;
  authorAvatar: ContentImage | null;
  date: string | null;
  featured: boolean;
}

/**
 * A post body in whatever form its backend keeps it; `<BlogBody>` renders
 * either. Portable Text blocks arrive with each h2 carrying `_slug`.
 */
export type BlogBodyContent =
  | { kind: "portable-text"; blocks: Array<{ _type: string; _key?: string }> }
  | { kind: "mdx"; Content: MdxContent };

/** One FAQ under a post. */
export interface FaqItem {
  question: string | null;
  /** The answer, rendered to HTML. */
  answerHtml: string;
  /** The answer as plain text (JSON-LD). */
  answerText: string;
}

/** Everything the blog post page renders. */
export interface BlogPostDetail {
  slug: string;
  /** Null only in an unfinished draft. */
  title: string | null;
  description: string | null;
  categories: string[];
  image: ContentImage | null;
  author: string | null;
  authorAvatar: ContentImage | null;
  date: string | null;
  updatedAt: string | null;
  featured: boolean;
  /** A YouTube or Vimeo URL shown instead of the hero image. */
  video: string | null;
  body: BlogBodyContent;
  /** The h2s, for the table of contents. */
  headings: TocItem[];
  /** Minutes, at least 1. */
  readTime: number;
  faqs: FaqItem[];
  seo: SeoFields | null;
}

/** `getBlogPost()`: the post, related posts and the resolved CTAs. */
export interface BlogPostPage {
  post: BlogPostDetail;
  /** Same-category posts, newest first (the template takes three). */
  relatedPosts: BlogPostSummary[];
  /** Editor-picked related posts. */
  manualRelatedPosts: BlogPostSummary[];
  /** The post's CTA override, else the site default. */
  cta: BlogCtaData | null;
  /** The post's CTA-section override, else the site default. */
  ctaSection: CtaSectionData | null;
}

/* ── The contract ──────────────────────────────────────────────────────── */

/**
 * What every content backend implements. Declare an implementation with
 * `satisfies ContentSource` so `npm run check` fails on any drift.
 */
export interface ContentSource {
  /**
   * Strip any invisible editor-tooling encoding from a string (Sanity's
   * stega, present only in draft preview). Identity for other backends.
   * Use it before a display string is compared or written into a search
   * data-attribute.
   */
  plainText<T extends string | null | undefined>(value: T): T;
  /** The site-wide CTA defaults (Site Settings in Sanity). */
  getCtaDefaults(opts?: ContentOptions): Promise<CtaDefaults>;
  /** Testimonials in their editor-set order; filter by `featured`, cap with `limit`. */
  getTestimonials(
    filter?: TestimonialFilter,
    opts?: ContentOptions,
  ): Promise<TestimonialData[]>;
  /** The testimonial whose name matches (case-insensitive), if any. */
  getTestimonialByName(
    name: string,
    opts?: ContentOptions,
  ): Promise<TestimonialData | undefined>;
  /** Every project as a card, newest first. */
  getProjects(opts?: ContentOptions): Promise<ProjectCardData[]>;
  /** Up to three featured projects. */
  getFeaturedProjects(opts?: ContentOptions): Promise<ProjectCardData[]>;
  /** One project with up to three related cards; null when not found. */
  getProject(slug: string, opts?: ContentOptions): Promise<ProjectPage | null>;
  /** Every gallery photo, newest first. */
  getGallery(opts?: ContentOptions): Promise<GalleryEntry[]>;
  /** getStaticPaths for /projects/[slug]. */
  getProjectStaticPaths(): Promise<SlugPath[]>;
  /** Every case study as a card, newest first (coming-soon included). */
  getCaseStudies(opts?: ContentOptions): Promise<CaseStudySummary[]>;
  /** One case study with "Up next" and its CTA section; null when not found. */
  getCaseStudy(
    slug: string,
    opts?: ContentOptions,
  ): Promise<CaseStudyPage | null>;
  /** The studies with these slugs, in this order (missing ones dropped). */
  getFeaturedCaseStudies(
    slugs: readonly string[],
    opts?: ContentOptions,
  ): Promise<FeaturedCaseStudy[]>;
  /** getStaticPaths for /case-studies/[slug] (coming-soon excluded). */
  getCaseStudyStaticPaths(): Promise<SlugPath[]>;
  /** One post with related posts and resolved CTAs; null when not found. */
  getBlogPost(
    slug: string,
    opts?: ContentOptions,
  ): Promise<BlogPostPage | null>;
  /** getStaticPaths for /blog/[slug]. */
  getBlogPostStaticPaths(): Promise<SlugPath[]>;
  /** Every post as a card, newest first. */
  getBlogPosts(opts?: ContentOptions): Promise<BlogPostSummary[]>;
  /** Posts carrying this category (display name, exact match), newest first. */
  getBlogPostsByCategory(
    category: string,
    opts?: ContentOptions,
  ): Promise<BlogPostSummary[]>;
  /** Every category name in use, de-duplicated. */
  getBlogCategories(opts?: ContentOptions): Promise<string[]>;
  /** getStaticPaths for /blog/category/[category] (one per category, plus "all"). */
  getBlogCategoryStaticPaths(): Promise<CategoryPath[]>;
}
