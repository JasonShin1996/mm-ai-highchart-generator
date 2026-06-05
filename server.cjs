const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const DIST = path.join(__dirname, 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.gz':   'application/gzip',
};

http.createServer((req, res) => {
  let filePath = path.join(DIST, req.url.split('?')[0]);

  // SPA fallback: if path has no extension or file doesn't exist, serve index.html
  const ext = path.extname(filePath);
  if (!ext || !fs.existsSync(filePath)) {
    filePath = path.join(DIST, 'index.html');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const contentType = MIME[path.extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend serving dist/ on port ${PORT}`);
});
