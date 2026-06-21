/// <reference types="astro/client" />
/// <reference types="@sanity/astro/module" />

declare module "cloudflare:workers" {
  export const env: Record<string, string | undefined>;
}

// CDN globals loaded via <script> in Head.astro (GSAP, ScrollTrigger, etc.)
interface Window {
  gsap?: any;
  ScrollTrigger?: any;
  SplitText?: any;
  Swiper?: any;
}
