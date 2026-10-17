/**
 * Selects the active content backend: the Files backend (content
 * collections in src/content). Kept to ONE re-export on purpose. It is a
 * CMS seam: a CMS add-on's installer overwrites this file to point at its
 * own backend, and nothing else changes. Never import a backend from any
 * other file.
 */
export { default } from "./files";
