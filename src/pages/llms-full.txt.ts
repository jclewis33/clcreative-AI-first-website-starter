/**
 * `/llms-full.txt` — the full text content of the site for LLM ingestion.
 *
 * Prerendered to `dist/llms-full.txt` at build time. Static marketing pages are
 * listed as a link index (their content lives in `.astro` templates); every
 * blog post, case study, and glossary term has its full body rendered inline as
 * Markdown via `portableTextToMarkdown`. Rebuilt from Sanity on every deploy.
 */

import type { APIRoute } from "astro";
import { loadQuery } from "@/sanity/lib/load-query";
import {
  BLOG_POSTS_QUERY,
  BLOG_POST_QUERY,
  CASE_STUDIES_QUERY,
  CASE_STUDY_QUERY,
  GLOSSARY_TERMS_QUERY,
  GLOSSARY_TERM_QUERY,
} from "@/sanity/lib/queries";
import { portableTextToMarkdown } from "@/sanity/lib/portable-text";
import { SITE_URL, SITE_NAME, SITE_SUMMARY } from "@/config/site";
import {
  MAIN_PAGES,
  SERVICE_PAGES,
  LOCATION_PAGES,
  INDEX_PAGES,
  OPTIONAL_PAGES,
  type StaticPage,
} from "@/data/site-structure";

import type {
  BLOG_POSTS_QUERY_RESULT,
  CASE_STUDIES_QUERY_RESULT,
  GLOSSARY_TERMS_QUERY_RESULT,
  CASE_STUDY_QUERY_RESULT,
} from "@/sanity/sanity.types";

export const prerender = true;

function url(path: string): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

function pageIndex(heading: string, pages: StaticPage[]): string {
  return `## ${heading}\n${pages
    .map((p) => `- [${p.title}](${url(p.path)}): ${p.desc}`)
    .join("\n")}`;
}

/** One entry in a case study's flexible `content[]`, as the query projects it. */
type CaseStudyBlock = NonNullable<
  NonNullable<CASE_STUDY_QUERY_RESULT>["content"]
>[number];

/** Render a case study's flexible `content[]` blocks to Markdown. */
function caseStudyContentToMarkdown(
  blocks: CaseStudyBlock[] | null | undefined,
): string {
  if (!blocks?.length) return "";
  const parts: string[] = [];
  for (const b of blocks) {
    // Each block shape carries a different subset of these fields; the union
    // only exposes one after `_type` narrowing, and this walker deliberately
    // probes them instead.
    const block = b as {
      _type: string;
      body?: unknown[] | null;
      items?: Array<{ value?: string | null; label?: string | null }> | null;
      imageAlt?: string | null;
      images?: Array<{ alt?: string | null }> | null;
    };
    if (block.body?.length) {
      const md = portableTextToMarkdown(block.body as never);
      if (md) parts.push(md);
      continue;
    }
    if (block._type === "stats" && block.items?.length) {
      parts.push(
        block.items
          .map((s) => `- **${s.value ?? ""}** — ${s.label ?? ""}`)
          .join("\n"),
      );
      continue;
    }
    if (block.imageAlt) {
      parts.push(`![${block.imageAlt}]`);
      continue;
    }
    if (block.images?.length) {
      parts.push(block.images.map((i) => `![${i.alt ?? "image"}]`).join("\n"));
    }
  }
  return parts.join("\n\n");
}

export const GET: APIRoute = async () => {
  // 1. Fetch the listings to know what exists (and order). Tolerate an empty
  //    or unreachable dataset (e.g. a fresh fork before `/setup`) — the file
  //    still renders the static page index.
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

  const postSlugs = (posts ?? []).map((p) => p.slug);
  const caseStudySlugs = (caseStudies ?? [])
    .filter((c) => c.comingSoon !== true)
    .map((c) => c.slug);
  const glossarySlugs = (glossary ?? []).map((g) => g.slug);

  // 2. Fetch full bodies for each document in parallel.
  const [fullPosts, fullCaseStudies, fullGlossary] = await Promise.all([
    Promise.all(
      postSlugs.map((slug) =>
        loadQuery({
          query: BLOG_POST_QUERY,
          params: { slug },
        }).then((r) => r.data),
      ),
    ),
    Promise.all(
      caseStudySlugs.map((slug) =>
        loadQuery({
          query: CASE_STUDY_QUERY,
          params: { slug },
        }).then((r) => r.data),
      ),
    ),
    Promise.all(
      glossarySlugs.map((slug) =>
        loadQuery({
          query: GLOSSARY_TERM_QUERY,
          params: { slug },
        }).then((r) => r.data),
      ),
    ),
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

  if (fullCaseStudies.length) {
    out.push("---", "# Case Studies");
    for (const cs of fullCaseStudies) {
      if (!cs) continue;
      out.push(`## ${cs.title}`);
      out.push(`URL: ${SITE_URL}/case-studies/${cs.slug}`);
      if (cs.client) out.push(`Client: ${cs.client}`);
      if (cs.description) out.push(cs.description);
      const md = caseStudyContentToMarkdown(cs.content);
      if (md) out.push(md);
    }
  }

  if (fullPosts.length) {
    out.push("---", "# Blog");
    for (const post of fullPosts) {
      if (!post) continue;
      out.push(`## ${post.title}`);
      out.push(`URL: ${SITE_URL}/blog/${post.slug}`);
      if (post.description) out.push(post.description);
      const md = portableTextToMarkdown(post.body as never);
      if (md) out.push(md);
    }
  }

  if (fullGlossary.length) {
    out.push("---", "# Glossary");
    for (const term of fullGlossary) {
      if (!term) continue;
      out.push(`## ${term.term}`);
      out.push(`URL: ${SITE_URL}/glossary/${term.slug}`);
      if (term.shortDefinition) out.push(term.shortDefinition);
      const md = portableTextToMarkdown(term.body as never);
      if (md) out.push(md);
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
