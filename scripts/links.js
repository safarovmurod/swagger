#!/usr/bin/env node
// ============================================================
// Собирает LINKS.md — готовые ссылки на все GET-запросы API.
//   node scripts/links.js            адрес прода
//   BASE_URL=http://localhost:3000 node scripts/links.js
//
// Список строится по самой спецификации и по каталогу, а не пишется руками:
// добавили категорию → перегенерировали, и ссылка появилась сама.
// ============================================================
const fs = require('fs');
const path = require('path');
const { categories, products, blog, promotions } = require('../lib/data');

const BASE = (process.env.BASE_URL || 'https://swagger-wheat.vercel.app').replace(/\/+$/, '');

// спецификацию берём у того же обработчика, что отдаёт /api/swagger.json
let spec = null;
require('../lib/handlers/swagger.js')(
  { headers: { host: 'localhost:3000' } },
  { setHeader() {}, end(json) { spec = JSON.parse(json); } }
);

// примеры для путей со скобками — только настоящие id и slug из каталога
const sample = products.find(p => p.reviews && p.reviews.length) || products[0];
const SAMPLES = {
  '/api/categories/{id}': { id: 'kolyaski' },
  '/api/categories/{id}/products': { id: 'kolyaski' },
  '/api/subcategories/{id}': { id: 'krovatki' },
  '/api/products/{id}': { id: sample.id },
  '/api/products/slug/{slug}': { slug: sample.slug },
  '/api/products/{id}/reviews': { id: sample.id },
  '/api/reviews/{id}': { id: sample.reviews[0].id },
  '/api/promotions/{id}': { id: promotions[0].slug },
  '/api/blog/{id}': { id: blog[0].id },
  '/api/blog/slug/{slug}': { slug: blog[0].slug },
  '/api/images/{slug}.svg': { slug: 'cat-' + categories[0].slug }
};

// имя параметра — хоть он описан на месте, хоть ссылкой на components
const nameOf = (p) => (p.$ref ? p.$ref.split('/').pop() : p.name);

// У поиска и фильтра пустая ссылка вернула бы весь каталог — подставляем пример.
// Слово латиницей намеренно: русское в ссылке пришлось бы кодировать в %D0%BA…,
// и строку стало бы не прочитать (в самом запросе кириллица работает).
const EXTRA = {
  '/api/products/search': 'search=Feretti',
  '/api/products/filter': 'onlyPromo=true&priceMax=20000&sortBy=price&sortDir=asc'
};

function linkFor(specPath, op) {
  const values = SAMPLES[specPath] || {};
  let url = specPath.replace(/\{(\w+)\}/g, (m, key) => {
    if (values[key] === undefined) throw new Error(`нет примера для ${specPath} ({${key}})`);
    return values[key];
  });
  const names = (op.parameters || []).map(nameOf);
  const query = [];
  if (EXTRA[specPath]) query.push(EXTRA[specPath]);
  if (names.includes('page') && names.includes('pageSize')) query.push('page=1&pageSize=20');
  if (query.length) url += '?' + query.join('&');
  return BASE + url;
}

// заголовок раздела для тега
const lines = [];
const push = (url, title) => lines.push('`' + url + '`  ', title, '');

lines.push('# Готовые ссылки — все GET-запросы', '',
  `Адрес сервера: \`${BASE}\`. Локально замените его на \`http://localhost:3000\`.`, '',
  'Под каждой ссылкой написано, что она возвращает. `page` и `pageSize` можно',
  'менять или убирать совсем — по умолчанию всё равно первая страница по 20 записей.',
  'Файл собирается командой `npm run links`, руками его править бессмысленно.', '');

// ---------- каталог: по категориям ----------
lines.push('## Каталог', '',
  'Главное, ради чего API писался: у каждой категории и подкатегории свой адрес.',
  'В ответе — сами товары в `data`, описание раздела рядом.', '');

categories.forEach(c => {
  lines.push(`### ${c.name}`, '');
  const catPath = `/api/${c.slug}`;
  push(linkFor(catPath, spec.paths[catPath].get), `${c.name} — вся категория, ${c.productCount} товаров`);
  c.subcategories.forEach(sc => {
    const p = `/api/${c.slug}/${sc.slug}`;
    push(linkFor(p, spec.paths[p].get), `${c.name} → ${sc.name}`);
  });
});

// ---------- остальные разделы, в порядке тегов спецификации ----------
const catalogPaths = new Set();
categories.forEach(c => {
  catalogPaths.add(`/api/${c.slug}`);
  c.subcategories.forEach(sc => catalogPaths.add(`/api/${c.slug}/${sc.slug}`));
});

const TITLES = {
  'Категории': 'Категории',
  'Подкатегории': 'Подкатегории',
  'Товары': 'Товары',
  'Отзывы': 'Отзывы',
  'Акции': 'Акции',
  'Блог': 'Блог',
  'Картинки': 'Картинки'
};

let count = catalogPaths.size;
spec.tags.forEach(tag => {
  if (!TITLES[tag.name]) return;
  const rows = [];
  Object.entries(spec.paths).forEach(([p, ops]) => {
    if (catalogPaths.has(p) || !ops.get || ops.get.tags[0] !== tag.name) return;
    rows.push([linkFor(p, ops.get), ops.get.summary]);
  });
  if (!rows.length) return;
  lines.push(`## ${TITLES[tag.name]}`, '', tag.description + '.', '');
  rows.forEach(([url, title]) => { push(url, title); count++; });
});

// ---------- фотография аккаунта ----------
lines.push('## Аккаунт', '',
  'Аккаунт создаётся одним `POST /api/users` — это не ссылка, её так не откроешь.',
  'А вот загруженная фотография отдаётся обычным GET, её и вставляют в `<img src>`',
  '(вместо `1` — тот `id`, что пришёл в ответе на регистрацию).', '');
push(`${BASE}/api/users/1/avatar`, 'Фотография пользователя 1 — квадрат 512×512 JPEG');
count++;

lines.push('---', '',
  `Всего ссылок: ${count}. Полное описание каждой — на странице \`${BASE}/\`.`, '');

fs.writeFileSync(path.join(__dirname, '..', 'LINKS.md'), lines.join('\n'));
console.log(`LINKS.md готов: ссылок ${count}, адрес ${BASE}`);
