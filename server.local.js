/**
 * MAHESH THAKUR PORTFOLIO — LOCAL DEVELOPMENT SERVER
 * 
 * Features:
 * - 100% Zero external dependencies (uses Node.js built-in http, fs, path modules)
 * - Safe static file server for all portfolio assets
 * - POST /api/save-data: Safely writes site data directly to data.json with atomic writes
 * - GET /api/site-data: Reads live data.json from disk
 * - POST /api/auth/login: Simple local dev authentication support
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3001;
const ROOT_DIR = __dirname;
const DATA_FILE = path.join(ROOT_DIR, 'data.json');
const BACKUP_FILE = path.join(ROOT_DIR, 'data.backup.json');
const TMP_FILE = path.join(ROOT_DIR, 'data.tmp.json');

// Ensure an initial backup exists
if (fs.existsSync(DATA_FILE) && !fs.existsSync(BACKUP_FILE)) {
  try {
    fs.copyFileSync(DATA_FILE, BACKUP_FILE);
    console.log('[BACKUP] Created initial data.backup.json');
  } catch (e) {
    console.warn('[BACKUP WARNING] Failed to create initial backup:', e.message);
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

function sendJson(res, statusCode, data) {
  const jsonStr = JSON.stringify(data, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-cache'
  });
  res.end(jsonStr);
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  // ╔═══════════════════════════════════════════════════════════╗
  // ║ API ENDPOINTS                                             ║
  // ╚═══════════════════════════════════════════════════════════╝

  // 1. GET /api/site-data
  if (req.method === 'GET' && pathname === '/api/site-data') {
    try {
      if (!fs.existsSync(DATA_FILE)) {
        return sendJson(res, 404, { success: false, error: 'data.json not found on server' });
      }
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const data = JSON.parse(raw);
      return sendJson(res, 200, data);
    } catch (err) {
      return sendJson(res, 500, { success: false, error: 'Failed to read data.json: ' + err.message });
    }
  }

  // 2. POST /api/save-data
  if (req.method === 'POST' && pathname === '/api/save-data') {
    let body = '';
    const maxBytes = 5 * 1024 * 1024; // 5 MB max payload

    req.on('data', chunk => {
      body += chunk;
      if (body.length > maxBytes) {
        res.destroy();
      }
    });

    req.on('end', () => {
      try {
        if (!body) {
          return sendJson(res, 400, { success: false, error: 'Empty request payload' });
        }

        const data = JSON.parse(body);

        // Basic structural validation
        if (!data || typeof data !== 'object') {
          return sendJson(res, 400, { success: false, error: 'Invalid JSON payload structure' });
        }

        // Stamp updatedAt
        data.updatedAt = new Date().toISOString();

        const formattedJson = JSON.stringify(data, null, 2) + '\n';

        // Atomic write strategy: write to .tmp then rename
        fs.writeFileSync(TMP_FILE, formattedJson, 'utf8');
        fs.renameSync(TMP_FILE, DATA_FILE);

        console.log(`[DATA SAVED] data.json updated at ${data.updatedAt}`);
        return sendJson(res, 200, {
          success: true,
          message: 'Site data saved successfully to data.json',
          updatedAt: data.updatedAt
        });
      } catch (err) {
        console.error('[SAVE ERROR]', err);
        return sendJson(res, 500, {
          success: false,
          error: 'Failed to write data.json: ' + err.message
        });
      }
    });
    return;
  }

  // 3. POST /api/auth/login
  if (req.method === 'POST' && pathname === '/api/auth/login') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const password = payload.password || '';
        // Standard password check for local admin
        if (password === 'admin123') {
          return sendJson(res, 200, { success: true, token: 'admin123' });
        } else {
          return sendJson(res, 401, { success: false, error: 'Invalid security key' });
        }
      } catch (_) {
        return sendJson(res, 400, { success: false, error: 'Invalid JSON request' });
      }
    });
    return;
  }

  // ╔═══════════════════════════════════════════════════════════╗
  // ║ STATIC FILE SERVING                                       ║
  // ╚═══════════════════════════════════════════════════════════╝

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendJson(res, 405, { success: false, error: `Method ${req.method} not allowed for static files` });
  }

  // Normalize path & map root to index.html
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  if (pathname === '/resume' || pathname === '/resume/') {
    pathname = '/resume.html';
  }

  const safePath = path.normalize(path.join(ROOT_DIR, pathname));

  // Prevent directory traversal attacks
  if (!safePath.startsWith(ROOT_DIR)) {
    return sendJson(res, 403, { success: false, error: 'Forbidden: Access denied' });
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 Not Found: ${pathname}`);
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const isCodeOrData = ext === '.html' || ext === '.json' || ext === '.js' || ext === '.css';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': isCodeOrData ? 'no-store, no-cache, must-revalidate, proxy-revalidate' : 'public, max-age=3600',
      'Pragma': isCodeOrData ? 'no-cache' : 'public',
      'Expires': isCodeOrData ? '0' : '3600'
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(safePath);
    stream.pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log(`🚀 Mahesh Thakur Portfolio Server running at:`);
  console.log(`   🌐 Public Site:   http://localhost:${PORT}`);
  console.log(`   ⚙️  Admin Panel:   http://localhost:${PORT}/admin.html`);
  console.log(`   📁 Live data file: ${DATA_FILE}`);
  console.log('═══════════════════════════════════════════════════════');
});

// Graceful shutdown
process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
