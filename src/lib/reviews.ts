import { getCollection, type CollectionEntry } from "astro:content";
import { SITE, type SiteRating } from "@/config/site";

/**
 * Reviews over the `reviews` content collection (src/content/reviews/*.json
 * — see src/content.config.ts): the parsed entry data plus its `id`.
 */
export type Review = CollectionEntry<"reviews">["data"] & { id: string };

interface ReviewOptions {
  /** A service id: reviews tagged with it come first, then the rest. */
  service?: string;
  /** Keep only the first N after sorting. */
  limit?: number;
}

const PLATFORM_LABELS: Record<Review["platform"], string> = {
  google: "Google",
  facebook: "Facebook",
  yelp: "Yelp",
  angi: "Angi",
  nextdoor: "Nextdoor",
  thumbtack: "Thumbtack",
  bbb: "BBB",
};

/**
 * The small line under a reviewer's name: the review's own `meta` when it
 * has one ("Google review · Polished concrete"), otherwise where it was
 * left ("Google review"). Empty when it has neither.
 */
export function reviewMeta(review: {
  meta?: string;
  platform?: Review["platform"];
}): string | undefined {
  if (review.meta) return review.meta;
  return review.platform
    ? `${PLATFORM_LABELS[review.platform]} review`
    : undefined;
}

/** Featured first, then `order`, then name so ties never shuffle. */
function byPriority(a: Review, b: Review): number {
  return (
    Number(b.featured) - Number(a.featured) ||
    a.order - b.order ||
    a.name.localeCompare(b.name)
  );
}

/**
 * Every review, best first. With `service`, the reviews tagged with that
 * service lead and the untagged and other-service reviews follow, each
 * group in the same order.
 */
export async function getReviews(opts: ReviewOptions = {}): Promise<Review[]> {
  const { service, limit } = opts;
  const all: Review[] = (await getCollection("reviews")).map((entry) => ({
    ...entry.data,
    id: entry.id,
  }));
  const tagged = (review: Review) =>
    Boolean(service && review.services?.some((ref) => ref.id === service));
  const sorted = all
    .sort(byPriority)
    .sort((a, b) => Number(tagged(b)) - Number(tagged(a)));
  return limit === undefined ? sorted : sorted.slice(0, Math.max(0, limit));
}

/**
 * The reviews a service page shows: every review tagged with that service,
 * in the usual order. A service with none tagged shows the site's own
 * (untagged) reviews instead, so every service page carries real reviews.
 * Reviews tagged for other services never appear here.
 */
export async function getServiceReviews(serviceId: string): Promise<Review[]> {
  const all = await getReviews({ service: serviceId });
  const own = all.filter((r) =>
    r.services?.some((ref) => ref.id === serviceId),
  );
  return own.length > 0 ? own : all.filter((r) => !r.services?.length);
}

/** The business's public rating (`SITE.rating`), or null when there is none. */
export function getRating(): SiteRating | null {
  return SITE.rating;
}
