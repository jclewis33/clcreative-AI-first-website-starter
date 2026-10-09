/// <reference types="astro/client" />
/// <reference types="@sanity/astro/module" />

declare module "cloudflare:workers" {
  export const env: Record<string, string | undefined>;
}

// Server-only values for the GHL lead pipeline (src/lib/ghl.ts,
// src/lib/cf-access.ts). Read from `cloudflare:workers` env in the deployed
// Worker and from .env via import.meta.env under `astro dev`.
interface ImportMetaEnv {
  readonly GHL_API_TOKEN?: string;
  readonly GHL_LOCATION_ID?: string;
  readonly CF_ACCESS_TEAM_DOMAIN?: string;
  readonly CF_ACCESS_AUD?: string;
}

// GSAP and Swiper are imported directly by the components that use them —
// there are no library globals on window anymore. The one deliberate global
// is the escape hatch animation.js assigns for CMS-injected content.
interface Window {
  initScrollAnimations?: () => Promise<void>;
}
