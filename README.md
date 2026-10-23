# Biswokarma Workshop

The Render-backed Node.js app serves `site.html` with the customer-facing motorcycle parts catalog, inquiry form, and separate Admin and Owner sign-in routes. The industrial, machined-surface visual treatment is CSS-only, works on narrow screens, and honors reduced-motion preferences.

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

The browser receives only an eight-hour, signed, `HttpOnly`, `SameSite=Strict` session cookie. Workshop state requires an authenticated session; Owner-only financial state is filtered from Admin responses and writes. Public inquiries are validated, rate-limited, and saved to the existing workshop-state database.

## Parts catalog

The public catalog contains generic motorcycle part references, not JCB listings. Reference IDs are not OEM part numbers. Catalog entries do not claim a brand, fitment, specification, stock or price; the inquiry flow asks the workshop to confirm those details. Public inquiry records are retained in the shared workshop state.

## Verification

```bash
npm run check
npm test
```

The sample-page generator under `scripts/generate.js` is separate from the Render website.
