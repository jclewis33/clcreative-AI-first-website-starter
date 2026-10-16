/**
 * Projects (src/content/projects/*.json) and the gallery
 * (src/content/gallery.json) → ProjectCardData / ProjectPage / GalleryEntry,
 * ordered like the Sanity queries: newest completed first; related projects
 * same-category first.
 */
import type {
  GalleryEntry,
  ProjectCardData,
  ProjectDetail,
  ProjectPage,
  SlugPath,
} from "@/lib/content/types";
import { sizedImage } from "@/lib/content/images";
import { categoryTitle } from "@/config/projects";
import { projectPath } from "@/lib/projects";
import { resolveCtaSection } from "./ctas";
import { loadContent, type Entry } from "./entries";
import { localImage, newestFirst } from "./shared";

type Project = Entry<"projects">;

/** Project cards have always been served at this width. */
const CARD_WIDTH = 900;
const byCompleted = newestFirst<Project>((p) => p.data.completed);

function toProjectCard(entry: Project): ProjectCardData {
  const d = entry.data;
  return {
    id: entry.id,
    title: d.title,
    href: projectPath(entry.id),
    category: d.category,
    categoryLabel: categoryTitle(d.category),
    location: d.location?.trim() ?? "",
    image: sizedImage(localImage(d.heroImage, d.imageAlt), CARD_WIDTH),
  };
}

function toProjectDetail(entry: Project): ProjectDetail {
  const d = entry.data;
  return {
    slug: entry.id,
    title: d.title,
    category: d.category,
    categoryLabel: categoryTitle(d.category),
    location: d.location?.trim() ?? "",
    service: d.service?.trim() ?? "",
    completed: d.completed ?? null,
    hero: localImage(d.heroImage, d.imageAlt),
    photos: d.photos.map((photo) => ({
      image: localImage(photo.src, photo.alt),
      label: photo.label ?? null,
    })),
    descriptionHtml: d.description?.html ?? "",
    descriptionText: d.description?.text ?? "",
    quote: d.quote ? { text: d.quote.text, name: d.quote.name ?? null } : null,
    seoDescription: d.seoDescription ?? null,
  };
}

export async function getProjects(): Promise<ProjectCardData[]> {
  const { projects } = await loadContent();
  return [...projects.values()].sort(byCompleted).map(toProjectCard);
}

export async function getFeaturedProjects(): Promise<ProjectCardData[]> {
  const { projects } = await loadContent();
  return [...projects.values()]
    .filter((p) => p.data.featured)
    .sort(byCompleted)
    .slice(0, 3)
    .map(toProjectCard);
}

export async function getProject(slug: string): Promise<ProjectPage | null> {
  const content = await loadContent();
  const entry = content.projects.get(slug);
  if (!entry) return null;
  const others = [...content.projects.values()]
    .filter((p) => p.id !== slug)
    .sort(byCompleted);
  const sameCategory = (p: Project) => p.data.category === entry.data.category;
  return {
    project: toProjectDetail(entry),
    relatedProjects: [
      ...others.filter(sameCategory),
      ...others.filter((p) => !sameCategory(p)),
    ]
      .slice(0, 3)
      .map(toProjectCard),
    ctaSection: resolveCtaSection(content, undefined),
  };
}

export async function getProjectStaticPaths(): Promise<SlugPath[]> {
  const { projects } = await loadContent();
  return [...projects.keys()].map((slug) => ({ params: { slug } }));
}

export async function getGallery(): Promise<GalleryEntry[]> {
  const { gallery, projects } = await loadContent();
  return [...gallery]
    .sort(newestFirst<Entry<"gallery">>((g) => g.data.added))
    .map((entry) => {
      const d = entry.data;
      return {
        id: entry.id,
        image: localImage(d.image, d.alt),
        caption: d.caption,
        category: d.category,
        categoryLabel: categoryTitle(d.category),
        location: d.location?.trim() ?? "",
        projectTitle: d.project
          ? (projects.get(d.project.id)?.data.title.trim() ?? "")
          : "",
      };
    });
}
