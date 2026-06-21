import { defineField, defineType } from "sanity";
import { CommentIcon } from "@sanity/icons";

export const testimonial = defineType({
  name: "testimonial",
  title: "Testimonial",
  type: "document",
  icon: CommentIcon,
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      description: "Person's full name",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "role",
      title: "Role / Title",
      type: "string",
      description: "Job title or role (e.g. 'Owner', 'CEO')",
    }),
    defineField({
      name: "company",
      title: "Company",
      type: "string",
      description: "Company or organization name",
    }),
    defineField({
      name: "quote",
      title: "Quote",
      type: "text",
      description: "The testimonial text",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "avatar",
      title: "Avatar",
      type: "image",
      description:
        "Profile photo. Displayed as a 1:1 circle — upload a square image (e.g. 400×400px) for best results.",
      options: { hotspot: true },
    }),
    defineField({
      name: "website",
      title: "Website",
      type: "url",
      description: "Optional link to their website",
    }),
    defineField({
      name: "stars",
      title: "Star Rating",
      type: "number",
      description: "Rating from 1 to 5 (leave empty to hide stars)",
      validation: (rule) => rule.min(1).max(5).integer(),
    }),
    defineField({
      name: "featured",
      title: "Featured",
      type: "boolean",
      description:
        "Show this testimonial in featured sections (homepage, CTAs, etc.)",
      initialValue: false,
    }),
    defineField({
      name: "sortOrder",
      title: "Sort Order",
      type: "number",
      description:
        "Controls default display order. Lower numbers appear first.",
      validation: (rule) => rule.min(0),
    }),
  ],
  orderings: [
    {
      title: "Sort Order",
      name: "sortOrderAsc",
      by: [{ field: "sortOrder", direction: "asc" }],
    },
    {
      title: "Name A-Z",
      name: "nameAsc",
      by: [{ field: "name", direction: "asc" }],
    },
    {
      title: "Featured First",
      name: "featuredFirst",
      by: [
        { field: "featured", direction: "desc" },
        { field: "sortOrder", direction: "asc" },
      ],
    },
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "company",
      media: "avatar",
      featured: "featured",
    },
    prepare({ title, subtitle, media, featured }) {
      return {
        title: featured ? `⭐ ${title}` : title,
        subtitle,
        media,
      };
    },
  },
});
