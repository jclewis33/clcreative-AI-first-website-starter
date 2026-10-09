import { readEnv } from "@/lib/ghl";

/**
 * Cloudflare Access check for the staff endpoint (/tools/submit).
 *
 * Access itself is the gate: an Access application on the `/tools` path
 * makes Cloudflare demand an email one-time PIN before any request reaches
 * the Worker. This is defence in depth — it verifies the signed JWT Access
 * attaches (`Cf-Access-Jwt-Assertion`), so a misconfigured or deleted Access
 * app fails closed instead of leaving a CRM-writing form open to anyone.
 *
 * Config (plain vars, not secrets): CF_ACCESS_TEAM_DOMAIN
 * (e.g. "yourteam.cloudflareaccess.com") and CF_ACCESS_AUD (the Access
 * application's Audience tag). See docs/ghl-forms.md.
 */

export type AccessResult =
  | { ok: true; email?: string }
  | { ok: false; status: 401 | 403 | 503; reason: string };

interface Jwk extends JsonWebKey {
  kid: string;
}

/* Access rotates its signing keys every few weeks; caching per isolate for
   an hour keeps verification to one fetch per warm Worker. */
let cachedKeys: { at: number; keys: Jwk[] } | null = null;
const KEY_TTL_MS = 60 * 60 * 1000;

async function signingKeys(teamDomain: string): Promise<Jwk[]> {
  if (cachedKeys && Date.now() - cachedKeys.at < KEY_TTL_MS) {
    return cachedKeys.keys;
  }
  const res = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`Access certs ${res.status}`);
  const { keys } = (await res.json()) as { keys: Jwk[] };
  cachedKeys = { at: Date.now(), keys };
  return keys;
}

function base64UrlDecode(part: string): Uint8Array<ArrayBuffer> {
  const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function verifyAccess(request: Request): Promise<AccessResult> {
  /* `astro dev` has no Access in front of it. */
  if (import.meta.env.DEV) return { ok: true };

  const teamDomain = readEnv("CF_ACCESS_TEAM_DOMAIN")?.replace(
    /^https?:\/\/|\/$/g,
    "",
  );
  const audience = readEnv("CF_ACCESS_AUD");
  if (!teamDomain || !audience) {
    console.error(
      "[lead] CF_ACCESS_TEAM_DOMAIN / CF_ACCESS_AUD not configured",
    );
    return { ok: false, status: 503, reason: "Staff tools are not configured" };
  }

  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return { ok: false, status: 401, reason: "Sign-in required" };

  try {
    const [headerPart, payloadPart, signaturePart] = token.split(".");
    if (!headerPart || !payloadPart || !signaturePart) throw new Error("shape");
    const decoder = new TextDecoder();
    const header = JSON.parse(decoder.decode(base64UrlDecode(headerPart)));
    const payload = JSON.parse(decoder.decode(base64UrlDecode(payloadPart)));

    const jwk = (await signingKeys(teamDomain)).find(
      (k) => k.kid === header.kid,
    );
    if (!jwk || header.alg !== "RS256") throw new Error("unknown key");

    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      base64UrlDecode(signaturePart),
      new TextEncoder().encode(`${headerPart}.${payloadPart}`),
    );
    if (!valid) throw new Error("signature");

    const audiences: string[] = [payload.aud].flat();
    const now = Math.floor(Date.now() / 1000);
    if (!audiences.includes(audience)) throw new Error("audience");
    if (payload.iss !== `https://${teamDomain}`) throw new Error("issuer");
    if (typeof payload.exp !== "number" || payload.exp <= now) {
      throw new Error("expired");
    }

    return { ok: true, email: payload.email };
  } catch (error) {
    console.warn("[lead] Access token rejected:", (error as Error).message);
    return { ok: false, status: 403, reason: "Not allowed" };
  }
}
