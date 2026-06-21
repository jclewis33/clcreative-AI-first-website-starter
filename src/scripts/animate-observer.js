/**
 * Animate Observer
 * Tiny IntersectionObserver that adds .is-visible to [data-animate-in] and
 * [data-animate-up] elements when they enter the viewport.
 *
 * - Elements already in the viewport on page load get .is-visible immediately
 *   (no animation delay — they just appear, like GSAP's onLoad behavior).
 * - Elements below the fold get .is-visible when they scroll into view,
 *   triggering the CSS transition (500ms fade-in / fade-up).
 * - Once visible, the observer disconnects from that element (one-shot).
 *
 * No-JS fallback handled by <noscript> style in Head.astro.
 */
const SELECTOR = "[data-animate-in], [data-animate-up]";
const elements = document.querySelectorAll(SELECTOR);

if (elements.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      // Matches GSAP's start: "top 75%" — fires when the top of the element
      // crosses 75% from the top of the viewport (25% up from the bottom).
      // -25% bottom margin shrinks the trigger zone by 25% of viewport height.
      rootMargin: "0px 0px -25% 0px",
    }
  );

  elements.forEach((el) => observer.observe(el));
}
