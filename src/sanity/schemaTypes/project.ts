import { defineArrayMember, defineField, defineType } from "sanity";
import { ProjectsIcon } from "@sanity/icons";
import { PROJECT_CATEGORIES, categoryTitle } from "../../config/projects";
import { externalLinkAnnotation } from "./portableTextConfig";

/**
 * A project: a photo-led portfolio item — a main photo, a labelled photo set
 * and a short write-up. Public detail page at /projects/<slug>; Presentation
 * previews /preview/projects/<slug>. Categories come from
 * src/config/projects.ts (shared with the site's filters).
 *
 * Not the same as caseStudy, which is the long-form marketing story with a
 * block builder. A site can use either, or both.
 */
export const project = defineType({
  name: "project",
  title: "Project",
  type: "document",
  icon: ProjectsIcon,
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "media", title: "Media" },
    { name: "meta", title: "Meta" },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      group: "content",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      group: "content",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      group: "content",
      options: { list: PROJECT_CATEGORIES },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "location",
      title: "Location",
      type: "string",
      group: "content",
      description:
        "Shown as written, e.g. Springfield, IL. No street addresses.",
    }),
    defineField({
      name: "service",
      title: "Service",
      type: "string",
      group: "content",
      description: "Optional. The kind of job this was, e.g. Kitchen remodel.",
    }),
    defineField({
      name: "description",
      title: "Write-up",
      type: "array",
      group: "content",
      description:
        "What happened and what we did. A short paragraph or two is plenty.",
      of: [
        defineArrayMember({
          type: "block",
          styles: [{ title: "Normal", value: "normal" }],
          lists: [{ title: "Bullet", value: "bullet" }],
          marks: {
            decorators: [
              { title: "Bold", value: "strong" },
              { title: "Italic", value: "em" },
            ],
            annotations: [externalLinkAnnotation],
          },
        }),
      ],
    }),
    defineField({
      name: "quote",
      title: "Customer quote (optional)",
      type: "object",
      group: "meta",
      fields: [
        defineField({ name: "text", title: "Quote", type: "text", rows: 2 }),
        defineField({
          name: "name",
          title: "Name",
          type: "string",
          description: "First name and last initial.",
        }),
      ],
    }),
    defineField({
      name: "heroImage",
      title: "Main photo",
      type: "image",
      group: "media",
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "imageAlt",
      title: "Main photo alt text",
      description:
        "Describes the photo for screen readers and SEO. Leave blank to use the Alt text set on the image in the Media library.",
      type: "string",
      group: "media",
    }),
    defineField({
      name: "photos",
      title: "Project photos",
      type: "array",
      group: "media",
      description:
        "Shown below the write-up. Visitors can click any photo to see it large and step through them.",
      of: [
        defineArrayMember({
          type: "image",
          options: { hotspot: true },
          fields: [
            defineField({
              name: "label",
              title: "Label",
              type: "string",
              description: "Optional. Shown on the photo.",
              options: {
                list: ["Before", "During", "After"],
                layout: "radio",
                direction: "horizontal",
              },
            }),
            defineField({
              name: "alt",
              title: "Alt text",
              type: "string",
              description:
                "Leave blank to use the Alt text set on the image in the Media library.",
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: "completed",
      title: "Completed",
      type: "date",
      group: "meta",
      options: { dateFormat: "MMMM YYYY" },
    }),
    defineField({
      name: "featured",
      title: "Featured",
      type: "boolean",
      group: "meta",
      description: "Show in featured project lists",
      initialValue: false,
    }),
    defineField({
      name: "seoDescription",
      title: "Search description",
      type: "string",
      group: "meta",
      description:
        "Shown in Google results. About one sentence. Leave blank to use the start of the write-up.",
      validation: (rule) =>
        rule.max(155).warning("Keep it under 155 characters."),
    }),
  ],
  orderings: [
    {
      title: "Newest",
      name: "completedDesc",
      by: [
        { field: "completed", direction: "desc" },
        { field: "_createdAt", direction: "desc" },
      ],
    },
  ],
  preview: {
    select: {
      title: "title",
      category: "category",
      location: "location",
      media: "heroImage",
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
