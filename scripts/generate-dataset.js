#!/usr/bin/env node
// ============================================================
// Генератор датасета магазина «Карапуз».
// Читает lib/tree.js + lib/catalog.js и собирает lib/dataset.json:
// 8 категорий, 37 подкатегорий, 730 товаров, 8 акций, 12 статей блога.
// Генерация детерминированная (сид фиксирован) — повторный запуск
// даёт побайтово тот же файл.
//   node scripts/generate-dataset.js
// ============================================================
const fs = require('fs');
const path = require('path');

// список готовых фотографий — читаем один раз
const PHOTO_DIR = path.join(__dirname, '..', 'assets', 'products');
const PHOTOS = (() => {
  try { return new Set(fs.readdirSync(PHOTO_DIR).filter(f => f.endsWith('.jpg')).map(f => f.slice(0, -4))); }
  catch { return new Set(); }
})();
const hasPhoto = (slug) => PHOTOS.has(slug);
const { categories: tree } = require('../lib/tree');
const { BRAND_COUNTRY, AUTHORS, PROS, CONS, COMMENTS } = require('../lib/catalog');
const { CATEGORY_INFO, PROMO, SUBCATEGORY_INFO } = require('../lib/copy');

// --- детерминированный ГПСЧ (mulberry32) ---
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20260831);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const pickN = (arr, n) => {
  const copy = [...arr];
  const take = Math.min(n, copy.length);
  const out = [];
  while (out.length < take) out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  return out;
};
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));

// --- транслитерация для slug ---
const TRANSLIT = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',
  н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',
  ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'
};
function slugify(str) {
  return str.toLowerCase().split('').map(ch => TRANSLIT[ch] !== undefined ? TRANSLIT[ch] : ch)
    .join('').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

// --- цена: округляем «по-магазинному» ---
function priceIn([min, max]) {
  const v = min + rand() * (max - min);
  if (v < 1000) return Math.round(v / 10) * 10;
  if (v < 10000) return Math.round(v / 50) * 50;
  return Math.round(v / 100) * 100;
}

// --- отзывы ---
function makeReviews(count) {
  const authors = pickN(AUTHORS, count);
  return authors.map((author, i) => ({
    id: i + 1,
    author,
    date: `20${int(19, 25)}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`,
    rating: rand() < 0.62 ? 5 : (rand() < 0.75 ? 4 : 3),
    pros: pick(PROS),
    cons: pick(CONS),
    comment: pick(COMMENTS)
  })).sort((a, b) => a.date.localeCompare(b.date)).map((r, i) => ({ ...r, id: i + 1 }));
}

// --- сборка ---
const products = [];
const outCategories = [];
let pid = 1;

for (const cat of tree) {
  const subcategories = [];

  for (const sub of cat.subcategories) {
    const total = sub.count || 20;

    // уникальные пары бренд+линейка
    const combos = [];
    for (const brand of sub.brands) for (const line of sub.lines) combos.push({ brand, line });
    const chosen = pickN(combos, total);

    for (const { brand, line } of chosen) {
      const country = BRAND_COUNTRY[brand] || 'Россия';
      const name = `${sub.type} ${brand} ${line}, ${country}`;
      const isAkcii = cat.id === 1;
      const isPromo = isAkcii ? true : rand() < 0.32;
      const price = priceIn(sub.price);
      const discount = isPromo ? int(10, 35) : 0;
      const oldPrice = isPromo ? Math.round((price / (1 - discount / 100)) / 10) * 10 : null;

      // Если для товара есть студийная фотография в assets/products — берём её:
      // это статический файл, его отдаёт CDN, без вызова функции. Для товаров
      // без фотографии остаётся рисованная карточка /api/images/{slug}.svg,
      // поэтому пустых картинок в каталоге не бывает.
      const slug = `${slugify(`${sub.type}-${brand}-${line}`)}-${pid}`;
      const photo = hasPhoto(slug) ? `/assets/products/${slug}.jpg` : null;
      const image = photo || `/api/images/${slug}.svg`;
      const images = photo ? [photo] : [image, `/api/images/${slug}.svg?variant=2`];

      const characteristics = {};
      for (const [key, values] of Object.entries(sub.chars)) characteristics[key] = pick(values);
      characteristics['Бренд'] = brand;
      characteristics['Страна производства'] = country;

      const feats = pickN(sub.features, 3);
      const description = `${sub.type} ${brand} ${line} — ${feats[0].charAt(0).toLowerCase()}${feats[0].slice(1)}. ${feats[1]}. ${feats[2]}.`;

      const reviews = makeReviews(rand() < 0.18 ? 0 : int(1, 4));
      const rating = reviews.length
        ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
        : 0;

      products.push({
        id: pid,
        name,
        slug,
        price,
        oldPrice,
        discount,
        categoryId: cat.id,
        categoryName: cat.name,
        categorySlug: cat.slug,
        subcategoryId: sub.id,
        subcategoryName: sub.name,
        subcategorySlug: sub.slug,
        article: `Арт. ${String(100000 + pid * 7).slice(0, 6)}-${String(pid).padStart(4, '0')}`,
        brand,
        country,
        image,
        images,
        description,
        characteristics,
        colorOptions: pickN(sub.colors, Math.min(sub.colors.length, int(2, 4))),
        materials: pickN(sub.materials, Math.min(sub.materials.length, int(1, 3))),
        ageGroup: sub.age,
        rating,
        reviewCount: reviews.length,
        inStock: rand() < 0.92,
        isNew: rand() < 0.22,
        isPromo,
        reviews
      });
      pid++;
    }

    subcategories.push({
      id: sub.id,
      name: sub.name,
      slug: sub.slug,
      image: `/api/images/sub-${sub.slug}.svg`,
      description: SUBCATEGORY_INFO[sub.id] || '',
      categoryId: cat.id,
      productCount: total
    });
  }

  outCategories.push({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description,
    image: `/api/images/cat-${cat.slug}.svg`,
    productCount: products.filter(p => p.categoryId === cat.id).length,
    info: CATEGORY_INFO[cat.id],
    subcategories
  });
}

// ============================================================
// АКЦИИ — по одной на каждую категорию. Заголовок, описание, сроки
// и полный текст берутся из lib/copy.js: у каждой категории свой.
// ============================================================
const promotions = outCategories.map((cat, i) => {
  const meta = PROMO[cat.id];
  const promoProducts = products.filter(p => p.categoryId === cat.id && p.isPromo);
  const list = promoProducts.slice(0, 12);
  const maxDiscount = list.length ? Math.max(...list.map(p => p.discount)) : 15;

  return {
    id: i + 1,
    slug: meta.slug,
    title: meta.title,
    description: meta.description,
    content: meta.content,
    image: `/api/images/cat-${cat.slug}.svg?variant=2`,
    discount: maxDiscount,
    categoryId: cat.id,
    categoryName: cat.name,
    dateStart: meta.dateStart,
    dateEnd: meta.dateEnd,
    date: meta.dateStart,
    isActive: true,
    productCount: list.length,
    products: list.map(p => p.id)
  };
});

// ============================================================
// БЛОГ
// ============================================================
const blog = require('../lib/blog-posts.json');

const dataset = { categories: outCategories, products, promotions, blog };
const outPath = path.join(__dirname, '..', 'lib', 'dataset.json');
fs.writeFileSync(outPath, JSON.stringify(dataset, null, 1) + '\n', 'utf8');

const bySub = {};
products.forEach(p => { bySub[p.subcategoryId] = (bySub[p.subcategoryId] || 0) + 1; });
console.log(`  с настоящей фотографией: ${products.filter(p => p.image.indexOf('/assets/') === 0).length}, с рисованной карточкой: ${products.filter(p => p.image.indexOf('/api/') === 0).length}`);
console.log(`✔ lib/dataset.json — ${outCategories.length} категорий, ` +
  `${outCategories.reduce((s, c) => s + c.subcategories.length, 0)} подкатегорий, ` +
  `${products.length} товаров, ${promotions.length} акций, ${blog.length} статей блога`);
console.log('  товаров в подкатегориях:', [...new Set(Object.values(bySub))].sort((a, b) => a - b).join(', '));
