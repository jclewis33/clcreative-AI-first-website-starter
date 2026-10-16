/**
 * JSON-LD structured data builders for blog posts and case studies. Each
 * function returns a plain object (or @graph array) that a
 * `<script type="application/ld+json">` tag can stringify.
 *
 * All functions expect `siteUrl` to be an absolute origin (e.g.
 * "https://www.example.com") — pass `Astro.site!.toString().replace(/\/$/, "")`
 * from calling templates.
 */

import { SITE } from "@/config/site";
import {
  resolveImageUrl,
  plainText,
  type BlogPostDetail,
  type CaseStudyDetail,
  type ContentImage,
} from "@/lib/content";

const ORG_NAME = SITE.name;
const ORG_LOGO_PATH = SITE.logoPath;

function absoluteUrl(siteUrl: string, path: string): string {
  if (!path) return siteUrl;
  if (/^https?:\/\//.test(path)) return path;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Absolute URL of a content image at 1200 wide — CDN URLs pass through,
    local files get the site origin. */
async function contentImageUrl(
  image: ContentImage | null,
  siteUrl: string,
): Promise<string | null> {
  const url = await resolveImageUrl(image, { width: 1200 });
  return url ? absoluteUrl(siteUrl, url) : null;
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

/**
 * BreadcrumbList from an explicit trail (Home first, current page last). Use
 * when a URL segment has no page of its own, so the list never points at a
 * 404. `path` is site-relative.
 */
export function breadcrumbListJsonLd(
  items: { name: string; path: string }[],
  siteUrl: string = SITE.url,
) {
  if (items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: `${siteUrl}${crumb.path === "/" ? "" : crumb.path}`,
    })),
  };
}

/* ── Layer 2: opt-in per-page Service (+ optional FAQ) schema ───────── */

export interface ServiceFaqOptions {
  /** Absolute page URL (used for @id and url). */
  pageUrl: string;
  /** schema.org `serviceType`, e.g. "Consulting". */
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

/*
 * Draft-mode values arrive stega-encoded (see the policy in
 * src/sanity/lib/source.ts). Structured data is plumbing, not an editing
 * surface, so the builders below clean every content string they emit.
 */

/**
 * Build a VideoObject node for a YouTube URL. Returns null if the URL
 * isn't a recognizable YouTube link.
 */
function youtubeVideoObject(
  videoUrl: string,
  post: {
    title?: string | null;
    description?: string | null;
    date?: string | null;
  },
): any {
  const id = youtubeVideoId(videoUrl);
  if (!id) return null;

  return {
    "@type": "VideoObject",
    name: plainText(post.title) || "Video",
    description: plainText(post.description || post.title) || "",
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
export async function blogPostJsonLd(
  post: BlogPostDetail,
  siteUrl: string,
): Promise<any> {
  const pageUrl = `${siteUrl}/blog/${post.slug}`;
  const imageUrl = await contentImageUrl(post.image, siteUrl);

  const blogPosting: any = {
    "@type": "BlogPosting",
    "@id": pageUrl,
    headline: plainText(post.title),
    description: plainText(post.description),
    ...(imageUrl && { image: imageUrl }),
    datePublished: toIsoDateTime(post.date),
    dateModified: toIsoDateTime(post.updatedAt) || toIsoDateTime(post.date),
    author: {
      "@type": "Person",
      name: plainText(post.author) || ORG_NAME,
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

  const faqs = post.faqs.filter((f) => f.question && f.answerText);
  if (faqs.length > 0) {
    nodes.push({
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: plainText(f.question),
        acceptedAnswer: {
          "@type": "Answer",
          text: f.answerText.replace(/\s+/g, " ").trim(),
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
export async function caseStudyJsonLd(
  cs: CaseStudyDetail,
  siteUrl: string,
): Promise<any> {
  const pageUrl = `${siteUrl}/case-studies/${cs.slug}`;
  const csImageUrl = await contentImageUrl(cs.image, siteUrl);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": pageUrl,
    headline: plainText(cs.title),
    description: plainText(cs.description),
    ...(csImageUrl && { image: csImageUrl }),
    datePublished: toIsoDateTime(cs.date),
    dateModified: toIsoDateTime(cs.updatedAt) || toIsoDateTime(cs.date),
    articleSection: "Case Study",
    author: publisher(siteUrl),
    publisher: publisher(siteUrl),
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
    ...(cs.client && {
      about: { "@type": "Organization", name: plainText(cs.client) },
    }),
  };
}
