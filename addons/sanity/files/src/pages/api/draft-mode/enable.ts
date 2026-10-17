import type { APIRoute } from "astro";
import { validatePreviewUrl } from "@sanity/preview-url-secret";
import { perspectiveCookieName } from "@sanity/preview-url-secret/constants";
import { sanityClient } from "sanity:client";
import { getSecret } from "astro:env/server";

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

  cookies.set(perspectiveCookieName, studioPreviewPerspective ?? "drafts", {
    httpOnly: false,
    sameSite: "none",
    secure: true,
    path: "/",
  });

  return redirect(redirectTo, 307);
};
