/**
 * Testimonial data helpers.
 *
 * Wraps the Sanity GROQ queries so pages can fetch testimonials with a
 * single import and optional filtering.
 *
 * Usage:
 * ```astro
 * import { getTestimonials } from "../sanity/lib/testimonials";
 *
 * // All testimonials (sorted by sortOrder)
 * const all = await getTestimonials();
 *
 * // Featured only
 * const featured = await getTestimonials({ featured: true });
 *
 * // First 6
 * const limited = await getTestimonials({ limit: 6 });
 *
 * // Featured, max 3
 * const heroTestimonials = await getTestimonials({ featured: true, limit: 3 });
 * ```
 */

import { loadQuery } from "./load-query";
import {
  TESTIMONIALS_QUERY,
  FEATURED_TESTIMONIALS_QUERY,
} from "./queries";

export interface TestimonialData {
  _id: string;
  name: string;
  role?: string;
  company?: string;
  quote: string;
  avatar?: any;
  website?: string;
  stars?: number;
  featured?: boolean;
  sortOrder?: number;
}

interface GetTestimonialsOptions {
  /** Only return testimonials marked as featured in Sanity. */
  featured?: boolean;
  /** Max number of testimonials to return. Applied after Sanity ordering. */
  limit?: number;
  /**
   * The draft-mode perspective cookie value, read from `Astro.cookies` by the
   * calling page via `getDraftModeProps()`. When present the wrapper fetches
   * drafts with stega encoding so Presentation-tool overlays work.
   */
  perspectiveCookie?: string;
}

/**
 * Fetch testimonials from Sanity.
 *
 * - No options → all testimonials, sorted by `sortOrder`
 * - `{ featured: true }` → only featured testimonials
 * - `{ limit: 6 }` → first 6 by sort order
 * - `{ featured: true, limit: 3 }` → first 3 featured
 */
export async function getTestimonials(
  options: GetTestimonialsOptions = {},
): Promise<TestimonialData[]> {
  const { featured = false, limit, perspectiveCookie } = options;

  const query = featured ? FEATURED_TESTIMONIALS_QUERY : TESTIMONIALS_QUERY;
  const { data } = await loadQuery<TestimonialData[]>({
    query,
    perspectiveCookie,
  });
  const testimonials = data ?? [];

  return limit ? testimonials.slice(0, limit) : testimonials;
}

/**
 * Fetch a single testimonial by name (case-insensitive match).
 *
 * Returns `undefined` if no match is found.
 *
 * ```astro
 * const testimonial = await getTestimonialByName("Tom Connally");
 * ```
 */
export async function getTestimonialByName(
  name: string,
  options: { perspectiveCookie?: string } = {},
): Promise<TestimonialData | undefined> {
  const all = await getTestimonials({
    perspectiveCookie: options.perspectiveCookie,
  });
  return all.find(
    (t) => t.name.toLowerCase() === name.toLowerCase(),
  );
}
