/**
 * Blog enums — plain data, read by the content schemas
 * (src/content.config.ts), the Sanity add-on's schema (its
 * src/sanity/schemaTypes/) and the blog pages, so the three can never
 * disagree. REPLACE THE CATEGORIES
 * PER CLIENT: they are placeholders.
 *
 * Renaming a category orphans posts that use the old name: a files build
 * fails naming the post and the field; Sanity documents keep the old value
 * until re-saved.
 */

/** Every category a post can carry. */
export const BLOG_CATEGORIES = [
  "News",
  "Guides",
  "Insights",
  "Tutorials",
  "Resources",
] as const;
export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

/**
 * The categories that have their own section on /blog — the values a post's
 * `primaryCategory` may take. Keep in step with `categoryConfig` in
 * src/pages/blog/index.astro (typed against this list).
 */
export const BLOG_SECTION_CATEGORIES = [
  "News",
  "Guides",
  "Insights",
  "Tutorials",
] as const satisfies readonly BlogCategory[];
export type BlogSectionCategory = (typeof BLOG_SECTION_CATEGORIES)[number];

/** The image shapes a blog CTA offers (titles are the Studio labels). */
export const BLOG_CTA_ASPECT_RATIO_OPTIONS = [
  { title: "Square (1:1)", value: "square" },
  { title: "Landscape (3:2)", value: "landscape" },
  { title: "Portrait (3:4)", value: "portrait" },
] as const;
export const BLOG_CTA_ASPECT_RATIOS = BLOG_CTA_ASPECT_RATIO_OPTIONS.map(
  (option) => option.value,
);

/** Callout styles in a post body (MDX `<Callout type>`, Sanity `callout`). */
export const CALLOUT_TYPE_OPTIONS = [
  { title: "Tip", value: "tip" },
  { title: "Warning", value: "warning" },
  { title: "Info", value: "info" },
] as const;
export type CalloutType = (typeof CALLOUT_TYPE_OPTIONS)[number]["value"];
