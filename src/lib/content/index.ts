/**
 * The content interface — the ONLY module pages, templates, sections and
 * components use to get content, content types and image helpers.
 *
 * - View models and the ContentSource contract: ./types.ts
 * - Image helpers (imageSrc, resolveImageUrl, sizedImage): ./images.ts
 * - The active backend: ./source.ts (one line; the Files implementation in
 *   ./files/ unless a CMS add-on has replaced it)
 *
 * Every content function takes an optional trailing `opts`
 * ({ preview }) that only a CMS backend reads. Callers here pass none and
 * get published content; a CMS add-on's draft-preview routes pass the
 * request's preview state.
 */
import source from "./source";

export type * from "./types";
export { imageSrc, resolveImageUrl, sizedImage } from "./images";

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
  getFullBlogPosts,
  getFullCaseStudies,
} = source;
