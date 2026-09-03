// ============================================================
// Единый роутер API.
//
// На бесплатном тарифе Vercel деплой ограничен 12 serverless-функциями,
// поэтому все эндпоинты обслуживает один обработчик: он сам разбирает путь
// и вызывает нужный модуль из lib/handlers. Тот же роутер использует
// локальный сервер (scripts/dev-server.js) — маршрутизация одна на всех.
//
// Порядок важен: служебные пути (/api/products, /api/auth, …) проверяются
// до читаемых адресов каталога (/api/avtokresla/gruppa-1).
// ============================================================
const H = {
  swagger: require('./handlers/swagger'),
  images: require('./handlers/images'),
  users: require('./handlers/users'),
  reviews: require('./handlers/reviews'),
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
  blog: { list: H.blogList, item: H.blogItem },
  users: { list: H.users, item: H.users },
  reviews: { list: H.reviews, item: H.reviews }
};

// Разбирает путь и возвращает { handler, params } либо null
function resolve(segments) {
  const s = segments.filter(Boolean);

  if (s.length === 1 && (s[0] === 'swagger.json' || s[0] === 'swagger')) {
    return { handler: H.swagger, params: {} };
  }

  if (s.length === 2 && s[0] === 'images') {
    return { handler: H.images, params: { slug: s[1] } };
  }

  if (s.length === 2 && s[0] === 'users' && s[1] === 'login') {
    return { handler: H.users, params: { sub: 'login' } };
  }

  // /api/users/{id}/avatar — сам файл картинки
  if (s.length === 3 && s[0] === 'users' && s[2] === 'avatar') {
    return { handler: H.users, params: { id: s[1], sub: 'avatar' } };
  }

  // короткие адреса поиска и фильтра — те же правила, что у /api/products,
  // поэтому проверяем их до разбора /api/products/{id}
  if (s.length === 2 && s[0] === 'products' && (s[1] === 'search' || s[1] === 'filter')) {
    return { handler: H.productsList, params: {} };
  }
  if (s.length === 3 && s[0] === 'products' && s[1] === 'slug') {
    return { handler: H.productsItem, params: { id: s[2], by: 'slug' } };
  }
  if (s.length === 3 && s[0] === 'blog' && s[1] === 'slug') {
    return { handler: H.blogItem, params: { id: s[2], by: 'slug' } };
  }
  if (s.length === 3 && s[0] === 'categories' && s[2] === 'products') {
    return { handler: H.categoriesItem, params: { id: s[1], sub: 'products' } };
  }
  if (s.length === 3 && s[0] === 'products' && s[2] === 'reviews') {
    return { handler: H.productsReviews, params: { id: s[1] } };
  }

  if (s.length === 1 && RESERVED[s[0]]) {
    return { handler: RESERVED[s[0]].list, params: {} };
  }

  if (s.length === 2 && RESERVED[s[0]]) {
    return { handler: RESERVED[s[0]].item, params: { id: s[1] } };
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
  '/api/images/{slug}.svg',
  '/api/users', '/api/users/login', '/api/users/{id}', '/api/users/{id}/avatar',
  '/api/categories', '/api/categories/{id}', '/api/categories/{id}/products',
  '/api/subcategories', '/api/subcategories/{id}',
  '/api/products', '/api/products/search', '/api/products/filter',
  '/api/products/{id}', '/api/products/slug/{slug}', '/api/products/{id}/reviews',
  '/api/reviews', '/api/reviews/{id}',
  '/api/promotions', '/api/promotions/{id}',
  '/api/blog', '/api/blog/{id}', '/api/blog/slug/{slug}',
  '/api/{category}', '/api/{category}/{subcategory}'
];

// Разделы, чьи адреса нельзя занимать slug'ом категории
const RESERVED_SLUGS = Object.keys(RESERVED).concat(['images', 'swagger', 'swagger.json']);

module.exports = { resolve, KNOWN_PATHS, RESERVED_SLUGS };
