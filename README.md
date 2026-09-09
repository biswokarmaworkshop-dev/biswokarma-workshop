# Product pages static generator

This branch adds a simple static generator that reads `data/products.json` and writes a product index and individual product pages to `dist/products/`.

How to use

1. Make sure you have Node.js installed (v12+).
2. Add your product images under `images/` (paths referenced in `data/products.json`).
3. Run:

```bash
node scripts/generate.js
```

4. The generated files will appear in `dist/products/`.

Notes & next steps

- The sample `data/products.json` contains two example products. Replace or extend it with your full catalog.
- Images are not included in this commit — add them to `images/` or update the `images` paths to point to your CDN.
- To publish: deploy the `dist/` folder to GitHub Pages, Netlify, Vercel (static hosting), or your preferred host.
- If you prefer a Next.js / dynamic solution, I can convert this to an SSG-based Next app instead.
