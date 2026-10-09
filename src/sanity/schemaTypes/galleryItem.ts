import { defineField, defineType } from "sanity";
import { ImageIcon } from "@sanity/icons";
import { PROJECT_CATEGORIES, categoryTitle } from "../../config/projects";

/** A single photo for the gallery. Link it to a project if it belongs to one. */
export const galleryItem = defineType({
  name: "galleryItem",
  title: "Gallery photo",
  type: "document",
  icon: ImageIcon,
  fields: [
    defineField({
      name: "image",
      title: "Photo",
      type: "image",
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "imageAlt",
      title: "Alt text",
      description:
        "Describes the photo for screen readers and SEO. Leave blank to use the Alt text set on the image in the Media library.",
      type: "string",
    }),
    defineField({
      name: "caption",
      title: "Caption",
      type: "string",
      description: "A few words, e.g. Kitchen after the remodel.",
      validation: (rule) => rule.required().max(60),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      options: { list: PROJECT_CATEGORIES },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "location",
      title: "Location",
      type: "string",
      description:
        "Shown as written, e.g. Springfield, IL. No street addresses.",
    }),
    defineField({
      name: "project",
      title: "Project",
      type: "reference",
      description: "Optional. Link the photo to the project it came from.",
      to: [{ type: "project" }],
    }),
    defineField({
      name: "added",
      title: "Added",
      type: "date",
      initialValue: () => new Date().toISOString().slice(0, 10),
    }),
  ],
  orderings: [
    {
      title: "Newest",
      name: "addedDesc",
      by: [
        { field: "added", direction: "desc" },
        { field: "_createdAt", direction: "desc" },
      ],
    },
  ],
  preview: {
    select: {
      title: "caption",
      category: "category",
      location: "location",
      media: "image",
    },
    prepare({ title, category, location, media }) {
      const parts = [categoryTitle(category), location].filter(Boolean);
      return {
        title: title || "Untitled",
        subtitle: parts.join(" · "),
        media,
      };
    },
  },
});
