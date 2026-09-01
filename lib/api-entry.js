// ============================================================
// Общая точка входа API.
//
// Путь берётся тремя способами подряд, чтобы не зависеть от того,
// как хостинг передаёт параметры маршрута:
//   1) query.path — так его отдаёт catch-all маршрут и rewrite;
//   2) сам req.url — работает всегда, даже если параметров нет;
// Дальше путь разбирает lib/router.js.
//
// Здесь же то, что общее для всех эндпоинтов: адрес сервера для
// абсолютных ссылок, ограничение частоты запросов и единый перехват
// ошибок. Наружу из ошибки уходит только текст «Внутренняя ошибка
// сервера»: ни стека, ни путей, ни настроек окружения.
// ============================================================
const { resolve, KNOWN_PATHS } = require('./router');
const { jsonData, jsonErr, setCors, setSecurityHeaders } = require('./handlers/_helpers');
const store = require('./store');
const rateLimit = require('./rate-limit');

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
  res._reqOrigin = req.headers.origin || '';

  const segments = segmentsOf(req);

  // Предполётный запрос браузера: отвечаем заголовками и не тратим лимит
  if (req.method === 'OPTIONS') {
    setCors(res);
    setSecurityHeaders(res);
    res.statusCode = 204;
    return res.end();
  }

  const limit = rateLimit.hit(req, segments);
  res.setHeader('X-RateLimit-Limit', String(limit.limit));
  res.setHeader('X-RateLimit-Remaining', String(limit.remaining));
  if (!limit.ok) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    return jsonErr(res, 429,
      `Слишком много запросов, попробуйте через ${limit.retryAfter} с`, 'TOO_MANY_REQUESTS');
  }

  // /api — короткий указатель по разделам
  if (!segments.length) {
    return jsonData(res, 200, {
      name: 'Карапуз API',
      docs: '/',
      spec: '/api/swagger.json',
      auth: {
        register: '/api/auth/register',
        login: '/api/auth/login',
        me: '/api/auth/me',
        logout: '/api/auth/logout',
        scheme: 'Bearer JWT'
      },
      storage: store.isPersistent ? 'postgres' : 'memory',
      paths: KNOWN_PATHS
    });
  }

  const match = resolve(segments);
  if (!match) {
    return jsonErr(res, 404, `Маршрут /api/${segments.join('/')} не найден`, 'NOT_FOUND');
  }

  const query = Object.assign({}, req.query, match.params);
  delete query.path;
  try { req.query = query; } catch (e) { /* query может быть только для чтения */ }
  if (req.query !== query) Object.assign(req.query, match.params);

  try {
    return await match.handler(req, res);
  } catch (err) {
    // подробности пишем в лог сервера, наружу — только код и общий текст
    console.error(`[api] ${req.method} /api/${segments.join('/')}:`, err && err.stack ? err.stack : err);
    if (res.headersSent || res.writableEnded) return;
    return jsonErr(res, 500, 'Внутренняя ошибка сервера', 'INTERNAL_ERROR');
  }
};
