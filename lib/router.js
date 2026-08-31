// ============================================================
// Единый роутер API.
//
// На бесплатном тарифе Vercel деплой ограничен 12 serverless-функциями,
// поэтому все эндпоинты обслуживает один обработчик: он сам разбирает путь
// и вызывает нужный модуль из lib/handlers. Тот же роутер использует
// локальный сервер (scripts/dev-server.js) — маршрутизация одна на всех.
//
// Порядок важен: служебные пути (/api/products, /api/blog, …) проверяются
// до читаемых адресов каталога (/api/avtokresla/gruppa-1).
// ============================================================
const H = {
  swagger: require('./handlers/swagger'),
  categoriesList: require('./handlers/categories/list'),
  categoriesItem: require('./handlers/categories/item'),
  subcategoriesList: require('./handlers/subcategories/list'),
  subcategoriesItem: require('./handlers/subcategories/item'),
  productsList: require('./handlers/products/list'),
  productsItem: require('./handlers/products/item'),
  productsReviews: require('./handlers/products/reviews'),
  promotionsList: require('./handlers/promotions/list'),
  promotionsItem: require('./handlers/promotions/item'),
  blogList: require('./handlers/blog/list'),
  blogItem: require('./handlers/blog/item'),
  catalogCategory: require('./handlers/catalog/category'),
  catalogSubcategory: require('./handlers/catalog/subcategory')
};

// Разделы со своими собственными путями — читаемые адреса каталога
// не должны их перехватывать.
const RESERVED = {
  categories: { list: H.categoriesList, item: H.categoriesItem },
  subcategories: { list: H.subcategoriesList, item: H.subcategoriesItem },
  products: { list: H.productsList, item: H.productsItem },
  promotions: { list: H.promotionsList, item: H.promotionsItem },
  blog: { list: H.blogList, item: H.blogItem }
};

// Разбирает путь и возвращает { handler, params } либо null
function resolve(segments) {
  const s = segments.filter(Boolean);

  if (s.length === 1 && (s[0] === 'swagger.json' || s[0] === 'swagger')) {
    return { handler: H.swagger, params: {} };
  }

  if (s.length === 1 && RESERVED[s[0]]) {
    return { handler: RESERVED[s[0]].list, params: {} };
  }

  if (s.length === 2 && RESERVED[s[0]]) {
    return { handler: RESERVED[s[0]].item, params: { id: s[1] } };
  }

  if (s.length === 3 && s[0] === 'products' && s[2] === 'reviews') {
    return { handler: H.productsReviews, params: { id: s[1] } };
  }

  // читаемые адреса каталога: /api/avtokresla, /api/avtokresla/gruppa-1
  if (s.length === 1) {
    return { handler: H.catalogCategory, params: { category: s[0] } };
  }
  if (s.length === 2) {
    return { handler: H.catalogSubcategory, params: { category: s[0], subcategory: s[1] } };
  }

  return null;
}

// Список путей для проверки покрытия (scripts/check.js)
const KNOWN_PATHS = [
  '/api/swagger.json',
  '/api/categories', '/api/categories/{id}',
  '/api/subcategories', '/api/subcategories/{id}',
  '/api/products', '/api/products/{id}', '/api/products/{id}/reviews',
  '/api/promotions', '/api/promotions/{id}',
  '/api/blog', '/api/blog/{id}',
  '/api/{category}', '/api/{category}/{subcategory}'
];

module.exports = { resolve, KNOWN_PATHS };
