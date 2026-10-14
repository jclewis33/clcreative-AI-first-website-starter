import { env } from "cloudflare:workers";

/**
 * GoHighLevel Contacts API — the three calls the lead pipeline needs.
 *
 * Auth is a Private Integration token (scopes contacts.readonly +
 * contacts.write) for one sub-account. Both values are secrets:
 * GHL_API_TOKEN and GHL_LOCATION_ID. See docs/ghl-forms.md.
 *
 * WHY TAGS NEVER GO ON THE UPSERT
 * -------------------------------
 * `tags` on /contacts/upsert REPLACES every tag the contact already has
 * (GHL's own schema note). A returning customer would lose the tags their
 * earlier automations set. Tags therefore go through the additive
 * POST/DELETE /contacts/{id}/tags endpoints, which also fire the
 * "Contact Tag added" trigger the automations listen on.
 */

const GHL_BASE = "https://services.leadconnectorhq.com";
/** GHL requires a dated API version header on every v2 call. */
const GHL_API_VERSION = "2021-07-28";

export interface GhlCredentials {
  token: string;
  locationId: string;
}

/**
 * Two sources on purpose. `cloudflare:workers` env is how the deployed
 * Worker sees its secrets, but its dev proxy reads .dev.vars / wrangler vars
 * — NOT .env. Astro exposes .env on import.meta.env for server code, so that
 * is the one that resolves under `astro dev`. Checking both keeps a single
 * .env entry working locally without a duplicate .dev.vars.
 */
export function readEnv(name: string): string | undefined {
  return env[name] || (import.meta.env[name] as string | undefined);
}

export function ghlCredentials(): GhlCredentials | null {
  const token = readEnv("GHL_API_TOKEN");
  const locationId = readEnv("GHL_LOCATION_ID");
  return token && locationId ? { token, locationId } : null;
}

export class GhlError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`GHL ${status}`);
  }
}

async function call<T>(
  creds: GhlCredentials,
  method: "POST" | "PUT" | "DELETE",
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${GHL_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${creds.token}`,
      Version: GHL_API_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new GhlError(res.status, data);
  return data as T;
}

export interface ContactInput {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  /** Written on every submission (matches the GHL snapshot's behavior). */
  source?: string;
  /** Omit to leave GHL's default (new contacts are leads). */
  type?: "customer";
  /** By custom-field key (e.g. `your_message`); `""` clears a field. */
  customFields?: { key: string; field_value: string }[];
}

export interface UpsertResult {
  id: string;
  /** True when GHL created the contact, false when it matched an existing one. */
  isNew: boolean;
  /** The contact's tags before this submission adds any. */
  tags: string[];
}

/** Create the contact, or update the one GHL matches on email or phone. */
export async function upsertContact(
  creds: GhlCredentials,
  input: ContactInput,
): Promise<UpsertResult> {
  /* Blank fields are left out rather than sent as "" so a repeat submission
     without a phone doesn't wipe the phone GHL already has. */
  const fields = Object.fromEntries(
    Object.entries(input).filter(
      ([, value]) =>
        value !== "" &&
        value !== undefined &&
        !(Array.isArray(value) && value.length === 0),
    ),
  );
  const data = await call<{
    new?: boolean;
    contact?: { id?: string; tags?: string[] };
  }>(creds, "POST", "/contacts/upsert", {
    locationId: creds.locationId,
    ...fields,
  });
  const id = data.contact?.id;
  if (!id)
    throw new GhlError(502, { message: "Upsert returned no contact id" });
  return { id, isNew: data.new === true, tags: data.contact?.tags ?? [] };
}

export function addTags(
  creds: GhlCredentials,
  contactId: string,
  tags: string[],
) {
  return call(creds, "POST", `/contacts/${contactId}/tags`, { tags });
}

export function removeTags(
  creds: GhlCredentials,
  contactId: string,
  tags: string[],
) {
  return call(creds, "DELETE", `/contacts/${contactId}/tags`, { tags });
}

/**
 * Attach a note to the contact. Notes need no per-account setup (unlike
 * custom fields, which must exist in the sub-account), so the message and
 * other free-text answers always land somewhere visible on the record.
 */
export function addNote(
  creds: GhlCredentials,
  contactId: string,
  body: string,
) {
  return call(creds, "POST", `/contacts/${contactId}/notes`, { body });
}
