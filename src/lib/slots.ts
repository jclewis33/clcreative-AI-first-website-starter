/**
 * Slot helpers — "does this slot actually render anything?"
 *
 * `Astro.slots.has(name)` answers a different question than it looks like it
 * does: it reports whether a slot was PASSED, not whether it produces output.
 * A slot holding an expression that renders nothing — `{items.map(…)}` over an
 * empty array, a `{cond && <X />}` whose condition is false, a bare comment —
 * still counts as provided. Gating a wrapper on `.has()` therefore emits an
 * empty `<div>` on exactly the pages where the data is missing, which is the
 * common failure on CMS-driven pages.
 *
 * Rendering the slot and inspecting the result answers the real question.
 *
 * ⚠️ Call these from the TEMPLATE, never from frontmatter. Rendering a slot in
 * frontmatter forces its children to render before Astro has finished setting
 * up the render context, and an `<Image>` anywhere inside then hits an
 * uninitialized image service ("Cannot read properties of undefined (reading
 * 'validateOptions')"). Astro caches the render, so calling it in the template
 * and then emitting `<slot />` does not render the children twice.
 */

type Slots = {
  has(name: string): boolean;
  render(name: string): Promise<string>;
};

/**
 * The slot's rendered HTML, or `""` when it renders nothing visible.
 *
 * HTML comments are stripped before the check, so markup left behind by a
 * commented-out block or by editor tooling does not read as content.
 *
 * @example Only wrap when there is something to wrap
 * ```astro
 * ---
 * import { slotContent } from "@/lib/slots";
 * ---
 * {(await slotContent(Astro.slots, "footer")) && (
 *   <div class="card_footer"><slot name="footer" /></div>
 * )}
 * ```
 */
export async function slotContent(
  slots: Slots,
  name = "default",
): Promise<string> {
  if (!slots.has(name)) return "";
  const html = await slots.render(name);
  return html.replace(/<!--[\s\S]*?-->/g, "").trim();
}

/**
 * `true` when the slot renders something visible.
 *
 * Reads better than `!!(await slotContent(...))` at call sites that only need
 * the yes/no.
 */
export async function hasSlotContent(
  slots: Slots,
  name = "default",
): Promise<boolean> {
  return (await slotContent(slots, name)) !== "";
}
