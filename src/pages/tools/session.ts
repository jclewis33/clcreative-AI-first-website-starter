import type { APIRoute } from "astro";
import {
  SIGN_IN_PAGE,
  safeNext,
  sameText,
  sessionCookie,
  toolsMode,
  toolsPassword,
} from "@/lib/tools-auth";

/**
 * POST /tools/session — the form on /tools/sign-in (password mode only;
 * see src/lib/tools-auth.ts). A right password sets the session cookie and
 * sends the browser on to `next`; a wrong one goes back to the sign-in page
 * with `?error=1`. A plain form post + redirect (no JS), so it works in any
 * browser.
 *
 * The middleware has already checked the request came from our own pages.
 */
export const prerender = false;

/* Ten tries per 10 minutes per IP — slows guessing to a crawl. Per isolate,
   so a soft limit; the WAF rule in docs/ghl-forms.md is the hard one. */
const LIMIT = 10;
const WINDOW_MS = 10 * 60 * 1000;
const tries = new Map<string, number[]>();

function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (tries.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  tries.set(ip, recent);
  return recent.length > LIMIT;
}

const redirect = (location: string, cookie?: string) =>
  new Response(null, {
    status: 303,
    headers: {
      Location: location,
      "Cache-Control": "no-store",
      ...(cookie ? { "Set-Cookie": cookie } : {}),
    },
  });

export const POST: APIRoute = async ({ request }) => {
  const body = await request.formData().catch(() => null);
  const text = (name: string, max: number) => {
    const value = body?.get(name);
    return typeof value === "string" ? value.slice(0, max) : "";
  };

  const next = safeNext(text("next", 500));
  if ((await toolsMode()) !== "password") return redirect(next);

  const back = `${SIGN_IN_PAGE}?next=${encodeURIComponent(next)}`;
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  if (!import.meta.env.DEV && limited(ip)) {
    return redirect(`${back}&error=limited`);
  }

  const password = await toolsPassword();
  if (!password || !sameText(text("password", 200), password)) {
    return redirect(`${back}&error=1`);
  }

  return redirect(next, await sessionCookie(password, request));
};
