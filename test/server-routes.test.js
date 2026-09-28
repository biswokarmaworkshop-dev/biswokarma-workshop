const test = require("node:test");
const assert = require("node:assert/strict");
const { server } = require("../server");
const products = require("../data/jcb-parts.json");
const { productSlug } = require("../vendor/catalog");

test("serves the catalog API, product routes and catalog browser asset", async (t) => {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
      server.closeAllConnections();
    });
  });
  const origin = `http://127.0.0.1:${server.address().port}`;

  const catalogResponse = await fetch(`${origin}/api/catalog/products`);
  assert.equal(catalogResponse.status, 200);
  assert.match(catalogResponse.headers.get("content-type"), /application\/json/);
  assert.match(catalogResponse.headers.get("cache-control"), /max-age=300/);
  const catalog = await catalogResponse.json();
  assert.equal(catalog.products.length, 30);
  assert.equal(catalog.products[0].name, "JCB 3DX Bucket Teeth");
  assert.equal(catalog.products[0].priceNpr, null);
  assert.deepEqual(catalog.products[0].compatibleModels, []);
  assert.deepEqual(catalog.products[0].specs, {});
  assert.equal(catalog.products[0].catalogSource, "demo_catalog");
  assert.equal(catalog.products[0].images[0].type, "illustrative_reference");
  assert.match(catalog.products[0].images[0].caption, /not the exact product or an OEM photo/i);
  assert.equal(
    catalog.inventoryIllustrations.source,
    "User-supplied generated parts catalog sheet",
  );
  assert.equal(
    catalog.inventoryIllustrations.images["Hydraulic Pump Assembly"].filename,
    "19-hydraulic-pump-assembly.jpg",
  );

  const product = catalog.products.find(
    (item) => item.name === "JCB 3DX Hydraulic Pump",
  );
  const routeResponse = await fetch(
    `${origin}/products/${productSlug(product)}`,
  );
  assert.equal(routeResponse.status, 200);
  assert.match(await routeResponse.text(), /id="root"/);

  const assetResponse = await fetch(`${origin}/vendor/catalog.js`);
  assert.equal(assetResponse.status, 200);
  assert.match(assetResponse.headers.get("content-type"), /javascript/);
  assert.match(await assetResponse.text(), /BiswokarmaCatalog/);

  const storyResponse = await fetch(`${origin}/vendor/parts-story.js`);
  assert.equal(storyResponse.status, 200);
  assert.match(storyResponse.headers.get("content-type"), /javascript/);
  const storyScript = await storyResponse.text();
  assert.match(storyScript, /title: "Hydraulics"/);
  assert.doesNotMatch(storyScript, /nearestChapterIndex/);

  const sessionResponse = await fetch(`${origin}/vendor/session.js`);
  assert.equal(sessionResponse.status, 200);
  assert.match(await sessionResponse.text(), /BiswokarmaSession/);

  const illustrationResponse = await fetch(
    `${origin}/images/illustrative-jcb-parts/07-bucket-teeth-set-of-5.jpg`,
  );
  assert.equal(illustrationResponse.status, 200);
  assert.match(illustrationResponse.headers.get("content-type"), /image\/jpeg/);
  assert.ok((await illustrationResponse.arrayBuffer()).byteLength > 0);
});
