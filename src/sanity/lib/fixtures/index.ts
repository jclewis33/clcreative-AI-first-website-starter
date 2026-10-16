/**
 * Parity fixtures — answers every query in ../queries.ts from the documents
 * in ./data.ts, so `PARITY_FIXTURES=1 npm run build` renders a populated
 * site with no Sanity project (hook: loadQuery in ../load-query.ts; diff
 * with scripts/compare-dist.mjs). The filtering mirrors each query's GROQ
 * closely enough for a handful of documents; it is not a GROQ engine.
 * An unknown query throws, so a new query cannot silently render empty in a
 * parity build — add its case here. `PARITY_FIXTURES=sample` answers the
 * same queries from documents derived from src/content instead (./sample.ts).
 */
import {
  BLOG_POSTS_QUERY,
  BLOG_POST_QUERY,
  BLOG_SLUGS_QUERY,
  RELATED_BLOG_POSTS_QUERY,
  BLOG_POSTS_BY_CATEGORY_QUERY,
  BLOG_CATEGORIES_QUERY,
  SITE_SETTINGS_QUERY,
  CASE_STUDIES_QUERY,
  CASE_STUDY_QUERY,
  CASE_STUDY_SLUGS_QUERY,
  RELATED_CASE_STUDIES_QUERY,
  TESTIMONIALS_QUERY,
  FEATURED_TESTIMONIALS_QUERY,
  FEATURED_CASE_STUDIES_QUERY,
  PROJECTS_QUERY,
  PROJECT_SLUGS_QUERY,
  PROJECT_QUERY,
  RELATED_PROJECTS_QUERY,
  FEATURED_PROJECTS_QUERY,
  GALLERY_QUERY,
} from "../queries";
import {
  CASE_STUDIES,
  INCOMPLETE_CASE_STUDY,
  INCOMPLETE_POST,
  INCOMPLETE_PROJECT,
  GALLERY,
  POSTS,
  PROJECTS,
  SETTINGS,
  TESTIMONIALS,
  type Doc,
  type FixtureDocs,
} from "./data";

type Params = Record<string, unknown>;

const PARITY_DOCS: FixtureDocs = {
  posts: POSTS,
  caseStudies: CASE_STUDIES,
  projects: PROJECTS,
  gallery: GALLERY,
  testimonials: TESTIMONIALS,
  settings: SETTINGS,
};

const newestFirst = (a: Doc, b: Doc) =>
  String(b.date).localeCompare(String(a.date));
const bySortOrder = (a: Doc, b: Doc) => a.sortOrder - b.sortOrder;

/** Card projection shared by BLOG_POSTS / RELATED / BY_CATEGORY / relatedPosts[]. */
function postCard(p: Doc, withPrimaryCategory = false): Doc {
  return {
    title: p.title,
    slug: p.slug,
    description: p.description,
    categories: p.categories,
    ...(withPrimaryCategory ? { primaryCategory: p.primaryCategory } : {}),
    image: p.image,
    imageAlt: p.imageAlt,
    author: p.author.name,
    authorAvatar: p.author.avatar,
    date: p.date,
    featured: p.featured,
  };
}

function postDocument(p: Doc, docs: FixtureDocs): Doc {
  return {
    title: p.title,
    slug: p.slug,
    description: p.description,
    categories: p.categories,
    image: p.image,
    imageAlt: p.imageAlt,
    author: p.author.name,
    authorAvatar: p.author.avatar,
    video: p.video,
    date: p.date,
    _updatedAt: p._updatedAt,
    featured: p.featured,
    body: p.body,
    ctaOverride: p.ctaOverride,
    ctaSectionOverride: p.ctaSectionOverride,
    faqs: p.faqs,
    relatedPosts: p.relatedSlugs.map((slug: string) =>
      postCard(docs.posts.find((x) => x.slug === slug)!),
    ),
    seo: p.seo,
  };
}

function caseStudyCard(c: Doc): Doc {
  return {
    title: c.title,
    slug: c.slug,
    description: c.description,
    client: c.client,
    categories: c.categories,
    industries: c.industries,
    image: c.image,
    imageAlt: c.imageAlt,
    date: c.date,
    featured: c.featured,
    comingSoon: c.comingSoon,
    liveUrl: c.liveUrl,
  };
}

function caseStudyDocument(c: Doc): Doc {
  return {
    ...caseStudyCard(c),
    _updatedAt: c._updatedAt,
    timeline: c.timeline,
    galleryImagesAlt: c.galleryImagesAlt,
    galleryImages: c.galleryImages,
    content: c.content,
    ctaSectionOverride: c.ctaSectionOverride,
    seo: c.seo,
  };
}

function projectCard(p: Doc): Doc {
  return {
    _id: p._id,
    title: p.title,
    slug: p.slug,
    category: p.category,
    location: p.location,
    heroImage: p.heroImage,
    imageAlt: p.imageAlt,
    heroImageMeta: p.heroImageMeta,
    featured: p.featured,
    completed: p.completed,
  };
}

function projectDocument(p: Doc): Doc {
  return {
    ...projectCard(p),
    _updatedAt: p._updatedAt,
    service: p.service,
    photos: p.photos,
    description: p.description,
    quote: p.quote,
    seoDescription: p.seoDescription,
  };
}

export function resolveFixture(
  query: string,
  params: Params,
  docs: FixtureDocs = PARITY_DOCS,
): unknown {
  const slug = params.slug as string | undefined;
  switch (query) {
    case BLOG_POSTS_QUERY:
      return [...docs.posts].sort(newestFirst).map((p) => postCard(p, true));
    case BLOG_POST_QUERY: {
      const post = docs.posts.find((p) => p.slug === slug);
      return post ? postDocument(post, docs) : null;
    }
    case BLOG_SLUGS_QUERY:
      return docs.posts.map((p) => p.slug);
    case RELATED_BLOG_POSTS_QUERY: {
      const wanted = (params.categories as string[]) ?? [];
      const exclude = (params.excludeSlugs as string[]) ?? [];
      return [...docs.posts]
        .filter(
          (p) =>
            p.slug !== slug &&
            !exclude.includes(p.slug) &&
            (p.categories ?? []).some((c: string) =>
              wanted.includes(c.toLowerCase()),
            ),
        )
        .sort(newestFirst)
        .slice(0, 6)
        .map((p) => postCard(p));
    }
    case BLOG_POSTS_BY_CATEGORY_QUERY:
      return [...docs.posts]
        .filter((p) => (p.categories ?? []).includes(params.category))
        .sort(newestFirst)
        .map((p) => postCard(p));
    case BLOG_CATEGORIES_QUERY:
      return [...new Set(docs.posts.flatMap((p) => p.categories ?? []))];
    case SITE_SETTINGS_QUERY:
      return docs.settings;
    case CASE_STUDIES_QUERY:
      return [...docs.caseStudies].sort(newestFirst).map(caseStudyCard);
    case CASE_STUDY_QUERY: {
      const study = docs.caseStudies.find((c) => c.slug === slug);
      return study ? caseStudyDocument(study) : null;
    }
    case CASE_STUDY_SLUGS_QUERY:
      return docs.caseStudies
        .filter((c) => c.comingSoon !== true)
        .map((c) => c.slug);
    case RELATED_CASE_STUDIES_QUERY:
      return [...docs.caseStudies]
        .filter((c) => c.slug !== slug && c.image?.asset)
        .sort(newestFirst)
        .slice(0, 4)
        .map(caseStudyCard);
    case FEATURED_CASE_STUDIES_QUERY: {
      const slugs = (params.slugs as string[]) ?? [];
      return docs.caseStudies
        .filter((c) => slugs.includes(c.slug))
        .map((c) => ({
          slug: c.slug,
          client: c.client,
          description: c.description,
          image: c.image,
          imageAlt: c.imageAlt,
        }));
    }
    case TESTIMONIALS_QUERY:
      return [...docs.testimonials].sort(bySortOrder);
    case FEATURED_TESTIMONIALS_QUERY:
      return docs.testimonials.filter((t) => t.featured).sort(bySortOrder);
    case PROJECTS_QUERY:
      return docs.projects.map(projectCard);
    case PROJECT_SLUGS_QUERY:
      return docs.projects.map((p) => p.slug);
    case PROJECT_QUERY: {
      const project = docs.projects.find((p) => p.slug === slug);
      return project ? projectDocument(project) : null;
    }
    case RELATED_PROJECTS_QUERY: {
      const others = docs.projects.filter((p) => p.slug !== slug);
      return [
        ...others.filter((p) => p.category === params.category),
        ...others.filter((p) => p.category !== params.category),
      ]
        .slice(0, 4)
        .map(projectCard);
    }
    case FEATURED_PROJECTS_QUERY:
      return docs.projects
        .filter((p) => p.featured)
        .slice(0, 3)
        .map(projectCard);
    case GALLERY_QUERY:
      return docs.gallery;
    default:
      throw new Error(
        `[parity fixtures] No fixture for query: ${query.slice(0, 80)}…`,
      );
  }
}

/** The parity dataset plus one half-filled draft per detail type. */
const PREVIEW_DOCS: FixtureDocs = {
  ...PARITY_DOCS,
  posts: [...POSTS, INCOMPLETE_POST],
  caseStudies: [...CASE_STUDIES, INCOMPLETE_CASE_STUDY],
  projects: [...PROJECTS, INCOMPLETE_PROJECT],
};

/* Draft-mode stand-in: Sanity's stega appends invisible characters to
   strings when a perspective cookie is present. stegaClean strips runs of
   these characters, exactly as it strips a real payload. */
const STEGA = "​‌‍﻿".repeat(3);
/** Keys real stega never encodes (its default filter) plus Portable Text internals. */
const NEVER_ENCODED = new Set([
  "slug",
  "href",
  "url",
  "website",
  "language",
  "style",
  "listItem",
  "marks",
  "type",
]);
/** getStaticPaths queries run at build time — never with a perspective. */
const BUILD_TIME_QUERIES = new Set<string>([
  BLOG_SLUGS_QUERY,
  CASE_STUDY_SLUGS_QUERY,
  PROJECT_SLUGS_QUERY,
  BLOG_CATEGORIES_QUERY,
]);

function draftEncode(value: unknown, key = ""): unknown {
  if (typeof value === "string") {
    const skip =
      key.startsWith("_") ||
      NEVER_ENCODED.has(key) ||
      /^(https?:\/\/|\/)/.test(value) ||
      /^\d{4}-\d{2}-\d{2}/.test(value);
    return skip ? value : value + STEGA;
  }
  if (Array.isArray(value)) return value.map((v) => draftEncode(v, key));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, draftEncode(v, k)]),
    );
  return value;
}

/** The sample dataset, derived once per build from src/content. */
let sampleDocs: Promise<FixtureDocs> | undefined;

/** Drop-in for `sanityClient.fetch(query, params, { filterResponse: false })`.
    Modes: "1" — the parity dataset; "preview" — draft-like data (stega-
    encoded strings + half-filled documents) for scripts/check-stega-leaks.mjs;
    "sample" — the Files sample content re-shaped as GROQ results
    (./sample.ts), for the Files-vs-Sanity equivalence check. */
export async function fixtureFetch(
  query: string,
  params: Params | undefined,
  mode: string,
) {
  if (mode === "1")
    return {
      result: resolveFixture(query, params ?? {}),
      resultSourceMap: undefined,
    };
  if (mode === "preview") {
    const result = resolveFixture(query, params ?? {}, PREVIEW_DOCS);
    return {
      result: BUILD_TIME_QUERIES.has(query) ? result : draftEncode(result),
      resultSourceMap: undefined,
    };
  }
  /* Gated on the build-time constant too, so every other mode's bundle
     folds this branch away and never links ./sample (and astro:content)
     into its module graph. Linking it measurably changed mode 1's output:
     a component's hoisted <script> landed beside a different instance on
     /components. */
  if (__PARITY_FIXTURES__ === "sample" && mode === "sample") {
    sampleDocs ??= import("./sample").then((m) => m.loadSampleDocs());
    return {
      result: resolveFixture(query, params ?? {}, await sampleDocs),
      resultSourceMap: undefined,
    };
  }
  throw new Error(`[parity fixtures] Unknown PARITY_FIXTURES mode "${mode}".`);
}
