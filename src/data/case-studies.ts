/**
 * Case study data — shared between listing and detail pages.
 *
 * CMS-ready: Replace this file with a CMS query when connecting Sanity,
 * Contentful, or another headless CMS. The structure maps 1:1 to CMS fields.
 *
 * Rich text fields (html) contain serialized HTML that will come from
 * Sanity's portable text serializer in production. For now, placeholder
 * HTML strings demonstrate the rendering.
 */

import type { ImageMetadata } from "astro";
import type { ContentBlock } from "../components/case-study/types";

// Images — replace with CMS image fields when connecting a headless CMS
import projectImage1 from "../assets/placeholder-images/placeholder-1.webp";
import projectImage2 from "../assets/placeholder-images/placeholder-3.webp";
import projectImage3 from "../assets/placeholder-images/placeholder-4.webp";
import projectImage4 from "../assets/placeholder-images/placeholder-5.webp";
import projectImage5 from "../assets/placeholder-images/placeholder-2.webp";
import heroImage from "../assets/placeholder-images/placeholder-6.webp";

/* ── Data types ─────────────────────────────────────────────────────────── */

interface ImageEntry {
  src: ImageMetadata | string;
  alt: string;
}

export interface CaseStudy {
  title: string;
  slug: string;
  description: string;
  categories: string[];
  image: ImageMetadata;
  imageAlt: string;
  date: string;
  featured?: boolean;
}

export interface CaseStudyDetail extends CaseStudy {
  client: string;
  timeline?: string;
  liveUrl?: string;
  galleryImages: ImageEntry[];
  content: ContentBlock[];
}

/* ── Available categories ─────────────────────────────────────────────────
   Design | Development | Strategy | Branding | Marketing | Consulting
   ──────────────────────────────────────────────────────────────────────── */

/* ── Case study data ──────────────────────────────────────────────────────
   Each case study demonstrates a unique content block arrangement to
   prove the flexible ordering system works for CMS integration.
   ──────────────────────────────────────────────────────────────────────── */

export const caseStudies: CaseStudyDetail[] = [
  {
    title: "Revitalizing Acme Corp's Digital Presence",
    slug: "acme-corp-rebrand",
    description:
      "A complete brand refresh and website redesign that increased lead generation by 340% and established a cohesive visual identity across all digital touchpoints.",
    categories: ["Branding", "Design", "Development"],
    image: projectImage1,
    imageAlt: "Acme Corp website redesign showcase",
    date: "2026-02-28",
    featured: true,
    client: "Acme Corp",
    timeline: "8 weeks",
    liveUrl: "https://example.com",
    galleryImages: [
      { src: projectImage1, alt: "Acme Corp homepage design" },
      { src: projectImage2, alt: "Acme Corp interior pages" },
      { src: projectImage3, alt: "Acme Corp mobile experience" },
    ],
    content: [
      {
        type: "richText",
        html: "<h3>Introduction</h3><p>Acme Corp had outgrown their dated website. Their brand no longer reflected the premium services they offered, and new inquiries had stalled. They needed a complete digital refresh that would position them as an industry leader while driving measurable business results.</p>",
      },
      {
        type: "richTextWithImage",
        html: "<h3>The Challenge</h3><p>The existing website was dated, with inconsistent branding, slow load times, and a confusing user journey. Conversions had plateaued despite steady traffic, signaling that the problem was the destination — not the demand.</p><p>We needed to rebuild their entire site from the ground up while preserving the search visibility they had built over the years.</p>",
        image: projectImage2,
        imageAlt: "Acme Corp brand exploration",
      },
      {
        type: "fullWidthImage",
        image: projectImage3,
        imageAlt: "Acme Corp design system overview",
      },
      {
        type: "imageGrid",
        images: [
          { src: projectImage3, alt: "Brand color palette exploration" },
          { src: projectImage4, alt: "Typography system design" },
        ],
      },
      {
        type: "richTextColumns",
        html: "<h3>The Approach</h3><p>We started with an in-depth brand strategy workshop to uncover Acme Corp's core values and competitive differentiators. From there, we developed a visual identity system and translated it into a fast, high-converting website with custom animations and a robust CMS.</p><p>The design process involved three rounds of iteration, with stakeholder feedback incorporated at every stage. We prioritized mobile-first design, accessibility, and page speed throughout the build.</p><p>Content strategy was developed in parallel with the design work, ensuring that every page had clear messaging and a strong call to action aligned with the business goals.</p>",
      },
      {
        type: "stats",
        items: [
          { value: "340%", label: "Increase in leads" },
          { value: "60%", label: "Faster load times" },
          { value: "2.5x", label: "More page views" },
        ],
      },
      {
        type: "richText",
        html: "<h3>The Results</h3><p>The redesign delivered transformative results. Lead generation increased by 340%, page load times improved by 60%, and overall engagement metrics rose dramatically. Acme Corp now has a digital presence that matches the caliber of their work and positions them for continued growth.</p>",
      },
    ],
  },
  {
    title: "E-Commerce Migration for Summit Outdoor",
    slug: "summit-outdoor-migration",
    description:
      "Rebuilt a slow, legacy storefront on a modern platform with custom product filtering, resulting in a 60% improvement in page load speed.",
    categories: ["Development", "Strategy", "Marketing"],
    image: projectImage2,
    imageAlt: "Summit Outdoor e-commerce site",
    date: "2026-02-15",
    featured: true,
    client: "Summit Outdoor",
    timeline: "12 weeks",
    liveUrl: "https://example.com",
    galleryImages: [
      { src: projectImage2, alt: "Summit Outdoor storefront" },
      { src: projectImage5, alt: "Product filtering interface" },
      { src: projectImage1, alt: "Mobile shopping experience" },
    ],
    content: [
      {
        type: "richText",
        html: "<h3>Introduction</h3><p>Summit Outdoor's storefront was slow, difficult to maintain, and losing sales. We planned a phased replatform, ensuring zero downtime and preserving all search visibility through careful redirect mapping and content migration.</p>",
      },
      {
        type: "fullWidthImage",
        image: projectImage5,
        imageAlt: "Summit Outdoor legacy vs new site comparison",
      },
      {
        type: "richTextWithImage",
        html: "<h3>From Legacy to Modern</h3><p>The migration involved auditing over 500 product pages, mapping URL structures, and building a custom CMS architecture that would scale with their catalog growth.</p><p>We implemented custom product filtering, optimized all imagery, and built an intuitive checkout flow that reduced cart abandonment by 35%.</p>",
        image: projectImage4,
        imageAlt: "Migration mapping and redirect plan",
      },
      {
        type: "imageGrid",
        images: [
          { src: projectImage1, alt: "Product catalog redesign" },
          { src: projectImage3, alt: "Checkout flow optimization" },
        ],
      },
      {
        type: "richText",
        html: "<h3>The Outcome</h3><p>The migration was completed with zero downtime and no loss of search rankings. Page load speeds improved by 60%, and the new product filtering system made it easier for customers to find what they needed — leading to a significant increase in conversion rates.</p>",
      },
    ],
  },
  {
    title: "Brand Photography for Bloom Wellness",
    slug: "bloom-wellness-photography",
    description:
      "Planned and directed a lifestyle photography shoot that captured the essence of the brand, providing assets used across web, social, and print.",
    categories: ["Branding", "Strategy"],
    image: projectImage3,
    imageAlt: "Bloom Wellness brand photography",
    date: "2026-02-01",
    featured: true,
    client: "Bloom Wellness",
    timeline: "4 weeks",
    galleryImages: [
      { src: projectImage3, alt: "Bloom Wellness lifestyle shot" },
      { src: projectImage4, alt: "Product photography" },
      { src: heroImage, alt: "Team photography session" },
    ],
    content: [
      {
        type: "richText",
        html: "<h3>Introduction</h3><p>Bloom Wellness needed authentic visual content that resonated with their audience. We developed a creative direction that balanced professionalism with warmth, then executed a two-day shoot covering products, team portraits, and lifestyle scenes.</p>",
      },
      {
        type: "richTextWithImage",
        html: "<h3>Capturing the Brand Essence</h3><p>Every shot was carefully planned to reflect Bloom Wellness's core values: natural, inviting, and empowering. We created detailed mood boards and shot lists, coordinated with stylists, and scouted locations that embodied the brand's aesthetic.</p><p>The shoot produced over 200 deliverables across four content categories, giving the team a full year's worth of visual content.</p>",
        image: projectImage5,
        imageAlt: "Wellness product flat lay",
      },
      {
        type: "stats",
        items: [
          { value: "200+", label: "Deliverables" },
          { value: "4", label: "Content categories" },
          { value: "12mo", label: "Content calendar" },
        ],
      },
      {
        type: "imageGrid",
        images: [
          { src: projectImage5, alt: "Wellness product flat lay" },
          { src: projectImage1, alt: "Studio portrait session" },
        ],
      },
      {
        type: "fullWidthImage",
        image: heroImage,
        imageAlt: "Final brand photography collection",
      },
      {
        type: "richText",
        html: "<h3>The Results</h3><p>The photography assets gave Bloom Wellness a consistent visual language across their website, social media, email campaigns, and printed materials. The investment in professional photography elevated their brand perception and contributed to a significant increase in engagement.</p>",
      },
    ],
  },
  {
    title: "Organic Growth for GreenLeaf Organics",
    slug: "greenleaf-organics-seo",
    description:
      "Developed a comprehensive growth strategy spanning technical fixes, content, and outreach that grew organic traffic by 520% in six months.",
    categories: ["Marketing", "Design"],
    image: projectImage4,
    imageAlt: "GreenLeaf Organics analytics dashboard",
    date: "2026-01-20",
    client: "GreenLeaf Organics",
    timeline: "6 months",
    liveUrl: "https://example.com",
    galleryImages: [
      { src: projectImage4, alt: "Analytics dashboard overview" },
      { src: projectImage1, alt: "Keyword research process" },
      { src: heroImage, alt: "Content strategy planning" },
    ],
    content: [
      {
        type: "richText",
        html: "<h3>Introduction</h3><p>GreenLeaf Organics was hard to find online despite having quality products. Our comprehensive audit revealed critical technical issues, thin content, and missed opportunities across their entire site.</p>",
      },
      {
        type: "fullWidthImage",
        image: projectImage4,
        imageAlt: "Growth audit findings dashboard",
      },
      {
        type: "richTextColumns",
        html: "<h3>Strategy & Execution</h3><p>We implemented a three-phase approach: technical foundation fixes, content improvement and creation, and audience building through strategic outreach. Each phase built on the last, creating compounding growth in visibility.</p><p>Phase one addressed site speed and technical health. Phase two involved rewriting key pages and launching a content hub around the topics their audience cared about. Phase three focused on earning coverage from industry publications and building authority.</p><p>Throughout the engagement, we provided monthly reporting with clear KPIs and actionable recommendations, ensuring the team understood the strategy and could sustain the momentum independently.</p>",
      },
      {
        type: "stats",
        items: [
          { value: "520%", label: "Organic traffic growth" },
          { value: "#1", label: "Rankings for key terms" },
          { value: "45%", label: "Conversion rate increase" },
        ],
      },
    ],
  },
  {
    title: "Workflow Automation for Relay Logistics",
    slug: "relay-logistics-automation",
    description:
      "Built custom automation workflows connecting their CRM, invoicing, and project management tools — saving the team over 15 hours per week.",
    categories: ["Consulting", "Development"],
    image: projectImage5,
    imageAlt: "Relay Logistics automation dashboard",
    date: "2026-01-10",
    client: "Relay Logistics",
    timeline: "6 weeks",
    galleryImages: [
      { src: projectImage5, alt: "Automation workflow overview" },
      { src: projectImage2, alt: "Integration dashboard" },
      { src: projectImage3, alt: "Reporting interface" },
    ],
    content: [
      {
        type: "richText",
        html: "<h3>Introduction</h3><p>Relay Logistics was spending hours each week on repetitive tasks — manually entering data between their CRM, invoicing system, and project management tools. Errors were common and the team was frustrated with the inefficiency.</p>",
      },
      {
        type: "richTextWithImage",
        html: "<h3>Manual Processes, Major Bottleneck</h3><p>The core issue was data silos. Information had to be manually copied between three disconnected systems, introducing delays and errors at every handoff point.</p><p>We mapped every workflow, identified automation opportunities, and designed a connected system that would eliminate redundant data entry while maintaining data integrity across all platforms.</p>",
        image: projectImage5,
        imageAlt: "Before and after workflow comparison",
      },
      {
        type: "imageGrid",
        images: [
          { src: projectImage5, alt: "Before: manual workflow" },
          { src: projectImage2, alt: "After: automated workflow" },
        ],
      },
      {
        type: "stats",
        items: [
          { value: "15hrs", label: "Saved per week" },
          { value: "98%", label: "Error reduction" },
          { value: "3", label: "Systems connected" },
        ],
      },
      {
        type: "richText",
        html: "<p>The automation system paid for itself within the first month. The team now spends their time on high-value work instead of repetitive data entry, and the error rate dropped to nearly zero.</p>",
      },
    ],
  },
  {
    title: "Portfolio Website for Architect Studio",
    slug: "architect-studio-portfolio",
    description:
      "Designed and developed a minimal portfolio site showcasing architectural projects with full-bleed imagery and smooth scroll-driven animations.",
    categories: ["Design", "Development"],
    image: heroImage,
    imageAlt: "Architect Studio portfolio website",
    date: "2025-12-15",
    client: "Architect Studio",
    timeline: "5 weeks",
    liveUrl: "https://example.com",
    galleryImages: [
      { src: heroImage, alt: "Portfolio homepage" },
      { src: projectImage1, alt: "Project detail page" },
      { src: projectImage4, alt: "Gallery view" },
    ],
    content: [
      {
        type: "richText",
        html: "<h3>Introduction</h3><p>Architect Studio wanted their website to reflect the same precision and minimalism found in their built work. We developed a grid-based design language that echoed architectural drawing conventions while remaining warm and inviting to potential clients.</p>",
      },
      {
        type: "fullWidthImage",
        image: heroImage,
        imageAlt: "Architect Studio design concept",
      },
      {
        type: "richTextWithImage",
        html: "<h3>Designing for Architecture</h3><p>The design system drew direct inspiration from architectural drafting — clean lines, generous whitespace, and a restrained color palette that lets the project photography take center stage.</p><p>Every interaction was carefully considered. Page transitions mirror the experience of moving through a building, and project galleries use a cinematic scrolling effect that showcases each image at its full impact.</p>",
        image: projectImage1,
        imageAlt: "Grid system exploration",
      },
      {
        type: "richTextColumns",
        html: "<h3>Bringing It to Life</h3><p>Custom scroll-driven animations reveal content in a way that mirrors the experience of walking through a building — each section unfolds naturally as the visitor explores. Performance was a priority: despite rich imagery, the site achieves a perfect Lighthouse score.</p><p>The CMS was structured to make adding new projects effortless. Each project page is built from reusable blocks — full-bleed images, text sections, technical specifications, and image grids — that can be arranged in any order.</p><p>The result is a portfolio that feels as carefully crafted as the buildings it showcases, while being practical for the team to maintain and update with new work.</p>",
      },
      {
        type: "stats",
        items: [
          { value: "100", label: "Lighthouse score" },
          { value: "1.2s", label: "Load time" },
          { value: "40%", label: "More inquiries" },
        ],
      },
    ],
  },
];
