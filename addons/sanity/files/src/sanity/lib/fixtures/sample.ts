/**
 * The "sample" parity dataset (PARITY_FIXTURES=sample): the Files sample
 * content in src/content, reshaped into the GROQ projections the Sanity
 * source reads, so one build per source renders the SAME content and
 * `compare-dist --equivalent` can show both render it the same way.
 *
 * - Rich text comes from each field's Markdown source (`.markdown` on the
 *   collection data; the raw body for posts), converted by
 *   ./markdown-to-pt.ts — the Files source renders the same source with
 *   MDX / Sätteri.
 * - Images become asset references whose ids encode the file's intrinsic
 *   size, as real refs do, with no hotspot (Files images have none).
 * - Every list is pre-sorted the way the Files source sorts (newest first,
 *   ties by id), because resolveFixture() keeps document order on ties.
 *
 * Dev-only, like the rest of ./fixtures: load-query.ts imports this folder
 * only in a parity build.
 */
import type { ImageMetadata } from "astro";
import { getCollection } from "astro:content";
import type { Doc, FixtureDocs } from "./data";
import { markdownToPortableText } from "./markdown-to-pt";

/** Every photo an MDX body can reference, by repo path. */
const BODY_IMAGES = import.meta.glob<ImageMetadata>(
  "/src/content/blog/images/*.{avif,gif,jpeg,jpg,png,webp}",
  { eager: true, import: "default" },
);

/** Every post's raw source, to turn a body line into a file line. */
const POST_SOURCES = import.meta.glob<string>("/src/content/blog/*.mdx", {
  eager: true,
  query: "?raw",
  import: "default",
});

/** The file line an MDX body starts on (after the frontmatter). */
function bodyLine(id: string, body: string): number {
  const raw = POST_SOURCES[`/src/content/blog/${id}.mdx`] ?? "";
  const at = body ? raw.indexOf(body) : -1;
  return at === -1 ? 1 : raw.slice(0, at).split("\n").length;
}

/** A stable alphanumeric asset id (FNV-1a of the image's build path). */
function assetId(src: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < src.length; i++) {
    hash ^= src.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `sample${hash.toString(16).padStart(8, "0")}`;
}

/** A projected Sanity image (no hotspot: Files images have no focal point). */
function img(meta: ImageMetadata): Doc {
  return {
    _type: "image",
    asset: {
      _ref: `image-${assetId(meta.src)}-${meta.width}x${meta.height}-${meta.format}`,
      _type: "reference",
    },
  };
}

/** `asset->metadata{ dimensions, lqip }`. */
const dims = (meta: ImageMetadata): Doc => ({
  dimensions: { width: meta.width, height: meta.height },
  lqip: null,
});

/** Newest first, ties by id — the Files source's order. */
const newestFirst =
  <T extends { id: string }>(dateOf: (entry: T) => string | undefined) =>
  (a: T, b: T) =>
    (dateOf(b) ?? "").localeCompare(dateOf(a) ?? "") ||
    a.id.localeCompare(b.id);

/** `_updatedAt` that JSON-LD reads exactly as the Files `updated ?? date`. */
const stamp = (date: string, updated?: string) =>
  `${updated ?? date}T12:00:00Z`;

const byId = <T extends { id: string }>(entries: T[]) =>
  new Map(entries.map((entry) => [entry.id, entry]));

export async function loadSampleDocs(): Promise<FixtureDocs> {
  const [
    blog,
    authors,
    blogCtas,
    ctaSections,
    settings,
    caseStudies,
    projects,
    gallery,
    testimonials,
  ] = await Promise.all([
    getCollection("blog"),
    getCollection("authors"),
    getCollection("blogCtas"),
    getCollection("ctaSections"),
    getCollection("settings"),
    getCollection("caseStudies"),
    getCollection("projects"),
    getCollection("gallery"),
    getCollection("testimonials"),
  ]);
  const authorById = byId(authors);
  const ctaById = byId(blogCtas);
  const sectionById = byId(ctaSections);
  const projectById = byId(projects);

  const blogCta = (id: string): Doc => {
    const d = ctaById.get(id)!.data;
    return {
      _id: id,
      heading: d.heading,
      body: d.body,
      image: img(d.image),
      imageAlt: d.imageAlt,
      aspectRatio: d.aspectRatio,
      linkUrl: d.linkUrl,
      linkLabel: d.linkLabel,
    };
  };
  const ctaSection = (id: string): Doc => {
    const d = sectionById.get(id)!.data;
    return {
      _id: id,
      heading: d.heading,
      text: d.text,
      primaryButtonLabel: d.primaryButtonLabel,
      primaryButtonHref: d.primaryButtonHref,
      secondaryButtonLabel: d.secondaryButtonLabel ?? null,
      secondaryButtonHref: d.secondaryButtonHref ?? null,
      backgroundImage: img(d.backgroundImage),
      imageAlt: d.imageAlt,
      overlayStrength: d.overlayStrength ?? null,
    };
  };
  const seo = (
    s:
      | {
          metaTitle?: string;
          metaDescription?: string;
          ogTitle?: string;
          ogDescription?: string;
          ogImage?: ImageMetadata;
        }
      | undefined,
  ): Doc | null =>
    s
      ? {
          metaTitle: s.metaTitle ?? null,
          metaDescription: s.metaDescription ?? null,
          ogTitle: s.ogTitle ?? null,
          ogDescription: s.ogDescription ?? null,
          ogImage: s.ogImage ? img(s.ogImage) : null,
        }
      : null;
  const portableText = (
    markdown: string,
    keyPrefix: string,
    source: string,
    line = 1,
  ) =>
    markdownToPortableText(markdown, {
      keyPrefix,
      source,
      line,
      image: (src) => {
        const meta =
          BODY_IMAGES[`/src/content/blog/${src.replace(/^\.\//, "")}`];
        if (!meta) throw new Error(`[sample fixtures] No body image ${src}`);
        return img(meta);
      },
      cta: blogCta,
    });

  const posts = [...blog].sort(newestFirst((p) => p.data.date)).map((p) => {
    const d = p.data;
    const author = authorById.get(d.author.id)!.data;
    return {
      title: d.title,
      slug: p.id,
      description: d.description,
      categories: [...d.categories],
      primaryCategory: d.primaryCategory ?? null,
      image: img(d.image),
      imageAlt: d.imageAlt,
      author: {
        name: author.name,
        avatar: author.avatar ? img(author.avatar) : null,
      },
      video: d.video ?? null,
      date: d.date,
      _updatedAt: stamp(d.date, d.updated),
      featured: d.featured,
      body: portableText(
        p.body ?? "",
        `${p.id}-`,
        `src/content/blog/${p.id}.mdx`,
        bodyLine(p.id, p.body ?? ""),
      ),
      ctaOverride: d.cta ? blogCta(d.cta.id) : null,
      ctaSectionOverride: d.ctaSection ? ctaSection(d.ctaSection.id) : null,
      faqs: d.faqs.map((faq, i) => ({
        question: faq.question,
        answer: portableText(
          faq.answer.markdown,
          `${p.id}-faq${i}-`,
          `src/content/blog/${p.id}.mdx → faqs[${i}].answer`,
        ),
      })),
      relatedSlugs: d.relatedPosts.map((ref) => ref.id),
      seo: seo(d.seo),
    };
  });

  const studies = [...caseStudies]
    .sort(newestFirst((s) => s.data.date))
    .map((s) => {
      const d = s.data;
      return {
        title: d.title,
        slug: s.id,
        description: d.description,
        client: d.client,
        categories: [...d.categories],
        industries: [...d.industries],
        image: img(d.image),
        imageAlt: d.imageAlt,
        date: d.date,
        _updatedAt: stamp(d.date, d.updated),
        featured: d.featured,
        comingSoon: d.comingSoon,
        timeline: d.timeline ?? null,
        liveUrl: d.liveUrl ?? null,
        galleryImagesAlt: null,
        galleryImages: d.galleryImages.map((g) => ({
          ...img(g.src),
          alt: g.alt,
        })),
        content: d.content.map((block, i) => {
          const base = {
            _type: block.type,
            _key: `${s.id}-block${i}`,
            sectionSpacing: block.sectionSpacing ?? null,
            sectionSpacingTop: block.sectionSpacingTop ?? null,
            sectionSpacingBottom: block.sectionSpacingBottom ?? null,
          };
          const body =
            "body" in block
              ? {
                  body: portableText(
                    block.body.markdown,
                    `${s.id}-block${i}-`,
                    `src/content/case-studies/${s.id}.json → content[${i}].body`,
                  ),
                }
              : {};
          const ratio =
            "aspectRatio" in block || "customAspectRatio" in block
              ? {
                  aspectRatio:
                    (block as { aspectRatio?: string }).aspectRatio ?? null,
                  customAspectRatio:
                    (block as { customAspectRatio?: string })
                      .customAspectRatio ?? null,
                }
              : {};
          switch (block.type) {
            case "richText":
            case "richTextLeft":
              return { ...base, ...body, maxWidth: block.maxWidth ?? null };
            case "richTextColumns":
              return { ...base, ...body };
            case "richTextWithImage":
              return {
                ...base,
                ...body,
                ...ratio,
                image: img(block.image),
                imageAlt: block.imageAlt,
                transparent: block.transparent ?? false,
                objectFit: block.objectFit ?? null,
              };
            case "fullWidthImage":
              return {
                ...base,
                ...ratio,
                image: img(block.image),
                imageAlt: block.imageAlt,
                transparent: block.transparent ?? false,
              };
            case "imageGrid":
              return {
                ...base,
                ...ratio,
                defaultAlt: null,
                images: block.images.map((g) => ({
                  ...img(g.image),
                  alt: g.alt,
                  transparent: g.transparent ?? false,
                })),
              };
            case "stats":
              return { ...base, items: block.items };
          }
        }),
        ctaSectionOverride: d.ctaSection ? ctaSection(d.ctaSection.id) : null,
        seo: seo(d.seo),
      };
    });

  const projectDocs = [...projects]
    .sort(newestFirst((p) => p.data.completed))
    .map((p) => {
      const d = p.data;
      return {
        _id: p.id,
        /* PROJECT_QUERY projects _updatedAt, but no mapper reads it (the
           Project view model has no updatedAt; the Files source has no
           equivalent), so any fixed value is fine for a missing date. */
        _updatedAt: stamp(d.completed ?? "2026-01-01"),
        title: d.title,
        slug: p.id,
        category: d.category,
        location: d.location ?? null,
        service: d.service ?? null,
        completed: d.completed ?? null,
        featured: d.featured,
        heroImage: img(d.heroImage),
        imageAlt: d.imageAlt,
        heroImageMeta: dims(d.heroImage),
        photos: d.photos.map((photo, i) => ({
          _key: `${p.id}-photo${i}`,
          ...img(photo.src),
          label: photo.label ?? null,
          alt: photo.alt,
          meta: dims(photo.src),
        })),
        description: d.description
          ? portableText(
              d.description.markdown,
              `${p.id}-`,
              `src/content/projects/${p.id}.json → description`,
            )
          : null,
        quote: d.quote
          ? { text: d.quote.text, name: d.quote.name ?? null }
          : null,
        seoDescription: d.seoDescription ?? null,
      };
    });

  const galleryDocs = [...gallery]
    .sort(newestFirst((g) => g.data.added))
    .map((g) => {
      const d = g.data;
      return {
        _id: g.id,
        image: img(d.image),
        imageAlt: d.alt,
        imageMeta: dims(d.image),
        caption: d.caption,
        category: d.category,
        location: d.location ?? null,
        added: d.added,
        project: d.project
          ? {
              title: projectById.get(d.project.id)!.data.title,
              slug: d.project.id,
            }
          : null,
      };
    });

  const testimonialDocs = [...testimonials]
    .sort((a, b) => a.data.order - b.data.order || a.id.localeCompare(b.id))
    .map((t) => {
      const d = t.data;
      return {
        _id: t.id,
        name: d.name,
        role: d.role ?? null,
        company: d.company ?? null,
        quote: d.quote,
        avatar: d.avatar ? img(d.avatar) : null,
        website: d.website ?? null,
        stars: d.stars ?? null,
        featured: d.featured,
        sortOrder: d.order,
      };
    });

  const site = settings.find((entry) => entry.id === "site")?.data;
  return {
    posts,
    caseStudies: studies,
    projects: projectDocs,
    gallery: galleryDocs,
    testimonials: testimonialDocs,
    settings: {
      defaultBlogCta: site?.defaultBlogCta
        ? blogCta(site.defaultBlogCta.id)
        : null,
      defaultCtaSection: site?.defaultCtaSection
        ? ctaSection(site.defaultCtaSection.id)
        : null,
    },
  };
}
