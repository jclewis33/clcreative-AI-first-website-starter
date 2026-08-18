import type { ClientPerspective, QueryParams } from "@sanity/client";
import { sanityClient } from "sanity:client";

const token = import.meta.env.SANITY_API_READ_TOKEN;

function parsePerspective(
  raw: string | undefined,
): ClientPerspective | undefined {
  if (!raw) return undefined;
  const decoded = decodeURIComponent(raw);
  if (decoded.startsWith("[")) {
    try {
      return JSON.parse(decoded) as ClientPerspective;
    } catch {
      return undefined;
    }
  }
  return decoded as ClientPerspective;
}

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
  perspectiveCookie = undefined,
}: {
  query: Q;
  params?: QueryParams;
  perspectiveCookie?: string | undefined;
}) {
  const draftMode = perspectiveCookie ? true : false;
  if (draftMode && !token) {
    throw new Error(
      "The `SANITY_API_READ_TOKEN` environment variable is required during Visual Editing.",
    );
  }

  const perspective: ClientPerspective = draftMode
    ? (parsePerspective(perspectiveCookie) ?? "drafts")
    : "published";

  const { result, resultSourceMap } = await sanityClient.fetch(
    query,
    params ?? {},
    {
      filterResponse: false,
      perspective,
      resultSourceMap: draftMode ? "withKeyArraySelector" : false,
      stega: draftMode,
      ...(draftMode ? { token } : {}),
    },
  );

  return {
    data: result,
    sourceMap: resultSourceMap,
    perspective,
  };
}
