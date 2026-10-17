/**
 * Registers the Sanity body format with the content interface: a post
 * body can be `{ kind: "portable-text", blocks }` (Portable Text, each h2
 * carrying `_slug`), which this add-on's BlogBody renders. Type-only:
 * nothing imports this file; TypeScript picks it up from the project.
 */
export {};

declare module "@/lib/content/types" {
  interface BlogBodyFormats {
    "portable-text": { blocks: Array<{ _type: string; _key?: string }> };
  }
}
