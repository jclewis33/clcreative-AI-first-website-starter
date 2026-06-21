import { defineField, defineType } from "sanity";
import { DocumentTextIcon } from "@sanity/icons";
import { defaultMarks } from "./portableTextConfig";

export const blogPost = defineType({
  name: "blogPost",
  title: "Blog Post",
  type: "document",
  icon: DocumentTextIcon,
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "media", title: "Media" },
    { name: "meta", title: "Meta" },
    { name: "seo", title: "SEO" },
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
      name: "description",
      title: "Description",
      description: "Short excerpt for cards and SEO meta description.",
      type: "text",
      rows: 3,
      group: "content",
      validation: (rule) => [
        rule.required().max(300),
        rule
          .max(155)
          .warning(
            "Aim for ~155 characters or fewer — longer descriptions get truncated in Google search results.",
          ),
      ],
    }),
    defineField({
      name: "categories",
      title: "Categories",
      type: "array",
      group: "meta",
      of: [{ type: "string" }],
      options: {
        list: [
          { title: "Web Design", value: "Web Design" },
          { title: "SEO & AEO", value: "SEO" },
          { title: "Marketing", value: "Marketing" },
          { title: "Development", value: "Development" },
          { title: "Business", value: "Business" },
          { title: "Video", value: "Video" },
          { title: "Webflow Tutorial", value: "Webflow Tutorial" },
          { title: "Photography", value: "Photography" },
        ],
      },
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "primaryCategory",
      title: "Primary Category",
      description:
        "Controls which section this post appears under on the main blog page. Only categories with a section on the index are listed. Category archive pages still use the full Categories list above.",
      type: "string",
      group: "meta",
      options: {
        list: [
          { title: "Web Design", value: "Web Design" },
          { title: "SEO & AEO", value: "SEO" },
          { title: "Marketing", value: "Marketing" },
          { title: "Development", value: "Development" },
          { title: "Business", value: "Business" },
          { title: "Webflow Tutorial", value: "Webflow Tutorial" },
        ],
      },
    }),
    defineField({
      name: "image",
      title: "Featured Image",
      description:
        "Used for both the blog card and the post hero. Upload at a 16:9 ratio (e.g. 1200×675px) for best results — the hotspot handles minor cropping.",
      type: "image",
      group: "media",
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "imageAlt",
      title: "Image Alt Text",
      description:
        "Describes the image for screen readers and SEO. Leave blank to use the Alt text set on the image in the Media library.",
      type: "string",
      group: "media",
    }),
    defineField({
      name: "video",
      title: "Video URL",
      description:
        "YouTube video URL. When set, the video replaces the featured image on the blog post page.",
      type: "url",
      group: "media",
      validation: (rule) =>
        rule.uri({ scheme: ["http", "https"] }),
    }),
    defineField({
      name: "author",
      title: "Author",
      type: "reference",
      to: [{ type: "author" }],
      group: "meta",
      // To pre-select a default author, add `initialValue: { _ref: "<authorId>" }`
      // pointing at an existing author document in your dataset.
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "date",
      title: "Publish Date",
      type: "date",
      group: "meta",
      // Defaults to today (local date) on new posts. Editable.
      initialValue: () => {
        const now = new Date();
        const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
        return local.toISOString().slice(0, 10);
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "featured",
      title: "Featured Post",
      description: "Show this post in the featured section at the top of the blog.",
      type: "boolean",
      group: "meta",
      initialValue: false,
    }),
    defineField({
      name: "relatedPosts",
      title: "Related Posts",
      description:
        "Manually curate up to 3 related posts. They appear in a dark featured section above 'Other posts in this category'. Leave empty to hide the section. Posts selected here are automatically excluded from the category grid below.",
      type: "array",
      group: "meta",
      of: [
        {
          type: "reference",
          to: [{ type: "blogPost" }],
        },
      ],
      validation: (rule) =>
        rule
          .max(3)
          .unique()
          .custom((items, context) => {
            const currentId = context.document?._id?.replace(/^drafts\./, "");
            const refIds = (items as { _ref?: string }[] | undefined)?.map(
              (item) => item?._ref,
            );
            if (currentId && refIds?.includes(currentId)) {
              return "A post cannot reference itself.";
            }
            return true;
          }),
    }),
    defineField({
      name: "body",
      title: "Body Content",
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
            { title: "Quote", value: "blockquote" },
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
              validation: (rule) => rule.required(),
            },
            {
              name: "caption",
              type: "string",
              title: "Caption",
            },
          ],
        },
        {
          type: "code",
          options: {
            withFilename: true,
            languageAlternatives: [
              { title: "HTML", value: "html" },
              { title: "CSS", value: "css" },
              { title: "JavaScript", value: "javascript" },
              { title: "TypeScript", value: "typescript" },
              { title: "JSON", value: "json" },
              { title: "Bash", value: "bash" },
              { title: "Plain Text", value: "plaintext" },
            ],
          },
        },
        {
          type: "videoEmbed",
        },
        {
          type: "callout",
        },
        {
          type: "blogCtaInline",
        },
      ],
    }),
    defineField({
      name: "ctaOverride",
      title: "CTA Override",
      description:
        "Replaces the default Blog CTA for this post only. Leave empty to use the site default.",
      type: "reference",
      to: [{ type: "blogCta" }],
      group: "content",
    }),
    defineField({
      name: "ctaSectionOverride",
      title: "CTA Section Override",
      description:
        "Replaces the default bottom-of-page CTA Section for this post only. Leave empty to use the site default.",
      type: "reference",
      to: [{ type: "ctaSection" }],
      group: "content",
    }),
    defineField({
      name: "faqs",
      title: "FAQs",
      description:
        "Optional frequently asked questions. Drag to reorder — the question shows as the preview in this list. The section is hidden on the page if empty.",
      type: "array",
      group: "content",
      of: [{ type: "blogFaq" }],
    }),
    defineField({
      name: "seo",
      title: "SEO & Open Graph",
      description:
        "All fields are optional. When left empty, values are pulled automatically from the article title, description, and featured image.",
      type: "seo",
      group: "seo",
    }),
  ],
  orderings: [
    {
      title: "Publish Date, New",
      name: "dateDesc",
      by: [{ field: "date", direction: "desc" }],
    },
  ],
  preview: {
    select: {
      title: "title",
      categories: "categories",
      media: "image",
    },
    prepare({ title, categories, media }) {
      return {
        title,
        subtitle: categories?.join(", ") || "",
        media,
      };
    },
  },
});
