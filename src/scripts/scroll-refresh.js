/**
 * ScrollTrigger refresh bus.
 *
 * Two kinds of code need to talk about ScrollTrigger.refresh():
 *
 *   1. Owners — modules that IMPORT gsap/ScrollTrigger and create triggers
 *      (animation.js, ScrollReveal, HowItWorks, StackingPanels). Each calls
 *      wireScrollRefresh(ScrollTrigger) once after registering its plugin.
 *   2. Layout-changers — components that merely resize the page (an accordion
 *      opening, a blog filter re-rendering a grid). They must NOT import GSAP
 *      just to nudge it, so they dispatch the event instead:
 *
 *        document.dispatchEvent(new CustomEvent("scrolltrigger:refresh"));
 *
 * ScrollTrigger.refresh() is global (it repositions every trigger on the
 * page), so exactly one listener is wanted no matter how many owners are
 * present — the data attribute on <html> dedupes across all of them. On a
 * page with no GSAP at all the event simply has no listener and costs
 * nothing, which is what lets layout-changers stay GSAP-free.
 *
 * Call this rather than reaching for a global `ScrollTrigger` — an optional
 * chain against a global that is not there is a silent no-op.
 */
export function wireScrollRefresh(ScrollTrigger) {
  const root = document.documentElement;
  if (root.hasAttribute("data-st-refresh-wired")) return;
  root.setAttribute("data-st-refresh-wired", "");
  document.addEventListener("scrolltrigger:refresh", () =>
    ScrollTrigger.refresh(),
  );
}
