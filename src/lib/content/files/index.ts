/**
 * The Files implementation of the content interface (src/lib/content):
 * Astro content collections in src/content (schemas, image and reference
 * checks in src/content.config.ts). src/lib/content/source.ts selects it;
 * nothing else imports this file (npm run check:boundary).
 *
 *   entries.ts        — loads every collection, indexed by id
 *   shared.ts         — localImage(), toSeo(), newestFirst()
 *   ctas.ts           — CTAs and the site defaults (settings.json)
 *   testimonials.ts, projects.ts (with the gallery), case-studies.ts,
 *   blog.ts           — collection entries → view models
 *   mdx-text.ts       — read time, llms Markdown and inline-CTA ids from a raw MDX body
 *
 * There are no drafts here: every function ignores the trailing `opts`
 * the interface allows (only a CMS add-on's preview routes pass it), and
 * plainText() returns its input unchanged.
 */
import type { ContentSource } from "@/lib/content/types";
import {
  getBlogCategories,
  getBlogCategoryStaticPaths,
  getBlogPost,
  getBlogPostStaticPaths,
  getBlogPosts,
  getBlogPostsByCategory,
  getFullBlogPosts,
} from "./blog";
import {
  getCaseStudies,
  getCaseStudy,
  getCaseStudyStaticPaths,
  getFeaturedCaseStudies,
  getFullCaseStudies,
} from "./case-studies";
import { getCtaDefaults } from "./ctas";
import {
  getFeaturedProjects,
  getGallery,
  getProject,
  getProjectStaticPaths,
  getProjects,
} from "./projects";
import { getTestimonialByName, getTestimonials } from "./testimonials";

function plainText<T extends string | null | undefined>(value: T): T {
  return value;
}

/* `satisfies` fails `npm run check` when a ContentSource function is
   missing here or its signature drifts. */
const filesSource = {
  plainText,
  getCtaDefaults,
  getTestimonials,
  getTestimonialByName,
  getProjects,
  getFeaturedProjects,
  getProject,
  getGallery,
  getProjectStaticPaths,
  getCaseStudies,
  getCaseStudy,
  getFeaturedCaseStudies,
  getCaseStudyStaticPaths,
  getBlogPost,
  getBlogPostStaticPaths,
  getBlogPosts,
  getBlogPostsByCategory,
  getBlogCategories,
  getBlogCategoryStaticPaths,
  getFullBlogPosts,
  getFullCaseStudies,
} satisfies ContentSource;

export default filesSource;
