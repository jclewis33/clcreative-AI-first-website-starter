import type { AstroCookies } from "astro";
import { getSecret } from "astro:env/server";
import { perspectiveCookieName } from "@sanity/preview-url-secret/constants";
import type { ContentOptions } from "@/lib/content/types";
import { PREVIEW_SESSION_COOKIE, resolvePreview } from "./preview-session";

/**
 * The content options for this request, so `loadQuery` can switch to the
 * drafts perspective inside the Presentation iframe. Accepts the full
 * `Astro` global (or any object with `cookies` + `isPrerendered`) so it can
 * short-circuit on prerendered pages: there is no request at build time,
 * and reading `cookies` there would trigger "Astro.request.headers was
 * used" warnings.
 *
 * `preview` is undefined (the `published` perspective, no token) unless
 * the request carries a valid signed preview session (the httpOnly cookie
 * /api/draft-mode/enable sets after validating a Studio-signed preview
 * URL). The perspective cookie alone never counts: page script can write
 * it. The decision itself is resolvePreview() in preview-session.ts, which
 * check-preview-session.mjs tests. CmsEditing calls this too, so the
 * visual-editing overlay shows exactly when drafts are fetched.
 */
export async function getDraftModeProps(ctx: {
  cookies: AstroCookies;
  isPrerendered?: boolean;
}): Promise<ContentOptions> {
  if (ctx.isPrerendered) return { preview: undefined };
  const session = ctx.cookies.get(PREVIEW_SESSION_COOKIE)?.value;
  if (!session) return { preview: undefined };
  return {
    preview: await resolvePreview(
      /* Runtime read, see load-query.ts. */
      getSecret("SANITY_API_READ_TOKEN") ?? "",
      session,
      ctx.cookies.get(perspectiveCookieName)?.value,
    ),
  };
}
