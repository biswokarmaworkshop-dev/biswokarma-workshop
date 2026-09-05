require("dotenv").config();
const crypto = require("crypto");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const port = process.env.PORT || 3000;
const htmlFile = path.join(__dirname, "biswokarma-workshop (1).html");
const localDatabaseFile = path.join(__dirname, "workshop-state.json");
const vendorDirectory = path.join(__dirname, "vendor");
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
    if (!pool) return json(response, 200, readLocalDatabase());
    const result = await pool.query(
      "SELECT state, version, updated_at FROM workshop_state WHERE id = 1",
    );
    return json(response, 200, result.rows[0] || { state: {}, version: 0 });
  }
  if (url.pathname === "/api/workshop/state" && request.method === "PUT") {
    const body = await readJson(request);
    if (!body.key || body.value === undefined)
      return json(response, 400, { error: "key and value are required" });
    if (!pool) {
      const database = readLocalDatabase();
      database.state[body.key] = body.value;
      database.version += 1;
      database.updated_at = new Date().toISOString();
      database.audit.unshift({
        key: body.key,
        version: database.version,
        changed_at: database.updated_at,
      });
      database.audit = database.audit.slice(0, 500);
      writeLocalDatabase(database);
      return json(response, 200, database);
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `INSERT INTO workshop_state (id, state, version)
         VALUES (1, jsonb_build_object($1::text, $2::jsonb), 1)
         ON CONFLICT (id) DO UPDATE SET state = jsonb_set(workshop_state.state, ARRAY[$1::text], $2::jsonb, true), version = workshop_state.version + 1, updated_at = NOW()
         RETURNING state, version, updated_at`,
        [body.key, JSON.stringify(body.value)],
      );
      await client.query(
        "INSERT INTO workshop_state_audit (state_key, value, version) VALUES ($1, $2::jsonb, $3)",
        [body.key, JSON.stringify(body.value), result.rows[0].version],
      );
      await client.query("COMMIT");
      return json(response, 200, result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  if (url.pathname === "/api/payments/providers" && request.method === "GET") {
    return json(response, 200, { providers: gatewayConfig });
  }
  if (url.pathname === "/api/payments/orders" && request.method === "POST") {
    const body = await readJson(request);
    const amount = Number(body.amount);
    if (
      !gatewayConfig[body.provider] ||
      !body.customerName ||
      !body.customerPhone ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return json(response, 400, {
        error:
          "Valid provider, customerName, customerPhone and positive amount are required",
        providers: gatewayConfig,
      });
    }
    const orderId = `BW-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const result = await pool.query(
      "INSERT INTO payment_orders (order_id, provider, customer_name, customer_phone, amount) VALUES ($1, $2, $3, $4, $5) RETURNING order_id, provider, amount, currency, status, created_at",
      [
        orderId,
        body.provider,
        String(body.customerName).trim(),
        String(body.customerPhone).trim(),
        amount,
      ],
    );
    return json(response, 201, {
      order: result.rows[0],
      message:
        body.provider === "bank"
          ? "Bank transfer order created"
          : "Gateway order created; provider credentials are configured",
    });
  }
  const paymentCallback = url.pathname.match(
    /^\/api\/payments\/orders\/([^/]+)\/callback$/,
  );
  if (paymentCallback && request.method === "POST") {
    const body = await readJson(request);
    if (!verifyWebhook(body, request))
      return json(response, 401, { error: "Invalid webhook signature" });
    if (!["pending", "success", "failed"].includes(body.status))
      return json(response, 400, { error: "Invalid payment status" });
    const result = await pool.query(
      "UPDATE payment_orders SET status = $1, transaction_id = COALESCE($2, transaction_id), provider_payload = $3::jsonb, updated_at = NOW() WHERE order_id = $4 RETURNING *",
      [
        body.status,
        body.transactionId || null,
        JSON.stringify(body),
        paymentCallback[1],
      ],
    );
    return json(
      response,
      result.rowCount ? 200 : 404,
      result.rowCount ? result.rows[0] : { error: "Payment order not found" },
    );
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
  if (url.pathname !== "/" && url.pathname !== "/index.html")
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
