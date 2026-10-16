/**
 * Video page URL → embeddable player URL. Pure (no Astro imports), so the
 * content-sync check (src/lib/content/checks.ts) rejects an MDX
 * `<VideoEmbed url>` with the very rule src/components/blog/VideoEmbed.astro
 * renders with.
 *
 * Supported: YouTube `youtube.com/watch?v=…` (also `m.` and `www.`),
 * `youtube.com/shorts/…`, `youtu.be/…`; Vimeo `vimeo.com/<id>` and
 * `player.vimeo.com/video/<id>` (used as-is).
 */

/** The embeddable player URL for a YouTube or Vimeo page, else null. */
export function videoEmbedUrl(pageUrl: string): string | null {
  try {
    const u = new URL(pageUrl);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (u.pathname.startsWith("/shorts/")) {
        return `https://www.youtube.com/embed/${u.pathname.split("/")[2]}`;
      }
    }
    if (host === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    if (host === "player.vimeo.com") return pageUrl;
  } catch {
    return null;
  }
  return null;
}
