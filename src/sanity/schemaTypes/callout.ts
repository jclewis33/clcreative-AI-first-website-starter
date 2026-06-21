import { defineField, defineType } from "sanity";
import { defaultMarks } from "./portableTextConfig";

export const callout = defineType({
  name: "callout",
  type: "object",
  title: "Callout",
  fields: [
    defineField({
      name: "type",
      type: "string",
      title: "Type",
      options: {
        list: [
          { title: "Tip", value: "tip" },
          { title: "Warning", value: "warning" },
          { title: "Info", value: "info" },
        ],
        layout: "radio",
      },
      initialValue: "tip",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "body",
      type: "array",
      title: "Content",
      of: [
        {
          type: "block",
          styles: [{ title: "Normal", value: "normal" }],
          marks: defaultMarks,
          lists: [],
        },
      ],
    }),
  ],
  preview: {
    select: { type: "type" },
    prepare({ type }) {
      return { title: `Callout: ${type || "tip"}` };
    },
  },
});
