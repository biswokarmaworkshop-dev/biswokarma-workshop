const test = require("node:test");
const assert = require("node:assert/strict");
const products = require("../data/motorcycle-parts.json");
const { catalogListing, filterProducts } = require("../vendor/catalog");

test("motorcycle reference catalog has unique workshop identifiers and broad categories", () => {
  assert.equal(products.length, 30);
  assert.ok(products.every((product) => product.name && product.category));
  assert.equal(new Set(products.map((product) => product.id)).size, products.length);
  assert.equal(
    new Set(products.map((product) => product.partNumber)).size,
    products.length,
  );
  assert.ok(products.some((product) => product.category === "Brakes"));
  assert.ok(products.some((product) => product.category === "Engine"));
  assert.ok(products.some((product) => product.category === "Electrical"));
  assert.ok(products.every((product) => product.partNumberType.includes("not an OEM")));
});

test("public listings do not invent price, stock, brand or motorcycle compatibility", () => {
  for (const product of products) {
    const listing = catalogListing(product);
    assert.equal(listing.catalogSource, "demo_catalog");
    assert.equal(listing.brand, null);
    assert.equal(listing.brandVerified, false);
    assert.equal(listing.priceNpr, null);
    assert.equal(listing.stock, null);
    assert.deepEqual(listing.compatibleModels, []);
    assert.deepEqual(listing.specs, {});
    assert.deepEqual(listing.images, []);
    assert.match(listing.description, /confirm/i);
  }
});

test("search finds motorcycle parts by name, reference and category", () => {
  const listings = products.map(catalogListing);
  assert.deepEqual(
    filterProducts(listings, { query: "spark plug" }).map((product) => product.id),
    ["moto-011"],
  );
  assert.deepEqual(
    filterProducts(listings, { query: "BW-MOTO-008" }).map((product) => product.name),
    ["Chain and Sprocket Set"],
  );
  assert.ok(filterProducts(listings, { category: "Brakes" }).length >= 3);
  assert.equal(filterProducts(listings, { model: "Honda 150" }).length, 0);
});
