import { stegaClean } from "@sanity/client/stega";

/**
 * Estimate read time in minutes from a Portable Text body.
 *
 * Counts words across all text spans in `block` nodes and rounds up to the
 * nearest whole minute at 225 words per minute (average adult reading pace).
 * Non-text nodes (images, code, video embeds) are ignored.
 *
 * Runs `stegaClean` first so Sanity's stega-encoded draft metadata doesn't
 * inflate the word count when visual editing is active.
 */
export function estimateReadTime(
  blocks: any[] | null | undefined,
  wordsPerMinute = 225
): number {
  if (!blocks?.length) return 1;

  let text = "";

  for (const block of blocks) {
    if (block?._type !== "block" || !Array.isArray(block.children)) continue;
    for (const child of block.children) {
      if (child?._type === "span" && typeof child.text === "string") {
        text += " " + child.text;
      }
    }
  }

  const cleaned = stegaClean(text);
  const words = cleaned.trim().split(/\s+/).filter(Boolean);

  return Math.max(1, Math.ceil(words.length / wordsPerMinute));
}
