import { defineField, defineType } from "sanity";

export const videoEmbed = defineType({
  name: "videoEmbed",
  type: "object",
  title: "Video Embed",
  fields: [
    defineField({
      name: "url",
      type: "url",
      title: "Video URL",
      description: "YouTube or Vimeo URL",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "caption",
      type: "string",
      title: "Caption",
    }),
  ],
  preview: {
    select: { url: "url", caption: "caption" },
    prepare({ url, caption }) {
      return { title: caption || "Video Embed", subtitle: url };
    },
  },
});
