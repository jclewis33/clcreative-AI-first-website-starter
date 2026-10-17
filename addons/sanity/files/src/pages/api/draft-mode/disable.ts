import type { APIRoute } from "astro";
import { perspectiveCookieName } from "@sanity/preview-url-secret/constants";
import { PREVIEW_SESSION_COOKIE } from "@/sanity/lib/preview-session";

export const prerender = false;

export const GET: APIRoute = ({ cookies, redirect }) => {
  /* Same attributes the enable route set them with, so browsers that
     match on SameSite/Secure clear them. */
  for (const name of [PREVIEW_SESSION_COOKIE, perspectiveCookieName])
    cookies.delete(name, { path: "/", sameSite: "none", secure: true });
  return redirect("/", 307);
};
