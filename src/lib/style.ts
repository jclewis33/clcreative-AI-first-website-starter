import type { HTMLAttributes } from "astro/types";

type Style = HTMLAttributes<"div">["style"] | false | 0 | null;

/* One style value as a list of "property: value" declarations. Strings pass
   through (trailing semicolons trimmed); objects are written out, camelCase
   keys become kebab-case and custom properties keep their name. */
const declarations = (style: Style): string[] => {
  if (!style) return [];
  if (typeof style === "string") {
    const trimmed = style.trim().replace(/;+$/, "");
    return trimmed ? [trimmed] : [];
  }
  return Object.entries(style)
    .filter(([, value]) => value != null && value !== false && value !== "")
    .map(([property, value]) => {
      const name = property.startsWith("--")
        ? property
        : property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      return `${name}: ${value}`;
    });
};

/**
 * Joins a component's own inline style with the caller's `style` so neither
 * replaces the other; later arguments win. Accepts strings, style objects and
 * empty values. Returns undefined when nothing is left, so no empty
 * `style=""` is rendered.
 */
export function mergeStyle(...styles: Style[]): string | undefined {
  return styles.flatMap(declarations).join("; ") || undefined;
}
