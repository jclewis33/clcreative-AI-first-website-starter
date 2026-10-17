/**
 * The Files backend's view of src/content: every collection, loaded per call
 * and indexed by id. Astro validated every file at content sync (the schemas
 * in src/content.config.ts, plus the image and reference checks in
 * ../checks.ts), so lookups can assume complete, linked content; a missing
 * entry still throws a named error rather than rendering half a page.
 *
 * Not memoized on purpose: getCollection() is already cached by Astro, and
 * a module-level cache would keep serving stale content in `astro dev`.
 */
import {
  getCollection,
  type CollectionEntry,
  type CollectionKey,
} from "astro:content";

export type Entry<C extends CollectionKey> = CollectionEntry<C>;

/** Every collection the content functions read, indexed by id. */
export interface Content {
  blog: Map<string, Entry<"blog">>;
  authors: Map<string, Entry<"authors">>;
  blogCtas: Map<string, Entry<"blogCtas">>;
  ctaSections: Map<string, Entry<"ctaSections">>;
  caseStudies: Map<string, Entry<"caseStudies">>;
  projects: Map<string, Entry<"projects">>;
  gallery: Entry<"gallery">[];
  testimonials: Entry<"testimonials">[];
  /** settings.json's "site" entry, if there is one. */
  settings: Entry<"settings">["data"] | undefined;
}

const byId = <T extends { id: string }>(entries: T[]) =>
  new Map(entries.map((entry) => [entry.id, entry]));

export async function loadContent(): Promise<Content> {
  const [
    blog,
    authors,
    blogCtas,
    ctaSections,
    settings,
    caseStudies,
    projects,
    gallery,
    testimonials,
  ] = await Promise.all([
    getCollection("blog"),
    getCollection("authors"),
    getCollection("blogCtas"),
    getCollection("ctaSections"),
    getCollection("settings"),
    getCollection("caseStudies"),
    getCollection("projects"),
    getCollection("gallery"),
    getCollection("testimonials"),
  ]);
  return {
    blog: byId(blog),
    authors: byId(authors),
    blogCtas: byId(blogCtas),
    ctaSections: byId(ctaSections),
    caseStudies: byId(caseStudies),
    projects: byId(projects),
    gallery,
    testimonials,
    settings: settings.find((entry) => entry.id === "site")?.data,
  };
}

/** An entry by id, or a named error. The sync checks make the error
    unreachable for references and for inline CTAs written as a literal
    `id="…"`; any other id form is first checked here, at render. */
export function need<C extends CollectionKey>(
  entries: Map<string, Entry<C>>,
  collection: C,
  id: string,
): Entry<C> {
  const entry = entries.get(id);
  if (!entry)
    throw new Error(
      `[content] No "${collection}" entry "${id}". Ids are filenames without the extension.`,
    );
  return entry;
}
