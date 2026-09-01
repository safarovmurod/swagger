// ============================================================
// Ограничение частоты запросов — скользящее окно в памяти инстанса.
//
// Внешнего хранилища здесь нет намеренно: на бесплатном Vercel инстансов
// немного, а задача учебная — отдать 429 и заголовки, по которым видно,
// сколько запросов осталось. Пределы задаются переменными RATE_LIMIT_*,
// значения по умолчанию подобраны так, чтобы Swagger можно было спокойно
// щёлкать руками и не упереться в лимит.
// ============================================================
const config = require('./config');

const buckets = new Map(); // ключ → массив отметок времени

function clientIp(req) {
  const forwarded = String((req.headers || {})['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded ||
    (req.headers || {})['x-real-ip'] ||
    (req.socket && req.socket.remoteAddress) ||
    'unknown';
}

// Сколько попыток в бакете и за какое время
function limitFor(req, segments) {
  const path = (segments || []).join('/');
  if (path.indexOf('auth/login') === 0 || path.indexOf('auth/register') === 0) {
    return { bucket: 'auth', limit: config.rateLimit.auth };
  }
  if (req.method === 'GET' || req.method === 'OPTIONS' || req.method === 'HEAD') {
    return { bucket: 'read', limit: config.rateLimit.read };
  }
  return { bucket: 'write', limit: config.rateLimit.write };
}

function hit(req, segments) {
  const { bucket, limit } = limitFor(req, segments);
  const windowMs = config.rateLimit.windowSeconds * 1000;
  const key = `${bucket}:${clientIp(req)}`;
  const now = Date.now();

  const hits = (buckets.get(key) || []).filter(t => now - t < windowMs);

  if (hits.length >= limit) {
    buckets.set(key, hits);
    const retryAfter = Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000));
    return { ok: false, limit, remaining: 0, retryAfter, bucket };
  }

  hits.push(now);
  buckets.set(key, hits);

  // изредка подчищаем ключи, по которым давно не стучали
  if (buckets.size > 2000) {
    for (const [k, list] of buckets) {
      if (!list.length || now - list[list.length - 1] > windowMs) buckets.delete(k);
    }
  }

  return { ok: true, limit, remaining: limit - hits.length, retryAfter: 0, bucket };
}

module.exports = { hit, clientIp };
