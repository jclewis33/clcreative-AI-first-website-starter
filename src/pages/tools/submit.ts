import type { APIRoute } from "astro";
import { handleLead } from "@/lib/leads";
import { checkToolsAuth } from "@/lib/tools-auth";

/**
 * Staff endpoint for the Client tools page. It lives under /tools so the
 * same gate covers the page AND this route: src/middleware.ts runs
 * checkToolsAuth (src/lib/tools-auth.ts) — Cloudflare Access token check,
 * or the shared-password session — and so does this handler, so a path the
 * middleware didn't recognise (an encoded or oddly-cased URL) still can't
 * write to the CRM. Fails closed (401/403/503).
 */
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const denied = await checkToolsAuth(request);
  if (denied) return denied;
  return handleLead(request, "staff");
};
