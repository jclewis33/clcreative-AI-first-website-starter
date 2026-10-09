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
 *   options on the Client tools page (/tools), which Cloudflare Access gates.
 * - `retrigger: true` removes the tag first when the contact already has it,
 *   so the automation runs again (the GHL workflow needs "Allow re-entry").
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
  /** Written to the contact's `source` field in GHL. */
  source: string;
  /** Remove-then-add the tags on a repeat submission so the automation re-runs. */
  retrigger?: boolean;
  /**
   * Form field name → GHL custom-field id. GHL matches custom fields by id,
   * not name — read them from Settings → Custom Fields (or
   * `GET /locations/{id}/customFields`). Fields not mapped here are dropped.
   */
  customFields?: Record<string, string>;
}

export const FORMS = {
  contact: {
    label: "Contact form",
    access: "public",
    tags: ["website lead"],
    source: "Website: Contact form",
  },
  "review-request": {
    label: "Send a review request",
    access: "staff",
    tags: ["review request"],
    source: "Client tools: Review request",
    retrigger: true,
  },
  "yearly-follow-up": {
    label: "Start the yearly follow-up",
    access: "staff",
    tags: ["yearly follow-up"],
    source: "Client tools: Yearly follow-up",
    retrigger: true,
  },
} satisfies Record<string, FormConfig>;

export type FormId = keyof typeof FORMS;

/** Hidden bot-trap field. People never see it; a filled-in value = a bot. */
export const HONEYPOT_FIELD = "company_website";

/** Tag added when the visitor ticks the SMS consent box. */
export const SMS_CONSENT_TAG = "sms-consent";

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
