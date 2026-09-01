// ============================================================
// Настройки из переменных окружения.
//
// Ни одного секрета в коде: всё читается из process.env, а значения
// по умолчанию подобраны так, чтобы проект работал сразу после клона,
// без единой переменной. Секреты наружу не отдаются — см. lib/handlers/auth.js.
// ============================================================
const crypto = require('crypto');

const int = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const list = (value) => String(value || '').split(',').map(s => s.trim()).filter(Boolean);

// Секрет подписи токенов. В проде задаётся JWT_SECRET; если его нет —
// генерируем случайный на время жизни инстанса. Тогда токены живут до
// перезапуска функции, и об этом честно пишем в /api/auth/login.
let ephemeralSecret = null;
function jwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (!ephemeralSecret) ephemeralSecret = crypto.randomBytes(48).toString('hex');
  return ephemeralSecret;
}

// «2h», «45m», «7d», «3600» → секунды
function seconds(value, fallback) {
  const m = /^(\d+)\s*([smhd])?$/.exec(String(value || '').trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 10);
  const mult = { s: 1, m: 60, h: 3600, d: 86400 }[m[2] || 's'];
  return n > 0 ? n * mult : fallback;
}

module.exports = {
  jwtSecret,
  hasJwtSecret: () => Boolean(process.env.JWT_SECRET),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  jwtTtlSeconds: seconds(process.env.JWT_EXPIRES_IN, 2 * 3600),

  // '*' — открыть всем (значение по умолчанию, как было раньше),
  // иначе список доменов через запятую
  allowedOrigins: list(process.env.ALLOWED_ORIGINS || '*'),

  databaseUrl: process.env.DATABASE_URL || '',

  // ограничения на размер: тело запроса и файл аватара
  maxBodyBytes: int(process.env.MAX_BODY_BYTES, 1024 * 1024),
  maxAvatarBytes: int(process.env.MAX_AVATAR_BYTES, 256 * 1024),

  // ограничение частоты запросов
  rateLimit: {
    windowSeconds: int(process.env.RATE_LIMIT_WINDOW, 60),
    auth: int(process.env.RATE_LIMIT_AUTH, 20),      // login/register с одного адреса
    write: int(process.env.RATE_LIMIT_WRITE, 120),   // POST/PUT/PATCH/DELETE
    read: int(process.env.RATE_LIMIT_READ, 600)      // GET
  },

  // Демонстрационный администратор — чтобы студент мог сразу проверить
  // защищённые методы. Пароль переопределяется через ADMIN_PASSWORD.
  demoAdmin: {
    email: process.env.ADMIN_EMAIL || 'admin@karapuz.tj',
    password: process.env.ADMIN_PASSWORD || 'Admin123!',
    fullName: process.env.ADMIN_NAME || 'Администратор Карапуз',
    tel: process.env.ADMIN_TEL || '+992900000000',
    address: 'Душанбе'
  },

  // Открытые POST/PUT/PATCH/DELETE без токена — только если явно попросили
  publicWrites: String(process.env.PUBLIC_WRITES || '').toLowerCase() === 'true'
};
