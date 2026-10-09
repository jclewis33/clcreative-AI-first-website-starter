import {
  getForm,
  HONEYPOT_FIELD,
  SMS_CONSENT_TAG,
  type FormAccess,
  type FormConfig,
} from "@/config/forms";
import {
  addNote,
  addTags,
  ghlCredentials,
  GhlError,
  removeTags,
  setupNewContact,
  upsertContact,
} from "@/lib/ghl";

/**
 * The lead pipeline shared by /api/lead (public forms) and /tools/submit
 * (staff forms): validate → upsert the contact → consent → tags.
 *
 * Tags are what start Casey's GHL automations ("Contact Tag added"), and they
 * come only from src/config/forms.ts — the request names a `formId`, never a
 * tag. Order matters: SMS DND is set BEFORE the tags are added, so a
 * tag-triggered workflow can never text someone in the gap between the two.
 */

/* Real submissions are well under 1 KB; anything bigger is abuse. */
const MAX_BODY_BYTES = 10_000;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,24}$/;
/**
 * Free-text fields a form may send beyond the contact basics, with the label
 * each gets in the note on the contact. A field also listed in a form's
 * `customFields` is written there too. Anything not listed is dropped.
 */
export const NOTE_FIELDS = {
  company: "Company",
  service: "Service",
  projectType: "Project type",
  timeline: "Timeline",
  message: "Message",
} as const;

/* Soft, per-isolate limit — Workers recycle isolates, so this only slows a
   burst. The real limit is the Cloudflare WAF rate-limit rule on POST
   endpoints (docs/new-project-checklist.md §2). */
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT;
}

interface Lead {
  form: FormConfig;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  smsConsent: boolean;
  fields: Record<string, string>;
  isBot: boolean;
}

/**
 * Validate and normalize an untrusted body. Required: a known form id for
 * this endpoint, a first name, and an email or a phone (GHL matches contacts
 * on either). Every string is trimmed and length-capped.
 */
function parseLead(input: unknown, access: FormAccess): Lead | null {
  if (typeof input !== "object" || input === null) return null;
  const o = input as Record<string, unknown>;
  const str = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) : "";

  const form = getForm(o.formId);
  if (!form || form.access !== access) return null;

  const firstName = str(o.firstName, 100);
  const email = str(o.email, 320).toLowerCase();
  const phone = str(o.phone, 40);
  if (!firstName) return null;
  if (!email && phone.replace(/\D/g, "").length < 10) return null;
  if (email && !EMAIL_RE.test(email)) return null;

  /* Only note fields and fields the form maps to a custom field survive. */
  const fields: Record<string, string> = {};
  const names = new Set([
    ...Object.keys(NOTE_FIELDS),
    ...Object.keys(form.customFields ?? {}),
  ]);
  for (const name of names) {
    const value = str(o[name], 5_000);
    if (value) fields[name] = value;
  }

  return {
    form,
    firstName,
    lastName: str(o.lastName, 100),
    email,
    phone,
    /* The form posts JSON, so a ticked checkbox arrives as its value "on"
       and an unticked one is absent. Anything else counts as declined —
       consent must be affirmative. */
    smsConsent: o.smsConsent === "on" || o.smsConsent === true,
    fields,
    isBot: str(o[HONEYPOT_FIELD], 200) !== "",
  };
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleLead(
  request: Request,
  access: FormAccess,
): Promise<Response> {
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  /* Off in `astro dev`, where every request shares the "local" key. */
  if (!import.meta.env.DEV && rateLimited(ip)) {
    return json({ error: "Too many requests" }, 429);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: "Too large" }, 413);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const lead = parseLead(parsed, access);
  if (!lead) return json({ error: "Invalid submission" }, 400);

  /* Answer a bot exactly like a success so it has nothing to adapt to. */
  if (lead.isBot) return json({ success: true });

  const creds = ghlCredentials();
  if (!creds) {
    console.error("[lead] GHL_API_TOKEN / GHL_LOCATION_ID not configured");
    return json({ error: "Not configured" }, 502);
  }

  const { form } = lead;
  try {
    const contact = await upsertContact(creds, {
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      customFields: Object.entries(form.customFields ?? {})
        .filter(([name]) => lead.fields[name])
        .map(([name, id]) => ({ id, value: lead.fields[name] })),
    });

    /* A NEW contact gets its source, plus SMS DND if the box was left
       unticked. An existing contact keeps both — its original source, and
       any consent it gave on an earlier form. Both happen before the tags,
       so no tag-triggered workflow can text someone in between. */
    if (contact.isNew) {
      await setupNewContact(creds, contact.id, {
        source: form.source,
        blockSms: !lead.smsConsent,
      });
    }
    if (lead.smsConsent) {
      await addTags(creds, contact.id, [SMS_CONSENT_TAG]);
    }

    /* Re-trigger: "Contact Tag added" only fires when the tag is new to the
       contact, so remove any the contact already carries, then add. GHL
       stores tags lowercased — compare the same way. */
    if (form.retrigger) {
      const existing = new Set(contact.tags.map((t) => t.toLowerCase()));
      const present = form.tags.filter((t) => existing.has(t.toLowerCase()));
      if (present.length) await removeTags(creds, contact.id, present);
    }
    await addTags(creds, contact.id, form.tags);

    /* Last, and best-effort: the contact and its automations are already
       right, so a failed note shouldn't turn the submission into an error. */
    const note = Object.entries(NOTE_FIELDS)
      .filter(([name]) => lead.fields[name])
      .map(([name, label]) => `${label}: ${lead.fields[name]}`);
    if (note.length) {
      await addNote(creds, contact.id, [form.source, ...note].join("\n")).catch(
        (error) => console.warn("[lead] note not saved", error?.body ?? error),
      );
    }

    return json({ success: true });
  } catch (error) {
    const detail = error instanceof GhlError ? error.body : String(error);
    console.error("[lead] GHL request failed", detail);
    return json({ error: "Could not save the submission" }, 502);
  }
}
