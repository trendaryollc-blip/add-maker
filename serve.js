const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

// Serve from frontend/ so ../src/css/ paths resolve correctly
const ROOT = path.join(__dirname, 'frontend');

http.createServer((req, res) => {
  let url = req.url.split('?')[0].split('#')[0];

  // Route clean URLs to HTML files
  if (url === '/') url = '/public/index.html';

  const fp = path.join(ROOT, url);

  // Security: prevent path traversal
  if (!fp.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(fp, (err, data) => {
    if (err) {
      // Try adding .html extension
      const withHtml = fp + '.html';
      fs.readFile(withHtml, (err2, data2) => {
        if (err2) { res.writeHead(404); res.end('Not found: ' + url); return; }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data2);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(3000, () => console.log('Frontend: http://localhost:3000'));
