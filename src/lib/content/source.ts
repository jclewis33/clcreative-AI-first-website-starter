/**
 * Selects the active content backend. Kept to ONE re-export on purpose: a
 * different backend (files, or the Sanity add-on) swaps the target here and
 * nowhere else. Never import a backend from any other file.
 */
export { default } from "@/sanity/lib/source";
