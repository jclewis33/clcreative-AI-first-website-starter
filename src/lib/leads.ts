import {
  getForm,
  HONEYPOT_FIELD,
  SMS_CONSENT_TAG,
  SMS_NO_CONSENT_TAG,
  type FormAccess,
  type FormConfig,
} from "@/config/forms";
import { DEMO } from "@/config/demo.shared.mjs";
import { SITE } from "@/config/site";
import { SMS_CONSENT_FOOTER, SMS_CONSENT_LABEL } from "@/config/sms-consent";
import {
  addNote,
  addTags,
  ghlCredentials,
  GhlError,
  removeTags,
  upsertContact,
} from "@/lib/ghl";

/**
 * The lead pipeline shared by /api/lead (public forms) and /tools/submit
 * (staff forms): validate → upsert the contact → consent → tags.
 *
 * Tags are what start Casey's GHL automations ("Contact Tag added"), and they
 * come only from src/config/forms.ts — the request names a `formId`, never a
 * tag. Consent tags go on before the form's tags, so a tag-triggered
 * workflow already sees them. Behavior matches the GHL snapshot (the Way
 * Construction build) — see src/config/forms.ts.
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
  rating: "Rating",
  referrer: "Referred by",
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
  /**
   * SMS consent from this submission; `undefined` when it wasn't asked —
   * texting off (`SITE.smsOptIn`), no phone, or a staff form.
   */
  smsConsent: boolean | undefined;
  /** A `referral` form submitted on behalf of a friend (`for: "friend"`). */
  isReferral: boolean;
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

  /* A rating form needs a whole star count, 1–5. */
  if (form.ratingTag) {
    if (!/^[1-5]$/.test(fields.rating ?? "")) return null;
  } else {
    delete fields.rating;
  }

  /* Referral forms: the person in the form is the friend, and the one
     submitting must say who they are. Everywhere else `referrer` is dropped. */
  const isReferral = Boolean(form.referral) && o.for === "friend";
  if (isReferral && !fields.referrer) return null;
  if (!isReferral) delete fields.referrer;

  return {
    form,
    firstName,
    lastName: str(o.lastName, 100),
    email,
    phone,
    /* Only asked on public forms with a phone while texting is on. The
       form posts JSON, so a ticked checkbox arrives as its value "on" and
       an unticked one is absent; anything else counts as declined. A
       referral is always "no" — nobody can consent for a friend. */
    smsConsent:
      SITE.smsOptIn && phone && access === "public"
        ? !isReferral && (o.smsConsent === "on" || o.smsConsent === true)
        : undefined,
    isReferral,
    fields,
    isBot: str(o[HONEYPOT_FIELD], 200) !== "",
  };
}

/** The tags this submission adds: the form's, plus rating and referral tags. */
function tagsFor(lead: Lead): string[] {
  const { form, fields } = lead;
  return [
    ...form.tags,
    ...(form.ratingTag ? [`${form.ratingTag} ${fields.rating}-star`] : []),
    ...(lead.isReferral && form.referral ? form.referral.tags : []),
  ];
}

/**
 * The consent line saved in the note: what they agreed to, when, and on
 * which page — the record carriers ask for. Only when the question was
 * asked (see `smsConsent`).
 */
function consentRecord(lead: Lead, page: string | null): string | null {
  if (lead.smsConsent === undefined) return null;
  const where = page ? ` on ${page}` : "";
  return lead.smsConsent
    ? `SMS consent: GIVEN ${new Date().toISOString()}${where}. They ticked the box reading: "${SMS_CONSENT_LABEL} ${SMS_CONSENT_FOOTER}"`
    : `SMS consent: NOT given${where} (box left unticked).`;
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
    /* A prospect demo never shows its visitor an error — see demoSuccess. */
    if (DEMO) return demoSuccess("GHL not configured");
    console.error("[lead] GHL_API_TOKEN / GHL_LOCATION_ID not configured");
    return json({ error: "Not configured" }, 502);
  }

  const { form } = lead;
  const tags = tagsFor(lead);
  const formSource =
    lead.isReferral && form.referral ? form.referral.source : form.source;
  /* Demo leads land in a shared demo sub-account: name the prospect so
     they can be told apart there. */
  const source = DEMO ? `Demo: ${DEMO.prospect} — ${formSource}` : formSource;
  try {
    const contact = await upsertContact(creds, {
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      source,
      /* A referred friend is new business — leave GHL's type alone. */
      type: lead.isReferral ? undefined : form.contactType,
      customFields: Object.entries(form.customFields ?? {})
        .filter(
          ([name]) =>
            lead.fields[name] || (name === "referrer" && form.referral),
        )
        /* A self claim clears `referrer`, so last year's referral can't
           show in this year's message to the owner. */
        .map(([name, key]) => ({ key, field_value: lead.fields[name] ?? "" })),
    });

    /* Consent tags, by the snapshot's rules: yes → `sms consent` (and off
       with `sms did not consent`); no → `sms did not consent`, unless
       they consented before. */
    const had = new Set(contact.tags.map((t) => t.toLowerCase()));
    if (lead.smsConsent === true) {
      if (had.has(SMS_NO_CONSENT_TAG)) {
        await removeTags(creds, contact.id, [SMS_NO_CONSENT_TAG]);
      }
      await addTags(creds, contact.id, [SMS_CONSENT_TAG]);
    } else if (lead.smsConsent === false && !had.has(SMS_CONSENT_TAG)) {
      await addTags(creds, contact.id, [SMS_NO_CONSENT_TAG]);
    }

    /* Re-trigger: "Contact Tag added" only fires when the tag is new to the
       contact, so remove any the contact already carries, then add. GHL
       stores tags lowercased — compare the same way. */
    if (form.retrigger) {
      const existing = new Set(contact.tags.map((t) => t.toLowerCase()));
      const present = tags.filter((t) => existing.has(t.toLowerCase()));
      if (present.length) await removeTags(creds, contact.id, present);
    }
    await addTags(creds, contact.id, tags);

    /* Last, and best-effort: the contact and its automations are already
       right, so a failed note shouldn't turn the submission into an error. */
    const note = Object.entries(NOTE_FIELDS)
      .filter(([name]) => lead.fields[name])
      .map(([name, label]) => `${label}: ${lead.fields[name]}`);
    const consent = consentRecord(lead, request.headers.get("referer"));
    if (consent) note.push("", consent);
    if (note.length) {
      await addNote(creds, contact.id, [source, ...note].join("\n")).catch(
        (error) => console.warn("[lead] note not saved", error?.body ?? error),
      );
    }

    return json({ success: true });
  } catch (error) {
    const detail = error instanceof GhlError ? error.body : String(error);
    console.error("[lead] GHL request failed", detail);
    if (DEMO) return demoSuccess("GHL request failed");
    return json({ error: "Could not save the submission" }, 502);
  }
}

/**
 * A prospect demo (src/config/demo.shared.mjs) answers every valid
 * submission with success, even when the lead could not be saved: the person
 * trying the form is judging the site, and an error would be the one thing
 * they remember. The warning is the only trace — so after deploying a demo,
 * send one test lead and confirm it arrived.
 */
function demoSuccess(reason: string): Response {
  console.warn(`[lead] demo: ${reason} — answered success anyway`);
  return json({ success: true });
}
