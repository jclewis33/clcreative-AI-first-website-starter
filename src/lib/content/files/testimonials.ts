/**
 * Testimonials (src/content/testimonials/*.json) → TestimonialData, in
 * `order` (lowest first, ties by id).
 */
import type { TestimonialData, TestimonialFilter } from "@/lib/content/types";
import { loadContent, type Entry } from "./entries";
import { localImage } from "./shared";

function toTestimonial(entry: Entry<"testimonials">): TestimonialData {
  const d = entry.data;
  return {
    id: entry.id,
    name: d.name,
    role: d.role ?? null,
    company: d.company ?? null,
    quote: d.quote,
    // The schema requires avatarAlt with an avatar; the name only satisfies the type.
    avatar: d.avatar ? localImage(d.avatar, d.avatarAlt ?? d.name) : null,
    website: d.website ?? null,
    stars: d.stars ?? null,
    featured: d.featured,
    order: d.order,
  };
}

export async function getTestimonials(
  filter: TestimonialFilter = {},
): Promise<TestimonialData[]> {
  const { testimonials } = await loadContent();
  const ordered = testimonials
    .filter((t) => !filter.featured || t.data.featured)
    .sort((a, b) => a.data.order - b.data.order || a.id.localeCompare(b.id))
    .map(toTestimonial);
  return filter.limit ? ordered.slice(0, filter.limit) : ordered;
}

export async function getTestimonialByName(
  name: string,
): Promise<TestimonialData | undefined> {
  const wanted = name.toLowerCase();
  return (await getTestimonials()).find(
    (t) => t.name?.toLowerCase() === wanted,
  );
}
