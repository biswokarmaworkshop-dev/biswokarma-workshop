(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.BiswokarmaVat = api;
  }
})(typeof globalThis === "object" ? globalThis : this, function () {
  const VAT_RATE = 0.13;

  function roundMoney(amount) {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }

  function calculateVatInclusive(grossAmount) {
    if (!Number.isFinite(grossAmount) || grossAmount < 0) {
      throw new RangeError("VAT-inclusive amount must be a finite non-negative number");
    }

    const total = roundMoney(grossAmount);
    const subtotal = roundMoney(total / (1 + VAT_RATE));
    return {
      subtotal,
      vat: roundMoney(total - subtotal),
      total,
    };
  }

  return { calculateVatInclusive, roundMoney };
});
