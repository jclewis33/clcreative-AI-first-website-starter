# Form Components (`src/components/form/`)

The form family shares one stylesheet — `src/styles/components/forms.css` —
the documented exception to co-located component CSS (it is consumed by the
contact page and SignUpForm together). New form CSS goes there, not into
per-component style blocks.

All fields must keep `font-size` at `1rem` or larger — anything below
triggers auto-zoom on iOS.

## `<Form>`

Wrapper with **async submit built in**: a `data-state` machine on
`.form_wrap` — `idle → sending → sent | failed`. The script validates
(`checkValidity()` — invalid submits get the browser's native UI), posts the
`FormData` with `fetch` to `action`, disables the submit button while
sending, and the success/error notes show from the state alone
(`role="status"` / `role="alert"`). Without JS the form still posts natively
to `action`. **With no `action`, the form sends nothing and reports
success** — placeholder mode for the starter; wire `action` to a real
endpoint per project.

| Prop             | Type                    | Default       | Description                                                                                             |
| ---------------- | ----------------------- | ------------- | ------------------------------------------------------------------------------------------------------- |
| `name`           | `string`                | —             | `name` on the `<form>`                                                                                  |
| `action`         | `string`                | —             | Fetch target + native fallback; omit = placeholder                                                      |
| `method`         | `'GET'`\|`'POST'`       | `'POST'`      | HTTP method                                                                                             |
| `encoding`       | `'form-data'`\|`'json'` | `'form-data'` | Fetch body: multipart `FormData`, or a JSON object keyed by field name (CRM inbound webhooks, e.g. GHL) |
| `successMessage` | `string`                | —             | Shown in place of the fields once sent                                                                  |
| `errorMessage`   | `string`                | —             | Shown beneath the fields on failure                                                                     |

**Wiring a CRM.** GoHighLevel is built in. Use `<LeadForm>` below rather
than pointing a bare `<Form>` at a webhook. Other CRMs: embed the CRM's own
form snippet in a Section. MailerLite is a separate, optional script in the
head (`SITE.integrations.mailerLiteAccount`, blank = off) and has nothing to
do with the form components.

## `<LeadForm>` (GoHighLevel)

A ready-made form wired to GHL: first/last name, email, phone, message, a
hidden bot trap and the A2P SMS consent box.

How it works:

- It posts JSON to `/api/lead` with its `formId`.
- The server reads that form's **tags** and `source` from
  `src/config/forms.ts`, never from the browser.
- It then creates or updates the contact, saves the message as a note, and
  adds the tags. The tags start the GHL automations ("Contact Tag added").
- Failures show `<Form>`'s error state; nothing is faked.

| Prop                                              | Type                   | Default              | Description                                                                 |
| ------------------------------------------------- | ---------------------- | -------------------- | --------------------------------------------------------------------------- |
| `formId`                                          | `FormId`               | —                    | Registry entry. Must be `access: "public"`                                  |
| `fields`                                          | `'contact'`\|`'quote'` | `'contact'`          | `quote` adds project-type + timeline selects                                |
| `projectOptions` / `timelineOptions`              | `{label,value}[]`      | — / 3 defaults       | Quote selects. The chosen **label** is saved                                |
| `messageLabel` / `messagePlaceholder`             | `string`               | `'How can we help?'` | Message box copy                                                            |
| `submitLabel` / `successMessage` / `errorMessage` | `string`               | sensible defaults    | Copy. The error default includes `SITE.phone`                               |
| `buttonWidth`                                     | `'full'`\|`'auto'`     | `'full'`             | Submit width                                                                |
| `id`                                              | `string`               | `lead-<formId>`      | Field-id prefix. **Required to be unique when a page shows the form twice** |

```astro
<LeadForm formId="contact" messageLabel="What do you need help with?" />
<LeadForm
  formId="quote"
  fields="quote"
  projectOptions={[{ label: "Roof repair", value: "roof" }]}
/>
```

**Staff forms** (`access: "staff"`, e.g. review request, yearly follow-up)
never use LeadForm. They appear automatically on the Client tools page
(`/tools`), which Cloudflare Access gates. To add a form or automation, add
one entry to `src/config/forms.ts`. Full setup: `docs/ghl-forms.md`.

## `<FormField>`

Label + input. The `variant` prop settles `type` + `inputmode` keyboard +
`autocomplete` autofill together, so a field only says what it is for:

`text` (default) · `first-name` · `last-name` · `email` · `phone` · `date` ·
`zip-code` · `number` · `search` · `password` · `url`

Explicit `type` / `autocomplete` / `inputmode` props override piece by piece
(a dev warning fires when `variant` and a conflicting `type` are both
passed — keep one source of truth).

Other props: `label` (required), `name` (required), `placeholder`,
`required`, `disabled`, `labelVariant` (`'default'` | `'hidden'` sr-only |
`'floating'` — floats up on focus/value), `value`, `helperText`, `errorText`,
`id`, `class`.

```astro
<FormField label="Email" name="email" variant="email" required />
<FormField label="Zip" name="zip" variant="zip-code" />
<FormField label="Phone" name="phone" variant="phone" labelVariant="floating" />
```

## `<FormSelect>`

Label + styled select with built-in option sets via `variant`:

| Variant   | Options                                                                                 |
| --------- | --------------------------------------------------------------------------------------- |
| `'list'`  | Your own `options` array or the slot (default)                                          |
| `'month'` | 01–12                                                                                   |
| `'day'`   | 01–31                                                                                   |
| `'year'`  | A range — `from` (default: 100 before `to`) to `to` (default: build year), newest first |
| `'state'` | The 50 US states (this starter's client base is US)                                     |

Other props: `label`, `name`, `options` (`{ label, value, disabled? }[]` —
ignored when a built-in variant supplies the list), `placeholderOption`,
`required`, `disabled`, `value`, `labelVariant` (incl. floating),
`helperText`, `errorText`. Default slot takes `<option>`/`<optgroup>` for
complex cases.

```astro
<FormSelect
  label="State"
  name="state"
  variant="state"
  placeholderOption="Select one..."
/>
<FormSelect
  label="Year"
  name="year"
  variant="year"
  from={1990}
  placeholderOption="YYYY"
/>
```

## `<FormCheckbox>` / `<FormRadio>`

Native input + plain CSS (`:has(:checked)` drives the visuals). Both take a
`variant`:

- `'default'` — a box (checkbox) or circle (radio) beside the text
- `'toggle'` — a sliding switch (**checkbox only**)
- `'chip'` — the whole control is one piece and fills when chosen; the
  box/circle disappears

Other props: `label` (required), `name` (required), `value` (radio: required;
checkbox default `'on'`), `checked`, `required`, `disabled`, `id`, `class`.
Radios sharing a `name` form the group.

```astro
<FormCheckbox label="Email me updates" name="updates" variant="toggle" />
<div class="u-display-flex u-flex-wrap u-gap-3">
  <FormRadio
    label="Monthly"
    name="billing"
    value="monthly"
    variant="chip"
    checked
  />
  <FormRadio label="Yearly" name="billing" value="yearly" variant="chip" />
</div>
```

## `<FormTextarea>`

Auto-growing textarea: tracks its content between `minLines` (default `3`)
and `maxLines` (default `12`) via CSS `field-sizing: content` (Chromium;
elsewhere it starts at `minLines` tall with manual vertical resize — the
`rows` attribute is set from `minLines` as the cross-browser floor). Other props mirror
FormField (`label`, `name`, `placeholder`, `required`, `disabled`,
`labelVariant`, `value`, `helperText`, `errorText`).

## `<FormRange>`

Range slider with live value bubble. Props: `label`, `name`, `min`, `max`,
`step`, `value`, `showValue`, `showMinMax`, `prefix`/`suffix`.

## `<FormFieldset>` / `<FormRadioGroup>`-style grouping

`<FormFieldset columns={1|2|3}>` lays fields out in responsive columns
(container-query collapse), with `legend` styling options. Compose fields
inside it; it owns the gaps.
