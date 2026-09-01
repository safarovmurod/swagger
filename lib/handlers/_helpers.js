// Общие помощники для всех эндпоинтов
const { categories, products, blog, promotions, subcategories } = require('../data');
const config = require('../config');
const security = require('../security');
const store = require('../store');
const multipart = require('../multipart');

// Коды ошибок — одинаковые для всего API, чтобы клиент мог разбирать
// ответ не по тексту сообщения, а по коду.
const ERR = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_ERROR'
};

// CORS. По умолчанию открыт всем (как и было), но если задан
// ALLOWED_ORIGINS — пускаем только перечисленные домены и разрешаем
// им куки: со звёздочкой браузер их всё равно не отправит.
function setCors(res) {
  const allowed = config.allowedOrigins;
  const origin = res._reqOrigin || '';
  if (allowed.indexOf('*') >= 0) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    res.setHeader('Vary', 'Origin');
    if (origin && allowed.indexOf(origin) >= 0) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// Заголовки безопасности. Их ставим только на ответы API — страницу
// документации они не трогают, Swagger UI ничего не теряет.
function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
}

// Единый конверт ответа — тот же, что у остальных сервисов Softclub:
//   { data, errors, statusCode }
// Список  → data: [...] плюс поля пагинации рядом
// Объект  → data: {...}
// Ошибка  → data: null, errors: ['текст ошибки'] и разбираемый error: { code, message, details }
// На фронтенде это даёт один и тот же разбор:
//   const { data } = await axios.get(url);  data.data.map(...)
// Ссылки внутри данных хранятся относительными (/api/images/…, /api/kolyaski),
// а наружу отдаются абсолютными: фронтенд живёт на другом домене, и относительный
// путь у него разрешился бы в его собственный адрес.
function absolutize(value, origin) {
  if (typeof value === 'string') {
    return (value.indexOf('/api/') === 0 || value.indexOf('/assets/') === 0) ? origin + value : value;
  }
  if (Array.isArray(value)) return value.map(v => absolutize(v, origin));
  if (value && typeof value === 'object') {
    const out = {};
    for (const key in value) out[key] = absolutize(value[key], origin);
    return out;
  }
  return value;
}

function jsonRes(res, status, payload) {
  setCors(res);
  setSecurityHeaders(res);
  res.statusCode = status;
  const body = Object.assign({ data: null, errors: [], statusCode: status }, payload);
  return res.json(res._origin ? absolutize(body, res._origin) : body);
}

// объект или массив в конверте
function jsonData(res, status, payload) {
  return jsonRes(res, status, { data: payload === undefined ? null : payload });
}

// ошибка в том же конверте: старые поля errors/message на месте,
// рядом — error с кодом и подробностями (ТЗ по обработке ошибок)
function jsonErr(res, status, message, code, details) {
  return jsonRes(res, status, {
    data: null,
    errors: [message],
    message,
    error: {
      code: code || ERR[status] || 'ERROR',
      message,
      details: Array.isArray(details) ? details : (details ? [details] : [])
    }
  });
}

// Мусор в page и pageSize не ошибка, а повод взять значение по умолчанию:
// «abc», «-5», «0» и «1000000» приводятся к разумным числам, ответ остаётся 200.
function paginate(items, page, pageSize, defaultSize = 10) {
  const askedPage = parseInt(page, 10);
  const askedSize = parseInt(pageSize, 10);
  page = Number.isFinite(askedPage) && askedPage > 0 ? askedPage : 1;
  pageSize = Number.isFinite(askedSize) && askedSize > 0 ? Math.min(200, askedSize) : defaultSize;
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = (page - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    totalCount,
    page,
    pageSize,
    totalPages,
    hasPrevious: page > 1,
    hasNext: page < totalPages
  };
}

// Короткая карточка товара — без отзывов и характеристик (?light=true)
function lightProduct(p) {
  const { reviews, characteristics, images, description, ...rest } = p;
  return rest;
}

// Краткая карточка для вложенных списков (акции, связанные товары)
function miniProduct(p) {
  return {
    id: p.id, name: p.name, slug: p.slug, price: p.price, oldPrice: p.oldPrice,
    discount: p.discount, image: p.image, brand: p.brand, rating: p.rating,
    inStock: p.inStock, categoryId: p.categoryId, subcategoryId: p.subcategoryId
  };
}

// --- фильтры и сортировка товаров ---------------------------
// Один набор правил на все списки товаров: /api/products, /api/{category},
// /api/{category}/{subcategory}, /api/categories/{id}/products. Раньше
// каждый обработчик фильтровал по-своему, и параметры работали не везде.
const lower = (v) => String(v == null ? '' : v).toLowerCase();
const csv = (v) => String(v).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const flag = (v) => (v === true || v === 'true' || v === '1');
const isFalse = (v) => (v === false || v === 'false' || v === '0');
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };

function matchesSearch(p, term) {
  const s = lower(term);
  return lower(p.name).includes(s) ||
    lower(p.description).includes(s) ||
    lower(p.brand).includes(s) ||
    lower(p.article).includes(s) ||
    lower(p.categoryName).includes(s) ||
    lower(p.subcategoryName).includes(s);
}

function applyProductFilters(list, q) {
  q = q || {};
  let result = list;

  const term = q.search || q.q;
  if (term) result = result.filter(p => matchesSearch(p, term));

  if (q.categoryId) result = result.filter(p => p.categoryId === parseInt(q.categoryId));
  if (q.categorySlug) result = result.filter(p => p.categorySlug === q.categorySlug);
  if (q.subcategoryId) result = result.filter(p => p.subcategoryId === parseInt(q.subcategoryId));
  if (q.subcategorySlug) result = result.filter(p => p.subcategorySlug === q.subcategorySlug);
  // обратная совместимость: ?subcategory= принимает и название, и slug, и id
  if (q.subcategory) {
    const s = lower(q.subcategory);
    result = result.filter(p =>
      lower(p.subcategoryName) === s || p.subcategorySlug === s || p.subcategoryId === parseInt(q.subcategory));
  }

  if (flag(q.onlyPromo) || flag(q.isPromo)) result = result.filter(p => p.isPromo);
  if (isFalse(q.isPromo)) result = result.filter(p => !p.isPromo);
  if (flag(q.isNew)) result = result.filter(p => p.isNew);
  if (isFalse(q.isNew)) result = result.filter(p => !p.isNew);
  if (flag(q.inStock)) result = result.filter(p => p.inStock);
  if (isFalse(q.inStock)) result = result.filter(p => !p.inStock);

  const listFilter = (value, getValues) => {
    const wanted = csv(value);
    if (!wanted.length) return;
    result = result.filter(p => (getValues(p) || []).some(v => wanted.includes(lower(v))));
  };
  if (q.brand) listFilter(q.brand, p => [p.brand]);
  if (q.country) listFilter(q.country, p => [p.country]);
  if (q.color) listFilter(q.color, p => p.colorOptions);
  if (q.material) listFilter(q.material, p => p.materials);
  if (q.ageGroup) listFilter(q.ageGroup, p => [p.ageGroup]);

  const priceMin = num(q.priceMin != null ? q.priceMin : q.minPrice);
  const priceMax = num(q.priceMax != null ? q.priceMax : q.maxPrice);
  const ratingMin = num(q.ratingMin != null ? q.ratingMin : q.minRating);
  if (priceMin !== null) result = result.filter(p => p.price >= priceMin);
  if (priceMax !== null) result = result.filter(p => p.price <= priceMax);
  if (ratingMin !== null) result = result.filter(p => p.rating >= ratingMin);

  return result;
}

// Понимает два вида записи: короткую ?sort=price_asc и подробную
// ?sortBy=price&sortDir=asc. Массив всегда копируется, исходный не трогаем.
const SORT_ALIASES = {
  price_asc: { by: 'price', dir: 'asc' }, price_desc: { by: 'price', dir: 'desc' },
  name_asc: { by: 'name', dir: 'asc' }, name_desc: { by: 'name', dir: 'desc' },
  rating_asc: { by: 'rating', dir: 'asc' }, rating_desc: { by: 'rating', dir: 'desc' },
  newest: { by: 'new', dir: 'desc' }, rating: { by: 'rating', dir: 'desc' },
  discount: { by: 'discount', dir: 'desc' }, popularity: { by: 'popularity', dir: 'desc' }
};

function applyProductSort(list, q) {
  q = q || {};
  const alias = q.sort ? SORT_ALIASES[String(q.sort).toLowerCase()] : null;
  const by = alias ? alias.by : (q.sortBy || 'popularity');
  const dirName = alias ? alias.dir : q.sortDir;
  const dir = dirName === 'asc' ? 1 : -1;
  const out = list.slice();

  if (by === 'price') out.sort((a, b) => (a.price - b.price) * dir);
  else if (by === 'name') out.sort((a, b) => a.name.localeCompare(b.name, 'ru') * dir);
  else if (by === 'rating') out.sort((a, b) => (a.rating - b.rating) * dir);
  else if (by === 'discount') out.sort((a, b) => (a.discount - b.discount) * dir);
  else if (by === 'new') out.sort((a, b) => (((a.isNew ? 1 : 0) - (b.isNew ? 1 : 0)) || (a.id - b.id)) * dir);
  // popularity — порядок каталога, ничего не сортируем

  return out;
}

// Полная обработка списка товаров: фильтры → сортировка → ?light=true
function queryProducts(list, q) {
  let result = applyProductFilters(list, q || {});
  result = applyProductSort(result, q || {});
  if (flag((q || {}).light)) result = result.map(lightProduct);
  return result;
}

// --- тело запроса -------------------------------------------
// JSON или multipart/form-data. Возвращает { fields, files, tooLarge }.
async function readBody(req) {
  if (multipart.isMultipart(req)) {
    const raw = await multipart.readRawBody(req);
    if (!raw.ok) return { fields: {}, files: {}, tooLarge: true };
    const parsed = multipart.parseMultipart(raw.buffer, req.headers['content-type']);
    return { fields: parsed.fields, files: parsed.files, tooLarge: false };
  }
  const body = await getBody(req);
  return { fields: body || {}, files: {}, tooLarge: false };
}

function getBody(req) {
  // Vercel уже разбирает JSON-тело в req.body — читаем поток только если его нет
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return Promise.resolve(req.body);
  if (Buffer.isBuffer(req.body)) {
    try { return Promise.resolve(JSON.parse(req.body.toString('utf8')) || {}); } catch { return Promise.resolve({}); }
  }
  if (typeof req.body === 'string') {
    try { return Promise.resolve(JSON.parse(req.body)); } catch { return Promise.resolve({}); }
  }
  return new Promise((resolve) => {
    let body = '';
    let size = 0;
    let done = false;
    const finish = (value) => { if (!done) { done = true; resolve(value); } };
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > config.maxBodyBytes) return finish({});
      body += chunk;
    });
    req.on('end', () => {
      try { finish(body ? JSON.parse(body) : {}); }
      catch { finish({}); }
    });
    req.on('error', () => finish({}));
  });
}

function nextId(list) {
  return list.length ? Math.max(...list.map(x => x.id)) + 1 : 1;
}

// --- авторизация --------------------------------------------
// Возвращает { user, payload } либо { error: { status, message, code } }.
// Пустой заголовок Authorization — это не ошибка: значит, гость.
async function authenticate(req) {
  const token = security.bearerOf(req);
  if (!token) return { user: null, payload: null };
  const payload = security.verifyToken(token);
  if (!payload) return { error: { status: 401, message: 'Токен недействителен или истёк', code: 'INVALID_TOKEN' } };
  await store.ready();
  if (payload.jti && await store.isRevoked(payload.jti)) {
    return { error: { status: 401, message: 'Токен отозван — выполните вход заново', code: 'TOKEN_REVOKED' } };
  }
  const user = await store.findUserById(payload.sub);
  if (!user) return { error: { status: 401, message: 'Пользователь из токена не найден', code: 'INVALID_TOKEN' } };
  return { user, payload };
}

// Пишет 401/403 в ответ и возвращает null, если доступа нет.
// Иначе возвращает пользователя.
async function requireUser(req, res) {
  const auth = await authenticate(req);
  if (auth.error) {
    jsonErr(res, auth.error.status, auth.error.message, auth.error.code);
    return null;
  }
  if (!auth.user) {
    jsonErr(res, 401, 'Требуется вход: заголовок Authorization: Bearer <токен>', 'UNAUTHORIZED');
    return null;
  }
  req._user = auth.user;
  req._token = auth.payload;
  return auth.user;
}

async function requireAdmin(req, res) {
  // PUBLIC_WRITES=true оставляет запись открытой — режим для занятий,
  // когда токен только мешает. По умолчанию выключен.
  if (config.publicWrites) {
    const auth = await authenticate(req).catch(() => ({}));
    req._user = auth.user || null;
    return auth.user || { id: 0, role: 'admin', fullName: 'Открытый режим', email: '' };
  }
  const user = await requireUser(req, res);
  if (!user) return null;
  if (user.role !== 'admin') {
    jsonErr(res, 403, 'Действие доступно только администратору', 'FORBIDDEN');
    return null;
  }
  return user;
}

module.exports = {
  categories, products, blog, promotions, subcategories,
  ERR, config, security, store, multipart,
  setCors, setSecurityHeaders, jsonRes, jsonData, jsonErr, absolutize, paginate,
  getBody, readBody, lightProduct, miniProduct, nextId,
  applyProductFilters, applyProductSort, queryProducts, matchesSearch,
  authenticate, requireUser, requireAdmin
};
