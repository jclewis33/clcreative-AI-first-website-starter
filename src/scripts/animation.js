/**
 * GSAP Scroll Animations
 *
 * Data-attribute driven animation system powered by GSAP, ScrollTrigger, and SplitText.
 * Add the appropriate data attribute to any element to enable that animation.
 *
 * Available animations:
 *   data-splittext          — Line-masked text reveal (splits into words/lines, slides up)
 *   data-fade-in            — Fade in on scroll (opacity 0 → 1)
 *   data-fade-up            — Fade up on scroll (opacity 0 → 1, translates up)
 *   data-fade-list          — Staggered fade-up for child elements
 *
 * Modifiers (combine with any animation attribute above):
 *   data-prevent-flicker    — Hides element via CSS until GSAP reveals it (avoids FOUC)
 *   data-duration="0.8"     — Custom animation duration in seconds (default varies per type)
 *   data-distance="40"      — Custom translate distance in px, for fade-up (default: 20)
 *   data-stagger="0.15"     — Custom stagger delay in seconds, for fade-list (default: 0.2)
 *   data-delay="0.4"        — Delay before the animation starts, in seconds (default: 0).
 *                             Useful in hero sections to sequence elements (e.g. eyebrow 0,
 *                             heading 0.2, text 0.4, buttons 0.6).
 *
 * Utilities:
 *   data-refresh             — Fires ScrollTrigger.refresh() once when element enters viewport
 *
 * Loading (this is the part that keeps GSAP off pages that don't animate):
 *   This module itself is tiny and runs everywhere from BaseLayout. GSAP,
 *   ScrollTrigger, and SplitText are DYNAMIC imports, requested only after a
 *   querySelector confirms the page actually contains animation attributes —
 *   so /privacy-policy, /404 etc. download none of it. SplitText loads only
 *   when the page uses data-splittext. Users with prefers-reduced-motion also
 *   skip the GSAP download entirely: their reveal is plain inline styles.
 *   Components with their own animations (Marquee, Modal, Tab, ScrollReveal,
 *   HowItWorks, Services) import gsap statically in their own <script> —
 *   Vite serves both from the same deduped chunk on pages that have both.
 *
 * Fallback:
 *   If the GSAP chunk fails to load, a `gsap-not-found` class is added to
 *   <html> and CSS fallbacks in Head.astro restore visibility on all
 *   data-prevent-flicker elements.
 *
 * Dynamic content:
 *   Call window.initScrollAnimations() after injecting new DOM nodes to
 *   pick up any new data-attribute animations (async; loads GSAP on first
 *   use if the page had none at boot).
 */

import { wireScrollRefresh } from "./scroll-refresh.js";

// Everything the system reacts to. data-prevent-flicker is included even
// though it is "just a modifier": reset.css hides such elements until a
// reveal runs, so a page carrying it must never be skipped by the gate.
const ANIMATION_SELECTOR =
  "[data-splittext], [data-split-text='true'], [data-fade-in], [data-fade='in'], [data-fade-up], [data-fade='up'], [data-fade-list], [data-refresh], [data-prevent-flicker='true']";

const SPLIT_SELECTOR = "[data-splittext], [data-split-text='true']";

// Filled by loadGsap(); every init function below reads these.
let gsap = null;
let ScrollTrigger = null;
let SplitText = null;

/** True when the user has requested reduced motion via the OS/browser. */
function prefersReducedMotion() {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Reduced-motion path: reveal every animated element to its final, visible,
 * un-transformed state WITHOUT animating, and create no ScrollTriggers.
 *
 * This is required (not just "skip the tweens") because `data-prevent-flicker`
 * elements start `visibility: hidden` via CSS — skipping GSAP entirely would
 * leave them hidden forever. Plain inline styles do the reveal here so the
 * reduced-motion path never downloads GSAP at all (`visibility: inherit`
 * matches what gsap's autoAlpha would have written, respecting hidden
 * ancestors). SplitText elements are left unsplit as plain text.
 */
function revealAllStatic() {
  document.querySelectorAll(ANIMATION_SELECTOR).forEach((el) => {
    el.style.visibility = "inherit";
    el.style.opacity = "1";
    el.style.transform = "none";
  });
}

/**
 * Dynamically import GSAP core + ScrollTrigger (+ SplitText only when the
 * page splits text). Safe to call repeatedly — after the first resolution
 * the imports are cached by the module system.
 */
async function loadGsap() {
  const wantsSplit = document.querySelector(SPLIT_SELECTOR) !== null;
  const [gsapMod, stMod, splitMod] = await Promise.all([
    import("gsap"),
    import("gsap/ScrollTrigger"),
    wantsSplit ? import("gsap/SplitText") : Promise.resolve(null),
  ]);
  gsap = gsapMod.gsap;
  ScrollTrigger = stMod.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  if (splitMod) {
    SplitText = splitMod.SplitText;
    gsap.registerPlugin(SplitText);
  }
  // This module owns page-wide ScrollTriggers — answer layout-changers'
  // "scrolltrigger:refresh" events (deduped across owners; see the module).
  wireScrollRefresh(ScrollTrigger);
}

///////////////// SPLITTEXT ANIMATION /////////////////

const splitInstances = new WeakMap();

function initSplitText() {
  if (!SplitText) return;
  const elems = gsap.utils.toArray(SPLIT_SELECTOR);

  // Wait for fonts before splitting to avoid layout shifts
  const run = () => {
    elems.forEach((el) => {
      // Revert any previous split to prevent double-splitting
      const existing = splitInstances.get(el);
      if (existing && typeof existing.revert === "function") {
        existing.revert();
        splitInstances.delete(el);
      }

      // Ensure element is visible before split
      gsap.set(el, { autoAlpha: 1 });

      const delay = parseFloat(el.getAttribute("data-delay")) || 0;

      const instance = SplitText.create(el, {
        type: "words, lines",
        autoSplit: true,
        mask: "lines",
        linesClass: "line",
        onSplit: (self) => {
          return gsap.from(self.lines, {
            duration: 1.6,
            yPercent: 100,
            opacity: 0,
            stagger: 0.1,
            delay,
            ease: "expo.out",
            scrollTrigger: {
              trigger: el,
              start: "top 75%",
              end: "bottom 50%",
              once: true,
            },
          });
        },
      });

      splitInstances.set(el, instance);
    });
  };

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(run);
  } else {
    run();
  }
}

///////////////// FADE-IN ANIMATION /////////////////

function initFadeIn() {
  gsap.utils.toArray("[data-fade-in], [data-fade='in']").forEach((el) => {
    const duration = parseFloat(el.getAttribute("data-duration")) || 0.5;
    const delay = parseFloat(el.getAttribute("data-delay")) || 0;

    // autoAlpha (opacity + visibility) fades the element in. Its `from` state is
    // applied immediately (fromTo immediateRender), so data-prevent-flicker
    // elements that start `visibility: hidden` via CSS stay hidden until the
    // trigger fires, then animate to visible — no separate reveal step needed.
    gsap
      .timeline({
        scrollTrigger: {
          trigger: el,
          start: "top 75%",
          end: "bottom 50%",
          toggleActions: "play none none none",
        },
      })
      .fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration, delay });
  });
}

///////////////// FADE-UP ANIMATION /////////////////

function initFadeUp() {
  gsap.utils.toArray("[data-fade-up], [data-fade='up']").forEach((el) => {
    const duration = parseFloat(el.getAttribute("data-duration")) || 0.5;
    const distance = parseFloat(el.getAttribute("data-distance")) || 20;
    const delay = parseFloat(el.getAttribute("data-delay")) || 0;

    // autoAlpha handles both the fade and the data-prevent-flicker reveal in one
    // property (see initFadeIn); the immediate `from` state keeps hidden elements
    // hidden until the trigger fires.
    gsap
      .timeline({
        scrollTrigger: {
          trigger: el,
          start: "top 75%",
          end: "bottom 50%",
          toggleActions: "play none none none",
        },
      })
      .fromTo(
        el,
        { autoAlpha: 0, y: distance },
        { autoAlpha: 1, y: 0, duration, delay },
      );
  });
}

///////////////// FADE-LIST ANIMATION /////////////////

function initFadeList() {
  gsap.utils.toArray("[data-fade-list]").forEach((list) => {
    const duration = parseFloat(list.getAttribute("data-duration")) || 0.5;
    const stagger = parseFloat(list.getAttribute("data-stagger")) || 0.2;
    const delay = parseFloat(list.getAttribute("data-delay")) || 0;
    const preventFlicker = list.getAttribute("data-prevent-flicker") === "true";

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: list,
        start: "top 75%",
        end: "bottom 50%",
        toggleActions: "play none none none",
      },
    });

    // Reveal the container first if hidden for flicker prevention
    if (preventFlicker) {
      tl.set(list, { visibility: "visible" });
    }

    // If the list has a single wrapper child (e.g. Grid's inner div),
    // target its grandchildren so the stagger hits each item, not the wrapper.
    const items =
      list.children.length === 1 && list.children[0].children.length > 1
        ? list.children[0].children
        : list.children;

    tl.fromTo(
      items,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration, stagger, delay },
    );
  });
}

///////////////// MANUAL SCROLLTRIGGER REFRESH /////////////////

/**
 * Creates a one-shot ScrollTrigger for each [data-refresh] element.
 * When the element first enters the viewport, ScrollTrigger.refresh()
 * is called to recalculate all trigger positions, then the trigger
 * self-destructs via this.kill() so it only fires once.
 */
function initManualRefresh() {
  gsap.utils.toArray("[data-refresh]").forEach((el) => {
    const id = el.id || Math.random().toString(36).substr(2, 9);

    ScrollTrigger.create({
      trigger: el,
      start: "top bottom",
      id: `refresh-${id}`,
      onEnter: function () {
        ScrollTrigger.refresh();
        this.kill();
      },
    });
  });
}

///////////////// MASTER INIT /////////////////

/**
 * Initialises (or re-initialises) all data-attribute scroll animations.
 * Safe to call multiple times — existing animation ScrollTriggers are
 * killed first so elements aren't animated twice. Async because GSAP is
 * loaded on demand; awaiting it is only needed by callers that must run
 * code after the triggers exist.
 */
async function initScrollAnimations() {
  if (!document.querySelector(ANIMATION_SELECTOR)) return;

  // Respect prefers-reduced-motion: reveal content to its final state and
  // skip everything else — including the GSAP download itself.
  if (prefersReducedMotion()) {
    revealAllStatic();
    return;
  }

  try {
    await loadGsap();
  } catch (err) {
    // Chunk failed to load — flag the page so the CSS fallback in Head.astro
    // restores visibility on all data-prevent-flicker elements.
    document.documentElement.classList.add("gsap-not-found");
    console.warn(
      "GSAP failed to load; skipping animation initialization.",
      err,
    );
    return;
  }

  // Kill only animation-related ScrollTriggers (preserve pins, etc.)
  const animationSelector =
    "[data-fade-in], [data-fade-up], [data-fade-list], [data-fade], [data-splittext], [data-split-text]";

  ScrollTrigger.getAll().forEach((trigger) => {
    const triggerEl = trigger.vars.trigger;
    if (
      triggerEl &&
      triggerEl.nodeType === 1 &&
      typeof triggerEl.matches === "function" &&
      triggerEl.matches(animationSelector)
    ) {
      trigger.kill();
    }
  });

  initSplitText();
  initFadeIn();
  initFadeUp();
  initFadeList();
  initManualRefresh();

  ScrollTrigger.refresh();
}

// Initialise as soon as HTML is parsed — no wait for images.
// SplitText internally waits for document.fonts.ready before splitting, so
// font-dependent layout still settles before text is split.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => initScrollAnimations());
} else {
  initScrollAnimations();
}

// Expose for dynamic/CMS-injected content — call after new nodes are in the DOM
window.initScrollAnimations = initScrollAnimations;
