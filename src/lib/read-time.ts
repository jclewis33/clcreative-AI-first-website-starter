/**
 * Estimate read time in minutes from a body's plain text, at 225 words per
 * minute (average adult reading pace), rounded up, minimum 1.
 *
 * Each content source extracts the text from its own format and cleans any
 * editor encoding first (the Sanity source joins Portable Text spans with
 * portableTextWords()), so this stays format-agnostic.
 */
export function estimateReadTime(text: string, wordsPerMinute = 225): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return Math.max(1, Math.ceil(words.length / wordsPerMinute));
}
