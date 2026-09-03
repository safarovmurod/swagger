// ============================================================
// Пароли, токены, маскирование телефона.
//
// Своей криптографии здесь нет — только стандартные примитивы node:crypto:
//   пароль  → scrypt (memory-hard, встроен в Node, параметры ниже);
//   токен   → JWT HS256 на crypto.createHmac.
// Внешних зависимостей у проекта нет, и добавлять их ради этого не нужно.
// ============================================================
const crypto = require('crypto');
const config = require('./config');

// --- пароли -------------------------------------------------
// Формат хранения: scrypt$N$r$p$salt$hash — самодокументируемый,
// параметры можно поднять позже, старые хеши продолжат проверяться.
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16);
    const opts = { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: 64 * 1024 * 1024 };
    crypto.scrypt(String(password), salt, SCRYPT.keylen, opts, (err, key) => {
      if (err) return reject(err);
      resolve(`scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${key.toString('base64')}`);
    });
  });
}

function verifyPassword(password, stored) {
  return new Promise((resolve) => {
    const parts = String(stored || '').split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return resolve(false);
    const N = parseInt(parts[1], 10), r = parseInt(parts[2], 10), p = parseInt(parts[3], 10);
    let salt, expected;
    try {
      salt = Buffer.from(parts[4], 'base64');
      expected = Buffer.from(parts[5], 'base64');
    } catch { return resolve(false); }
    if (!N || !r || !p || !salt.length || !expected.length) return resolve(false);
    const opts = { N, r, p, maxmem: 64 * 1024 * 1024 };
    crypto.scrypt(String(password), salt, expected.length, opts, (err, key) => {
      if (err) return resolve(false);
      resolve(key.length === expected.length && crypto.timingSafeEqual(key, expected));
    });
  });
}

// --- JWT HS256 ----------------------------------------------
const b64url = (buf) => Buffer.from(buf).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (str) => Buffer.from(String(str).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function signToken(payload, ttlSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const ttl = ttlSeconds || config.jwtTtlSeconds;
  const body = Object.assign({
    iat: now,
    exp: now + ttl,
    jti: crypto.randomBytes(12).toString('hex')
  }, payload);
  const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const data = `${head}.${b64url(JSON.stringify(body))}`;
  const sig = b64url(crypto.createHmac('sha256', config.jwtSecret()).update(data).digest());
  return { token: `${data}.${sig}`, payload: body, expiresIn: ttl };
}

// Возвращает payload либо null. Никаких исключений наружу —
// невалидный токен это обычный 401, а не ошибка сервера.
function verifyToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const data = `${parts[0]}.${parts[1]}`;
  const expected = crypto.createHmac('sha256', config.jwtSecret()).update(data).digest();
  let given;
  try { given = unb64url(parts[2]); } catch { return null; }
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  let payload;
  try { payload = JSON.parse(unb64url(parts[1]).toString('utf8')); } catch { return null; }
  if (!payload || typeof payload !== 'object') return null;
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function bearerOf(req) {
  const raw = (req.headers && (req.headers.authorization || req.headers.Authorization)) || '';
  const m = /^Bearer\s+(.+)$/i.exec(String(raw).trim());
  return m ? m[1].trim() : '';
}

// --- маскирование личных данных -----------------------------
// Тренажёр открыт всем: любой может прочитать чужую регистрацию.
// Поэтому наружу личные поля уходят неполными — видно начало,
// хвост закрыт звёздочками. Полные значения остаются внутри системы.
const STARS = '*****';

// +992900123456 → +9929001*****  (последние пять цифр закрыты)
function maskPhone(tel) {
  const raw = String(tel || '');
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length <= 5) return STARS;
  return (raw.trim()[0] === '+' ? '+' : '') + digits.slice(0, digits.length - 5) + STARS;
}

// Мансур Сафаров → Ма*****
function maskName(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  return v.length <= 2 ? STARS : v.slice(0, 2) + STARS;
}

// safarov@gmail.com → saf*****@gmail.com  (домен виден, он не секрет)
function maskEmail(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  const at = v.lastIndexOf('@');
  if (at < 1) return v.length <= 3 ? STARS : v.slice(0, 3) + STARS;
  const local = v.slice(0, at);
  const domain = v.slice(at);
  return (local.length <= 3 ? STARS : local.slice(0, 3) + STARS) + domain;
}

// Душанбе, улица Рудаки 25 → Душ*****
function maskAddress(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  return v.length <= 3 ? STARS : v.slice(0, 3) + STARS;
}

// Пришло ли обратно уже замаскированное значение. Форма «Личные данные»
// заполняется тем, что отдал сервер, и при сохранении присылает то же
// самое — такие поля надо не записывать, а оставить как были.
function isMasked(value) {
  return String(value == null ? '' : value).indexOf('*') >= 0;
}

// --- проверка входных данных --------------------------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const TEL_RE = /^\+?\d[\d\s()-]{7,19}$/;

function checkEmail(email) {
  const v = String(email || '').trim().toLowerCase();
  if (!v) return { ok: false, message: 'Поле email обязательно' };
  if (v.length > 160 || !EMAIL_RE.test(v)) return { ok: false, message: 'Некорректный email' };
  return { ok: true, value: v };
}

function checkTel(tel) {
  const v = String(tel || '').trim();
  if (!v) return { ok: false, message: 'Поле tel обязательно' };
  if (!TEL_RE.test(v)) return { ok: false, message: 'Некорректный номер телефона, пример: +992900123456' };
  return { ok: true, value: v };
}

function checkPassword(password) {
  const v = String(password == null ? '' : password);
  if (!v) return { ok: false, message: 'Поле password обязательно' };
  if (v.length < 8) return { ok: false, message: 'Пароль короче 8 символов' };
  if (v.length > 128) return { ok: false, message: 'Пароль длиннее 128 символов' };
  if (!/[A-Za-zА-Яа-я]/.test(v) || !/\d/.test(v)) {
    return { ok: false, message: 'Пароль должен содержать буквы и цифры' };
  }
  return { ok: true, value: v };
}

// Обрезаем и чистим строку: без управляющих символов и переносов,
// чтобы они не попали ни в ответ, ни в заголовки.
function clean(value, maxLength) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, maxLength || 200);
}

module.exports = {
  hashPassword, verifyPassword,
  signToken, verifyToken, bearerOf,
  maskPhone, maskName, maskEmail, maskAddress, isMasked,
  checkEmail, checkTel, checkPassword, clean
};
