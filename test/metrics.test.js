const test = require("node:test");
const assert = require("node:assert/strict");
const { dailyMetrics, inclusiveVat } = require("../vendor/metrics");

test("inclusive VAT uses total divided by 1.13", () => {
  assert.deepEqual(inclusiveVat(113), { taxable: 100, vat: 13, total: 113 });
  assert.deepEqual(inclusiveVat(0), { taxable: 0, vat: 0, total: 0 });
});

test("daily metrics use saved invoice and purchase dates only", () => {
  const today = new Date(2026, 9, 24, 12);
  const series = dailyMetrics(
    [
      { date: "2026-10-24", total: 113 },
      { date: "2026-10-24", total: 50 },
      { date: "2026-10-01", total: 999 },
    ],
    [{ date: "2026-10-24T10:00:00.000Z", amount: 23 }],
    today,
  );
  assert.equal(series.length, 7);
  assert.deepEqual(series[6], {
    date: "2026-10-24",
    revenue: 163,
    expenses: 23,
    net: 140,
  });
  assert.equal(series[0].date, "2026-10-18");
});

test("daily metrics safely handle missing or malformed saved collections", () => {
  const series = dailyMetrics(null, undefined, new Date(2026, 0, 1, 12));
  assert.equal(series.length, 7);
  assert.deepEqual(series[6], {
    date: "2026-01-01",
    revenue: 0,
    expenses: 0,
    net: 0,
  });
});
