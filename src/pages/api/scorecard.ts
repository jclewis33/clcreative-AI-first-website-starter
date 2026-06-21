import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { SITE } from "../../config/site";

export const prerender = false;

// Brand identity pulled from SITE so a fork only edits one file.
// BRAND_COLOR is the literal hex (email HTML can't read CSS vars — it mirrors
// --color-brand-500; see SITE.brand). HOST is the bare display host (no scheme/www).
const BRAND_COLOR = SITE.brand.color;
const HOST = SITE.url.replace(/^https?:\/\/(www\.)?/, "");

interface RoomQuestion {
  index: number;
  text: string;
  rating: number;
  label: string;
}

interface RoomScore {
  name: string;
  subtitle: string;
  score: number;
  max: number;
  questions: RoomQuestion[];
}

interface ScorecardPayload {
  firstName: string;
  email: string;
  website?: string;
  totalScore: number;
  maxScore: number;
  tier: string;
  tierMessage?: string;
  tierNext?: string;
  rooms: RoomScore[];
}

type Env = {
  MAILERLITE_API_KEY?: string;
  MAILERLITE_GROUP_ID?: string;
  RESEND_API_KEY?: string;
  NOTIFICATION_EMAIL?: string;
  RESEND_FROM?: string;
};

// Real submissions are ~5–10 KB; anything bigger is abuse.
const MAX_BODY_BYTES = 50_000;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,24}$/;

export const POST: APIRoute = async ({ request }) => {
  const scorecardEnv = env as unknown as Env;

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json({ error: "Payload too large" }, 413);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  // Honeypot: the form includes a hidden "company" field humans never see.
  // Bots that fill it get a fake success so they don't learn to adapt.
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    typeof (parsed as Record<string, unknown>).company === "string" &&
    ((parsed as Record<string, unknown>).company as string).trim() !== ""
  ) {
    return json({ success: true });
  }

  const data = validatePayload(parsed);
  if (!data) {
    return json({ error: "Invalid payload" }, 400);
  }

  const [mailerlite, notify, userMail] = await Promise.allSettled([
    addToMailerLite(scorecardEnv, data),
    sendNotificationEmail(scorecardEnv, data),
    sendUserResultsEmail(scorecardEnv, data),
  ]);

  const errors: string[] = [];
  if (mailerlite.status === "rejected") {
    console.error("MailerLite error:", mailerlite.reason);
    errors.push("mailerlite");
  }
  if (notify.status === "rejected") {
    console.error("Notification email error:", notify.reason);
    errors.push("notify");
  }
  if (userMail.status === "rejected") {
    console.error("User email error:", userMail.reason);
    errors.push("user-email");
  }

  return json({ success: true, errors: errors.length ? errors : undefined });
};

// ---- helpers ----

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ---- input validation ----

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length >= 1 && t.length <= max ? t : null;
}

function num(v: unknown, min: number, max: number): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max
    ? v
    : null;
}

// Rebuilds a clean payload field-by-field. Unknown keys (and the client-only
// `answers` map) are dropped so nothing unvalidated reaches MailerLite or the
// rendered emails — numeric fields are interpolated into email HTML without
// escaping, so they MUST be guaranteed finite numbers here. Returns null when
// any field is invalid.
function validatePayload(input: unknown): ScorecardPayload | null {
  if (typeof input !== "object" || input === null) return null;
  const d = input as Record<string, unknown>;

  const firstName = str(d.firstName, 100);
  const email = str(d.email, 254);
  if (!firstName || !email || !EMAIL_RE.test(email)) return null;

  // The form sends "" when no website was given; require an explicit
  // http(s) scheme otherwise (the client prepends https://) so the value
  // can never become a javascript: link in the notification email.
  let website: string | undefined;
  if (typeof d.website === "string" && d.website.trim() !== "") {
    const w = str(d.website, 200);
    if (!w || /\s/.test(w) || !/^https?:\/\//i.test(w)) return null;
    website = w;
  } else if (d.website !== undefined && typeof d.website !== "string") {
    return null;
  }

  const maxScore = num(d.maxScore, 1, 500);
  if (maxScore === null) return null;
  const totalScore = num(d.totalScore, 0, maxScore);
  const tier = str(d.tier, 100);
  if (totalScore === null || !tier) return null;

  let tierMessage: string | undefined;
  if (d.tierMessage !== undefined && d.tierMessage !== "") {
    const t = str(d.tierMessage, 1000);
    if (!t) return null;
    tierMessage = t;
  }
  let tierNext: string | undefined;
  if (d.tierNext !== undefined && d.tierNext !== "") {
    const t = str(d.tierNext, 1000);
    if (!t) return null;
    tierNext = t;
  }

  if (!Array.isArray(d.rooms) || d.rooms.length < 1 || d.rooms.length > 10) {
    return null;
  }
  const rooms: RoomScore[] = [];
  for (const r of d.rooms) {
    if (typeof r !== "object" || r === null) return null;
    const room = r as Record<string, unknown>;
    const name = str(room.name, 100);
    const subtitle = str(room.subtitle, 200);
    const max = num(room.max, 1, 100);
    if (!name || !subtitle || max === null) return null;
    const score = num(room.score, 0, max);
    if (score === null) return null;

    if (!Array.isArray(room.questions) || room.questions.length > 10) {
      return null;
    }
    const questions: RoomQuestion[] = [];
    for (const q of room.questions) {
      if (typeof q !== "object" || q === null) return null;
      const qq = q as Record<string, unknown>;
      const index = num(qq.index, 1, 50);
      const text = str(qq.text, 300);
      const rating = num(qq.rating, 0, 5);
      const label = str(qq.label, 60);
      if (index === null || !text || rating === null || !label) return null;
      questions.push({ index, text, rating, label });
    }
    rooms.push({ name, subtitle, score, max, questions });
  }

  return {
    firstName,
    email,
    website,
    totalScore,
    maxScore,
    tier,
    tierMessage,
    tierNext,
    rooms,
  };
}

function tierColor(score: number) {
  if (score >= 85) return "#114e0b"; // success-green-dark
  if (score >= 60) return "#5e5515"; // warning-yellow-dark
  if (score >= 35) return "#b45309"; // brand-orange-ish
  return "#3b0b0b"; // error-red-dark
}

function rowTierStyle(pct: number) {
  if (pct >= 80) return { color: "#114e0b", bg: "#e1f5e886" };
  if (pct >= 50) return { color: "#5e5515", bg: "#fffcf5b9" };
  return { color: "#3b0b0b", bg: "#fff5f5" };
}

function renderRoomDetailsHTML(rooms: RoomScore[]): string {
  return rooms
    .map((r) => {
      const pct = Math.round((r.score / r.max) * 100);
      const { color, bg } = rowTierStyle(pct);
      const questionsHTML = r.questions
        .map(
          (q) => `
        <tr>
          <td style="padding:6px 12px 6px 0;color:#444;font-size:13px;vertical-align:top;width:24px;">${q.index}.</td>
          <td style="padding:6px 0;font-size:13px;color:#1a1a1a;">${escape(q.text)}</td>
          <td style="padding:6px 0 6px 12px;text-align:right;white-space:nowrap;font-size:13px;color:#444;">
            <strong style="color:#1a1a1a;">${escape(q.label)}</strong>
            <span style="color:#999;"> (${q.rating}/5)</span>
          </td>
        </tr>`,
        )
        .join("");

      return `
      <div style="margin-bottom:20px;border:1px solid #eee;border-radius:8px;overflow:hidden;">
        <div style="padding:12px 16px;background:#fafafa;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <strong style="font-size:15px;color:#1a1a1a;">${escape(r.name)}</strong>
            <div style="font-size:12px;color:#999;">${escape(r.subtitle)}</div>
          </div>
          <span style="display:inline-block;padding:3px 10px;border-radius:12px;background:${bg};color:${color};font-weight:600;font-size:13px;">${r.score}/${r.max}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;padding:12px 16px;">${questionsHTML}</table>
      </div>`;
    })
    .join("");
}

function renderRoomDetailsText(rooms: RoomScore[]): string {
  return rooms
    .map((r) => {
      const lines = [`${r.name} (${r.subtitle}): ${r.score}/${r.max}`];
      r.questions.forEach((q) => {
        lines.push(`  ${q.index}. ${q.text}`);
        lines.push(`     → ${q.label} (${q.rating}/5)`);
      });
      return lines.join("\n");
    })
    .join("\n\n");
}

// ---- MailerLite ----

async function addToMailerLite(env: Env, payload: ScorecardPayload) {
  if (!env.MAILERLITE_API_KEY) {
    throw new Error("Missing MAILERLITE_API_KEY");
  }

  const { firstName, email, website, totalScore, tier, rooms } = payload;
  const weakest = [...rooms].sort((a, b) => a.score - b.score)[0];

  const fields: Record<string, string | number> = {
    name: firstName,
    scorecard_score: totalScore,
    scorecard_tier: tier,
    scorecard_website: website ?? "",
    scorecard_section_1: rooms[0]?.score ?? 0,
    scorecard_section_2: rooms[1]?.score ?? 0,
    scorecard_section_3: rooms[2]?.score ?? 0,
    scorecard_section_4: rooms[3]?.score ?? 0,
    scorecard_section_5: rooms[4]?.score ?? 0,
    scorecard_section_6: rooms[5]?.score ?? 0,
    scorecard_section_7: rooms[6]?.score ?? 0,
    scorecard_weakest_section: weakest?.name ?? "",
  };

  const body: Record<string, unknown> = {
    email,
    fields,
    status: "active",
  };
  if (env.MAILERLITE_GROUP_ID) {
    body.groups = [env.MAILERLITE_GROUP_ID];
  }

  const res = await fetch("https://connect.mailerlite.com/api/subscribers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${env.MAILERLITE_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MailerLite ${res.status}: ${text}`);
  }
  return res.json();
}

// ---- Admin notification email ----

async function sendNotificationEmail(env: Env, payload: ScorecardPayload) {
  if (!env.RESEND_API_KEY || !env.NOTIFICATION_EMAIL) {
    throw new Error("Missing RESEND_API_KEY or NOTIFICATION_EMAIL");
  }

  const { firstName, email, website, totalScore, maxScore, tier, rooms } =
    payload;
  const weakest = [...rooms].sort((a, b) => a.score - b.score).slice(0, 3);

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;color:#1a1a1a;">
      <h2 style="color:${BRAND_COLOR};margin-bottom:4px;">New Scorecard Submission</h2>
      <p style="color:#888;margin-top:0;">Scorecard — ${HOST}/marketing-scorecard</p>

      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;width:140px;">Name</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escape(firstName)}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;">Email</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">
            <a href="mailto:${escape(email)}" style="color:${BRAND_COLOR};">${escape(email)}</a>
          </td>
        </tr>
        ${
          website
            ? `<tr>
                <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;">Website</td>
                <td style="padding:8px 12px;border-bottom:1px solid #eee;">
                  <a href="${escape(website)}" style="color:${BRAND_COLOR};">${escape(website)}</a>
                </td>
              </tr>`
            : ""
        }
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;">Total Score</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">
            <strong style="font-size:20px;color:${tierColor(totalScore)};">${totalScore}</strong> / ${maxScore}
          </td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;">Tier</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escape(tier)}</td>
        </tr>
      </table>

      <h3 style="color:${BRAND_COLOR};margin-top:24px;margin-bottom:12px;">Detailed Section-by-Section Breakdown</h3>
      ${renderRoomDetailsHTML(rooms)}

      <h3 style="color:#3b0b0b;margin-top:24px;">Weakest Sections (Focus Areas)</h3>
      <ol style="padding-left:20px;">
        ${weakest.map((r) => `<li><strong>${escape(r.name)}</strong> (${escape(r.subtitle)}) — ${r.score}/${r.max}</li>`).join("")}
      </ol>
    </div>
  `;

  const text = `New Scorecard Submission

Name: ${firstName}
Email: ${email}
Website: ${website || "Not provided"}
Score: ${totalScore}/${maxScore}
Tier: ${tier}

Detailed Breakdown:
${renderRoomDetailsText(rooms)}

Weakest Rooms:
${weakest.map((r, i) => `${i + 1}. ${r.name} — ${r.score}/${r.max}`).join("\n")}
`;

  return sendResend(env, {
    to: [env.NOTIFICATION_EMAIL],
    subject: `New Scorecard: ${firstName} — ${totalScore}/${maxScore} (${tier})`,
    html,
    text,
  });
}

// ---- User's results email ----

async function sendUserResultsEmail(env: Env, payload: ScorecardPayload) {
  if (!env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY");
  }

  const {
    firstName,
    email,
    totalScore,
    maxScore,
    tier,
    tierMessage,
    tierNext,
    rooms,
  } = payload;
  const weakest = [...rooms].sort((a, b) => a.score - b.score).slice(0, 3);

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;color:#1a1a1a;padding:24px;">
      <p style="margin:0 0 8px;">Hi ${escape(firstName)},</p>
      <p style="margin:0 0 24px;">Here's your full Marketing Foundation Scorecard. Save this email — you can refer back to it any time.</p>

      <div style="background:#fafafa;border:1px solid #eee;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#888;">Your Score</p>
        <div style="font-size:48px;font-weight:700;color:${tierColor(totalScore)};line-height:1;margin:8px 0;">${totalScore}</div>
        <p style="margin:0 0 12px;color:#999;font-size:14px;">out of ${maxScore}</p>
        <div style="display:inline-block;padding:6px 16px;border-radius:20px;background:${BRAND_COLOR};color:#fff;font-weight:600;font-size:14px;">${escape(tier)}</div>
        ${tierMessage ? `<p style="margin:16px auto 0;max-width:480px;color:#444;line-height:1.5;">${escape(tierMessage)}</p>` : ""}
      </div>

      <h2 style="color:${BRAND_COLOR};font-size:18px;margin:24px 0 12px;">Your Section-by-Section Breakdown</h2>
      ${renderRoomDetailsHTML(rooms)}

      <h2 style="color:${BRAND_COLOR};font-size:18px;margin:24px 0 12px;">Where to focus first</h2>
      <p style="margin:0 0 12px;color:#444;">Your three weakest sections — start here:</p>
      <ol style="padding-left:20px;color:#1a1a1a;line-height:1.7;">
        ${weakest.map((r) => `<li><strong>${escape(r.name)}</strong> (${escape(r.subtitle)}) — ${r.score}/${r.max}</li>`).join("")}
      </ol>

      ${
        tierNext
          ? `
        <div style="background:${BRAND_COLOR};color:#fff;border-radius:12px;padding:24px;margin:32px 0;text-align:center;">
          <p style="margin:0 0 12px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;opacity:0.75;">What's next</p>
          <h3 style="margin:0 0 12px;color:#fff;">Ready to take the next step?</h3>
          <p style="margin:0 0 20px;line-height:1.5;opacity:0.9;">${escape(tierNext)}</p>
          <a href="${SITE.url}/contact" style="display:inline-block;padding:12px 24px;background:#fff;color:${BRAND_COLOR};border-radius:999px;text-decoration:none;font-weight:600;">Get in Touch</a>
        </div>`
          : ""
      }

      <p style="margin:32px 0 0;color:#888;font-size:13px;text-align:center;">
        From ${SITE.name} — <a href="${SITE.url}" style="color:${BRAND_COLOR};">${HOST}</a>
      </p>
    </div>
  `;

  const text = `Hi ${firstName},

Here's your full Scorecard.

YOUR SCORE: ${totalScore}/${maxScore} (${tier})
${tierMessage ?? ""}

SECTION-BY-SECTION BREAKDOWN:
${renderRoomDetailsText(rooms)}

WHERE TO FOCUS FIRST:
${weakest.map((r, i) => `${i + 1}. ${r.name} (${r.subtitle}) — ${r.score}/${r.max}`).join("\n")}

${tierNext ?? ""}

Ready to take the next step? Get in touch:
${SITE.url}/contact

— ${SITE.name}
${SITE.url}
`;

  return sendResend(env, {
    to: [email],
    subject: `Your Scorecard — ${totalScore}/${maxScore}`,
    html,
    text,
  });
}

// ---- Shared Resend sender ----

interface ResendArgs {
  to: string[];
  subject: string;
  html: string;
  text: string;
}

async function sendResend(env: Env, { to, subject, html, text }: ResendArgs) {
  // Display name from SITE; the sender mailbox is infra-specific.
  // fork: set RESEND_FROM (or update this address) to your verified domain.
  const from =
    env.RESEND_FROM ?? `${SITE.name} Scorecard <scorecard@example.com>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Resend ${res.status}: ${t}`);
  }
  return res.json();
}

function escape(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
