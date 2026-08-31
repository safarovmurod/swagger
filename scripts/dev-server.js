#!/usr/bin/env node
// ============================================================
// Локальный сервер для разработки: повторяет маршрутизацию Vercel
// (файлы из /api → эндпоинты) и раздаёт статику из корня проекта.
//   node scripts/dev-server.js        → http://localhost:3000
//   PORT=8080 node scripts/dev-server.js
// ============================================================
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 3000;

// путь → обработчик; :param попадает в req.query
const ROUTES = [
  ['/api/swagger.json', 'api/swagger.json.js'],
  ['/api/categories', 'api/categories/index.js'],
  ['/api/categories/:id', 'api/categories/[id].js'],
  ['/api/subcategories', 'api/subcategories/index.js'],
  ['/api/subcategories/:id', 'api/subcategories/[id].js'],
  ['/api/products', 'api/products/index.js'],
  ['/api/products/:id/reviews', 'api/products/[id]/reviews.js'],
  ['/api/products/:id', 'api/products/[id].js'],
  ['/api/blog', 'api/blog/index.js'],
  ['/api/blog/:id', 'api/blog/[id].js'],
  ['/api/promotions', 'api/promotions/index.js'],
  ['/api/promotions/:id', 'api/promotions/[id].js']
];

const MIME = {
  '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.ico': 'image/x-icon', '.png': 'image/png'
};

function match(pattern, pathname) {
  const a = pattern.split('/').filter(Boolean);
  const b = pathname.split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const params = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';

  res.json = (data) => {
    if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(data));
  };

  for (const [pattern, file] of ROUTES) {
    const params = match(pattern, pathname);
    if (!params) continue;
    req.query = { ...Object.fromEntries(url.searchParams), ...params };
    try {
      const handler = require(path.join(ROOT, file));
      return await handler(req, res);
    } catch (err) {
      console.error(err);
      res.statusCode = 500;
      return res.json({ message: 'Внутренняя ошибка сервера', error: String(err && err.message) });
    }
  }

  // статика
  const file = pathname === '/' || pathname === '/swagger' ? 'index.html' : pathname.slice(1);
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
