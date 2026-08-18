import type { APIRoute } from "astro";
import { SITE } from "@/config/site";
import { robotsDisallowPaths } from "@/config/seo.shared.mjs";

/**
 * robots.txt, generated from the same list the sitemap filter and the noindex
 * meta tag read.
 *
 * This replaced a static public/robots.txt whose own comment read "Keep in
 * sync with SITEMAP_EXCLUDE_PATHS / SITEMAP_EXCLUDE_PREFIXES in
 * astro.config.mjs" — an instruction to a human, which is exactly the kind of
 * duplicated fact that drifts. Now there is nothing to keep in sync.
 *
 * Prerendered: the content is build-time constant, so this costs no request.
 */
export const prerender = true;

export const GET: APIRoute = () => {
  const disallow = robotsDisallowPaths()
    .map((path) => `Disallow: ${path}`)
    .join("\n");

  const body = `# Generated from src/config/seo.shared.mjs — do not edit by hand.
# Add or remove routes there and the sitemap, this file, and the noindex
# meta tag all follow.
#
# Disallow stops crawling, not indexing of a URL discovered elsewhere, so the
# same routes also emit <meta name="robots" content="noindex"> (Head.astro)
# and, on SSR routes, an X-Robots-Tag header (middleware.ts).
User-agent: *
Allow: /
${disallow}

Sitemap: ${new URL("sitemap-index.xml", SITE.url).href}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
