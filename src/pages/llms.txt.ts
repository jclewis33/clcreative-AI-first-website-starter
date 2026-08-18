/**
 * `/llms.txt` — an LLM-friendly index of the site (llmstxt.org format).
 *
 * Prerendered to `dist/llms.txt` at build time. Static marketing pages come
 * from the `PAGES` registry in `src/data/site-structure.ts`; blog posts, case
 * studies, and glossary terms are pulled fresh from Sanity on every build — so
 * this file stays in sync with published content automatically, like the sitemap.
 */

import type { APIRoute } from "astro";
import { loadQuery } from "@/sanity/lib/load-query";
import {
  BLOG_POSTS_QUERY,
  CASE_STUDIES_QUERY,
  GLOSSARY_TERMS_QUERY,
} from "@/sanity/lib/queries";
import { SITE_URL, SITE_NAME, SITE_SUMMARY } from "@/config/site";
import {
  MAIN_PAGES,
  SERVICE_PAGES,
  LOCATION_PAGES,
  INDEX_PAGES,
  OPTIONAL_PAGES,
  type StaticPage,
} from "@/data/site-structure";
import { isNoindexRoute } from "@/config/seo.shared.mjs";

import type {
  BLOG_POSTS_QUERY_RESULT,
  CASE_STUDIES_QUERY_RESULT,
  GLOSSARY_TERMS_QUERY_RESULT,
} from "@/sanity/sanity.types";

export const prerender = true;

/** `/contact` → `${SITE_URL}/contact`; `/` → site root. */
function url(path: string): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

/* Belt-and-braces: a page kept out of search results has no business in the
   LLM index either. The registry should never contain one, but if an entry is
   added there, the same predicate the sitemap / robots.txt / noindex meta use
   filters it here too — one fact, now five surfaces. */
function indexable(p: StaticPage): boolean {
  return !isNoindexRoute(p.path);
}

function staticLine(p: StaticPage): string {
  return `- [${p.title}](${url(p.path)}): ${p.desc}`;
}

/**
 * A document is only listable once it has both a title and a slug: without a
 * slug there is no URL to link, and without a title the line would read
 * `- [null](…)`. Sanity leaves both nullable until an editor fills them in.
 */
function listable<T extends { title: string | null; slug: string | null }>(
  d: T,
): d is T & { title: string; slug: string } {
  return !!d.title && !!d.slug;
}

function dynamicLine(
  title: string,
  path: string,
  desc?: string | null,
): string {
  const line = `- [${title}](${SITE_URL}${path})`;
  return desc ? `${line}: ${desc}` : line;
}

export const GET: APIRoute = async () => {
  // Tolerate an empty or unreachable dataset (e.g. a fresh fork before
  // `/setup`) — the file still renders the static page index.
  const [posts, caseStudies, glossary] = await Promise.all([
    loadQuery({ query: BLOG_POSTS_QUERY })
      .then((r) => r.data)
      .catch((): BLOG_POSTS_QUERY_RESULT => []),
    loadQuery({ query: CASE_STUDIES_QUERY })
      .then((r) => r.data)
      .catch((): CASE_STUDIES_QUERY_RESULT => []),
    loadQuery({ query: GLOSSARY_TERMS_QUERY })
      .then((r) => r.data)
      .catch((): GLOSSARY_TERMS_QUERY_RESULT => []),
  ]);

  // Mirror the sitemap rule: hide case studies marked "coming soon".
  const publishedCaseStudies = (caseStudies ?? []).filter(
    (c) => c.comingSoon !== true,
  );

  // Only emit static groups that have pages (services/locations are empty in
  // the bare starter).
  const staticGroups: Array<[string, StaticPage[]]> = [
    ["Main Pages", MAIN_PAGES],
    ["Services", SERVICE_PAGES],
    ["Locations", LOCATION_PAGES],
    ["Sections", INDEX_PAGES],
  ];

  const sections: string[] = [
    `# ${SITE_NAME}`,
    `> ${SITE_SUMMARY}`,
    ...staticGroups
      .filter(([, pages]) => pages.length)
      .map(
        ([heading, pages]) =>
          `## ${heading}\n${pages.filter(indexable).map(staticLine).join("\n")}`,
      ),
  ];

  const listableCaseStudies = publishedCaseStudies.filter(listable);
  if (listableCaseStudies.length) {
    sections.push(
      `## Case Studies\n${listableCaseStudies
        .map((c) =>
          dynamicLine(c.title, `/case-studies/${c.slug}`, c.description),
        )
        .join("\n")}`,
    );
  }

  const listablePosts = (posts ?? []).filter(listable);
  if (listablePosts.length) {
    sections.push(
      `## Blog\n${listablePosts
        .map((p) => dynamicLine(p.title, `/blog/${p.slug}`, p.description))
        .join("\n")}`,
    );
  }

  const listableTerms = (glossary ?? []).filter(
    (g): g is typeof g & { term: string; slug: string } => !!g.term && !!g.slug,
  );
  if (listableTerms.length) {
    sections.push(
      `## Glossary\n${listableTerms
        .map((g) =>
          dynamicLine(g.term, `/glossary/${g.slug}`, g.shortDefinition),
        )
        .join("\n")}`,
    );
  }

  sections.push(
    `## Optional\n${OPTIONAL_PAGES.filter(indexable).map(staticLine).join("\n")}`,
  );

  const body = sections.join("\n\n") + "\n";

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
