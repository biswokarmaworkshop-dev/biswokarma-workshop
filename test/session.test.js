const test = require("node:test");
const assert = require("node:assert/strict");
const Session = require("../vendor/session");

function createSessionStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

for (const user of [
  {
    role: "admin",
    username: "admin",
    name: "Workshop Admin",
    password: "must-not-persist",
    tab: "invoiceView",
    invoiceId: "invoice-123",
  },
  {
    role: "owner",
    username: "owner",
    name: "Workshop Owner",
    password: "must-not-persist",
    tab: "settings",
  },
]) {
  test(`restores the ${user.role} role and active dashboard page after reload`, () => {
    const storage = createSessionStorage();
    assert.deepEqual(Session.saveUser(storage, user), {
      role: user.role,
      username: user.username,
      name: user.name,
    });
    assert.equal(
      Session.saveDashboardLocation(storage, user.tab, user.invoiceId),
      true,
    );

    const serializedState = [
      storage.getItem("bw_currentUser"),
      storage.getItem("bw_dashboard_location"),
    ].join(" ");
    assert.doesNotMatch(serializedState, /password|must-not-persist/i);

    assert.deepEqual(Session.loadUser(storage), {
      role: user.role,
      username: user.username,
      name: user.name,
    });
    assert.deepEqual(Session.loadDashboardLocation(storage), {
      view: "dashboard",
      tab: user.tab,
      invoiceId: user.invoiceId || null,
    });

    Session.clear(storage);
    assert.equal(Session.loadUser(storage), null);
    assert.equal(Session.loadDashboardLocation(storage), null);
  });
}

test("ignores malformed or unsupported dashboard session state", () => {
  const storage = createSessionStorage();
  assert.equal(Session.saveUser(storage, { role: "superuser", username: "root" }), null);
  assert.equal(Session.saveDashboardLocation(storage, "unknown"), false);
  assert.equal(Session.loadUser(storage), null);
  assert.equal(Session.loadDashboardLocation(storage), null);
});

test("migrates only non-secret session fields and removes a legacy localStorage user", () => {
  const sessionStorage = createSessionStorage();
  const localStorage = createSessionStorage();
  localStorage.setItem(
    "bw_currentUser",
    JSON.stringify({
      role: "owner",
      username: "owner",
      name: "Workshop Owner",
      password: "legacy-secret",
    }),
  );

  assert.deepEqual(Session.loadUser(sessionStorage, localStorage), {
    role: "owner",
    username: "owner",
    name: "Workshop Owner",
  });
  assert.equal(localStorage.getItem("bw_currentUser"), null);
  assert.doesNotMatch(sessionStorage.getItem("bw_currentUser"), /password|legacy-secret/i);
});

test("strips credential fields from any existing sessionStorage user record", () => {
  const storage = createSessionStorage();
  storage.setItem(
    "bw_currentUser",
    JSON.stringify({
      role: "admin",
      username: "admin",
      name: "Workshop Admin",
      password: "old-secret",
    }),
  );

  assert.deepEqual(Session.loadUser(storage), {
    role: "admin",
    username: "admin",
    name: "Workshop Admin",
  });
  assert.doesNotMatch(storage.getItem("bw_currentUser"), /password|old-secret/i);
});

test("falls back to the invoices list if an invoice-detail session lacks its record id", () => {
  const storage = createSessionStorage();
  storage.setItem(
    "bw_dashboard_location",
    JSON.stringify({ view: "dashboard", tab: "invoiceView" }),
  );
  assert.deepEqual(Session.loadDashboardLocation(storage), {
    view: "dashboard",
    tab: "invoices",
    invoiceId: null,
  });
});
