/**
 * Sanity case-study rows → CaseStudySummary / CaseStudyDetail /
 * FeaturedCaseStudy, including the flexible `content[]` blocks mapped to
 * ContentBlock (the contract the case-study block components render) —
 * moved here from CaseStudyTemplate.
 *
 * Stega: slugs, categories, industries, URLs, dates, booleans, image
 * sources, alt text and every block layout value (spacing, max width,
 * aspect ratio, object-fit) are cleaned — an encoded "wide" is invalid CSS
 * and collapses the image wrapper in Presentation. Titles, descriptions,
 * client names, timelines and rich text stay encoded. Policy: ../source.ts.
 */
import { stegaClean } from "@sanity/client/stega";
import type {
  CASE_STUDIES_QUERY_RESULT,
  CASE_STUDY_QUERY_RESULT,
  FEATURED_CASE_STUDIES_QUERY_RESULT,
} from "@/sanity/sanity.types";
import type {
  CaseStudyDetail,
  CaseStudySummary,
  ContentBlock,
  FeaturedCaseStudy,
} from "@/lib/content/types";
import { urlFor, hotspotPosition } from "../image";
import { portableTextToHtml } from "../portable-text";
import { sanityImage } from "./image";
import { toSeo } from "./seo";

type RawCaseStudyCard = CASE_STUDIES_QUERY_RESULT[number];
type RawCaseStudy = NonNullable<CASE_STUDY_QUERY_RESULT>;
type RawBlock = NonNullable<RawCaseStudy["content"]>[number];
type RawFeatured = FEATURED_CASE_STUDIES_QUERY_RESULT[number];

const cleanList = (values: string[] | null | undefined) =>
  (values ?? []).map((v) => stegaClean(v));

/** A listing card, or null when it has no slug or title (nothing to list). */
export function toCaseStudySummary(
  c: RawCaseStudyCard,
): CaseStudySummary | null {
  const slug = stegaClean(c.slug);
  if (!slug || !c.title) return null;
  return {
    slug,
    title: c.title,
    description: c.description,
    client: c.client,
    categories: cleanList(c.categories),
    industries: cleanList(c.industries),
    image: sanityImage(c.image, c.imageAlt),
    date: stegaClean(c.date),
    featured: stegaClean(c.featured) ?? false,
    comingSoon: stegaClean(c.comingSoon) ?? false,
    liveUrl: stegaClean(c.liveUrl),
  };
}

export function toFeaturedCaseStudy(s: RawFeatured): FeaturedCaseStudy | null {
  const slug = stegaClean(s.slug);
  if (!slug) return null;
  return {
    slug,
    client: s.client,
    description: s.description,
    image: sanityImage(s.image, s.imageAlt),
  };
}

const imageUrlFn = (ref: string) => urlFor({ _ref: ref }).width(1920).url();
const hasImageSource = (value: any) =>
  Boolean(value?.asset?._ref || value?._ref || value?.asset?._id);

const resolveAspectRatio = (block: any, fallback: string) => {
  const custom = stegaClean(block.customAspectRatio);
  if (custom) return custom;
  const ratio = stegaClean(block.aspectRatio);
  if (ratio === "auto") return undefined;
  return ratio || fallback;
};

function toBlock(block: RawBlock): ContentBlock | null {
  const spacingProps = {
    sectionSpacing: stegaClean(block.sectionSpacing) || undefined,
    sectionSpacingTop: stegaClean(block.sectionSpacingTop) || undefined,
    sectionSpacingBottom: stegaClean(block.sectionSpacingBottom) || undefined,
  };

  switch (block._type) {
    case "richText":
      return {
        type: "richText",
        html: portableTextToHtml(block.body, imageUrlFn),
        maxWidth: stegaClean(block.maxWidth) || undefined,
        ...spacingProps,
      };
    case "richTextLeft":
      return {
        type: "richTextLeft",
        html: portableTextToHtml(block.body, imageUrlFn),
        maxWidth: stegaClean(block.maxWidth) || undefined,
        ...spacingProps,
      };
    case "richTextColumns":
      return {
        type: "richTextColumns",
        html: portableTextToHtml(block.body, imageUrlFn),
        ...spacingProps,
      };
    case "richTextWithImage":
      if (!hasImageSource(block.image)) return null;
      return {
        type: "richTextWithImage",
        html: portableTextToHtml(block.body, imageUrlFn),
        image: urlFor(block.image).width(1600).url(),
        imageAlt: stegaClean(block.imageAlt) || "",
        aspectRatio: resolveAspectRatio(block, "landscape"),
        transparent: block.transparent || false,
        objectFit: stegaClean(block.objectFit) || undefined,
        position: hotspotPosition(block.image),
        ...spacingProps,
      };
    case "fullWidthImage":
      if (!hasImageSource(block.image)) return null;
      return {
        type: "fullWidthImage",
        image: urlFor(block.image).width(2400).url(),
        imageAlt: stegaClean(block.imageAlt) || "",
        aspectRatio: resolveAspectRatio(block, "wide"),
        transparent: block.transparent || false,
        position: hotspotPosition(block.image),
        ...spacingProps,
      };
    case "imageGrid":
      return {
        type: "imageGrid",
        images: (block.images ?? [])
          .filter((img) => hasImageSource(img))
          .map((img) => ({
            src: urlFor(img).width(1400).url(),
            alt: stegaClean(img.alt || block.defaultAlt) || "",
            transparent: img.transparent || false,
            position: hotspotPosition(img),
          })),
        aspectRatio: resolveAspectRatio(block, "landscape"),
        ...spacingProps,
      };
    case "stats":
      return { type: "stats", items: block.items ?? [], ...spacingProps };
    default:
      return null;
  }
}

export function toCaseStudyDetail(s: RawCaseStudy): CaseStudyDetail {
  return {
    slug: stegaClean(s.slug) ?? "",
    title: s.title,
    description: s.description,
    client: s.client,
    categories: cleanList(s.categories),
    industries: cleanList(s.industries),
    image: sanityImage(s.image, s.imageAlt),
    date: stegaClean(s.date),
    updatedAt: s._updatedAt,
    featured: stegaClean(s.featured) ?? false,
    comingSoon: stegaClean(s.comingSoon) ?? false,
    timeline: s.timeline,
    liveUrl: stegaClean(s.liveUrl),
    gallery: (s.galleryImages ?? []).flatMap((img) => {
      const image = sanityImage(img, img.alt || s.galleryImagesAlt || "");
      return image ? [image] : [];
    }),
    blocks: (s.content ?? [])
      .map(toBlock)
      .filter(
        (block): block is ContentBlock =>
          block !== null &&
          (block.type !== "imageGrid" || block.images.length > 0),
      ),
    seo: toSeo(s.seo),
  };
}
