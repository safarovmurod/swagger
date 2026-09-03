#!/usr/bin/env node
// ============================================================
// Локальный сервер для разработки: вызывает ту же единственную функцию
// api/[...path].js, что и Vercel, и раздаёт статику из корня проекта.
//   node scripts/dev-server.js        → http://localhost:3000
//   PORT=8080 node scripts/dev-server.js
// ============================================================
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 3000;
const apiHandler = require(path.join(ROOT, 'lib', 'api-entry.js'));

const MIME = {
  '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.ico': 'image/x-icon', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp'
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';

  res.json = (data) => {
    if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(data));
  };

  // все /api/* уходят в ту же функцию, что и на Vercel
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    const segments = pathname.split('/').filter(Boolean).slice(1).map(decodeURIComponent);
    req.query = { ...Object.fromEntries(url.searchParams), path: segments };
    try {
      return await apiHandler(req, res);
    } catch (err) {
      console.error(err);
      res.statusCode = 500;
      return res.json({ message: 'Внутренняя ошибка сервера', error: String(err && err.message) });
    }
  }

  // статика
  // те же адреса, что и на Vercel: / и /swagger — Swagger UI,
  // /docs — страница каталога
  let file;
  if (pathname === '/' || pathname === '/swagger') file = 'index.html';
  else if (pathname === '/docs') file = 'docs.html';
  else file = pathname.slice(1);
  const filePath = path.join(ROOT, file);
  if (filePath.startsWith(ROOT) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.setHeader('Content-Type', MIME[path.extname(filePath)] || 'application/octet-stream');
    return fs.createReadStream(filePath).pipe(res);
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ message: `Маршрут ${pathname} не найден` }));
});

server.listen(PORT, () => console.log(`Карапуз API → http://localhost:${PORT}`));
