import { defineField, defineType } from "sanity";

/**
 * Reusable SEO object type.
 *
 * All fields are optional overrides. When empty, the frontend falls back to
 * the parent document's title, description, and featured image.
 *
 * Fallback chain:
 *   Meta title       → seo.metaTitle       || document title
 *   Meta description → seo.metaDescription || document description
 *   OG title         → seo.ogTitle         || seo.metaTitle || document title
 *   OG description   → seo.ogDescription   || seo.metaDescription || document description
 *   OG image         → seo.ogImage         || document featured image
 */
export const seo = defineType({
  name: "seo",
  title: "SEO & Open Graph",
  type: "object",
  fields: [
    defineField({
      name: "metaTitle",
      title: "Meta Title",
      description:
        "Override the page <title> tag. Leave empty to use the article title.",
      type: "string",
      validation: (rule) => rule.max(70).warning("Keep under 70 characters for best results in search."),
    }),
    defineField({
      name: "metaDescription",
      title: "Meta Description",
      description:
        "Override the meta description. Leave empty to use the article description.",
      type: "text",
      rows: 3,
      validation: (rule) => rule.max(160).warning("Keep under 160 characters for best results in search."),
    }),
    defineField({
      name: "ogTitle",
      title: "Open Graph Title",
      description:
        "Override the OG title for social sharing. Leave empty to use the meta title.",
      type: "string",
      validation: (rule) => rule.max(70).warning("Keep under 70 characters."),
    }),
    defineField({
      name: "ogDescription",
      title: "Open Graph Description",
      description:
        "Override the OG description for social sharing. Leave empty to use the meta description.",
      type: "text",
      rows: 3,
      validation: (rule) => rule.max(200).warning("Keep under 200 characters."),
    }),
    defineField({
      name: "ogImage",
      title: "Open Graph Image",
      description:
        "Override the social sharing image. Leave empty to use the featured image. Recommended: 1200×630px.",
      type: "image",
    }),
  ],
});
