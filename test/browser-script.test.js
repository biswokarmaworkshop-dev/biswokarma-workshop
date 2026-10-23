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
  assert.match(html, /Biswokarma Workshop \| Motorcycle Parts & Service/);
  assert.match(html, /name="viewport".*width=device-width/s);
  assert.match(html, /class="skip-link" href="#main-content"/);
  assert.match(html, /prefers-reduced-motion: reduce/);
  assert.match(html, /max-width: 560px/);
  assert.match(html, /repeating-linear-gradient/);
  assert.match(html, /shadow-inset/);
  assert.match(html, /\/vendor\/site\.js\?v=20261023-motorcycle-workshop/);
});

test("public pages include motorcycle references, fitment inquiries and separate role logins", () => {
  assert.match(siteScript, /Spare parts/);
  assert.match(siteScript, /Ask the workshop/);
  assert.match(siteScript, /Admin login/);
  assert.match(siteScript, /Owner login/);
  assert.match(siteScript, /confirm the right fit, current availability and price/);
  assert.match(siteScript, /No customer inquiries have been received yet/);
  assert.doesNotMatch(siteScript, /JCB/i);
});

test("public site uses server sessions and inquiry storage instead of browser-stored credentials", () => {
  assert.match(siteScript, /\/api\/auth\/login/);
  assert.match(siteScript, /\/api\/auth\/me/);
  assert.match(siteScript, /\/api\/auth\/logout/);
  assert.match(siteScript, /\/api\/inquiries/);
  assert.doesNotMatch(siteScript, /localStorage.*password/i);
});
