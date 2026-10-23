const crypto = require("crypto");

const SESSION_TTL_SECONDS = 8 * 60 * 60;
const PASSWORD_HASH_PATTERN = /^scrypt\$([a-f0-9]{32})\$([a-f0-9]{128})$/i;

function createPasswordHash(password, salt = crypto.randomBytes(16)) {
  if (typeof password !== "string" || password.length < 12)
    throw new TypeError("Passwords must contain at least 12 characters");
  const saltBuffer = Buffer.isBuffer(salt) ? salt : Buffer.from(salt, "hex");
  if (saltBuffer.length !== 16)
    throw new TypeError("Password salt must be 16 bytes");
  const digest = crypto.scryptSync(password, saltBuffer, 64);
  return `scrypt$${saltBuffer.toString("hex")}$${digest.toString("hex")}`;
}

function verifyPassword(password, encodedHash) {
  if (typeof password !== "string" || typeof encodedHash !== "string")
    return false;
  const match = PASSWORD_HASH_PATTERN.exec(encodedHash);
  if (!match) return false;
  const salt = Buffer.from(match[1], "hex");
  const expected = Buffer.from(match[2], "hex");
  const actual = crypto.scryptSync(password, salt, expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

function credentialConfiguration(environment) {
  const accounts = {};
  let complete = true;
  for (const role of ["admin", "owner"]) {
    const prefix = role.toUpperCase();
    const username = String(environment[`${prefix}_USERNAME`] || "").trim();
    const passwordHash = String(environment[`${prefix}_PASSWORD_HASH`] || "");
    if (!username && !passwordHash) {
      complete = false;
      continue;
    }
    if (
      !username ||
      username.length > 64 ||
      !PASSWORD_HASH_PATTERN.test(passwordHash)
    ) {
      complete = false;
      continue;
    }
    accounts[role] = { role, username, passwordHash };
  }
  const usernames = Object.values(accounts).map((account) =>
    account.username.toLowerCase(),
  );
  const duplicateUsernames = new Set(usernames).size !== usernames.length;
  const sessionSecret = String(environment.SESSION_SECRET || "");
  return {
    accounts,
    configured:
      complete &&
      Object.keys(accounts).length === 2 &&
      !duplicateUsernames &&
      Buffer.byteLength(sessionSecret) >= 32,
    duplicateUsernames,
    sessionSecret,
  };
}

function createSessionToken(user, secret, now = Date.now()) {
  if (!user || !["admin", "owner"].includes(user.role) || !user.username)
    throw new TypeError("A valid workshop user is required");
  if (Buffer.byteLength(String(secret || "")) < 32)
    throw new TypeError("SESSION_SECRET must contain at least 32 bytes");
  const payload = Buffer.from(
    JSON.stringify({
      username: user.username,
      role: user.role,
      expiresAt: Math.floor(now / 1000) + SESSION_TTL_SECONDS,
    }),
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

function verifySessionToken(token, secret, now = Date.now()) {
  if (
    typeof token !== "string" ||
    token.length > 2048 ||
    Buffer.byteLength(String(secret || "")) < 32
  )
    return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest();
  let received;
  try {
    received = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (
    received.length !== expected.length ||
    !crypto.timingSafeEqual(received, expected)
  )
    return null;
  try {
    const user = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      !user ||
      !["admin", "owner"].includes(user.role) ||
      typeof user.username !== "string" ||
      !user.username ||
      !Number.isInteger(user.expiresAt) ||
      user.expiresAt <= Math.floor(now / 1000)
    )
      return null;
    return { username: user.username, role: user.role };
  } catch {
    return null;
  }
}

module.exports = {
  SESSION_TTL_SECONDS,
  createPasswordHash,
  createSessionToken,
  credentialConfiguration,
  verifyPassword,
  verifySessionToken,
};
