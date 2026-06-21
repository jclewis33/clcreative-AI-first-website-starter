import { defineField, defineType } from "sanity";

export const blogCtaInline = defineType({
  name: "blogCtaInline",
  title: "Blog CTA",
  type: "object",
  fields: [
    defineField({
      name: "cta",
      title: "CTA",
      description: "Pick an existing Blog CTA document to embed at this point in the post.",
      type: "reference",
      to: [{ type: "blogCta" }],
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      title: "cta.title",
      heading: "cta.heading",
      media: "cta.image",
    },
    prepare({ title, heading, media }) {
      return {
        title: title || heading || "Blog CTA",
        subtitle: title && heading ? heading : "Blog CTA",
        media,
      };
    },
  },
});
