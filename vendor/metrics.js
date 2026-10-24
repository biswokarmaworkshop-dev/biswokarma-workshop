(function (root) {
  "use strict";

  function toCents(value) {
    const amount = Number(value);
    return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
  }

  function amountFor(record) {
    return toCents(record?.total ?? record?.amount ?? 0);
  }

  function inclusiveVat(total) {
    const totalCents = toCents(total);
    const taxableCents = Math.round(totalCents / 1.13);
    return {
      taxable: taxableCents / 100,
      vat: (totalCents - taxableCents) / 100,
      total: totalCents / 100,
    };
  }

  function dateKey(value) {
    if (typeof value !== "string" || !value) return "";
    return value.slice(0, 10);
  }

  function dailyMetrics(bills, purchases, today = new Date()) {
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const series = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date(end);
      date.setDate(end.getDate() - offset);
      const key = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");
      const revenueCents = (Array.isArray(bills) ? bills : [])
        .filter((bill) => dateKey(bill.date) === key)
        .reduce((sum, bill) => sum + amountFor(bill), 0);
      const expenseCents = (Array.isArray(purchases) ? purchases : [])
        .filter((purchase) => dateKey(purchase.date) === key)
        .reduce((sum, purchase) => sum + amountFor(purchase), 0);
      series.push({
        date: key,
        revenue: revenueCents / 100,
        expenses: expenseCents / 100,
        net: (revenueCents - expenseCents) / 100,
      });
    }
    return series;
  }

  const api = { dailyMetrics, inclusiveVat };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.BiswokarmaMetrics = api;
})(typeof window !== "undefined" ? window : globalThis);
