(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BiswokarmaSession = api;
})(typeof globalThis === "undefined" ? this : globalThis, function () {
  "use strict";

  const dashboardTabs = new Set([
    "overview",
    "financial",
    "stock",
    "inquiries",
    "customers",
    "suppliers",
    "purchases",
    "payments",
    "banking",
    "billing",
    "invoiceView",
    "invoices",
    "reports",
    "users",
    "notifications",
    "audit",
    "settings",
  ]);

  function normalizeUser(user) {
    if (!user || !["admin", "owner"].includes(user.role)) return null;
    const username = String(user.username || "").trim();
    if (!username) return null;
    return {
      role: user.role,
      username,
      name: String(user.name || username).trim(),
    };
  }

  function loadUser(storage, legacyStorage) {
    try {
      const currentSession = storage.getItem("bw_currentUser");
      if (currentSession) {
        const normalized = normalizeUser(JSON.parse(currentSession));
        if (!normalized) {
          storage.removeItem("bw_currentUser");
          return null;
        }
        if (JSON.stringify(normalized) !== currentSession)
          saveUser(storage, normalized);
        return normalized;
      }
      if (!legacyStorage) return null;
      const legacyValue = legacyStorage.getItem("bw_currentUser");
      if (!legacyValue) return null;
      const normalized = normalizeUser(JSON.parse(legacyValue));
      legacyStorage.removeItem("bw_currentUser");
      if (!normalized) return null;
      return saveUser(storage, normalized) || normalized;
    } catch (error) {
      console.error("Unable to restore the workshop session:", error);
      return null;
    }
  }

  function saveUser(storage, user) {
    const normalized = normalizeUser(user);
    if (!normalized) {
      try {
        storage.removeItem("bw_currentUser");
      } catch (error) {
        console.error("Unable to clear the workshop session:", error);
      }
      return null;
    }
    try {
      storage.setItem("bw_currentUser", JSON.stringify(normalized));
      return normalized;
    } catch (error) {
      console.error("Unable to save the workshop session:", error);
      return null;
    }
  }

  function loadDashboardLocation(storage) {
    try {
      const saved = JSON.parse(storage.getItem("bw_dashboard_location") || "null");
      if (!saved || saved.view !== "dashboard" || !dashboardTabs.has(saved.tab))
        return null;
      const invoiceId =
        saved.tab === "invoiceView" &&
        typeof saved.invoiceId === "string" &&
        saved.invoiceId.length <= 128
          ? saved.invoiceId
          : null;
      return {
        view: "dashboard",
        tab: saved.tab === "invoiceView" && !invoiceId ? "invoices" : saved.tab,
        invoiceId,
      };
    } catch (error) {
      console.error("Unable to restore the dashboard location:", error);
      return null;
    }
  }

  function saveDashboardLocation(storage, tab, invoiceId = null) {
    if (!dashboardTabs.has(tab)) {
      clearDashboardLocation(storage);
      return false;
    }
    try {
      const validInvoiceId =
        tab === "invoiceView" &&
        typeof invoiceId === "string" &&
        invoiceId.length > 0 &&
        invoiceId.length <= 128;
      const location = {
        view: "dashboard",
        tab: tab === "invoiceView" && !validInvoiceId ? "invoices" : tab,
      };
      if (validInvoiceId) location.invoiceId = invoiceId;
      storage.setItem("bw_dashboard_location", JSON.stringify(location));
      return true;
    } catch (error) {
      console.error("Unable to save the dashboard location:", error);
      return false;
    }
  }

  function clearDashboardLocation(storage) {
    try {
      storage.removeItem("bw_dashboard_location");
    } catch (error) {
      console.error("Unable to clear the dashboard location:", error);
    }
  }

  function clear(storage) {
    try {
      storage.removeItem("bw_currentUser");
      storage.removeItem("bw_dashboard_location");
    } catch (error) {
      console.error("Unable to clear the workshop session:", error);
    }
  }

  return {
    clear,
    clearDashboardLocation,
    loadDashboardLocation,
    loadUser,
    saveDashboardLocation,
    saveUser,
  };
});
