/**
 * Case-study enums — plain data, read by the content schemas
 * (src/content.config.ts) and the Sanity schema
 * (src/sanity/schemaTypes/caseStudy.ts), so the two can never disagree.
 * REPLACE THE CATEGORIES AND INDUSTRIES PER CLIENT: they are placeholders.
 * The block options mirror the case-study block components and rarely
 * change.
 */

/** Drives the category filter on /case-studies. */
export const CASE_STUDY_CATEGORIES = [
  "Design",
  "Development",
  "Strategy",
  "Branding",
  "Marketing",
  "Consulting",
] as const;

/** Drives the industry filter on /case-studies. */
export const CASE_STUDY_INDUSTRIES = [
  "Agencies",
  "AI Companies",
  "Consultants",
  "Financial Services",
  "Food & Beverage",
  "Home Services",
  "Manufacturing / Industrial",
  "Non-Profits",
  "Real Estate",
  "Recruiting",
  "Retail / E-commerce",
  "SaaS",
  "Wellness",
] as const;

/**
 * Vertical spacing for a content block — Section's padding sizes minus
 * "page-top" (SectionSpacing in src/lib/content/blocks.ts).
 */
export const SECTION_SPACING_OPTIONS = [
  { title: "None", value: "none" },
  { title: "Extra Small", value: "xsmall" },
  { title: "Small", value: "small" },
  { title: "Main", value: "main" },
  { title: "Large", value: "large" },
] as const;
export const SECTION_SPACINGS = SECTION_SPACING_OPTIONS.map(
  (option) => option.value,
);

/** Content widths for the rich-text blocks (leave unset for the default). */
export const CASE_STUDY_MAX_WIDTHS = [
  "20ch",
  "30ch",
  "40ch",
  "48ch",
  "60ch",
  "48rem",
  "60rem",
  "100%",
] as const;

/** Crop ratios for the image blocks (leave unset for the block default). */
export const CASE_STUDY_ASPECT_RATIO_OPTIONS = [
  { title: "Auto (no crop)", value: "auto" },
  { title: "Wide (21:9)", value: "wide" },
  { title: "Widescreen (16:9)", value: "widescreen" },
  { title: "Landscape (3:2)", value: "landscape" },
  { title: "Square (1:1)", value: "square" },
  { title: "Portrait (2:3)", value: "portrait" },
  { title: "Tall (3:4)", value: "tall" },
] as const;
export const CASE_STUDY_ASPECT_RATIOS = CASE_STUDY_ASPECT_RATIO_OPTIONS.map(
  (option) => option.value,
);
