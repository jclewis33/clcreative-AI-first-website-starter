const counters = new Map<string, number>();

/**
 * A deterministic per-prefix id: `accordion-1`, `accordion-2`, …
 *
 * A counter rather than randomness so the same source produces the same
 * HTML on every build — random ids would make every build differ, which
 * breaks build-output diffing and pollutes caches.
 */
export function uid(prefix: string): string {
  const next = (counters.get(prefix) ?? 0) + 1;
  counters.set(prefix, next);
  return `${prefix}-${next}`;
}
