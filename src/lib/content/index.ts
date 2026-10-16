/**
 * The content interface — the ONLY module pages, templates, sections and
 * components use to get content, content types and image helpers.
 *
 * - View models and the ContentSource contract: ./types.ts
 * - Image helpers (imageSrc, imageUrl, sizedImage): ./images.ts
 * - The active backend: ./source.ts (one line; today the Sanity
 *   implementation in src/sanity/lib/source.ts)
 *
 * Every content function takes an optional trailing `opts`
 * ({ perspectiveCookie }). Only the /preview/* draft twins pass it
 * (getDraftModeProps(Astro)); everything else calls without it and gets
 * published content.
 */
import source from "./source";

export type * from "./types";
export { imageSrc, imageUrl, sizedImage } from "./images";

/* The backend's functions, re-exported by name so call sites read
   `getCtaDefaults()`. They are plain functions — none uses `this`. */
export const {
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
} = source;
