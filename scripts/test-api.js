#!/usr/bin/env node
// ============================================================
// Сквозная проверка API: чтение каталога, регистрация с фотографией,
// «Личные данные», отзывы, CRUD, владелец записи и коды ошибок.
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
let passed = 0, failed = 0;
const results = [];

function check(name, cond, extra) {
  if (cond) { passed++; results.push(`  ok   ${name}`); }
  else { failed++; results.push(`  FAIL ${name}${extra !== undefined ? ' → ' + JSON.stringify(extra).slice(0, 300) : ''}`); }
}

async function startServer() {
  if (!OWN_SERVER) return;
  server = spawn(process.execPath, [path.join(__dirname, 'dev-server.js')], {
    env: Object.assign({}, process.env, { PORT: String(PORT) }),
    stdio: ['ignore', 'ignore', 'inherit']
  });
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${BASE}/api`);
      if (res.ok) return;
    } catch (e) { /* ещё не поднялся */ }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Локальный сервер не поднялся');
}

function stopServer() { if (server) server.kill(); }

async function req(method, path, { body, token, form, headers } = {}) {
  const h = Object.assign({}, headers);
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { h['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  if (token) h.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers: h, body: payload });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* не JSON — например картинка */ }
  return { status: res.status, json, text, headers: res.headers, raw: res };
}

// сборка multipart-тела вручную — так же, как это делает браузер
function multipart(fields, file) {
  const B = '----karapuztest' + Date.now() + Math.random().toString(16).slice(2);
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

// маленькая настоящая картинка 8×8 — сервер должен её прочитать и сжать
const PNG_2x2 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAJUlEQVR4AYXBAQEAIAyAMKSY' +
  'wSxnM99AtrXPfXxIkCBBggQJEgaOvQKJGJcwlgAAAABJRU5ErkJggg==', 'base64');

(async () => {
  await startServer();

  // ---------- чтение каталога ----------
  let r = await req('GET', '/api/products?pageSize=5');
  check('GET /api/products', r.status === 200 && Array.isArray(r.json.data) && r.json.data.length === 5 && r.json.totalCount === 780, r.json && r.json.totalCount);

  r = await req('GET', '/api/products?sort=price_asc&pageSize=3');
  let prices = r.json.data.map(p => p.price);
  check('сортировка sort=price_asc', prices[0] <= prices[1] && prices[1] <= prices[2], prices);

  r = await req('GET', '/api/products?sort=price_desc&pageSize=3');
  prices = r.json.data.map(p => p.price);
  check('сортировка sort=price_desc', prices[0] >= prices[1] && prices[1] >= prices[2], prices);

  r = await req('GET', '/api/products/search?q=Nuovita&pageSize=100');
  check('GET /api/products/search?q=', r.status === 200 && r.json.data.length > 0 &&
    r.json.data.every(p => JSON.stringify(p).toLowerCase().includes('nuovita')), r.json && r.json.totalCount);

  r = await req('GET', '/api/products?categoryId=1&minPrice=5000&maxPrice=15000&pageSize=200');
  check('фильтр categoryId+minPrice+maxPrice', r.status === 200 &&
    r.json.data.every(p => p.categoryId === 1 && p.price >= 5000 && p.price <= 15000));

  r = await req('GET', '/api/products?inStock=true&isNew=true&pageSize=50');
  check('фильтры inStock+isNew', r.json.data.every(p => p.inStock && p.isNew));

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
  check('page=abc&pageSize=abc нормализуются', r.status === 200 && r.json.page === 1 && r.json.pageSize === 20);

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

  // ---------- аккаунт: создание ----------
  r = await req('POST', '/api/users', { body: {} });
  check('пустая регистрация → 400', r.status === 400);

  r = await req('POST', '/api/users', { body: { fullName: 'X', email: 'не-почта', password: '1' } });
  check('некорректный email → 400', r.status === 400);

  const email = `student${Date.now()}@karapuz.tj`;
  const tel = '+992900123456';
  const mp = multipart({
    fullName: 'Мансур Сафаров', tel, email,
    password: 'ExamplePassword123!', address: 'Душанбе, улица Рудаки 25'
  }, { name: 'avatar', filename: 'foto.png', type: 'image/png', data: PNG_2x2 });

  r = await req('POST', '/api/users', { form: mp.body, headers: { 'Content-Type': mp.type } });
  const me = r.json && r.json.data && r.json.data.user;
  const token = r.json && r.json.data && r.json.data.token;
  check('POST /api/users (multipart + фото)', r.status === 201 && me && me.id > 0, r.json && r.json.error);
  check('свой телефон возвращается полностью', me && me.tel === tel);
  check('своё имя возвращается полностью', me && me.fullName === 'Мансур Сафаров');
  check('свой email возвращается полностью', me && me.email === email);
  check('свой адрес возвращается полностью', me && me.address === 'Душанбе, улица Рудаки 25');
  check('пароль и хеш не возвращаются', me && !JSON.stringify(me).match(/passwordHash|scrypt\$|ExamplePassword/));
  check('фото сохранено', me && /\/api\/users\/\d+\/avatar\?v=/.test(me.avatar), me && me.avatar);
  check('регистрация возвращает токен, ответ не кешируется', !!token && r.headers.get('cache-control') === 'no-store');

  const userId = me.id;

  r = await req('GET', `/api/users/${userId}/avatar`);
  check('GET /api/users/{id}/avatar — квадратный jpeg', r.status === 200 &&
    r.headers.get('content-type') === 'image/jpeg', r.headers.get('content-type'));

  r = await req('POST', '/api/users', { body: { email, fullName: 'Тёзка', password: '1' } });
  check('повтор email → 409', r.status === 409, r.status);

  const concurrent = await Promise.all(Array.from({ length: 3 }, () =>
    req('POST', '/api/users', { body: { email: `race${email}`, fullName: 'Проверка', password: '1' } })));
  check('одновременная регистрация email создаёт один аккаунт',
    concurrent.filter(result => result.status === 201).length === 1 &&
    concurrent.filter(result => result.status === 409).length === 2);

  function basic(password, loginEmail = email) {
    return { Authorization: 'Basic ' + Buffer.from(loginEmail + ':' + password).toString('base64') };
  }
  r = await req('GET', '/api/users/login', { headers: basic('wrong') });
  check('неверный пароль → 401 без профиля', r.status === 401 && r.json.data === null);
  r = await req('GET', '/api/users/login', { headers: basic('ExamplePassword123!', 'missing@karapuz.tj') });
  check('неизвестный email → 401', r.status === 401);
  r = await req('GET', '/api/users/login');
  check('пустой вход → 401', r.status === 401);
  r = await req('GET', '/api/users/login', { headers: basic('ExamplePassword123!', email.toUpperCase()) });
  check('верный вход возвращает сохранённые имя и фото', r.status === 200 &&
    r.json.data.user.fullName === me.fullName && r.json.data.user.avatar === me.avatar && !!r.json.data.token);
  check('в ответе входа нет пароля и хеша', !/passwordHash|scrypt\$|ExamplePassword/.test(r.text));
  check('вход не кешируется', r.headers.get('cache-control') === 'no-store');
  r = await req('POST', `/api/users/${userId}`, { body: { fullName: 'Чужой' } });
  check('изменение профиля без входа → 401', r.status === 401);
  const other = await req('POST', '/api/users', { body: { fullName: 'Другой', email: `other${email}`, password: '1' } });
  r = await req('POST', `/api/users/${userId}`, { token: other.json.data.token, body: { fullName: 'Чужой' } });
  check('изменение чужого профиля → 403', r.status === 403);

  const bigMp = multipart({ fullName: 'Большой' },
    { name: 'avatar', filename: 'big.png', type: 'image/png', data: Buffer.concat([PNG_2x2, Buffer.alloc(11 * 1024 * 1024, 1)]) });
  r = await req('POST', '/api/users', { form: bigMp.body, headers: { 'Content-Type': bigMp.type } });
  check('файл больше 10 МБ → 413', r.status === 413, r.status);

  const evilMp = multipart({ fullName: 'Опасный' },
    { name: 'avatar', filename: 'shell.php', type: 'image/png', data: Buffer.from('<?php system($_GET[0]); ?>            ') });
  r = await req('POST', '/api/users', { form: evilMp.body, headers: { 'Content-Type': evilMp.type } });
  check('не картинка → 415', r.status === 415, r.status);

  // ---------- аккаунт: сохранение изменений ----------
  const save = multipart({
    fullName: 'Ма*****',
    tel: '+9929001*****',
    address: 'Москва, ул. Московская 25-45'
  });
  r = await req('POST', `/api/users/${userId}`, { token, form: save.body, headers: { 'Content-Type': save.type } });
  const after = r.json.data;
  check('POST /api/users/{id} — «Сохранить изменения»', r.status === 200 && after.address === 'Москва, ул. Московская 25-45');
  check('старые закрытые значения не затирают данные', after && after.tel === tel &&
    Array.isArray(after.unchanged) && after.unchanged.includes('tel'), after && after.unchanged);

  r = await req('POST', '/api/users', { token, body: { id: userId, tel: '+992918777666' } });
  check('id можно прислать и в теле запроса', r.status === 200 && r.json.data.tel === '+992918777666');

  const newPhoto = multipart({ id: String(userId) }, { name: 'avatar', filename: 'new.png', type: 'image/png', data: PNG_2x2 });
  r = await req('POST', '/api/users', { token, form: newPhoto.body, headers: { 'Content-Type': newPhoto.type } });
  check('фото меняется тем же запросом', r.status === 200 && /\/avatar\?v=/.test(r.json.data.avatar) && r.json.data.avatar !== me.avatar);
  r = await req('GET', '/api/users/login', { headers: basic('ExamplePassword123!') });
  check('новый вход получает изменения с сервера', r.json.data.user.tel === '+992918777666' && r.json.data.user.address === after.address);

  r = await req('POST', `/api/users/${userId}`, { token, body: { password: 'x'.repeat(129) } });
  check('слишком длинный новый пароль → 400', r.status === 400);
  r = await req('POST', `/api/users/${userId}`, { token, body: { password: ' Новый:пароль! ' } });
  check('владелец может изменить пароль', r.status === 200);
  r = await req('GET', '/api/users/login', { headers: basic('ExamplePassword123!') });
  check('старый пароль после изменения не работает', r.status === 401);
  r = await req('GET', '/api/users/login', { headers: basic(' Новый:пароль! ') });
  check('новый пароль сохраняет пробелы и Unicode', r.status === 200 && r.json.data.user.id === userId);

  r = await req('POST', '/api/users/999999', { body: { fullName: 'Никто' } });
  check('сохранение в несуществующий id → 404', r.status === 404);

  // ---------- убранные запросы ----------
  r = await req('GET', '/api/users');
  check('GET /api/users убран → 405 с подсказкой', r.status === 405 && r.json.errors[0].includes('POST /api/users'), r.json && r.json.errors);

  r = await req('POST', '/api/auth/register', { body: {} });
  check('старый /api/auth/register больше не существует', r.status === 404 || r.status === 405, r.status);

  // ---------- запись без токена ----------
  r = await req('POST', '/api/products', {
    body: { name: 'Тестовая коляска', price: 12000, oldPrice: 15000, categoryId: 3, subcategoryId: 31, userId }
  });
  check('POST /api/products без токена → 201', r.status === 201 && r.json.data.discount === 20, r.json && r.json.error);
  const productId = r.json.data.id;
  check('владелец записан', r.json.data.ownerId === userId, r.json.data && r.json.data.ownerId);

  r = await req('DELETE', `/api/products/${productId}?userId=${userId + 777}`);
  check('чужой не удалит запись → 403', r.status === 403 && r.json.error.code === 'FORBIDDEN', r.json && r.json.error);

  r = await req('PATCH', `/api/products/${productId}`, { body: { price: 9000, userId } });
  check('владелец меняет запись', r.status === 200 && r.json.data.price === 9000, r.json && r.json.error);

  r = await req('PUT', `/api/products/${productId}`, { body: { name: 'Заменённая коляска', price: 8000, userId } });
  check('PUT /api/products/{id}', r.status === 200 && r.json.data.name === 'Заменённая коляска');

  r = await req('PUT', `/api/products/${productId}`, { body: { price: 8000, userId } });
  check('PUT без name → 400', r.status === 400);

  r = await req('POST', '/api/products', { body: { name: 'Плохая цена', price: -5 } });
  check('отрицательная цена → 400', r.status === 400);

  r = await req('DELETE', `/api/products/${productId}?userId=${userId}`);
  check('владелец удаляет свою запись', r.status === 200, r.json && r.json.error);

  r = await req('POST', '/api/products', { body: { name: 'Ничья коляска', price: 5000 } });
  const orphanId = r.json.data.id;
  r = await req('DELETE', `/api/products/${orphanId}`);
  check('запись без владельца удаляет кто угодно', r.status === 200);

  // ---------- отзывы ----------
  r = await req('POST', '/api/products/1/reviews', {
    body: { author: 'Мария Петрова', rating: 5, comment: 'Отличная вещь', pros: 'Лёгкая' }
  });
  check('POST отзыва без входа → 201', r.status === 201 && r.json.data.author === 'Мария Петрова', r.json && r.json.error);
  const reviewId = r.json.data.id;

  r = await req('PATCH', `/api/reviews/${reviewId}`, { body: { rating: 4 } });
  check('PATCH /api/reviews/{id}', r.status === 200 && r.json.data.rating === 4);

  r = await req('PATCH', `/api/reviews/${reviewId}`, { body: { rating: 9 } });
  check('оценка 9 → 400', r.status === 400);

  r = await req('DELETE', `/api/reviews/${reviewId}`);
  check('DELETE /api/reviews/{id}', r.status === 200);

  // ---------- остальные разделы ----------
  r = await req('POST', '/api/categories', { body: { name: 'Тестовая категория', slug: 'test-cat-' + Date.now() } });
  check('POST /api/categories', r.status === 201);
  const catId = r.json.data.id;

  r = await req('PATCH', `/api/categories/${catId}`, { body: { description: 'Описание' } });
  check('PATCH /api/categories/{id}', r.status === 200 && r.json.data.description === 'Описание');

  r = await req('POST', '/api/subcategories', { body: { name: 'Тестовая подкатегория', categoryId: catId } });
  check('POST /api/subcategories', r.status === 201);
  const subId = r.json.data.id;

  r = await req('DELETE', `/api/subcategories/${subId}`);
  check('DELETE /api/subcategories/{id}', r.status === 200);

  r = await req('DELETE', `/api/categories/${catId}`);
  check('DELETE /api/categories/{id}', r.status === 200);

  r = await req('POST', '/api/blog', { body: { title: 'Тестовая статья', content: 'Первый абзац.\n\nВторой абзац.' } });
  check('POST /api/blog', r.status === 201 && r.json.data.sections.length === 2);
  const postId = r.json.data.id;

  r = await req('PATCH', `/api/blog/${postId}`, { body: { title: 'Новый заголовок' } });
  check('PATCH /api/blog/{id}', r.status === 200 && r.json.data.title === 'Новый заголовок');

  r = await req('DELETE', `/api/blog/${postId}`);
  check('DELETE /api/blog/{id}', r.status === 200);

  r = await req('POST', '/api/promotions', { body: { title: 'Тестовая акция', categoryId: 1 } });
  check('POST /api/promotions', r.status === 201);
  const promoId = r.json.data.id;

  r = await req('PATCH', `/api/promotions/${promoId}`, { body: { discount: 40 } });
  check('PATCH /api/promotions/{id}', r.status === 200 && r.json.data.discount === 40);

  r = await req('DELETE', `/api/promotions/${promoId}`);
  check('DELETE /api/promotions/{id}', r.status === 200);

  // ---------- удаление аккаунта ----------
  r = await req('DELETE', `/api/users/${userId}`, { token });
  check('DELETE /api/users/{id}', r.status === 200);

  r = await req('DELETE', `/api/users/${userId}`, { token });
  check('токен удалённого аккаунта не действует → 401', r.status === 401);

  // ---------- спецификация и страницы ----------
  r = await req('GET', '/api/swagger.json');
  const spec = r.json;
  check('GET /api/swagger.json', r.status === 200 && spec.openapi && !spec.data);
  const userPaths = Object.keys(spec.paths).filter(p => p.includes('users'));
  check('в разделе аккаунта POST и GET входа',
    userPaths.length === 2 && !!spec.paths['/api/users'].post && !!spec.paths['/api/users/login'].get &&
    !spec.paths['/api/users'].get && !spec.paths['/api/auth/register'], userPaths);
  check('форма аккаунта одна — multipart/form-data',
    Object.keys(spec.paths['/api/users'].post.requestBody.content).join() === 'multipart/form-data',
    Object.keys(spec.paths['/api/users'].post.requestBody.content));
  check('каталог перечислен поимённо',
    !!spec.paths['/api/detskaya-mebel'] && !!spec.paths['/api/detskaya-mebel/krovatki'] &&
    !spec.paths['/api/{category}'] && !spec.paths['/api/{category}/{subcategory}'] &&
    spec.paths['/api/detskaya-mebel/krovatki'].get.summary.includes('Кроватки'),
    Object.keys(spec.paths).length);
  check('у категорий в спецификации только чтение',
    Object.keys(spec.paths['/api/categories']).join() === 'get' &&
    Object.keys(spec.paths['/api/categories/{id}']).join() === 'get',
    Object.keys(spec.paths['/api/categories/{id}']));
  check('вход описан через Basic, без password в URL', !!spec.components.securitySchemes.basicAuth &&
    !spec.paths['/api/users/login'].get.parameters);

  r = await req('GET', '/');
  check('/ — страница Swagger UI', r.status === 200 && r.text.includes('swagger-ui-bundle.js'));

  r = await req('GET', '/docs');
  check('/docs — страница каталога', r.status === 200 && r.text.includes('Карапуз API'));

  r = await req('GET', '/assets/swagger/swagger-ui.css');
  check('файлы Swagger UI лежат в репозитории', r.status === 200 && r.text.includes('swagger-ui'));

  console.log(results.join('\n'));
  console.log(`\nПройдено: ${passed}, провалено: ${failed}`);
  stopServer();
  process.exit(failed ? 1 : 0);
})().catch(err => {
  console.error('Проверка прервалась:', err && err.message ? err.message : err);
  stopServer();
  process.exit(2);
});
