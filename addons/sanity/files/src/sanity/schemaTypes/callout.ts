import { defineField, defineType } from "sanity";
import { defaultMarks } from "./portableTextConfig";
import { CALLOUT_TYPE_OPTIONS } from "../../config/blog";

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
        list: [...CALLOUT_TYPE_OPTIONS],
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
