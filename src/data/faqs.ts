/**
 * FAQ data — centralized question/answer sets.
 *
 * Import named arrays and combine them as needed:
 * ```ts
 * import { generalFaqs } from "../data/faqs";
 * <FAQ items={generalFaqs} />
 * ```
 *
 * ## Formatting answers
 *
 * Answer strings are rendered with `set:html`, so inline HTML is supported:
 *
 * - `<br><br>`              — paragraph break
 * - `<strong>text</strong>` — bold text
 * - `•`                     — bullet character (combine with `<br>` for lists)
 * - `<a href="/">link</a>`  — inline links
 * - `<em>`, `<span>`, etc.  — any other inline HTML
 *
 * Example:
 * ```ts
 * {
 *   question: "What's the difference?",
 *   answer: "<strong>Option A</strong> does X.<br><br><strong>Option B</strong> does Y.<br><br>• Point one<br>• Point two",
 * }
 * ```
 *
 * Add new per-page sets as additional exports following the same shape.
 */

export interface FAQItem {
  question: string;
  answer: string;
}

/* ── General / shared FAQs (placeholder content) ───────────────────────── */

export const generalFaqs: FAQItem[] = [
  {
    question: "Lorem ipsum dolor sit amet consectetur?",
    answer:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  },
  {
    question: "Sed do eiusmod tempor incididunt ut labore?",
    answer:
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  },
  {
    question: "Ut enim ad minim veniam quis nostrud?",
    answer:
      "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.",
  },
  {
    question: "Quis autem vel eum iure reprehenderit?",
    answer:
      "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est qui dolorem ipsum.",
  },
  {
    question: "Excepteur sint occaecat cupidatat non proident?",
    answer:
      "At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.",
  },
];
