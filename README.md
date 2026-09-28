# Biswokarma Workshop

The live website is the Render-backed Node.js application served by `server.js`. It keeps the existing React interface, workshop state API, PostgreSQL/local-file persistence, login roles, inventory, invoices, payments, and admin/owner tools. The original homepage mark uses a restrained CSS/SVG depth treatment and an abstract interlocking-parts backdrop; reduced-motion settings disable decorative animation.

## Run locally

```bash
npm install
npm start
```

Set `DATABASE_URL` to use PostgreSQL; without it, the server stores workshop state in a local JSON file. Render deployment continues to use `render.yaml` and `node server.js`.

## Live product pages

The **Spare Parts** marketplace combines saved workshop inventory with 30 demo catalog records from `data/jcb-parts.json`. Its compact opening feature lets visitors select any of eight parts categories without scrolling through full-height chapters; category illustrations are clearly labeled as generated references, not exact product or OEM photos. Navigation is keyboard-accessible, mobile uses ordinary page scrolling, and reduced-motion preferences disable transitions. Catalog data is served by `GET /api/catalog/products`; demo records are sanitized before serving and contain no supplier price, stock, fitment or specifications. A subset has illustrative images mapped in `data/illustrative-jcb-parts.json`; the provenance and use limitation are recorded in `images/illustrative-jcb-parts/README.txt`. Saved inventory and inquiry records continue using the existing workshop-state API and persistence schema.

Each item has a shareable `/products/<part-name>-<part-id>` detail route. Search covers names and workshop references; machine and category filters use only recorded listing data. Demo products offer quote requests rather than made-up prices. Saved workshop inventory can show its recorded price and stock, both of which should be confirmed with the workshop. The quote cart is stored in browser local storage and submits requested products through the existing inquiry persistence flow. It does not reserve stock or create a payment.

The source JSON retains unverified demo seed data for maintenance, but the public catalog endpoint replaces its estimates and fitment/specification claims with quote-only records. Supplier brands and availability are not verified. The user-supplied generated catalog crops are only illustrative references and do not verify any product claim; no real supplier/OEM product photos are available. No independent license is asserted for the illustrations. Any verified product photo added later must include an HTTPS image URL, source page, source name, attribution and an approved reuse license (`CC0`, `CC BY 4.0`, `CC BY-SA 4.0`, `PUBLIC DOMAIN` or documented `SUPPLIER PERMISSION`) before it can render as a product photo.

The admin/owner role and active dashboard tab survive reload in the current browser tab using non-secret metadata in `sessionStorage`; logout clears it. Passwords are not written to this session metadata. This remains client-side UI state, not server-enforced authentication. Secure server-side authorization would require adding a backend login/session mechanism.

## VAT invoices

Inventory and custom line prices are VAT-inclusive. New invoices keep the entered gross amount as the total, calculate the taxable amount as `total / 1.13`, and show the included 13% VAT separately. Existing invoices remain unchanged.

## Optional sample-page generator

`scripts/generate.js` is retained for generating the two sample records in `data/products.json` under `dist/products/`. It is separate from the live inventory and is not the Render website entry point.

## Checks

```bash
npm run check
npm test
```
