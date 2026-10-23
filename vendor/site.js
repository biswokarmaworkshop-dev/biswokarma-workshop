(function () {
  "use strict";

  const h = React.createElement;
  const { useEffect, useMemo, useRef, useState } = React;

  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.body !== undefined) headers.set("Content-Type", "application/json");
    const response = await fetch(path, {
      ...options,
      credentials: "same-origin",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "The request could not be completed.");
    return data;
  }

  function routeFromHash() {
    const [path, query = ""] = (window.location.hash.slice(1) || "/").split("?");
    return { path: path || "/", query: new URLSearchParams(query) };
  }

  function setRoute(path) {
    window.location.hash = path;
  }

  function Control({ children, className = "", ...props }) {
    return h("button", { className: `control ${className}`.trim(), ...props }, children);
  }

  function PublicHeader({ path, session, navOpen, setNavOpen, onLogout }) {
    const links = [
      ["/", "Home"],
      ["/parts", "Spare parts"],
      ["/inquiry", "Ask the workshop"],
    ];
    return h(
      "header",
      { className: "site-header" },
      h(
        "div",
        { className: "site-shell header-inner" },
        h(
          "a",
          { className: "brand", href: "#/", "aria-label": "Biswokarma Workshop home" },
          h("span", { className: "brand-mark", "aria-hidden": "true" }, "⚙"),
          h("span", { className: "brand-copy" }, h("strong", null, "BISWOKARMA"), h("span", null, "Workshop · Gorkha")),
        ),
        h(
          "nav",
          { className: `site-nav${navOpen ? " open" : ""}`, "aria-label": "Main navigation" },
          ...links.map(([href, label]) =>
            h("a", {
              key: href,
              className: "nav-link",
              href: `#${href}`,
              "aria-current": path === href ? "page" : undefined,
              onClick: () => setNavOpen(false),
            }, label),
          ),
          session
            ? h("a", { className: "nav-link", href: "#/dashboard", onClick: () => setNavOpen(false) }, "Workshop dashboard")
            : h(
                React.Fragment,
                null,
                h("a", { className: "nav-link", href: "#/admin-login", onClick: () => setNavOpen(false) }, "Admin login"),
                h("a", { className: "nav-link", href: "#/owner-login", onClick: () => setNavOpen(false) }, "Owner login"),
              ),
        ),
        session
          ? h(Control, { className: "quiet", onClick: onLogout }, "Sign out")
          : h("a", { className: "control-link", href: "#/inquiry" }, "Get a quote"),
        h(
          "button",
          {
            className: "nav-toggle",
            type: "button",
            "aria-label": navOpen ? "Close navigation" : "Open navigation",
            "aria-expanded": String(navOpen),
            onClick: () => setNavOpen(!navOpen),
          },
          navOpen ? "×" : "☰",
        ),
      ),
    );
  }

  function Footer() {
    return h(
      "footer",
      { className: "site-footer" },
      h(
        "div",
        { className: "site-shell footer-inner" },
        h("div", null, h("strong", null, "BISWOKARMA WORKSHOP"), h("p", null, "Motorcycle parts and workshop service in Khol Khole, Gorkha 8, Nepal.")),
        h(
          "div",
          { className: "footer-contact", "aria-label": "Workshop contact details" },
          h("a", { href: "tel:9866389738" }, "Call 9866389738"),
          h("a", { href: "tel:9806567713" }, "Call 9806567713"),
          h("a", { href: "https://wa.me/9779866389738", target: "_blank", rel: "noopener noreferrer" }, "WhatsApp"),
        ),
      ),
    );
  }

  function PageFrame({ children }) {
    return h("main", { id: "main-content", className: "site-shell", tabIndex: -1 }, children);
  }

  function MechanicalMark() {
    return h(
      "div",
      { className: "mechanical-art", role: "img", "aria-label": "Machined workshop gear emblem" },
      h("span", { className: "gear", "aria-hidden": "true" }, h("span", { className: "gear-inner" }, "BW")),
    );
  }

  function HomePage({ products }) {
    const categories = [...new Set(products.map((product) => product.category))].slice(0, 6);
    return h(
      PageFrame,
      null,
      h(
        "section",
        { className: "hero", "aria-labelledby": "home-title" },
        h(
          "div",
          null,
          h("div", { className: "eyebrow" }, "Motorcycle parts · Workshop service · Gorkha"),
          h("h1", { id: "home-title" }, "Keep your ", h("span", null, "ride moving.")),
          h("p", { className: "lede" }, "Find a part or tell us what your motorcycle needs. Our workshop will confirm the right fit, current availability and price before you decide."),
          h(
            "div",
            { className: "hero-actions" },
            h("a", { className: "control-link", href: "#/parts" }, "Browse motorcycle parts"),
            h("a", { className: "control-link secondary", href: "#/inquiry" }, "Ask the workshop"),
          ),
        ),
        h(MechanicalMark),
      ),
      h(
        "section",
        { className: "section", "aria-labelledby": "categories-title" },
        h("div", { className: "section-heading" }, h("div", null, h("div", { className: "eyebrow" }, "Browse by system"), h("h2", { id: "categories-title" }, "Parts for the job at hand")), h("a", { href: "#/parts" }, "View all parts →")),
        h(
          "div",
          { className: "card-grid" },
          ...categories.map((category, index) =>
            h(
              "a",
              { className: "machine-card", href: `#/parts?category=${encodeURIComponent(category)}`, key: category },
              h("div", { className: "machine-icon", "aria-hidden": "true" }, ["◉", "⛓", "⌁", "⚡", "◌", "⚙"][index % 6]),
              h("h3", null, category),
              h("p", null, "Browse reference listings and ask us to check the exact motorcycle fit."),
            ),
          ),
        ),
        h("div", { className: "note-bar" }, h("span", { "aria-hidden": "true" }, "ⓘ"), h("span", null, "Catalog entries are reference names only. We do not publish unverified prices, stock, brands or model fitment.")),
      ),
      h(
        "section",
        { className: "section" },
        h("div", { className: "section-heading" }, h("div", null, h("div", { className: "eyebrow" }, "Simple and clear"), h("h2", null, "The right part starts with the right details"))),
        h(
          "div",
          { className: "card-grid" },
          ...[
            ["01", "Tell us about your bike", "Share make, model, year, engine capacity or a photo/number from the old part."],
            ["02", "We check the match", "The workshop reviews the details and confirms compatibility, price and availability with you."],
            ["03", "Choose what works", "Decide after we have confirmed the details. An inquiry does not reserve stock or place an order."],
          ].map(([number, title, copy]) =>
            h("article", { className: "machine-card", key: number }, h("div", { className: "eyebrow" }, number), h("h3", null, title), h("p", null, copy)),
          ),
        ),
      ),
    );
  }

  function PartsPage({ products, initialCategory }) {
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState(initialCategory || "");
    const categories = [...new Set(products.map((product) => product.category))].sort();
    const visible = useMemo(() => {
      const needle = query.trim().toLowerCase();
      return products.filter((product) =>
        (!category || product.category === category) &&
        (!needle || `${product.name} ${product.partNumber} ${product.category}`.toLowerCase().includes(needle)),
      );
    }, [products, query, category]);
    return h(
      PageFrame,
      null,
      h("section", { className: "page-intro" }, h("div", { className: "eyebrow" }, "Motorcycle parts references"), h("h1", { className: "page-title" }, "Spare parts"), h("p", { className: "lede" }, "Search the reference list, then ask us to confirm the exact match for your motorcycle.")),
      h(
        "div",
        { className: "catalog-controls surface", role: "search" },
        h("div", { className: "field" }, h("label", { htmlFor: "parts-search" }, "Search part names"), h("input", { id: "parts-search", type: "search", value: query, onChange: (event) => setQuery(event.target.value), placeholder: "e.g. brake pad, spark plug", autoComplete: "off" })),
        h("div", { className: "field" }, h("label", { htmlFor: "parts-category" }, "Part system"), h("select", { id: "parts-category", value: category, onChange: (event) => setCategory(event.target.value) }, h("option", { value: "" }, "All systems"), ...categories.map((item) => h("option", { value: item, key: item }, item)))),
      ),
      h("p", { className: "category-label", "aria-live": "polite" }, `${visible.length} reference ${visible.length === 1 ? "part" : "parts"}`),
      visible.length
        ? h(
            "div",
            { className: "product-grid" },
            ...visible.map((product) =>
              h(
                "article",
                { className: "product-card", key: product.id },
                h("span", { className: "part-stamp" }, product.partNumber),
                h("h3", null, product.name),
                h("span", { className: "category-label" }, product.category),
                h("p", null, product.description),
                h("div", { className: "product-bottom" }, h("small", { className: "category-label" }, "Workshop reference only"), h("a", { className: "control-link secondary", href: `#/inquiry?part=${encodeURIComponent(product.name)}`, "aria-label": `Ask about ${product.name}` }, "Ask about this part")),
              ),
            ),
          )
        : h("div", { className: "surface empty-state" }, "No reference parts match that search. Try another name or ask us directly."),
      h("div", { className: "note-bar" }, h("span", { "aria-hidden": "true" }, "ⓘ"), h("span", null, "Part numbers shown are workshop reference IDs, not manufacturer/OEM numbers. Compatibility, brand, current price and availability are confirmed by the workshop.")),
    );
  }

  function InquiryPage({ onSubmit, prefilledPart }) {
    const [form, setForm] = useState({ name: "", phone: "", motorcycle: "", part: prefilledPart || "", details: "" });
    const [status, setStatus] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [receipt, setReceipt] = useState("");
    const change = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
    async function submit(event) {
      event.preventDefault();
      setStatus("");
      setSubmitting(true);
      try {
        const result = await onSubmit(form);
        setReceipt(result.inquiry.id);
        setStatus("Your request was sent to the workshop. We will follow up using the phone number you provided.");
        setForm({ name: "", phone: "", motorcycle: "", part: "", details: "" });
      } catch (error) {
        setStatus(error.message);
      } finally {
        setSubmitting(false);
      }
    }
    return h(
      PageFrame,
      null,
      h("section", { className: "page-intro" }, h("div", { className: "eyebrow" }, "Fitment check · quote request"), h("h1", { className: "page-title" }, "Ask the workshop"), h("p", { className: "lede" }, "Tell us what you ride and what you need. We will check the details and confirm the quote with you.")),
      h(
        "div",
        { className: "inquiry-layout" },
        h(
          "form",
          { className: "inquiry-card", onSubmit: submit },
          h("div", { className: "form-grid" },
            h("div", { className: "field" }, h("label", { htmlFor: "inquiry-name" }, "Your name *"), h("input", { id: "inquiry-name", name: "name", required: true, maxLength: 100, autoComplete: "name", value: form.name, onChange: change("name") })),
            h("div", { className: "field" }, h("label", { htmlFor: "inquiry-phone" }, "Phone number *"), h("input", { id: "inquiry-phone", name: "phone", type: "tel", required: true, maxLength: 40, autoComplete: "tel", value: form.phone, onChange: change("phone"), placeholder: "Your contact number" })),
            h("div", { className: "field full" }, h("label", { htmlFor: "inquiry-bike" }, "Motorcycle details"), h("input", { id: "inquiry-bike", name: "motorcycle", maxLength: 120, value: form.motorcycle, onChange: change("motorcycle"), placeholder: "Make, model, year and engine capacity if known" })),
            h("div", { className: "field full" }, h("label", { htmlFor: "inquiry-part" }, "Part or service"), h("input", { id: "inquiry-part", name: "part", maxLength: 120, value: form.part, onChange: change("part"), placeholder: "Part name, number or workshop service" })),
            h("div", { className: "field full" }, h("label", { htmlFor: "inquiry-details" }, "What do you need? *"), h("textarea", { id: "inquiry-details", name: "details", required: true, minLength: 5, maxLength: 1000, value: form.details, onChange: change("details"), placeholder: "Describe the issue or the part you are looking for." })),
          ),
          h("p", { className: `form-status${status ? (receipt ? " success" : " error") : ""}`, role: "status", "aria-live": "polite" }, status),
          receipt ? h("p", { className: "form-note" }, `Inquiry reference: ${receipt}`) : null,
          h(Control, { type: "submit", disabled: submitting }, submitting ? "Sending…" : "Send inquiry"),
          h("p", { className: "form-note" }, "We use these details to reply to your request. An inquiry does not place an order or reserve stock."),
        ),
        h(
          "aside",
          { className: "contact-card machine-card", "aria-label": "Contact the workshop directly" },
          h("div", { className: "eyebrow" }, "Talk to a person"),
          h("h2", null, "Workshop contact"),
          h("p", null, "Prefer a call? Contact the workshop and share your motorcycle details and part markings."),
          h("div", { className: "contact-line" }, h("a", { className: "control-link secondary", href: "tel:9866389738" }, "Call 9866389738"), h("a", { className: "control-link secondary", href: "tel:9806567713" }, "Call 9806567713")),
          h("p", null, "Khol Khole, Gorkha 8, Gandaki Province, Nepal"),
        ),
      ),
    );
  }

  function LoginPage({ role, configured, onLogin }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    async function submit(event) {
      event.preventDefault();
      setError("");
      setBusy(true);
      try {
        await onLogin(role, username, password);
      } catch (loginError) {
        setError(loginError.message);
      } finally {
        setBusy(false);
      }
    }
    const label = role === "owner" ? "Owner" : "Admin";
    return h(
      PageFrame,
      null,
      h("div", { className: "login-wrap" },
        h("section", { className: "login-card machine-card" },
          h("div", { className: "eyebrow" }, `Workshop access · ${label}`),
          h("h1", null, `${label} login`),
          h("p", { className: "form-note" }, role === "owner" ? "Owner access includes workshop settings and financial records." : "Admin access is for day-to-day workshop operations."),
          configured
            ? h("form", { className: "login-form", onSubmit: submit },
                h("div", { className: "field" }, h("label", { htmlFor: "login-username" }, "Username"), h("input", { id: "login-username", value: username, onChange: (event) => setUsername(event.target.value), autoComplete: "username", maxLength: 64, required: true })),
                h("div", { className: "field" }, h("label", { htmlFor: "login-password" }, "Password"), h("div", { className: "password-row" }, h("input", { id: "login-password", type: showPassword ? "text" : "password", value: password, onChange: (event) => setPassword(event.target.value), autoComplete: "current-password", maxLength: 1024, required: true }), h(Control, { type: "button", className: "quiet", "aria-label": showPassword ? "Hide password" : "Show password", onClick: () => setShowPassword(!showPassword) }, showPassword ? "Hide" : "Show"))),
                h("p", { className: `form-status${error ? " error" : ""}`, role: "alert" }, error),
                h(Control, { type: "submit", disabled: busy }, busy ? "Signing in…" : `Sign in as ${label}`),
              )
            : h("div", { className: "note-bar", role: "status" }, "This account has not been provisioned on the hosting service. The workshop administrator must configure both accounts securely before sign-in is available."),
          h("p", { className: "form-note" }, "Your sign-in is verified by the workshop server. Passwords are never stored in this browser."),
          h("p", { className: "form-note" }, h("a", { href: `#/${role === "owner" ? "admin" : "owner"}-login` }, `Go to ${role === "owner" ? "Admin" : "Owner"} login`)),
        ),
      ),
    );
  }

  function DashboardPage({ session, initialState, onSave, onLogout }) {
    const owner = session.role === "owner";
    const [page, setPage] = useState("overview");
    const [parts, setParts] = useState(Array.isArray(initialState.parts) ? initialState.parts : []);
    const [customers, setCustomers] = useState(Array.isArray(initialState.customers) ? initialState.customers : []);
    const [suppliers, setSuppliers] = useState(Array.isArray(initialState.suppliers) ? initialState.suppliers : []);
    const [inquiries, setInquiries] = useState(Array.isArray(initialState.inquiries) ? initialState.inquiries : []);
    const [bills, setBills] = useState(Array.isArray(initialState.bills) ? initialState.bills : []);
    const [purchases, setPurchases] = useState(Array.isArray(initialState.purchases) ? initialState.purchases : []);
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);
    const menus = [
      ["overview", "Overview"],
      ["parts", "Parts & inventory"],
      ["inquiries", "Customer inquiries"],
      ["customers", "Customers"],
      ["suppliers", "Suppliers"],
      ...(owner ? [["billing", "Invoices & billing"], ["reports", "Reports"], ["settings", "Owner settings"]] : []),
    ];
    const value = (key) => {
      const amount = Number(key);
      return `Rs ${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
    };
    const allState = { parts, customers, suppliers, inquiries, ...(owner ? { bills, purchases } : {}) };
    useEffect(() => {
      setSaving(true);
      Promise.resolve(onSave(allState))
        .catch((error) => setFormError(`Could not save workshop changes: ${error.message}`))
        .finally(() => setSaving(false));
    }, [parts, customers, suppliers, inquiries, bills, purchases]);

    function addPart(event) {
      event.preventDefault();
      setFormError("");
      const data = new FormData(event.currentTarget);
      const name = String(data.get("name") || "").trim();
      const sku = String(data.get("sku") || "").trim();
      const price = Number(data.get("price"));
      const stock = Number(data.get("stock"));
      if (!name || !sku || !Number.isFinite(price) || price < 0 || !Number.isSafeInteger(stock) || stock < 0) {
        setFormError("Enter a part name, workshop reference, non-negative price and whole-number stock.");
        return;
      }
      const part = {
        id: `part-${Date.now()}`,
        name,
        category: String(data.get("category") || "General").trim(),
        brand: String(data.get("brand") || "").trim(),
        model: String(data.get("model") || "").trim(),
        sku,
        price,
        stock,
      };
      setParts((current) => [part, ...current]);
      event.currentTarget.reset();
    }

    function saveInvoice(event) {
      event.preventDefault();
      setFormError("");
      const data = new FormData(event.currentTarget);
      const customerName = String(data.get("customer") || "").trim();
      const invoiceNo = String(data.get("invoice") || "").trim();
      const total = Number(data.get("total"));
      if (!customerName || !invoiceNo || !Number.isFinite(total) || total <= 0) {
        setFormError("Enter a customer, invoice number and positive total.");
        return;
      }
      setBills((current) => [{
        id: `invoice-${Date.now()}`,
        invoiceNo,
        customer: { name: customerName },
        total,
        date: new Date().toISOString().slice(0, 10),
        method: String(data.get("method") || "Cash"),
        status: "Pending",
      }, ...current]);
      event.currentTarget.reset();
    }

    function updateInquiry(id, status) {
      setInquiries((current) => current.map((inquiry) => inquiry.id === id ? { ...inquiry, status } : inquiry));
    }

    const inventoryValue = parts.reduce((sum, part) => sum + Number(part.price || 0) * Number(part.stock || 0), 0);
    const revenue = bills.reduce((sum, bill) => sum + Number(bill.total || 0), 0);
    const expense = purchases.reduce((sum, purchase) => sum + Number(purchase.total || purchase.amount || 0), 0);
    const lowStock = parts.filter((part) => Number(part.stock) <= 5);
    const cell = (content, key) => h("td", { key }, content || "—");

    let content;
    if (page === "overview") {
      content = h(React.Fragment, null,
        h("section", { className: "dashboard-panel" },
          h("div", { className: "eyebrow" }, `${owner ? "Owner" : "Admin"} workspace`),
          h("h1", { className: "page-title" }, "Workshop records"),
          h("p", { className: "lede" }, "Only saved workshop records appear here. New inquiries and inventory are shared with the workshop database."),
          h("div", { className: "stat-grid" },
            ...[
              ["Parts on record", parts.length],
              ["Open inquiries", inquiries.filter((item) => item.status === "New").length],
              ["Low-stock records", lowStock.length],
              ...(owner ? [["Recorded invoices", bills.length], ["Recorded revenue", value(revenue)], ["Inventory value", value(inventoryValue)]] : []),
            ].map(([label, count]) => h("div", { className: "stat", key: label }, h("small", null, label), h("strong", null, count))),
          ),
        ),
        h("section", { className: "dashboard-panel" }, h("h2", null, "Recent inquiries"), inquiries.length ? h("div", { className: "table-wrap" }, h("table", null, h("thead", null, h("tr", null, h("th", null, "Name"), h("th", null, "Motorcycle"), h("th", null, "Part / service"), h("th", null, "Status"))), h("tbody", null, ...inquiries.slice(0, 6).map((item) => h("tr", { key: item.id }, cell(item.name, "name"), cell(item.motorcycle, "bike"), cell(item.part, "part"), cell(item.status || "New", "status")))))) : h("p", { className: "empty-state" }, "No customer inquiries have been received yet.")),
      );
    } else if (page === "parts") {
      content = h("section", { className: "dashboard-panel" },
        h("h1", null, "Parts & inventory"),
        h("p", { className: "form-note" }, "Saved prices and quantities are internal workshop records. Public reference listings do not expose this inventory."),
        h("form", { className: "dashboard-toolbar", onSubmit: addPart },
          ...[
            ["name", "Part name", "text"],
            ["sku", "Workshop reference", "text"],
            ["category", "Category", "text"],
            ["brand", "Brand", "text"],
            ["model", "Model / fitment note", "text"],
            ["price", "Price (NPR)", "number"],
            ["stock", "Stock units", "number"],
          ].map(([name, label, type]) => h("div", { className: "field", key: name }, h("label", { htmlFor: `part-${name}` }, label), h("input", { id: `part-${name}`, name, type, min: type === "number" ? "0" : undefined, step: type === "number" && name === "price" ? "0.01" : undefined, required: ["name", "sku", "price", "stock"].includes(name) }))),
          h(Control, { type: "submit" }, "Save part"),
        ),
        h("p", { className: "form-status error", role: "alert" }, formError),
        parts.length ? h("table", null, h("thead", null, h("tr", null, h("th", null, "Part"), h("th", null, "Reference"), h("th", null, "Category"), h("th", null, "Price"), h("th", null, "Stock"))), h("tbody", null, ...parts.map((part) => h("tr", { key: part.id }, cell(part.name, "name"), cell(part.sku, "sku"), cell(part.category, "category"), cell(value(Number(part.price || 0)), "price"), cell(part.stock, "stock"))))) : h("p", { className: "empty-state" }, "No saved inventory records."),
      );
    } else if (page === "inquiries") {
      content = h("section", { className: "dashboard-panel" },
        h("h1", null, "Customer inquiries"),
        inquiries.length
          ? h(
              "table",
              null,
              h(
                "thead",
                null,
                h(
                  "tr",
                  null,
                  ...["Customer", "Phone", "Motorcycle", "Part", "Request", "Status"].map((label) =>
                    h("th", { key: label }, label),
                  ),
                ),
              ),
              h(
                "tbody",
                null,
                ...inquiries.map((item) =>
                  h(
                    "tr",
                    { key: item.id },
                    cell(item.name, "name"),
                    cell(h("a", { href: `tel:${item.phone}` }, item.phone), "phone"),
                    cell(item.motorcycle, "bike"),
                    cell(item.part, "part"),
                    cell(item.details, "details"),
                    h(
                      "td",
                      { key: "status" },
                      h(
                        "select",
                        {
                          value: item.status || "New",
                          "aria-label": `Status for inquiry from ${item.name}`,
                          onChange: (event) => updateInquiry(item.id, event.target.value),
                        },
                        ...["New", "In discussion", "Quoted", "Closed"].map((status) =>
                          h("option", { key: status, value: status }, status),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            )
          : h("p", { className: "empty-state" }, "No customer inquiries have been received yet."),
      );
    } else if (page === "customers") {
      content = h("section", { className: "dashboard-panel" }, h("h1", null, "Customers"), customers.length ? h("table", null, h("thead", null, h("tr", null, h("th", null, "Name"), h("th", null, "Phone"), h("th", null, "Orders"))), h("tbody", null, ...customers.map((item, index) => h("tr", { key: item.id || item.name || index }, cell(item.name, "name"), cell(item.phone, "phone"), cell(item.orders, "orders"))))) : h("p", { className: "empty-state" }, "No customer records are saved yet."));
    } else if (page === "suppliers") {
      content = h("section", { className: "dashboard-panel" }, h("h1", null, "Suppliers"), suppliers.length ? h("table", null, h("thead", null, h("tr", null, h("th", null, "Supplier"), h("th", null, "Category"), h("th", null, "Contact"))), h("tbody", null, ...suppliers.map((item, index) => h("tr", { key: item.id || item.name || index }, cell(item.name, "name"), cell(item.category, "category"), cell(item.contact, "contact"))))) : h("p", { className: "empty-state" }, "No supplier records are saved yet."));
    } else if (page === "billing") {
      content = h("section", { className: "dashboard-panel" },
        h("h1", null, "Invoices & billing"),
        h("div", { className: "stat-grid" }, h("div", { className: "stat" }, h("small", null, "Recorded revenue"), h("strong", null, value(revenue)), h("small", null, "from saved invoices only")), h("div", { className: "stat" }, h("small", null, "Purchases recorded"), h("strong", null, value(expense)))),
        h("form", { className: "dashboard-toolbar", onSubmit: saveInvoice },
          ...[["invoice", "Invoice number"], ["customer", "Customer"], ["total", "Total (NPR)"]].map(([name, label]) => h("div", { className: "field", key: name }, h("label", { htmlFor: `bill-${name}` }, label), h("input", { id: `bill-${name}`, name, type: name === "total" ? "number" : "text", min: name === "total" ? "0.01" : undefined, step: name === "total" ? "0.01" : undefined, required: true }))),
          h("div", { className: "field" }, h("label", { htmlFor: "bill-method" }, "Payment method"), h("select", { id: "bill-method", name: "method" }, ...["Cash", "Bank transfer", "Digital wallet", "Other"].map((method) => h("option", { key: method }, method)))),
          h(Control, { type: "submit" }, "Record invoice"),
        ),
        h("p", { className: "form-status error", role: "alert" }, formError),
        bills.length ? h("table", null, h("thead", null, h("tr", null, h("th", null, "Invoice"), h("th", null, "Customer"), h("th", null, "Date"), h("th", null, "Total"), h("th", null, "Status"))), h("tbody", null, ...bills.map((bill) => h("tr", { key: bill.id }, cell(bill.invoiceNo, "invoice"), cell(bill.customer?.name || bill.customerName, "customer"), cell(bill.date, "date"), cell(value(Number(bill.total || 0)), "total"), cell(bill.status, "status"))))) : h("p", { className: "empty-state" }, "No invoices are saved yet."),
      );
    } else if (page === "reports") {
      content = h("section", { className: "dashboard-panel" }, h("h1", null, "Reports"), h("p", { className: "form-note" }, "Summaries use saved records only; no sample totals or projected stock are included."), h("div", { className: "stat-grid" }, ...[["Revenue", value(revenue)], ["Purchase records", value(expense)], ["Inventory value", value(inventoryValue)], ["Customer count", customers.length], ["Parts count", parts.length], ["Open inquiries", inquiries.filter((item) => item.status === "New").length]].map(([label, number]) => h("div", { className: "stat", key: label }, h("small", null, label), h("strong", null, number)))));
    } else {
      content = h("section", { className: "dashboard-panel" }, h("h1", null, "Owner settings"), h("p", { className: "form-note" }, `Signed in as ${session.username}. Owner permissions are enforced by the server.`), h(Control, { className: "quiet", onClick: onLogout }, "Sign out"));
    }

    return h(PageFrame, null,
      h("div", { className: "dashboard-shell" },
        h("nav", { className: "dashboard-nav surface", "aria-label": "Workshop dashboard" }, ...menus.map(([id, label]) => h("button", { key: id, type: "button", "aria-current": page === id ? "page" : undefined, onClick: () => { setFormError(""); setPage(id); } }, label))),
        h("div", { className: "dashboard-main" },
          h("div", { className: "dashboard-top" }, h("div", null, h("div", { className: "eyebrow" }, `${session.role} session`), h("strong", null, session.username), h("p", { className: "form-note" }, saving ? "Saving changes…" : "Workshop data is stored on the server.")), h(Control, { className: "quiet", onClick: onLogout }, "Sign out")),
          content,
        ),
      ),
    );
  }

  function WorkshopSite() {
    const [route, setRouteState] = useState(routeFromHash);
    const [navOpen, setNavOpen] = useState(false);
    const [catalog, setCatalog] = useState([]);
    const [catalogError, setCatalogError] = useState("");
    const [configured, setConfigured] = useState(false);
    const [session, setSession] = useState(null);
    const [workspace, setWorkspace] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState("");
    const saveQueue = useRef(Promise.resolve());
    const lastSaved = useRef({});

    useEffect(() => {
      const handleHash = () => setRouteState(routeFromHash());
      window.addEventListener("hashchange", handleHash);
      return () => window.removeEventListener("hashchange", handleHash);
    }, []);

    useEffect(() => {
      let active = true;
      Promise.all([
        request("/api/auth/status"),
        request("/api/catalog/products"),
        request("/api/auth/me"),
      ]).then(async ([authStatus, parts, identity]) => {
        if (!active) return;
        setConfigured(Boolean(authStatus.configured));
        setCatalog(parts.products || []);
        if (identity.user) {
          const result = await request("/api/workshop/state");
          if (!active) return;
          const state = result.state || {};
          setSession(identity.user);
          setWorkspace(state);
          lastSaved.current = JSON.parse(JSON.stringify(state));
        }
      }).catch((error) => {
        if (active) setCatalogError(error.message);
      }).finally(() => {
        if (active) setLoading(false);
      });
      return () => { active = false; };
    }, []);

    useEffect(() => {
      if (!toast) return undefined;
      const timer = window.setTimeout(() => setToast(""), 4500);
      return () => window.clearTimeout(timer);
    }, [toast]);

    async function login(role, username, password) {
      const result = await request("/api/auth/login", { method: "POST", body: { role, username, password } });
      const stateResult = await request("/api/workshop/state");
      const state = stateResult.state || {};
      setSession(result.user);
      setWorkspace(state);
      lastSaved.current = JSON.parse(JSON.stringify(state));
      setRoute("/dashboard");
    }

    async function logout() {
      try {
        await request("/api/auth/logout", { method: "POST", body: {} });
      } catch (error) {
        setToast(`Sign-out could not be confirmed: ${error.message}`);
        return;
      }
      setSession(null);
      setWorkspace(null);
      lastSaved.current = {};
      setRoute("/");
    }

    async function saveState(nextState) {
      if (!session) throw new Error("Your workshop session has expired. Sign in again.");
      const writableKeys = ["parts", "customers", "suppliers", "inquiries"];
      if (session.role === "owner") writableKeys.push("bills", "purchases");
      saveQueue.current = saveQueue.current.catch(() => {}).then(async () => {
        const updates = writableKeys.filter((key) =>
          JSON.stringify(lastSaved.current[key] ?? []) !== JSON.stringify(nextState[key] ?? []),
        );
        for (const key of updates) {
          await request("/api/workshop/state", {
            method: "PUT",
            body: { key, value: nextState[key] ?? [] },
          });
        }
        lastSaved.current = { ...lastSaved.current, ...nextState };
      });
      return saveQueue.current;
    }

    async function submitInquiry(form) {
      return request("/api/inquiries", { method: "POST", body: form });
    }

    if (loading) return h("div", { className: "loading", role: "status" }, "Opening Biswokarma Workshop…");

    let page;
    if (route.path === "/parts") {
      page = catalogError
        ? h(PageFrame, null, h("section", { className: "dashboard-panel" }, h("h1", null, "Spare parts"), h("p", { className: "form-status error", role: "alert" }, `Parts could not be loaded: ${catalogError}`)))
        : h(PartsPage, { products: catalog, initialCategory: route.query.get("category") || "" });
    } else if (route.path === "/inquiry") {
      page = h(InquiryPage, { onSubmit: submitInquiry, prefilledPart: route.query.get("part") || "" });
    } else if (route.path === "/admin-login" || route.path === "/owner-login") {
      page = h(LoginPage, { role: route.path === "/owner-login" ? "owner" : "admin", configured, onLogin: login });
    } else if (route.path === "/dashboard" && session && workspace) {
      page = h(DashboardPage, { session, initialState: workspace, onSave: saveState, onLogout: logout });
    } else {
      page = h(HomePage, { products: catalog });
    }

    return h(React.Fragment, null,
      h(PublicHeader, { path: route.path, session, navOpen, setNavOpen, onLogout: logout }),
      page,
      h(Footer),
      toast ? h("div", { className: "toast", role: "status", "aria-live": "polite" }, toast) : null,
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(h(WorkshopSite));
})();
