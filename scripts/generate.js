// scripts/generate.js
const fs = require('fs');
const path = require('path');

function slugify(s){
  return s.toString().toLowerCase()
    .replace(/\s+/g,'-')
    .replace(/[^a-z0-9\-]/g,'')
    .replace(/\-+/g,'-');
}

const productsPath = path.join(__dirname,'..','data','products.json');
const outDir = path.join(__dirname,'..','dist','products');

if(!fs.existsSync(productsPath)){
  console.error('Missing data/products.json — add your products first.');
  process.exit(1);
}

const products = JSON.parse(fs.readFileSync(productsPath,'utf8'));
fs.mkdirSync(outDir,{recursive:true});

function productTemplate(p){
  const slug = p.slug || slugify(p.name || p.id);
  const imgs = (p.images || []).map(src => `<img src="/${src}" alt="${p.name}" style="max-width:300px;margin:8px">`).join('\n');
  const specs = Object.entries(p.specs||{}).map(([k,v])=>`<li><strong>${k}:</strong> ${v}</li>`).join('\n');
  return `<!doctype html>
<html lang="hi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${p.name} — Biswokarma</title>
  <meta name="description" content="${(p.description||'').replace(/\"/g,'')}">
  <link rel="canonical" href="https://yourdomain.com/products/${slug}.html">
  <style>body{font-family:Arial,Helvetica,sans-serif;max-width:900px;margin:24px auto;padding:0 12px} img{display:inline-block}</style>
</head>
<body>
  <a href="/products/index.html">← Back to parts list</a>
  <h1>${p.name}</h1>
  <p><strong>Category:</strong> ${p.category || ''}</p>
  <p><strong>Price:</strong> ${p.currency || ''} ${p.price || ''}</p>
  <div id="images">${imgs}</div>
  <h2>Description</h2>
  <p>${p.description || ''}</p>
  <h3>Specifications</h3>
  <ul>${specs}</ul>
</body>
</html>`;
}

function indexTemplate(items){
  const list = items.map(p=>{
    const slug = p.slug || slugify(p.name || p.id);
    return `<li><a href="${slug}.html" target="_blank">${p.name}</a> — ${p.category || ''}</li>`;
  }).join('\n');
  return `<!doctype html>
<html lang="hi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>All Parts — Biswokarma</title>
  <style>body{font-family:Arial,Helvetica,sans-serif;max-width:900px;margin:24px auto;padding:0 12px}</style>
</head>
<body>
  <h1>All Parts</h1>
  <ul>
    ${list}
  </ul>
</body>
</html>`;
}

// Generate product pages
for(const p of products){
  const slug = p.slug || slugify(p.name || p.id);
  const filename = `${slug}.html`;
  fs.writeFileSync(path.join(outDir,filename), productTemplate(p));
  console.log('Wrote', filename);
}

// Generate index
fs.writeFileSync(path.join(outDir,'index.html'), indexTemplate(products));
console.log('Wrote index.html with', products.length, 'items.');
