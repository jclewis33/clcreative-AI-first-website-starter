import { getCollection, type CollectionEntry } from "astro:content";

/**
 * Site-wide copy over content collections: the `faqs` collection
 * (src/content/faqs/*.json) and the `process` steps in
 * src/content/settings.json — see src/content.config.ts. They sit together
 * because the same pages read both.
 */

/** One question and its answer. Answers take inline HTML. */
export interface FAQItem {
  question: string;
  answer: string;
}

export type Process = NonNullable<
  CollectionEntry<"settings">["data"]["process"]
>;

/** Every site-wide FAQ, by `order`, then question so ties never shuffle. */
export async function getFaqs(): Promise<FAQItem[]> {
  const all = await getCollection("faqs");
  return all
    .sort(
      (a, b) =>
        a.data.order - b.data.order ||
        a.data.question.localeCompare(b.data.question),
    )
    .map(({ data: { question, answer } }) => ({ question, answer }));
}

/** The site-wide "how it works" steps, or null when settings.json has none. */
export async function getProcess(): Promise<Process | null> {
  const settings = await getCollection("settings");
  return settings.find((entry) => entry.id === "site")?.data.process ?? null;
}
