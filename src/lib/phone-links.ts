/**
 * Every phone number on the site is a tap-to-call link. These helpers turn
 * numbers written in plain copy (an FAQ answer, the utility bar) into
 * `tel:` links, so content authors can just type "(817) 832-4968".
 */

/** US phone numbers: (817) 832-4968, 817-832-4968, 817.832.4968, 8178324968. */
export const PHONE_RE = /\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;

/** The `tel:` href for a written US number. */
export function telHref(written: string): string {
  return `tel:+1${written.replace(/\D/g, "").slice(-10)}`;
}

/**
 * Wrap each phone number in an HTML string in a `tel:` link, leaving any
 * existing `<a>…</a>` and the inside of tags alone.
 */
export function linkPhones(html: string): string {
  return html
    .split(/(<a\b[\s\S]*?<\/a>|<[^>]+>)/i)
    .map((chunk) =>
      chunk.startsWith("<")
        ? chunk
        : chunk.replace(PHONE_RE, (n) => `<a href="${telHref(n)}">${n}</a>`),
    )
    .join("");
}
