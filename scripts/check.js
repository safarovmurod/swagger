#!/usr/bin/env node
// ============================================================
// Проверка целостности каталога и спецификации.
//   node scripts/check.js
// Возвращает код 1, если найдена хотя бы одна ошибка.
// ============================================================
const { categories, products, promotions, blog, subcategories } = require('../lib/data');

const errors = [];
const warns = [];
const fail = (m) => errors.push(m);
const warn = (m) => warns.push(m);

// --- категории и подкатегории ---
const catIds = new Set();
categories.forEach(c => {
  if (catIds.has(c.id)) fail(`Дублирующийся id категории: ${c.id}`);
  catIds.add(c.id);
  ['name', 'slug', 'description', 'image'].forEach(f => {
    if (!c[f]) fail(`Категория ${c.id}: пустое поле ${f}`);
  });
  if (!c.subcategories.length) fail(`Категория ${c.id} «${c.name}» без подкатегорий`);
});

const subIds = new Set();
subcategories.forEach(s => {
  if (subIds.has(s.id)) fail(`Дублирующийся id подкатегории: ${s.id}`);
  subIds.add(s.id);
  if (!s.name || !s.slug) fail(`Подкатегория ${s.id}: пустое имя или slug`);
});

// --- товары ---
const ids = new Set(), slugs = new Set();
products.forEach(p => {
  if (ids.has(p.id)) fail(`Дублирующийся id товара: ${p.id}`);
  ids.add(p.id);
  if (slugs.has(p.slug)) fail(`Дублирующийся slug товара: ${p.slug}`);
  slugs.add(p.slug);

  ['name', 'image', 'description', 'brand', 'country', 'article', 'ageGroup'].forEach(f => {
    if (!p[f]) fail(`Товар ${p.id}: пустое поле ${f}`);
  });
  if (!(p.price > 0)) fail(`Товар ${p.id}: некорректная цена ${p.price}`);
  if (p.isPromo && !(p.oldPrice > p.price)) fail(`Товар ${p.id}: акция без корректной старой цены`);
  if (!p.isPromo && p.oldPrice) warn(`Товар ${p.id}: старая цена без флага акции`);
  if (!catIds.has(p.categoryId)) fail(`Товар ${p.id}: неизвестная категория ${p.categoryId}`);
  if (!subIds.has(p.subcategoryId)) fail(`Товар ${p.id}: неизвестная подкатегория ${p.subcategoryId}`);
  if (!p.images || p.images.length < 1) fail(`Товар ${p.id}: пустой массив images`);
  if (Object.keys(p.characteristics || {}).length < 3) fail(`Товар ${p.id}: меньше трёх характеристик`);
  if (!p.colorOptions.length) fail(`Товар ${p.id}: не указаны цвета`);
  if (!p.materials.length) fail(`Товар ${p.id}: не указаны материалы`);
  if (p.description.includes('undefined')) fail(`Товар ${p.id}: «undefined» в описании`);

  const avg = p.reviews.length
    ? Math.round((p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length) * 10) / 10 : 0;
  if (p.rating !== avg) fail(`Товар ${p.id}: рейтинг ${p.rating} не совпадает со средним по отзывам ${avg}`);
  if (p.reviewCount !== p.reviews.length) fail(`Товар ${p.id}: reviewCount не совпадает с числом отзывов`);
  p.reviews.forEach(r => {
    if (!r.author || !r.comment) fail(`Товар ${p.id}: отзыв ${r.id} без автора или текста`);
    if (r.rating < 1 || r.rating > 5) fail(`Товар ${p.id}: отзыв ${r.id} с рейтингом ${r.rating}`);
  });
});

// --- по 20 товаров в каждой подкатегории ---
subcategories.forEach(s => {
  const n = products.filter(p => p.subcategoryId === s.id).length;
  if (n !== 20) fail(`Подкатегория ${s.id} «${s.name}»: ${n} товаров вместо 20`);
});

// --- slug категории не должен перекрывать служебные пути /api/... ---
const RESERVED = ['products', 'categories', 'subcategories', 'promotions', 'blog', 'swagger.json', 'swagger'];
const seenSlugs = new Set();
categories.forEach(c => {
  if (RESERVED.includes(c.slug)) fail(`Категория ${c.id} «${c.name}»: slug «${c.slug}» перекрывает служебный путь /api/${c.slug}`);
  if (seenSlugs.has(c.slug)) fail(`Дублирующийся slug категории: ${c.slug}`);
  seenSlugs.add(c.slug);
  const subSlugs = new Set();
  c.subcategories.forEach(sc => {
    if (subSlugs.has(sc.slug)) fail(`Категория «${c.name}»: дублирующийся slug подкатегории ${sc.slug}`);
    subSlugs.add(sc.slug);
  });
});

// --- акции: по одной на категорию ---
categories.forEach(c => {
  const n = promotions.filter(p => p.categoryId === c.id).length;
  if (n !== 1) fail(`Категория ${c.id} «${c.name}»: акций ${n}, ожидается 1`);
});
promotions.forEach(pr => {
  ['title', 'description', 'content', 'image', 'slug'].forEach(f => {
    if (!pr[f]) fail(`Акция ${pr.id}: пустое поле ${f}`);
  });
  if (pr.content.length < 200) fail(`Акция ${pr.id}: слишком короткий текст`);
  if (!pr.products.length) fail(`Акция ${pr.id}: нет товаров`);
  pr.products.forEach(id => {
    const p = products.find(x => x.id === id);
    if (!p) fail(`Акция ${pr.id}: ссылка на несуществующий товар ${id}`);
    else if (p.categoryId !== pr.categoryId) fail(`Акция ${pr.id} («${pr.categoryName}») ссылается на товар ${id} из категории «${p.categoryName}»`);
    else if (!p.isPromo) fail(`Акция ${pr.id}: товар ${id} без флага акции`);
  });
});

// --- тексты не должны повторяться от категории к категории ---
function uniq(label, values) {
  const seen = new Map();
  values.forEach(function (v) {
    const key = String(v.text || '').trim();
    if (!key) return;
    if (seen.has(key)) fail(`${label}: одинаковый текст у «${seen.get(key)}» и «${v.owner}»`);
    else seen.set(key, v.owner);
  });
}
uniq('Текст акции', promotions.map(p => ({ text: p.content, owner: p.categoryName })));
uniq('Описание акции', promotions.map(p => ({ text: p.description, owner: p.categoryName })));
uniq('Заголовок акции', promotions.map(p => ({ text: p.title, owner: p.categoryName })));
uniq('Описание категории', categories.map(c => ({ text: c.description, owner: c.name })));
uniq('Справка категории', categories.map(c => ({ text: c.info && c.info.note, owner: c.name })));
uniq('Условия доставки', categories.map(c => ({ text: c.info && c.info.delivery, owner: c.name })));
uniq('Описание подкатегории', categories.flatMap(c => c.subcategories.map(sc => ({ text: sc.description, owner: c.name + ' / ' + sc.name }))));

categories.forEach(c => {
  if (!c.info) fail(`Категория ${c.id} «${c.name}»: нет блока info`);
  else ['note', 'howToChoose', 'delivery', 'warranty', 'payment'].forEach(f => {
    if (!c.info[f]) fail(`Категория ${c.id} «${c.name}»: пустое info.${f}`);
  });
  c.subcategories.forEach(sc => {
    if (!sc.description) fail(`Подкатегория ${sc.id} «${sc.name}»: нет описания`);
    else if (sc.description.length < 60) fail(`Подкатегория ${sc.id} «${sc.name}»: слишком короткое описание`);
  });
});

// --- блог ---
const blogSlugs = new Set();
blog.forEach(b => {
  ['title', 'slug', 'excerpt', 'content', 'image', 'date'].forEach(f => {
    if (!b[f]) fail(`Статья ${b.id}: пустое поле ${f}`);
  });
  if (blogSlugs.has(b.slug)) fail(`Дублирующийся slug статьи: ${b.slug}`);
  blogSlugs.add(b.slug);
  if (b.content.length < 600) fail(`Статья ${b.id} «${b.title}»: текст всего ${b.content.length} символов — это заготовка, а не статья`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date)) fail(`Статья ${b.id}: дата «${b.date}» не в формате ГГГГ-ММ-ДД`);
  if (!(b.readingTime > 0)) fail(`Статья ${b.id}: не указано время чтения`);
  if (b.categoryId && !catIds.has(b.categoryId)) fail(`Статья ${b.id}: неизвестная категория ${b.categoryId}`);
});
uniq('Текст статьи', blog.map(b => ({ text: b.content, owner: b.title })));
uniq('Анонс статьи', blog.map(b => ({ text: b.excerpt, owner: b.title })));

// --- спецификация: каждый путь должен разбираться роутером ---
const { resolve, KNOWN_PATHS } = require('../lib/router');
const specPaths = [];
const collector = {
  setHeader() {}, end(json) { const spec = JSON.parse(json); specPaths.push(...Object.keys(spec.paths)); }
};
require('../lib/handlers/swagger.js')({ headers: { host: 'localhost:3000' } }, collector);

specPaths.forEach(sp => {
  const segments = sp.replace(/^\/api\/?/, '').split('/').filter(Boolean)
    .map(seg => seg.replace(/^\{.+\}$/, '1'));
  if (!resolve(segments)) fail(`Путь ${sp} из спецификации не разбирается роутером`);
});
KNOWN_PATHS.forEach(kp => {
  if (kp === '/api/swagger.json') return;
  if (!specPaths.includes(kp)) warn(`Маршрут ${kp} есть в роутере, но не описан в спецификации`);
});

// --- на бесплатном тарифе Vercel не больше 12 serverless-функций ---
const apiDir = require('path').join(__dirname, '..', 'api');
const fnCount = require('fs').readdirSync(apiDir)
  .filter(f => f.endsWith('.js') && !f.startsWith('_')).length;
if (fnCount > 12) fail(`serverless-функций ${fnCount} — на бесплатном тарифе Vercel деплой упадёт (лимит 12)`);

// --- итог ---
const subCount = subcategories.length;
console.log(`Категорий: ${categories.length}  подкатегорий: ${subCount}  товаров: ${products.length}  акций: ${promotions.length}  статей: ${blog.length}`);
console.log(`Путей в спецификации: ${specPaths.length}  serverless-функций: ${fnCount} из 12`);
warns.forEach(w => console.log('⚠  ' + w));
if (errors.length) {
  console.log(`\n✘ Найдено ошибок: ${errors.length}`);
  errors.slice(0, 40).forEach(e => console.log('  - ' + e));
  process.exit(1);
}
console.log('\n✔ Проверка пройдена, ошибок нет');
