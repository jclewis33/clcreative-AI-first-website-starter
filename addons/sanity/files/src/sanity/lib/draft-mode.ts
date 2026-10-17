import type { AstroCookies } from "astro";
import { getSecret } from "astro:env/server";
import { perspectiveCookieName } from "@sanity/preview-url-secret/constants";
import type { ContentOptions } from "@/lib/content/types";
import {
  PREVIEW_SESSION_COOKIE,
  sanitizePerspective,
  verifyPreviewSession,
} from "./preview-session";

type DraftModeContext = {
  cookies: AstroCookies;
  isPrerendered?: boolean;
};

/**
 * True when the request carries a valid signed preview session (the
 * httpOnly cookie /api/draft-mode/enable sets after validating a
 * Studio-signed preview URL; see preview-session.ts). The perspective
 * cookie alone never counts: page script can write it.
 *
 * Prerendered pages always answer false without touching `cookies` (there
 * is no request at build time, and reading it would trigger
 * "Astro.request.headers was used" warnings).
 */
export async function hasPreviewSession(
  ctx: DraftModeContext,
): Promise<boolean> {
  if (ctx.isPrerendered) return false;
  const value = ctx.cookies.get(PREVIEW_SESSION_COOKIE)?.value;
  if (!value) return false;
  /* Runtime read, see load-query.ts. */
  const secret = getSecret("SANITY_API_READ_TOKEN") ?? "";
  return verifyPreviewSession(secret, value);
}

/**
 * The content options for this request, so `loadQuery` can switch to the
 * drafts perspective inside the Presentation iframe. Accepts the full
 * `Astro` global (or any object with `cookies` + `isPrerendered`) so it can
 * short-circuit on prerendered pages.
 *
 * Returns `{ preview: undefined }` (the `published` perspective, no token)
 * unless the signed preview session verifies. With a session, `preview` is
 * the perspective cookie's value run through sanitizePerspective(), or
 * "drafts" when the cookie is missing or not an allowed value.
 */
export async function getDraftModeProps(
  ctx: DraftModeContext,
): Promise<ContentOptions> {
  if (!(await hasPreviewSession(ctx))) return { preview: undefined };
  const perspective = sanitizePerspective(
    ctx.cookies.get(perspectiveCookieName)?.value,
  );
  return {
    preview:
      perspective === undefined
        ? "drafts"
        : typeof perspective === "string"
          ? perspective
          : JSON.stringify(perspective),
  };
}
