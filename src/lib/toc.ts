export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface TocItem {
  slug: string;
  text: string;
}

export function buildToc(body: any[]): { body: any[]; items: TocItem[] } {
  const used = new Set<string>();
  const items: TocItem[] = [];
  const out = body.map((block) => {
    if (block?._type !== "block" || block.style !== "h2") return block;
    const text = (block.children ?? [])
      .map((c: any) => c.text ?? "")
      .join("");
    let slug = slugifyHeading(text);
    if (!slug || used.has(slug)) slug = `section-${block._key}`;
    used.add(slug);
    items.push({ slug, text });
    return { ...block, _slug: slug };
  });
  return { body: out, items };
}
