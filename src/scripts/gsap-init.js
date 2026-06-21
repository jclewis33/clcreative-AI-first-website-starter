/**
 * GSAP Bundle Init
 *
 * Imports GSAP, ScrollTrigger, and SplitText from the bundled npm package
 * and assigns them to `window.gsap`, `window.ScrollTrigger`, `window.SplitText`
 * so every component that currently reads them off `window` keeps working
 * unchanged.
 *
 * This file replaces the three CDN <script> tags that previously lived in
 * Head.astro. Bundling instead of CDN-loading means:
 *   - No network round-trip → no slow-network flash window
 *   - Animations can run at DOMContentLoaded instead of window.load
 *   - Version is pinned in package.json
 *   - Works offline / strict CSP
 *
 * Imported from BaseLayout.astro's <script> block. Must run before
 * animation.js and any component scripts that read window.gsap.
 */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

// Expose on window so existing components (Marquee, Modal, Tab, Accordion,
// ScrollReveal, HowItWorks, etc.) that read `(window as any).gsap` keep
// working without per-file refactoring.
window.gsap = gsap;
window.ScrollTrigger = ScrollTrigger;
window.SplitText = SplitText;
