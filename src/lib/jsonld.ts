/**
 * JSON-LD structured data builders for blog posts, case studies, and
 * glossary terms. Each function returns a plain object (or @graph array)
 * that a `<script type="application/ld+json">` tag can stringify.
 *
 * All functions expect `siteUrl` to be an absolute origin (e.g.
 * "https://www.example.com") — pass `Astro.site!.toString().replace(/\/$/, "")`
 * from calling templates.
 */

import { urlFor } from "../sanity/lib/image";
import { SITE } from "../config/site";

const ORG_NAME = SITE.name;
const ORG_LOGO_PATH = SITE.logoPath;
const DEFAULT_OG_IMAGE_PATH = SITE.ogImagePath;

function absoluteUrl(siteUrl: string, path: string): string {
  if (!path) return siteUrl;
  if (/^https?:\/\//.test(path)) return path;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function toImageUrl(image: any, siteUrl: string): string | null {
  if (!image) return null;
  try {
    return urlFor(image).width(1200).url();
  } catch {
    if (typeof image === "string") return absoluteUrl(siteUrl, image);
    return null;
  }
}

/**
 * Normalize a date (either `YYYY-MM-DD` or a full ISO string) into an ISO
 * 8601 datetime with timezone. Google requires this for datePublished /
 * dateModified. Sanity `date` fields return `YYYY-MM-DD` which is rejected.
 */
function toIsoDateTime(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  // Already a full datetime with timezone — pass through.
  if (/T\d{2}:\d{2}/.test(value)) return value;
  // Plain date — pin to UTC midday to avoid off-by-one from TZ conversion.
  return `${value}T12:00:00Z`;
}

function publisher(siteUrl: string) {
  return {
    "@type": "Organization",
    name: ORG_NAME,
    url: siteUrl,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl(siteUrl, ORG_LOGO_PATH),
    },
  };
}

/* ── Layer 1: baseline schema (auto-emitted on every page) ─────────── */

/**
 * Sitewide LocalBusiness anchor node. Rendered once on every page from
 * BaseLayout; per-page Service schemas reference it via `provider.@id`.
 * Built entirely from `src/config/site.ts`.
 */
export function localBusinessJsonLd(siteUrl: string = SITE.url) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${siteUrl}/#localbusiness`,
    name: SITE.name,
    description: SITE.localBusinessDescription,
    url: siteUrl,
    image: `${siteUrl}${SITE.ogImagePath}`,
    logo: `${siteUrl}${SITE.logoPath}`,
    email: SITE.email,
    telephone: SITE.phone.e164,
    priceRange: SITE.priceRange,
    founder: { "@type": "Person", name: SITE.founder },
    address: {
      "@type": "PostalAddress",
      addressLocality: SITE.address.locality,
      addressRegion: SITE.address.region,
      addressCountry: SITE.address.country,
    },
    areaServed: SITE.areaServed.map((a) => ({ "@type": a.type, name: a.name })),
    sameAs: SITE.sameAs,
  };
}

/**
 * Generic WebPage node for the current page. Anchors the page in the
 * graph and links it to the sitewide LocalBusiness via `isPartOf`.
 */
export function webPageJsonLd(
  opts: { url: string; title: string; description?: string },
  siteUrl: string = SITE.url,
) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${opts.url}#webpage`,
    url: opts.url,
    name: opts.title,
    ...(opts.description && { description: opts.description }),
    isPartOf: { "@id": `${siteUrl}/#localbusiness` },
  };
}

/** Title-case a URL slug segment, e.g. `web-design` → `Web Design`. */
function titleizeSegment(segment: string): string {
  return segment
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/**
 * BreadcrumbList derived from a pathname. Returns `null` for the homepage
 * (no breadcrumb when there are no path segments).
 */
export function breadcrumbJsonLd(pathname: string, siteUrl: string = SITE.url) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const itemListElement = [
    { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
    ...segments.map((seg, i) => ({
      "@type": "ListItem",
      position: i + 2,
      name: titleizeSegment(seg),
      item: `${siteUrl}/${segments.slice(0, i + 1).join("/")}`,
    })),
  ];

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement,
  };
}

/* ── Layer 2: opt-in per-page Service (+ optional FAQ) schema ───────── */

export interface ServiceFaqOptions {
  /** Absolute page URL (used for @id and url). */
  pageUrl: string;
  /** schema.org `serviceType`, e.g. "Web Design". */
  serviceType: string;
  /** Service `name`. */
  name: string;
  /** Service `description`. */
  description: string;
  /** Optional geographic service area (location pages). */
  areaServed?: Array<{ type: "City" | "AdministrativeArea"; name: string }>;
  /** Optional audience (industry/service pages). */
  audience?: { type?: "BusinessAudience" | "Audience"; audienceType: string };
  /** Optional FAQs — appends an FAQPage node when non-empty. */
  faqs?: Array<{ question: string; answer: string }>;
}

/**
 * Build a Service (+ optional FAQPage) `@graph` for a marketing page.
 * `provider.@id` always matches the sitewide LocalBusiness node, so the
 * "must match character-for-character" footgun is gone.
 */
export function serviceFaqJsonLd(
  opts: ServiceFaqOptions,
  siteUrl: string = SITE.url,
): { "@context": "https://schema.org"; "@graph": unknown[] } {
  const service: Record<string, unknown> = {
    "@type": "Service",
    "@id": `${opts.pageUrl}#service`,
    serviceType: opts.serviceType,
    name: opts.name,
    description: opts.description,
    url: opts.pageUrl,
    provider: {
      "@id": `${siteUrl}/#localbusiness`,
      name: SITE.name,
    },
    ...(opts.areaServed &&
      opts.areaServed.length > 0 && {
        areaServed: opts.areaServed.map((a) => ({
          "@type": a.type,
          name: a.name,
        })),
      }),
    ...(opts.audience && {
      audience: {
        "@type": opts.audience.type ?? "BusinessAudience",
        audienceType: opts.audience.audienceType,
      },
    }),
  };

  const graph: unknown[] = [service];

  if (opts.faqs && opts.faqs.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${opts.pageUrl}#faq`,
      mainEntity: opts.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

/**
 * Extract a YouTube video ID from any common URL format, or null if not
 * recognizable. Supports watch URLs, shorts, and youtu.be short links.
 */
function youtubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return u.pathname.replace(/^\//, "") || null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      if (u.pathname.startsWith("/shorts/")) {
        return u.pathname.split("/")[2] || null;
      }
      if (u.pathname.startsWith("/embed/")) {
        return u.pathname.split("/")[2] || null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Build a VideoObject node for a YouTube URL. Returns null if the URL
 * isn't a recognizable YouTube link.
 */
function youtubeVideoObject(
  videoUrl: string,
  post: { title?: string; description?: string; date?: string }
): any {
  const id = youtubeVideoId(videoUrl);
  if (!id) return null;

  return {
    "@type": "VideoObject",
    name: post.title || "Video",
    description: post.description || post.title || "",
    thumbnailUrl: [
      `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
      `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    ],
    uploadDate: toIsoDateTime(post.date) || new Date().toISOString(),
    embedUrl: `https://www.youtube.com/embed/${id}`,
    contentUrl: `https://www.youtube.com/watch?v=${id}`,
  };
}

/**
 * Build JSON-LD for a blog post. Returns an @graph array containing:
 * - BlogPosting (always)
 * - VideoObject (when post.video is a YouTube URL)
 * - FAQPage (when post.faqs is non-empty)
 */
export function blogPostJsonLd(post: any, siteUrl: string): any {
  const pageUrl = `${siteUrl}/blog/${post.slug}`;
  const imageUrl = toImageUrl(post.image, siteUrl);

  const blogPosting: any = {
    "@type": "BlogPosting",
    "@id": pageUrl,
    headline: post.title,
    description: post.description,
    ...(imageUrl && { image: imageUrl }),
    datePublished: toIsoDateTime(post.date),
    dateModified: toIsoDateTime(post._updatedAt) || toIsoDateTime(post.date),
    author: {
      "@type": "Person",
      name: post.author || ORG_NAME,
      url: siteUrl,
    },
    publisher: publisher(siteUrl),
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
  };

  const nodes: any[] = [blogPosting];

  if (post.video) {
    const video = youtubeVideoObject(post.video, post);
    if (video) nodes.push(video);
  }

  if (Array.isArray(post.faqs) && post.faqs.length > 0) {
    nodes.push({
      "@type": "FAQPage",
      mainEntity: post.faqs
        .filter((f: any) => f?.question && f?.answer)
        .map((f: any) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: String(f.answer).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
          },
        })),
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}

/**
 * Build JSON-LD for a case study page. Uses schema.org/Article.
 */
export function caseStudyJsonLd(cs: any, siteUrl: string): any {
  const pageUrl = `${siteUrl}/case-studies/${cs.slug}`;
  const imageUrl = toImageUrl(cs.image, siteUrl);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": pageUrl,
    headline: cs.title,
    description: cs.description,
    ...(imageUrl && { image: imageUrl }),
    datePublished: toIsoDateTime(cs.date),
    dateModified: toIsoDateTime(cs._updatedAt) || toIsoDateTime(cs.date),
    articleSection: "Case Study",
    author: publisher(siteUrl),
    publisher: publisher(siteUrl),
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
    ...(cs.client && {
      about: { "@type": "Organization", name: cs.client },
    }),
  };
}

/**
 * Build JSON-LD for a glossary term page. Returns an @graph containing:
 * - Article (primary — needed for Google rich-result eligibility)
 * - DefinedTerm (semantic type, supplementary)
 *
 * Google doesn't surface DefinedTerm on its own, so we lead with Article
 * and keep DefinedTerm alongside for schema.org consumers.
 */
export function glossaryTermJsonLd(term: any, siteUrl: string): any {
  const pageUrl = `${siteUrl}/glossary/${term.slug}`;
  const description = term.shortDefinition || term.term;

  const article = {
    "@type": "Article",
    "@id": pageUrl,
    headline: term.term,
    description,
    image: absoluteUrl(siteUrl, DEFAULT_OG_IMAGE_PATH),
    articleSection: "Glossary",
    datePublished: toIsoDateTime(term._createdAt),
    dateModified:
      toIsoDateTime(term._updatedAt) || toIsoDateTime(term._createdAt),
    author: publisher(siteUrl),
    publisher: publisher(siteUrl),
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
  };

  const definedTerm = {
    "@type": "DefinedTerm",
    name: term.term,
    description,
    url: pageUrl,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: "Astro Starter Glossary",
      url: `${siteUrl}/glossary`,
    },
  };

  return {
    "@context": "https://schema.org",
    "@graph": [article, definedTerm],
  };
}
