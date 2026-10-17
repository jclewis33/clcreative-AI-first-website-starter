/**
 * `/llms-full.txt` — the full text content of the site for LLM ingestion.
 *
 * Prerendered to `dist/llms-full.txt` at build time. Static marketing pages
 * are listed as a link index (their content lives in `.astro` templates);
 * every blog post and published case study has its full body inline as
 * Markdown (converted by the content source), and every project is listed
 * with its category and location. Rebuilt from `@/lib/content` on every
 * deploy.
 */

import type { APIRoute } from "astro";
import {
  getFullBlogPosts,
  getFullCaseStudies,
  getProjects,
  type BlogPostDetail,
  type CaseStudyDetail,
  type ProjectCardData,
} from "@/lib/content";
import { SITE_URL, SITE_NAME, SITE_SUMMARY } from "@/config/site";
import {
  MAIN_PAGES,
  SERVICE_PAGES,
  LOCATION_PAGES,
  INDEX_PAGES,
  OPTIONAL_PAGES,
  type StaticPage,
} from "@/data/site-structure";

export const prerender = true;

function url(path: string): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

function pageIndex(heading: string, pages: StaticPage[]): string {
  return `## ${heading}\n${pages
    .map((p) => `- [${p.title}](${url(p.path)}): ${p.desc}`)
    .join("\n")}`;
}

export const GET: APIRoute = async () => {
  // Tolerate an empty or unreachable dataset (e.g. a fresh fork before
  // `/setup`) — the file still renders the static page index.
  const [caseStudies, projects, posts] = await Promise.all([
    getFullCaseStudies().catch((): CaseStudyDetail[] => []),
    getProjects().catch((): ProjectCardData[] => []),
    getFullBlogPosts().catch((): BlogPostDetail[] => []),
  ]);

  const staticGroups: Array<[string, StaticPage[]]> = [
    ["Main Pages", MAIN_PAGES],
    ["Services", SERVICE_PAGES],
    ["Locations", LOCATION_PAGES],
    ["Sections", INDEX_PAGES],
  ];

  const out: string[] = [
    `# ${SITE_NAME}`,
    `> ${SITE_SUMMARY}`,
    ...staticGroups
      .filter(([, pages]) => pages.length)
      .map(([heading, pages]) => pageIndex(heading, pages)),
  ];

  if (caseStudies.length) {
    out.push("---", "# Case Studies");
    for (const cs of caseStudies) {
      out.push(`## ${cs.title}`);
      out.push(`URL: ${SITE_URL}/case-studies/${cs.slug}`);
      if (cs.client) out.push(`Client: ${cs.client}`);
      if (cs.description) out.push(cs.description);
      if (cs.markdown) out.push(cs.markdown);
    }
  }

  if (projects.length) {
    out.push("---", "# Projects");
    for (const p of projects) {
      out.push(`## ${p.title}`);
      out.push(`URL: ${SITE_URL}${p.href}`);
      const meta = [p.categoryLabel, p.location].filter(Boolean).join(" · ");
      if (meta) out.push(meta);
    }
  }

  if (posts.length) {
    out.push("---", "# Blog");
    for (const post of posts) {
      out.push(`## ${post.title}`);
      out.push(`URL: ${SITE_URL}/blog/${post.slug}`);
      if (post.description) out.push(post.description);
      if (post.markdown) out.push(post.markdown);
    }
  }

  out.push(
    "---",
    "## Optional",
    ...OPTIONAL_PAGES.map((p) => `- [${p.title}](${url(p.path)}): ${p.desc}`),
  );

  const body = out.join("\n\n") + "\n";

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
