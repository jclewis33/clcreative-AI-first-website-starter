/**
 * Parity fixtures — answers every query in ../queries.ts from the documents
 * in ./data.ts, so `PARITY_FIXTURES=1 npm run build` renders a populated
 * site with no Sanity project (hook: loadQuery in ../load-query.ts; diff
 * with scripts/compare-dist.mjs). The filtering mirrors each query's GROQ
 * closely enough for a handful of documents; it is not a GROQ engine.
 * An unknown query throws, so a new query cannot silently render empty in a
 * parity build — add its case here.
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
  GALLERY,
  POSTS,
  PROJECTS,
  SETTINGS,
  TESTIMONIALS,
  type Doc,
} from "./data";

type Params = Record<string, unknown>;

/** One complete fixture dataset. */
interface FixtureDocs {
  posts: Doc[];
  caseStudies: Doc[];
  projects: Doc[];
  gallery: Doc[];
  testimonials: Doc[];
  settings: Doc;
}

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

/** Drop-in for `sanityClient.fetch(query, params, { filterResponse: false })`. */
export async function fixtureFetch(
  query: string,
  params: Params | undefined,
  mode: string,
) {
  if (mode !== "1") {
    throw new Error(
      `[parity fixtures] Unknown PARITY_FIXTURES mode "${mode}".`,
    );
  }
  return {
    result: resolveFixture(query, params ?? {}),
    resultSourceMap: undefined,
  };
}
