/**
 * Content-sync checks Astro does not make on its own, wrapped around a
 * collection's loader in src/content.config.ts.
 *
 * NODE-ONLY (it reads the filesystem): src/content.config.ts is its only
 * importer, enforced by `npm run check:boundary`.
 *
 * - Image paths. `image()` accepts any string at sync and only fails later,
 *   in the build, with an error that does not name the content file.
 * - References. Astro 7 logs a dangling `reference()` but lets sync and the
 *   build pass, so a typo'd author or CTA would ship a broken page. Targets
 *   are checked against the files on disk (an entry's id is its filename),
 *   so the check does not depend on collection load order.
 * - Inline CTAs. Every `<BlogCta id="…" />` in an MDX body (a literal,
 *   double-quoted id, outside fenced code; see inlineCtaIds) must name a
 *   file in src/content/ctas/blog/.
 *
 * Every problem is collected, then thrown as one error, one line each:
 *   src/content/projects/x.json → heroImage: image file not found: "./images/y.webp"
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Loader } from "astro/loaders";
import { inlineCtaIds } from "./files/mdx-text";

/** Where a referenced collection's entries live: `<dir>/<id>.<ext>`. */
export interface RefTarget {
  /** Repo-relative folder, e.g. "src/content/authors". */
  dir: string;
  ext: "json" | "mdx";
}

export interface CheckOptions {
  /**
   * Top-level reference fields to check (a single reference or an array of
   * them) → where their targets live.
   */
  refs?: Record<string, RefTarget>;
  /** Check `<BlogCta id="…" />` tags in an MDX body against this folder. */
  bodyCtas?: RefTarget;
}

/** A relative path to an image file — what an `image()` field holds at sync. */
const IMAGE_PATH = /^\.{1,2}\/\S*\.(?:avif|gif|jpe?g|png|svg|webp)$/i;
/** A relative Markdown image in an MDX body: ![alt](./images/x.webp) */
const BODY_IMAGE = /!\[[^\]]*\]\((\.{1,2}\/[^)\s]+)\)/g;

/** Wrap a loader so its entries are checked after every full load. */
export function checked(loader: Loader, options: CheckOptions = {}): Loader {
  return {
    ...loader,
    load: async (context) => {
      await loader.load(context);
      const root = fileURLToPath(context.config.root);
      const problems: string[] = [];
      for (const entry of context.store.values()) {
        const file = entry.filePath ?? `${context.collection}/${entry.id}`;
        const dir = path.dirname(path.resolve(root, entry.filePath ?? "."));
        walk(entry.data, "", (value, at) => {
          if (
            IMAGE_PATH.test(value) &&
            !fs.existsSync(path.resolve(dir, value))
          )
            problems.push(`${file} → ${at}: image file not found: "${value}"`);
        });
        for (const [, src] of (entry.body ?? "").matchAll(BODY_IMAGE)) {
          if (!fs.existsSync(path.resolve(dir, src)))
            problems.push(`${file} → body: image file not found: "${src}"`);
        }
        for (const [field, target] of Object.entries(options.refs ?? {})) {
          for (const id of refIds(entry.data[field])) {
            if (!targetExists(root, target, id))
              problems.push(
                `${file} → ${field}: no entry "${id}" (expected ${target.dir}/${id}.${target.ext})`,
              );
          }
        }
        if (options.bodyCtas) {
          for (const id of inlineCtaIds(entry.body ?? "")) {
            if (!targetExists(root, options.bodyCtas, id))
              problems.push(
                `${file} → body: <BlogCta id="${id}"> names no entry (expected ${options.bodyCtas.dir}/${id}.${options.bodyCtas.ext})`,
              );
          }
        }
      }
      if (problems.length) {
        throw new Error(
          `Content check failed in "${context.collection}":\n${problems
            .map((p) => `  - ${p}`)
            .join("\n")}`,
        );
      }
    },
  };
}

/** Visit every string in a value, with its path ("photos[1].src"). */
function walk(
  value: unknown,
  at: string,
  visit: (value: string, at: string) => void,
): void {
  if (typeof value === "string") visit(value, at);
  else if (Array.isArray(value))
    value.forEach((item, i) => walk(item, `${at}[${i}]`, visit));
  else if (value && typeof value === "object")
    for (const [key, item] of Object.entries(value))
      walk(item, at ? `${at}.${key}` : key, visit);
}

/** The ids a reference field holds: a string, or Astro's `{ id, collection }`. */
function refIds(value: unknown): string[] {
  const one = (item: unknown): string | null =>
    typeof item === "string"
      ? item
      : item && typeof item === "object" && "id" in item
        ? String((item as { id: unknown }).id)
        : null;
  return (Array.isArray(value) ? value : [value])
    .map(one)
    .filter((id): id is string => Boolean(id));
}

function targetExists(root: string, target: RefTarget, id: string): boolean {
  return fs.existsSync(path.resolve(root, target.dir, `${id}.${target.ext}`));
}
