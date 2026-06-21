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

/** `/about` → `https://www.clcreative.co/about`; `/` → site root. */
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
  const [{ data: posts }, { data: caseStudies }, { data: glossary }] =
    await Promise.all([
      loadQuery<BlogPost[]>({ query: BLOG_POSTS_QUERY }),
      loadQuery<CaseStudy[]>({ query: CASE_STUDIES_QUERY }),
      loadQuery<GlossaryTerm[]>({ query: GLOSSARY_TERMS_QUERY }),
    ]);

  // Mirror the sitemap rule: hide case studies marked "coming soon".
  const publishedCaseStudies = (caseStudies ?? []).filter(
    (c) => c.comingSoon !== true,
  );

  const sections: string[] = [
    `# ${SITE_NAME}`,
    `> ${SITE_SUMMARY}`,
    `## Main Pages\n${MAIN_PAGES.map(staticLine).join("\n")}`,
    `## Services\n${SERVICE_PAGES.map(staticLine).join("\n")}`,
    `## Locations\n${LOCATION_PAGES.map(staticLine).join("\n")}`,
    `## Sections\n${INDEX_PAGES.map(staticLine).join("\n")}`,
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
