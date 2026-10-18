# GoHighLevel forms

Every form on a site built from this starter sends its submissions to the
client's GoHighLevel (GHL) sub-account. Each form adds its own **tags** to the
contact, and those tags start the GHL automations.

This guide covers how the forms work, how to set up a new client, and how to
add a form.

## How it works

1. A visitor or staff member submits a form. The browser sends only the
   form's **id** (for example `contact`), never the tags.
2. The site looks the id up in **`src/config/forms.ts`** to find which tags
   and which `source` label that form uses.
3. The site sends the submission to GHL in this order:
   1. **Create or update the contact.** GHL matches an existing contact on
      email or phone, so repeat submissions don't create duplicates. The
      form's `source`, its `contactType` (`customer` for review feedback,
      discount claims and staff tools) and any mapped custom fields are
      written here, on every submission.
   2. **Consent:** ticked → the `sms consent` tag (and `sms did not consent`
      comes off). Unticked → `sms did not consent`, unless they already have
      `sms consent` (leaving the box empty later isn't opting out; texting
      STOP is). No "Do not disturb" is set — workflows check the tags. Only
      asked on public forms with a phone while `SITE.smsOptIn` is on (see
      "Before A2P approval" below).
   3. **Tags:** add the form's tags. This fires the GHL **"Contact Tag added"**
      trigger, for new and existing contacts alike.
   4. **Note:** save the message and any other answers (project type,
      timeline, rating, referrer, and so on) as a note on the contact. When
      the form had a phone and texting is on, the note also records the
      consent: `SMS consent: GIVEN <time> on <page>` with the exact wording
      they ticked, or `NOT given`. That's the opt-in record carriers ask for.

The consent tags go on before the form's tags, so a tag-triggered workflow
already sees them.

**Matches the GHL snapshot.** Every tag name, source, contact type and
custom-field key in `src/config/forms.ts` mirrors the Way Construction build
that the CL Creative GHL snapshot is made from. Change them only together
with the snapshot.

**Re-running an automation for the same person.** GHL fires "Contact Tag
added" only when the tag is new to the contact. A form marked
`retrigger: true` therefore removes the tag first if the contact already has
it, then adds it again. Example: a second review request a year later. The GHL
workflow must also have **Allow re-entry** turned on.

### Which form posts where

| Form type                | Who uses it                  | Posts to        | Built with                                    |
| ------------------------ | ---------------------------- | --------------- | --------------------------------------------- |
| `access: "public"` forms | Website visitors             | `/api/lead`     | `<LeadForm formId="…" />` on any page         |
| `access: "staff"` forms  | The client, on `/tools` only | `/tools/submit` | Listed automatically on the Client tools page |

### Forms the starter ships

| Form id                 | Access | Where                         | Tags                                              | Type                    | Custom fields                    |
| ----------------------- | ------ | ----------------------------- | ------------------------------------------------- | ----------------------- | -------------------------------- |
| `contact`               | public | `<LeadForm formId="contact">` | `website lead`                                    | lead                    | `your_message`                   |
| `review-feedback`       | public | `/leave-a-review` (1–3 stars) | `review feedback 1-star` … `3-star`               | customer                | `review_rating`, `your_feedback` |
| `discount-claim`        | public | `/get-your-discount`          | `discount claimed`; a friend also gets `referral` | customer (friend: lead) | `your_message`, `referred_by`    |
| `review-request`        | staff  | `/tools`                      | `review request`                                  | customer                | —                                |
| `review-request-1-year` | staff  | `/tools`                      | `review request + 1-year followup`                | customer                | —                                |

Every form except `contact` is `retrigger: true`.

The usual loop: after a job the client picks **Ask for a review** (or
**…and add to the 1-year follow-up**) on `/tools` → the GHL workflow
texts/emails a link to `/leave-a-review` → 4–5 stars go to Google; 1–3 land
privately as `review feedback N-star` (alert the owner on those tags). The
1-year follow-up later sends a link to `/get-your-discount`, where the
customer claims the offer or refers a friend.

Both customer pages are noindexed and kept out of the sitemap, nav and
footer. Link-friendly prefill on `/leave-a-review`:
`/leave-a-review?first_name={{contact.first_name}}&last_name={{contact.last_name}}&email={{contact.email}}`.

**Keep the Google link on the low-rating step.** Sending only happy
customers to Google ("review gating") breaks Google's review policy and the
FTC's guidance. `ReviewRequest` offers the private form first and still
links to Google; don't remove that link.

## Before A2P approval: `SITE.smsOptIn`

Carriers review the website during A2P 10DLC registration. A form that
collects phone numbers before texting is approved undercuts it, so
`SITE.smsOptIn` (src/config/site.ts) ships **false**. While false:

- Public forms render **no Phone field and no SMS consent box** — left out of
  the HTML, not hidden. Email becomes required.
- The server ignores any `smsConsent` it's sent, and records no consent.
- Any phrase in `SMS_OFF_COPY_SWAPS` (src/config/sms-consent.ts) is swapped
  site-wide at build time — e.g. "Request a call back" → "Send us a
  message". Source copy stays as written.

When the registration is approved, set `smsOptIn: true` and deploy. That
restores the Phone field, the consent box and every swapped phrase at once.
The consent wording lives once in `src/config/sms-consent.ts` and uses
`SITE.legalName` — keep it in step with the opt-in description on the A2P
campaign.

Each endpoint rejects the other type's form ids, so a public visitor can't
start a staff automation.

## Code map

| File                                          | Role                                                         |
| --------------------------------------------- | ------------------------------------------------------------ |
| `src/config/forms.ts`                         | **The registry: form id → tags, source, access, retrigger.** |
| `src/components/form/LeadForm.astro`          | The ready-made public form (contact or quote preset)         |
| `src/pages/tools/index.astro`                 | The Client tools page for staff forms                        |
| `src/pages/api/lead.ts`                       | Public endpoint                                              |
| `src/pages/tools/submit.ts`                   | Staff endpoint (gated by the middleware)                     |
| `src/lib/leads.ts`                            | Validation, bot trap, rate limit, and the GHL call order     |
| `src/lib/ghl.ts`                              | GHL Contacts API calls (upsert, tags, note)                  |
| `src/lib/tools-auth.ts`                       | The `/tools` gate: Access or shared password                 |
| `src/lib/cf-access.ts`                        | Verifies the Cloudflare Access sign-in token                 |
| `src/config/sms-consent.ts`                   | SMS consent wording + the pre-A2P copy swaps                 |
| `src/components/form/SmsConsent.astro`        | The consent checkbox (renders only when `smsOptIn` is on)    |
| `src/components/sections/ReviewRequest.astro` | `/leave-a-review` stars + private feedback form              |
| `src/components/form/DiscountClaimForm.astro` | `/get-your-discount` claim / refer-a-friend form             |

## Setting up a new client

### 1. In GHL (the client's sub-account)

1. **Settings → Private Integrations → Create.** Give it the scopes
   **View Contacts** and **Edit Contacts** (`contacts.readonly`,
   `contacts.write`), then copy the token.
2. **Settings → Business Profile:** copy the **Location ID**.
3. For each form, build a workflow:
   - Trigger: **Contact Tag added**, filtered to that form's tag (for example
     `website lead`).
   - Turn **Allow re-entry** on for any form marked `retrigger: true` in
     `src/config/forms.ts`.
   - Tag names must match exactly. GHL stores tags in lowercase, so keep them
     lowercase in `src/config/forms.ts`.

### 2. In the code

1. Edit `src/config/forms.ts` so each form's `tags` match the client's
   workflows, and add or remove forms as needed.
2. Put the token and location id in local `.env` as `GHL_API_TOKEN` and
   `GHL_LOCATION_ID`. That's enough to test in `npm run dev`.

### 3. In Cloudflare (the site's Worker)

1. **Workers & Pages → the Worker → Settings → Variables and Secrets:** add
   `GHL_API_TOKEN` and `GHL_LOCATION_ID` as **Secret** (encrypted), never as
   plain text. Previews (review branches, §4b of the checklist) don't
   inherit them: also run `npx wrangler preview base-config secret put
GHL_API_TOKEN` and `… GHL_LOCATION_ID` from the repo folder.
2. Add the WAF rate-limit rule for `/api/lead`
   (`docs/new-project-checklist.md` §2). The in-code limit is a soft backup
   only.
3. Gate `/tools` with Cloudflare Access **or** a shared password (next
   section).

## Gating the Client tools page

`src/middleware.ts` runs `checkToolsAuth` (src/lib/tools-auth.ts) on every
`/tools` request. It picks the gate from what's configured:

| Configured                                | Gate                                     |
| ----------------------------------------- | ---------------------------------------- |
| `CF_ACCESS_TEAM_DOMAIN` + `CF_ACCESS_AUD` | Cloudflare Access (email one-time PIN)   |
| otherwise `TOOLS_PASSWORD`                | Shared password on `/tools/sign-in`      |
| neither                                   | Locked — every `/tools` request gets 503 |

**Which one?** Access needs the client's domain on Cloudflare **in our
account** — it can gate a single path only on a zone it owns. Sites served
through **Cloudflare for SaaS** (the client's domain stays in their own
Cloudflare account and CNAMEs to us) can't use it; use the password.

### Shared password

1. Worker → **Settings → Variables and Secrets** (the top section — **not**
   Settings → Builds, whose variables only exist during the build) → **Add**
   → type **Secret**, name `TOOLS_PASSWORD`. Or
   `npx wrangler secret put TOOLS_PASSWORD`.
2. Deploy. `/tools` now redirects to `/tools/sign-in`; the right password sets
   an HttpOnly cookie for 90 days (it holds an HMAC of the password, never the
   password).
3. Changing the password signs every device out. Sign-in is limited to 10
   tries per 10 minutes per IP (soft, per isolate) — add a WAF rate-limit rule
   on `POST /tools/session` for a hard limit.

Writes under `/tools` must come from the site's own pages (Origin /
Sec-Fetch-Site checked), and every `/tools` response is `private, no-store`.

### Cloudflare Access

Access puts a sign-in screen in front of `/tools`. When someone opens the
page, Cloudflare asks for their email. If the email is on the allow list,
Cloudflare emails them a 6-digit code and lets them in.

There are no passwords and nothing is stored in the site. The allow list
lives in the Cloudflare dashboard.

#### One-time setup per client site

1. Open the Cloudflare dashboard → **Zero Trust**. The first time, pick a team
   name; that gives you `<team>.cloudflareaccess.com`. The Free plan covers up
   to 50 users.
2. **Access → Applications → Add an application → Self-hosted.**
   - Application domain: the client's domain (for example
     `www.clientsite.com`).
   - Path: `tools`. This covers both `/tools` and `/tools/submit`.
3. **Add a policy:** Action **Allow**, Include → **Emails** → the client's
   email address(es).
4. **Login methods:** leave **One-time PIN** on. It's the default.
5. Save, then open the application and copy its **Application Audience (AUD)
   Tag**.
6. In the Worker's **Variables and Secrets**, add two plain-text variables:
   - `CF_ACCESS_TEAM_DOMAIN` = `<team>.cloudflareaccess.com`
   - `CF_ACCESS_AUD` = the AUD tag
7. Redeploy, then open `/tools` in a private window. You should be asked for
   an email, and only allowed emails should get a code.

#### Day to day

- **Give someone access:** add their email to the policy.
- **Remove someone:** delete their email from the policy.
- Sign-ins last 24 hours by default. You can change this under the
  application's session duration.

#### Fails closed

Every `/tools` request has its signed sign-in token checked. In production
the request is refused in each of these cases:

| Situation                                      | Response |
| ---------------------------------------------- | -------- |
| Neither Access nor `TOOLS_PASSWORD` configured | 503      |
| No sign-in token on the request                | 401      |
| Token is invalid, expired, or for another app  | 403      |

So a missing or misconfigured Access app never leaves the staff forms open.
In `npm run dev` the check is skipped.

**Caveat:** Access can gate one path only on a custom domain that is on
Cloudflare. While a site lives only on `*.workers.dev`, you can only gate the
whole Worker (Worker → Settings → Domains & Routes → enable Access), so either
wait for the real domain or gate everything temporarily.

### Keeping `/tools` out of search

`/tools` (and `/leave-a-review`, `/get-your-discount`) are listed in
`NOINDEX_PATHS` (`src/config/seo.shared.mjs`). That
gives it a noindex tag and a robots.txt `Disallow`, and keeps it out of the
sitemap. It isn't in `PAGES`, the nav, or the footer.

## Adding a form

### A new public form (for example a quote form on a service page)

1. Add an entry to `src/config/forms.ts`:

   ```ts
   quote: {
     label: "Quote request",
     access: "public",
     tags: ["quote request"],
     source: "Website: Quote request",
   },
   ```

2. Use it on a page:

   ```astro
   <LeadForm
     formId="quote"
     fields="quote"
     projectOptions={[{ label: "Roof repair", value: "roof-repair" }]}
   />
   ```

3. In GHL, build a workflow on **Contact Tag added → `quote request`**.

### A new staff automation (for example "Ask for a referral")

1. Add an entry with `access: "staff"`. Add `retrigger: true` if it can be run
   for the same person more than once.
2. It appears on `/tools` automatically. No page changes are needed.
3. In GHL, build the workflow on that tag, with **Allow re-entry** on if you
   set `retrigger: true`.

### Custom fields

Every answer is also saved in a note, so nothing is lost without them. The
snapshot defines four custom fields the starter writes by **key**:
`your_message`, `your_feedback`, `review_rating`, `referred_by`. To write
another answer to a field, map form field → key on the form entry (Settings →
Custom Fields → the field's key, without the `contact.` prefix):

```ts
customFields: { message: "your_message" },
```

## Chat widget and External Tracking

Both are `SITE.integrations` settings (src/config/site.ts), blank = off:

- `ghlChatWidgetId` — the chat widget (Sites → Chat Widget → the widget id).
- `ghlTrackingId` — Settings → **External Tracking** → the `tk_…` value in
  the snippet. Page views + form fills in GHL attribution. `ghlTrackingScript`
  is the agency's white-label links domain. Never loaded on `/tools` (staff
  type customers' details there) or `/preview`.

## Testing

- `npm run dev` with real credentials in `.env`. Use a test sub-account, or
  expect real contacts and real workflows.
- A submission should create the contact with the form's tag and source, and
  a note holding the message.
- Submitting again with the same email updates the contact rather than
  duplicating it.
- On `/tools`, running a retrigger form twice for the same person should fire
  the workflow twice.
- Filling the hidden `company_website` field in devtools should return
  success and create nothing in GHL.
- With `smsOptIn: false`, view-source on every public form page: there should
  be no `name="phone"` and no `name="smsConsent"` input.
- `/leave-a-review`: 4–5 stars redirect to Google; 1–3 open the form, and a
  submission tags the contact `review feedback N-star`.
- `/get-your-discount` as "A friend": the friend is the contact, tagged
  `referral`, with "Referred by" in the note.
- Server logs are prefixed `[lead]`. In production, read them under the
  Worker's **Observability** tab.
