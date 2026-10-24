const test = require("node:test");
const assert = require("node:assert/strict");
const { createInvoice, inclusiveVat } = require("../vendor/invoices");

test("extracts 13 percent VAT from the VAT-inclusive invoice total", () => {
  assert.deepEqual(inclusiveVat(113), {
    taxable: 100,
    vat: 13,
    total: 113,
  });
  assert.deepEqual(inclusiveVat(100), {
    taxable: 88.5,
    vat: 11.5,
    total: 100,
  });
  assert.throws(() => inclusiveVat(-1), TypeError);
});

test("records an invoice, VAT, customer, order and stock decrement from saved inventory", () => {
  const state = {
    parts: [{ id: "part-1", name: "Brake pad", sku: "BP-1", price: 113, stock: 4 }],
    bills: [],
    orders: [],
    customers: [],
  };
  const result = createInvoice(
    state,
    {
      invoiceNo: "INV-1",
      customerName: "Test Rider",
      customerPhone: "9800000000",
      itemId: "part-1",
      quantity: 2,
      method: "Cash",
    },
    new Date("2026-10-24T03:00:00.000Z"),
  );
  assert.equal(result.invoice.taxableAmount, 200);
  assert.equal(result.invoice.vatAmount, 26);
  assert.equal(result.invoice.total, 226);
  assert.equal(result.order.invoiceId, result.invoice.id);
  assert.equal(state.parts[0].stock, 2);
  assert.equal(state.customers[0].orders, 1);
  assert.equal(state.bills.length, 1);
  assert.equal(state.orders.length, 1);
});

test("rejects duplicate invoices, invalid quantities and overselling without changing state", () => {
  const state = {
    parts: [{ id: "part-1", name: "Brake pad", price: 113, stock: 1 }],
    bills: [],
    orders: [],
    customers: [],
  };
  assert.throws(
    () => createInvoice(state, {
      invoiceNo: "INV-1", customerName: "Rider", itemId: "part-1", quantity: 2,
    }),
    /not enough recorded stock/,
  );
  assert.equal(state.parts[0].stock, 1);
  createInvoice(state, {
    invoiceNo: "INV-1", customerName: "Rider", itemId: "part-1", quantity: 1,
  });
  assert.throws(
    () => createInvoice(state, {
      invoiceNo: "inv-1", customerName: "Rider", itemId: "part-1", quantity: 1,
    }),
    /already in use/,
  );
  assert.throws(
    () => createInvoice(state, {
      invoiceNo: "INV-2", customerName: "Rider", itemId: "part-1", quantity: 0,
    }),
    /whole number/,
  );
});
