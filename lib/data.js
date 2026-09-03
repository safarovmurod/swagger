// ============================================================
// КАРАПУЗ — Интернет-магазин товаров для детей
// Источник данных для всех эндпоинтов.
//
// Сами данные лежат в lib/dataset.json и генерируются командой
//   node scripts/generate-dataset.js
// из описания каталога (lib/tree.js + lib/catalog.js).
//
// Массивы экспортируются по ссылке, поэтому POST/PUT/DELETE
// изменяют данные в рамках жизни инстанса функции.
// ============================================================
const dataset = require('./dataset.json');

const categories = dataset.categories;
const products = dataset.products;
const promotions = dataset.promotions;
const blog = dataset.blog;

// Плоский список подкатегорий — для /api/subcategories
const subcategories = categories.flatMap(c =>
  c.subcategories.map(s => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    categoryId: c.id,
    categoryName: c.name,
    categorySlug: c.slug
  }))
);

module.exports = { categories, products, blog, promotions, subcategories };
