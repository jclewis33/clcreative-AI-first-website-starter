/**
 * The gate in front of the Client tools (/tools and everything under it).
 * src/middleware.ts runs `checkToolsAuth` on every /tools request, before
 * the route itself. Two ways in, picked per site by what's configured:
 *
 * 1. **Cloudflare Access** — when CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD
 *    are set. Access asks for an email + one-time PIN at the edge; every
 *    request is then checked for its signed token here (src/lib/cf-access.ts),
 *    so a deleted or misconfigured Access app fails closed. Needs the
 *    client's domain on Cloudflare in OUR account (Access gates a path only
 *    on a zone it owns).
 * 2. **Shared password** — otherwise, when TOOLS_PASSWORD is set (a
 *    Cloudflare ENCRYPTED secret). For sites served through Cloudflare for
 *    SaaS, where the domain lives in the client's own Cloudflare account and
 *    Access can't gate a path. The team signs in once on /tools/sign-in;
 *    that sets an HttpOnly cookie holding an HMAC of the password (never the
 *    password), good for `SESSION_DAYS`. Changing the password signs every
 *    device out.
 *
 * Neither configured = every /tools request is refused (503). `astro dev`
 * skips the gate.
 *
 * A real sign-in page, not HTTP Basic auth: in-app browsers (a link tapped
 * in a text message) never show the Basic prompt.
 *
 * `cloudflare:workers` (via ghl.ts / cf-access.ts) is imported lazily: the
 * middleware imports this file on every route, and prerendered pages render
 * where that module doesn't exist — a top-level import takes the site down.
 *
 * Every /tools route must be SSR (`prerender = false`) — prerendered pages
 * are served as static assets and never reach the middleware.
 */

export const SIGN_IN_PAGE = "/tools/sign-in";
export const SIGN_IN_ENDPOINT = "/tools/session";
/** Where a successful sign-in lands when there's nowhere better. */
const HOME = "/tools";

const COOKIE = "tools_session";
const SESSION_DAYS = 90;

/** Is this a route the gate covers? */
export function isToolsPath(pathname: string): boolean {
  return /^\/tools(\/|$)/.test(pathname);
}

/** Compare two strings without leaking where they differ through timing. */
export function sameText(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

async function readEnv(name: string): Promise<string> {
  const { readEnv: read } = await import("@/lib/ghl");
  return read(name) ?? "";
}

/** Which gate this site uses, from what's configured. */
export async function toolsMode(): Promise<"access" | "password" | "none"> {
  if (
    (await readEnv("CF_ACCESS_TEAM_DOMAIN")) &&
    (await readEnv("CF_ACCESS_AUD"))
  ) {
    return "access";
  }
  return (await readEnv("TOOLS_PASSWORD")) ? "password" : "none";
}

/** The configured password, or empty when unset. */
export function toolsPassword(): Promise<string> {
  return readEnv("TOOLS_PASSWORD");
}

/** The session token for a password: hex HMAC-SHA256, keyed by the password. */
async function sessionToken(password: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode("tools-session-v1"),
  );
  return [...new Uint8Array(mac)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** The `Set-Cookie` value that signs this browser in. */
export async function sessionCookie(
  password: string,
  request: Request,
): Promise<string> {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return `${COOKIE}=${await sessionToken(password)}; Path=/tools; Max-Age=${maxAge}; HttpOnly; SameSite=Strict${secure}`;
}

/** Only ever send people back into the tools — never off-site. */
export function safeNext(next: string | null): string {
  return next && isToolsPath(next) && !next.startsWith(SIGN_IN_PAGE)
    ? next
    : HOME;
}

const noStore = { "Cache-Control": "no-store" };

const jsonError = (error: string, status: number) =>
  new Response(JSON.stringify({ error }), {
    status,
    headers: { ...noStore, "Content-Type": "application/json" },
  });

/**
 * `null` when the request may go through; otherwise the response to send
 * instead — a redirect to the sign-in page for a signed-out page view,
 * 401/403 for writes, 503 when no gate is configured.
 */
export async function checkToolsAuth(
  request: Request,
): Promise<Response | null> {
  if (import.meta.env.DEV) return null;

  const url = new URL(request.url);
  const isPage = request.method === "GET" || request.method === "HEAD";

  // Writes must come from our own pages, sign-in included. The cookie is
  // SameSite=Strict too; this covers every content type.
  if (!isPage) {
    const site = request.headers.get("sec-fetch-site");
    const origin = request.headers.get("origin");
    if ((site && site !== "same-origin") || origin !== url.origin) {
      return jsonError("Forbidden", 403);
    }
  }

  const mode = await toolsMode();

  if (mode === "access") {
    // Access owns sign-in; the password page has no job here.
    if (url.pathname === SIGN_IN_PAGE) {
      return new Response(null, {
        status: 303,
        headers: { ...noStore, Location: HOME },
      });
    }
    const { verifyAccess } = await import("@/lib/cf-access");
    const access = await verifyAccess(request);
    return access.ok ? null : jsonError(access.reason, access.status);
  }

  if (mode === "none") {
    console.error(
      "[tools-auth] Neither Cloudflare Access nor TOOLS_PASSWORD is set — /tools is locked",
    );
    return new Response("The client tools are not set up yet.", {
      status: 503,
      headers: noStore,
    });
  }

  // Password mode. The sign-in page and its endpoint are the way in.
  if (url.pathname === SIGN_IN_PAGE || url.pathname === SIGN_IN_ENDPOINT) {
    return null;
  }

  const password = await toolsPassword();
  const cookie = (request.headers.get("cookie") ?? "")
    .split(/;\s*/)
    .find((part) => part.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  if (cookie && sameText(cookie, await sessionToken(password))) return null;

  if (!isPage) return jsonError("Signed out", 401);
  const next = encodeURIComponent(url.pathname + url.search);
  return new Response(null, {
    status: 303,
    headers: { ...noStore, Location: `${SIGN_IN_PAGE}?next=${next}` },
  });
}
