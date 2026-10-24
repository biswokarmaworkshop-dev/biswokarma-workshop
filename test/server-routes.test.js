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
  assert.match(html, /Vehicle Service & Spare Parts/);
  assert.match(html, /site\.js\?v=20261024-password-eye-6/);
  assert.doesNotMatch(html, /Kunal|Hydraulic Pump/);

  const publicSettings = await fetch(`${origin}/api/public/settings`);
  assert.deepEqual(await publicSettings.json(), {
    email: "biswokarmaworkshop@gmail.com",
    phonePrimary: "9866389738",
    phoneSecondary: "9806567713",
    address: "Khol Khole, Gorkha 8, Gandaki Province, Nepal",
  });

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

  const incompleteServiceRequest = await fetch(`${origin}/api/service-requests`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({
      name: "Test Driver",
      phone: "9800000001",
      motorcycle: "JCB",
      part: "On-site service",
      details: "Hydraulic service requested.",
      serviceLocation: "Khol Khole, near the workshop",
    }),
  });
  assert.equal(incompleteServiceRequest.status, 400);

  const serviceRequestResponse = await fetch(`${origin}/api/service-requests`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({
      name: "Test Driver",
      phone: "9800000001",
      motorcycle: "JCB",
      part: "On-site service",
      details: "Hydraulic service requested.",
      serviceLocation: "Khol Khole, near the workshop",
      coverageConfirmed: true,
    }),
  });
  assert.equal(serviceRequestResponse.status, 201);
  const serviceRequest = (await serviceRequestResponse.json()).inquiry;
  assert.match(serviceRequest.id, /^[0-9a-f-]{36}$/i);

  const savedInquiries = await fetch(`${origin}/api/workshop/state`, {
    headers: { cookie: adminCookie },
  });
  const savedInquiryRecords = (await savedInquiries.json()).state.inquiries;
  assert.equal(savedInquiryRecords[0].id, serviceRequest.id);
  assert.equal(savedInquiryRecords[0].kind, "vehicle-service");
  assert.equal(savedInquiryRecords[0].serviceLocation, "Khol Khole, near the workshop");

  const saveParts = await fetch(`${origin}/api/workshop/state`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      origin,
      cookie: adminCookie,
    },
    body: JSON.stringify({
      key: "parts",
      value: [{ id: "part-test", name: "Saved part", sku: "TEST-1", price: 113, stock: 3 }],
    }),
  });
  assert.equal(saveParts.status, 200);
  const adminSettingsWrite = await fetch(`${origin}/api/workshop/state`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      origin,
      cookie: adminCookie,
    },
    body: JSON.stringify({ key: "settings", value: { email: "admin@example.com" } }),
  });
  assert.equal(adminSettingsWrite.status, 403);
  const adminBillingWrite = await fetch(`${origin}/api/workshop/state`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      origin,
      cookie: adminCookie,
    },
    body: JSON.stringify({ key: "bills", value: [] }),
  });
  assert.equal(adminBillingWrite.status, 200);

  const invoiceResponse = await fetch(`${origin}/api/workshop/invoices`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      cookie: adminCookie,
    },
    body: JSON.stringify({
      invoiceNo: "TEST-INVOICE-1",
      customerName: "Invoice Rider",
      customerPhone: "9811111111",
      itemId: "part-test",
      quantity: 2,
      method: "Cash",
    }),
  });
  assert.equal(invoiceResponse.status, 201);
  const invoiceResult = await invoiceResponse.json();
  assert.equal(invoiceResult.invoice.total, 226);
  assert.equal(invoiceResult.invoice.taxableAmount, 200);
  assert.equal(invoiceResult.invoice.vatAmount, 26);
  assert.equal(invoiceResult.part.stock, 1);

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
  assert.equal(ownerData.bills[0].invoiceNo, "TEST-INVOICE-1");
  assert.equal(ownerData.orders[0].invoiceNo, "TEST-INVOICE-1");
  assert.ok(ownerData.inquiries.some((inquiry) => inquiry.name === "Test Rider"));
  assert.ok(ownerData.inquiries.some((inquiry) => inquiry.name === "Test Driver"));
  const saveBills = await fetch(`${origin}/api/workshop/state`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      origin,
      cookie: ownerCookie,
    },
    body: JSON.stringify({ key: "bills", value: [] }),
  });
  assert.equal(saveBills.status, 403);
  const ownerCreateInvoice = await fetch(`${origin}/api/workshop/invoices`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      cookie: ownerCookie,
    },
    body: JSON.stringify({
      invoiceNo: "OWNER-INVOICE",
      customerName: "Owner Rider",
      itemId: "part-test",
      quantity: 1,
    }),
  });
  assert.equal(ownerCreateInvoice.status, 403);
  const saveSettings = await fetch(`${origin}/api/workshop/state`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      origin,
      cookie: ownerCookie,
    },
    body: JSON.stringify({
      key: "settings",
      value: {
        email: "service@example.com",
        phonePrimary: "9800000000",
        phoneSecondary: "9811111111",
        address: "Gorkha, Nepal",
        privateNote: "must not be public",
      },
    }),
  });
  assert.equal(saveSettings.status, 200);
  assert.deepEqual(
    await (await fetch(`${origin}/api/public/settings`)).json(),
    {
      email: "service@example.com",
      phonePrimary: "9800000000",
      phoneSecondary: "9811111111",
      address: "Gorkha, Nepal",
    },
  );

  const logout = await fetch(`${origin}/api/auth/logout`, {
    method: "POST",
    headers: { "content-type": "application/json", origin, cookie: ownerCookie },
    body: "{}",
  });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const invalidPassword = await fetch(`${origin}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({
        role: "admin",
        username: "route-admin",
        password: "DefinitelyWrongPassword#1",
      }),
    });
    assert.equal(invalidPassword.status, 401);
  }
  const lockedLogin = await fetch(`${origin}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({
      role: "admin",
      username: "route-admin",
      password: "AdminRoutePassword#301",
    }),
  });
  assert.equal(lockedLogin.status, 429);

  const sessionAsset = await fetch(`${origin}/vendor/session.js`);
  assert.equal(sessionAsset.status, 200);
  assert.match(await sessionAsset.text(), /BiswokarmaSession/);
});
