/**
 * Shared Portable Text marks config — decorators and annotations
 * reused across blogPost.ts, glossaryTerm.ts, and caseStudy.ts.
 *
 * The `internalLink` annotation lets editors pick another document
 * (blog post, case study, or glossary term) from a search dialog
 * instead of pasting a URL.
 */

export const internalLinkAnnotation = {
  name: "internalLink",
  type: "object" as const,
  title: "Internal link",
  fields: [
    {
      name: "reference",
      type: "reference" as const,
      title: "Reference",
      to: [
        { type: "blogPost" },
        { type: "caseStudy" },
        { type: "glossaryTerm" },
      ],
      validation: (rule: any) => rule.required(),
    },
    {
      name: "newTab",
      type: "boolean" as const,
      title: "Open in new tab",
      initialValue: false,
    },
  ],
};

export const externalLinkAnnotation = {
  name: "link",
  type: "object" as const,
  title: "Link",
  fields: [
    {
      name: "href",
      type: "url" as const,
      title: "URL",
      validation: (rule: any) =>
        rule.uri({ allowRelative: true, scheme: ["http", "https", "mailto"] }),
    },
    {
      name: "newTab",
      type: "boolean" as const,
      title: "Open in new tab",
      initialValue: false,
    },
  ],
};

export const defaultMarks = {
  decorators: [
    { title: "Bold", value: "strong" },
    { title: "Italic", value: "em" },
    { title: "Code", value: "code" },
    { title: "Underline", value: "underline" },
    { title: "Strikethrough", value: "strike-through" },
  ],
  annotations: [externalLinkAnnotation, internalLinkAnnotation],
};
