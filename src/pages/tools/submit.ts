import type { APIRoute } from "astro";
import { handleLead } from "@/lib/leads";

/**
 * Staff endpoint for the Client tools page. It lives under /tools so the
 * same gate covers the page AND this route: src/middleware.ts runs
 * checkToolsAuth (src/lib/tools-auth.ts) before this handler — Cloudflare
 * Access token check, or the shared-password session — and fails closed
 * (401/403/503) rather than letting a write reach the CRM.
 */
export const prerender = false;

export const POST: APIRoute = ({ request }) => handleLead(request, "staff");
