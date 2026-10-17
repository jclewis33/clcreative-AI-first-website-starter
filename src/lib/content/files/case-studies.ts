/**
 * Case studies (src/content/case-studies/*.json) → CaseStudySummary /
 * CaseStudyPage / FeaturedCaseStudy, with the flexible `content` blocks
 * mapped to ContentBlock for CaseStudyBlockRenderer. Block bodies arrive as
 * HTML, rendered at content sync. Newest first by `date`; coming-soon
 * studies list but get no page.
 */
import type {
  CaseStudyDetail,
  CaseStudyPage,
  CaseStudySummary,
  ContentBlock,
  FeaturedCaseStudy,
  SlugPath,
} from "@/lib/content/types";
import { resolveCtaSection } from "./ctas";
import { loadContent, type Entry } from "./entries";
import { localImage, newestFirst, toSeo } from "./shared";

type Study = Entry<"caseStudies">;
type Block = Study["data"]["content"][number];

const byDate = newestFirst<Study>((s) => s.data.date);

function toCaseStudySummary(entry: Study): CaseStudySummary {
  const d = entry.data;
  return {
    slug: entry.id,
    title: d.title,
    description: d.description,
    client: d.client,
    categories: [...d.categories],
    industries: [...d.industries],
    image: localImage(d.image, d.imageAlt),
    date: d.date,
    featured: d.featured,
    comingSoon: d.comingSoon,
    liveUrl: d.liveUrl ?? null,
  };
}

/** A custom ratio wins; "auto" means uncropped; else the block default. */
function aspectRatio(
  block: { aspectRatio?: string; customAspectRatio?: string },
  fallback: string,
): string | undefined {
  if (block.customAspectRatio) return block.customAspectRatio;
  if (block.aspectRatio === "auto") return undefined;
  return block.aspectRatio ?? fallback;
}

function toBlock(block: Block): ContentBlock {
  const spacing = {
    sectionSpacing: block.sectionSpacing,
    sectionSpacingTop: block.sectionSpacingTop,
    sectionSpacingBottom: block.sectionSpacingBottom,
  };
  switch (block.type) {
    case "richText":
      return {
        type: "richText",
        html: block.body.html,
        maxWidth: block.maxWidth,
        ...spacing,
      };
    case "richTextLeft":
      return {
        type: "richTextLeft",
        html: block.body.html,
        maxWidth: block.maxWidth,
        ...spacing,
      };
    case "richTextColumns":
      return { type: "richTextColumns", html: block.body.html, ...spacing };
    case "richTextWithImage":
      return {
        type: "richTextWithImage",
        html: block.body.html,
        image: block.image,
        imageAlt: block.imageAlt,
        aspectRatio: aspectRatio(block, "landscape"),
        transparent: block.transparent ?? false,
        objectFit: block.objectFit,
        position: "center",
        ...spacing,
      };
    case "fullWidthImage":
      return {
        type: "fullWidthImage",
        image: block.image,
        imageAlt: block.imageAlt,
        aspectRatio: aspectRatio(block, "wide"),
        transparent: block.transparent ?? false,
        position: "center",
        ...spacing,
      };
    case "imageGrid":
      return {
        type: "imageGrid",
        images: block.images.map((img) => ({
          src: img.image,
          alt: img.alt,
          transparent: img.transparent ?? false,
          position: "center" as const,
        })),
        aspectRatio: aspectRatio(block, "landscape"),
        ...spacing,
      };
    case "stats":
      return { type: "stats", items: block.items, ...spacing };
  }
}

/**
 * The flexible body as Markdown for llms-full.txt — the Sanity mapper's walk:
 * text blocks as written, stats as a list, image-only blocks as alt text.
 */
function toMarkdown(blocks: Block[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    if ("body" in block) parts.push(block.body.markdown.trim());
    else if (block.type === "stats")
      parts.push(
        block.items.map((s) => `- **${s.value}** — ${s.label}`).join("\n"),
      );
    else if (block.type === "fullWidthImage")
      parts.push(`![${block.imageAlt}]`);
    else if (block.type === "imageGrid")
      parts.push(block.images.map((img) => `![${img.alt}]`).join("\n"));
  }
  return parts.join("\n\n");
}

function toCaseStudyDetail(entry: Study): CaseStudyDetail {
  const d = entry.data;
  return {
    ...toCaseStudySummary(entry),
    updatedAt: d.updated ?? null,
    timeline: d.timeline ?? null,
    gallery: d.galleryImages.map((img) => localImage(img.src, img.alt)),
    blocks: d.content.map(toBlock),
    markdown: toMarkdown(d.content),
    seo: toSeo(d.seo),
  };
}

const newest = (content: { caseStudies: Map<string, Study> }) =>
  [...content.caseStudies.values()].sort(byDate);

export async function getCaseStudies(): Promise<CaseStudySummary[]> {
  return newest(await loadContent()).map(toCaseStudySummary);
}

export async function getCaseStudy(
  slug: string,
): Promise<CaseStudyPage | null> {
  const content = await loadContent();
  const entry = content.caseStudies.get(slug);
  if (!entry) return null;
  return {
    study: toCaseStudyDetail(entry),
    upNext: newest(content)
      .filter((s) => s.id !== slug)
      .slice(0, 2)
      .map(toCaseStudySummary),
    ctaSection: resolveCtaSection(content, entry.data.ctaSection),
  };
}

export async function getFeaturedCaseStudies(
  slugs: readonly string[],
): Promise<FeaturedCaseStudy[]> {
  const { caseStudies } = await loadContent();
  return slugs.flatMap((slug) => {
    const entry = caseStudies.get(slug);
    if (!entry) return [];
    const d = entry.data;
    return [
      {
        slug,
        client: d.client,
        description: d.description,
        image: localImage(d.image, d.imageAlt),
      },
    ];
  });
}

export async function getCaseStudyStaticPaths(): Promise<SlugPath[]> {
  return newest(await loadContent())
    .filter((s) => !s.data.comingSoon)
    .map((s) => ({ params: { slug: s.id } }));
}

export async function getFullCaseStudies(): Promise<CaseStudyDetail[]> {
  return newest(await loadContent())
    .filter((s) => !s.data.comingSoon)
    .map(toCaseStudyDetail);
}
