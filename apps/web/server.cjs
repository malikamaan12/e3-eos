const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '3000', 10);
const API_URL = process.env.API_URL;
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
};

let resolvedCommit = '63535dde03f1db23d4e0287f36517e97485b013e';
try {
  const { execSync } = require('child_process');
  const rev = execSync('git rev-parse HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  if (rev) resolvedCommit = rev;
} catch {}
const GIT_COMMIT = process.env.GIT_COMMIT || process.env.BUILD_SHA || resolvedCommit;

const server = http.createServer((req, res) => {
  // Liveness health endpoint
  if (req.url === '/health' || req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(
      JSON.stringify({
        status: 'ok',
        service: 'e3-eos-web',
        environment: process.env.ENVIRONMENT || 'staging',
        gitCommit: GIT_COMMIT,
        buildSha: GIT_COMMIT,
      })
    );
  }

  // Reverse proxy /api requests to backend Cloud Run if API_URL is set
  if (API_URL && req.url && (req.url.startsWith('/api/') || req.url === '/api')) {
    const targetUrl = new URL(req.url, API_URL);
    const client = targetUrl.protocol === 'https:' ? https : http;
    const proxyReq = client.request(
      targetUrl,
      {
        method: req.method,
        headers: {
          ...req.headers,
          host: targetUrl.host,
        },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );
    proxyReq.on('error', (proxyErr) => {
      console.error('[API Proxy Error]:', proxyErr.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Bad Gateway', message: proxyErr.message }));
    });
    req.pipe(proxyReq);
    return;
  }

  let reqPath = req.url ? req.url.split('?')[0] : '/';
  if (reqPath === '/') reqPath = '/index.html';

  let filePath = path.join(DIST_DIR, reqPath);

  // Security check: ensure path is within DIST_DIR
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA Fallback: serve index.html for client-side routing
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        return res.end('Server Error');
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
      });
      res.end(content);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[E3-EOS Web Runner] Production server active on http://0.0.0.0:${PORT}`);
});
