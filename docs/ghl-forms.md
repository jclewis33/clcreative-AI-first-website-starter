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
      email or phone, so repeat submissions don't create duplicates.
   2. **New contacts only:** set `source` to the form's label. If the SMS box
      wasn't ticked, also turn on SMS "Do not disturb" so GHL refuses to text
      them. Existing contacts keep their original source and any consent they
      gave earlier.
   3. **Consent:** if the box was ticked, add the `sms-consent` tag.
   4. **Tags:** add the form's tags. This fires the GHL **"Contact Tag added"**
      trigger, for new and existing contacts alike.
   5. **Note:** save the message and any other answers (project type,
      timeline, and so on) as a note on the contact.

The tags are added after the "Do not disturb" setting on purpose. That way a
tag-triggered workflow can never text someone in the gap between the two.

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

Each endpoint rejects the other type's form ids, so a public visitor can't
start a staff automation.

## Code map

| File                                 | Role                                                         |
| ------------------------------------ | ------------------------------------------------------------ |
| `src/config/forms.ts`                | **The registry: form id → tags, source, access, retrigger.** |
| `src/components/form/LeadForm.astro` | The ready-made public form (contact or quote preset)         |
| `src/pages/tools/index.astro`        | The Client tools page for staff forms                        |
| `src/pages/api/lead.ts`              | Public endpoint                                              |
| `src/pages/tools/submit.ts`          | Staff endpoint; checks the Cloudflare Access sign-in first   |
| `src/lib/leads.ts`                   | Validation, bot trap, rate limit, and the GHL call order     |
| `src/lib/ghl.ts`                     | GHL Contacts API calls (upsert, tags, note)                  |
| `src/lib/cf-access.ts`               | Verifies the Cloudflare Access sign-in token                 |

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
   plain text. If you use Worker Previews, make them available there too.
2. Add the WAF rate-limit rule for `/api/lead`
   (`docs/new-project-checklist.md` §2). The in-code limit is a soft backup
   only.
3. Set up Cloudflare Access for `/tools` (next section).

## Cloudflare Access for the Client tools page

Access puts a sign-in screen in front of `/tools`. When someone opens the
page, Cloudflare asks for their email. If the email is on the allow list,
Cloudflare emails them a 6-digit code and lets them in.

There are no passwords and nothing is stored in the site. The allow list
lives in the Cloudflare dashboard.

### One-time setup per client site

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

### Day to day

- **Give someone access:** add their email to the policy.
- **Remove someone:** delete their email from the policy.
- Sign-ins last 24 hours by default. You can change this under the
  application's session duration.

### Fails closed

`/tools/submit` checks the signed sign-in token on every request. In
production it refuses the request in each of these cases:

| Situation                                       | Response |
| ----------------------------------------------- | -------- |
| `CF_ACCESS_TEAM_DOMAIN` / `CF_ACCESS_AUD` unset | 503      |
| No sign-in token on the request                 | 401      |
| Token is invalid, expired, or for another app   | 403      |

So a missing or misconfigured Access app never leaves the staff forms open.
In `npm run dev` the check is skipped.

**Caveat:** Access can gate one path only on a custom domain that is on
Cloudflare. While a site lives only on `*.workers.dev`, you can only gate the
whole Worker (Worker → Settings → Domains & Routes → enable Access), so either
wait for the real domain or gate everything temporarily.

### Keeping `/tools` out of search

`/tools` is listed in `NOINDEX_PATHS` (`src/config/seo.shared.mjs`). That
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

### Custom fields (optional)

Messages are saved as a note, so no GHL setup is needed. If a client wants an
answer in a GHL custom field instead, for example to use it in a workflow or
an SMS, map it on the form entry. GHL matches custom fields by id, which you
find under Settings → Custom Fields.

```ts
customFields: { message: "7ERgYVAfbhHRmlp2WUYu" },
```

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
- Server logs are prefixed `[lead]`. In production, read them under the
  Worker's **Observability** tab.
