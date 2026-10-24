(function () {
  "use strict";

  const h = React.createElement;
  const { useEffect, useMemo, useRef, useState } = React;
  const DEFAULT_PUBLIC_SETTINGS = {
    email: "biswokarmaworkshop@gmail.com",
    phonePrimary: "9866389738",
    phoneSecondary: "9806567713",
    address: "Khol Khole, Gorkha 8, Gandaki Province, Nepal",
  };

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

  function whatsappNumber(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (String(phone || "").trim().startsWith("+")) return digits;
    return digits.startsWith("977") ? digits : `977${digits}`;
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

  function Footer({ settings }) {
    return h(
      "footer",
      { className: "site-footer" },
      h(
        "div",
        { className: "site-shell footer-inner" },
        h("div", null, h("strong", null, "BISWOKARMA WORKSHOP"), h("p", null, `Vehicle servicing and motorcycle parts in ${settings.address}.`)),
        h(
          "div",
          { className: "footer-contact", "aria-label": "Workshop contact details" },
          h("a", { href: `tel:${settings.phonePrimary.replace(/[^\d+]/g, "")}` }, `Call ${settings.phonePrimary}`),
          h("a", { href: `tel:${settings.phoneSecondary.replace(/[^\d+]/g, "")}` }, `Call ${settings.phoneSecondary}`),
          h("a", { href: `mailto:${settings.email}` }, settings.email),
          h("a", { href: `https://wa.me/${whatsappNumber(settings.phonePrimary)}`, target: "_blank", rel: "noopener noreferrer" }, "WhatsApp"),
        ),
      ),
    );
  }

  function PageFrame({ children }) {
    return h("main", { id: "main-content", className: "site-shell", tabIndex: -1 }, children);
  }

  function WorkshopHeroVisual() {
    return h(
      "div",
      { className: "hero-visual", role: "img", "aria-label": "Decorative Biswokarma Workshop mechanical emblem, with vehicle services listed nearby" },
      h("span", { className: "hero-visual-label top", "aria-hidden": "true" }, "Local workshop · Gorkha"),
      h("span", { className: "hero-gear", "aria-hidden": "true" }, h("span", { className: "hero-gear-inner" }, "BW")),
      h("div", { className: "workshop-visual-mark", "aria-hidden": "true" },
        h("span", { className: "workshop-mark-ring", "aria-hidden": "true" }),
        h("span", { className: "workshop-mark-name" }, "BISWOKARMA"),
        h("span", { className: "workshop-mark-subtitle" }, "WORKSHOP"),
        h("span", { className: "workshop-mark-location" }, "GORKHA · NEPAL"),
      ),
      h("span", { className: "hero-visual-label bottom", "aria-hidden": "true" }, "Service for the vehicles you depend on"),
    );
  }

  function HomePage() {
    const homeRef = useRef(null);
    const [introActive, setIntroActive] = useState(() => {
      if (
        typeof window === "undefined" ||
        (typeof window.matchMedia === "function" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      )
        return false;
      try {
        if (window.sessionStorage.getItem("bw-home-intro-seen")) return false;
        window.sessionStorage.setItem("bw-home-intro-seen", "true");
        return true;
      } catch {
        return false;
      }
    });
    useEffect(() => {
      if (!introActive) return undefined;
      const timer = window.setTimeout(() => setIntroActive(false), 2400);
      return () => window.clearTimeout(timer);
    }, [introActive]);
    useEffect(() => {
      const root = homeRef.current;
      if (
        !root ||
        (typeof window.matchMedia === "function" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      )
        return undefined;
      const elements = [...root.querySelectorAll(".home-reveal")];
      if (!("IntersectionObserver" in window)) {
        elements.forEach((element) => element.classList.add("is-visible"));
        return undefined;
      }
      root.classList.add("motion-ready");
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      elements.forEach((element) => observer.observe(element));
      return () => observer.disconnect();
    }, []);
    return h(
      PageFrame,
      null,
      h("div", { className: "home-page", ref: homeRef },
      h(
        "section",
        { className: `hero${introActive ? " is-entering" : ""}`, "aria-labelledby": "home-title" },
        introActive
          ? h("button", { className: "skip-intro", type: "button", onClick: () => setIntroActive(false) }, "Skip intro")
          : null,
        h(
          "div",
          { className: "hero-copy" },
          h("div", { className: "eyebrow" }, "Biswokarma Workshop · Gorkha, Nepal"),
          h("h1", { id: "home-title" }, "Service for the machines that ", h("span", null, "keep Gorkha moving.")),
          h("p", { className: "lede" }, "From construction equipment and transport to agriculture and two-wheelers, Biswokarma Workshop services JCB, buses, trucks, tractors, motorcycles and more. Tell us what your vehicle does and what needs attention; we’ll discuss the service with you."),
          h(
            "div",
            { className: "hero-actions" },
            h("a", { className: "control-link", href: "#/inquiry" }, "Contact the workshop"),
            h("a", { className: "control-link secondary", href: "#/parts" }, "Browse spare parts"),
          ),
          h("div", { className: "hero-status", "aria-label": "Workshop location: Gorkha" }, "Khol Khole · Gorkha, Nepal"),
        ),
        h(WorkshopHeroVisual),
      ),
      h(
        "section",
        { className: "section home-reveal", "aria-labelledby": "vehicles-title" },
        h("div", { className: "section-heading" }, h("div", null, h("div", { className: "eyebrow" }, "Workshop services"), h("h2", { id: "vehicles-title" }, "One local workshop. Many kinds of vehicles."))),
        h(
          "div",
          { className: "card-grid vehicle-grid" },
          ...[
            ["01", "JCB & heavy equipment", "Servicing for the machines that build and shape the region."],
            ["02", "Bus & truck", "Support for the vehicles that carry people and goods."],
            ["03", "Tractors", "Servicing for agricultural vehicles and everyday farm work."],
            ["04", "Motorcycles", "Service and parts inquiries for everyday two-wheelers."],
            ["05", "Other vehicles", "Have a different vehicle? Talk with us about its servicing needs."],
          ].map(([number, title, copy]) =>
            h(
              "a",
              { className: "machine-card vehicle-link", href: `#/service-request?vehicle=${encodeURIComponent(title)}`, key: number },
              h("div", { className: "eyebrow" }, number),
              h("h3", null, title),
              h("p", null, copy),
              h("span", { className: "vehicle-link-action" }, "Request service →"),
            ),
          ),
        ),
      ),
      h(
        "section",
        { className: "section home-reveal", id: "workshop" },
        h("div", { className: "workshop-about surface" },
          h("div", { className: "eyebrow" }, "About the workshop"),
          h("h2", null, "Local knowledge for the machines your work depends on."),
          h("p", { className: "lede" }, "Every vehicle has a job to do. Share what you drive, the work it performs and what needs attention; Biswokarma Workshop can discuss servicing for JCB, buses, trucks, tractors, motorcycles and more, here in Gorkha."),
          h("a", { className: "control-link", href: "#/inquiry" }, "Get in touch"),
        ),
      ),
      ),
    );
  }

  function PartsPage({ products, initialCategory }) {
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState(initialCategory || "");
    const productGridRef = useRef(null);
    const categories = [...new Set(products.map((product) => product.category))].sort();
    const visible = useMemo(() => {
      const needle = query.trim().toLowerCase();
      return products.filter((product) =>
        (!category || product.category === category) &&
        (!needle || `${product.name} ${product.partNumber} ${product.category}`.toLowerCase().includes(needle)),
      );
    }, [products, query, category]);
    useEffect(() => {
      const grid = productGridRef.current;
      if (!grid || (typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches))
        return undefined;
      const cards = [...grid.querySelectorAll(".product-card")];
      if (!("IntersectionObserver" in window)) {
        cards.forEach((card) => card.classList.add("is-visible"));
        return undefined;
      }
      grid.classList.add("motion-ready");
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.1, rootMargin: "0px 0px -5% 0px" });
      cards.forEach((card) => observer.observe(card));
      return () => observer.disconnect();
    }, [visible]);
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
            { className: "product-grid", ref: productGridRef },
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

  function InquiryPage({ onSubmit, prefilledPart, prefilledVehicle, settings, serviceMode = false }) {
    const [form, setForm] = useState({
      kind: serviceMode ? "vehicle-service" : "general",
      name: "",
      phone: "",
      motorcycle: prefilledVehicle || "",
      part: prefilledPart || "",
      details: "",
      serviceLocation: "",
      coverageConfirmed: false,
    });
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
        setStatus(serviceMode
          ? "Your service request was sent to the workshop. We will confirm the location and arrange next steps by phone."
          : "Your request was sent to the workshop. We will follow up using the phone number you provided.");
        setForm({ kind: serviceMode ? "vehicle-service" : "general", name: "", phone: "", motorcycle: "", part: "", details: "", serviceLocation: "", coverageConfirmed: false });
      } catch (error) {
        setStatus(error.message);
      } finally {
        setSubmitting(false);
      }
    }
    return h(
      PageFrame,
      null,
      h("section", { className: "page-intro" },
        h("div", { className: "eyebrow" }, serviceMode ? "Vehicle service · Gorkha area" : "Service request · parts inquiry"),
        h("h1", { className: "page-title" }, serviceMode ? "Request vehicle service" : "Ask the workshop"),
        h("p", { className: "lede" }, serviceMode
          ? "Share your vehicle, service needs and location. On-site service requests are for locations within approximately 24 km of Biswokarma Workshop in Khol Khole, Gorkha; the workshop will confirm coverage before arranging service."
          : "Tell us about your vehicle and what it needs. We will review your request and confirm the next steps with you."),
      ),
      h(
        "div",
        { className: "inquiry-layout" },
        h(
          "form",
          { className: "inquiry-card", onSubmit: submit },
          h("div", { className: "form-grid" },
            h("div", { className: "field" }, h("label", { htmlFor: "inquiry-name" }, "Your name *"), h("input", { id: "inquiry-name", name: "name", required: true, maxLength: 100, autoComplete: "name", value: form.name, onChange: change("name") })),
            h("div", { className: "field" }, h("label", { htmlFor: "inquiry-phone" }, "Phone number *"), h("input", { id: "inquiry-phone", name: "phone", type: "tel", required: true, maxLength: 40, autoComplete: "tel", value: form.phone, onChange: change("phone"), placeholder: "Your contact number" })),
            h("div", { className: "field full" }, h("label", { htmlFor: "inquiry-bike" }, serviceMode ? "Vehicle type, make and model *" : "Vehicle details"), h("input", { id: "inquiry-bike", name: "motorcycle", required: serviceMode, maxLength: 120, value: form.motorcycle, onChange: change("motorcycle"), placeholder: "For example: JCB, bus, truck, tractor or motorcycle" })),
            h("div", { className: "field full" }, h("label", { htmlFor: "inquiry-part" }, serviceMode ? "Service needed *" : "Part or service"), h("input", { id: "inquiry-part", name: "part", required: serviceMode, maxLength: 120, value: form.part, onChange: change("part"), placeholder: serviceMode ? "Describe the service you need" : "Part name, number or workshop service" })),
            serviceMode
              ? h(React.Fragment, null,
                  h("div", { className: "field full" }, h("label", { htmlFor: "service-location" }, "Service location / nearest landmark *"), h("input", { id: "service-location", name: "serviceLocation", required: true, maxLength: 240, autoComplete: "street-address", value: form.serviceLocation, onChange: change("serviceLocation"), placeholder: "Village / tole, municipality and a nearby landmark" })),
                  h("div", { className: "coverage-note field full" },
                    h("label", { className: "coverage-check", htmlFor: "coverage-confirmed" },
                      h("input", { id: "coverage-confirmed", name: "coverageConfirmed", type: "checkbox", required: true, checked: form.coverageConfirmed, onChange: (event) => setForm((current) => ({ ...current, coverageConfirmed: event.target.checked })) }),
                      h("span", null, "My service location is within approximately 24 km of Biswokarma Workshop, Khol Khole, Gorkha."),
                    ),
                    h("p", { className: "form-note" }, "Please enter your actual locality. This checkbox is your estimate, not an automatic distance check; the workshop will verify the location with you before arranging service."),
                  ),
                )
              : null,
            h("div", { className: "field full" }, h("label", { htmlFor: "inquiry-details" }, "What do you need? *"), h("textarea", { id: "inquiry-details", name: "details", required: true, minLength: 5, maxLength: 1000, value: form.details, onChange: change("details"), placeholder: serviceMode ? "Describe the issue, symptoms or work required." : "Describe the issue or the part you are looking for." })),
          ),
          h("p", { className: `form-status${status ? (receipt ? " success" : " error") : ""}`, role: "status", "aria-live": "polite" }, status),
          receipt ? h("p", { className: "form-note" }, `Inquiry reference: ${receipt}`) : null,
          h(Control, { type: "submit", disabled: submitting }, submitting ? "Sending…" : serviceMode ? "Send service request" : "Send inquiry"),
          h("p", { className: "form-note" }, serviceMode
            ? "This sends a request for the workshop Admin to review. The approximate service radius is checked with you before service is arranged."
            : "We use these details to reply to your request. An inquiry does not place an order or reserve stock."),
        ),
        h(
          "aside",
          { className: "contact-card machine-card", "aria-label": "Contact the workshop directly" },
          h("div", { className: "eyebrow" }, "Talk to a person"),
          h("h2", null, "Workshop contact"),
          h("p", null, "Prefer a call? Contact the workshop and share your vehicle details and service or part needs."),
          h("div", { className: "contact-line" }, h("a", { className: "control-link secondary", href: `tel:${settings.phonePrimary.replace(/[^\d+]/g, "")}` }, `Call ${settings.phonePrimary}`), h("a", { className: "control-link secondary", href: `tel:${settings.phoneSecondary.replace(/[^\d+]/g, "")}` }, `Call ${settings.phoneSecondary}`)),
          h("p", null, h("a", { href: `mailto:${settings.email}` }, settings.email)),
          h("p", null, settings.address),
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
          !configured
            ? h("div", { className: "note-bar", role: "status" }, "Sign-in is not configured on the hosting service yet. You can see the login form below, but the server will not accept sign-ins until the Admin and Owner accounts are configured.")
            : null,
          h("form", { className: "login-form", onSubmit: submit },
            h("div", { className: "field" }, h("label", { htmlFor: "login-username" }, "Username"), h("input", { id: "login-username", value: username, onChange: (event) => setUsername(event.target.value), autoComplete: "username", maxLength: 64, required: true })),
            h("div", { className: "field" }, h("label", { htmlFor: "login-password" }, "Password"), h("div", { className: "password-row" },
              h("input", { id: "login-password", type: showPassword ? "text" : "password", value: password, onChange: (event) => setPassword(event.target.value), autoComplete: "current-password", maxLength: 1024, required: true }),
              h("button", { type: "button", className: "password-toggle", "aria-label": showPassword ? "Hide password" : "Show password", "aria-pressed": showPassword, onClick: () => setShowPassword(!showPassword) },
                h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
                  showPassword
                    ? h(React.Fragment, null, h("path", { d: "M3 3l18 18" }), h("path", { d: "M10.6 10.6a2 2 0 002.8 2.8" }), h("path", { d: "M9.9 5.2A10.8 10.8 0 0112 5c5.5 0 9 7 9 7a16 16 0 01-3.1 3.9" }), h("path", { d: "M6.2 6.2C3.9 7.8 3 12 3 12s3.5 7 9 7a9.7 9.7 0 004-.8" }))
                    : h(React.Fragment, null, h("path", { d: "M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" }), h("circle", { cx: "12", cy: "12", r: "3" })),
                ),
              ),
            )),
            h("p", { className: `form-status${error ? " error" : ""}`, role: "alert" }, error),
            h(Control, { type: "submit", disabled: busy }, busy ? "Signing in…" : `Sign in as ${label}`),
          ),
          h("p", { className: "form-note" }, "Your sign-in is verified by the workshop server. Passwords are never stored in this browser."),
          h("p", { className: "form-note" }, h("a", { href: `#/${role === "owner" ? "admin" : "owner"}-login` }, `Go to ${role === "owner" ? "Admin" : "Owner"} login`)),
        ),
      ),
    );
  }

  function RevenueChart({ series, showExpenses }) {
    const maximum = Math.max(
      1,
      ...series.map((item) => Math.max(item.revenue, showExpenses ? item.expenses : 0)),
    );
    const x = (index) => 36 + index * 96;
    const y = (amount) => 154 - (amount / maximum) * 124;
    const revenuePoints = series.map((item, index) => `${x(index)},${y(item.revenue)}`).join(" ");
    const expensePoints = series.map((item, index) => `${x(index)},${y(item.expenses)}`).join(" ");
    return h("section", { className: "dashboard-panel chart-panel", "aria-labelledby": "sales-chart-title" },
      h("div", { className: "section-heading" },
        h("div", null, h("div", { className: "eyebrow" }, "Saved business records"), h("h2", { id: "sales-chart-title" }, "Daily sales · last 7 days")),
        h("span", { className: "chart-legend" }, h("span", { className: "legend-dot sales-dot" }), "Sales", showExpenses ? h(React.Fragment, null, h("span", { className: "legend-dot expense-dot" }), "Purchases") : null),
      ),
      h("svg", { className: "sales-chart", viewBox: "0 0 660 205", role: "img", "aria-labelledby": "sales-chart-title sales-chart-description" },
        h("desc", { id: "sales-chart-description" }, showExpenses ? "A seven-day line chart comparing saved invoice sales with recorded purchase expenses." : "A seven-day line chart of saved invoice sales."),
        ...[0, 1, 2, 3].map((line) => {
          const lineY = 30 + line * 42;
          return h("line", { key: `grid-${line}`, x1: 32, y1: lineY, x2: 636, y2: lineY, className: "chart-gridline" });
        }),
        h("polyline", { points: revenuePoints, className: "chart-line sales-line" }),
        showExpenses ? h("polyline", { points: expensePoints, className: "chart-line expense-line" }) : null,
        ...series.map((item, index) => h("g", { key: item.date },
          h("circle", { cx: x(index), cy: y(item.revenue), r: 4.5, className: "chart-point sales-point" }),
          showExpenses ? h("circle", { cx: x(index), cy: y(item.expenses), r: 4, className: "chart-point expense-point" }) : null,
          h("text", { x: x(index), y: 190, className: "chart-date", textAnchor: "middle" }, new Date(`${item.date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })),
        )),
      ),
      h("p", { className: "form-note" }, "Graph uses saved invoices only. Owner purchase line uses saved purchase records; no estimates or unrecorded sales are included."),
    );
  }

  function DashboardPage({ session, initialState, onSettingsChange, onSave, onCreateInvoice, onLogout }) {
    const owner = session.role === "owner";
    const [page, setPage] = useState("overview");
    const [parts, setParts] = useState(Array.isArray(initialState.parts) ? initialState.parts : []);
    const [customers, setCustomers] = useState(Array.isArray(initialState.customers) ? initialState.customers : []);
    const [suppliers, setSuppliers] = useState(Array.isArray(initialState.suppliers) ? initialState.suppliers : []);
    const [inquiries, setInquiries] = useState(Array.isArray(initialState.inquiries) ? initialState.inquiries : []);
    const [bills, setBills] = useState(Array.isArray(initialState.bills) ? initialState.bills : []);
    const [purchases, setPurchases] = useState(Array.isArray(initialState.purchases) ? initialState.purchases : []);
    const [orders, setOrders] = useState(Array.isArray(initialState.orders) ? initialState.orders : []);
    const [siteSettings, setSiteSettings] = useState({ ...DEFAULT_PUBLIC_SETTINGS, ...(initialState.settings || {}) });
    const [partSearch, setPartSearch] = useState("");
    const [activePartId, setActivePartId] = useState(initialState.parts?.[0]?.id || "");
    const [invoicePartId, setInvoicePartId] = useState(initialState.parts?.[0]?.id || "");
    const [invoiceQuantity, setInvoiceQuantity] = useState("1");
    const [invoiceError, setInvoiceError] = useState("");
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);
    const menus = [
      ["overview", "Overview"],
      ["parts", "Parts & inventory"],
      ["orders", "Orders"],
      ["inquiries", "Customer inquiries"],
      ["customers", "Customers"],
      ["suppliers", "Suppliers"],
      ...(!owner ? [["billing", "Invoices & billing"]] : [["reports", "Financial reports"], ["settings", "Owner settings"]]),
    ];
    const value = (key) => {
      const amount = Number(key);
      return `Rs ${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
    };
    const allState = { parts, customers, suppliers, inquiries, orders, bills, ...(owner ? { purchases, settings: siteSettings } : {}) };
    useEffect(() => {
      setSaving(true);
      Promise.resolve(onSave(allState))
        .catch((error) => setFormError(`Could not save workshop changes: ${error.message}`))
        .finally(() => setSaving(false));
    }, [parts, customers, suppliers, inquiries, bills, purchases, orders, siteSettings]);

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

    async function saveInvoice(event) {
      event.preventDefault();
      setInvoiceError("");
      const form = event.currentTarget;
      const data = new FormData(form);
      const customerName = String(data.get("customer") || "").trim();
      const customerPhone = String(data.get("phone") || "").trim();
      const invoiceNo = String(data.get("invoice") || "").trim();
      const itemId = String(data.get("item") || "");
      const quantity = Number(data.get("quantity"));
      if (!customerName || !invoiceNo || !itemId || !Number.isSafeInteger(quantity) || quantity < 1) {
        setInvoiceError("Enter the invoice and customer details, choose an item, and enter a whole-number quantity.");
        return;
      }
      try {
        const result = await onCreateInvoice({
          invoiceNo,
          customerName,
          customerPhone,
          itemId,
          quantity,
          method: String(data.get("method") || "Cash"),
        });
        setBills((current) => [result.invoice, ...current.filter((bill) => bill.id !== result.invoice.id)]);
        setParts((current) => current.map((part) => part.id === result.part.id ? result.part : part));
        setOrders((current) => [result.order, ...current.filter((order) => order.id !== result.order.id)]);
        setCustomers((current) => [result.customer, ...current.filter((customer) => customer.id !== result.customer.id)]);
        form.reset();
        setInvoiceQuantity("1");
        setInvoiceError("");
      } catch (error) {
        setInvoiceError(error.message);
      }
    }

    function updateInquiry(id, status) {
      setInquiries((current) => current.map((inquiry) => inquiry.id === id ? { ...inquiry, status } : inquiry));
    }

    function updateOrder(id, status) {
      setOrders((current) => current.map((order) => order.id === id ? { ...order, status } : order));
    }

    function savePublicSettings(event) {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const next = {
        ...siteSettings,
        email: String(data.get("email") || "").trim(),
        phonePrimary: String(data.get("phonePrimary") || "").trim(),
        phoneSecondary: String(data.get("phoneSecondary") || "").trim(),
        address: String(data.get("address") || "").trim(),
      };
      setSiteSettings(next);
      onSettingsChange(next);
    }

    const inventoryValue = parts.reduce((sum, part) => sum + Number(part.price || 0) * Number(part.stock || 0), 0);
    const revenue = bills.reduce((sum, bill) => sum + Number(bill.total || 0), 0);
    const expense = purchases.reduce((sum, purchase) => sum + Number(purchase.total || purchase.amount || 0), 0);
    const lowStock = parts.filter((part) => Number(part.stock) <= 5);
    const cell = (content, key) => h("td", { key }, content || "—");
    const daily = window.BiswokarmaMetrics.dailyMetrics(bills, purchases);
    const selectedInvoicePart = parts.find((part) => String(part.id) === invoicePartId);
    const requestedQuantity = Number(invoiceQuantity);
    const invoiceTotal = selectedInvoicePart && Number.isSafeInteger(requestedQuantity) && requestedQuantity > 0
      ? Math.round(Number(selectedInvoicePart.price || 0) * requestedQuantity * 100) / 100
      : 0;
    const invoiceVat = window.BiswokarmaMetrics.inclusiveVat(invoiceTotal);
    const filteredParts = parts.filter((part) =>
      `${part.name || ""} ${part.sku || ""} ${part.category || ""}`.toLowerCase().includes(partSearch.trim().toLowerCase()),
    );

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
              ["Orders to process", orders.filter((order) => order.status === "New").length],
              ["Open inquiries", inquiries.filter((item) => item.status === "New").length],
              ["Low-stock records", lowStock.length],
              ["Today's sales", value(daily[6].revenue)],
              ["Recorded invoices", bills.length],
              ...(owner ? [
                ["Recorded revenue", value(revenue)],
                ["Recorded expenses", value(expense)],
                ["Profit / loss*", value(revenue - expense)],
                ["Inventory value", value(inventoryValue)],
              ] : []),
            ].map(([label, count]) => h("div", { className: "stat", key: label }, h("small", null, label), h("strong", null, count))),
          ),
        ),
        h(RevenueChart, { series: daily, showExpenses: owner }),
        owner ? h("p", { className: "form-note" }, "*Recorded profit/loss is invoice revenue minus recorded purchases only; it is not a complete accounting or tax statement.") : null,
        h("section", { className: "dashboard-panel" }, h("h2", null, "Recent inquiries"), inquiries.length ? h("div", { className: "table-wrap" }, h("table", null, h("thead", null, h("tr", null, h("th", null, "Name"), h("th", null, "Vehicle"), h("th", null, "Service location"), h("th", null, "Part / service"), h("th", null, "Status"))), h("tbody", null, ...inquiries.slice(0, 6).map((item) => h("tr", { key: item.id }, cell(item.name, "name"), cell(item.motorcycle, "bike"), cell(item.serviceLocation, "location"), cell(item.part, "part"), cell(item.status || "New", "status")))))) : h("p", { className: "empty-state" }, "No customer inquiries have been received yet.")),
      );
    } else if (page === "parts") {
      const selectedPart = parts.find((part) => String(part.id) === String(activePartId)) || parts[0];
      content = h("section", { className: "dashboard-panel" },
        h("h1", null, "Parts & inventory"),
        h("p", { className: "form-note" }, "Saved prices and quantities are internal workshop records. Prices are VAT-inclusive; public reference listings do not expose this inventory."),
        h("div", { className: "inventory-viewer surface", "aria-label": "Inventory product viewer" },
          h("div", { className: "viewer-stage", "aria-hidden": "true" }, h("div", { className: "viewer-object" }, h("span", { className: "viewer-core" }))),
          h("div", { className: "viewer-details" },
            h("div", { className: "eyebrow" }, "Workshop inventory · illustrative 3D view"),
            h("h2", null, selectedPart?.name || "Select a saved part"),
            selectedPart ? h(React.Fragment, null,
              h("p", { className: "form-note" }, `Reference ${selectedPart.sku || "not recorded"} · ${selectedPart.category || "Uncategorised"}`),
              h("strong", { className: "viewer-stock" }, `${Number(selectedPart.stock || 0)} units recorded`),
              h("progress", { max: Math.max(5, Number(selectedPart.stock || 0)), value: Math.max(0, Number(selectedPart.stock || 0)), "aria-label": `Recorded stock for ${selectedPart.name}` }),
              h("p", { className: "form-note" }, "Abstract visual only—not a product photo or verified model. Stock is from the saved workshop record."),
            ) : h("p", { className: "form-note" }, "Add an inventory record to see its saved quantity here."),
          ),
        ),
        h("div", { className: "field inventory-search" }, h("label", { htmlFor: "inventory-search" }, "Search saved inventory"), h("input", { id: "inventory-search", type: "search", value: partSearch, onChange: (event) => setPartSearch(event.target.value), placeholder: "Name, reference or category" })),
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
        filteredParts.length ? h("div", { className: "table-wrap" }, h("table", null, h("thead", null, h("tr", null, h("th", null, "Part"), h("th", null, "Reference"), h("th", null, "Category"), h("th", null, "Price incl. VAT"), h("th", null, "Stock"))), h("tbody", null, ...filteredParts.map((part) => h("tr", { key: part.id, className: Number(part.stock) <= 5 ? "low-stock-row" : undefined }, cell(h("button", { type: "button", className: "text-button", onClick: () => setActivePartId(part.id) }, part.name), "name"), cell(part.sku, "sku"), cell(part.category, "category"), cell(value(Number(part.price || 0)), "price"), cell(h("span", { className: Number(part.stock) <= 5 ? "stock-warning" : "" }, `${part.stock}${Number(part.stock) <= 5 ? " · Low stock" : ""}`), "stock")))))) : h("p", { className: "empty-state" }, "No saved inventory records match that search."),
      );
    } else if (page === "orders") {
      content = h("section", { className: "dashboard-panel" },
        h("h1", null, "Orders"),
        h("p", { className: "form-note" }, owner ? "Order records are read-only here. Update stock and create invoices from the Admin workspace." : "Orders are created with Admin invoices; a saved invoice does not mean payment has been received."),
        orders.length ? h("div", { className: "table-wrap" }, h("table", null,
          h("thead", null, h("tr", null, ...["Order", "Customer", "Items", "Date", "Amount", "Status"].map((label) => h("th", { key: label }, label)))),
          h("tbody", null, ...orders.map((order) => h("tr", { key: order.id },
            cell(order.invoiceNo || order.id, "number"),
            cell(order.customer?.name, "customer"),
            cell((order.items || []).map((item) => `${item.name} × ${item.quantity}`).join(", "), "items"),
            cell(order.date, "date"),
            cell(value(Number(order.total || 0)), "total"),
            h("td", { key: "status" }, owner ? order.status || "New" : h("select", { value: order.status || "New", "aria-label": `Order status for ${order.invoiceNo || order.id}`, onChange: (event) => updateOrder(order.id, event.target.value) }, ...["New", "In progress", "Ready", "Completed", "Cancelled"].map((status) => h("option", { key: status, value: status }, status)))),
          ))),
        )) : h("p", { className: "empty-state" }, "No saved orders yet. Orders appear when Admin records an invoice."),
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
                  ...["Customer", "Phone", "Vehicle", "Service location", "Part / service", "Request", "Status"].map((label) =>
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
                    cell(item.serviceLocation, "location"),
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
        h("p", { className: "form-note" }, "Admin-only invoice creation. Inventory prices are VAT-inclusive; VAT is extracted using total ÷ 1.13."),
        h("div", { className: "stat-grid" },
          h("div", { className: "stat" }, h("small", null, "Recorded revenue · VAT included"), h("strong", null, value(revenue))),
          h("div", { className: "stat" }, h("small", null, "Invoices recorded"), h("strong", null, bills.length)),
          h("div", { className: "stat" }, h("small", null, "Today's sales"), h("strong", null, value(daily[6].revenue))),
        ),
        h("form", { className: "dashboard-toolbar", onSubmit: saveInvoice },
          ...[["invoice", "Invoice number"], ["customer", "Customer name"], ["phone", "Customer phone"]].map(([name, label]) => h("div", { className: "field", key: name }, h("label", { htmlFor: `bill-${name}` }, label), h("input", { id: `bill-${name}`, name, type: name === "phone" ? "tel" : "text", maxLength: name === "invoice" ? 40 : 100, required: name !== "phone" }))),
          h("div", { className: "field" }, h("label", { htmlFor: "bill-item" }, "Saved inventory item"), h("select", { id: "bill-item", name: "item", value: invoicePartId, onChange: (event) => setInvoicePartId(event.target.value), required: true }, h("option", { value: "" }, "Choose a part"), ...parts.map((part) => h("option", { key: part.id, value: part.id, disabled: Number(part.stock) < 1 || Number(part.price) <= 0 }, `${part.name} · ${part.stock} in stock · ${value(Number(part.price || 0))} incl. VAT`)))),
          h("div", { className: "field" }, h("label", { htmlFor: "bill-quantity" }, "Quantity"), h("input", { id: "bill-quantity", name: "quantity", type: "number", min: "1", max: "10000", step: "1", value: invoiceQuantity, onChange: (event) => setInvoiceQuantity(event.target.value), required: true })),
          h("div", { className: "field" }, h("label", { htmlFor: "bill-method" }, "Payment method"), h("select", { id: "bill-method", name: "method" }, ...["Cash", "Bank transfer", "Digital wallet", "Other"].map((method) => h("option", { key: method }, method)))),
          h("div", { className: "vat-preview", role: "status", "aria-live": "polite" },
            h("span", null, `Taxable amount: ${value(invoiceVat.taxable)}`),
            h("span", null, `VAT (13%): ${value(invoiceVat.vat)}`),
            h("strong", null, `Total incl. VAT: ${value(invoiceVat.total)}`),
          ),
          h("p", { className: "form-status error", role: "alert" }, invoiceError),
          h(Control, { type: "submit", disabled: !parts.length || !selectedInvoicePart || requestedQuantity < 1 || requestedQuantity > Number(selectedInvoicePart?.stock || 0) }, "Create invoice & update stock"),
        ),
        h("p", { className: "form-note" }, "Stock is checked on the server and reduced only after the invoice is accepted."),
        bills.length ? h("div", { className: "table-wrap" }, h("table", null, h("thead", null, h("tr", null, ...["Invoice", "Customer", "Date", "Taxable", "VAT", "Total incl. VAT", "Status"].map((label) => h("th", { key: label }, label)))), h("tbody", null, ...bills.map((bill) => h("tr", { key: bill.id }, cell(bill.invoiceNo, "invoice"), cell(bill.customer?.name || bill.customerName, "customer"), cell(bill.date, "date"), cell(value(Number(bill.taxableAmount || 0)), "taxable"), cell(value(Number(bill.vatAmount || 0)), "vat"), cell(value(Number(bill.total || 0)), "total"), cell(bill.status, "status")))))) : h("p", { className: "empty-state" }, "No invoices are saved yet."),
      );
    } else if (page === "reports") {
      content = h(React.Fragment, null,
        h("section", { className: "dashboard-panel" },
          h("h1", null, "Financial reports"),
          h("p", { className: "form-note" }, "Read-only reports use saved invoices and purchases. Profit/loss is invoice revenue minus recorded purchases only; this is not a full accounting or tax statement."),
          h("div", { className: "stat-grid" }, ...[
            ["Recorded revenue · VAT included", value(revenue)],
            ["Recorded purchases", value(expense)],
            [revenue >= expense ? "Recorded profit*" : "Recorded loss*", value(Math.abs(revenue - expense))],
            ["Today's sales", value(daily[6].revenue)],
            ["Inventory value · saved prices", value(inventoryValue)],
            ["Customer records", customers.length],
          ].map(([label, number]) => h("div", { className: "stat", key: label }, h("small", null, label), h("strong", null, number)))),
        ),
        h(RevenueChart, { series: daily, showExpenses: true }),
      );
    } else {
      content = h("section", { className: "dashboard-panel" },
        h("h1", null, "Website settings"),
        h("p", { className: "form-note" }, "Update the public workshop contact details shown on the home site, inquiry page and footer. Changes are saved to the workshop records."),
        h("form", { className: "settings-form", onSubmit: savePublicSettings },
          ...[
            ["email", "Public email address", "email", siteSettings.email],
            ["phonePrimary", "Primary phone / WhatsApp", "tel", siteSettings.phonePrimary],
            ["phoneSecondary", "Secondary phone", "tel", siteSettings.phoneSecondary],
            ["address", "Workshop address", "text", siteSettings.address],
          ].map(([name, label, type, value]) => h("div", { className: "field", key: name },
            h("label", { htmlFor: `setting-${name}` }, label),
            h("input", { id: `setting-${name}`, name, type, defaultValue: value, maxLength: name === "address" ? 180 : name === "email" ? 254 : 24, pattern: name.startsWith("phone") ? "[+0-9 ()-]{7,24}" : undefined, required: true }),
          )),
          h(Control, { type: "submit" }, "Save public contact settings"),
        ),
      );
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
    const [publicSettings, setPublicSettings] = useState(DEFAULT_PUBLIC_SETTINGS);
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
        request("/api/public/settings"),
      ]).then(async ([authStatus, parts, identity, settings]) => {
        if (!active) return;
        setConfigured(Boolean(authStatus.configured));
        setCatalog(parts.products || []);
        setPublicSettings({ ...DEFAULT_PUBLIC_SETTINGS, ...settings });
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
      if (session.role === "owner") writableKeys.push("purchases", "settings");
      else writableKeys.push("bills", "orders");
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

    async function createInvoice(invoice) {
      if (session?.role !== "admin")
        throw new Error("Admin access is required to create invoices.");
      return request("/api/workshop/invoices", {
        method: "POST",
        body: invoice,
      });
    }

    async function submitInquiry(form) {
      const endpoint = form.kind === "vehicle-service"
        ? "/api/service-requests"
        : "/api/inquiries";
      return request(endpoint, { method: "POST", body: form });
    }

    function updatePublicSettings(settings) {
      setPublicSettings({ ...DEFAULT_PUBLIC_SETTINGS, ...settings });
    }

    if (loading) return h("div", { className: "loading", role: "status" }, "Opening Biswokarma Workshop…");

    let page;
    if (route.path === "/parts") {
      page = catalogError
        ? h(PageFrame, null, h("section", { className: "dashboard-panel" }, h("h1", null, "Spare parts"), h("p", { className: "form-status error", role: "alert" }, `Parts could not be loaded: ${catalogError}`)))
        : h(PartsPage, { products: catalog, initialCategory: route.query.get("category") || "" });
    } else if (route.path === "/service-request") {
      page = h(InquiryPage, {
        onSubmit: submitInquiry,
        prefilledVehicle: route.query.get("vehicle") || "",
        settings: publicSettings,
        serviceMode: true,
      });
    } else if (route.path === "/inquiry") {
      page = h(InquiryPage, { onSubmit: submitInquiry, prefilledPart: route.query.get("part") || "", settings: publicSettings });
    } else if (route.path === "/admin-login" || route.path === "/owner-login") {
      page = h(LoginPage, { role: route.path === "/owner-login" ? "owner" : "admin", configured, onLogin: login });
    } else if (route.path === "/dashboard" && session && workspace) {
      page = h(DashboardPage, { session, initialState: workspace, onSettingsChange: updatePublicSettings, onSave: saveState, onCreateInvoice: createInvoice, onLogout: logout });
    } else {
      page = h(HomePage);
    }

    return h(React.Fragment, null,
      h(PublicHeader, { path: route.path, session, navOpen, setNavOpen, onLogout: logout }),
      page,
      h(Footer, { settings: publicSettings }),
      toast ? h("div", { className: "toast", role: "status", "aria-live": "polite" }, toast) : null,
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(h(WorkshopSite));
})();
