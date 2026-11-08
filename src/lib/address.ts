import { SITE } from "@/config/site";

/**
 * The business's published street address as one line
 * ("440 Whitney St, Cedar Hill, TX 75104"), or "" when `SITE.address.street`
 * is blank — a home-based business shows no street line anywhere.
 */
export function streetAddress(): string {
  const { street, locality, region, postalCode } = SITE.address;
  if (!street) return "";
  return `${street}, ${locality}, ${[region, postalCode].filter(Boolean).join(" ")}`;
}

/** A Google Maps search link for `streetAddress()`, or "" without one. */
export function streetAddressMapUrl(): string {
  const line = streetAddress();
  return line
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${SITE.name}, ${line}`)}`
    : "";
}
