import { defineField, defineType } from "sanity";
import { CogIcon } from "@sanity/icons";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site Settings",
  type: "document",
  icon: CogIcon,
  fields: [
    defineField({
      name: "defaultBlogCta",
      title: "Default Blog CTA",
      description: "Used on every blog post unless the post has its own CTA Override set.",
      type: "reference",
      to: [{ type: "blogCta" }],
    }),
    defineField({
      name: "defaultCtaSection",
      title: "Default CTA Section",
      description:
        "The full-width CTA shown at the bottom of every blog post, case study, and glossary term, unless that document has its own CTA Section Override set.",
      type: "reference",
      to: [{ type: "ctaSection" }],
    }),
  ],
  preview: {
    prepare: () => ({ title: "Site Settings" }),
  },
});
