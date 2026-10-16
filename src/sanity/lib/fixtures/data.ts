/**
 * Parity fixture documents — small, hand-written, and shaped like the GROQ
 * PROJECTIONS in ../queries.ts (not like the schema). Every branch the
 * templates render appears at least once: each Portable Text node type,
 * each case-study block type (plus the empty ones the mapper drops),
 * overrides versus site defaults, missing optional fields, and images with
 * and without a hotspot. Keep keys and values deterministic — the parity
 * check compares two builds byte for byte.
 */

/** Fixtures mirror projections, so they are typed loosely on purpose. */
export type Doc = Record<string, any>;

let assetCount = 0;
/** A projected Sanity image. The asset ref encodes the intrinsic size, as real refs do. */
function img(
  width: number,
  height: number,
  hotspot?: { x: number; y: number },
): Doc {
  assetCount += 1;
  const id = `fixture${String(assetCount).padStart(2, "0")}`;
  return {
    _type: "image",
    asset: { _ref: `image-${id}-${width}x${height}-jpg`, _type: "reference" },
    ...(hotspot
      ? {
          hotspot: { x: hotspot.x, y: hotspot.y, width: 1, height: 1 },
          crop: { top: 0, bottom: 0, left: 0, right: 0 },
        }
      : {}),
  };
}

/** `asset->metadata{ dimensions, lqip }` for an image of this size. */
function meta(width: number, height: number): Doc {
  return { dimensions: { width, height }, lqip: null };
}

let keyCount = 0;
const key = () => `fx${++keyCount}`;
function span(text: string, marks: string[] = []): Doc {
  return { _type: "span", _key: key(), text, marks };
}
function block(children: Doc[], extra: Doc = {}): Doc {
  return {
    _type: "block",
    _key: key(),
    style: "normal",
    markDefs: [],
    children,
    ...extra,
  };
}
const para = (text: string) => block([span(text)]);

/* Explicit-key variants for fixtures added after the baseline was first
   captured: they leave the key() counter — and so every earlier fixture's
   keys — untouched. */
function kspan(k: string, text: string, marks: string[] = []): Doc {
  return { _type: "span", _key: k, text, marks };
}
function kblock(k: string, children: Doc[], extra: Doc = {}): Doc {
  return {
    _type: "block",
    _key: k,
    style: "normal",
    markDefs: [],
    children,
    ...extra,
  };
}
const kitem = (
  k: string,
  text: string,
  listItem: "bullet" | "number",
  level: number,
) => kblock(k, [kspan(`${k}s`, text)], { listItem, level });
const heading = (style: "h2" | "h3" | "h4", text: string) =>
  block([span(text)], { style });

/* ── Shared documents ──────────────────────────────────────────────────── */

const JANE = { name: "Jane Doe", avatar: img(200, 200) };
const JOHN = { name: "John Roe", avatar: null };

const POST_ONE_IMAGE = img(1600, 900);
const CS_ONE_IMAGE = img(1600, 1000, { x: 0.4, y: 0.5 });
const KITCHEN_HERO = img(1600, 1067, { x: 0.5, y: 0.4 });

const BLOG_CTA_PORTRAIT = {
  _id: "blogCta-portrait",
  heading: "Fixture blog CTA",
  body: "A short call to action.",
  image: img(800, 1067),
  imageAlt: "Blog CTA image",
  aspectRatio: "portrait",
  linkUrl: "/contact",
  linkLabel: "Talk to us",
};
const BLOG_CTA_LANDSCAPE = {
  _id: "blogCta-landscape",
  heading: "Landscape CTA",
  body: "An override with no link label.",
  image: img(800, 533, { x: 0.6, y: 0.5 }),
  imageAlt: "",
  aspectRatio: "landscape",
  linkUrl: "/services",
  linkLabel: null,
};
const CTA_SECTION_DEFAULT = {
  _id: "ctaSection-default",
  heading: "Default CTA heading",
  text: "Default CTA text.",
  primaryButtonLabel: "Get started",
  primaryButtonHref: "/contact",
  secondaryButtonLabel: "See services",
  secondaryButtonHref: "/services",
  backgroundImage: img(1920, 1080, { x: 0.3, y: 0.6 }),
  imageAlt: "CTA background",
  overlayStrength: 60,
};
const CTA_SECTION_OVERRIDE = {
  _id: "ctaSection-override",
  heading: "Override CTA heading",
  text: "Override CTA text.",
  primaryButtonLabel: "Book a call",
  primaryButtonHref: "/contact",
  secondaryButtonLabel: null,
  secondaryButtonHref: null,
  backgroundImage: img(1920, 1080),
  imageAlt: "",
  overlayStrength: null,
};

export const SETTINGS: Doc = {
  defaultBlogCta: BLOG_CTA_PORTRAIT,
  defaultCtaSection: CTA_SECTION_DEFAULT,
};

/* ── Blog posts (author is dereferenced: { name, avatar }) ─────────────── */

export const POSTS: Doc[] = [
  {
    title: "Fixture Post One",
    slug: "fixture-post-one",
    description: "The fixture post that exercises every body node.",
    categories: ["Guides", "News"],
    primaryCategory: "Guides",
    image: POST_ONE_IMAGE,
    imageAlt: "Fixture post one hero",
    author: JANE,
    video: null,
    date: "2026-03-01",
    _updatedAt: "2026-03-02T10:00:00Z",
    featured: true,
    body: [
      heading("h2", "Getting started"),
      block(
        [
          span("Plain, "),
          span("bold", ["strong"]),
          span(" and "),
          span("italic", ["em"]),
          span(" text with "),
          span("an external link", ["ext"]),
          span(" and "),
          span("an internal link", ["int"]),
          span("."),
        ],
        {
          markDefs: [
            {
              _type: "link",
              _key: "ext",
              href: "https://example.com",
              newTab: true,
            },
            {
              _type: "internalLink",
              _key: "int",
              target: {
                _type: "caseStudy",
                slug: "case-study-one",
                title: "Case Study One",
                description: "First fixture case study.",
                image: CS_ONE_IMAGE,
              },
            },
          ],
        },
      ),
      block([span("First bullet")], { listItem: "bullet", level: 1 }),
      block([span("Second bullet")], { listItem: "bullet", level: 1 }),
      block([span("Numbered item")], { listItem: "number", level: 1 }),
      block([span("A quoted line")], { style: "blockquote" }),
      heading("h3", "A smaller heading"),
      {
        _type: "code",
        _key: key(),
        code: "const answer = 42;",
        language: "javascript",
        filename: "answer.js",
      },
      {
        _type: "image",
        _key: key(),
        asset: { _ref: "image-fixtureinline-1200x800-jpg", _type: "reference" },
        alt: "Inline body image",
        caption: "An inline caption",
      },
      {
        _type: "videoEmbed",
        _key: key(),
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        caption: "Demo video",
      },
      {
        _type: "callout",
        _key: key(),
        type: "warning",
        body: [para("Mind the gap.")],
      },
      { _type: "blogCtaInline", _key: key(), cta: BLOG_CTA_LANDSCAPE },
      heading("h2", "Getting started"),
      para("A duplicate heading above, so the TOC falls back to section-key."),
    ],
    ctaOverride: null,
    ctaSectionOverride: null,
    faqs: [
      {
        question: "What is a parity fixture?",
        answer: [
          block(
            [
              span("Sample content for "),
              span("parity checks", ["faqlink"]),
              span("."),
            ],
            {
              markDefs: [
                {
                  _type: "link",
                  _key: "faqlink",
                  href: "https://example.com/parity",
                },
              ],
            },
          ),
        ],
      },
      {
        question: "Does an answer keep two paragraphs?",
        answer: [para("Yes, the first one."), para("And the second one.")],
      },
      {
        question: "Do nested lists and bold links survive?",
        answer: [
          kitem("fxq1", "Top item one", "bullet", 1),
          kitem("fxq2", "Nested item one", "bullet", 2),
          kitem("fxq3", "Nested item two", "bullet", 2),
          kitem("fxq4", "Top item two", "bullet", 1),
          kitem("fxq5", "First step", "number", 1),
          kitem("fxq6", "A bullet under the step", "bullet", 2),
          kitem("fxq7", "Second step", "number", 1),
          kblock(
            "fxq8",
            [
              kspan("fxq8a", "Read "),
              kspan("fxq8b", "the ", ["fxqlink"]),
              kspan("fxq8c", "bold", ["fxqlink", "strong"]),
              kspan("fxq8d", " guide", ["fxqlink"]),
              kspan("fxq8e", "."),
            ],
            {
              markDefs: [
                {
                  _type: "link",
                  _key: "fxqlink",
                  href: "https://example.com/guide",
                },
              ],
            },
          ),
        ],
      },
    ],
    relatedSlugs: ["fixture-post-three"],
    seo: {
      metaTitle: "Fixture One SEO title",
      metaDescription: "SEO description for post one.",
      ogTitle: null,
      ogDescription: null,
      ogImage: img(1200, 630),
    },
  },
  {
    title: "Fixture Post Two",
    slug: "fixture-post-two",
    description: "A video post with CTA overrides.",
    categories: ["Guides"],
    primaryCategory: null,
    image: img(1600, 900, { x: 0.2, y: 0.3 }),
    imageAlt: "",
    author: JOHN,
    video: "https://youtu.be/xyz789AbCd",
    date: "2026-02-01",
    _updatedAt: "2026-02-01T09:00:00Z",
    featured: false,
    body: [
      block(
        [span("Read about the "), span("kitchen project", ["proj"]), span(".")],
        {
          markDefs: [
            {
              _type: "internalLink",
              _key: "proj",
              newTab: true,
              target: {
                _type: "project",
                slug: "fixture-kitchen",
                title: "Fixture kitchen remodel",
                description: null,
                image: KITCHEN_HERO,
              },
            },
          ],
        },
      ),
    ],
    ctaOverride: BLOG_CTA_LANDSCAPE,
    ctaSectionOverride: CTA_SECTION_OVERRIDE,
    faqs: null,
    relatedSlugs: [],
    seo: null,
  },
  {
    title: "Fixture Post Three",
    slug: "fixture-post-three",
    description: null,
    categories: ["Insights", "News"],
    primaryCategory: "Insights",
    image: img(1600, 900),
    imageAlt: "Fixture post three hero",
    author: JANE,
    video: null,
    date: "2026-01-15",
    _updatedAt: "2026-01-20T08:30:00Z",
    featured: true,
    body: [
      para("A short post."),
      block([span("Back to "), span("post one", ["back"])], {
        markDefs: [
          {
            _type: "internalLink",
            _key: "back",
            target: {
              _type: "blogPost",
              slug: "fixture-post-one",
              title: "Fixture Post One",
              description: "The fixture post that exercises every body node.",
              image: POST_ONE_IMAGE,
            },
          },
        ],
      }),
      block([span("A dangling link", ["gone"])], {
        markDefs: [{ _type: "internalLink", _key: "gone", target: null }],
      }),
    ],
    ctaOverride: null,
    ctaSectionOverride: null,
    faqs: [],
    relatedSlugs: ["fixture-post-one"],
    seo: {
      metaTitle: null,
      metaDescription: null,
      ogTitle: "OG title three",
      ogDescription: "OG description three",
      ogImage: null,
    },
  },
];

/* ── Case studies ──────────────────────────────────────────────────────── */

const CASE_STUDY_ONE_BLOCKS: Doc[] = [
  {
    _type: "richText",
    _key: key(),
    sectionSpacing: "small",
    maxWidth: "60ch",
    body: [
      heading("h2", "The challenge"),
      para("Rich text body."),
      block([span("See the "), span("first post", ["cslink"])], {
        markDefs: [
          {
            _type: "internalLink",
            _key: "cslink",
            target: { _type: "blogPost", slug: "fixture-post-one" },
          },
        ],
      }),
      kblock(
        "fxcs1",
        [
          kspan("fxcs1a", "Read the "),
          kspan("fxcs1b", "very ", ["fxcslink"]),
          kspan("fxcs1c", "bold", ["fxcslink", "strong"]),
          kspan("fxcs1d", " write-up", ["fxcslink"]),
          kspan("fxcs1e", "."),
        ],
        {
          markDefs: [
            {
              _type: "link",
              _key: "fxcslink",
              href: "https://example.com/write-up",
            },
          ],
        },
      ),
      kitem("fxcs2", "Case list top", "bullet", 1),
      kitem("fxcs3", "Case list nested", "bullet", 2),
    ],
  },
  {
    _type: "richTextLeft",
    _key: key(),
    sectionSpacingTop: "none",
    sectionSpacingBottom: "large",
    body: [para("Left-aligned text.")],
  },
  {
    _type: "richTextColumns",
    _key: key(),
    body: [para("Column one."), para("Column two.")],
  },
  {
    _type: "richTextWithImage",
    _key: key(),
    body: [para("Text beside an image.")],
    image: img(1200, 900, { x: 0.5, y: 0.2 }),
    imageAlt: "Beside the text",
    aspectRatio: "square",
    transparent: true,
    objectFit: "contain",
  },
  {
    _type: "fullWidthImage",
    _key: key(),
    image: img(2400, 1000),
    imageAlt: "Full-width image",
    customAspectRatio: "21 / 9",
  },
  { _type: "fullWidthImage", _key: key(), image: null, imageAlt: "" },
  {
    _type: "imageGrid",
    _key: key(),
    aspectRatio: "auto",
    defaultAlt: "Grid default alt",
    images: [
      { ...img(800, 600), alt: "Grid one", transparent: false },
      {
        ...img(800, 600, { x: 0.1, y: 0.9 }),
        alt: "Grid default alt",
        transparent: true,
      },
    ],
  },
  { _type: "imageGrid", _key: key(), images: [] },
  {
    _type: "stats",
    _key: key(),
    items: [
      { value: "40%", label: "Faster launches" },
      { value: null, label: "Pending stat" },
    ],
  },
];

export const CASE_STUDIES: Doc[] = [
  {
    title: "Case Study One",
    slug: "case-study-one",
    description: "First fixture case study.",
    client: "Northwind",
    categories: ["Branding", "Web"],
    industries: ["Logistics"],
    image: CS_ONE_IMAGE,
    imageAlt: "Case study one hero",
    date: "2026-04-01",
    _updatedAt: "2026-04-03T12:00:00Z",
    featured: true,
    comingSoon: false,
    timeline: "6 weeks",
    liveUrl: "https://northwind.example.com",
    galleryImagesAlt: "Gallery fallback alt",
    galleryImages: [
      { ...img(1400, 900), alt: "Gallery one" },
      { ...img(1400, 900, { x: 0.2, y: 0.8 }), alt: "" },
    ],
    content: CASE_STUDY_ONE_BLOCKS,
    ctaSectionOverride: CTA_SECTION_OVERRIDE,
    seo: {
      metaTitle: "Case One SEO",
      metaDescription: null,
      ogTitle: null,
      ogDescription: null,
      ogImage: null,
    },
  },
  {
    title: "Case Study Two",
    slug: "case-study-two",
    description: "Second fixture case study.",
    client: "Harbor Health",
    categories: ["Web"],
    industries: ["Healthcare"],
    image: img(1600, 1000),
    imageAlt: "",
    date: "2026-03-01",
    _updatedAt: "2026-03-01T12:00:00Z",
    featured: false,
    comingSoon: false,
    timeline: null,
    liveUrl: null,
    galleryImagesAlt: null,
    galleryImages: null,
    content: null,
    ctaSectionOverride: null,
    seo: null,
  },
  {
    title: "Case Study Three",
    slug: "case-study-three",
    description: null,
    client: "Initech",
    categories: ["Branding"],
    industries: ["Finance", "Logistics"],
    image: img(1600, 1000),
    imageAlt: "Case study three hero",
    date: "2026-02-01",
    _updatedAt: "2026-02-02T12:00:00Z",
    featured: true,
    comingSoon: false,
    timeline: "3 months",
    liveUrl: null,
    galleryImagesAlt: null,
    galleryImages: [],
    content: [{ _type: "richText", _key: key(), body: [para("One block.")] }],
    ctaSectionOverride: null,
    seo: null,
  },
  {
    title: "Case Study Coming",
    slug: "case-study-coming",
    description: "Not published yet.",
    client: "Globex",
    categories: ["Web"],
    industries: ["Retail"],
    image: img(1600, 1000),
    imageAlt: "Coming soon",
    date: "2026-05-01",
    _updatedAt: "2026-05-01T12:00:00Z",
    featured: false,
    comingSoon: true,
    timeline: null,
    liveUrl: "https://globex.example.com",
    galleryImagesAlt: null,
    galleryImages: null,
    content: null,
    ctaSectionOverride: null,
    seo: null,
  },
];

/* ── Projects (stored in PROJECTS_QUERY order: completed, newest first) ── */

export const PROJECTS: Doc[] = [
  {
    _id: "project-kitchen",
    _updatedAt: "2026-05-02T12:00:00Z",
    title: "Fixture kitchen remodel",
    slug: "fixture-kitchen",
    category: "remodel",
    location: "Springfield, IL",
    service: "Kitchen remodeling",
    completed: "2026-05-01",
    featured: true,
    heroImage: KITCHEN_HERO,
    imageAlt: "The finished kitchen",
    heroImageMeta: meta(1600, 1067),
    photos: [
      {
        _key: key(),
        ...img(1200, 800),
        label: "Before",
        alt: "Kitchen before",
        meta: meta(1200, 800),
      },
      {
        _key: key(),
        ...img(1200, 900, { x: 0.3, y: 0.7 }),
        label: "After",
        alt: "",
        meta: meta(1200, 900),
      },
      {
        _key: key(),
        ...img(1000, 1000),
        label: null,
        alt: "Cabinet detail",
        meta: null,
      },
    ],
    description: [
      para("We rebuilt the kitchen around the island."),
      block([span("A second paragraph with "), span("emphasis", ["em"])]),
    ],
    quote: { text: "Love the new kitchen.", name: "Pat Client" },
    seoDescription: null,
  },
  {
    _id: "project-office",
    _updatedAt: "2026-03-11T12:00:00Z",
    title: "Fixture office refresh",
    slug: "fixture-office",
    category: "commercial",
    location: null,
    service: null,
    completed: "2026-03-10",
    featured: true,
    heroImage: img(1600, 900),
    imageAlt: "",
    heroImageMeta: meta(1600, 900),
    photos: null,
    description: null,
    quote: null,
    seoDescription: "A quick office refresh.",
  },
  {
    _id: "project-porch",
    _updatedAt: "2025-11-21T12:00:00Z",
    title: "Fixture porch repair",
    slug: "fixture-porch",
    category: "repair",
    location: "Decatur, IL",
    service: "Carpentry",
    completed: "2025-11-20",
    featured: false,
    heroImage: img(1600, 1200),
    imageAlt: "Repaired porch",
    heroImageMeta: null,
    photos: [
      {
        _key: key(),
        ...img(1200, 800),
        label: "During",
        alt: "Porch during repair",
        meta: meta(1200, 800),
      },
    ],
    description: [para("New railings and steps.")],
    quote: { text: "Solid work.", name: null },
    seoDescription: null,
  },
];

/* ── Gallery (stored in GALLERY_QUERY order: added, newest first) ────── */

export const GALLERY: Doc[] = [
  {
    _id: "gallery-1",
    image: img(1800, 1200, { x: 0.5, y: 0.5 }),
    imageAlt: "Island under pendant lights",
    imageMeta: meta(1800, 1200),
    caption: "New island lighting",
    category: "remodel",
    location: "Springfield, IL",
    added: "2026-05-02",
    project: { title: "Fixture kitchen remodel", slug: "fixture-kitchen" },
  },
  {
    _id: "gallery-2",
    image: img(1200, 1200),
    imageAlt: "",
    imageMeta: meta(1200, 1200),
    caption: "Storefront signage",
    category: "commercial",
    location: null,
    added: "2026-03-11",
    project: null,
  },
  {
    _id: "gallery-3",
    image: img(1600, 1000),
    imageAlt: "",
    imageMeta: null,
    caption: null,
    category: "repair",
    location: "Decatur, IL",
    added: "2025-11-21",
    project: { title: null, slug: null },
  },
  {
    _id: "gallery-4",
    image: null,
    imageAlt: "",
    imageMeta: null,
    caption: "No image yet",
    category: "repair",
    location: null,
    added: "2025-10-01",
    project: null,
  },
];

/* ── Testimonials (stored in sortOrder) ────────────────────────────────── */

export const TESTIMONIALS: Doc[] = [
  {
    _id: "testimonial-jane",
    name: "Jane Doe",
    role: "CEO",
    company: "Acme",
    quote: "They shipped in half the time we budgeted.",
    avatar: img(256, 256, { x: 0.5, y: 0.3 }),
    website: "https://acme.example.com",
    stars: 5,
    featured: true,
    sortOrder: 1,
  },
  {
    _id: "testimonial-john",
    name: "John Roe",
    role: "CTO",
    company: null,
    quote: "The design system paid for itself.",
    avatar: null,
    website: null,
    stars: 4,
    featured: true,
    sortOrder: 2,
  },
  {
    _id: "testimonial-ada",
    name: "Ada Chen",
    role: null,
    company: "Initech",
    quote: "Clear communication the whole way through.",
    avatar: img(256, 256),
    website: null,
    stars: null,
    featured: false,
    sortOrder: 3,
  },
];

/* ── Incomplete documents (PARITY_FIXTURES=preview only) ───────────────── */

export const INCOMPLETE_POST: Doc = {
  title: null,
  slug: "fixture-post-incomplete",
  description: null,
  categories: null,
  primaryCategory: null,
  image: null,
  imageAlt: "",
  author: { name: null, avatar: null },
  video: null,
  date: "2026-06-01",
  _updatedAt: "2026-06-01T00:00:00Z",
  featured: null,
  body: null,
  ctaOverride: { ...BLOG_CTA_PORTRAIT, image: null },
  ctaSectionOverride: { ...CTA_SECTION_DEFAULT, backgroundImage: null },
  faqs: null,
  relatedSlugs: [],
  seo: null,
};

export const INCOMPLETE_CASE_STUDY: Doc = {
  title: null,
  slug: "case-study-incomplete",
  description: null,
  client: null,
  categories: null,
  industries: null,
  image: null,
  imageAlt: "",
  date: "2026-06-01",
  _updatedAt: "2026-06-01T00:00:00Z",
  featured: null,
  comingSoon: null,
  timeline: null,
  liveUrl: null,
  galleryImagesAlt: null,
  galleryImages: [{ alt: "No asset yet" }],
  content: [
    {
      _type: "richTextWithImage",
      _key: "incomplete-1",
      body: [para("Body without its image.")],
      image: null,
      imageAlt: "",
    },
    { _type: "stats", _key: "incomplete-2", items: null },
  ],
  ctaSectionOverride: null,
  seo: null,
};

export const INCOMPLETE_PROJECT: Doc = {
  _id: "project-incomplete",
  _updatedAt: "2026-06-01T00:00:00Z",
  title: null,
  slug: "fixture-incomplete",
  category: null,
  location: null,
  service: null,
  completed: null,
  featured: null,
  heroImage: null,
  imageAlt: "",
  heroImageMeta: null,
  photos: [
    { _key: "incomplete-photo", label: "Before", alt: null, meta: null },
  ],
  description: null,
  quote: { text: null, name: null },
  seoDescription: null,
};
