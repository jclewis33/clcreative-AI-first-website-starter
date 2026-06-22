import { defineField, defineType } from "sanity";
import { BellIcon } from "@sanity/icons";

export const blogCta = defineType({
  name: "blogCta",
  title: "Blog CTA",
  type: "document",
  icon: BellIcon,
  fields: [
    defineField({
      name: "title",
      title: "Internal Title",
      description: "Editor-only label. Not shown to readers — used for picking this CTA from a list.",
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
      name: "body",
      title: "Body Text",
      type: "text",
      rows: 3,
      validation: (rule) => rule.required().max(280),
    }),
    defineField({
      name: "image",
      title: "Image",
      description:
        "Cropped to the ratio chosen in Image Aspect Ratio below. Recommended sizes — Square: 800×800px, Landscape (3:2): 1200×800px, Portrait (3:4): 900×1200px.",
      type: "image",
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "imageAlt",
      title: "Image Alt Text",
      description:
        "Leave blank to use the Alt text set on the image in the Media library.",
      type: "string",
    }),
    defineField({
      name: "aspectRatio",
      title: "Image Aspect Ratio",
      type: "string",
      options: {
        list: [
          { title: "Square (1:1)", value: "square" },
          { title: "Landscape (3:2)", value: "landscape" },
          { title: "Portrait (3:4)", value: "portrait" },
        ],
        layout: "radio",
      },
      initialValue: "portrait",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "linkUrl",
      title: "Link URL",
      description: "Where the entire CTA block links to. Can be a relative path (e.g. /contact) or a full URL.",
      type: "url",
      validation: (rule) =>
        rule
          .required()
          .uri({ allowRelative: true, scheme: ["http", "https", "mailto"] }),
    }),
    defineField({
      name: "linkLabel",
      title: "Link Label",
      description: "Visible text on the CTA's link button. Also used as the block's accessible label.",
      type: "string",
      initialValue: "Learn more",
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "heading",
      media: "image",
    },
  },
});
