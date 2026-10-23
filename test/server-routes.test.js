const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createPasswordHash } = require("../vendor/auth");

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "biswokarma-routes-"));
const originalEnvironment = {
  ADMIN_USERNAME: process.env.ADMIN_USERNAME,
  ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
  OWNER_USERNAME: process.env.OWNER_USERNAME,
  OWNER_PASSWORD_HASH: process.env.OWNER_PASSWORD_HASH,
  SESSION_SECRET: process.env.SESSION_SECRET,
  WORKSHOP_STATE_FILE: process.env.WORKSHOP_STATE_FILE,
};
const salt = Buffer.alloc(16, 4);
process.env.ADMIN_USERNAME = "route-admin";
process.env.ADMIN_PASSWORD_HASH = createPasswordHash("AdminRoutePassword#301", salt);
process.env.OWNER_USERNAME = "route-owner";
process.env.OWNER_PASSWORD_HASH = createPasswordHash(
  "OwnerRoutePassword#402",
  Buffer.alloc(16, 5),
);
process.env.SESSION_SECRET = "server-route-test-secret-contains-more-than-32-bytes";
process.env.WORKSHOP_STATE_FILE = path.join(testDirectory, "state.json");

const { server } = require("../server");
const products = require("../data/motorcycle-parts.json");

function restoreEnvironment() {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

test("serves the public workshop, motorcycle catalog, authenticated workspace and inquiry routes", async (t) => {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
      server.closeAllConnections();
    });
    restoreEnvironment();
    fs.rmSync(testDirectory, { recursive: true, force: true });
  });
  const origin = `http://127.0.0.1:${server.address().port}`;

  const home = await fetch(origin);
  assert.equal(home.status, 200);
  assert.match(home.headers.get("content-type"), /text\/html/);
  const html = await home.text();
  assert.match(html, /Motorcycle Parts & Service/);
  assert.match(html, /site\.js\?v=20261023-motorcycle-workshop/);
  assert.doesNotMatch(html, /Kunal|Hydraulic Pump/);

  const status = await fetch(`${origin}/api/auth/status`);
  assert.deepEqual(await status.json(), {
    configured: true,
    admin: true,
    owner: true,
  });
  assert.equal((await fetch(`${origin}/api/workshop/state`)).status, 401);

  const catalogResponse = await fetch(`${origin}/api/catalog/products`);
  assert.equal(catalogResponse.status, 200);
  assert.match(catalogResponse.headers.get("cache-control"), /max-age=300/);
  const catalog = await catalogResponse.json();
  assert.equal(catalog.products.length, products.length);
  assert.equal(catalog.products[0].name, "Brake Pad Set");
  assert.equal(catalog.products[0].catalogSource, "demo_catalog");
  assert.equal(catalog.products[0].priceNpr, null);
  assert.equal(catalog.products[0].stock, null);
  assert.deepEqual(catalog.products[0].compatibleModels, []);
  assert.doesNotMatch(JSON.stringify(catalog), /JCB/);

  const assetResponse = await fetch(`${origin}/vendor/site.js`);
  assert.equal(assetResponse.status, 200);
  assert.match(assetResponse.headers.get("content-type"), /javascript/);
  assert.match(await assetResponse.text(), /function WorkshopSite/);

  const invalidOrigin = await fetch(`${origin}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://attacker.example" },
    body: JSON.stringify({ role: "admin", username: "route-admin", password: "AdminRoutePassword#301" }),
  });
  assert.equal(invalidOrigin.status, 403);

  const loginResponse = await fetch(`${origin}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ role: "admin", username: "route-admin", password: "AdminRoutePassword#301" }),
  });
  assert.equal(loginResponse.status, 200);
  assert.match(loginResponse.headers.get("set-cookie"), /HttpOnly/);
  assert.match(loginResponse.headers.get("set-cookie"), /SameSite=Strict/);
  const adminCookie = loginResponse.headers.get("set-cookie").split(";")[0];
  assert.deepEqual(
    await (await fetch(`${origin}/api/auth/me`, { headers: { cookie: adminCookie } })).json(),
    { user: { username: "route-admin", role: "admin" } },
  );

  const adminState = await fetch(`${origin}/api/workshop/state`, {
    headers: { cookie: adminCookie },
  });
  assert.equal(adminState.status, 200);
  assert.deepEqual((await adminState.json()).state, {});

  const inquiryResponse = await fetch(`${origin}/api/inquiries`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({
      name: "Test Rider",
      phone: "9800000000",
      motorcycle: "Make and model to confirm",
      part: "Brake Pad Set",
      details: "Please check fitment and send a quote.",
    }),
  });
  assert.equal(inquiryResponse.status, 201);
  assert.match((await inquiryResponse.json()).inquiry.id, /^[0-9a-f-]{36}$/i);

  const saveParts = await fetch(`${origin}/api/workshop/state`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      origin,
      cookie: adminCookie,
    },
    body: JSON.stringify({ key: "parts", value: [{ id: "part-test", name: "Saved part" }] }),
  });
  assert.equal(saveParts.status, 200);
  const adminBillingWrite = await fetch(`${origin}/api/workshop/state`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      origin,
      cookie: adminCookie,
    },
    body: JSON.stringify({ key: "bills", value: [{ id: "private" }] }),
  });
  assert.equal(adminBillingWrite.status, 403);

  const ownerLogin = await fetch(`${origin}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ role: "owner", username: "route-owner", password: "OwnerRoutePassword#402" }),
  });
  assert.equal(ownerLogin.status, 200);
  const ownerCookie = ownerLogin.headers.get("set-cookie").split(";")[0];
  const ownerState = await fetch(`${origin}/api/workshop/state`, {
    headers: { cookie: ownerCookie },
  });
  const ownerData = (await ownerState.json()).state;
  assert.equal(ownerData.parts[0].name, "Saved part");
  assert.equal(ownerData.inquiries[0].name, "Test Rider");
  const saveBills = await fetch(`${origin}/api/workshop/state`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      origin,
      cookie: ownerCookie,
    },
    body: JSON.stringify({ key: "bills", value: [{ id: "invoice-test" }] }),
  });
  assert.equal(saveBills.status, 200);

  const logout = await fetch(`${origin}/api/auth/logout`, {
    method: "POST",
    headers: { "content-type": "application/json", origin, cookie: ownerCookie },
    body: "{}",
  });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);

  const sessionAsset = await fetch(`${origin}/vendor/session.js`);
  assert.equal(sessionAsset.status, 200);
  assert.match(await sessionAsset.text(), /BiswokarmaSession/);
});
