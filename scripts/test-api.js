#!/usr/bin/env node
// ============================================================
// Сквозная проверка API: чтение каталога, регистрация с файлом,
// вход, права, отзывы, CRUD, выход и коды ошибок.
//
//   npm run test:api
//
// Скрипт сам поднимает локальный сервер на свободном порту и гасит его
// после проверки. Чтобы прогнать по уже запущенному серверу или по проду:
//   BASE=https://swagger-wheat.vercel.app npm run test:api
// Возвращает код 1, если хотя бы одна проверка не прошла.
// ============================================================
const { spawn } = require('child_process');
const path = require('path');

const PORT = process.env.PORT || 3111;
const OWN_SERVER = !process.env.BASE;
const BASE = process.env.BASE || `http://localhost:${PORT}`;

let server = null;

async function startServer() {
  if (!OWN_SERVER) return;
  server = spawn(process.execPath, [path.join(__dirname, 'dev-server.js')], {
    env: Object.assign({}, process.env, { PORT: String(PORT) }),
    stdio: ['ignore', 'ignore', 'inherit']
  });
  // ждём, пока сервер начнёт отвечать
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`${BASE}/api`);
      if (res.ok) return;
    } catch (e) { /* ещё не поднялся */ }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Локальный сервер не поднялся');
}

function stopServer() {
  if (server) server.kill();
}

let passed = 0, failed = 0;
const results = [];

function check(name, cond, extra) {
  if (cond) { passed++; results.push(`  ok   ${name}`); }
  else { failed++; results.push(`  FAIL ${name}${extra ? ' → ' + JSON.stringify(extra).slice(0, 300) : ''}`); }
}

async function req(method, path, { body, token, form, headers } = {}) {
  const h = Object.assign({}, headers);
  let payload;
  if (form) { payload = form; }
  else if (body !== undefined) { h['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  if (token) h.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers: h, body: payload });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* не JSON — например картинка */ }
  return { status: res.status, json, text, headers: res.headers };
}

// сборка multipart-тела вручную — так же, как это делает браузер
function multipart(fields, file) {
  const B = '----karapuztest' + Date.now();
  const parts = [];
  Object.entries(fields).forEach(([k, v]) => {
    parts.push(Buffer.from(`--${B}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`, 'utf8'));
  });
  if (file) {
    parts.push(Buffer.from(`--${B}\r\nContent-Disposition: form-data; name="${file.name}"; filename="${file.filename}"\r\nContent-Type: ${file.type}\r\n\r\n`, 'utf8'));
    parts.push(file.data);
    parts.push(Buffer.from('\r\n', 'utf8'));
  }
  parts.push(Buffer.from(`--${B}--\r\n`, 'utf8'));
  return { body: Buffer.concat(parts), type: `multipart/form-data; boundary=${B}` };
}

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(400, 9)
]);

(async () => {
  await startServer();

  // ---------- чтение каталога ----------
  let r = await req('GET', '/api/products?pageSize=5');
  check('GET /api/products', r.status === 200 && Array.isArray(r.json.data) && r.json.data.length === 5 && r.json.totalCount === 780, r.json && r.json.totalCount);

  r = await req('GET', '/api/products?sort=price_asc&pageSize=3');
  const prices = r.json.data.map(p => p.price);
  check('сортировка sort=price_asc', prices[0] <= prices[1] && prices[1] <= prices[2], prices);

  r = await req('GET', '/api/products?sort=price_desc&pageSize=3');
  const pd = r.json.data.map(p => p.price);
  check('сортировка sort=price_desc', pd[0] >= pd[1] && pd[1] >= pd[2], pd);

  r = await req('GET', '/api/products/search?q=Nuovita&pageSize=100');
  check('GET /api/products/search?q=', r.status === 200 && r.json.data.length > 0 &&
    r.json.data.every(p => JSON.stringify(p).toLowerCase().includes('nuovita')), r.json && r.json.totalCount);

  r = await req('GET', '/api/products?categoryId=1&minPrice=5000&maxPrice=15000&pageSize=200');
  check('фильтр categoryId+minPrice+maxPrice', r.status === 200 &&
    r.json.data.every(p => p.categoryId === 1 && p.price >= 5000 && p.price <= 15000), r.json && r.json.totalCount);

  r = await req('GET', '/api/products?inStock=true&isNew=true&pageSize=50');
  check('фильтры inStock+isNew', r.json.data.every(p => p.inStock && p.isNew));

  r = await req('GET', '/api/products?ageGroup=0-3 года&pageSize=10');
  check('фильтр ageGroup', r.status === 200 && r.json.data.every(p => p.ageGroup === '0-3 года'));

  r = await req('GET', '/api/products/filter?brand=Chicco&country=Италия&pageSize=100');
  check('GET /api/products/filter', r.status === 200 && r.json.data.every(p => p.brand === 'Chicco' && p.country === 'Италия'));

  r = await req('GET', '/api/products/1');
  check('GET /api/products/{id}', r.status === 200 && r.json.data.id === 1 && Array.isArray(r.json.data.similar));
  const firstSlug = r.json.data.slug;

  r = await req('GET', '/api/products/slug/' + firstSlug);
  check('GET /api/products/slug/{slug}', r.status === 200 && r.json.data.slug === firstSlug);

  r = await req('GET', '/api/products/999999');
  check('несуществующий товар → 404', r.status === 404 && r.json.error.code === 'NOT_FOUND', r.json && r.json.error);

  r = await req('GET', '/api/products?page=abc&pageSize=abc');
  check('page=abc&pageSize=abc нормализуются', r.status === 200 && r.json.page === 1 && r.json.pageSize === 20, r.json && { p: r.json.page, s: r.json.pageSize });

  r = await req('GET', '/api/products?page=-10&pageSize=-5');
  check('page=-10&pageSize=-5 нормализуются', r.status === 200 && r.json.page === 1 && r.json.pageSize === 20);

  r = await req('GET', '/api/products?pageSize=1000000');
  check('pageSize=1000000 обрезается', r.status === 200 && r.json.pageSize === 200);

  r = await req('GET', '/api/products?page=999999');
  check('страница за пределами → 200 и пустой список', r.status === 200 && r.json.data.length === 0);

  r = await req('GET', '/api/categories');
  check('GET /api/categories', r.status === 200 && r.json.data.length === 8 && r.json.data[0].subcategoryCount > 0);

  r = await req('GET', '/api/categories/1/products?pageSize=5');
  check('GET /api/categories/{id}/products', r.status === 200 && r.json.data.length === 5 &&
    r.json.data.every(p => p.categoryId === 1) && r.json.category.name === 'Акции');

  r = await req('GET', '/api/subcategories?pageSize=100');
  check('GET /api/subcategories', r.status === 200 && r.json.totalCount === 39);

  r = await req('GET', '/api/subcategories/11');
  check('GET /api/subcategories/{id}', r.status === 200 && r.json.data.length === 20 && r.json.subcategory.id === 11);

  r = await req('GET', '/api/avtokresla/gruppa-1?pageSize=3');
  check('читаемый адрес /api/{category}/{subcategory}', r.status === 200 && r.json.data.length === 3 && !!r.json.category.info);

  r = await req('GET', '/api/kolyaski?sortBy=price&sortDir=asc&pageSize=3');
  check('читаемый адрес /api/{category} + старая сортировка', r.status === 200 &&
    r.json.data[0].price <= r.json.data[2].price);

  r = await req('GET', '/api/blog?pageSize=3');
  const post = r.json.data[0];
  check('GET /api/blog отдаёт описание, автора и тезисы', r.status === 200 &&
    !!post.description && !!post.author.name && post.highlights.length === 3 && !post.content, Object.keys(post || {}));

  r = await req('GET', '/api/blog/1');
  const full = r.json.data;
  check('GET /api/blog/{id} — блоки, крошки, похожие', r.status === 200 &&
    full.sections.length > 3 && full.breadcrumbs.length === 4 && full.related.length === 3 && !!full.content);

  r = await req('GET', '/api/blog/slug/pervyy-prikorm');
  check('GET /api/blog/slug/{slug}', r.status === 200 && r.json.data.id === 7);

  r = await req('GET', '/api/promotions?pageSize=3');
  check('GET /api/promotions', r.status === 200 && r.json.data.length === 3);

  r = await req('GET', '/api/reviews?pageSize=5');
  check('GET /api/reviews', r.status === 200 && r.json.data.length === 5 && r.json.data[0].productName);

  r = await req('GET', '/api/products/1/reviews');
  check('GET /api/products/{id}/reviews', r.status === 200 && Array.isArray(r.json.data));

  r = await req('GET', '/api/images/cat-kolyaski.svg');
  check('GET /api/images/{slug}.svg', r.status === 200 && r.text.startsWith('<svg'));

  r = await req('GET', '/api/images/author-madina-rahimova.svg');
  check('аватар автора рисуется', r.status === 200 && r.text.includes('МР'));

  // ---------- CORS и заголовки ----------
  r = await req('OPTIONS', '/api/products');
  check('OPTIONS → 204 + CORS', r.status === 204 && r.headers.get('access-control-allow-origin') === '*' &&
    r.headers.get('access-control-allow-methods').includes('PATCH'));

  r = await req('GET', '/api/products?pageSize=1');
  check('заголовки безопасности', r.headers.get('x-content-type-options') === 'nosniff' &&
    r.headers.get('x-frame-options') === 'DENY' && !!r.headers.get('x-ratelimit-limit'));

  // ---------- запись без токена ----------
  r = await req('POST', '/api/products', { body: { name: 'Тест', price: 100 } });
  check('POST /api/products без токена → 401', r.status === 401 && r.json.error.code === 'UNAUTHORIZED', r.json && r.json.error);

  r = await req('POST', '/api/products', { body: { name: 'Тест', price: 100 }, token: 'not.a.token' });
  check('битый токен → 401', r.status === 401 && r.json.error.code === 'INVALID_TOKEN');

  // ---------- регистрация ----------
  const email = `student${Date.now()}@karapuz.tj`;
  const tel = '+9929' + String(Date.now()).slice(-8);
  const mp = multipart({
    fullName: 'Мансур', tel, email, password: 'ExamplePassword123!', address: 'Душанбе'
  }, { name: 'avatar', filename: 'me.png', type: 'image/png', data: PNG });

  r = await req('POST', '/api/auth/register', { form: mp.body, headers: { 'Content-Type': mp.type } });
  const reg = r.json && r.json.data;
  check('POST /api/auth/register (multipart + файл)', r.status === 201 && !!reg.accessToken && reg.user.role === 'user', r.json && r.json.error);
  check('телефон замаскирован', reg && /^\+\d{6}\*{6,}$/.test(reg.user.tel) && reg.user.tel !== tel, reg && reg.user.tel);
  check('пароль и хеш не возвращаются', reg && !JSON.stringify(reg).match(/passwordHash|scrypt\$|ExamplePassword/));
  check('аватар сохранён', reg && /\/api\/users\/\d+\/avatar$/.test(reg.user.avatar), reg && reg.user.avatar);

  const userToken = reg.accessToken;
  const userId = reg.user.id;

  r = await req('GET', `/api/users/${userId}/avatar`);
  check('GET /api/users/{id}/avatar отдаёт картинку', r.status === 200 && r.headers.get('content-type') === 'image/png');

  r = await req('POST', '/api/auth/register', { body: { fullName: 'Дубль', tel: '+992900111222', email, password: 'ExamplePassword123!' } });
  check('повтор email → 409', r.status === 409 && r.json.error.code === 'EMAIL_ALREADY_EXISTS');

  r = await req('POST', '/api/auth/register', { body: { fullName: 'Дубль', tel, email: 'other' + email, password: 'ExamplePassword123!' } });
  check('повтор телефона → 409', r.status === 409 && r.json.error.code === 'TEL_ALREADY_EXISTS');

  r = await req('POST', '/api/auth/register', { body: { fullName: 'X', email: 'плохой', password: '123' } });
  check('плохие данные → 400 со списком полей', r.status === 400 && r.json.error.details.length >= 3, r.json && r.json.error);

  r = await req('POST', '/api/auth/register', {
    body: { fullName: 'Хакер', tel: '+992900999888', email: 'hack' + email, password: 'ExamplePassword123!', role: 'admin' }
  });
  check('role в теле запроса → 400, админом не стать', r.status === 400 &&
    r.json.error.details.some(d => d.field === 'role'));

  const bigMp = multipart({ fullName: 'Большой', tel: '+992900777666', email: 'big' + email, password: 'ExamplePassword123!' },
    { name: 'avatar', filename: 'big.png', type: 'image/png', data: Buffer.concat([PNG, Buffer.alloc(300 * 1024, 1)]) });
  r = await req('POST', '/api/auth/register', { form: bigMp.body, headers: { 'Content-Type': bigMp.type } });
  check('слишком большой аватар → 413', r.status === 413, r.status);

  const evilMp = multipart({ fullName: 'Опасный', tel: '+992900555444', email: 'evil' + email, password: 'ExamplePassword123!' },
    { name: 'avatar', filename: 'shell.php', type: 'image/png', data: PNG });
  r = await req('POST', '/api/auth/register', { form: evilMp.body, headers: { 'Content-Type': evilMp.type } });
  check('опасное расширение → 415', r.status === 415, r.status);

  const fakeMp = multipart({ fullName: 'Подделка', tel: '+992900333222', email: 'fake' + email, password: 'ExamplePassword123!' },
    { name: 'avatar', filename: 'ok.png', type: 'image/png', data: Buffer.from('<?php system($_GET[0]); ?>            ') });
  r = await req('POST', '/api/auth/register', { form: fakeMp.body, headers: { 'Content-Type': fakeMp.type } });
  check('подделка содержимого файла → 415', r.status === 415, r.status);

  // ---------- вход ----------
  r = await req('POST', '/api/auth/login', { body: { email, password: 'ExamplePassword123!' } });
  check('POST /api/auth/login', r.status === 200 && !!r.json.data.accessToken && r.json.data.tokenType === 'Bearer');

  r = await req('POST', '/api/auth/login', { body: { email, password: 'неверный' } });
  check('неверный пароль → 401', r.status === 401 && r.json.error.code === 'INVALID_CREDENTIALS');

  r = await req('GET', '/api/auth/me', { token: userToken });
  check('GET /api/auth/me', r.status === 200 && r.json.data.user.id === userId && !JSON.stringify(r.json).includes('passwordHash'));

  r = await req('GET', '/api/auth/me');
  check('/api/auth/me без токена → 401', r.status === 401);

  // ---------- права ----------
  r = await req('POST', '/api/products', { token: userToken, body: { name: 'Тест', price: 100 } });
  check('обычный пользователь POST /api/products → 403', r.status === 403 && r.json.error.code === 'FORBIDDEN');

  r = await req('PATCH', `/api/users/${userId}`, { token: userToken, body: { role: 'admin' } });
  check('сам себе роль admin → 403', r.status === 403);

  r = await req('PATCH', `/api/users/${userId}`, { token: userToken, body: { fullName: 'Мансур Сафаров' } });
  check('PATCH своего профиля', r.status === 200 && r.json.data.fullName === 'Мансур Сафаров');

  r = await req('GET', '/api/users', { token: userToken });
  check('список пользователей обычному → 403', r.status === 403);

  // ---------- администратор ----------
  r = await req('POST', '/api/auth/login', { body: { email: 'admin@karapuz.tj', password: 'Admin123!' } });
  check('вход администратора', r.status === 200 && r.json.data.user.role === 'admin', r.json && r.json.error);
  const adminToken = r.json.data.accessToken;

  r = await req('GET', '/api/users', { token: adminToken });
  check('GET /api/users администратором', r.status === 200 && r.json.totalCount >= 2 &&
    !JSON.stringify(r.json).includes('passwordHash'));

  r = await req('POST', '/api/products', {
    token: adminToken,
    body: { name: 'Тестовая коляска', price: 12000, oldPrice: 15000, categoryId: 3, subcategoryId: 31, brand: 'Тест' }
  });
  check('POST /api/products администратором → 201', r.status === 201 && r.json.data.discount === 20, r.json && r.json.error);
  const newProductId = r.json.data.id;

  r = await req('PATCH', `/api/products/${newProductId}`, { token: adminToken, body: { price: 9000 } });
  check('PATCH /api/products/{id}', r.status === 200 && r.json.data.price === 9000 && r.json.data.name === 'Тестовая коляска');

  r = await req('PUT', `/api/products/${newProductId}`, { token: adminToken, body: { name: 'Заменённая коляска', price: 8000 } });
  check('PUT /api/products/{id}', r.status === 200 && r.json.data.name === 'Заменённая коляска');

  r = await req('PUT', `/api/products/${newProductId}`, { token: adminToken, body: { price: 8000 } });
  check('PUT без name → 400', r.status === 400);

  r = await req('POST', '/api/products', { token: adminToken, body: { name: 'Без цены' } });
  check('POST без price → 400', r.status === 400);

  r = await req('POST', '/api/products', { token: adminToken, body: { name: 'Плохая цена', price: -5 } });
  check('отрицательная цена → 400', r.status === 400);

  // ---------- отзывы ----------
  r = await req('POST', `/api/products/${newProductId}/reviews`, { body: { comment: 'Аноним' } });
  check('отзыв без входа → 401', r.status === 401);

  r = await req('POST', `/api/products/${newProductId}/reviews`, {
    token: userToken, body: { rating: 5, comment: 'Отличная коляска', pros: 'Лёгкая', cons: 'Нет' }
  });
  check('POST отзыва вошедшим пользователем → 201', r.status === 201 && r.json.data.author === 'Мансур Сафаров', r.json && r.json.error);
  const reviewId = r.json.data.id;

  r = await req('POST', `/api/products/${newProductId}/reviews`, { token: userToken, body: { rating: 4, comment: 'Ещё раз' } });
  check('второй отзыв на тот же товар → 409', r.status === 409);

  r = await req('PATCH', `/api/reviews/${reviewId}`, { token: userToken, body: { rating: 4 } });
  check('PATCH своего отзыва', r.status === 200 && r.json.data.rating === 4);

  r = await req('PATCH', `/api/reviews/${reviewId}`, { token: userToken, body: { rating: 9 } });
  check('оценка 9 → 400', r.status === 400);

  r = await req('PATCH', '/api/reviews/1', { token: userToken, body: { rating: 1 } });
  check('чужой отзыв обычным пользователем → 403', r.status === 403);

  r = await req('PATCH', '/api/reviews/1', { token: adminToken, body: { rating: 5 } });
  check('чужой отзыв администратором → 200', r.status === 200);

  r = await req('DELETE', `/api/reviews/${reviewId}`, { token: userToken });
  check('DELETE своего отзыва', r.status === 200);

  // ---------- остальные разделы CRUD ----------
  r = await req('POST', '/api/categories', { token: adminToken, body: { name: 'Тестовая категория', slug: 'test-cat-' + Date.now() } });
  check('POST /api/categories админом', r.status === 201);
  const catId = r.json.data.id;

  r = await req('PATCH', `/api/categories/${catId}`, { token: adminToken, body: { description: 'Описание' } });
  check('PATCH /api/categories/{id}', r.status === 200 && r.json.data.description === 'Описание');

  r = await req('POST', '/api/subcategories', { token: adminToken, body: { name: 'Тестовая подкатегория', categoryId: catId } });
  check('POST /api/subcategories админом', r.status === 201);
  const subId = r.json.data.id;

  r = await req('PATCH', `/api/subcategories/${subId}`, { token: adminToken, body: { name: 'Переименована' } });
  check('PATCH /api/subcategories/{id}', r.status === 200 && r.json.data.name === 'Переименована');

  r = await req('DELETE', `/api/subcategories/${subId}`, { token: adminToken });
  check('DELETE /api/subcategories/{id}', r.status === 200);

  r = await req('DELETE', `/api/categories/${catId}`, { token: adminToken });
  check('DELETE /api/categories/{id}', r.status === 200);

  r = await req('POST', '/api/blog', { token: adminToken, body: { title: 'Тестовая статья', content: 'Первый абзац.\n\nВторой абзац.' } });
  check('POST /api/blog админом', r.status === 201 && r.json.data.sections.length === 2);
  const postId = r.json.data.id;

  r = await req('PATCH', `/api/blog/${postId}`, { token: adminToken, body: { title: 'Новый заголовок' } });
  check('PATCH /api/blog/{id}', r.status === 200 && r.json.data.title === 'Новый заголовок');

  r = await req('DELETE', `/api/blog/${postId}`, { token: adminToken });
  check('DELETE /api/blog/{id}', r.status === 200);

  r = await req('POST', '/api/promotions', { token: adminToken, body: { title: 'Тестовая акция', categoryId: 1 } });
  check('POST /api/promotions админом', r.status === 201);
  const promoId = r.json.data.id;

  r = await req('PATCH', `/api/promotions/${promoId}`, { token: adminToken, body: { discount: 40 } });
  check('PATCH /api/promotions/{id}', r.status === 200 && r.json.data.discount === 40);

  r = await req('DELETE', `/api/promotions/${promoId}`, { token: adminToken });
  check('DELETE /api/promotions/{id}', r.status === 200);

  r = await req('DELETE', `/api/products/${newProductId}`, { token: adminToken });
  check('DELETE /api/products/{id}', r.status === 200);

  // ---------- выход ----------
  r = await req('POST', '/api/auth/logout', { token: userToken });
  check('POST /api/auth/logout', r.status === 200 && !!r.json.data.revokedJti);

  r = await req('GET', '/api/auth/me', { token: userToken });
  check('токен после выхода отозван → 401', r.status === 401 && r.json.error.code === 'TOKEN_REVOKED', r.json && r.json.error);

  // ---------- спецификация ----------
  r = await req('GET', '/api/swagger.json');
  const spec = r.json;
  check('GET /api/swagger.json', r.status === 200 && spec.openapi && !spec.data);
  check('в спецификации есть bearerAuth', !!(spec.components && spec.components.securitySchemes && spec.components.securitySchemes.bearerAuth));

  // ---------- ограничение частоты ----------
  let limited = false;
  for (let i = 0; i < 40; i++) {
    const res = await req('POST', '/api/auth/login', { body: { email: 'нет@нет.tj', password: 'нет' } });
    if (res.status === 429) { limited = true; break; }
  }
  check('слишком частый вход → 429', limited);

  console.log(results.join('\n'));
  console.log(`\nПройдено: ${passed}, провалено: ${failed}`);
  stopServer();
  process.exit(failed ? 1 : 0);
})().catch(err => {
  console.error('Проверка прервалась:', err && err.message ? err.message : err);
  stopServer();
  process.exit(2);
});
