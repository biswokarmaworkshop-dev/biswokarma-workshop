const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateVatInclusive } = require("../vendor/vat");

test("extracts 13% VAT from a VAT-inclusive total", () => {
  assert.deepEqual(calculateVatInclusive(113), {
    subtotal: 100,
    vat: 13,
    total: 113,
  });
});

test("rounds the taxable amount and VAT to cents without changing the total", () => {
  const result = calculateVatInclusive(1000);

  assert.deepEqual(result, { subtotal: 884.96, vat: 115.04, total: 1000 });
  assert.equal(result.subtotal + result.vat, result.total);
});

test("rejects invalid VAT-inclusive totals", () => {
  assert.throws(() => calculateVatInclusive(-1), RangeError);
  assert.throws(() => calculateVatInclusive(Number.NaN), RangeError);
});
