---
name: Add static product pages generator
about: Adds data/products.json, scripts/generate.js, and sample generated pages to create per-product pages for spare parts.
title: "Add static product pages generator"
labels:
  - enhancement
assignees: []
---

This PR adds a simple static generator that reads `data/products.json` and writes product pages to `dist/products/`.

What I changed

- Added `data/products.json` with two sample products.
- Added `scripts/generate.js` to generate `dist/products/index.html` and `dist/products/<slug>.html`.
- Included sample generated files in `dist/products/` so you can preview the output immediately.

How to test

1. Checkout this branch:
   - git fetch origin
   - git checkout add-product-pages-static-generator
2. Run `node scripts/generate.js` to regenerate `dist/products/` from `data/products.json`.

Notes

- Update image paths or add images into `images/` as referenced in `data/products.json`.
- Change canonical domain in `scripts/generate.js` from `https://yourdomain.com` to your real domain.
