import { defineField, defineType } from "sanity";
import { BookIcon } from "@sanity/icons";
import { defaultMarks } from "./portableTextConfig";

export const glossaryTerm = defineType({
  name: "glossaryTerm",
  title: "Glossary Term",
  type: "document",
  icon: BookIcon,
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "meta", title: "Meta" },
  ],
  fields: [
    defineField({
      name: "term",
      title: "Term",
      description: 'The display name (e.g. "API", "Responsive Design").',
      type: "string",
      group: "content",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      group: "content",
      options: { source: "term", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "shortDefinition",
      title: "Short Definition",
      description: "One-line definition for card display and SEO meta.",
      type: "text",
      rows: 2,
      group: "content",
      validation: (rule) => rule.required().max(200),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      group: "meta",
      options: {
        list: [
          { title: "Development", value: "Development" },
          { title: "SEO", value: "SEO" },
          { title: "CSS", value: "CSS" },
          { title: "Design", value: "Design" },
          { title: "Business", value: "Business" },
          { title: "Performance", value: "Performance" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "relatedTerms",
      title: "Related Terms",
      description: "Link to other glossary terms shown on the detail page.",
      type: "array",
      group: "meta",
      of: [
        {
          type: "reference",
          to: [{ type: "glossaryTerm" }],
        },
      ],
    }),
    defineField({
      name: "body",
      title: "Body Content",
      description: "Full definition with headings, lists, code examples, etc.",
      type: "array",
      group: "content",
      of: [
        {
          type: "block",
          styles: [
            { title: "Normal", value: "normal" },
            { title: "H2", value: "h2" },
            { title: "H3", value: "h3" },
            { title: "H4", value: "h4" },
          ],
          marks: defaultMarks,
          lists: [
            { title: "Bullet", value: "bullet" },
            { title: "Numbered", value: "number" },
          ],
        },
        {
          type: "image",
          options: { hotspot: true },
          description:
            "Shown inline at its natural ratio (no crop), up to 960px wide. Export at roughly that width.",
          fields: [
            {
              name: "alt",
              type: "string",
              title: "Alt Text",
            },
          ],
        },
        {
          type: "videoEmbed",
        },
      ],
    }),
    defineField({
      name: "ctaSectionOverride",
      title: "CTA Section Override",
      description:
        "Replaces the default bottom-of-page CTA Section for this term only. Leave empty to use the site default.",
      type: "reference",
      group: "content",
      to: [{ type: "ctaSection" }],
    }),
  ],
  orderings: [
    {
      title: "Term A-Z",
      name: "termAsc",
      by: [{ field: "term", direction: "asc" }],
    },
  ],
  preview: {
    select: {
      title: "term",
      subtitle: "category",
    },
  },
});
