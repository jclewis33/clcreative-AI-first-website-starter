/**
 * Blog CTAs (src/content/ctas/blog/), CTA sections (src/content/ctas/section/)
 * and the site defaults in src/content/settings.json → BlogCtaData /
 * CtaSectionData.
 */
import type {
  BlogCtaData,
  CtaDefaults,
  CtaSectionData,
} from "@/lib/content/types";
import { loadContent, need, type Content, type Entry } from "./entries";
import { localImage } from "./shared";

/** A reference field's value. */
type Ref = { id: string } | undefined;

export function toBlogCta(entry: Entry<"blogCtas">): BlogCtaData {
  const d = entry.data;
  return {
    heading: d.heading,
    body: d.body,
    image: localImage(d.image, d.imageAlt),
    aspectRatio: d.aspectRatio,
    linkUrl: d.linkUrl,
    linkLabel: d.linkLabel,
  };
}

export function toCtaSection(entry: Entry<"ctaSections">): CtaSectionData {
  const d = entry.data;
  return {
    heading: d.heading,
    text: d.text,
    primaryButtonLabel: d.primaryButtonLabel,
    primaryButtonHref: d.primaryButtonHref,
    secondaryButtonLabel: d.secondaryButtonLabel ?? null,
    secondaryButtonHref: d.secondaryButtonHref ?? null,
    backgroundImage: localImage(d.backgroundImage, d.imageAlt),
    overlayStrength: d.overlayStrength ?? null,
  };
}

/** The blog CTA a page names, else the site default; null when neither. */
export function resolveBlogCta(content: Content, ref: Ref): BlogCtaData | null {
  const id = ref?.id ?? content.settings?.defaultBlogCta?.id;
  return id ? toBlogCta(need(content.blogCtas, "blogCtas", id)) : null;
}

/** The CTA section a page names, else the site default; null when neither. */
export function resolveCtaSection(
  content: Content,
  ref: Ref,
): CtaSectionData | null {
  const id = ref?.id ?? content.settings?.defaultCtaSection?.id;
  return id ? toCtaSection(need(content.ctaSections, "ctaSections", id)) : null;
}

export async function getCtaDefaults(): Promise<CtaDefaults> {
  const content = await loadContent();
  return {
    blogCta: resolveBlogCta(content, undefined),
    ctaSection: resolveCtaSection(content, undefined),
  };
}

/** One blog CTA by id — for `<BlogCta id>` in an MDX post body. */
export async function getBlogCtaById(id: string): Promise<BlogCtaData> {
  return toBlogCta(need((await loadContent()).blogCtas, "blogCtas", id));
}
