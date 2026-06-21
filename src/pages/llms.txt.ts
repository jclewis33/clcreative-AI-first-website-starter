/**
 * `/llms.txt` — an LLM-friendly index of the site (llmstxt.org format).
 *
 * Prerendered to `dist/llms.txt` at build time. Static marketing pages come
 * from the `PAGES` registry in `src/data/site-structure.ts`; blog posts, case
 * studies, and glossary terms are pulled fresh from Sanity on every build — so
 * this file stays in sync with published content automatically, like the sitemap.
 */

import type { APIRoute } from "astro";
import { loadQuery } from "../sanity/lib/load-query";
import {
  BLOG_POSTS_QUERY,
  CASE_STUDIES_QUERY,
  GLOSSARY_TERMS_QUERY,
} from "../sanity/lib/queries";
import { SITE_URL, SITE_NAME, SITE_SUMMARY } from "../config/site";
import {
  MAIN_PAGES,
  SERVICE_PAGES,
  LOCATION_PAGES,
  INDEX_PAGES,
  OPTIONAL_PAGES,
  type StaticPage,
} from "../data/site-structure";

export const prerender = true;

interface BlogPost {
  title: string;
  slug: string;
  description?: string;
}
interface CaseStudy {
  title: string;
  slug: string;
  description?: string;
  comingSoon?: boolean;
}
interface GlossaryTerm {
  term: string;
  slug: string;
  shortDefinition?: string;
}

/** `/contact` → `${SITE_URL}/contact`; `/` → site root. */
function url(path: string): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

function staticLine(p: StaticPage): string {
  return `- [${p.title}](${url(p.path)}): ${p.desc}`;
}

function dynamicLine(title: string, path: string, desc?: string): string {
  const line = `- [${title}](${SITE_URL}${path})`;
  return desc ? `${line}: ${desc}` : line;
}

export const GET: APIRoute = async () => {
  // Tolerate an empty or unreachable dataset (e.g. a fresh fork before
  // `/setup`) — the file still renders the static page index.
  const [posts, caseStudies, glossary] = await Promise.all([
    loadQuery<BlogPost[]>({ query: BLOG_POSTS_QUERY })
      .then((r) => r.data)
      .catch(() => [] as BlogPost[]),
    loadQuery<CaseStudy[]>({ query: CASE_STUDIES_QUERY })
      .then((r) => r.data)
      .catch(() => [] as CaseStudy[]),
    loadQuery<GlossaryTerm[]>({ query: GLOSSARY_TERMS_QUERY })
      .then((r) => r.data)
      .catch(() => [] as GlossaryTerm[]),
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
      .map(([heading, pages]) => `## ${heading}\n${pages.map(staticLine).join("\n")}`),
  ];

  if (publishedCaseStudies.length) {
    sections.push(
      `## Case Studies\n${publishedCaseStudies
        .map((c) => dynamicLine(c.title, `/case-studies/${c.slug}`, c.description))
        .join("\n")}`,
    );
  }

  if (posts?.length) {
    sections.push(
      `## Blog\n${posts
        .map((p) => dynamicLine(p.title, `/blog/${p.slug}`, p.description))
        .join("\n")}`,
    );
  }

  if (glossary?.length) {
    sections.push(
      `## Glossary\n${glossary
        .map((g) => dynamicLine(g.term, `/glossary/${g.slug}`, g.shortDefinition))
        .join("\n")}`,
    );
  }

  sections.push(`## Optional\n${OPTIONAL_PAGES.map(staticLine).join("\n")}`);

  const body = sections.join("\n\n") + "\n";

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
