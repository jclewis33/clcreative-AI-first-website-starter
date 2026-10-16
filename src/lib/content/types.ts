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
import type { ImageMetadata } from "astro";

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
}
