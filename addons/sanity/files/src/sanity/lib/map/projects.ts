/**
 * Sanity project + gallery rows → ProjectCardData / ProjectDetail /
 * GalleryEntry (src/lib/content/types.ts). Moved here from
 * src/lib/projects.ts, which now holds only projectPath().
 *
 * Stega: slugs, categories, labels, dates, image sources, alt text and
 * every trimmed string (location, service, gallery project title) are
 * cleaned; titles, captions, quotes and the write-up stay encoded. Policy:
 * ../source.ts.
 */
import { stegaClean } from "@sanity/client/stega";
import type {
  GALLERY_QUERY_RESULT,
  PROJECT_QUERY_RESULT,
  PROJECTS_QUERY_RESULT,
} from "@/sanity/sanity.types";
import type {
  GalleryEntry,
  ProjectCardData,
  ProjectDetail,
} from "@/lib/content/types";
import { sizedImage } from "@/lib/content/images";
import { categoryTitle } from "@/config/projects";
import { photoAlt } from "@/lib/project-format";
import { projectPath } from "@/lib/projects";
import { portableTextToHtml } from "../portable-text";
import { sanityImage } from "./image";

/** The card fields the listing, featured and related queries share. */
type RawProjectCard = PROJECTS_QUERY_RESULT[number];
type RawProject = NonNullable<PROJECT_QUERY_RESULT>;
type RawGalleryRow = GALLERY_QUERY_RESULT[number];

/** Project cards have always been served at this width. */
const CARD_WIDTH = 900;

/** A project card, or null when the row has no slug (nothing to link). */
export function toProjectCard(p: RawProjectCard): ProjectCardData | null {
  const slug = stegaClean(p.slug);
  if (!slug) return null;
  const category = stegaClean(p.category) ?? "";
  const title = p.title ?? "Untitled project";
  const image = sanityImage(
    p.heroImage,
    photoAlt(p.imageAlt, title),
    p.heroImageMeta,
  );
  return {
    id: p._id,
    title,
    href: projectPath(slug),
    category,
    categoryLabel: categoryTitle(category),
    location: stegaClean(p.location)?.trim() ?? "",
    image: image ? sizedImage(image, CARD_WIDTH) : null,
  };
}

export function toProjectDetail(p: RawProject): ProjectDetail {
  const title = p.title ?? "Project";
  const category = stegaClean(p.category) ?? "";
  return {
    slug: stegaClean(p.slug) ?? "",
    title,
    category,
    categoryLabel: categoryTitle(category),
    location: stegaClean(p.location)?.trim() ?? "",
    service: stegaClean(p.service)?.trim() ?? "",
    completed: stegaClean(p.completed),
    hero: sanityImage(
      p.heroImage,
      photoAlt(p.imageAlt, title),
      p.heroImageMeta,
    ),
    photos: (p.photos ?? []).flatMap((photo) => {
      const image = sanityImage(
        photo,
        photoAlt(photo.alt, `${title} photo`),
        photo.meta,
      );
      return image ? [{ image, label: stegaClean(photo.label) }] : [];
    }),
    descriptionHtml: portableTextToHtml(p.description),
    descriptionText: stegaClean(
      (p.description ?? [])
        .flatMap((block) => block.children ?? [])
        .map((span) => span.text ?? "")
        .join("")
        .trim(),
    ),
    quote: p.quote?.text ? { text: p.quote.text, name: p.quote.name } : null,
    seoDescription: stegaClean(p.seoDescription),
  };
}

/** A gallery photo, or null when it has no image asset yet. */
export function toGalleryEntry(row: RawGalleryRow): GalleryEntry | null {
  const caption = row.caption ?? "";
  const image = sanityImage(
    row.image,
    photoAlt(row.imageAlt, stegaClean(caption) || "Gallery photo"),
    row.imageMeta,
  );
  if (!image) return null;
  const category = stegaClean(row.category) ?? "";
  return {
    id: row._id,
    image,
    caption,
    category,
    categoryLabel: categoryTitle(category),
    location: stegaClean(row.location)?.trim() ?? "",
    projectTitle: stegaClean(row.project?.title)?.trim() ?? "",
  };
}
