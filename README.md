# Biswokarma Workshop

The Render-backed Node.js app serves `site.html` with the customer-facing motorcycle parts catalog, inquiry form, and separate Admin and Owner sign-in routes. The homepage focuses on Biswokarma Workshop and its servicing for JCB, buses, trucks, tractors, motorcycles and other vehicles, while retaining the existing parts and inquiry routes. Clickable vehicle cards open a service request that records the vehicle, requested service, and customer-provided location for Admin review. The form describes the approximate 24 km coverage area and requires a customer confirmation; the workshop confirms actual coverage before arranging service. The homepage uses a one-time, skippable cinematic entrance, scroll reveals and a CSS mechanical emblem with restrained 3D motion; no genuine workshop photo or interactive 3D vehicle model is included. Motion respects reduced-motion preferences, and layouts remain responsive.

## Run locally

```bash
npm install
npm start
```

Set `DATABASE_URL` for PostgreSQL. Without it, the app stores workshop records in `workshop-state.json` (or the path set by `WORKSHOP_STATE_FILE`).

## Configure Admin and Owner access

Sign-in is server-side. The app does not ship with default users or passwords. Set all of these environment variables on Render before enabling dashboard use:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `OWNER_USERNAME`
- `OWNER_PASSWORD_HASH`
- `SESSION_SECRET` (at least 32 bytes)

Generate a password hash locally with Node.js; do not commit it or send it in chat:

```bash
node -e 'const c=require("crypto"),s=c.randomBytes(16);console.log("scrypt$"+s.toString("hex")+"$"+c.scryptSync(process.argv[1],s,64).toString("hex"))' "YOUR_STRONG_PASSWORD"
```

Use a different long password for each role. Generate a session secret with:

```bash
node -e 'console.log(require("crypto").randomBytes(48).toString("base64url"))'
```

The browser receives only an eight-hour, signed, `HttpOnly`, `SameSite=Strict` session cookie. Login attempts are limited to five per client IP in a 15-minute window. Workshop state requires an authenticated session. Admin can create invoices and update orders; Owner can read financial reports but cannot create invoices. Owner-only purchase records and settings are filtered from Admin responses and writes.

## Invoices and reports

Admin invoice creation selects a saved inventory item and quantity. The server validates available stock, creates the invoice and order, updates customer order counts, and decrements stock together. Existing inventory prices are treated as VAT-inclusive; taxable amount is calculated as `total / 1.13` and VAT is the rounded difference from the inclusive total. Reports use recorded invoices and purchases only. The displayed profit/loss is invoice revenue minus saved purchases, not a complete accounting or tax statement. The dashboard graph uses saved records and updates when records are saved; it does not estimate missing sales or expenses.

The public contact page and footer include `biswokarmaworkshop@gmail.com` as a `mailto:` link. The rotating mechanical and abstract inventory illustrations are CSS-only and honor reduced-motion preferences; the inventory viewer is not a product photo or verified 3D model.

## Parts catalog

The public catalog contains generic motorcycle part references, not JCB listings. Reference IDs are not OEM part numbers. Catalog entries do not claim a brand, fitment, specification, stock or price; the inquiry flow asks the workshop to confirm those details. Public inquiry and service-request records are retained in the shared workshop state and visible to Admin.

## Verification

```bash
npm run check
npm test
```

The sample-page generator under `scripts/generate.js` is separate from the Render website.
