#!/usr/bin/env node
/**
 * Simple HTTPS server for EAN Barcode Scanner
 * Serves barcode-scanner.html over HTTPS on localhost:8443
 * Camera requires HTTPS — this script handles it automatically.
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');
const { execSync } = require('child_process');

const PORT = 8443;
const DIR  = __dirname;
const CERT = path.join(__dirname, 'cert.pem');
const KEY  = path.join(__dirname, 'key.pem');

// ── Generate self-signed cert if not present ──────────────────────────────────
if (!fs.existsSync(CERT) || !fs.existsSync(KEY)) {
  console.log('🔐 Generating self-signed certificate...');
  try {
    execSync(
      `openssl req -x509 -newkey rsa:2048 -keyout "${KEY}" -out "${CERT}" -days 365 -nodes ` +
      `-subj "/CN=localhost" -addext "subjectAltName=IP:127.0.0.1,DNS:localhost"`,
      { stdio: 'pipe' }
    );
    console.log('✅ Certificate generated.\n');
  } catch (e) {
    console.error('❌ openssl not found. Install OpenSSL and retry, or use the npx option below.');
    process.exit(1);
  }
}

// ── MIME types ────────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
};

// ── Server ────────────────────────────────────────────────────────────────────
const options = {
  key:  fs.readFileSync(KEY),
  cert: fs.readFileSync(CERT),
};

https.createServer(options, (req, res) => {
  let urlPath = req.url === '/' ? '/barcode-scanner.html' : req.url;
  const filePath = path.join(DIR, urlPath);

  // Security: stay within DIR
  if (!filePath.startsWith(DIR)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found: ' + urlPath);
      return;
    }
    const ext  = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': 'no-cache',
      // Allow camera in the page itself (not inside iframe)
      'Permissions-Policy': 'camera=(*)',
    });
    res.end(data);
  });
}).listen(PORT, '0.0.0.0', () => {
  console.log('─────────────────────────────────────────');
  console.log('  📷  EAN Barcode Scanner — HTTPS Server');
  console.log('─────────────────────────────────────────');
  console.log(`  Open on this device:   https://localhost:${PORT}`);
  console.log(`  Open on your phone:    https://<your-pc-ip>:${PORT}`);
  console.log('');
  console.log('  ⚠  First visit: your browser will warn about');
  console.log('     the self-signed cert. Click "Advanced" →');
  console.log('     "Proceed to localhost" to continue.');
  console.log('─────────────────────────────────────────');
});
