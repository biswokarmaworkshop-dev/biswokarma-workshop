const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const html = fs.readFileSync(path.join(__dirname, "..", "site.html"), "utf8");
const siteScript = fs.readFileSync(
  path.join(__dirname, "..", "vendor", "site.js"),
  "utf8",
);

test("serves the workshop public site with its accessible responsive app shell", () => {
  assert.match(html, /Biswokarma Workshop \| Vehicle Service & Spare Parts/);
  assert.match(html, /name="viewport".*width=device-width/s);
  assert.match(html, /class="skip-link" href="#main-content"/);
  assert.match(html, /prefers-reduced-motion: reduce/);
  assert.match(html, /max-width: 560px/);
  assert.match(html, /repeating-linear-gradient/);
  assert.match(html, /shadow-inset/);
  assert.match(html, /\/vendor\/metrics\.js\?v=20261024-password-eye-6/);
  assert.match(html, /\/vendor\/site\.js\?v=20261024-password-eye-6/);
  assert.match(html, /\.password-toggle/);
  assert.match(html, /@keyframes hero-light-sweep/);
  assert.match(html, /@keyframes gear-turn/);
  assert.match(html, /@keyframes workshop-mark-float/);
  assert.match(html, /prefers-reduced-motion: reduce/);
  assert.match(html, /\.skip-intro/);
  assert.match(siteScript, /Decorative Biswokarma Workshop mechanical emblem/);
  assert.match(siteScript, /JCB, buses, trucks, tractors, motorcycles and more/);
  assert.match(siteScript, /Other vehicles/);
  assert.match(siteScript, /prefers-reduced-motion: reduce/);
  assert.match(siteScript, /IntersectionObserver/);
  assert.match(siteScript, /Skip intro/);
});

test("public pages include motorcycle references, fitment inquiries and separate role logins", () => {
  assert.match(siteScript, /Spare parts/);
  assert.match(siteScript, /Ask the workshop/);
  assert.match(siteScript, /Admin login/);
  assert.match(siteScript, /Owner login/);
  assert.match(siteScript, /Tell us about your vehicle and what it needs/);
  assert.match(siteScript, /No customer inquiries have been received yet/);
  assert.match(siteScript, /JCB, buses, trucks, tractors, motorcycles and more/);
  assert.match(siteScript, /Vehicle details/);
  assert.match(siteScript, /Browse spare parts/);
  assert.match(siteScript, /#\/service-request\?vehicle=/);
  assert.match(siteScript, /approximately 24 km/);
  assert.match(siteScript, /\/api\/service-requests/);
  assert.match(siteScript, /Sign-in is not configured on the hosting service yet/);
  assert.match(siteScript, /h\("form", \{ className: "login-form", onSubmit: submit \}/);
  assert.doesNotMatch(siteScript, /configured\s*\?\s*h\("form", \{ className: "login-form"/);
  assert.match(siteScript, /className: "password-toggle"/);
  assert.match(siteScript, /aria-label": showPassword \? "Hide password" : "Show password"/);
  assert.match(siteScript, /viewBox: "0 0 24 24"/);
  assert.doesNotMatch(siteScript, /showPassword \? "Hide" : "Show"/);
});

test("public site uses server sessions and inquiry storage instead of browser-stored credentials", () => {
  assert.match(siteScript, /\/api\/auth\/login/);
  assert.match(siteScript, /\/api\/auth\/me/);
  assert.match(siteScript, /\/api\/auth\/logout/);
  assert.match(siteScript, /\/api\/inquiries/);
  assert.match(siteScript, /biswokarmaworkshop@gmail\.com/);
  assert.match(siteScript, /Financial reports/);
  assert.match(siteScript, /Create invoice & update stock/);
  assert.match(siteScript, /inventory-viewer/);
  assert.doesNotMatch(siteScript, /localStorage.*password/i);
});
