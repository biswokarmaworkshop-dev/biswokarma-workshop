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

  function listingSourceLabel(product) {
    return product.catalogSource === "workshop_inventory"
      ? "Saved workshop record · confirm details"
      : "Unverified demo reference";
  }

  function findProductBySlug(products, slug) {
    return products.find((product) => productSlug(product) === slug) || null;
  }

  function illustrativeImages(illustration, illustrationSource) {
    if (
      !illustration ||
      illustrationSource !== "User-supplied generated parts catalog sheet" ||
      typeof illustration.filename !== "string" ||
      !/^[a-z0-9-]+\.jpg$/i.test(illustration.filename) ||
      typeof illustration.alt !== "string" ||
      !/illustrative/i.test(illustration.alt) ||
      !/not the exact product or an OEM photo/i.test(illustration.alt)
    )
      return [];
    return [
      {
        type: "illustrative_reference",
        url: `/images/illustrative-jcb-parts/${illustration.filename}`,
        alt: illustration.alt,
        caption:
          "Illustrative reference only - not the exact product or an OEM photo",
        sourceName: illustrationSource,
      },
    ];
  }

  function findInventoryIllustration(part, manifest) {
    if (
      !part ||
      typeof part.name !== "string" ||
      !manifest ||
      manifest.source !== "User-supplied generated parts catalog sheet" ||
      !manifest.images ||
      typeof manifest.images !== "object" ||
      Array.isArray(manifest.images)
    )
      return null;
    const baseName = part.name.replace(/ \(Batch [1-9]\d*\)$/, "");
    return Object.prototype.hasOwnProperty.call(manifest.images, baseName)
      ? manifest.images[baseName]
      : null;
  }

  function inventoryListing(part, illustration, illustrationSource) {
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
      compatibleModels: part.machine ? [String(part.machine)] : [],
      description: `Existing workshop inventory listing for ${String(part.name || "this part")}. Confirm supplier brand, exact fitment and current price with the workshop.`,
      specs: { inventoryStatus: "Existing workshop inventory record" },
      images: illustrativeImages(illustration, illustrationSource),
      catalogSource: "workshop_inventory",
    };
  }

  function catalogListing(product, illustration, illustrationSource) {
    const images = illustrativeImages(illustration, illustrationSource);
    return {
      ...product,
      brand: "Supplier details unverified",
      brandVerified: false,
      priceNpr: null,
      priceBasis: "Request a quote; no verified supplier price",
      stock: null,
      availability: "confirm_with_workshop",
      compatibleModels: [],
      description:
        "Unverified demo catalog entry for quote requests. Confirm supplier, exact machine and serial-number fitment, specifications, price and availability with the workshop.",
      specs: {},
      images,
      catalogSource: "demo_catalog",
    };
  }

  function displayImages(images) {
    if (!Array.isArray(images)) return [];
    const verified = verifiedImages(images);
    const illustrative = images.filter(
      (image) =>
        image &&
        image.type === "illustrative_reference" &&
        typeof image.url === "string" &&
        /^\/images\/illustrative-jcb-parts\/[a-z0-9-]+\.jpg$/i.test(image.url) &&
        typeof image.alt === "string" &&
        /illustrative/i.test(image.alt) &&
        /not the exact product or an OEM photo/i.test(image.alt) &&
        image.caption ===
          "Illustrative reference only - not the exact product or an OEM photo" &&
        image.sourceName === "User-supplied generated parts catalog sheet",
    );
    return [...verified, ...illustrative];
  }

  function filterProducts(products, filters) {
    const query = String(filters.query || "").trim().toLowerCase();
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
      if (filters.source && product.catalogSource !== filters.source) return false;
      if (query && !searchable.includes(query)) return false;
      if (filters.model && !(product.compatibleModels || []).includes(filters.model))
        return false;
      if (filters.category && product.category !== filters.category) return false;
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
    catalogListing,
    displayImages,
    filterProducts,
    findInventoryIllustration,
    findProductBySlug,
    inventoryListing,
    listingSourceLabel,
    productSlug,
    verifiedImages,
  };
});
