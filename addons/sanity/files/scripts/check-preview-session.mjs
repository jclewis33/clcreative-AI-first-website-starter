#!/usr/bin/env node
/**
 * check-preview-session — unit checks for the signed draft-preview session
 * and the perspective allowlist (src/sanity/lib/preview-session.ts). Plain
 * Node, zero dependencies (Node strips the module's types on import):
 *   node scripts/check-preview-session.mjs
 */
import assert from "node:assert/strict";
import {
  PREVIEW_SESSION_COOKIE,
  PREVIEW_SESSION_TTL_MS,
  createPreviewSession,
  resolvePreview,
  sanitizePerspective,
  serializePerspective,
  verifyPreviewSession,
} from "../src/sanity/lib/preview-session.ts";

const SECRET = "sk-test-read-token";
const NOW = 1_800_000_000_000;
let passed = 0;

async function check(name, body) {
  try {
    await body();
    passed++;
    console.log(`ok    ${name}`);
  } catch (err) {
    console.error(`FAIL  ${name}`);
    throw err;
  }
}

/* Flip one base64url character (keeps the format valid). */
const flip = (c) => (c === "A" ? "B" : "A");

const session = await createPreviewSession(SECRET, NOW);
const [expiry, signature] = session.split(".");

await check("cookie name is set and differs from Sanity's", () => {
  assert.equal(typeof PREVIEW_SESSION_COOKIE, "string");
  assert.notEqual(PREVIEW_SESSION_COOKIE, "sanity-preview-perspective");
});

await check("session format: <expiry>.<43-char base64url>", () => {
  assert.match(session, /^[0-9]+\.[A-Za-z0-9_-]{43}$/);
  assert.equal(Number(expiry), NOW + PREVIEW_SESSION_TTL_MS);
});

await check("no cookie → false", async () => {
  assert.equal(await verifyPreviewSession(SECRET, undefined, NOW), false);
  assert.equal(await verifyPreviewSession(SECRET, "", NOW), false);
});

await check('forged value "drafts" → false', async () => {
  assert.equal(await verifyPreviewSession(SECRET, "drafts", NOW), false);
  assert.equal(
    await verifyPreviewSession(SECRET, `${NOW + 1000}.drafts`, NOW),
    false,
  );
});

await check("valid session → true", async () => {
  assert.equal(await verifyPreviewSession(SECRET, session, NOW), true);
  assert.equal(
    await verifyPreviewSession(
      SECRET,
      session,
      NOW + PREVIEW_SESSION_TTL_MS - 1,
    ),
    true,
  );
});

await check("tampered signature → false", async () => {
  const first = `${expiry}.${flip(signature[0])}${signature.slice(1)}`;
  const last = `${expiry}.${signature.slice(0, -1)}${flip(signature.at(-1))}`;
  assert.equal(await verifyPreviewSession(SECRET, first, NOW), false);
  assert.equal(await verifyPreviewSession(SECRET, last, NOW), false);
  assert.equal(
    await verifyPreviewSession(SECRET, `${expiry}.${signature}x`, NOW),
    false,
  );
});

await check(
  "every non-canonical spelling of the signature → false",
  async () => {
    const B64 =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    const lastBits = B64.indexOf(signature.at(-1)) & ~3;
    for (let spare = 1; spare < 4; spare++) {
      const alias = `${expiry}.${signature.slice(0, -1)}${B64[lastBits | spare]}`;
      assert.equal(await verifyPreviewSession(SECRET, alias, NOW), false);
    }
  },
);

await check("tampered expiry → false", async () => {
  const later = `${Number(expiry) + 3_600_000}.${signature}`;
  assert.equal(await verifyPreviewSession(SECRET, later, NOW), false);
  assert.equal(
    await verifyPreviewSession(SECRET, `0${expiry}.${signature}`, NOW),
    false,
  );
});

await check("expired → false", async () => {
  assert.equal(
    await verifyPreviewSession(SECRET, session, NOW + PREVIEW_SESSION_TTL_MS),
    false,
  );
  const old = await createPreviewSession(SECRET, NOW - 2 * 60_000, 60_000);
  assert.equal(await verifyPreviewSession(SECRET, old, NOW), false);
});

await check("far-future expiry, even correctly signed → false", async () => {
  const SKEW = 5 * 60_000;
  const far = await createPreviewSession(SECRET, NOW, 365 * 86_400_000);
  assert.equal(await verifyPreviewSession(SECRET, far, NOW), false);
  const justOver = await createPreviewSession(
    SECRET,
    NOW,
    PREVIEW_SESSION_TTL_MS + SKEW + 1,
  );
  assert.equal(await verifyPreviewSession(SECRET, justOver, NOW), false);
  // Issued by an instance whose clock runs up to 5 minutes ahead: fine.
  const skewed = await createPreviewSession(
    SECRET,
    NOW,
    PREVIEW_SESSION_TTL_MS + SKEW,
  );
  assert.equal(await verifyPreviewSession(SECRET, skewed, NOW), true);
});

await check("wrong secret → false", async () => {
  assert.equal(await verifyPreviewSession("other-token", session, NOW), false);
});

await check("empty secret → false (and refused when issuing)", async () => {
  assert.equal(await verifyPreviewSession("", session, NOW), false);
  await assert.rejects(() => createPreviewSession("", NOW));
});

await check("malformed values → false", async () => {
  for (const value of [
    ".",
    `${expiry}.`,
    `.${signature}`,
    `${expiry}.${signature}.extra`,
    `-${expiry}.${signature}`,
    `${expiry} .${signature}`,
    "x".repeat(10_000),
  ])
    assert.equal(await verifyPreviewSession(SECRET, value, NOW), false, value);
});

await check("sanitizePerspective allows the keywords", () => {
  for (const word of ["drafts", "published", "previewDrafts", "raw"])
    assert.equal(sanitizePerspective(word), word);
});

await check("sanitizePerspective allows release stacks", () => {
  // Presentation's preview URL: an array perspective comma-joined.
  assert.deepEqual(sanitizePerspective("rABC123,drafts"), [
    "rABC123",
    "drafts",
  ]);
  // SanityVisualEditing's cookie: JSON, URL-encoded.
  assert.deepEqual(
    sanitizePerspective(encodeURIComponent('["r.a-b_c","drafts"]')),
    ["r.a-b_c", "drafts"],
  );
  assert.deepEqual(sanitizePerspective('["rX"]'), ["rX"]);
});

await check("sanitizePerspective refuses everything else", () => {
  for (const value of [
    undefined,
    null,
    42,
    ["drafts"],
    "",
    "Drafts",
    "rABC123",
    "drafts ",
    'drafts","x',
    '["drafts","x"y"]',
    '["drafts",1]',
    '{"a":1}',
    "[]",
    "drafts,",
    ",drafts",
    "drafts,,published",
    "drafts,a b",
    "drafts,%ZZ",
    "%E0%A4%A",
    "x".repeat(10_240),
    `drafts,${"a".repeat(10_240)}`,
    Array.from({ length: 33 }, (_, i) => `r${i}`).join(","),
  ])
    assert.equal(sanitizePerspective(value), undefined, String(value));
});

await check("sanitizePerspective bounds the serialized form", () => {
  // 32 ids, comma form under the cap but JSON (what travels on) over it.
  const id = "r".repeat(29);
  const comma = Array.from({ length: 32 }, () => id).join(",");
  assert.ok(
    comma.length <= 1024 && JSON.stringify(comma.split(",")).length > 1024,
  );
  assert.equal(sanitizePerspective(comma), undefined);
  // Accepted values survive the serialize → sanitize round trip unchanged.
  for (const value of [
    "drafts",
    "raw",
    "rA,drafts",
    Array.from({ length: 32 }, (_, i) => `r${i}`).join(","),
    // Serializes to exactly 1023 characters: the longest kind accepted.
    `${"r".repeat(1015)},d`,
  ]) {
    const once = sanitizePerspective(value);
    assert.notEqual(once, undefined, value.slice(0, 40));
    assert.deepEqual(sanitizePerspective(serializePerspective(once)), once);
  }
});

const VALID = await createPreviewSession(SECRET, NOW);
const resolve = (session, perspective) =>
  resolvePreview(SECRET, session, perspective, NOW);

await check("gate: no session → undefined", async () => {
  assert.equal(await resolve(undefined, undefined), undefined);
  assert.equal(await resolve("", "drafts"), undefined);
});

await check("gate: forged perspective only → undefined", async () => {
  assert.equal(await resolve(undefined, "drafts"), undefined);
  assert.equal(await resolve("drafts", "drafts"), undefined);
  const wrong = await createPreviewSession("other-token", NOW);
  assert.equal(await resolve(wrong, "drafts"), undefined);
});

await check('gate: valid session, no perspective → "drafts"', async () => {
  assert.equal(await resolve(VALID, undefined), "drafts");
  assert.equal(await resolve(VALID, ""), "drafts");
});

await check('gate: valid session, hostile perspective → "drafts"', async () => {
  for (const hostile of ['drafts","x', "x".repeat(10_240), "Drafts", "[1]"])
    assert.equal(await resolve(VALID, hostile), "drafts");
});

await check(
  "gate: valid session, keyword or release stack → serialized",
  async () => {
    assert.equal(await resolve(VALID, "published"), "published");
    assert.equal(await resolve(VALID, "rABC,drafts"), '["rABC","drafts"]');
    assert.equal(
      await resolve(VALID, encodeURIComponent('["rABC","drafts"]')),
      '["rABC","drafts"]',
    );
    // What the gate returns, loadQuery's own sanitizePerspective accepts.
    assert.deepEqual(sanitizePerspective('["rABC","drafts"]'), [
      "rABC",
      "drafts",
    ]);
  },
);

console.log(`check-preview-session: ok (${passed} checks)`);
