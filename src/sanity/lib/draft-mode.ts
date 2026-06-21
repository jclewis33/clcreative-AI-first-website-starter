import type { AstroCookies } from "astro";
import { perspectiveCookieName } from "@sanity/preview-url-secret/constants";

/**
 * Reads the Sanity perspective cookie off a request so `loadQuery` can switch
 * to the drafts perspective inside the Presentation iframe. Accepts the full
 * `Astro` global (or any object with `cookies` + `isPrerendered`) so we can
 * short-circuit on prerendered pages — there's no request at build time, and
 * touching `cookies` there would trigger "Astro.request.headers was used"
 * warnings.
 *
 * Prerendered pages always resolve to `{ perspectiveCookie: undefined }`,
 * which makes `loadQuery` use the `published` perspective. That's correct:
 * prerendered pages are baked at build time and can't support live draft
 * preview anyway.
 */
export function getDraftModeProps(ctx: {
  cookies: AstroCookies;
  isPrerendered?: boolean;
}) {
  if (ctx.isPrerendered) {
    return { perspectiveCookie: undefined };
  }
  return {
    perspectiveCookie: ctx.cookies.get(perspectiveCookieName)?.value ?? undefined,
  };
}
