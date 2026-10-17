import type { APIRoute } from "astro";
import { validatePreviewUrl } from "@sanity/preview-url-secret";
import { perspectiveCookieName } from "@sanity/preview-url-secret/constants";
import { sanityClient } from "sanity:client";
import { getSecret } from "astro:env/server";
import {
  PREVIEW_SESSION_COOKIE,
  PREVIEW_SESSION_TTL_MS,
  createPreviewSession,
  sanitizePerspective,
  serializePerspective,
} from "@/sanity/lib/preview-session";

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  /* Runtime read — see load-query.ts. */
  const token = getSecret("SANITY_API_READ_TOKEN");

  if (!token) {
    return new Response("Server misconfigured: missing read token", {
      status: 500,
    });
  }

  const clientWithToken = sanityClient.withConfig({ token });
  const {
    isValid,
    redirectTo = "/",
    studioPreviewPerspective,
  } = await validatePreviewUrl(clientWithToken, request.url);

  if (!isValid) {
    return new Response("Invalid secret", { status: 401 });
  }

  /* The signed session is what turns draft mode on (getDraftModeProps,
     CmsEditing). httpOnly: page script never sees or forges it. Signed
     with the read token; see src/sanity/lib/preview-session.ts. */
  const maxAge = Math.floor(PREVIEW_SESSION_TTL_MS / 1000);
  cookies.set(PREVIEW_SESSION_COOKIE, await createPreviewSession(token), {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
    maxAge,
  });

  /* The perspective stays a script-readable cookie: SanityVisualEditing
     rewrites it when the editor switches perspective. Only an allowlisted
     value is stored, and the server sanitizes it again on every read. */
  cookies.set(
    perspectiveCookieName,
    serializePerspective(
      sanitizePerspective(studioPreviewPerspective) ?? "drafts",
    ),
    {
      httpOnly: false,
      sameSite: "none",
      secure: true,
      path: "/",
      maxAge,
    },
  );

  return redirect(redirectTo, 307);
};
