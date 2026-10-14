import { SITE } from "./site";

/**
 * SMS (A2P 10DLC) consent — the one copy of the wording, read by the
 * checkbox (src/components/form/SmsConsent.astro) and by the lead pipeline
 * (src/lib/leads.ts), which saves the exact text a person agreed to in a
 * note on their GoHighLevel contact.
 *
 * Matches GoHighLevel's own chat-widget disclosure, except that it opens
 * "By checking this box" rather than "By submitting": consent is an
 * optional, unticked box, so the form sends without it. Change the wording
 * here only, and keep it in step with the opt-in description on the
 * client's A2P campaign.
 */

/** The checkbox label: everything up to the links. */
export const SMS_CONSENT_LABEL = `By checking this box, you authorize ${SITE.legalName} to text/call the number above for promotional messages, possibly using automated means. Msg/data rates apply, msg frequency varies. Consent is not a condition of purchase.`;

/** The line under the checkbox; "terms" and "privacy policy" render as links. */
export const SMS_CONSENT_FOOTER =
  "See terms and privacy policy. Text HELP for help and STOP to unsubscribe.";

/** Where the footer's two links point. */
export const SMS_CONSENT_LINKS = {
  terms: "/terms-and-conditions",
  privacy: "/privacy-policy",
};

/**
 * Phrase swaps applied to every rendered page while `SITE.smsOptIn` is
 * false — for copy that promises a call or text back ("Request a call
 * back") on a site whose forms can't collect a phone yet. The source copy
 * stays as written; flipping `smsOptIn` to true restores it everywhere at
 * once. Applied by src/middleware.ts at build time (no runtime cost).
 *
 * Exact, case-sensitive matches; most specific phrases first. Empty = off.
 *
 * @example
 * [
 *   ["Request a call back", "Send us a message"],
 *   ["call you back", "get back to you"],
 * ]
 */
export const SMS_OFF_COPY_SWAPS: [from: string, to: string][] = [];
