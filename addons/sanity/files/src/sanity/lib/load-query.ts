import type { ClientPerspective, QueryParams } from "@sanity/client";
import { sanityClient } from "sanity:client";
import { getSecret } from "astro:env/server";
import { sanitizePerspective } from "./preview-session";

/* Parity fixtures (dev-only): `PARITY_FIXTURES=1|preview|sample npm run
   build` answers every query from ./fixtures instead of the network, so a
   refactor can be diffed against a populated site with no Sanity project
   (see scripts/compare-dist.mjs; the modes are listed on fixtureFetch).
   `__PARITY_FIXTURES__` is a build-time constant (`vite.define` in
   astro.config.mjs, from process.env.PARITY_FIXTURES):
   in a normal build it is the empty string, so the fixture import below is
   dead code and the fixtures never reach the server bundle. Nothing reads
   the flag at runtime, so a stray Worker variable cannot switch it on.
   The constant is read inline (not via a local) so the condition is a
   literal the bundler folds. */

/**
 * Fetch a GROQ query, honouring the Presentation draft perspective.
 *
 * The result type comes from the query itself: `defineQuery()` in queries.ts
 * preserves each query's literal string type, and TypeGen maps those literals
 * onto result types. So `loadQuery({ query: BLOG_POST_QUERY })` is typed with
 * no generic at the call site, and a query cannot be paired with the wrong
 * shape. Run `npm run typegen` after editing a query.
 *
 * A string TypeGen has not seen — one assembled at runtime — still works and
 * falls back to `any`.
 */
export async function loadQuery<const Q extends string>({
  query,
  params,
  preview = undefined,
}: {
  query: Q;
  params?: QueryParams;
  /** The draft perspective (ContentOptions.preview) from getDraftModeProps(), set only when the signed preview session verifies. */
  preview?: string | undefined;
}) {
  /* Draft mode needs a perspective that passes the allowlist. Anything
     else (a value that did not come through getDraftModeProps) drops to
     the published, token-free fetch rather than a guessed perspective. */
  const draftPerspective = sanitizePerspective(preview);
  const draftMode = draftPerspective !== undefined;
  /* Read per request, not at build: `import.meta.env` is replaced at build
     time, and the Worker secret only exists at runtime. getSecret() reads
     the Cloudflare binding on the Worker and .env / process.env locally. */
  const token = draftMode ? getSecret("SANITY_API_READ_TOKEN") : undefined;
  if (draftMode && !token) {
    throw new Error(
      "The `SANITY_API_READ_TOKEN` environment variable is required during Visual Editing.",
    );
  }

  const perspective: ClientPerspective = draftPerspective ?? "published";

  const run = () =>
    sanityClient.fetch(query, params ?? {}, {
      filterResponse: false,
      perspective,
      resultSourceMap: draftMode ? "withKeyArraySelector" : false,
      stega: draftMode,
      ...(draftMode ? { token } : {}),
    });
  type Fetched = Awaited<ReturnType<typeof run>>;
  const { result, resultSourceMap } = __PARITY_FIXTURES__
    ? ((await (
        await import("./fixtures")
      ).fixtureFetch(query, params, __PARITY_FIXTURES__)) as unknown as Fetched)
    : await run();

  return {
    data: result,
    sourceMap: resultSourceMap,
    perspective,
  };
}
