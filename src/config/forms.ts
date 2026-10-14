/**
 * Form registry — which GoHighLevel tags each form on the site applies.
 *
 * THE ONE PLACE TO EDIT PER CLIENT. Every form posts only its `formId`; the
 * server looks the id up here and applies this entry's tags and source. The
 * browser never sends tags, so a crafted request can't tag a contact with
 * anything that isn't listed below.
 *
 * Automations in GHL start on the "Contact Tag added" trigger, so a tag here
 * must match the workflow's trigger tag exactly (GHL lowercases tags).
 *
 * - `access: "public"` forms post to /api/lead (any visitor).
 * - `access: "staff"` forms post to /tools/submit and appear automatically as
 *   options on the Client tools page (/tools), gated by src/lib/tools-auth.ts
 *   (Cloudflare Access or a shared password).
 * - `retrigger: true` removes the tag first when the contact already has it,
 *   so the automation runs again (the GHL workflow needs "Allow re-entry").
 * - `ratingTag` adds a star-count tag ("review feedback 2-star") from the
 *   form's 1–5 `rating` field — one workflow per rating if you want them.
 * - `referral` lets a public form be sent on someone else's behalf
 *   (`for: "friend"` + `referrer`): the friend is the contact, gets these
 *   extra tags and its own `source`, and is recorded as NOT giving SMS
 *   consent (nobody can consent for a friend).
 *
 * MATCHES THE GHL SNAPSHOT. Tag names, sources, contact types and custom
 * field keys mirror the Way Construction build the CL Creative GHL snapshot
 * is made from — change them only together with the snapshot.
 *
 * Adding a form or a new automation = adding one entry. Full setup:
 * docs/ghl-forms.md.
 */

/** Who may submit a form, and therefore which endpoint accepts it. */
export type FormAccess = "public" | "staff";

export interface FormConfig {
  /** Human label — the option text on the Client tools page. */
  label: string;
  /** Which endpoint accepts this form. */
  access: FormAccess;
  /** Tags added to the contact. These start the GHL automations. */
  tags: string[];
  /** Written to the contact's `source` field in GHL on every submission. */
  source: string;
  /**
   * GHL contact type. `customer` for people who've already hired the client
   * (review feedback, discount claims, staff tools). Omit for leads — GHL
   * makes new contacts leads and leaves an existing contact's type alone.
   */
  contactType?: "customer";
  /** Remove-then-add the tags on a repeat submission so the automation re-runs. */
  retrigger?: boolean;
  /**
   * Tag prefix for a star-rating form: adds "<prefix> <n>-star" from the
   * required `rating` field (1–5). Leave off for every other form.
   */
  ratingTag?: string;
  /**
   * Referral mode: when sent for a friend, these extra tags and this source
   * replace the form's; the friend keeps GHL's default type (a lead).
   */
  referral?: { tags: string[]; source: string };
  /**
   * Form field name → GHL custom-field KEY (Settings → Custom Fields →
   * the field's key, without the `contact.` prefix — e.g. `your_message`).
   * The snapshot's keys: `your_message`, `your_feedback`, `review_rating`,
   * `referred_by`. A mapped field is written only when it has a value,
   * except a referral form's `referrer`, which is cleared on a self claim.
   */
  customFields?: Record<string, string>;
}

export const FORMS = {
  contact: {
    label: "Contact form",
    access: "public",
    tags: ["website lead"],
    source: "Website: request a call back",
    customFields: { message: "your_message" },
  },
  "review-feedback": {
    label: "Review feedback",
    access: "public",
    tags: [],
    ratingTag: "review feedback",
    source: "Website: review feedback",
    contactType: "customer",
    retrigger: true,
    customFields: { rating: "review_rating", message: "your_feedback" },
  },
  "discount-claim": {
    label: "Discount claim",
    access: "public",
    tags: ["discount claimed"],
    referral: { tags: ["referral"], source: "Website: referral discount" },
    source: "Website: discount claim",
    contactType: "customer",
    retrigger: true,
    customFields: { message: "your_message", referrer: "referred_by" },
  },
  "review-request": {
    label: "Ask for a review",
    access: "staff",
    tags: ["review request"],
    source: "Team tool: review request",
    contactType: "customer",
    retrigger: true,
  },
  "review-request-1-year": {
    label: "Ask for a review and add to the 1-year follow-up",
    access: "staff",
    tags: ["review request + 1-year followup"],
    source: "Team tool: review request",
    contactType: "customer",
    retrigger: true,
  },
} satisfies Record<string, FormConfig>;

export type FormId = keyof typeof FORMS;

/** Hidden bot-trap field. People never see it; a filled-in value = a bot. */
export const HONEYPOT_FIELD = "company_website";

/**
 * SMS consent tags (names from the GHL snapshot). Ticked → `sms consent`
 * (and `sms did not consent` comes off). Unticked → `sms did not consent`,
 * unless the contact already has `sms consent`: leaving the box empty later
 * isn't opting out — texting STOP is.
 */
export const SMS_CONSENT_TAG = "sms consent";
export const SMS_NO_CONSENT_TAG = "sms did not consent";

/** Look a form up by an untrusted id from a request body. */
export function getForm(id: unknown): FormConfig | undefined {
  return typeof id === "string" && Object.hasOwn(FORMS, id)
    ? (FORMS as Record<string, FormConfig>)[id]
    : undefined;
}

/** The staff forms, in registry order — the Client tools page's options. */
export const STAFF_FORMS = (
  Object.entries(FORMS) as [FormId, FormConfig][]
).filter(([, form]) => form.access === "staff");
