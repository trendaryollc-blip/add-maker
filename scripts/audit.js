#!/usr/bin/env node
/* ============================================================
   OMNI — scripts/audit.js
   Project integrity audit.
     - Every HTML page is well-formed (doctype, closing tag,
       balanced <style>).
     - Every local asset reference (<script>, <link>, icon) in each
       HTML page resolves to an existing file (catches broken paths).
     - Every page includes all 4 CSS files + its pages/<name>.js
       controller.
   Exits non-zero on any problem. Run: npm run audit
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'frontend', 'public');

let failed = false;
function report(ok, msg) {
  if (!ok) failed = true;
  console.log(`  ${ok ? '✓' : '✗'} ${msg}`);
}

function collectHtml(dir) {
  const files = [];
  const walk = (d) => {
    fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.html')) files.push(full);
    });
  };
  walk(dir);
  return files.sort();
}

const htmlFiles = collectHtml(PUBLIC_DIR);
console.log('◈ OMNI integrity audit\n');
console.log(`Found ${htmlFiles.length} HTML pages in frontend/public/\n`);

const REF = /(?:src|href)=['"]([^'"]+)['"]/g;

for (const file of htmlFiles) {
  const rel = path.relative(ROOT, file);
  const name = path.basename(file, '.html');
  const html = fs.readFileSync(file, 'utf8');
  const dir = path.dirname(file);

  // ---- Well-formedness ----
  report(/<!DOCTYPE html>/i.test(html), `${rel}: has <!DOCTYPE html>`);
  report(/<\/html>\s*$/.test(html.replace(/\s+$/, '')), `${rel}: ends with </html>`);
  const styleOpen = (html.match(/<style/g) || []).length;
  const styleClose = (html.match(/<\/style>/g) || []).length;
  report(styleOpen === styleClose, `${rel}: <style> tags balanced (${styleOpen})`);
  report(!/<\/?script(?! src|>)|<script>\s*\n\s*\S/.test(html), `${rel}: no inline script blocks`);

  // ---- Asset references resolve ----
  let broken = 0;
  let localRefs = 0;
  const seen = new Set();
  let m;
  REF.lastIndex = 0;
  while ((m = REF.exec(html))) {
    const href = m[1];
    if (/^(https?:)?\/\//.test(href) || /^(data:|#)/.test(href)) continue;
    if (seen.has(href)) continue;
    seen.add(href);
    localRefs++;
    const abs = path.normalize(path.join(dir, href));
    if (!fs.existsSync(abs)) {
      broken++;
      console.log(`      BROKEN REF: ${href}`);
    }
  }
  report(broken === 0, `${rel}: ${localRefs} local asset refs all resolve`);

  // ---- Required wiring ----
  const cssLinks = (html.match(/<link rel="stylesheet"/g) || []).length;
  report(cssLinks === 4, `${rel}: links ${cssLinks}/4 CSS files`);
  report(html.includes(`pages/${name}.js`), `${rel}: loads pages/${name}.js`);
  report(html.includes('theme-color'), `${rel}: has <meta theme-color>`);
}

console.log(failed ? '\n✗ AUDIT FAILED' : '\n✓ AUDIT PASSED — all pages integral');
process.exit(failed ? 1 : 0);