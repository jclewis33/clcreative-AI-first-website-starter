/**
 * Selects the active content backend: the Sanity add-on's source
 * (src/sanity/lib/source.ts). Kept to ONE re-export on purpose. It is a
 * CMS seam the add-on installer overwrote; the Files version re-exports
 * ./files. Never import a backend from any other file.
 */
export { default } from "@/sanity/lib/source";
