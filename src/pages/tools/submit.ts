import type { APIRoute } from "astro";
import { verifyAccess } from "@/lib/cf-access";
import { handleLead } from "@/lib/leads";

/**
 * Staff endpoint for the Client tools page. It lives under /tools so the one
 * Cloudflare Access application on that path gates the page AND this route.
 * The JWT check is defence in depth: with Access missing or misconfigured the
 * route fails closed (401/403/503) rather than writing to the CRM.
 */
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const access = await verifyAccess(request);
  if (!access.ok) {
    return new Response(JSON.stringify({ error: access.reason }), {
      status: access.status,
      headers: { "Content-Type": "application/json" },
    });
  }
  return handleLead(request, "staff");
};
