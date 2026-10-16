/**
 * Blog posts (src/content/blog/*.mdx) → BlogPostSummary / BlogPostPage /
 * BlogPostDetail. The body stays a compiled MDX component (BlogBody renders
 * it with the MDX components); the table of contents comes from its h2s,
 * read time and the llms-full.txt Markdown from the raw body
 * (./mdx-text.ts). Newest first by `date`.
 */
import { render } from "astro:content";
import type {
  BlogPostDetail,
  BlogPostPage,
  BlogPostSummary,
  CategoryPath,
  ContentImage,
  SlugPath,
} from "@/lib/content/types";
import { categoryToSlug } from "@/lib/blog-categories";
import { estimateReadTime } from "@/lib/read-time";
import { resolveBlogCta, resolveCtaSection } from "./ctas";
import { loadContent, need, type Content, type Entry } from "./entries";
import { mdxToMarkdown, mdxWords } from "./mdx-text";
import { localImage, newestFirst, toSeo } from "./shared";

type Post = Entry<"blog">;

const byDate = newestFirst<Post>((p) => p.data.date);
const newest = (content: Content) => [...content.blog.values()].sort(byDate);

function byline(
  content: Content,
  post: Post,
): { name: string; avatar: ContentImage | null } {
  const author = need(content.authors, "authors", post.data.author.id).data;
  return {
    name: author.name,
    avatar: author.avatar
      ? localImage(author.avatar, author.avatarAlt ?? author.name)
      : null,
  };
}

function toSummary(content: Content, post: Post): BlogPostSummary {
  const d = post.data;
  const author = byline(content, post);
  return {
    slug: post.id,
    title: d.title,
    description: d.description,
    categories: [...d.categories],
    primaryCategory: d.primaryCategory ?? null,
    image: localImage(d.image, d.imageAlt),
    author: author.name,
    authorAvatar: author.avatar,
    date: d.date,
    featured: d.featured,
  };
}

async function toDetail(content: Content, post: Post): Promise<BlogPostDetail> {
  const d = post.data;
  const author = byline(content, post);
  const { Content: Body, headings } = await render(post);
  const raw = post.body ?? "";
  return {
    slug: post.id,
    title: d.title,
    description: d.description,
    categories: [...d.categories],
    image: localImage(d.image, d.imageAlt),
    author: author.name,
    authorAvatar: author.avatar,
    date: d.date,
    updatedAt: d.updated ?? null,
    featured: d.featured,
    video: d.video ?? null,
    body: { kind: "mdx", Content: Body },
    headings: headings
      .filter((h) => h.depth === 2)
      .map(({ slug, text }) => ({ slug, text })),
    readTime: estimateReadTime(mdxWords(raw)),
    faqs: d.faqs.map((faq) => ({
      question: faq.question,
      answerHtml: faq.answer.html,
      answerText: faq.answer.text,
    })),
    markdown: mdxToMarkdown(raw),
    seo: toSeo(d.seo),
  };
}

export async function getBlogPosts(): Promise<BlogPostSummary[]> {
  const content = await loadContent();
  return newest(content).map((post) => toSummary(content, post));
}

export async function getBlogPost(slug: string): Promise<BlogPostPage | null> {
  const content = await loadContent();
  const post = content.blog.get(slug);
  if (!post) return null;
  const manual = post.data.relatedPosts.map((ref) =>
    need(content.blog, "blog", ref.id),
  );
  const excluded = new Set([slug, ...manual.map((p) => p.id)]);
  const shared = new Set(post.data.categories.map((c) => c.toLowerCase()));
  const related = newest(content)
    .filter(
      (p) =>
        !excluded.has(p.id) &&
        p.data.categories.some((c) => shared.has(c.toLowerCase())),
    )
    .slice(0, 6);
  return {
    post: await toDetail(content, post),
    relatedPosts: related.map((p) => toSummary(content, p)),
    manualRelatedPosts: manual.map((p) => toSummary(content, p)),
    cta: resolveBlogCta(content, post.data.cta),
    ctaSection: resolveCtaSection(content, post.data.ctaSection),
  };
}

export async function getBlogPostStaticPaths(): Promise<SlugPath[]> {
  const { blog } = await loadContent();
  return [...blog.keys()].map((slug) => ({ params: { slug } }));
}

export async function getBlogPostsByCategory(
  category: string,
): Promise<BlogPostSummary[]> {
  const content = await loadContent();
  return newest(content)
    .filter((post) => (post.data.categories as string[]).includes(category))
    .map((post) => toSummary(content, post));
}

/** Every category in use, in the order the newest posts use them. */
export async function getBlogCategories(): Promise<string[]> {
  const content = await loadContent();
  return [...new Set(newest(content).flatMap((post) => post.data.categories))];
}

/** "all" plus one path per category in use (slug from categoryToSlug). */
export async function getBlogCategoryStaticPaths(): Promise<CategoryPath[]> {
  const seen = new Set<string>();
  const paths: CategoryPath[] = [
    { params: { category: "all" }, props: { categoryName: "All" } },
  ];
  for (const name of await getBlogCategories()) {
    const slug = categoryToSlug(name);
    if (slug === "all" || seen.has(slug)) continue;
    seen.add(slug);
    paths.push({ params: { category: slug }, props: { categoryName: name } });
  }
  return paths;
}

export async function getFullBlogPosts(): Promise<BlogPostDetail[]> {
  const content = await loadContent();
  return Promise.all(newest(content).map((post) => toDetail(content, post)));
}
