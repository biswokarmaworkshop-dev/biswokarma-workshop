const test = require("node:test");
const assert = require("node:assert/strict");
const {
  SESSION_TTL_SECONDS,
  createPasswordHash,
  createSessionToken,
  credentialConfiguration,
  verifyPassword,
  verifySessionToken,
} = require("../vendor/auth");

const salt = Buffer.alloc(16, 7);
const sessionSecret = "test-only-session-secret-with-more-than-32-bytes";

test("password hashes use scrypt and do not contain the source password", () => {
  const password = "WorkshopSecurePassword#34";
  const encoded = createPasswordHash(password, salt);
  assert.match(encoded, /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
  assert.doesNotMatch(encoded, /WorkshopSecurePassword/);
  assert.equal(verifyPassword(password, encoded), true);
  assert.equal(verifyPassword("incorrect password", encoded), false);
  assert.equal(verifyPassword(password, "invalid"), false);
  assert.throws(() => createPasswordHash("short", salt), TypeError);
});

test("account configuration requires both unique role credentials and a strong session secret", () => {
  const adminHash = createPasswordHash("AdminWorkshopPassword#34", salt);
  const ownerHash = createPasswordHash("OwnerWorkshopPassword#56", Buffer.alloc(16, 8));
  const environment = {
    ADMIN_USERNAME: "admin",
    ADMIN_PASSWORD_HASH: adminHash,
    OWNER_USERNAME: "owner",
    OWNER_PASSWORD_HASH: ownerHash,
    SESSION_SECRET: sessionSecret,
  };
  assert.equal(credentialConfiguration(environment).configured, true);
  assert.equal(
    credentialConfiguration({ ...environment, OWNER_USERNAME: "ADMIN" }).configured,
    false,
  );
  assert.equal(
    credentialConfiguration({ ...environment, SESSION_SECRET: "short" }).configured,
    false,
  );
  assert.equal(
    credentialConfiguration({ ADMIN_USERNAME: "admin" }).configured,
    false,
  );
});

test("signed sessions preserve roles and reject tampering or expiration", () => {
  const now = Date.UTC(2026, 9, 23);
  const token = createSessionToken(
    { username: "workshop-owner", role: "owner" },
    sessionSecret,
    now,
  );
  assert.deepEqual(verifySessionToken(token, sessionSecret, now), {
    username: "workshop-owner",
    role: "owner",
  });
  assert.equal(verifySessionToken(`${token}x`, sessionSecret, now), null);
  assert.equal(
    verifySessionToken(
      token,
      sessionSecret,
      now + SESSION_TTL_SECONDS * 1000,
    ),
    null,
  );
  assert.throws(
    () =>
      createSessionToken(
        { username: "bad", role: "visitor" },
        sessionSecret,
        now,
      ),
    TypeError,
  );
});
