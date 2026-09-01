// ============================================================
// Общая точка входа API.
//
// Путь берётся тремя способами подряд, чтобы не зависеть от того,
// как хостинг передаёт параметры маршрута:
//   1) query.path — так его отдаёт catch-all маршрут и rewrite;
//   2) сам req.url — работает всегда, даже если параметров нет;
// Дальше путь разбирает lib/router.js.
// ============================================================
const { resolve, KNOWN_PATHS } = require('./router');
const { jsonData, jsonErr } = require('./handlers/_helpers');

function segmentsOf(req) {
  const q = req.query || {};
  const raw = q.path;

  if (Array.isArray(raw) && raw.length) return raw.filter(Boolean).map(String);
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split('/').filter(Boolean).map(decodeURIComponent);
  }

  const pathname = String(req.url || '').split('?')[0];
  return pathname
    .replace(/^\/+/, '')
    .replace(/^api\/?/, '')
    .replace(/^route\/?/, '')
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent);
}

module.exports = async (req, res) => {
  // адрес этого сервера — чтобы отдавать ссылки на картинки абсолютными
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host);
  res._origin = `${req.headers['x-forwarded-proto'] || (isLocal ? 'http' : 'https')}://${host}`;

  const segments = segmentsOf(req);

  // /api — короткий указатель по разделам
  if (!segments.length) {
    return jsonData(res, 200, {
      name: 'Карапуз API',
      docs: '/',
      spec: '/api/swagger.json',
      paths: KNOWN_PATHS
    });
  }

  const match = resolve(segments);
  if (!match) {
    return jsonErr(res, 404, `Маршрут /api/${segments.join('/')} не найден`);
  }

  const query = Object.assign({}, req.query, match.params);
  delete query.path;
  try { req.query = query; } catch (e) { /* query может быть только для чтения */ }
  if (req.query !== query) Object.assign(req.query, match.params);

  return match.handler(req, res);
};
