# Biswokarma Workshop

The live website is the Render-backed Node.js application served by `server.js`. It keeps the existing React interface, workshop state API, PostgreSQL/local-file persistence, login roles, inventory, invoices, payments, and admin/owner tools.

## Run locally

```bash
npm install
npm start
```

Set `DATABASE_URL` to use PostgreSQL; without it, the server stores workshop state in a local JSON file. Render deployment continues to use `render.yaml` and `node server.js`.

## Live product pages

The **Spare Parts** marketplace combines the saved workshop inventory with the 30-record JCB 3DX/444 POC catalog in `data/jcb-parts.json`. Its opening story uses eight scroll-reversible system chapters from `vendor/parts-story.js`; the stage is sticky on desktop and becomes a static, touch-scroll layout on small screens. Scrolling is native (no autoplay or scroll hijacking), keyboard chapter navigation is available, and reduced-motion preferences disable smooth transitions. Abstract technical grids and typographic data are not depictions of the actual products. Catalog records have stable workshop reference numbers, model/category/brand fields, NPR estimates, fitment notes and explicit unknown stock/supplier-brand status. Catalog data is served by `GET /api/catalog/products`; existing inventory and inquiry records continue using the existing workshop-state API and persistence schema.

Each item has a shareable `/products/<part-name>-<part-id>` detail route. Search covers names and reference numbers; model, category, supplier-brand, price-range and in-stock filters are available. The quote cart is stored in browser local storage and submits requested products through the existing inquiry persistence flow. It does not reserve stock or create a payment.

New catalog prices are indicative POC estimates, not supplier quotes or verified market prices. The JCB `BW-*` numbers are workshop references, not OEM part numbers; supplier brands and catalog availability are unverified. Existing inventory prices/quantities are shown from saved workshop records. All part-photo arrays are empty: no photos were included because this repository contains no product-specific images with verified reuse permission. A future photo record must include an HTTPS image URL, source page, source name, attribution and an approved reuse license (`CC0`, `CC BY 4.0`, `CC BY-SA 4.0`, `PUBLIC DOMAIN` or documented `SUPPLIER PERMISSION`) before it can render.

## VAT invoices

Inventory and custom line prices are VAT-inclusive. New invoices keep the entered gross amount as the total, calculate the taxable amount as `total / 1.13`, and show the included 13% VAT separately. Existing invoices remain unchanged.

## Optional sample-page generator

`scripts/generate.js` is retained for generating the two sample records in `data/products.json` under `dist/products/`. It is separate from the live inventory and is not the Render website entry point.

## Checks

```bash
npm run check
npm test
```
