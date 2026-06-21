import { defineField, defineType, defineArrayMember } from "sanity";
import { CaseIcon } from "@sanity/icons";
import { defaultMarks } from "./portableTextConfig";

/**
 * Spacing options shared by all three spacing fields.
 */
const spacingOptions = [
  { title: "None", value: "none" },
  { title: "Extra Small", value: "xsmall" },
  { title: "Small", value: "small" },
  { title: "Main", value: "main" },
  { title: "Large", value: "large" },
];

/**
 * Reusable section spacing fields — added to every content block so editors
 * can control vertical padding per block from within Sanity.
 *
 * - sectionSpacing: sets both top and bottom (default: xsmall)
 * - sectionSpacingTop: overrides top only
 * - sectionSpacingBottom: overrides bottom only
 */
/**
 * Max-width options for rich text blocks.
 */
const maxWidthOptions = [
  { title: "Default", value: "" },
  { title: "20ch", value: "20ch" },
  { title: "30ch", value: "30ch" },
  { title: "40ch", value: "40ch" },
  { title: "48ch", value: "48ch" },
  { title: "60ch", value: "60ch" },
  { title: "48rem", value: "48rem" },
  { title: "60rem", value: "60rem" },
  { title: "100%", value: "100%" },
];

/**
 * Aspect ratio options for image blocks.
 * "Auto" removes the crop and shows the image at its natural ratio.
 */
const aspectRatioOptions = [
  { title: "Default", value: "" },
  { title: "Auto (no crop)", value: "auto" },
  { title: "Wide (21:9)", value: "wide" },
  { title: "Widescreen (16:9)", value: "widescreen" },
  { title: "Landscape (3:2)", value: "landscape" },
  { title: "Square (1:1)", value: "square" },
  { title: "Portrait (2:3)", value: "portrait" },
  { title: "Tall (3:4)", value: "tall" },
];

/**
 * Reusable image display fields — aspect ratio controls for image blocks.
 */
const imageDisplayFields = [
  defineField({
    name: "aspectRatio",
    title: "Aspect Ratio",
    description:
      'Image crop ratio. "Auto" shows the full image uncropped. Leave as "Default" to use the block\'s built-in ratio.',
    type: "string",
    options: { list: aspectRatioOptions },
  }),
  defineField({
    name: "customAspectRatio",
    title: "Custom Aspect Ratio",
    description:
      'Overrides the dropdown above. Use CSS ratio format, e.g. "4/3", "16/10", "2.35/1".',
    type: "string",
  }),
];

const sectionSpacingFields = [
  defineField({
    name: "sectionSpacing",
    title: "Section Spacing",
    description: "Vertical padding above and below this block.",
    type: "string",
    options: { list: spacingOptions },
    initialValue: "xsmall",
  }),
  defineField({
    name: "sectionSpacingTop",
    title: "Section Spacing — Top Override",
    description: "Override the top padding only. Leave empty to use Section Spacing.",
    type: "string",
    options: { list: spacingOptions },
  }),
  defineField({
    name: "sectionSpacingBottom",
    title: "Section Spacing — Bottom Override",
    description: "Override the bottom padding only. Leave empty to use Section Spacing.",
    type: "string",
    options: { list: spacingOptions },
  }),
];

/**
 * Reusable rich text styles — shared across all portable-text body fields.
 */
const richTextStyles = [
  { title: "Normal", value: "normal" },
  { title: "H2", value: "h2" },
  { title: "H3", value: "h3" },
  { title: "H4", value: "h4" },
];

/**
 * Thumbnail images for the "Add item" content-block picker (the array
 * `insertMenu` grid view). Keyed by each block's array-member `name`. These are
 * Sanity Media-library assets (content-addressed CDN URLs, so they're immutable
 * and safe to hardcode) uploaded specifically as picker thumbnails.
 *
 * ⚠️ Keep these assets in the Media library — they aren't referenced by any
 * document field, so a "remove unused assets" cleanup would wrongly flag them.
 * If you re-upload a thumbnail, update its URL here.
 */
const blockPreviewImages: Record<string, string> = {
  richText:
    "https://cdn.sanity.io/images/2mcikzx3/production/9298fc64e5d47c60d316cdfa370434d2c8d191d0-1440x492.png",
  richTextLeft:
    "https://cdn.sanity.io/images/2mcikzx3/production/c0923e2615aaa57dc672bc72e3489bbd2d9c0dbe-1440x392.png",
  richTextColumns:
    "https://cdn.sanity.io/images/2mcikzx3/production/68f524fbff9f444eb958e043d14697ef499da294-1440x460.png",
  richTextWithImage:
    "https://cdn.sanity.io/images/2mcikzx3/production/27d9a2ed196d0ed29def7d8393b8eb69b36e81aa-1440x608.png",
  fullWidthImage:
    "https://cdn.sanity.io/images/2mcikzx3/production/4b9245a6194c5be1713c0f2ab7fa2b21fc04b4da-1440x857.png",
  imageGrid:
    "https://cdn.sanity.io/images/2mcikzx3/production/bea2cec36ce4d9378344f3d8caf8296826467b5f-1440x1250.png",
  stats:
    "https://cdn.sanity.io/images/2mcikzx3/production/acc8eefdb6a56da097396aaa5ec85f1c942b9ecf-1440x428.png",
};

export const caseStudy = defineType({
  name: "caseStudy",
  title: "Case Study",
  type: "document",
  icon: CaseIcon,
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
      description: "Short summary for cards and SEO.",
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
      name: "client",
      title: "Client Name",
      type: "string",
      group: "content",
      validation: (rule) => rule.required(),
    }),
     defineField({
      name: "image",
      title: "Featured Image",
      description:
        "Used for the case-study card and the “Up Next” cards. Upload at a 3:2 ratio (e.g. 1200×800px) — the hotspot handles minor cropping.",
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
      name: "date",
      title: "Publish Date",
      type: "date",
      group: "meta",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "featured",
      title: "Featured",
      type: "boolean",
      group: "meta",
      initialValue: false,
    }),
    defineField({
      name: "comingSoon",
      title: "Coming Soon",
      description:
        "When enabled, the card on /case-studies shows a “Case Study Coming Soon — Visit Website” notice and links to the Live URL in a new tab. The detail page is hidden (404) and the slug is excluded from the sitemap. Live URL becomes required.",
      type: "boolean",
      group: "meta",
      initialValue: false,
    }),
    defineField({
      name: "categories",
      title: "Categories",
      description: "The services delivered on this project.",
      type: "array",
      group: "meta",
      of: [{ type: "string" }],
      options: {
        list: [
          { title: "Web Design", value: "Web Design" },
          { title: "Webflow Development", value: "Webflow Development" },
          { title: "Website Development", value: "Website Development" },
          { title: "Migration", value: "Migration" },
          { title: "SEO", value: "SEO" },
          { title: "Brand Strategy", value: "Brand Strategy" },
          { title: "Photography", value: "Photography" },
          { title: "Automation", value: "Automation" },
          { title: "M2M Messaging", value: "M2M Messaging" },
        ],
      },
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "industries",
      title: "Industries",
      description:
        "The industry/industries this client operates in. Drives the Industry filter on /case-studies — only industries used by at least one case study appear in the dropdown.",
      type: "array",
      group: "meta",
      of: [{ type: "string" }],
      options: {
        list: [
          { title: "Agencies", value: "Agencies" },
          { title: "AI Companies", value: "AI Companies" },
          { title: "Consultants", value: "Consultants" },
          { title: "Financial Services", value: "Financial Services" },
          { title: "Food & Beverage", value: "Food & Beverage" },
          { title: "Home Services", value: "Home Services" },
          { title: "Manufacturing / Industrial", value: "Manufacturing / Industrial" },
          { title: "Non-Profits", value: "Non-Profits" },
          { title: "Real Estate", value: "Real Estate" },
          { title: "Recruiting", value: "Recruiting" },
          { title: "Retail / E-commerce", value: "Retail / E-commerce" },
          { title: "SaaS", value: "SaaS" },
          { title: "Wellness", value: "Wellness" },
        ],
      },
      validation: (rule) => rule.required().min(1),
    }),

    defineField({
      name: "timeline",
      title: "Project Timeline",
      description: 'e.g. "8 weeks", "6 months"',
      type: "string",
      group: "meta",
    }),
    defineField({
      name: "liveUrl",
      title: "Live URL",
      type: "url",
      group: "meta",
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as { comingSoon?: boolean } | undefined;
          if (parent?.comingSoon && !value) {
            return "Live URL is required when Coming Soon is enabled.";
          }
          return true;
        }),
    }),
    defineField({
      name: "galleryImagesAlt",
      title: "Default Alt Text",
      description:
        "Applied to all gallery images unless overridden on an individual image.",
      type: "string",
      group: "media",
    }),
    defineField({
      name: "galleryImages",
      title: "Gallery Images",
      description:
        "Hero slider images for the case study detail page. Use a consistent ratio across all images — landscape 3:2 (e.g. 1600×1067px) is recommended so slides don't jump in height.",
      type: "array",
      group: "media",
      of: [
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            {
              name: "alt",
              type: "string",
              title: "Alt Text (Override)",
              description: "Leave blank to use the default alt text above.",
            },
          ],
        },
      ],
    }),
    defineField({
      name: "content",
      title: "Content Blocks",
      description: "Flexible content blocks — drag to reorder.",
      type: "array",
      group: "content",
      options: {
        insertMenu: {
          // Default the picker to the thumbnail grid; keep a list view too.
          showIcons: true,
          views: [
            {
              name: "grid",
              previewImageUrl: (schemaTypeName) =>
                blockPreviewImages[schemaTypeName]
                  ? `${blockPreviewImages[schemaTypeName]}?w=800&fit=max&auto=format`
                  : "",
            },
            { name: "list" },
          ],
        },
      },
      of: [
        defineArrayMember({
          name: "richText",
          title: "Rich Text (Centered)",
          type: "object",
          fields: [
            defineField({
              name: "body",
              title: "Body",
              type: "array",
              of: [
                {
                  type: "block",
                  styles: richTextStyles,
                  marks: defaultMarks,
                },
                {
                  type: "videoEmbed",
                },
              ],
            }),
            defineField({
              name: "maxWidth",
              title: "Max Width",
              description:
                "Override the maximum width of the text block. Default: 48rem.",
              type: "string",
              options: { list: maxWidthOptions },
            }),
            ...sectionSpacingFields,
          ],
          preview: {
            select: { body: "body" },
            prepare({ body }) {
              const text = body?.[0]?.children?.[0]?.text || "Rich Text Block";
              return { title: "Rich Text (Centered)", subtitle: text };
            },
          },
        }),
        defineArrayMember({
          name: "richTextLeft",
          title: "Rich Text (Left-Aligned)",
          type: "object",
          fields: [
            defineField({
              name: "body",
              title: "Body",
              type: "array",
              of: [
                {
                  type: "block",
                  styles: richTextStyles,
                  marks: defaultMarks,
                },
                {
                  type: "videoEmbed",
                },
              ],
            }),
            defineField({
              name: "maxWidth",
              title: "Max Width",
              description:
                "Override the maximum width of the text block. Default: 70ch.",
              type: "string",
              options: { list: maxWidthOptions },
            }),
            ...sectionSpacingFields,
          ],
          preview: {
            select: { body: "body" },
            prepare({ body }) {
              const text = body?.[0]?.children?.[0]?.text || "Rich Text Block";
              return { title: "Rich Text (Left)", subtitle: text };
            },
          },
        }),
        defineArrayMember({
          name: "richTextColumns",
          title: "Rich Text (Columns)",
          type: "object",
          fields: [
            defineField({
              name: "body",
              title: "Body",
              type: "array",
              of: [
                {
                  type: "block",
                  styles: richTextStyles,
                  marks: defaultMarks,
                },
                {
                  type: "videoEmbed",
                },
              ],
            }),
            ...sectionSpacingFields,
          ],
          preview: {
            select: { body: "body" },
            prepare({ body }) {
              const text = body?.[0]?.children?.[0]?.text || "Rich Text Columns Block";
              return { title: "Rich Text (Columns)", subtitle: text };
            },
          },
        }),
        defineArrayMember({
          name: "richTextWithImage",
          title: "Rich Text + Image",
          type: "object",
          fields: [
            defineField({
              name: "body",
              title: "Body",
              type: "array",
              of: [
                {
                  type: "block",
                  styles: richTextStyles,
                  marks: defaultMarks,
                },
                {
                  type: "videoEmbed",
                },
              ],
            }),
            defineField({
              name: "image",
              title: "Image",
              description:
                "Displays at 3:2 landscape by default (e.g. 1200×800px). Change the crop with the Aspect Ratio field below.",
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
              name: "transparent",
              title: "Remove Skeleton Background",
              description:
                "Enable for images with transparency (logos, PNGs) to remove the loading skeleton.",
              type: "boolean",
              initialValue: false,
            }),
            defineField({
              name: "objectFit",
              title: "Object Fit",
              description:
                'How the image fills its container. "Cover" crops to fill (default). "Contain" shows the full image without cropping.',
              type: "string",
              options: {
                list: [
                  { title: "Cover (default)", value: "cover" },
                  { title: "Contain", value: "contain" },
                ],
              },
            }),
            ...imageDisplayFields,
            ...sectionSpacingFields,
          ],
          preview: {
            select: { media: "image" },
            prepare({ media }) {
              return { title: "Rich Text + Image", media };
            },
          },
        }),
        defineArrayMember({
          name: "fullWidthImage",
          title: "Full Width Image",
          type: "object",
          fields: [
            defineField({
              name: "image",
              title: "Image",
              description:
                "Displays at 16:9 wide by default (e.g. 2000×1125px). Change the crop with the Aspect Ratio field below.",
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
              name: "transparent",
              title: "Remove Skeleton Background",
              description:
                "Enable for images with transparency (logos, PNGs) to remove the loading skeleton.",
              type: "boolean",
              initialValue: false,
            }),
            ...imageDisplayFields,
            ...sectionSpacingFields,
          ],
          preview: {
            select: { media: "image" },
            prepare({ media }) {
              return { title: "Full Width Image", media };
            },
          },
        }),
        defineArrayMember({
          name: "imageGrid",
          title: "Image Grid",
          type: "object",
          fields: [
            defineField({
              name: "defaultAlt",
              title: "Default Alt Text",
              description:
                "Applied to all images unless overridden on an individual image.",
              type: "string",
            }),
            defineField({
              name: "images",
              title: "Images",
              description:
                "Each cell displays at 3:2 landscape by default (e.g. 1200×800px). Use a consistent ratio across all images, or change the crop with the Aspect Ratio field below.",
              type: "array",
              of: [
                {
                  type: "image",
                  options: { hotspot: true },
                  fields: [
                    {
                      name: "alt",
                      type: "string",
                      title: "Alt Text (Override)",
                      description: "Leave blank to use the default alt text above.",
                    },
                    {
                      name: "transparent",
                      type: "boolean",
                      title: "Remove Skeleton Background",
                      description:
                        "Enable for images with transparency (logos, PNGs).",
                    },
                  ],
                },
              ],
              validation: (rule) => rule.required().min(2),
            }),
            ...imageDisplayFields,
            ...sectionSpacingFields,
          ],
          preview: {
            select: { images: "images" },
            prepare({ images }) {
              return { title: `Image Grid (${images?.length || 0} images)` };
            },
          },
        }),
        defineArrayMember({
          name: "stats",
          title: "Stats",
          type: "object",
          fields: [
            defineField({
              name: "items",
              title: "Stat Items",
              type: "array",
              of: [
                {
                  type: "object",
                  fields: [
                    defineField({
                      name: "value",
                      title: "Value",
                      type: "string",
                      validation: (rule) => rule.required(),
                    }),
                    defineField({
                      name: "label",
                      title: "Label",
                      type: "string",
                      validation: (rule) => rule.required(),
                    }),
                  ],
                  preview: {
                    select: { title: "value", subtitle: "label" },
                  },
                },
              ],
              validation: (rule) => rule.required().min(1),
            }),
            ...sectionSpacingFields,
          ],
          preview: {
            select: { items: "items" },
            prepare({ items }) {
              return { title: `Stats (${items?.length || 0} items)` };
            },
          },
        }),
      ],
    }),
    defineField({
      name: "ctaSectionOverride",
      title: "CTA Section Override",
      description:
        "Replaces the default bottom-of-page CTA Section for this case study only. Leave empty to use the site default.",
      type: "reference",
      group: "content",
      to: [{ type: "ctaSection" }],
    }),
    defineField({
      name: "seo",
      title: "SEO & Open Graph",
      description:
        "All fields are optional. When left empty, values are pulled automatically from the case study title, description, and featured image.",
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
      subtitle: "client",
      media: "image",
      comingSoon: "comingSoon",
    },
    prepare({ title, subtitle, media, comingSoon }) {
      return {
        title,
        subtitle: comingSoon ? `${subtitle} (Coming Soon)` : subtitle,
        media,
      };
    },
  },
});
