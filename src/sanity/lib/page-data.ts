/**
 * Shared per-page data loaders — ONE loader per content type, called by BOTH
 * the prerendered public route (build time, `published` perspective) and its
 * `/preview` SSR twin (request time, `drafts` perspective when the
 * Presentation cookie is present). Because the two trees share these loaders,
 * they can never drift apart.
 *
 * Loader contract:
 * - Fetch the single document FIRST (the related-content query depends on its
 *   categories/slug), then `Promise.all` everything independent.
 * - Related content is filtered in GROQ with a small buffer over the card
 *   slot — never by fetching the whole collection and filtering in JS.
 * - Return `null` for "not found"; the route decides how to respond
 *   (public routes never hit this for enumerated slugs; preview twins
 *   redirect to /404).
 * - `draftProps` comes from `getDraftModeProps(Astro)` — safe in both trees
 *   because it short-circuits on prerendered pages.
 *
 * This module also exports the `getStaticPaths` helpers for the public
 * routes. They MUST live here (an imported module) rather than in the route
 * frontmatter: Astro extracts `getStaticPaths` into its own module at build
 * time, so only imports are in scope inside it — sibling consts declared in
 * the same frontmatter are not (symptom: "<helper> is not defined" pointing
 * into an Astro-generated chunk).
 */
import { loadQuery } from "./load-query";
import { urlFor } from "./image";
import {
  BLOG_POST_QUERY,
  RELATED_BLOG_POSTS_QUERY,
  BLOG_SLUGS_QUERY,
  BLOG_CATEGORIES_QUERY,
  CASE_STUDY_QUERY,
  RELATED_CASE_STUDIES_QUERY,
  CASE_STUDY_SLUGS_QUERY,
  GLOSSARY_TERM_QUERY,
  GLOSSARY_TERMS_QUERY,
  GLOSSARY_SLUGS_QUERY,
  SITE_SETTINGS_QUERY,
} from "./queries";
import { SANITY_PROJECT_ID } from "@/config/site.shared.mjs";

/** Perspective forwarding — the return shape of `getDraftModeProps(Astro)`. */
export type DraftProps = { perspectiveCookie?: string | undefined };

/** Card-shape a post for BlogCard/BlogPostGrid (image URLs pre-built). */
function mapPostCard(p: any) {
  return {
    ...p,
    image: p.image ? urlFor(p.image).width(600).url() : p.image,
    authorAvatar: p.authorAvatar
      ? urlFor(p.authorAvatar).width(80).height(80).url()
      : undefined,
  };
}

/* ── Blog post ─────────────────────────────────────────────────────────────── */

export async function loadBlogPostPage(
  slug: string,
  draftProps: DraftProps = {},
) {
  const { data: post } = await loadQuery<any>({
    query: BLOG_POST_QUERY,
    params: { slug },
    ...draftProps,
  });
  if (!post) return null;

  const manualRelatedPosts = ((post.relatedPosts ?? []) as any[])
    .filter((p) => p?.slug)
    .map(mapPostCard);

  // Pre-lowercased for the case-insensitive GROQ category match.
  const categories = ((post.categories ?? []) as string[]).map((c) =>
    c.toLowerCase(),
  );
  const excludeSlugs = manualRelatedPosts.map((p) => p.slug);

  const [{ data: related }, { data: settings }] = await Promise.all([
    loadQuery<any[]>({
      query: RELATED_BLOG_POSTS_QUERY,
      params: { slug, categories, excludeSlugs },
      ...draftProps,
    }),
    loadQuery<any>({ query: SITE_SETTINGS_QUERY, ...draftProps }),
  ]);

  return {
    post,
    relatedPosts: (related ?? []).map(mapPostCard),
    manualRelatedPosts,
    defaultCta: settings?.defaultBlogCta ?? null,
    defaultCtaSection: settings?.defaultCtaSection ?? null,
  };
}

/* ── Case study ────────────────────────────────────────────────────────────── */

export async function loadCaseStudyPage(
  slug: string,
  draftProps: DraftProps = {},
) {
  const { data: study } = await loadQuery<any>({
    query: CASE_STUDY_QUERY,
    params: { slug },
    ...draftProps,
  });
  if (!study) return null;

  const [{ data: siblings }, { data: settings }] = await Promise.all([
    loadQuery<any[]>({
      query: RELATED_CASE_STUDIES_QUERY,
      params: { slug },
      ...draftProps,
    }),
    loadQuery<any>({ query: SITE_SETTINGS_QUERY, ...draftProps }),
  ]);

  return {
    study,
    allStudies: siblings ?? [],
    defaultCtaSection: settings?.defaultCtaSection ?? null,
  };
}

/* ── Glossary term ─────────────────────────────────────────────────────────── */

export async function loadGlossaryTermPage(
  slug: string,
  draftProps: DraftProps = {},
) {
  const { data: term } = await loadQuery<any>({
    query: GLOSSARY_TERM_QUERY,
    params: { slug },
    ...draftProps,
  });
  if (!term) return null;

  // The full (thin, slug+term-only projection) list is genuinely needed here:
  // the template builds alphabetical prev/next navigation across the whole
  // glossary. This is the one intentional whole-collection fetch.
  const [{ data: allTerms }, { data: settings }] = await Promise.all([
    loadQuery<any[]>({ query: GLOSSARY_TERMS_QUERY, ...draftProps }),
    loadQuery<any>({ query: SITE_SETTINGS_QUERY, ...draftProps }),
  ]);

  return {
    term,
    allTerms: allTerms ?? [],
    defaultCtaSection: settings?.defaultCtaSection ?? null,
  };
}

/* ── getStaticPaths helpers ────────────────────────────────────────────────── */

/** URL slug for a category display name — keep in sync with the category
 *  links emitted by the blog index/templates. */
export function categoryToSlug(category: string): string {
  return String(category).toLowerCase().replace(/\s+/g, "-");
}

/**
 * A fresh fork still carries the placeholder project id from
 * src/config/site.shared.mjs (real Sanity project ids are strictly
 * lowercase-alphanumeric), so its builds can't reach a dataset yet.
 */
function isPlaceholderSanityProject(): boolean {
  return !/^[a-z0-9]+$/.test(SANITY_PROJECT_ID);
}

/**
 * Run a build-time enumeration query for getStaticPaths.
 *
 * Fresh fork (placeholder project id): warn and return `null` so `npm run
 * build` stays green before `/setup` provisions Sanity — callers treat null
 * as "emit no pages at all" (distinct from an empty-but-reachable dataset).
 *
 * Real project: RETHROW. Swallowing a network error here would silently ship
 * a deploy with every blog/case-study/glossary page missing — previously
 * live URLs would 404. A loud build failure is the correct outcome.
 */
async function fetchStaticPathList<T>(
  query: string,
  label: string,
): Promise<T[] | null> {
  try {
    const { data } = await loadQuery<T[]>({ query });
    return (data ?? []).filter(Boolean);
  } catch (err) {
    if (isPlaceholderSanityProject()) {
      console.warn(
        `[page-data] Skipping ${label} static paths — Sanity project id is still the template placeholder.`,
      );
      return null;
    }
    throw err;
  }
}

/**
 * Build-safe query for PRERENDERED listing pages (blog/case-studies/glossary
 * indexes). Same policy as the static-path helpers: on a fresh fork
 * (placeholder project id) it warns and returns `fallback` so the page
 * renders its empty state and the build stays green; on a real project a
 * failed fetch rethrows and fails the build loudly.
 */
export async function loadPageQuery<T>({
  query,
  params,
  draftProps = {},
  fallback,
  label,
}: {
  query: string;
  params?: Record<string, unknown>;
  draftProps?: DraftProps;
  fallback: T;
  label: string;
}): Promise<T> {
  try {
    const { data } = await loadQuery<T>({ query, params, ...draftProps });
    return data ?? fallback;
  } catch (err) {
    if (isPlaceholderSanityProject()) {
      console.warn(
        `[page-data] ${label}: returning fallback — Sanity project id is still the template placeholder.`,
      );
      return fallback;
    }
    throw err;
  }
}

export async function getBlogPostStaticPaths() {
  const slugs = await fetchStaticPathList<string>(
    BLOG_SLUGS_QUERY,
    "blog post",
  );
  return (slugs ?? []).map((slug) => ({ params: { slug } }));
}

export async function getCaseStudyStaticPaths() {
  const slugs = await fetchStaticPathList<string>(
    CASE_STUDY_SLUGS_QUERY,
    "case study",
  );
  return (slugs ?? []).map((slug) => ({ params: { slug } }));
}

export async function getGlossaryTermStaticPaths() {
  const slugs = await fetchStaticPathList<string>(
    GLOSSARY_SLUGS_QUERY,
    "glossary term",
  );
  return (slugs ?? []).map((slug) => ({ params: { slug } }));
}

/**
 * One path per unique blog category plus the "all" archive. The display name
 * rides along as a prop so the page doesn't need to re-resolve slug → name.
 * When Sanity is unreachable on a fresh fork (null), emit NO paths at all —
 * not even "all" — because the page's own frontmatter queries would fail.
 */
export async function getBlogCategoryStaticPaths() {
  const categories = await fetchStaticPathList<string>(
    BLOG_CATEGORIES_QUERY,
    "blog category",
  );
  if (categories === null) return [];
  const seen = new Set<string>();
  const paths = [
    { params: { category: "all" }, props: { categoryName: "All" } },
  ];
  for (const name of categories) {
    const slug = categoryToSlug(name);
    if (slug === "all" || seen.has(slug)) continue;
    seen.add(slug);
    paths.push({ params: { category: slug }, props: { categoryName: name } });
  }
  return paths;
}
