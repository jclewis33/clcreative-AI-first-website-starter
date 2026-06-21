import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { presentationTool } from "sanity/presentation";
import { visionTool } from "@sanity/vision";
import { media, mediaAssetSource } from "sanity-plugin-media";
import { codeInput } from "@sanity/code-input";
import {
  CogIcon,
  DocumentTextIcon,
  StarIcon,
  EditIcon,
  CaseIcon,
  BookIcon,
  ClockIcon,
  PackageIcon,
  BellIcon,
  BlockElementIcon,
  UsersIcon,
  UserIcon,
  CommentIcon,
  FilterIcon,
} from "@sanity/icons";
import {
  SANITY_PROJECT_ID,
  SANITY_DATASET,
} from "./src/config/site.shared.mjs";
import { schema } from "./src/sanity/schemaTypes";
import { resolve } from "./src/sanity/lib/resolve";
import { StudioLogo } from "./src/sanity/components/StudioLogo";
import { StudioIcon } from "./src/sanity/components/StudioIcon";
import {
  ViewOnSiteAction,
  FeaturedBadge,
  ComingSoonBadge,
} from "./src/sanity/components/studioDocument";

const SINGLETON_TYPES = new Set(["siteSettings"]);
const SINGLETON_ACTIONS = new Set(["publish", "discardChanges", "restore"]);
// Types with a public detail page — get the "View on site" document action.
const PREVIEWABLE_TYPES = new Set(["blogPost", "caseStudy", "glossaryTerm"]);

// Sort newest-first — mirrors the `dateDesc` ordering defined on the schemas.
const DATE_DESC = [{ field: "date", direction: "desc" as const }];

// Required on any S.documentList() with a custom .filter() — Sanity warns
// ("No apiVersion specified for document type list with custom filter") and
// will require it in a future Studio. Keep in sync with the apiVersion used
// elsewhere (visionTool / astro.config.mjs).
const STRUCTURE_API_VERSION = "2025-03-15";

export default defineConfig({
  name: "clcreative",
  title: "CL Creative",
  icon: StudioIcon,
  // Custom CL Creative wordmark in the Studio navbar (StudioLogo).
  // See src/sanity/components/.
  studio: {
    components: {
      logo: StudioLogo,
    },
  },
  // From the shared leaf module (src/config/site.shared.mjs) so this file works
  // both in the embedded `@sanity/astro` runtime AND when loaded directly by the
  // Sanity CLI for `sanity deploy` (Node, no `import.meta.env`). Project id and
  // dataset are public values that appear in every Sanity API URL anyway.
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  plugins: [
    // The Studio opens on the content desk (first tool = default tool). The
    // org-level "overview" experience now lives in Sanity's hosted Dashboard
    // (the deployed Studio is a Core app there) rather than an in-Studio
    // dashboard widget.
    structureTool({
      structure: (S) =>
        S.list()
          .title("Content")
          .items([
            // Content-first: the most-edited types are direct document lists
            // at the top, so a single click reaches the content (no folder of
            // folders). Filtered "Quick views", supporting types, and the
            // Site Settings singleton sit below.
            S.listItem()
              .title("Blog Posts")
              .icon(DocumentTextIcon)
              .child(
                S.documentTypeList("blogPost")
                  .title("Blog Posts")
                  .defaultOrdering(DATE_DESC),
              ),
            S.listItem()
              .title("Case Studies")
              .icon(CaseIcon)
              .child(
                S.documentTypeList("caseStudy")
                  .title("Case Studies")
                  .defaultOrdering(DATE_DESC),
              ),
            S.listItem()
              .title("Glossary Terms")
              .icon(BookIcon)
              .child(
                S.documentTypeList("glossaryTerm")
                  .title("Glossary Terms")
                  .defaultOrdering([{ field: "term", direction: "asc" }]),
              ),
            S.divider(),

            // Filtered views — reachable, but not blocking the path to the
            // main lists above.
            S.listItem()
              .title("Quick views")
              .icon(FilterIcon)
              .child(
                S.list()
                  .title("Quick views")
                  .items([
                    S.listItem()
                      .title("Featured Posts")
                      .icon(StarIcon)
                      .child(
                        S.documentList()
                          .title("Featured Posts")
                          .schemaType("blogPost")
                          .apiVersion(STRUCTURE_API_VERSION)
                          .filter('_type == "blogPost" && featured == true')
                          .defaultOrdering(DATE_DESC),
                      ),
                    S.listItem()
                      .title("Draft Posts")
                      .icon(EditIcon)
                      .child(
                        S.documentList()
                          .title("Draft Posts")
                          .schemaType("blogPost")
                          .apiVersion(STRUCTURE_API_VERSION)
                          .filter(
                            '_type == "blogPost" && _id in path("drafts.**")',
                          )
                          .defaultOrdering(DATE_DESC),
                      ),
                    S.listItem()
                      .title("Featured Case Studies")
                      .icon(StarIcon)
                      .child(
                        S.documentList()
                          .title("Featured Case Studies")
                          .schemaType("caseStudy")
                          .apiVersion(STRUCTURE_API_VERSION)
                          .filter('_type == "caseStudy" && featured == true')
                          .defaultOrdering(DATE_DESC),
                      ),
                    S.listItem()
                      .title("Case Studies — Coming Soon")
                      .icon(ClockIcon)
                      .child(
                        S.documentList()
                          .title("Coming Soon")
                          .schemaType("caseStudy")
                          .apiVersion(STRUCTURE_API_VERSION)
                          .filter('_type == "caseStudy" && comingSoon == true')
                          .defaultOrdering(DATE_DESC),
                      ),
                  ]),
              ),
            S.divider(),

            // Helper / supporting types — tucked into labeled groups.
            S.listItem()
              .title("Reusable Content")
              .icon(PackageIcon)
              .child(
                S.list()
                  .title("Reusable Content")
                  .items([
                    S.listItem()
                      .title("Blog CTAs")
                      .icon(BellIcon)
                      .child(
                        S.documentTypeList("blogCta").title("Blog CTAs"),
                      ),
                    S.listItem()
                      .title("CTA Sections")
                      .icon(BlockElementIcon)
                      .child(
                        S.documentTypeList("ctaSection").title("CTA Sections"),
                      ),
                  ]),
              ),
            S.listItem()
              .title("People & Social")
              .icon(UsersIcon)
              .child(
                S.list()
                  .title("People & Social")
                  .items([
                    S.listItem()
                      .title("Authors")
                      .icon(UserIcon)
                      .child(S.documentTypeList("author").title("Authors")),
                    S.listItem()
                      .title("Testimonials")
                      .icon(CommentIcon)
                      .child(
                        S.documentTypeList("testimonial").title("Testimonials"),
                      ),
                  ]),
              ),
            S.divider(),

            // Singleton — pinned at the bottom (config, not daily content),
            // no create/delete actions (see SINGLETON_* logic below).
            S.listItem()
              .title("Site Settings")
              .id("siteSettings")
              .icon(CogIcon)
              .child(
                S.document()
                  .schemaType("siteSettings")
                  .documentId("siteSettings"),
              ),
          ]),
    }),
    presentationTool({
      resolve,
      // The Studio is hosted at clcreative.sanity.studio and iframes the live
      // site cross-origin. `initial` is the site origin (overridable via
      // SANITY_STUDIO_PREVIEW_URL for local `sanity dev` against localhost).
      // The enable/disable endpoints resolve relative to it and live on the
      // site (src/pages/api/draft-mode/*).
      previewUrl: {
        initial:
          process.env.SANITY_STUDIO_PREVIEW_URL || "https://www.clcreative.co",
        previewMode: {
          enable: "/api/draft-mode/enable",
          disable: "/api/draft-mode/disable",
        },
      },
      // Iframe origins the Studio trusts for Comlink/overlay messaging.
      allowOrigins: ["http://localhost:*", "https://www.clcreative.co"],
    }),
    // Dev-only GROQ playground for testing queries against the live dataset.
    // Gated so it never appears in the deployed Studio toolbar. The static
    // import stays in the bundle; only the runtime tool is hidden in prod.
    // `import.meta.env` is undefined under the Sanity CLI (Node) — the `?.`
    // makes that case fall through to excluding Vision, which is correct.
    ...(import.meta.env?.DEV
      ? [visionTool({ defaultApiVersion: "2025-03-15" })]
      : []),
    media(),
    codeInput(),
  ],
  schema: {
    ...schema,
    templates: (templates) =>
      templates.filter(({ schemaType }) => !SINGLETON_TYPES.has(schemaType)),
  },
  document: {
    actions: (input, context) => {
      if (SINGLETON_TYPES.has(context.schemaType)) {
        return input.filter(
          ({ action }) => action && SINGLETON_ACTIONS.has(action),
        );
      }
      // Add "View on site" to the previewable content types.
      if (PREVIEWABLE_TYPES.has(context.schemaType)) {
        return [...input, ViewOnSiteAction];
      }
      return input;
    },
    badges: (input, context) => {
      if (context.schemaType === "caseStudy") {
        return [...input, FeaturedBadge, ComingSoonBadge];
      }
      if (context.schemaType === "blogPost") {
        return [...input, FeaturedBadge];
      }
      return input;
    },
  },
  form: {
    image: {
      assetSources: () => [mediaAssetSource],
    },
    file: {
      assetSources: () => [mediaAssetSource],
    },
  },
});
