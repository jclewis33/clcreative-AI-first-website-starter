/**
 * Swiper Bundle Init
 *
 * Imports Swiper (all modules) + styles from the bundled npm package and
 * assigns it to `window.Swiper` so the Slider component keeps working
 * unchanged. This replaces the CDN <link>/<script> that previously lived in
 * Head.astro — see gsap-init.js for the same rationale (no network round-trip,
 * pinned version, works offline / strict CSP).
 *
 * `swiper/bundle` pre-installs every Swiper module (Navigation, Pagination,
 * Mousewheel, FreeMode, etc.), so the core-entry requirement (since Swiper 9)
 * of passing explicit `modules: []` does not apply here. `swiper/css/bundle`
 * is the matching all-modules stylesheet; Vite extracts it into the build's
 * CSS bundle automatically.
 *
 * Imported from BaseLayout.astro's <script> block, alongside gsap-init.js.
 */

import Swiper from "swiper/bundle";
import "swiper/css/bundle";

// Expose on window so the Slider component (which reads `(window as any).Swiper`)
// keeps working without per-file refactoring.
window.Swiper = Swiper;
