const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

test("embedded React application script is valid JavaScript", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "biswokarma-workshop (1).html"),
    "utf8",
  );
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length > 0, "expected an inline application script");
  assert.doesNotThrow(() => new Function(scripts[scripts.length - 1][1]));
});

test("admin and owner dashboard session state is restored without persisting credentials", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "biswokarma-workshop (1).html"),
    "utf8",
  );
  assert.ok(html.includes('<script src="/vendor/session.js"></script>'));
  assert.ok(html.includes("Session.loadUser(sessionStorage, localStorage)"));
  assert.ok(html.includes("Session.loadDashboardLocation(sessionStorage)"));
  assert.ok(html.includes("Session.saveUser(sessionStorage, sessionUser)"));
  assert.match(
    html,
    /Session\.saveDashboardLocation\(\s*sessionStorage,\s*nextTab,\s*nextInvoiceId,/,
  );
  assert.ok(html.includes("String(bill.id) === activeInvoiceId"));
  assert.ok(html.includes("Session.clear(sessionStorage)"));
  assert.ok(!html.includes('localStorage.setItem("bw_currentUser"'));
});

test("homepage uses the original connected-parts motif and motion-safe brand mark", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "biswokarma-workshop (1).html"),
    "utf8",
  );
  assert.ok(html.includes('className: "heroConnections"'));
  assert.ok(html.includes(".connectionGearLarge"));
  assert.ok(html.includes("@keyframes brand-emblem-depth"));
  assert.ok(html.includes("@keyframes brand-mark-depth"));
  assert.ok(html.includes("prefers-reduced-motion: reduce"));
});

test("catalog item links open their own product detail route", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "biswokarma-workshop (1).html"),
    "utf8",
  );
  assert.ok(html.includes('href: `/products/${Catalog.productSlug(product)}`'));
  assert.ok(html.includes("window.history.pushState(null, \"\", `/products/${slug}`)"));
  assert.ok(html.includes('view === "product"'));
});

test("catalog browsing separates listing sources and adapts filters for mobile", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "biswokarma-workshop (1).html"),
    "utf8",
  );
  assert.ok(html.includes('"Listing source"'));
  assert.ok(html.includes('"Saved workshop inventory"'));
  assert.ok(html.includes('"Unverified demo references"'));
  assert.ok(html.includes("Catalog.listingSourceLabel(product)"));
  assert.ok(html.includes(".demoSource"));
  assert.ok(html.includes(".inventorySource"));
  assert.ok(html.includes("@media (max-width: 380px)"));
});

test("saved inventory illustrations are derived for display without changing stored parts", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "biswokarma-workshop (1).html"),
    "utf8",
  );
  assert.ok(html.includes("Catalog.findInventoryIllustration(part, inventoryIllustrations)"));
  assert.ok(html.includes("Catalog.inventoryListing("));
  assert.ok(html.includes('className: "productPhotography"'));
  assert.ok(html.includes("image.caption ||"));
});
