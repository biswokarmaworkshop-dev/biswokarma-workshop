(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BiswokarmaCatalog = api;
})(typeof globalThis === "undefined" ? this : globalThis, function () {
  "use strict";

  const slugify = (value) =>
    String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  function productSlug(product) {
    const id = String(product.id || "")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
    return `${slugify(product.name) || "part"}-${id}`;
  }

  function findProductBySlug(products, slug) {
    return products.find((product) => productSlug(product) === slug) || null;
  }

  function inventoryListing(part) {
    const hasStock =
      part.stock !== null && part.stock !== undefined && part.stock !== "";
    const stock =
      hasStock && Number.isFinite(Number(part.stock))
        ? Number(part.stock)
        : null;
    return {
      id: String(part.id),
      name: String(part.name || "Workshop inventory part"),
      partNumber: `INV-${String(part.id).toUpperCase()}`,
      partNumberType: "Workshop inventory reference (not an OEM part number)",
      category: String(part.category || "General"),
      brand: "Supplier brand unverified",
      brandVerified: false,
      priceNpr: Number(part.price) || 0,
      priceBasis: "Workshop inventory price; VAT-inclusive",
      stock,
      availability:
        stock === null
          ? "confirm_with_workshop"
          : stock > 0
            ? "in_stock"
            : "out_of_stock",
      compatibleModels: [String(part.machine || "Confirm with workshop")],
      description: `Existing workshop inventory listing for ${String(part.name || "this part")}. Confirm supplier brand, exact fitment and current price with the workshop.`,
      specs: { inventoryStatus: "Existing workshop inventory record" },
      images: [],
      catalogSource: "workshop_inventory",
    };
  }

  function filterProducts(products, filters) {
    const query = String(filters.query || "").trim().toLowerCase();
    const minimum = filters.minimumPrice === "" ? null : Number(filters.minimumPrice);
    const maximum = filters.maximumPrice === "" ? null : Number(filters.maximumPrice);
    return products.filter((product) => {
      const searchable = [
        product.name,
        product.partNumber,
        product.category,
        product.brand,
        ...(product.compatibleModels || []),
      ]
        .join(" ")
        .toLowerCase();
      if (
        Array.isArray(filters.productIds) &&
        !filters.productIds.includes(product.id)
      )
        return false;
      if (query && !searchable.includes(query)) return false;
      if (filters.model && !(product.compatibleModels || []).includes(filters.model))
        return false;
      if (filters.category && product.category !== filters.category) return false;
      if (filters.brand && product.brand !== filters.brand) return false;
      if (minimum !== null && product.priceNpr < minimum) return false;
      if (maximum !== null && product.priceNpr > maximum) return false;
      if (filters.inStock && !(Number(product.stock) > 0)) return false;
      return true;
    });
  }

  function addToCart(cart, productId, quantity) {
    const amount = Number(quantity);
    if (!productId || !Number.isInteger(amount) || amount < 1)
      throw new RangeError("A product and a positive whole-number quantity are required");
    const existing = cart.find((item) => item.productId === productId);
    if (!existing)
      return [...cart, { productId, quantity: amount }];
    return cart.map((item) =>
      item.productId === productId
        ? { ...item, quantity: item.quantity + amount }
        : item,
    );
  }

  function buildInquiry(products, form, cart = []) {
    const name = String(form.name || "").trim();
    const phone = String(form.phone || "").trim();
    const machineType = String(form.machineType || "").trim();
    const issue = String(form.issue || "").trim();
    if (!name || !phone || !machineType || !issue)
      throw new TypeError("Name, phone, machine model and request details are required");
    const requestedItems = products.map((product) => {
      const cartItem = cart.find((item) => item.productId === product.id);
      return {
        productId: product.id,
        name: product.name,
        partNumber: product.partNumber,
        quantity: cartItem ? cartItem.quantity : 1,
      };
    });
    return {
      name,
      phone,
      machineType,
      issue,
      requestedItems,
    };
  }

  function verifiedImages(images) {
    const reusableLicenses = new Set([
      "CC0",
      "CC BY 4.0",
      "CC BY-SA 4.0",
      "PUBLIC DOMAIN",
      "SUPPLIER PERMISSION",
    ]);
    if (!Array.isArray(images)) return [];
    return images.filter((image) => {
      if (!image || typeof image !== "object") return false;
      if (typeof image.url !== "string" || typeof image.sourceUrl !== "string")
        return false;
      if (!/^https:\/\//i.test(image.url) || !/^https:\/\//i.test(image.sourceUrl))
        return false;
      return Boolean(
        image.sourceName &&
          image.attribution &&
          reusableLicenses.has(String(image.license || "").toUpperCase()),
      );
    });
  }

  return {
    addToCart,
    buildInquiry,
    filterProducts,
    findProductBySlug,
    inventoryListing,
    productSlug,
    verifiedImages,
  };
});
