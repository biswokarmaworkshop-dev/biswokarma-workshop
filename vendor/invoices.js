"use strict";

const crypto = require("crypto");

const PAYMENT_METHODS = new Set([
  "Cash",
  "Bank transfer",
  "Digital wallet",
  "Other",
]);

function moneyFromCents(cents) {
  return cents / 100;
}

function inclusiveVat(total) {
  if (!Number.isFinite(total) || total < 0)
    throw new TypeError("A non-negative VAT-inclusive total is required.");
  const totalCents = Math.round(total * 100);
  const taxableCents = Math.round(totalCents / 1.13);
  return {
    taxable: moneyFromCents(taxableCents),
    vat: moneyFromCents(totalCents - taxableCents),
    total: moneyFromCents(totalCents),
  };
}

function createInvoice(state, body, now = new Date()) {
  const invoiceNo = String(body.invoiceNo || "").trim();
  const customerName = String(body.customerName || "").trim();
  const customerPhone = String(body.customerPhone || "").trim();
  const itemId = String(body.itemId || "").trim();
  const quantity = Number(body.quantity);
  const method = String(body.method || "Cash");
  if (!invoiceNo || invoiceNo.length > 40)
    throw new TypeError("Enter an invoice number up to 40 characters.");
  if (!customerName || customerName.length > 100)
    throw new TypeError("Enter a customer name up to 100 characters.");
  if (customerPhone.length > 40)
    throw new TypeError("Customer phone number must be 40 characters or fewer.");
  if (!itemId || itemId.length > 100)
    throw new TypeError("Choose an inventory item.");
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000)
    throw new TypeError("Invoice quantity must be a whole number from 1 to 10000.");
  if (!PAYMENT_METHODS.has(method))
    throw new TypeError("Choose a supported payment method.");

  const parts = Array.isArray(state.parts) ? state.parts : [];
  const bills = Array.isArray(state.bills) ? state.bills : [];
  const orders = Array.isArray(state.orders) ? state.orders : [];
  const customers = Array.isArray(state.customers) ? state.customers : [];
  if (bills.some((bill) => String(bill.invoiceNo).toLowerCase() === invoiceNo.toLowerCase()))
    throw new RangeError("That invoice number is already in use.");
  const part = parts.find((candidate) => String(candidate.id) === itemId);
  if (!part) throw new RangeError("The selected inventory item no longer exists.");
  const stock = Number(part.stock);
  const unitPrice = Number(part.price);
  if (!Number.isSafeInteger(stock) || stock < quantity)
    throw new RangeError("There is not enough recorded stock for this invoice.");
  if (!Number.isFinite(unitPrice) || unitPrice <= 0)
    throw new RangeError("The selected item needs a valid VAT-inclusive price.");

  const unitPriceCents = Math.round(unitPrice * 100);
  const totalCents = unitPriceCents * quantity;
  if (!Number.isSafeInteger(totalCents))
    throw new RangeError("The invoice total is too large.");
  const vat = inclusiveVat(moneyFromCents(totalCents));
  const id = crypto.randomUUID();
  const date = now.toISOString().slice(0, 10);
  const item = {
    partId: part.id,
    name: String(part.name),
    sku: String(part.sku || ""),
    quantity,
    unitPriceInclusive: moneyFromCents(unitPriceCents),
    totalInclusive: vat.total,
  };
  const priorCustomer = customers.find((entry) =>
    customerPhone && String(entry.phone || "").trim() === customerPhone,
  );
  const customer = {
    id: priorCustomer?.id || `customer-${crypto.randomUUID()}`,
    name: customerName,
    ...(customerPhone ? { phone: customerPhone } : {}),
  };
  const invoice = {
    id,
    invoiceNo,
    customer,
    items: [item],
    taxableAmount: vat.taxable,
    vatRate: 0.13,
    vatAmount: vat.vat,
    total: vat.total,
    date,
    method,
    status: "Pending",
  };
  const order = {
    id: `order-${id}`,
    invoiceId: id,
    invoiceNo,
    customer,
    items: [item],
    total: vat.total,
    date,
    status: "New",
  };
  const nextCustomer = {
    ...(priorCustomer || {}),
    ...customer,
    orders: Number(priorCustomer?.orders || 0) + 1,
  };
  state.parts = parts.map((entry) =>
    entry.id === part.id ? { ...entry, stock: stock - quantity } : entry,
  );
  state.bills = [invoice, ...bills];
  state.orders = [order, ...orders];
  state.customers = priorCustomer
    ? customers.map((entry) => entry === priorCustomer ? nextCustomer : entry)
    : [nextCustomer, ...customers];
  return { invoice, order, part: state.parts.find((entry) => entry.id === part.id), customer: nextCustomer };
}

module.exports = { createInvoice, inclusiveVat };
