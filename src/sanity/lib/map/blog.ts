/**
 * Sanity blog rows → BlogPostSummary / BlogPostDetail
 * (src/lib/content/types.ts).
 *
 * The body stays Portable Text — BlogBody renders it with the components in
 * src/components/portabletext/ — with each h2 given an id for the table of
 * contents. FAQ answers are rendered to HTML here. Derived text (FAQ answer
 * text for JSON-LD, the words behind `readTime`) is cleaned. Policy:
 * ../source.ts.
 */
import { stegaClean } from "@sanity/client/stega";
import type {
  BLOG_POST_QUERY_RESULT,
  RELATED_BLOG_POSTS_QUERY_RESULT,
} from "@/sanity/sanity.types";
import type { BlogPostDetail, BlogPostSummary } from "@/lib/content/types";
import { buildToc } from "@/lib/toc";
import { estimateReadTime } from "@/lib/read-time";
import {
  portableTextToHtml,
  portableTextToMarkdown,
  portableTextToPlainText,
  portableTextWords,
} from "../portable-text";
import { sanityImage } from "./image";
import { toSeo } from "./seo";

/**
 * A post in card shape. RELATED_BLOG_POSTS_QUERY, BLOG_POSTS_BY_CATEGORY,
 * BLOG_POST_QUERY's relatedPosts[] and (with primaryCategory)
 * BLOG_POSTS_QUERY all project these fields.
 */
type RawPostCard = RELATED_BLOG_POSTS_QUERY_RESULT[number] & {
  primaryCategory?: string | null;
};
type RawPost = NonNullable<BLOG_POST_QUERY_RESULT>;

/** A card, or null when it has no slug or title (nothing to list). */
export function toBlogPostSummary(p: RawPostCard): BlogPostSummary | null {
  const slug = stegaClean(p.slug);
  if (!slug || !p.title) return null;
  return {
    slug,
    title: p.title,
    description: p.description,
    categories: (p.categories ?? []).map((c) => stegaClean(c)),
    primaryCategory: stegaClean(p.primaryCategory) ?? null,
    image: sanityImage(p.image, p.imageAlt),
    author: p.author,
    authorAvatar: sanityImage(p.authorAvatar, p.author),
    date: stegaClean(p.date),
    featured: stegaClean(p.featured) ?? false,
  };
}

export function toBlogPostDetail(post: RawPost): BlogPostDetail {
  const { body, items: headings } = buildToc(post.body ?? []);
  return {
    slug: stegaClean(post.slug) ?? "",
    title: post.title,
    description: post.description,
    categories: (post.categories ?? []).map((c) => stegaClean(c)),
    image: sanityImage(post.image, post.imageAlt),
    author: post.author,
    authorAvatar: sanityImage(post.authorAvatar, post.author),
    date: stegaClean(post.date),
    updatedAt: post._updatedAt,
    featured: stegaClean(post.featured) ?? false,
    video: stegaClean(post.video),
    body: { kind: "portable-text", blocks: body },
    headings,
    readTime: estimateReadTime(stegaClean(portableTextWords(post.body))),
    faqs: (post.faqs ?? []).map((faq) => ({
      question: faq.question,
      answerHtml: portableTextToHtml(faq.answer),
      answerText: stegaClean(portableTextToPlainText(faq.answer)),
    })),
    // `as never`: the body includes custom node types (code, callout, …)
    // the Markdown walker skips but its input type does not list.
    markdown: stegaClean(portableTextToMarkdown(post.body as never)),
    seo: toSeo(post.seo),
  };
}
