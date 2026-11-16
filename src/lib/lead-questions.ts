import type { ImageMetadata } from "astro";

/**
 * The one-tap questions a stepped LeadForm (`fields="steps"`) can ask before
 * the contact fields — a qualifying form: who's asking, what the job is, how
 * big, how soon, what they've set aside. Each answer is saved under its
 * `name`, which must be a field `/api/lead` keeps (NOTE_FIELDS in
 * src/lib/leads.ts), so it lands in the note on the contact.
 *
 * Plain data, so SITE.quote (src/config/site.ts), the home data and the
 * preset can all describe a form without importing a component.
 */
export type LeadQuestionField =
  "audience" | "projectType" | "projectSize" | "timeline" | "budget";

export type LeadQuestionOption = {
  /** What the visitor sees, and what is saved. */
  label: string;
  /** A stable value. */
  value: string;
  /** One short line under the tile's label. */
  description?: string;
  /** A photo on top of the tile (an import or a URL). */
  image?: ImageMetadata | string;
  /** Alt text for `image`. @default the label */
  imageAlt?: string;
};

export interface LeadQuestion {
  /** The field the answer is saved as. */
  name: LeadQuestionField;
  /** The step's heading ("First, who are we talking to?"). */
  question: string;
  /** One line under the question ("A range is enough."). */
  text?: string;
  /** The tiles; picking one moves to the next step. */
  options: LeadQuestionOption[];
}
