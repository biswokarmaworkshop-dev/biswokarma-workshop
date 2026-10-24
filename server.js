require("dotenv").config();
const crypto = require("crypto");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const https = require("https");

const port = process.env.PORT || 3000;
const htmlFile = path.join(__dirname, "site.html");
const localDatabaseFile = path.resolve(
  process.env.WORKSHOP_STATE_FILE ||
    path.join(__dirname, "workshop-state.json"),
);
const vendorDirectory = path.join(__dirname, "vendor");
const imagesDirectory = path.join(__dirname, "images");
const motorcycleProductCatalog = require("./data/motorcycle-parts.json");
const { catalogListing } = require("./vendor/catalog");
const { createInvoice } = require("./vendor/invoices");
const {
  createSessionToken,
  credentialConfiguration,
  verifyPassword,
  verifySessionToken,
} = require("./vendor/auth");
const loginAttempts = new Map();
const inquiryAttempts = new Map();
const ownerOnlyStateKeys = new Set(["purchases", "settings"]);
const adminOnlyWriteStateKeys = new Set(["bills", "orders"]);
const defaultPublicSettings = {
  email: "biswokarmaworkshop@gmail.com",
  phonePrimary: "9866389738",
  phoneSecondary: "9806567713",
  address: "Khol Khole, Gorkha 8, Gandaki Province, Nepal",
};
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
    })
  : null;

async function initDatabase() {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE TABLE IF NOT EXISTS workshop_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        state JSONB NOT NULL DEFAULT '{}'::jsonb,
        version BIGINT NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS workshop_state_audit (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        state_key TEXT NOT NULL,
        value JSONB,
        version BIGINT NOT NULL,
        changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS workshop_state_audit_key_time_idx
        ON workshop_state_audit (state_key, changed_at DESC);
      CREATE TABLE IF NOT EXISTS payment_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id TEXT UNIQUE NOT NULL,
        provider TEXT NOT NULL CHECK (provider IN ('esewa', 'fonepay', 'khalti', 'bank')),
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
        currency TEXT NOT NULL DEFAULT 'NPR',
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
        transaction_id TEXT,
        provider_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS payment_orders_status_idx ON payment_orders (status, created_at DESC);
    `);
    console.log("Database tables initialized successfully.");
  } catch (error) {
    console.error("Database initialization error:", error.message);
  }
}

function json(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function readCookie(request, name) {
  const cookieHeader = request.headers.cookie || "";
  for (const entry of cookieHeader.split(";")) {
    const separator = entry.indexOf("=");
    if (separator < 0) continue;
    if (entry.slice(0, separator).trim() === name)
      return entry.slice(separator + 1).trim();
  }
  return "";
}

function currentUser(request) {
  const configuration = credentialConfiguration(process.env);
  if (!configuration.configured) return null;
  const user = verifySessionToken(
    readCookie(request, "bw_session"),
    configuration.sessionSecret,
  );
  if (!user) return null;
  const account = configuration.accounts[user.role];
  return account && account.username === user.username ? user : null;
}

function isSameOrigin(request) {
  const origin = request.headers.origin;
  if (typeof origin !== "string" || !request.headers.host) return false;
  try {
    const url = new URL(origin);
    const protocol =
      process.env.NODE_ENV === "production"
        ? "https:"
        : request.socket.encrypted
          ? "https:"
          : "http:";
    return url.origin === `${protocol}//${request.headers.host}`;
  } catch {
    return false;
  }
}

function rateLimit(map, request, key, limit, windowMs) {
  const address = request.socket.remoteAddress || "unknown";
  const rateKey = `${address}:${key}`;
  const now = Date.now();
  if (map.size > 10000) {
    for (const [existingKey, value] of map) {
      if (now - value.startedAt >= windowMs) map.delete(existingKey);
    }
  }
  const record = map.get(rateKey);
  if (!record || now - record.startedAt >= windowMs) {
    map.set(rateKey, { startedAt: now, count: 1 });
    return true;
  }
  record.count += 1;
  return record.count <= limit;
}

function sessionCookie(response, token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.setHeader(
    "Set-Cookie",
    `bw_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${secure}`,
  );
}

function clearSessionCookie(response) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.setHeader(
    "Set-Cookie",
    `bw_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`,
  );
}

function publicSettings(settings = {}) {
  const candidate = settings && typeof settings === "object" && !Array.isArray(settings)
    ? settings
    : {};
  const email = String(candidate.email || defaultPublicSettings.email).trim();
  const phonePrimary = String(candidate.phonePrimary || defaultPublicSettings.phonePrimary).trim();
  const phoneSecondary = String(candidate.phoneSecondary || defaultPublicSettings.phoneSecondary).trim();
  const address = String(candidate.address || defaultPublicSettings.address).trim();
  return {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
      ? email
      : defaultPublicSettings.email,
    phonePrimary: /^[+0-9 ()-]{7,24}$/.test(phonePrimary)
      ? phonePrimary
      : defaultPublicSettings.phonePrimary,
    phoneSecondary: /^[+0-9 ()-]{7,24}$/.test(phoneSecondary)
      ? phoneSecondary
      : defaultPublicSettings.phoneSecondary,
    address: address.length > 0 && address.length <= 180
      ? address
      : defaultPublicSettings.address,
  };
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) reject(new Error("Request too large"));
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function readLocalDatabase() {
  try {
    const value = JSON.parse(fs.readFileSync(localDatabaseFile, "utf8"));
    return {
      state: value.state || {},
      version: Number(value.version) || 0,
      updated_at: value.updated_at || null,
      audit: Array.isArray(value.audit) ? value.audit : [],
    };
  } catch (error) {
    return { state: {}, version: 0, updated_at: null, audit: [] };
  }
}

function writeLocalDatabase(database) {
  const temporaryFile = `${localDatabaseFile}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(database, null, 2), "utf8");
  fs.renameSync(temporaryFile, localDatabaseFile);
}

async function saveStateKey(key, value) {
  if (!pool) {
    const database = readLocalDatabase();
    database.state[key] = value;
    database.version += 1;
    database.updated_at = new Date().toISOString();
    database.audit.unshift({
      key,
      version: database.version,
      changed_at: database.updated_at,
    });
    database.audit = database.audit.slice(0, 500);
    writeLocalDatabase(database);
    return database;
  }
  const result = await pool.query(
    `INSERT INTO workshop_state (id, state, version)
     VALUES (1, jsonb_build_object($1::text, $2::jsonb), 1)
     ON CONFLICT (id) DO UPDATE SET state = jsonb_set(workshop_state.state, ARRAY[$1::text], $2::jsonb, true), version = workshop_state.version + 1, updated_at = NOW()
     RETURNING state, version, updated_at`,
    [key, JSON.stringify(value)],
  );
  await pool.query(
    "INSERT INTO workshop_state_audit (state_key, value, version) VALUES ($1, $2::jsonb, $3)",
    [key, JSON.stringify(value), result.rows[0].version],
  );
  return result.rows[0];
}

async function saveInquiry(inquiry) {
  if (!pool) {
    const database = readLocalDatabase();
    const inquiries = Array.isArray(database.state.inquiries)
      ? database.state.inquiries
      : [];
    inquiries.unshift(inquiry);
    database.state.inquiries = inquiries.slice(0, 500);
    database.version += 1;
    database.updated_at = new Date().toISOString();
    database.audit.unshift({
      key: "inquiries",
      version: database.version,
      changed_at: database.updated_at,
    });
    database.audit = database.audit.slice(0, 500);
    writeLocalDatabase(database);
    return inquiry;
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO workshop_state (id, state, version) VALUES (1, '{}'::jsonb, 1) ON CONFLICT (id) DO NOTHING",
    );
    const current = await client.query(
      "SELECT state, version FROM workshop_state WHERE id = 1 FOR UPDATE",
    );
    const inquiries = Array.isArray(current.rows[0].state.inquiries)
      ? current.rows[0].state.inquiries
      : [];
    inquiries.unshift(inquiry);
    const nextInquiries = inquiries.slice(0, 500);
    const updated = await client.query(
      "UPDATE workshop_state SET state = jsonb_set(state, '{inquiries}', $1::jsonb, true), version = version + 1, updated_at = NOW() WHERE id = 1 RETURNING version",
      [JSON.stringify(nextInquiries)],
    );
    await client.query(
      "INSERT INTO workshop_state_audit (state_key, value, version) VALUES ('inquiries', $1::jsonb, $2)",
      [JSON.stringify(inquiry), updated.rows[0].version],
    );
    await client.query("COMMIT");
    return inquiry;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function recordInvoice(body) {
  if (!pool) {
    const database = readLocalDatabase();
    const result = createInvoice(database.state, body);
    database.version += 1;
    database.updated_at = new Date().toISOString();
    for (const key of ["parts", "bills", "orders", "customers"]) {
      database.audit.unshift({
        key,
        version: database.version,
        changed_at: database.updated_at,
      });
    }
    database.audit = database.audit.slice(0, 500);
    writeLocalDatabase(database);
    return result;
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO workshop_state (id, state, version) VALUES (1, '{}'::jsonb, 1) ON CONFLICT (id) DO NOTHING",
    );
    const current = await client.query(
      "SELECT state, version FROM workshop_state WHERE id = 1 FOR UPDATE",
    );
    const state = current.rows[0].state || {};
    const result = createInvoice(state, body);
    const updated = await client.query(
      "UPDATE workshop_state SET state = $1::jsonb, version = version + 1, updated_at = NOW() WHERE id = 1 RETURNING version",
      [JSON.stringify(state)],
    );
    for (const key of ["parts", "bills", "orders", "customers"]) {
      await client.query(
        "INSERT INTO workshop_state_audit (state_key, value, version) VALUES ($1, $2::jsonb, $3)",
        [key, JSON.stringify(state[key]), updated.rows[0].version],
      );
    }
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

const gatewayConfig = {
  esewa: Boolean(
    process.env.ESEWA_MERCHANT_CODE && process.env.ESEWA_SECRET_KEY,
  ),
  fonepay: Boolean(
    process.env.FONEPAY_MERCHANT_CODE && process.env.FONEPAY_SECRET_KEY,
  ),
  khalti: Boolean(process.env.KHALTI_SECRET_KEY),
  bank: true,
};

function verifyWebhook(body, request) {
  const secret = process.env.WEBHOOK_SECRET;
  const signature = request.headers["x-webhook-signature"];
  if (!secret || !signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(body))
    .digest("hex");
  return (
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  );
}

async function api(request, response, url) {
  if (url.pathname === "/api/public/settings" && request.method === "GET") {
    let settings = {};
    if (pool) {
      const result = await pool.query("SELECT state->'settings' AS settings FROM workshop_state WHERE id = 1");
      settings = result.rows[0]?.settings || {};
    } else {
      settings = readLocalDatabase().state.settings || {};
    }
    response.setHeader("Cache-Control", "public, max-age=60");
    return json(response, 200, publicSettings(settings));
  }
  if (url.pathname === "/api/auth/status" && request.method === "GET") {
    const configuration = credentialConfiguration(process.env);
    return json(response, 200, {
      configured: configuration.configured,
      admin: Boolean(configuration.accounts.admin),
      owner: Boolean(configuration.accounts.owner),
    });
  }
  if (url.pathname === "/api/auth/me" && request.method === "GET") {
    return json(response, 200, { user: currentUser(request) });
  }
  if (url.pathname === "/api/auth/login" && request.method === "POST") {
    if (!isSameOrigin(request))
      return json(response, 403, { error: "Sign-in request origin was rejected" });
    const configuration = credentialConfiguration(process.env);
    if (!configuration.configured)
      return json(response, 503, {
        error: "Admin and Owner accounts are not configured for this website.",
      });
    const body = await readJson(request);
    const role = String(body.role || "");
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (
      !["admin", "owner"].includes(role) ||
      !username ||
      username.length > 64 ||
      !password ||
      password.length > 1024
    )
      return json(response, 400, {
        error: "Choose an account type and enter your username and password.",
      });
    if (!rateLimit(loginAttempts, request, "login", 5, 15 * 60 * 1000))
      return json(response, 429, {
        error: "Too many sign-in attempts. Wait 15 minutes and try again.",
      });
    const account = configuration.accounts[role];
    const usernameMatches =
      account && username.toLowerCase() === account.username.toLowerCase();
    const passwordMatches = verifyPassword(
      password,
      account?.passwordHash ||
        configuration.accounts.owner.passwordHash,
    );
    if (!usernameMatches || !passwordMatches)
      return json(response, 401, {
        error: `The ${role} username or password is incorrect.`,
      });
    loginAttempts.delete(`${String(request.socket.remoteAddress || "unknown")}:login`);
    const token = createSessionToken(
      { username: account.username, role },
      configuration.sessionSecret,
    );
    sessionCookie(response, token);
    return json(response, 200, {
      user: { username: account.username, role },
    });
  }
  if (url.pathname === "/api/auth/logout" && request.method === "POST") {
    if (!isSameOrigin(request))
      return json(response, 403, { error: "Sign-out request origin was rejected" });
    clearSessionCookie(response);
    return json(response, 200, { ok: true });
  }
  if (url.pathname === "/api/catalog/products" && request.method === "GET") {
    response.setHeader("Cache-Control", "public, max-age=300");
    return json(response, 200, {
      products: motorcycleProductCatalog.map((product) =>
        catalogListing(product),
      ),
    });
  }
  if (
    (url.pathname === "/api/inquiries" ||
      url.pathname === "/api/service-requests") &&
    request.method === "POST"
  ) {
    if (!isSameOrigin(request))
      return json(response, 403, { error: "Inquiry request origin was rejected" });
    if (!rateLimit(inquiryAttempts, request, "inquiry", 5, 15 * 60 * 1000))
      return json(response, 429, {
        error: "Too many inquiries from this connection. Please call the workshop.",
      });
    const body = await readJson(request);
    const serviceRequest = url.pathname === "/api/service-requests";
    const inquiry = {
      id: crypto.randomUUID(),
      kind: serviceRequest ? "vehicle-service" : "general",
      name: String(body.name || "").trim().slice(0, 100),
      phone: String(body.phone || "").trim().slice(0, 40),
      motorcycle: String(body.motorcycle || "").trim().slice(0, 120),
      part: String(body.part || "").trim().slice(0, 120),
      details: String(body.details || "").trim().slice(0, 1000),
      serviceLocation: String(body.serviceLocation || "").trim().slice(0, 240),
      coverageConfirmed: body.coverageConfirmed === true,
      status: "New",
      createdAt: new Date().toISOString(),
    };
    if (
      inquiry.name.length < 2 ||
      inquiry.phone.length < 5 ||
      inquiry.details.length < 5
    )
      return json(response, 400, {
        error: "Enter your name, phone number and request details.",
      });
    if (
      serviceRequest &&
      (!inquiry.motorcycle ||
        !inquiry.part ||
        !inquiry.serviceLocation ||
        !inquiry.coverageConfirmed)
    )
      return json(response, 400, {
        error: "Enter the vehicle, service, and location, and confirm the approximate 24 km service area.",
      });
    await saveInquiry(inquiry);
    return json(response, 201, {
      inquiry: { id: inquiry.id, status: inquiry.status },
    });
  }
  if (url.pathname === "/api/workshop/invoices" && request.method === "POST") {
    const user = currentUser(request);
    if (!user)
      return json(response, 401, { error: "Sign in to create an invoice." });
    if (user.role !== "admin")
      return json(response, 403, { error: "Admin access is required to create invoices." });
    if (!isSameOrigin(request))
      return json(response, 403, { error: "Invoice request origin was rejected." });
    const body = await readJson(request);
    try {
      return json(response, 201, await recordInvoice(body));
    } catch (error) {
      if (error instanceof TypeError || error instanceof RangeError)
        return json(response, 400, { error: error.message });
      throw error;
    }
  }
  if (url.pathname === "/api/health" && request.method === "GET") {
    if (!pool)
      return json(response, 200, {
        ok: true,
        database: "local-file",
        file: path.basename(localDatabaseFile),
        message: "Configure DATABASE_URL for PostgreSQL production storage.",
      });
    await pool.query("SELECT 1");
    return json(response, 200, { ok: true, database: "postgresql" });
  }
  if (url.pathname === "/api/workshop/state" && request.method === "GET") {
    const user = currentUser(request);
    if (!user)
      return json(response, 401, { error: "Sign in to access workshop records." });
    let database;
    if (pool) {
      const result = await pool.query(
        "SELECT state, version, updated_at FROM workshop_state WHERE id = 1",
      );
      database = result.rows[0] || { state: {}, version: 0 };
    } else {
      database = readLocalDatabase();
    }
    if (user.role === "admin") {
      const state = { ...(database.state || {}) };
      for (const key of ownerOnlyStateKeys) delete state[key];
      return json(response, 200, { ...database, state });
    }
    return json(response, 200, database);
  }
  if (url.pathname === "/api/workshop/state" && request.method === "PUT") {
    const user = currentUser(request);
    if (!user)
      return json(response, 401, { error: "Sign in to update workshop records." });
    if (!isSameOrigin(request))
      return json(response, 403, { error: "State update origin was rejected" });
    const body = await readJson(request);
    if (
      typeof body.key !== "string" ||
      !/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(body.key) ||
      body.value === undefined
    )
      return json(response, 400, { error: "key and value are required" });
    if (user.role !== "owner" && ownerOnlyStateKeys.has(body.key))
      return json(response, 403, { error: "Owner access is required." });
    if (user.role !== "admin" && adminOnlyWriteStateKeys.has(body.key))
      return json(response, 403, { error: "Admin access is required." });
    const result = await saveStateKey(body.key, body.value);
    return json(response, 200, result);
  }
  /* ---- eSewa signature verification ---- */
  function esewaVerify(transactionRef, amount, secretKey) {
    return new Promise((resolve, reject) => {
      const msg = `total_amount=${amount},transaction_uuid=${transactionRef},product_code=${process.env.ESEWA_MERCHANT_CODE}`;
      const signature = crypto.createHmac("sha256", secretKey).update(msg).digest("hex");
      const params = new URLSearchParams({
        amt: amount,
        rid: transactionRef,
        refId: transactionRef,
        scd: process.env.ESEWA_MERCHANT_CODE,
        sig: signature,
      });
      const options = {
        hostname: "esewa.com.np",
        path: "/api/epay/transrec",
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(params.toString()) },
      };
      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
      });
      req.on("error", reject);
      req.write(params.toString());
      req.end();
    });
  }

  /* ---- Payment providers ---- */
  if (url.pathname === "/api/payments/providers" && request.method === "GET") {
    return json(response, 200, { providers: gatewayConfig, esewaMerchantCode: process.env.ESEWA_MERCHANT_CODE || null });
  }

  /* ---- Create payment order (supports esewa, khalti, bank) ---- */
  if (url.pathname === "/api/payments/orders" && request.method === "POST") {
    if (!pool) {
      return json(response, 400, {
        error: "Database not configured. Set DATABASE_URL to store payment orders.",
      });
    }
    const body = await readJson(request);
    const amount = Number(body.amount);
    const vat = Number(body.vat || 0);
    const totalAmount = amount + vat;
    if (!body.customerName || !body.customerPhone || !Number.isFinite(totalAmount) || totalAmount <= 0) {
      return json(response, 400, { error: "Valid customerName, customerPhone and positive amount are required" });
    }
    const orderId = `BW-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const provider = body.provider || "bank";
    if (provider !== "bank" && !gatewayConfig[provider]) {
      return json(response, 400, { error: `${provider} payment gateway is not configured yet. Add API keys to Render environment variables.` });
    }
    const result = await pool.query(
      "INSERT INTO payment_orders (order_id, provider, customer_name, customer_phone, amount) VALUES ($1, $2, $3, $4, $5) RETURNING order_id, provider, amount, currency, status, created_at",
      [orderId, provider, String(body.customerName).trim(), String(body.customerPhone).trim(), totalAmount],
    );
    const order = result.rows[0];

    /* eSewa: build redirect URL */
    if (provider === "esewa" && process.env.ESEWA_MERCHANT_CODE && process.env.ESEWA_SECRET_KEY) {
      const amt = totalAmount;
      const refId = orderId;
      const productCode = process.env.ESEWA_MERCHANT_CODE;
      const msg = `total_amount=${amt},transaction_uuid=${refId},product_code=${productCode}`;
      const signature = crypto.createHmac("sha256", process.env.ESEWA_SECRET_KEY).update(msg).digest("hex");
      const esewaUrl = `https://esewa.com.np/pay?amt=${amt}&dc=0&pc=${productCode}&scd=${productCode}&rid=${refId}&scm=0&su=${encodeURIComponent((url.origin || "https://biswokarma-workshop-1.onrender.com") + "/payments/esewa/success")}&fu=${encodeURIComponent((url.origin || "https://biswokarma-workshop-1.onrender.com") + "/payments/esewa/failure")}&sig=${encodeURIComponent(signature)}`;
      return json(response, 201, { order, esewaUrl, message: "Redirect customer to eSewa for payment" });
    }

    /* Khalti: build redirect URL */
    if (provider === "khalti" && process.env.KHALTI_SECRET_KEY) {
      return json(response, 201, { order, message: "Khalti integration pending - add KHALTI_SECRET_KEY to Render" });
    }

    return json(response, 201, { order, message: "Bank transfer order created. Share bank details with customer." });
  }

  /* ---- eSewa payment callback ---- */
  if (url.pathname === "/api/payments/callback/esewa" && request.method === "GET") {
    if (!pool) {
      return json(response, 400, { error: "Database not configured for payment verification." });
    }
    const params = new URLSearchParams(url.search);
    const refId = params.get("refId") || params.get("rid") || "";
    const amt = params.get("amt") || "0";
    if (!refId) return json(response, 400, { error: "Missing reference ID" });
    try {
      const verifyResult = await esewaVerify(refId, amt, process.env.ESEWA_SECRET_KEY);
      if (verifyResult && verifyResult.response_code === "000") {
        await pool.query(
          "UPDATE payment_orders SET status = 'success', transaction_id = $1, updated_at = NOW() WHERE order_id = $2",
          [refId, refId],
        );
        return json(response, 200, { status: "success", orderId: refId, message: "Payment verified and recorded!" });
      } else {
        await pool.query(
          "UPDATE payment_orders SET status = 'failed', transaction_id = $1, updated_at = NOW() WHERE order_id = $2",
          [refId, refId],
        );
        return json(response, 200, { status: "failed", orderId: refId, message: "Payment verification failed." });
      }
    } catch (err) {
      console.error("eSewa verification error:", err.message);
      return json(response, 500, { error: "Payment verification error" });
    }
  }

  /* ---- Generic callback for webhooks ---- */
  const paymentCallback = url.pathname.match(
    /^\/api\/payments\/orders\/([^/]+)\/callback$/,
  );
  if (paymentCallback && request.method === "POST") {
    if (!pool) {
      return json(response, 400, { error: "Database not configured for payment webhooks." });
    }
    const body = await readJson(request);
    if (!verifyWebhook(body, request))
      return json(response, 401, { error: "Invalid webhook signature" });
    if (!["pending", "success", "failed"].includes(body.status))
      return json(response, 400, { error: "Invalid payment status" });
    const result = await pool.query(
      "UPDATE payment_orders SET status = $1, transaction_id = COALESCE($2, transaction_id), provider_payload = $3::jsonb, updated_at = NOW() WHERE order_id = $4 RETURNING *",
      [body.status, body.transactionId || null, JSON.stringify(body), paymentCallback[1]],
    );
    return json(response, result.rowCount ? 200 : 404, result.rowCount ? result.rows[0] : { error: "Payment order not found" });
  }
  return json(response, 404, { error: "API route not found" });
}

const server = http.createServer((request, response) => {
  const url = new URL(
    request.url,
    `http://${request.headers.host || "localhost"}`,
  );
  if (url.pathname.startsWith("/api/"))
    return api(request, response, url).catch((error) =>
      json(response, 500, {
        error: "Server error",
        detail:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      }),
    );
  /* ---- Google Search Console verification ---- */
  const googleVerify = url.pathname.match(/^\/(google[0-9a-f]+\.html)$/);
  if (googleVerify && request.method === "GET") {
    const filePath = path.join(__dirname, googleVerify[1]);
    return fs.readFile(filePath, (error, content) => {
      if (error) return json(response, 404, { error: "Verification file not found" });
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(content);
    });
  }
  if (url.pathname === "/robots.txt") {
    const robotsContent = `User-agent: *
 Allow: /
 Disallow: /api/

 Sitemap: https://biswokarma-workshop-1.onrender.com/sitemap.xml`;
    response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    return response.end(robotsContent);
  }
  if (url.pathname === "/sitemap.xml") {
    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://biswokarma-workshop-1.onrender.com/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
    response.writeHead(200, { "Content-Type": "application/xml; charset=utf-8" });
    return response.end(sitemapContent);
  }
  if (url.pathname.startsWith("/images/")) {
    const requestedFile = path.resolve(
      imagesDirectory,
      decodeURIComponent(url.pathname.slice("/images/".length)),
    );
    if (!requestedFile.startsWith(`${imagesDirectory}${path.sep}`))
      return json(response, 400, { error: "Invalid image path" });
    return fs.readFile(requestedFile, (error, content) => {
      if (error) return json(response, 404, { error: "Image not found" });
      const ext = path.extname(requestedFile).toLowerCase();
      const types = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" };
      response.writeHead(200, {
        "Content-Type": (types[ext] || "application/octet-stream") + "; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      });
      response.end(content);
    });
  }
  if (url.pathname.startsWith("/vendor/")) {
    const requestedFile = path.resolve(
      vendorDirectory,
      decodeURIComponent(url.pathname.slice("/vendor/".length)),
    );
    if (!requestedFile.startsWith(`${vendorDirectory}${path.sep}`))
      return json(response, 400, { error: "Invalid vendor path" });
    return fs.readFile(requestedFile, (error, content) => {
      if (error) return json(response, 404, { error: "Asset not found" });
      response.writeHead(200, {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=31536000, immutable",
      });
      response.end(content);
    });
  }
  const productRoute = /^\/products\/[a-z0-9-]+\/?$/i.test(url.pathname);
  if (
    url.pathname !== "/" &&
    url.pathname !== "/index.html" &&
    !productRoute
  )
    return json(response, 404, { error: "Not found" });
  fs.readFile(htmlFile, (error, content) => {
    if (error) {
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      return response.end("Unable to load the workshop page");
    }
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(content);
  });
});

if (require.main === module) {
  initDatabase().then(() => {
    server.listen(port, "0.0.0.0", () => {
      console.log(`Biswokarma Workshop running at http://localhost:${port}`);
      const nets = require("os").networkInterfaces();
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          if (net.family === "IPv4" && !net.internal) {
            console.log(`LAN access: http://${net.address}:${port}`);
          }
        }
      }
    });
  });
}

module.exports = { server };
