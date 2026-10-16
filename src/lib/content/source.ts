/**
 * Selects the active content backend: the Files backend (content
 * collections in src/content). Kept to ONE re-export on purpose: the Sanity
 * add-on swaps the target here and nowhere else. Test builds can pick
 * either backend with CONTENT_SOURCE=files|sanity (astro.config.mjs;
 * removed in PR 4). Never import a backend from any other file.
 */
export { default } from "./files";
