/**
 * Signed draft-preview sessions. Pure (Web Crypto only, no Astro or Sanity
 * runtime imports), so it runs the same in the Worker, `astro dev`, the
 * Node prerender and plain `node` (scripts/check-preview-session.mjs).
 *
 * Why: the `sanity-preview-perspective` cookie is readable and writable by
 * page script (SanityVisualEditing rewrites it when the editor switches
 * perspective), so its presence proves nothing. Draft mode, and with it
 * every fetch made with `SANITY_API_READ_TOKEN`, is gated on this separate
 * httpOnly cookie instead. /api/draft-mode/enable issues it only after
 * `validatePreviewUrl` accepts a Studio-signed preview secret.
 *
 * Format: `<expiry ms>.<base64url HMAC-SHA256(secret, "preview:" + expiry)>`.
 *
 * The HMAC key is `SANITY_API_READ_TOKEN` (read with getSecret() by the
 * callers in draft-mode.ts and enable.ts, never here). It is already a
 * required server-only secret that never reaches the browser, so signing
 * with it needs no new setup step; rotating the token ends every open
 * preview session, which is the behaviour you want after a rotation.
 *
 * Sessions last PREVIEW_SESSION_TTL_MS (8 hours). Re-opening Presentation
 * calls /api/draft-mode/enable again and issues a fresh one.
 */
import type { ClientPerspective } from "@sanity/client";

/** The httpOnly cookie that carries the signed session. */
export const PREVIEW_SESSION_COOKIE = "starter-preview-session";

/** How long a session lasts: 8 hours. */
export const PREVIEW_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const SIGNATURE_BYTES = 32; // SHA-256
/* A positive integer of at most 15 digits, a dot, then exactly 43
   base64url characters (32 bytes, unpadded). */
const SESSION_FORMAT = /^([1-9][0-9]{0,14})\.([A-Za-z0-9_-]{43})$/;

const encoder = new TextEncoder();

function message(expiry: number): Uint8Array<ArrayBuffer> {
  return encoder.encode(`preview:${expiry}`);
}

async function hmacKey(secret: string, usage: "sign" | "verify") {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | undefined {
  try {
    const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return undefined;
  }
}

/** Issue a session value that expires `ttlMs` after `now`. */
export async function createPreviewSession(
  secret: string,
  now = Date.now(),
  ttlMs = PREVIEW_SESSION_TTL_MS,
): Promise<string> {
  if (!secret) throw new Error("[preview-session] An empty secret.");
  const expiry = Math.floor(now + ttlMs);
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(secret, "sign"),
    message(expiry),
  );
  return `${expiry}.${toBase64Url(new Uint8Array(signature))}`;
}

/**
 * True only for a well-formed, unexpired value signed with `secret`.
 * The signature is checked with crypto.subtle.verify, which compares in
 * constant time.
 */
export async function verifyPreviewSession(
  secret: string,
  value: string | undefined,
  now = Date.now(),
): Promise<boolean> {
  if (!secret || !value) return false;
  const match = SESSION_FORMAT.exec(value);
  if (!match) return false;
  const expiry = Number(match[1]);
  if (!Number.isSafeInteger(expiry) || expiry <= now) return false;
  const signature = fromBase64Url(match[2]);
  /* Canonical encoding only: the last character carries two unused bits,
     so four spellings would otherwise decode to the same signature. */
  if (
    !signature ||
    signature.length !== SIGNATURE_BYTES ||
    toBase64Url(signature) !== match[2]
  )
    return false;
  try {
    return await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret, "verify"),
      signature,
      message(expiry),
    );
  } catch {
    return false;
  }
}

/* What a perspective can be. One keyword, or a release stack: the ids of
   the releases plus "drafts"/"published", most specific first. */
const KEYWORDS = new Set(["drafts", "published", "previewDrafts", "raw"]);
const STACK_ITEM = /^[A-Za-z0-9._-]+$/;
const MAX_LENGTH = 1024;
const MAX_STACK = 32;

/**
 * Reduce a perspective from a cookie or a preview URL to a value that is
 * safe to hand to the Sanity client, or undefined. Accepts what the Studio
 * and this add-on write:
 *
 * - a keyword: "drafts", "published", "previewDrafts" or "raw"
 * - a release stack, comma-separated (Presentation's preview URL encodes an
 *   array perspective that way) or a JSON array of strings
 *   (SanityVisualEditing writes JSON), each item letters, digits, dot,
 *   underscore or hyphen
 *
 * URL-encoded input is decoded once. Anything else (an unknown word, a
 * stray quote, an empty stack, more than 32 items, over 1024 characters)
 * gives undefined.
 */
export function sanitizePerspective(
  value: unknown,
): ClientPerspective | undefined {
  if (typeof value !== "string" || !value || value.length > MAX_LENGTH)
    return undefined;
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return undefined;
  }
  if (KEYWORDS.has(decoded)) return decoded as ClientPerspective;

  let items: unknown;
  if (decoded.startsWith("[")) {
    try {
      items = JSON.parse(decoded);
    } catch {
      return undefined;
    }
  } else if (decoded.includes(",")) {
    items = decoded.split(",");
  } else {
    return undefined;
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_STACK)
    return undefined;
  for (const item of items)
    if (typeof item !== "string" || !STACK_ITEM.test(item)) return undefined;
  return items as ClientPerspective;
}
