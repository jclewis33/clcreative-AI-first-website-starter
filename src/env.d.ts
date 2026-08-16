/// <reference types="astro/client" />
/// <reference types="@sanity/astro/module" />

declare module "cloudflare:workers" {
  export const env: Record<string, string | undefined>;
}

// Globals assigned to window by src/scripts/gsap-init.js and swiper-init.js
// (npm bundles imported in BaseLayout.astro) — GSAP, ScrollTrigger, Swiper, etc.
interface Window {
  gsap?: any;
  ScrollTrigger?: any;
  SplitText?: any;
  Swiper?: any;
}
