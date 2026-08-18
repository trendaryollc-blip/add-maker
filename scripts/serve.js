#!/usr/bin/env node
/* ============================================================
   OMNI — scripts/serve.js
   Zero-dependency static file server for the frontend.
   - Serves from the PROJECT ROOT so the relative `../src/...`
     references used by the HTML pages resolve correctly.
   - Maps `/` to the app entry point (frontend/public/index.html).
   - Blocks path traversal and convenience-directories.
   Usage: npm start   (or: PORT=8080 npm start)
   ============================================================ */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENTRY = 'frontend/public/index.html';
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.md': 'text/markdown; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

/* Resolve a decoded URL path to a safe absolute file path inside ROOT.
   Returns null when the request escapes the root (path traversal). */
function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath).split('?')[0];
  const rel = clean === '/' ? ENTRY : clean.replace(/^\/+/, '');
  const abs = path.normalize(path.join(ROOT, rel));
  if (!abs.startsWith(ROOT + path.sep) && abs !== ROOT) return null;
  return abs;
}

function write(res, code, body, type) {
  res.writeHead(code, {
    'Content-Type': type || 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-cache'
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];

  // Redirect the bare root (and the public dir without a trailing slash) to the
  // real page URL. This keeps the page's relative `../src/...` references valid
  // (they only resolve correctly when the URL path sits inside public/).
  if (urlPath === '/' || urlPath === '/frontend/public') {
    res.writeHead(302, { Location: '/' + ENTRY });
    res.end();
    return;
  }

  // Block any dotfile / convenience dir requests
  if (/\/(node_modules|\.git|__pycache__)\b/.test(urlPath)) {
    return write(res, 404, 'Not found');
  }

  let abs = resolveFile(urlPath);
  if (!abs) return write(res, 400, 'Bad request');

  fs.stat(abs, (err, stat) => {
    if (err) return write(res, 404, 'Not found: ' + urlPath);

    // Serve directory index
    if (stat.isDirectory()) {
      abs = path.join(abs, 'index.html');
      if (!fs.existsSync(abs)) return write(res, 404, 'No index in directory');
    }

    const ext = path.extname(abs).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    fs.createReadStream(abs)
      .on('error', () => write(res, 404, 'Not found'))
      .pipe(res);
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'no-cache');
    console.log(`${req.method} ${urlPath} -> ${path.relative(ROOT, abs)}`);
  });
});

server.listen(PORT, () => {
  console.log(`\n  ◈ OMNI dev server`);
  console.log(`  Serving:  ${ROOT}`);
  console.log(`  App:      http://localhost:${PORT}/\n`);
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is in use. Try: PORT=8080 npm start`);
  } else {
    console.error(e);
  }
  process.exit(1);
});