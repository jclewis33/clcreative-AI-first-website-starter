import { defineField, defineType } from "sanity";
import { BlockElementIcon } from "@sanity/icons";

export const ctaSection = defineType({
  name: "ctaSection",
  title: "CTA Section",
  type: "document",
  icon: BlockElementIcon,
  description:
    "Full-width call-to-action section rendered at the bottom of blog posts, case studies, and glossary terms.",
  fields: [
    defineField({
      name: "title",
      title: "Internal Title",
      description:
        "Editor-only label. Not shown to readers — used for picking this CTA from a list.",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "heading",
      title: "Heading",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "text",
      title: "Body Text",
      type: "text",
      rows: 3,
      validation: (rule) => rule.required().max(280),
    }),
    defineField({
      name: "primaryButtonLabel",
      title: "Primary Button Label",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "primaryButtonHref",
      title: "Primary Button Link",
      description:
        "Can be a relative path (e.g. /book-a-call) or a full URL.",
      type: "url",
      validation: (rule) =>
        rule
          .required()
          .uri({ allowRelative: true, scheme: ["http", "https", "mailto"] }),
    }),
    defineField({
      name: "secondaryButtonLabel",
      title: "Secondary Button Label",
      description: "Optional. Leave empty to show only the primary button.",
      type: "string",
    }),
    defineField({
      name: "secondaryButtonHref",
      title: "Secondary Button Link",
      description:
        "Can be a relative path (e.g. /marketing-scorecard) or a full URL.",
      type: "url",
      validation: (rule) =>
        rule.uri({ allowRelative: true, scheme: ["http", "https", "mailto"] }),
    }),
    defineField({
      name: "backgroundImage",
      title: "Background Image",
      description:
        "Fills the full-width section behind a dark overlay. Upload a large landscape image (at least 1920px wide, e.g. 1920×1080px). It's cropped to fit, so keep the focal point centered.",
      type: "image",
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "imageAlt",
      title: "Background Image Alt Text",
      description:
        "Optional — the image is decorative, so this can be left blank.",
      type: "string",
    }),
    defineField({
      name: "overlayStrength",
      title: "Overlay Strength",
      description:
        "Darkness of the overlay over the background image (0–100). Higher = darker, more readable text.",
      type: "number",
      initialValue: 80,
      validation: (rule) => rule.min(0).max(100),
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "heading",
      media: "backgroundImage",
    },
  },
});
