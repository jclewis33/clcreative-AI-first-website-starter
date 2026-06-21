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
 * Fallback:
 *   If GSAP fails to load, a `gsap-not-found` class is added to <html> and CSS
 *   fallbacks in Head.astro restore visibility on all data-prevent-flicker elements.
 *
 * Dynamic content:
 *   Call window.initScrollAnimations() after injecting new DOM nodes to
 *   pick up any new data-attribute animations.
 */

///////////////// GSAP READINESS CHECK & PLUGIN REGISTRATION /////////////////

function isGsapReady() {
  return (
    typeof window !== "undefined" &&
    typeof window.gsap !== "undefined" &&
    typeof window.ScrollTrigger !== "undefined" &&
    typeof window.SplitText !== "undefined"
  );
}

/**
 * Readiness gate. ScrollTrigger + SplitText are already registered in
 * gsap-init.js (which runs first and only exposes gsap/ScrollTrigger/SplitText
 * on window *after* registering them), so we just verify they're present rather
 * than re-registering. Flags the page for the CSS fallback if GSAP failed to load.
 */
function ensureGsapReady() {
  if (!isGsapReady()) {
    document.documentElement.classList.add("gsap-not-found");
    console.warn("GSAP plugins not found; skipping animation initialization.");
    return false;
  }
  return true;
}

/** True when the user has requested reduced motion via the OS/browser. */
function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Reduced-motion path: reveal every animated element to its final, visible,
 * un-transformed state WITHOUT animating, and create no ScrollTriggers.
 *
 * This is required (not just "skip the tweens") because `data-prevent-flicker`
 * elements start `visibility: hidden` via CSS — if we skipped GSAP entirely they
 * would stay hidden forever. `autoAlpha: 1` writes inline `visibility: inherit;
 * opacity: 1`, overriding that. SplitText elements are left unsplit and simply
 * revealed as plain text. The reset.css `prefers-reduced-motion` block only
 * zeroes CSS animations/transitions, so it can't cover these JS-driven tweens.
 */
function revealAllStatic() {
  const selector =
    "[data-splittext], [data-split-text='true'], [data-fade-in], [data-fade='in'], [data-fade-up], [data-fade='up'], [data-fade-list]";
  gsap.utils.toArray(selector).forEach((el) => {
    gsap.set(el, { autoAlpha: 1, clearProps: "transform" });
  });
}

///////////////// SPLITTEXT ANIMATION /////////////////

const splitInstances = new WeakMap();

function initSplitText() {
  const elems = gsap.utils.toArray("[data-splittext], [data-split-text='true']");

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
        { autoAlpha: 1, y: 0, duration, delay }
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
      { opacity: 1, y: 0, duration, stagger, delay }
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
 * killed first so elements aren't animated twice.
 */
function initScrollAnimations() {
  if (!isGsapReady()) return;

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

  // Respect prefers-reduced-motion: reveal content to its final state and skip
  // all GSAP scroll animations + SplitText (gsap-core: skip/disable animation
  // when the user prefers reduced motion).
  if (prefersReducedMotion()) {
    revealAllStatic();
    return;
  }

  initSplitText();
  initFadeIn();
  initFadeUp();
  initFadeList();
  initManualRefresh();

  ScrollTrigger.refresh();
}

// Initialise as soon as HTML is parsed — no wait for images/CDN scripts.
// SplitText internally waits for document.fonts.ready before splitting, so
// font-dependent layout still settles before text is split.
function bootAnimations() {
  if (!ensureGsapReady()) return;
  initScrollAnimations();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootAnimations);
} else {
  bootAnimations();
}

// Expose for dynamic/CMS-injected content — call after new nodes are in the DOM
window.initScrollAnimations = initScrollAnimations;
