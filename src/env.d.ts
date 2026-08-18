/// <reference types="astro/client" />
/// <reference types="@sanity/astro/module" />

declare module "cloudflare:workers" {
  export const env: Record<string, string | undefined>;
}

// GSAP and Swiper are imported directly by the components that use them —
// there are no library globals on window anymore. The one deliberate global
// is the escape hatch animation.js assigns for CMS-injected content.
interface Window {
  initScrollAnimations?: () => Promise<void>;
}
