# Biswokarma Workshop

The live website is the Render-backed Node.js application served by `server.js`. It keeps the existing React interface, workshop state API, PostgreSQL/local-file persistence, login roles, inventory, invoices, payments, and admin/owner tools.

## Run locally

```bash
npm install
npm start
```

Set `DATABASE_URL` to use PostgreSQL; without it, the server stores workshop state in a local JSON file. Render deployment continues to use `render.yaml` and `node server.js`.

## Live product pages

Each inventory item is available from **Spare Parts** and has a shareable `/products/<part-name>-<part-id>` detail URL. The live server serves the existing app for these URLs; the page loads the current inventory record, price, fitment, stock status, and any product image URL stored with the part.

## VAT invoices

Inventory and custom line prices are VAT-inclusive. New invoices keep the entered gross amount as the total, calculate the taxable amount as `total / 1.13`, and show the included 13% VAT separately. Existing invoices remain unchanged.

## Optional sample-page generator

`scripts/generate.js` is retained for generating the two sample records in `data/products.json` under `dist/products/`. It is separate from the live inventory and is not the Render website entry point.

## Checks

```bash
npm run check
npm test
```
