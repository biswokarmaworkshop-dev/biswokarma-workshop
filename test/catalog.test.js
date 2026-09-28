const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const products = require("../data/jcb-parts.json");
const {
  addToCart,
  buildInquiry,
  catalogListing,
  filterProducts,
  findProductBySlug,
  inventoryListing,
  productSlug,
  verifiedImages,
} = require("../vendor/catalog");
const { chapters } = require("../vendor/parts-story");

const requestedNames = [
  "JCB 3DX Bucket Teeth",
  "JCB 3DX Bucket Tooth Adapter",
  "JCB 3DX Hydraulic Pump",
  "JCB 3DX Control Valve",
  "JCB 3DX Boom Cylinder Seal Kit",
  "JCB 3DX Arm Cylinder Seal Kit",
  "JCB 3DX Bucket Cylinder Seal Kit",
  "JCB 3DX Air Filter",
  "JCB 3DX Oil Filter",
  "JCB 3DX Fuel Filter",
  "JCB 3DX Hydraulic Filter",
  "JCB 3DX Alternator",
  "JCB 3DX Starter Motor",
  "JCB 3DX Radiator",
  "JCB 3DX Water Pump",
  "JCB 3DX Piston Ring Set",
  "JCB 444 Engine Gasket Set",
  "JCB 444 Engine Parts",
  "JCB 3DX Hydraulic Hose",
  "JCB 3DX Hydraulic Cylinder",
  "JCB 3DX Track Roller",
  "JCB 3DX Track Chain",
  "JCB 3DX Sprocket",
  "JCB 3DX Front Axle Parts",
  "JCB 3DX Brake Disc",
  "JCB 3DX Clutch Plate",
  "JCB 3DX Bearing",
  "JCB 3DX Bush",
  "JCB 3DX Pin",
  "JCB 3DX Seal Kit",
];

test("catalog contains exactly the 30 requested named products", () => {
  assert.equal(products.length, 30);
  assert.deepEqual(
    products.map((product) => product.name),
    requestedNames,
  );
});

test("demo catalog records do not expose invented prices, fitment, specifications or images", () => {
  const ids = new Set();
  const partNumbers = new Set();
  for (const product of products) {
    assert.ok(product.id && !ids.has(product.id), `duplicate/missing id: ${product.id}`);
    assert.ok(
      product.partNumber && !partNumbers.has(product.partNumber),
      `duplicate/missing workshop part number: ${product.partNumber}`,
    );
    ids.add(product.id);
    partNumbers.add(product.partNumber);
    assert.ok(product.partNumberType.includes("not an OEM"));
    const listing = catalogListing(product);
    assert.equal(listing.catalogSource, "demo_catalog");
    assert.equal(listing.priceNpr, null);
    assert.match(listing.priceBasis, /no verified supplier price/);
    assert.equal(listing.stock, null);
    assert.equal(listing.availability, "confirm_with_workshop");
    assert.deepEqual(listing.compatibleModels, []);
    assert.deepEqual(listing.specs, {});
    assert.match(listing.description, /confirm supplier.*serial-number fitment/i);
    assert.equal(listing.brandVerified, false);
    assert.equal(listing.partNumberType, product.partNumberType);
    assert.deepEqual(listing.images, []);
  }
});

test("search supports demo names and workshop references without fabricated machine matches", () => {
  const listings = products.map(catalogListing);
  assert.deepEqual(
    filterProducts(listings, { query: "BW-JCB3DX-003" }).map((product) => product.name),
    ["JCB 3DX Hydraulic Pump"],
  );
  assert.equal(
    filterProducts(listings, { query: "hydraulic" }).length,
    9,
  );
  assert.equal(
    filterProducts(listings, { category: "Electrical" }).length,
    2,
  );
  assert.deepEqual(filterProducts(listings, { model: "JCB 3DX" }), []);
  assert.deepEqual(
    filterProducts(listings, { productIds: ["jcb3dx-001", "jcb3dx-002"] }).map(
      (product) => product.id,
    ),
    ["jcb3dx-001", "jcb3dx-002"],
  );
  assert.equal(
    filterProducts(
      [inventoryListing({ id: "saved", name: "Recorded pump", machine: "JCB 3DX" })],
      { model: "JCB 3DX" },
    ).length,
    1,
  );
});

test("parts story has eight complete chapters linked to matching catalog records", () => {
  assert.deepEqual(
    chapters.map((chapter) => chapter.title),
    [
      "Hydraulics",
      "Engine",
      "Filters",
      "Transmission",
      "Undercarriage",
      "Bucket & attachments",
      "Electrical",
      "Seals & repair kits",
    ],
  );
  const ids = new Set(products.map((product) => product.id));
  for (const chapter of chapters) {
    assert.ok(chapter.detail && chapter.statement && chapter.systems.length);
    assert.ok(chapter.productIds.length > 0);
    assert.ok(chapter.productIds.every((id) => ids.has(id)), chapter.title);
  }
});

test("parts story keeps all chapters selectable without long, sticky, or scroll-driven panels", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "biswokarma-workshop (1).html"),
    "utf8",
  );
  const component = html.slice(
    html.indexOf("function PartsStory"),
    html.indexOf("function MarketplaceParts"),
  );
  const storyStyles = html.slice(
    html.indexOf(".partsStory {"),
    html.indexOf(".catalogHeading {"),
  );
  assert.ok(component.includes("PARTS_STORY.map"));
  assert.ok(component.includes('"aria-pressed": index === activeChapter'));
  assert.ok(!component.includes('addEventListener("scroll"'));
  assert.ok(!component.includes("scrollIntoView"));
  assert.ok(!storyStyles.includes("position: sticky"));
  assert.ok(!storyStyles.includes("min-height: 76svh"));
  assert.ok(component.includes("SCHEMATIC · NOT A PART IMAGE"));
  assert.ok(component.includes("onQuote"));
  assert.ok(html.includes("prefers-reduced-motion: reduce"));
  assert.ok(!/setInterval\(|autoplay/i.test(html));
});

test("product routes resolve to the intended structured record", () => {
  const product = products.find((item) => item.name === "JCB 3DX Hydraulic Pump");
  assert.equal(
    findProductBySlug(products, productSlug(product)),
    product,
  );
  assert.equal(findProductBySlug(products, "unknown-product"), null);
});

test("quote cart adds and increments quantities without mutating prior state", () => {
  const initialCart = [];
  const one = addToCart(initialCart, products[0].id, 1);
  const two = addToCart(one, products[0].id, 2);
  assert.deepEqual(initialCart, []);
  assert.deepEqual(two, [{ productId: products[0].id, quantity: 3 }]);
  assert.throws(() => addToCart(two, products[0].id, 0), RangeError);
});

test("existing inventory remains browsable with its stored stock and price, without unverified photos", () => {
  const listing = inventoryListing({
    id: "test-part",
    name: "Legacy workshop item",
    category: "Engine",
    machine: "JCB 3DX",
    price: 12500,
    stock: 4,
    image: "images/unverified.jpg",
  });
  assert.equal(listing.priceNpr, 12500);
  assert.equal(listing.stock, 4);
  assert.equal(listing.availability, "in_stock");
  assert.equal(listing.catalogSource, "workshop_inventory");
  assert.deepEqual(listing.images, []);
});

test("quote inquiry includes selected products and cart quantities in existing inquiry fields", () => {
  const cart = [{ productId: products[0].id, quantity: 3 }];
  const inquiry = buildInquiry(
    products.slice(0, 2),
    {
      name: "  Test buyer ",
      phone: " 9800000000 ",
      machineType: " JCB 3DX ",
      issue: " Please quote ",
    },
    cart,
  );
  assert.equal(inquiry.name, "Test buyer");
  assert.equal(inquiry.machineType, "JCB 3DX");
  assert.equal(inquiry.issue, "Please quote");
  assert.deepEqual(inquiry.requestedItems, [
    {
      productId: products[0].id,
      name: products[0].name,
      partNumber: products[0].partNumber,
      quantity: 3,
    },
    {
      productId: products[1].id,
      name: products[1].name,
      partNumber: products[1].partNumber,
      quantity: 1,
    },
  ]);
  assert.throws(
    () => buildInquiry(products.slice(0, 1), { name: "", phone: "123", machineType: "JCB", issue: "Quote" }),
    TypeError,
  );
});

test("unverified, incomplete, unsafe or missing image sources fail closed", () => {
  const approved = {
    url: "https://supplier.example/part.jpg",
    sourceUrl: "https://supplier.example/catalog/part",
    sourceName: "Supplier catalog",
    license: "SUPPLIER PERMISSION",
    attribution: "Supplier name",
  };
  assert.deepEqual(verifiedImages([]), []);
  assert.deepEqual(verifiedImages([null, { ...approved, license: "UNKNOWN" }]), []);
  assert.deepEqual(verifiedImages([{ ...approved, url: "http://supplier.example/part.jpg" }]), []);
  assert.deepEqual(verifiedImages([{ ...approved, attribution: "" }]), []);
  assert.deepEqual(verifiedImages([approved]), [approved]);
});
