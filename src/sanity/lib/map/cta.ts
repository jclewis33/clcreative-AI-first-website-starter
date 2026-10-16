/**
 * Sanity `blogCta` / `ctaSection` documents → BlogCtaData / CtaSectionData.
 */
import { stegaClean } from "@sanity/client/stega";
import type { SITE_SETTINGS_QUERY_RESULT } from "@/sanity/sanity.types";
import type { BlogCtaData, CtaSectionData } from "@/lib/content/types";
import { sanityImage } from "./image";

type Settings = NonNullable<SITE_SETTINGS_QUERY_RESULT>;
/** A dereferenced blogCta (BLOG_CTA_PROJECTION in ../queries.ts). */
export type RawBlogCta = NonNullable<Settings["defaultBlogCta"]>;
/** A dereferenced ctaSection (CTA_SECTION_PROJECTION in ../queries.ts). */
export type RawCtaSection = NonNullable<Settings["defaultCtaSection"]>;

export function toBlogCta(
  cta: RawBlogCta | null | undefined,
): BlogCtaData | null {
  if (!cta) return null;
  return {
    heading: cta.heading,
    body: cta.body,
    image: sanityImage(cta.image, cta.imageAlt),
    aspectRatio: stegaClean(cta.aspectRatio),
    linkUrl: stegaClean(cta.linkUrl),
    linkLabel: cta.linkLabel,
  };
}

/**
 * Every CTA-section field is cleaned, display text included — on purpose:
 * ContentCtaSection must render identically to CTASection in draft mode
 * (stega characters change text measurement and wrapping). The cost is no
 * click-to-edit overlays on this section; it stays editable from the
 * Studio form. Carried over from the section component it replaced.
 */
export function toCtaSection(
  cta: RawCtaSection | null | undefined,
): CtaSectionData | null {
  if (!cta) return null;
  return {
    heading: stegaClean(cta.heading),
    text: stegaClean(cta.text),
    primaryButtonLabel: stegaClean(cta.primaryButtonLabel),
    primaryButtonHref: stegaClean(cta.primaryButtonHref),
    secondaryButtonLabel: stegaClean(cta.secondaryButtonLabel),
    secondaryButtonHref: stegaClean(cta.secondaryButtonHref),
    backgroundImage: sanityImage(cta.backgroundImage, cta.imageAlt),
    overlayStrength: stegaClean(cta.overlayStrength),
  };
}
