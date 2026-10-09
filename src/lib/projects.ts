/**
 * View models for Sanity projects and gallery photos.
 *
 * The queries (src/sanity/lib/queries.ts) return raw Sanity shapes: nullable
 * fields, image objects, category values like "remodel". Components take
 * plain props instead, so this file is the one place that turns a Sanity
 * document into what a card or tile renders — image URL + size + focal point,
 * category label, and the location line (shown exactly as the editor wrote
 * it — no region is appended, so the file works for any client).
 *
 * Every string is stegaClean'd: in Presentation draft mode Sanity embeds
 * invisible characters in strings, which break URLs, filters and comparisons.
 */
import type { ImageMetadata } from "astro";
import { stegaClean } from "@sanity/client/stega";
import { urlFor, hotspotPosition } from "@/sanity/lib/image";
import { categoryTitle } from "@/config/projects";

/**
 * A sized, positioned image ready for `<Visual>`. `src` is a Sanity CDN URL
 * from `sanityPhoto()`, or an imported local image — so the same cards and
 * tiles work for a site without the CMS (and for the /components demos).
 */
export interface SanityPhoto {
  src: string | ImageMetadata;
  alt: string;
  width: number;
  height: number;
  position: { x: number; y: number } | "center";
}

/** Any image object a query returns (asset reference + optional hotspot/crop). */
type ImageSource = { asset?: unknown; hotspot?: unknown } | null | undefined;
type ImageMeta = {
  dimensions: { width?: number | null; height?: number | null } | null;
} | null;

/**
 * A Sanity image at a target width, with the height that keeps its ratio.
 * Returns undefined when the image has no asset yet (a half-filled draft).
 */
export function sanityPhoto(
  image: ImageSource,
  alt: string | null | undefined,
  meta: ImageMeta | undefined,
  width = 1200,
): SanityPhoto | undefined {
  const clean = stegaClean(image);
  if (!clean?.asset) return undefined;
  const w = meta?.dimensions?.width ?? 0;
  const h = meta?.dimensions?.height ?? 0;
  const height =
    w && h ? Math.round((width * h) / w) : Math.round(width * 0.66);
  return {
    src: urlFor(clean).width(width).url(),
    alt: stegaClean(alt) ?? "",
    width,
    height,
    position: hotspotPosition(clean),
  };
}

/** The fields every project card query returns. */
export interface ProjectCardSource {
  _id: string;
  title: string | null;
  slug: string | null;
  category: string | null;
  location: string | null;
  heroImage: ImageSource;
  imageAlt: string;
  heroImageMeta: ImageMeta;
}

export interface ProjectCardData {
  id: string;
  title: string;
  href: string;
  category: string;
  categoryLabel: string;
  /** As the editor wrote it, e.g. "Springfield, IL"; "" when not set. */
  location: string;
  image: SanityPhoto | undefined;
}

export function projectPath(slug: string): string {
  return `/projects/${slug}`;
}

/** Map a project card query row to card props (null when it has no slug). */
export function toProjectCard(p: ProjectCardSource): ProjectCardData | null {
  const slug = stegaClean(p.slug);
  if (!slug) return null;
  const category = stegaClean(p.category) ?? "";
  return {
    id: p._id,
    title: stegaClean(p.title) ?? "Untitled project",
    href: projectPath(slug),
    category,
    categoryLabel: categoryTitle(category),
    location: stegaClean(p.location)?.trim() ?? "",
    image: sanityPhoto(p.heroImage, p.imageAlt, p.heroImageMeta, 900),
  };
}

/** Map a list of project rows, dropping any without a slug. */
export function toProjectCards(rows: ProjectCardSource[]): ProjectCardData[] {
  return rows
    .map(toProjectCard)
    .filter((card): card is ProjectCardData => card !== null);
}

/** The URL string of a photo, whichever kind of `src` it carries. */
export function photoUrl(photo: SanityPhoto): string {
  return typeof photo.src === "string" ? photo.src : photo.src.src;
}
