import type { APIRoute } from "astro";
import { handleLead } from "@/lib/leads";

/**
 * Public lead endpoint — every `access: "public"` form in src/config/forms.ts
 * posts here (via <LeadForm>). Validation, GHL upsert, consent and tags all
 * live in src/lib/leads.ts. Staff forms are refused here; they post to
 * /tools/submit behind the Client tools gate (src/lib/tools-auth.ts).
 */
export const prerender = false;

export const POST: APIRoute = ({ request }) => handleLead(request, "public");
