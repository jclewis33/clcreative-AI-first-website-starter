/**
 * Sanity testimonial rows → TestimonialData. Name, role, company and quote
 * stay stega-encoded (display); the rest is cleaned. Policy: ../source.ts.
 */
import { stegaClean } from "@sanity/client/stega";
import type { TESTIMONIALS_QUERY_RESULT } from "@/sanity/sanity.types";
import type { TestimonialData } from "@/lib/content/types";
import { sanityImage } from "./image";

type RawTestimonial = TESTIMONIALS_QUERY_RESULT[number];

export function toTestimonial(t: RawTestimonial): TestimonialData {
  return {
    id: t._id,
    name: t.name,
    role: t.role,
    company: t.company,
    quote: t.quote,
    avatar: sanityImage(t.avatar, t.name),
    website: stegaClean(t.website),
    stars: stegaClean(t.stars),
    featured: stegaClean(t.featured) ?? false,
    order: stegaClean(t.sortOrder),
  };
}
