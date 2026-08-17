/**
 * Hrefs for REAL links rendered inside published content (the `internalLink`
 * mark in portable text). These are always **public** URLs — never the
 * `/preview/*` twins, which exist only for the Studio's Presentation iframe.
 *
 * ⚠️ Keep this module free of any `sanity/...` Studio imports. It runs in the
 * site bundle (portable text renders on every content page), and pulling in
 * Studio-only modules such as `sanity/presentation` drags the whole Studio
 * dependency tree into the site build — including packages that import CSS,
 * which the prerender step cannot load ("Unknown file extension .css").
 * The Presentation location map lives separately in ./resolve.ts.
 */
/* What this resolver READS from a dereferenced internal-link target. Every
   field is nullable because the query projects them straight from documents
   that an editor may not have completed. */
export type InternalLinkTarget =
  | {
      _type?: string | null;
      slug?: string | null;
      title?: string | null;
      description?: string | null;
      image?: any;
    }
  | null
  | undefined;

export function resolveInternalLinkHref(
  target: InternalLinkTarget,
): string | null {
  if (!target?.slug || !target._type) return null;
  switch (target._type) {
    case "blogPost":
      return `/blog/${target.slug}`;
    case "caseStudy":
      return `/case-studies/${target.slug}`;
    case "glossaryTerm":
      return `/glossary/${target.slug}`;
    default:
      return null;
  }
}
