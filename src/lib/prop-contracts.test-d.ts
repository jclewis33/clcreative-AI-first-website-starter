/**
 * Type-level contract tests for the component prop unions.
 *
 * Each `@ts-expect-error` line asserts that a DESIGN RULE is enforced by the
 * types: if a Props union ever regresses to something permissive, the bad
 * assignment stops erroring, the directive becomes "unused", and `astro check`
 * fails — deterministically, through plain TypeScript.
 *
 * Why this file exists: astro-language-tools' JSX call-site checking proved
 * unreliable for these unions (an innocuous frontmatter JSDoc comment silently
 * disabled it, order-dependently). The contracts therefore live in .props.ts
 * modules and are pinned here, where nothing but `tsc` semantics applies.
 *
 * This file is types-only: everything is erased at build time and nothing is
 * imported at runtime.
 */
import type { Props as ButtonProps } from "@/components/ui/Button.props";
import type { Props as CardProps } from "@/components/ui/Card.props";
import type { Props as LayoutProps } from "@/components/ui/Layout.props";
import type { Props as SectionProps } from "@/components/ui/Section.props";
import type { Props as VisualProps } from "@/components/ui/Visual.props";

type ImageMetadata = import("astro").ImageMetadata;
declare const img: ImageMetadata;

/* ── Button: href picks the <a> branch; its absence picks <button> ────────── */

// @ts-expect-error type is a button-only prop — a link has no form type
export const buttonBad1: ButtonProps = { type: "submit", href: "/x" };
// @ts-expect-error newTab needs an href
export const buttonBad2: ButtonProps = { newTab: true };
// @ts-expect-error a link cannot be disabled — omit the href instead
export const buttonBad3: ButtonProps = { disabled: true, href: "/x" };

export const buttonGood1: ButtonProps = { href: "/x", newTab: true };
export const buttonGood2: ButtonProps = { type: "submit", disabled: true };

/* ── Card: link-only props require href ───────────────────────────────────── */

// @ts-expect-error newTab without href
export const cardBad1: CardProps = { title: "x", newTab: true };
// @ts-expect-error actions decides how the card LINK shares the surface — meaningless without href
export const cardBad2: CardProps = { title: "x", actions: "multiple" };
// @ts-expect-error ariaLabel names the card link, which this card doesn't have
export const cardBad3: CardProps = { title: "x", ariaLabel: "y" };

export const cardGood1: CardProps = {
  title: "x",
  href: "/x",
  newTab: true,
  actions: "multiple",
};
export const cardGood2: CardProps = { title: "x", theme: "dark" };

/* ── Layout: variant-specific props stay on their variants ────────────────── */

// @ts-expect-error stickyOffset only applies to sticky-left
export const layoutBad1: LayoutProps = {
  variant: "columns",
  stickyOffset: "2rem",
};
// @ts-expect-error cardPadding only applies to card (default variant is columns)
export const layoutBad2: LayoutProps = { cardPadding: "4rem" };
// @ts-expect-error contentSpan only applies to breakout/full
export const layoutBad3: LayoutProps = { variant: "stack", contentSpan: 7 };

export const layoutGood1: LayoutProps = {
  variant: "breakout",
  contentSpan: 7,
  bleedSpan: 6,
};
export const layoutGood2: LayoutProps = {
  variant: "sticky-left",
  stickyOffset: "2rem",
};
export const layoutGood3: LayoutProps = {
  variant: "card",
  cardPadding: "4rem",
};

/* ── Section: padding values are closed; 'main' stays legal on purpose ────── */

// @ts-expect-error invented value — the union catches typos ("deep", "big", …)
export const sectionBad1: SectionProps = { padding: "deep" };
// @ts-expect-error 'medium' is not a size in this system
export const sectionBad2: SectionProps = { paddingTop: "medium" };

export const sectionGood1: SectionProps = { padding: "large" };
export const sectionGood2: SectionProps = {
  paddingTop: "small",
  paddingBottom: "none",
};
export const sectionGood3: SectionProps = { padding: "xsmall", theme: "dark" };
/* 'main' is accepted deliberately: it is the default, but excluding it would
   make RETURNING to the default a type error, forcing a prop deletion instead
   of a value edit (and breaking any visual builder whose dropdown lists every
   size). Redundant-but-harmless is the correct behavior — Section drops it
   before render, so the HTML matches the omitted case exactly. The "don't
   write the default" rule is documentation, not a type. */
export const sectionGood4: SectionProps = { padding: "main" };

/* ── Visual: sizes and densities are mutually exclusive (HTML spec) ───────── */

// @ts-expect-error a density srcset has no width descriptors for sizes to pick from
export const visualBad1: VisualProps = {
  src: img,
  alt: "",
  sizes: "auto",
  densities: [1, 2],
};

export const visualGood1: VisualProps = { src: img, alt: "", sizes: "auto" };
export const visualGood2: VisualProps = {
  src: img,
  alt: "",
  densities: [1, 2],
};
