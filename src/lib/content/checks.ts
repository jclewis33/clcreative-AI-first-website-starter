/**
 * Content-sync checks Astro does not make on its own, wrapped around a
 * collection's loader in src/content.config.ts.
 *
 * NODE-ONLY (it reads the filesystem): src/content.config.ts is its only
 * importer, enforced by `npm run check:boundary`.
 *
 * - Image paths. `image()` accepts any string at sync and only fails later,
 *   in the build, with an error that does not name the content file. Data
 *   fields are the ones Astro records as image imports; MDX body images
 *   (`![alt](src "title")`, see mdxImages) must exist and have alt text.
 * - References. Astro 7 logs a dangling `reference()` but lets sync and the
 *   build pass, so a typo'd author or CTA would ship a broken page. Targets
 *   are checked against the files on disk (an entry's id is its filename),
 *   so the check does not depend on collection load order.
 * - Inline components. Every `<BlogCta id="…" />` in an MDX body must name a
 *   file in src/content/ctas/blog/, and every `<VideoEmbed url="…">` must be
 *   a supported YouTube or Vimeo link (src/lib/video.ts, the rule the
 *   component renders with). Only literal, double-quoted values outside
 *   code (fenced blocks and inline spans) are seen (inlineCtaIds, videoEmbedUrls).
 * - Required entries (`required`): a single-file collection must hold these
 *   keys, so a typo in settings.json's "site" cannot silently drop defaults.
 *
 * Every problem is collected, then thrown as one error, one line each:
 *   src/content/projects/x.json → heroImage: image file not found: "./images/y.webp"
 *
 * In `npm run dev`, Astro's own loaders re-sync an entry on save without
 * calling load() again, which would skip these checks. checked() wraps the
 * loader's file watcher, so the same checks re-run after every change under
 * src/content/ and log (never throw, so the dev server keeps running) when
 * the problem list changes — then once more when it is clean again.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Loader, LoaderContext } from "astro/loaders";
import { videoEmbedUrl } from "../video";
import { inlineCtaIds, mdxImages, videoEmbedUrls } from "./files/mdx-text";

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
  /** Entry ids a single-file collection must contain, and that file. */
  required?: { file: string; ids: string[] };
}

/** A relative path to an image file (the fallback when Astro lists none). */
const IMAGE_PATH = /^\.{1,2}\/\S*\.(?:avif|gif|jpe?g|png|svg|webp)$/i;
/** A URL or a site-root path: not a file beside the entry. */
const NOT_LOCAL = /^(?:[a-z][a-z0-9+.-]*:|\/)/i;

/** Wrap a loader so its entries are checked after every load and change. */
export function checked(loader: Loader, options: CheckOptions = {}): Loader {
  return {
    ...loader,
    load: async (context) => {
      const recheck = devRechecks(context, options);
      await loader.load({
        ...context,
        watcher: context.watcher && afterEach(context.watcher, recheck.after),
      });
      const problems = findProblems(context, options);
      recheck.reported(problems);
      if (problems.length) throw new Error(report(context, problems));
    },
  };
}

type Watcher = NonNullable<LoaderContext["watcher"]>;
type Listener = (...args: unknown[]) => unknown;

/**
 * The watcher a loader sees: every handler it registers runs as before,
 * then `after(path)` — so a check runs once the entry has re-synced. `on`
 * still goes through Astro's watcher, which removes the handlers on a full
 * re-sync.
 */
function afterEach(watcher: Watcher, after: (file: unknown) => void): Watcher {
  const wrapped = new Map<Listener, Listener>();
  return new Proxy(watcher, {
    get(target, prop, receiver) {
      if (prop === "on" || prop === "off") {
        return (event: string, listener: Listener) => {
          if (prop === "on" && !wrapped.has(listener))
            wrapped.set(listener, async (...args: unknown[]) => {
              await listener(...args);
              after(args[0]);
            });
          (target[prop] as (e: string, l: Listener) => unknown)(
            event,
            wrapped.get(listener) ?? listener,
          );
          return receiver;
        };
      }
      const value = Reflect.get(target, prop);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

/**
 * Dev-server re-checks: after a watched change under src/content/ (this
 * collection's own re-sync, or another file a reference may point at), run
 * the checks again and log the result when it differs from the last one.
 */
function devRechecks(context: LoaderContext, options: CheckOptions) {
  const contentDir =
    path.join(fileURLToPath(context.config.root), "src", "content") + path.sep;
  const inContent = (file: unknown) =>
    typeof file === "string" && file.startsWith(contentDir);
  let last = "";
  let timer: ReturnType<typeof setTimeout> | undefined;

  const run = () => {
    try {
      const problems = findProblems(context, options);
      const key = problems.join("\n");
      if (key === last) return;
      if (problems.length) context.logger.error(report(context, problems));
      else
        context.logger.info(`Content check passed in "${context.collection}"`);
      last = key;
    } catch (error) {
      context.logger.error(
        `Content check could not run in "${context.collection}": ${(error as Error).message}`,
      );
    }
  };
  const after = (file: unknown) => {
    if (!inContent(file)) return;
    clearTimeout(timer);
    timer = setTimeout(run, 50);
  };

  // A deleted or added target (an author, a CTA, a photo) changes this
  // collection's result without touching its own files.
  context.watcher?.on("all", (_event: string, file: string) => after(file));

  return {
    after,
    reported: (problems: string[]) => (last = problems.join("\n")),
  };
}

function report(context: LoaderContext, problems: string[]): string {
  return `Content check failed in "${context.collection}":\n${problems
    .map((p) => `  - ${p}`)
    .join("\n")}`;
}

/** Every problem in the collection's current entries, one line each. */
function findProblems(context: LoaderContext, options: CheckOptions): string[] {
  const root = fileURLToPath(context.config.root);
  const problems: string[] = [];
  for (const entry of context.store.values()) {
    const file = entry.filePath ?? `${context.collection}/${entry.id}`;
    const dir = path.dirname(path.resolve(root, entry.filePath ?? "."));
    for (const [at, value] of imageFields(entry)) {
      if (!NOT_LOCAL.test(value) && !fs.existsSync(path.resolve(dir, value)))
        problems.push(`${file} → ${at}: image file not found: "${value}"`);
    }
    for (const { alt, src: raw } of mdxImages(entry.body ?? "")) {
      const src = decode(raw);
      if (!alt.trim())
        problems.push(`${file} → body: image "${src}" has no alt text`);
      if (!NOT_LOCAL.test(src) && !fs.existsSync(path.resolve(dir, src)))
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
    for (const url of videoEmbedUrls(entry.body ?? "")) {
      if (!videoEmbedUrl(url))
        problems.push(
          `${file} → body: <VideoEmbed url="${url}"> is not a supported YouTube or Vimeo link`,
        );
    }
  }
  for (const id of options.required?.ids ?? []) {
    if (!context.store.has(id))
      problems.push(
        `${options.required!.file} → ${id}: missing — the file must have a top-level "${id}" key`,
      );
  }
  return problems;
}

/**
 * An entry's image fields as [path, value]: the fields Astro recorded as
 * image imports (`imageImports`, e.g. ["photos", 1, "src"]), plus any
 * other string shaped like a relative image path.
 */
function imageFields(entry: {
  data: Record<string, unknown>;
  imageImports?: (string | number)[][];
}): Map<string, string> {
  const fields = new Map<string, string>();
  for (const segments of entry.imageImports ?? []) {
    const value = segments.reduce<unknown>(
      (node, key) =>
        node && typeof node === "object"
          ? (node as Record<string | number, unknown>)[key]
          : undefined,
      entry.data,
    );
    if (typeof value === "string") fields.set(fieldPath(segments), value);
  }
  walk(entry.data, "", (value, at) => {
    if (IMAGE_PATH.test(value) && !fields.has(at)) fields.set(at, value);
  });
  return fields;
}

/** A Markdown image URL as Astro reads it (percent-escapes decoded). */
function decode(src: string): string {
  try {
    return decodeURI(src);
  } catch {
    return src;
  }
}

/** ["photos", 1, "src"] → "photos[1].src" */
function fieldPath(segments: (string | number)[]): string {
  return segments
    .map((s, i) =>
      typeof s === "number" || /^\d+$/.test(s) ? `[${s}]` : i ? `.${s}` : s,
    )
    .join("");
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
