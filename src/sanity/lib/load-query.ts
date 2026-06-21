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

export async function loadQuery<QueryResponse>({
  query,
  params,
  perspectiveCookie = undefined,
}: {
  query: string;
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

  const { result, resultSourceMap } = await sanityClient.fetch<QueryResponse>(
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
