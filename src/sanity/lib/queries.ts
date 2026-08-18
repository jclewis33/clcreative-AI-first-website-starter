import { defineQuery } from "groq";

/**
 * GROQ queries for fetching content from Sanity.
 *
 * Each query returns data shaped to match the existing component interfaces,
 * so pages can swap from static data to Sanity with minimal template changes.
 *
 * Alt text: every image alt is projected as
 *   coalesce(<field alt>, <image>.asset->altText, "")
 * so a per-placement alt wins, then the Alt text set on the asset in the Media
 * library, then an empty string (decorative) as a guaranteed-string fallback.
 * The per-field alt inputs are optional — set alt once on the asset and it
 * flows through everywhere the image is used.
 */

/* ── Shared projections ────────────────────────────────────────────────────── */

/** Projection for a Blog CTA document (used after deref). */
const BLOG_CTA_PROJECTION = `{
  _id,
  heading,
  body,
  image,
  "imageAlt": coalesce(imageAlt, image.asset->altText, ""),
  aspectRatio,
  linkUrl,
  linkLabel
}`;

/** Projection for a CTA Section document (used after deref). Image left as a
 *  raw object so hotspot/crop survive for the URL builder + focal point. */
const CTA_SECTION_PROJECTION = `{
  _id,
  heading,
  text,
  primaryButtonLabel,
  primaryButtonHref,
  secondaryButtonLabel,
  secondaryButtonHref,
  backgroundImage,
  "imageAlt": coalesce(imageAlt, backgroundImage.asset->altText, ""),
  overlayStrength
}`;

/* ── Blog Posts ────────────────────────────────────────────────────────────── */

/** All blog posts for listing page (no body content needed) */
export const BLOG_POSTS_QUERY =
  defineQuery(`*[_type == "blogPost"] | order(date desc) {
  title,
  "slug": slug.current,
  description,
  categories,
  primaryCategory,
  image,
  "imageAlt": coalesce(imageAlt, image.asset->altText, ""),
  "author": author->name,
  "authorAvatar": author->avatar,
  date,
  featured
}`);

/** Single blog post by slug (includes body for detail page) */
export const BLOG_POST_QUERY =
  defineQuery(`*[_type == "blogPost" && slug.current == $slug][0] {
  title,
  "slug": slug.current,
  description,
  categories,
  image,
  "imageAlt": coalesce(imageAlt, image.asset->altText, ""),
  "author": author->name,
  "authorAvatar": author->avatar,
  video,
  date,
  _updatedAt,
  featured,
  body[] {
    ...,
    _type == "blogCtaInline" => {
      ...,
      "cta": cta->${BLOG_CTA_PROJECTION}
    },
    markDefs[] {
      ...,
      _type == "internalLink" => {
        ...,
        "target": reference->{
          _type,
          "slug": slug.current,
          "title": coalesce(title, term),
          "description": coalesce(description, shortDefinition),
          image
        }
      }
    }
  },
  "ctaOverride": ctaOverride->${BLOG_CTA_PROJECTION},
  "ctaSectionOverride": ctaSectionOverride->${CTA_SECTION_PROJECTION},
  faqs[] {
    question,
    answer
  },
  "relatedPosts": relatedPosts[]->{
    title,
    "slug": slug.current,
    description,
    categories,
    image,
    "imageAlt": coalesce(imageAlt, image.asset->altText, ""),
    "author": author->name,
    "authorAvatar": author->avatar,
    date,
    featured
  },
  seo {
    metaTitle,
    metaDescription,
    ogTitle,
    ogDescription,
    ogImage
  }
}`);

/** All blog post slugs for getStaticPaths */
export const BLOG_SLUGS_QUERY = defineQuery(
  `*[_type == "blogPost" && defined(slug.current)].slug.current`,
);

/**
 * Related posts for a blog post detail page — filtered in GROQ, never by
 * fetching the whole collection and filtering in JS. Matches BlogPostGrid's
 * `related` variant: shares at least one category (case-insensitive — pass
 * `$categories` pre-lowercased), excludes the current post and the manually
 * curated related slugs. `[0...6]` is a small buffer over the 3-card slot so
 * the template's own filtering still has room to make the final call.
 */
export const RELATED_BLOG_POSTS_QUERY = defineQuery(`*[
  _type == "blogPost"
  && slug.current != $slug
  && !(slug.current in $excludeSlugs)
  && count(categories[string::lower(@) in $categories]) > 0
] | order(date desc) [0...6] {
  title,
  "slug": slug.current,
  description,
  categories,
  image,
  "imageAlt": coalesce(imageAlt, image.asset->altText, ""),
  "author": author->name,
  "authorAvatar": author->avatar,
  date,
  featured
}`);

/** Blog posts filtered by category (category appears in categories array) */
export const BLOG_POSTS_BY_CATEGORY_QUERY =
  defineQuery(`*[_type == "blogPost" && $category in categories] | order(date desc) {
  title,
  "slug": slug.current,
  description,
  categories,
  image,
  "imageAlt": coalesce(imageAlt, image.asset->altText, ""),
  "author": author->name,
  "authorAvatar": author->avatar,
  date,
  featured
}`);

/** All unique categories across blog posts */
export const BLOG_CATEGORIES_QUERY = defineQuery(
  `array::unique(*[_type == "blogPost"].categories[])`,
);

/* ── Site Settings ─────────────────────────────────────────────────────────── */

/** Site Settings singleton — default Blog CTA + default CTA Section dereferenced. */
export const SITE_SETTINGS_QUERY = defineQuery(`*[_type == "siteSettings"][0]{
  "defaultBlogCta": defaultBlogCta->${BLOG_CTA_PROJECTION},
  "defaultCtaSection": defaultCtaSection->${CTA_SECTION_PROJECTION}
}`);

/* ── Case Studies ──────────────────────────────────────────────────────────── */

/** All case studies for listing page */
export const CASE_STUDIES_QUERY =
  defineQuery(`*[_type == "caseStudy"] | order(date desc) {
  title,
  "slug": slug.current,
  description,
  client,
  categories,
  industries,
  image,
  "imageAlt": coalesce(imageAlt, image.asset->altText, ""),
  date,
  featured,
  comingSoon,
  liveUrl
}`);

/** Single case study by slug (includes all detail fields) */
export const CASE_STUDY_QUERY =
  defineQuery(`*[_type == "caseStudy" && slug.current == $slug][0] {
  title,
  "slug": slug.current,
  description,
  client,
  categories,
  industries,
  image,
  "imageAlt": coalesce(imageAlt, image.asset->altText, ""),
  date,
  _updatedAt,
  featured,
  comingSoon,
  timeline,
  liveUrl,
  galleryImagesAlt,
  galleryImages[] {
    asset,
    hotspot,
    crop,
    "alt": coalesce(alt, ^.galleryImagesAlt, asset->altText, "")
  },
  content[] {
    _type,
    _key,
    // per-block vertical spacing (drives Section paddingTop/paddingBottom)
    sectionSpacing,
    sectionSpacingTop,
    sectionSpacingBottom,
    // richText, richTextLeft — editor-set content width
    maxWidth,
    // richText, richTextColumns
    body[] {
      ...,
      markDefs[] {
        ...,
        _type == "internalLink" => {
          ...,
          "target": reference->{ _type, "slug": slug.current }
        }
      }
    },
    // fullWidthImage, richTextWithImage
    image,
    "imageAlt": coalesce(imageAlt, image.asset->altText, ""),
    // image display options (fullWidthImage, richTextWithImage, imageGrid)
    aspectRatio,
    customAspectRatio,
    transparent,
    objectFit,
    // imageGrid
    defaultAlt,
    images[] {
      asset,
      hotspot,
      crop,
      "alt": coalesce(alt, ^.defaultAlt, asset->altText, ""),
      transparent
    },
    // stats
    items[] {
      value,
      label
    }
  },
  "ctaSectionOverride": ctaSectionOverride->${CTA_SECTION_PROJECTION},
  seo {
    metaTitle,
    metaDescription,
    ogTitle,
    ogDescription,
    ogImage
  }
}`);

/**
 * Publicly visible case study slugs for getStaticPaths. Coming-soon studies
 * are EXCLUDED here on purpose — with prerendered routes, enumerating them
 * would build pages that immediately redirect to /404. They remain editable
 * and viewable under /preview (which doesn't use this query).
 */
export const CASE_STUDY_SLUGS_QUERY = defineQuery(
  `*[_type == "caseStudy" && defined(slug.current) && comingSoon != true].slug.current`,
);

/**
 * Sibling case studies for the "Up next" cards — filtered in GROQ instead of
 * fetching the whole collection. `[0...4]` is a buffer over the 2-card slot:
 * the template still applies its own has-image/title check, so we fetch a
 * couple extra and let it make the final call. Same projection as
 * CASE_STUDIES_QUERY so CaseStudyCard behavior (incl. comingSoon → liveUrl
 * links) is unchanged.
 */
export const RELATED_CASE_STUDIES_QUERY = defineQuery(`*[
  _type == "caseStudy"
  && slug.current != $slug
  && defined(image.asset)
] | order(date desc) [0...4] {
  title,
  "slug": slug.current,
  description,
  client,
  categories,
  industries,
  image,
  "imageAlt": coalesce(imageAlt, image.asset->altText, ""),
  date,
  featured,
  comingSoon,
  liveUrl
}`);

/* ── Glossary Terms ────────────────────────────────────────────────────────── */

/** All glossary terms for listing page (no body content needed) */
export const GLOSSARY_TERMS_QUERY =
  defineQuery(`*[_type == "glossaryTerm"] | order(term asc) {
  term,
  "slug": slug.current,
  shortDefinition,
  category,
  "relatedTerms": relatedTerms[]->slug.current
}`);

/** Single glossary term by slug (includes body for detail page) */
export const GLOSSARY_TERM_QUERY =
  defineQuery(`*[_type == "glossaryTerm" && slug.current == $slug][0] {
  term,
  "slug": slug.current,
  shortDefinition,
  category,
  _createdAt,
  _updatedAt,
  "relatedTerms": relatedTerms[]->{
    term,
    "slug": slug.current,
    shortDefinition,
    category
  },
  body[] {
    ...,
    markDefs[] {
      ...,
      _type == "internalLink" => {
        ...,
        "target": reference->{
          _type,
          "slug": slug.current,
          "title": coalesce(title, term),
          "description": coalesce(description, shortDefinition),
          image
        }
      }
    }
  },
  "ctaSectionOverride": ctaSectionOverride->${CTA_SECTION_PROJECTION}
}`);

/** All glossary term slugs for getStaticPaths */
export const GLOSSARY_SLUGS_QUERY = defineQuery(
  `*[_type == "glossaryTerm" && defined(slug.current)].slug.current`,
);

/* ── Testimonials ─────────────────────────────────────────────────────────── */

/**
 * All testimonials ordered by sortOrder.
 * Prefer using `getTestimonials()` from `src/sanity/lib/testimonials.ts`
 * instead of this query directly — it handles featured filtering and limiting.
 */
export const TESTIMONIALS_QUERY =
  defineQuery(`*[_type == "testimonial"] | order(sortOrder asc) {
  _id,
  name,
  role,
  company,
  quote,
  avatar,
  website,
  stars,
  featured,
  sortOrder
}`);

/**
 * Featured testimonials only, ordered by sortOrder.
 */
export const FEATURED_TESTIMONIALS_QUERY =
  defineQuery(`*[_type == "testimonial" && featured == true] | order(sortOrder asc) {
  _id,
  name,
  role,
  company,
  quote,
  avatar,
  website,
  stars,
  featured,
  sortOrder
}`);

/* ── Case Studies (featured) ──────────────────────────────────────────────── */

/**
 * The three case studies shown by `<CaseStudyFeatured>`, looked up by slug.
 * Pass the slugs as `$slugs`; ordering is applied by the caller, since GROQ
 * returns them in document order rather than the order asked for.
 */
export const FEATURED_CASE_STUDIES_QUERY =
  defineQuery(`*[_type == "caseStudy" && slug.current in $slugs] {
  "slug": slug.current,
  client,
  description,
  image,
  "imageAlt": coalesce(imageAlt, image.asset->altText, "")
}`);
