// ============================================================
// OpenAPI 3.0 спецификация «Карапуз API».
// Двуязычная: русский — в стандартных полях, английский — в x-en.
// Кастомный UI (index.html) читает оба варианта и переключает язык.
// ============================================================
const { categories, products, blog, promotions } = require('../data');

// query-параметр: q(имя, тип, RU, EN, доп.поля схемы)
const q = (name, type, ru, en, schema = {}) => ({
  name, in: 'query', description: ru, 'x-en': { description: en },
  schema: { type, ...schema }
});
// path-параметр
const pathParam = (name, ru, en, type = 'string') => ({
  name, in: 'path', required: true, description: ru, 'x-en': { description: en },
  schema: { type }
});
// У всех ответов один конверт: { data: ... }. Схемы, имя которых кончается
// на Page, уже содержат data вместе с полями пагинации — их не оборачиваем.
const envelope = (ref) => {
  if (!ref) return { $ref: '#/components/schemas/Ok' };
  if (/Page$|Feed$|Detail$/.test(ref) && ref !== 'ProductDetail') return { $ref: `#/components/schemas/${ref}` };
  return {
    allOf: [
      { $ref: '#/components/schemas/Envelope' },
      { type: 'object', properties: { data: { $ref: `#/components/schemas/${ref}` } } }
    ]
  };
};
const ok = (ref, ru, en) => ({
  '200': { description: ru, 'x-en': { description: en },
    content: { 'application/json': { schema: envelope(ref) } } }
});
const notFound = { '404': { description: 'Не найдено', 'x-en': { description: 'Not found' },
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } } };
const badRequest = { '400': { description: 'Ошибка валидации', 'x-en': { description: 'Validation error' },
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } } };
const body = (schema, example) => ({
  required: true,
  content: { 'application/json': { schema: { $ref: `#/components/schemas/${schema}` }, example } }
});

const PAGING = [
  q('page', 'integer', 'Номер страницы', 'Page number', { default: 1, minimum: 1 }),
  q('pageSize', 'integer', 'Размер страницы (максимум 200)', 'Page size (max 200)', { default: 20, minimum: 1, maximum: 200 })
];

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60');

  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host);
  const proto = req.headers['x-forwarded-proto'] || (isLocal ? 'http' : 'https');
  const baseUrl = `${proto}://${host}`;

  const subCount = categories.reduce((s, c) => s + c.subcategories.length, 0);

  res.end(JSON.stringify({
    openapi: '3.0.3',
    info: {
      title: 'Карапуз API — интернет-магазин товаров для детей',
      version: '2.1.0',
      description:
        `REST API интернет-магазина детских товаров: ${categories.length} категорий, ` +
        `${subCount} подкатегорий, ${products.length} товаров, ${promotions.length} акций и ` +
        `${blog.length} статей блога. Полный CRUD, фильтры, поиск, сортировка и пагинация. ` +
        'Авторизация не требуется, CORS открыт для всех источников. ' +
        'Каждый ответ приходит в конверте { data, errors, statusCode }. У списка data — это массив, ' +
        'готовый к перебору, рядом лежат totalCount, page, pageSize, totalPages, hasPrevious, hasNext. ' +
        'У ошибки data равен null, а текст лежит в errors.',
      'x-en': {
        title: 'Karapuz API — online store of children’s goods',
        description:
          `REST API for a children’s goods store: ${categories.length} categories, ` +
          `${subCount} subcategories, ${products.length} products, ${promotions.length} promotions and ` +
          `${blog.length} blog posts. Full CRUD with filtering, search, sorting and pagination. ` +
          'No authentication required, CORS is open. Every response comes as { data, errors, statusCode }: ' +
          'for a list data is a ready-to-map array with totalCount, page, pageSize, totalPages, hasPrevious, ' +
          'hasNext beside it; for an error data is null and the text is in errors.'
      },
      contact: { name: 'safarovmurod', url: 'https://github.com/safarovmurod/swagger' },
      license: { name: 'MIT' }
    },
    servers: [{ url: baseUrl, description: 'Текущий сервер' }],
    tags: [
      { name: 'Catalog', description: 'Категории и подкатегории по читаемым адресам: /api/avtokresla/gruppa-1', 'x-en': { description: 'Categories and subcategories at readable URLs: /api/avtokresla/gruppa-1' } },
      { name: 'Categories', description: 'Категории каталога и их подкатегории', 'x-en': { description: 'Catalog categories and their subcategories' } },
      { name: 'Subcategories', description: 'Подкатегории и массив товаров каждой из них', 'x-en': { description: 'Subcategories and the product array of each' } },
      { name: 'Products', description: 'Товары: фильтры, поиск, сортировка, CRUD', 'x-en': { description: 'Products: filters, search, sorting, CRUD' } },
      { name: 'Reviews', description: 'Отзывы покупателей на товары', 'x-en': { description: 'Customer product reviews' } },
      { name: 'Promotions', description: 'Акции — по одной на каждую категорию, с полным текстом', 'x-en': { description: 'Promotions — one per category, with full text' } },
      { name: 'Blog', description: 'Статьи блога магазина', 'x-en': { description: 'Store blog posts' } }
    ],
    paths: {
      '/api/{category}': {
        get: {
          tags: ['Catalog'],
          summary: 'Категория целиком по своему адресу',
          'x-en': { summary: 'Whole category at its own URL', description: 'Readable URL: /api/avtokresla, /api/kolyaski. Returns the category, its info block, subcategories and products.' },
          description: 'Читаемый адрес: /api/avtokresla, /api/kolyaski, /api/detskaya-mebel. Возвращает саму категорию, справку info, список подкатегорий и товары — отдельный запрос за описанием не нужен.',
          parameters: [
            pathParam('category', 'slug категории: akcii, detskaya-mebel, kolyaski, avtokresla, odezhda, kormlenie, gigiena-i-uhod, umnye-igrushki', 'Category slug'),
            q('subcategory', 'string', 'Оставить товары только этой подкатегории (slug или id)', 'Keep products of this subcategory only'),
            q('search', 'string', 'Поиск по названию, бренду и описанию', 'Search by name, brand and description'),
            q('brand', 'string', 'Бренды через запятую', 'Comma-separated brands'),
            q('onlyPromo', 'boolean', 'Только акционные товары', 'Promo products only'),
            q('isNew', 'boolean', 'Только новинки', 'New arrivals only'),
            q('inStock', 'boolean', 'Наличие на складе', 'Stock availability'),
            q('priceMin', 'integer', 'Цена от, ₽', 'Minimum price, RUB'),
            q('priceMax', 'integer', 'Цена до, ₽', 'Maximum price, RUB'),
            q('sortBy', 'string', 'price, rating, name, discount', 'price, rating, name, discount', { enum: ['price', 'rating', 'name', 'discount'] }),
            q('sortDir', 'string', 'asc или desc', 'asc or desc', { enum: ['asc', 'desc'] }),
            q('light', 'boolean', 'true — короткие карточки товаров', 'true — short product cards'),
            ...PAGING
          ],
          responses: { ...ok('CategoryFeed', 'Категория с товарами', 'Category with products'), ...notFound }
        }
      },
      '/api/{category}/{subcategory}': {
        get: {
          tags: ['Catalog'],
          summary: 'Подкатегория целиком по своему адресу',
          'x-en': { summary: 'Whole subcategory at its own URL', description: 'Readable URL: /api/avtokresla/gruppa-1. Returns the subcategory, its 20 products and the parent category with its info.' },
          description: 'Читаемый адрес: /api/avtokresla/gruppa-1, /api/detskaya-mebel/krovatki. Возвращает подкатегорию, её 20 товаров и родительскую категорию со справкой info.',
          parameters: [
            pathParam('category', 'slug категории, например avtokresla', 'Category slug'),
            pathParam('subcategory', 'slug подкатегории, например gruppa-1', 'Subcategory slug'),
            q('search', 'string', 'Поиск по названию, бренду и описанию', 'Search by name, brand and description'),
            q('brand', 'string', 'Бренды через запятую', 'Comma-separated brands'),
            q('onlyPromo', 'boolean', 'Только акционные товары', 'Promo products only'),
            q('isNew', 'boolean', 'Только новинки', 'New arrivals only'),
            q('inStock', 'boolean', 'Наличие на складе', 'Stock availability'),
            q('priceMin', 'integer', 'Цена от, ₽', 'Minimum price, RUB'),
            q('priceMax', 'integer', 'Цена до, ₽', 'Maximum price, RUB'),
            q('sortBy', 'string', 'price, rating, name, discount', 'price, rating, name, discount', { enum: ['price', 'rating', 'name', 'discount'] }),
            q('sortDir', 'string', 'asc или desc', 'asc or desc', { enum: ['asc', 'desc'] }),
            q('light', 'boolean', 'true — короткие карточки товаров', 'true — short product cards'),
            ...PAGING
          ],
          responses: { ...ok('SubcategoryFeed', 'Подкатегория с товарами', 'Subcategory with products'), ...notFound }
        }
      },
      '/api/categories': {
        get: {
          tags: ['Categories'],
          summary: 'Список категорий с подкатегориями',
          'x-en': { summary: 'List categories with subcategories', description: 'Returns all categories; each one includes its subcategories and product counts.' },
          description: 'Возвращает все категории. У каждой — вложенный массив подкатегорий и количество товаров.',
          parameters: [
            ...PAGING,
            q('search', 'string', 'Поиск по названию и описанию категории', 'Search by category name and description')
          ],
          responses: ok('CategoryPage', 'Список категорий', 'List of categories')
        },
        post: {
          tags: ['Categories'],
          summary: 'Создать категорию',
          'x-en': { summary: 'Create a category' },
          requestBody: body('CategoryInput', { name: 'Игрушки для ванной', slug: 'igrushki-dlya-vannoy', description: 'Резиновые и плавающие игрушки', image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600&q=80' }),
          responses: { '201': { description: 'Категория создана', 'x-en': { description: 'Category created' }, content: { 'application/json': { schema: envelope('Category') } } }, ...badRequest }
        }
      },
      '/api/categories/{id}': {
        get: {
          tags: ['Categories'],
          summary: 'Категория по id или slug + её товары',
          'x-en': { summary: 'Category by id or slug + its products', description: 'Accepts a numeric id or a slug (e.g. kolyaski). Products come paginated.' },
          description: 'Принимает числовой id или slug (например kolyaski). Товары возвращаются постранично.',
          parameters: [
            pathParam('id', 'id категории или slug', 'Category id or slug'),
            q('subcategoryId', 'integer', 'Оставить только товары этой подкатегории', 'Keep only products of this subcategory'),
            q('light', 'boolean', 'false — вернуть товары целиком (с отзывами и характеристиками)', 'false — return full products (with reviews and characteristics)', { default: true }),
            ...PAGING
          ],
          responses: { ...ok('CategoryDetail', 'Категория найдена', 'Category found'), ...notFound }
        },
        put: {
          tags: ['Categories'], summary: 'Обновить категорию', 'x-en': { summary: 'Update a category' },
          parameters: [pathParam('id', 'id категории или slug', 'Category id or slug')],
          requestBody: body('CategoryInput', { name: 'Коляски и переноски', description: 'Обновлённое описание категории' }),
          responses: { ...ok('Category', 'Категория обновлена', 'Category updated'), ...notFound }
        },
        delete: {
          tags: ['Categories'], summary: 'Удалить категорию', 'x-en': { summary: 'Delete a category' },
          parameters: [pathParam('id', 'id категории или slug', 'Category id or slug')],
          responses: { ...ok(null, 'Категория удалена', 'Category deleted'), ...notFound }
        }
      },
      '/api/subcategories': {
        get: {
          tags: ['Subcategories'],
          summary: 'Список всех подкатегорий',
          'x-en': { summary: 'List all subcategories', description: 'A flat list of all subcategories with the number of products in each.' },
          description: 'Плоский список всех подкатегорий магазина с количеством товаров в каждой.',
          parameters: [
            q('categoryId', 'integer', 'Только подкатегории этой категории', 'Only subcategories of this category'),
            q('categorySlug', 'string', 'То же самое, но по slug категории', 'Same, but by category slug'),
            q('search', 'string', 'Поиск по названию подкатегории', 'Search by subcategory name'),
            ...PAGING
          ],
          responses: ok('SubcategoryPage', 'Список подкатегорий', 'List of subcategories')
        },
        post: {
          tags: ['Subcategories'], summary: 'Создать подкатегорию', 'x-en': { summary: 'Create a subcategory' },
          requestBody: body('SubcategoryInput', { name: 'Ходунки', slug: 'hodunki', categoryId: 8 }),
          responses: { '201': { description: 'Подкатегория создана', 'x-en': { description: 'Subcategory created' }, content: { 'application/json': { schema: envelope('Subcategory') } } }, ...badRequest, ...notFound }
        }
      },
      '/api/subcategories/{id}': {
        get: {
          tags: ['Subcategories'],
          summary: 'Подкатегория + массив её товаров',
          'x-en': { summary: 'Subcategory + its product array', description: 'Every subcategory holds 20 products (10 in «Акции»). Supports filtering and sorting.' },
          description: 'В каждой подкатегории 20 товаров (в «Акциях» — 10). Поддерживает фильтры и сортировку.',
          parameters: [
            pathParam('id', 'id подкатегории или slug', 'Subcategory id or slug'),
            q('onlyPromo', 'boolean', 'Только акционные товары', 'Promo products only'),
            q('isNew', 'boolean', 'Только новинки', 'New arrivals only'),
            q('inStock', 'boolean', 'Только товары в наличии', 'In-stock products only'),
            q('priceMin', 'integer', 'Цена от, ₽', 'Minimum price, RUB'),
            q('priceMax', 'integer', 'Цена до, ₽', 'Maximum price, RUB'),
            q('sortBy', 'string', 'Сортировка: price, rating, name', 'Sort by: price, rating, name', { enum: ['price', 'rating', 'name'] }),
            q('sortDir', 'string', 'Направление сортировки', 'Sort direction', { enum: ['asc', 'desc'], default: 'desc' }),
            q('light', 'boolean', 'true — короткие карточки без отзывов', 'true — short cards without reviews'),
            ...PAGING
          ],
          responses: { ...ok('SubcategoryDetail', 'Подкатегория найдена', 'Subcategory found'), ...notFound }
        },
        put: {
          tags: ['Subcategories'], summary: 'Обновить подкатегорию', 'x-en': { summary: 'Update a subcategory' },
          parameters: [pathParam('id', 'id подкатегории или slug', 'Subcategory id or slug')],
          requestBody: body('SubcategoryInput', { name: 'Кроватки-трансформеры' }),
          responses: { ...ok('Subcategory', 'Подкатегория обновлена', 'Subcategory updated'), ...notFound }
        },
        delete: {
          tags: ['Subcategories'], summary: 'Удалить подкатегорию', 'x-en': { summary: 'Delete a subcategory' },
          parameters: [pathParam('id', 'id подкатегории или slug', 'Subcategory id or slug')],
          responses: { ...ok(null, 'Подкатегория удалена', 'Subcategory deleted'), ...notFound }
        }
      },
      '/api/products': {
        get: {
          tags: ['Products'],
          summary: 'Товары: фильтры, поиск, сортировка, пагинация',
          'x-en': { summary: 'Products: filters, search, sorting, pagination', description: 'The main catalog endpoint. All filters can be combined.' },
          description: 'Главный эндпоинт каталога. Все фильтры можно комбинировать между собой.',
          parameters: [
            q('search', 'string', 'Поиск по названию, описанию, бренду и артикулу', 'Search by name, description, brand and article'),
            q('categoryId', 'integer', 'Фильтр по категории', 'Filter by category'),
            q('categorySlug', 'string', 'Фильтр по slug категории', 'Filter by category slug'),
            q('subcategoryId', 'integer', 'Фильтр по подкатегории', 'Filter by subcategory'),
            q('subcategorySlug', 'string', 'Фильтр по slug подкатегории', 'Filter by subcategory slug'),
            q('onlyPromo', 'boolean', 'Только акции (есть старая цена)', 'Promo only (has an old price)'),
            q('isNew', 'boolean', 'Только новинки', 'New arrivals only'),
            q('inStock', 'boolean', 'true — в наличии, false — под заказ', 'true — in stock, false — out of stock'),
            q('brand', 'string', 'Бренды через запятую: Chicco,Cybex', 'Comma-separated brands: Chicco,Cybex'),
            q('country', 'string', 'Страны через запятую: Италия,Германия', 'Comma-separated countries'),
            q('color', 'string', 'Цвета через запятую: Белый,Серый', 'Comma-separated colours'),
            q('material', 'string', 'Материалы через запятую: Хлопок,Пластик', 'Comma-separated materials'),
            q('priceMin', 'integer', 'Цена от, ₽', 'Minimum price, RUB'),
            q('priceMax', 'integer', 'Цена до, ₽', 'Maximum price, RUB'),
            q('ratingMin', 'number', 'Рейтинг не ниже, например 4.5', 'Minimum rating, e.g. 4.5'),
            q('sortBy', 'string', 'popularity, price, name, rating, discount, new', 'popularity, price, name, rating, discount, new', { enum: ['popularity', 'price', 'name', 'rating', 'discount', 'new'], default: 'popularity' }),
            q('sortDir', 'string', 'asc — по возрастанию, desc — по убыванию', 'asc or desc', { enum: ['asc', 'desc'], default: 'desc' }),
            q('light', 'boolean', 'true — короткие карточки без отзывов и характеристик', 'true — short cards without reviews and characteristics'),
            ...PAGING
          ],
          responses: ok('ProductPage', 'Страница товаров', 'A page of products')
        },
        post: {
          tags: ['Products'], summary: 'Создать товар', 'x-en': { summary: 'Create a product' },
          requestBody: body('ProductInput', {
            name: 'Кроватка Erbesi Sonia, Италия', price: 42000, oldPrice: 52000,
            categoryId: 2, subcategoryId: 21, brand: 'Erbesi', country: 'Италия',
            image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068068c?w=600&q=80',
            description: 'Кроватка из массива бука с маятниковым механизмом.',
            characteristics: { 'Материал': 'Массив бука', 'Маятник': 'Продольный' },
            colorOptions: ['Белый', 'Слоновая кость'], materials: ['Бук'],
            ageGroup: '0-3 года', inStock: true, isNew: true, isPromo: true
          }),
          responses: { '201': { description: 'Товар создан', 'x-en': { description: 'Product created' }, content: { 'application/json': { schema: envelope('Product') } } }, ...badRequest }
        }
      },
      '/api/products/{id}': {
        get: {
          tags: ['Products'], summary: 'Товар по id или slug (+ похожие)',
          'x-en': { summary: 'Product by id or slug (+ similar)', description: 'Full product card with characteristics, reviews and up to 8 similar products.' },
          description: 'Полная карточка: характеристики, отзывы и до 8 похожих товаров из той же подкатегории.',
          parameters: [pathParam('id', 'id товара или slug', 'Product id or slug')],
          responses: { ...ok('ProductDetail', 'Товар найден', 'Product found'), ...notFound }
        },
        put: {
          tags: ['Products'], summary: 'Обновить товар', 'x-en': { summary: 'Update a product' },
          parameters: [pathParam('id', 'id товара или slug', 'Product id or slug')],
          requestBody: body('ProductInput', { price: 38000, oldPrice: 52000, inStock: false }),
          responses: { ...ok('Product', 'Товар обновлён', 'Product updated'), ...notFound }
        },
        delete: {
          tags: ['Products'], summary: 'Удалить товар', 'x-en': { summary: 'Delete a product' },
          parameters: [pathParam('id', 'id товара или slug', 'Product id or slug')],
          responses: { ...ok(null, 'Товар удалён', 'Product deleted'), ...notFound }
        }
      },
      '/api/products/{id}/reviews': {
        get: {
          tags: ['Reviews'], summary: 'Отзывы товара', 'x-en': { summary: 'Product reviews' },
          description: 'Все отзывы товара и средний рейтинг.',
          parameters: [pathParam('id', 'id товара', 'Product id', 'integer')],
          responses: { ...ok('ReviewFeed', 'Отзывы товара', 'Product reviews'), ...notFound }
        },
        post: {
          tags: ['Reviews'], summary: 'Добавить отзыв', 'x-en': { summary: 'Add a review' },
          description: 'После добавления рейтинг товара пересчитывается автоматически.',
          parameters: [pathParam('id', 'id товара', 'Product id', 'integer')],
          requestBody: body('ReviewInput', { author: 'Мария Петрова', rating: 5, pros: 'Качество, дизайн', cons: 'Не обнаружено', comment: 'Пользуемся месяц — всё отлично, рекомендую.' }),
          responses: { '201': { description: 'Отзыв добавлен', 'x-en': { description: 'Review added' }, content: { 'application/json': { schema: envelope('Review') } } }, ...badRequest, ...notFound }
        }
      },
      '/api/promotions': {
        get: {
          tags: ['Promotions'], summary: 'Список акций',
          'x-en': { summary: 'List promotions', description: 'One promotion per category. The list omits the full text — request a single promotion or pass full=true.' },
          description: 'По одной акции на каждую категорию. В списке полный текст не отдаётся — откройте акцию отдельно или передайте full=true.',
          parameters: [
            q('categoryId', 'integer', 'Акции только этой категории', 'Promotions of this category only'),
            q('isActive', 'boolean', 'Только активные акции', 'Active promotions only'),
            q('discountMin', 'integer', 'Скидка не меньше, %', 'Minimum discount, %'),
            q('search', 'string', 'Поиск по заголовку и описанию', 'Search by title and description'),
            q('full', 'boolean', 'true — включить полный текст акции', 'true — include the full promotion text'),
            q('sortBy', 'string', 'discount — сортировать по размеру скидки', 'discount — sort by discount size', { enum: ['discount'] }),
            q('sortDir', 'string', 'asc или desc', 'asc or desc', { enum: ['asc', 'desc'] }),
            ...PAGING
          ],
          responses: ok('PromotionPage', 'Список акций', 'List of promotions')
        },
        post: {
          tags: ['Promotions'], summary: 'Создать акцию', 'x-en': { summary: 'Create a promotion' },
          requestBody: body('PromotionInput', {
            title: 'Чёрная пятница: коляски -40%', description: 'Скидка 40% на все коляски в течение недели.',
            content: 'Полный текст акции: условия, сроки и порядок получения скидки.',
            discount: 40, categoryId: 3, dateStart: '2026-11-24', dateEnd: '2026-11-30',
            isActive: true, products: [131, 132, 133]
          }),
          responses: { '201': { description: 'Акция создана', 'x-en': { description: 'Promotion created' }, content: { 'application/json': { schema: envelope('Promotion') } } }, ...badRequest }
        }
      },
      '/api/promotions/{id}': {
        get: {
          tags: ['Promotions'], summary: 'Одна акция: полный текст + её товары',
          'x-en': { summary: 'One promotion: full text + its products', description: 'Accepts a numeric id or a slug (e.g. akciya-kolyaski). Returns the full text and the promotion product list.' },
          description: 'Принимает id или slug (например akciya-kolyaski). Возвращает полный текст и список товаров акции.',
          parameters: [
            pathParam('id', 'id акции или slug', 'Promotion id or slug'),
            ...PAGING
          ],
          responses: { ...ok('PromotionDetail', 'Акция найдена', 'Promotion found'), ...notFound }
        },
        put: {
          tags: ['Promotions'], summary: 'Обновить акцию', 'x-en': { summary: 'Update a promotion' },
          parameters: [pathParam('id', 'id акции или slug', 'Promotion id or slug')],
          requestBody: body('PromotionInput', { discount: 25, isActive: false }),
          responses: { ...ok('Promotion', 'Акция обновлена', 'Promotion updated'), ...notFound }
        },
        delete: {
          tags: ['Promotions'], summary: 'Удалить акцию', 'x-en': { summary: 'Delete a promotion' },
          parameters: [pathParam('id', 'id акции или slug', 'Promotion id or slug')],
          responses: { ...ok(null, 'Акция удалена', 'Promotion deleted'), ...notFound }
        }
      },
      '/api/blog': {
        get: {
          tags: ['Blog'], summary: 'Статьи блога', 'x-en': { summary: 'Blog posts' },
          description: 'По умолчанию возвращаются только анонсы. Полный текст — параметр full=true.',
          parameters: [
            q('search', 'string', 'Поиск по заголовку, анонсу и тексту статьи', 'Search by title, excerpt and body'),
            q('categoryId', 'integer', 'Статьи, связанные с этой категорией', 'Posts linked to this category'),
            q('categorySlug', 'string', 'То же самое, но по slug категории', 'Same, but by category slug'),
            q('sortBy', 'string', 'date, title, readingTime', 'date, title, readingTime', { enum: ['date', 'title', 'readingTime'] }),
            q('sortDir', 'string', 'asc или desc', 'asc or desc', { enum: ['asc', 'desc'] }),
            q('full', 'boolean', 'true — включить полный текст статей', 'true — include full post text'),
            ...PAGING
          ],
          responses: ok('BlogPage', 'Список статей', 'List of posts')
        },
        post: {
          tags: ['Blog'], summary: 'Создать статью', 'x-en': { summary: 'Create a post' },
          requestBody: body('BlogInput', {
            title: 'Как выбрать первую кроватку',
            slug: 'kak-vybrat-pervuyu-krovatku',
            excerpt: 'Разбираем виды кроваток и на что смотреть при покупке',
            content: 'Первый абзац статьи.\n\nВторой абзац статьи.',
            image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068068c?w=900&q=80',
            date: '2026-08-31', readingTime: 6, categoryId: 2
          }),
          responses: { '201': { description: 'Статья создана', 'x-en': { description: 'Post created' }, content: { 'application/json': { schema: envelope('BlogPost') } } }, ...badRequest }
        }
      },
      '/api/blog/{id}': {
        get: {
          tags: ['Blog'], summary: 'Статья по id или slug (+ соседние)',
          'x-en': { summary: 'Post by id or slug (+ neighbours)', description: 'Accepts a numeric id or a slug, e.g. kak-vybrat-krovatku.' },
          description: 'Принимает id или slug, например kak-vybrat-krovatku. Возвращает полный текст и соседние статьи.',
          parameters: [pathParam('id', 'id статьи или slug', 'Post id or slug')],
          responses: { ...ok('BlogPost', 'Статья найдена', 'Post found'), ...notFound }
        },
        put: {
          tags: ['Blog'], summary: 'Обновить статью', 'x-en': { summary: 'Update a post' },
          parameters: [pathParam('id', 'id статьи или slug', 'Post id or slug')],
          requestBody: body('BlogInput', { title: 'Обновлённый заголовок' }),
          responses: { ...ok('BlogPost', 'Статья обновлена', 'Post updated'), ...notFound }
        },
        delete: {
          tags: ['Blog'], summary: 'Удалить статью', 'x-en': { summary: 'Delete a post' },
          parameters: [pathParam('id', 'id статьи или slug', 'Post id or slug')],
          responses: { ...ok(null, 'Статья удалена', 'Post deleted'), ...notFound }
        }
      }
    },
    components: {
      schemas: {
        Error: {
          type: 'object',
          description: 'Ошибка приходит в том же конверте: data всегда null, текст — в errors',
          properties: {
            data: { type: 'object', nullable: true, example: null },
            errors: { type: 'array', items: { type: 'string' }, example: ['Товар 999 не найден'] },
            statusCode: { type: 'integer', example: 404 },
            message: { type: 'string', example: 'Товар 999 не найден' }
          }
        },
        Envelope: {
          type: 'object',
          description: 'Общий конверт: у каждого ответа есть data, errors и statusCode',
          properties: {
            data: { description: 'Массив — у списков, объект — у одиночных записей, null — у ошибок' },
            errors: { type: 'array', items: { type: 'string' }, example: [] },
            statusCode: { type: 'integer', example: 200 }
          }
        },
        Pagination: {
          allOf: [{ $ref: '#/components/schemas/Envelope' }, { type: 'object', properties: {
            totalCount: { type: 'integer', example: 730 }, page: { type: 'integer', example: 1 },
            pageSize: { type: 'integer', example: 20 }, totalPages: { type: 'integer', example: 37 },
            hasPrevious: { type: 'boolean' }, hasNext: { type: 'boolean' }
          } }]
        },
        Ok: {
          allOf: [{ $ref: '#/components/schemas/Envelope' },
            { type: 'object', properties: { data: { type: 'object', nullable: true, description: 'Результат операции' } } }]
        },
        CategoryInfo: {
          type: 'object',
          description: 'Справка по категории — своя у каждой: на что смотреть при выборе, доставка, гарантия, оплата',
          properties: {
            note: { type: 'string' }, howToChoose: { type: 'string' },
            delivery: { type: 'string' }, warranty: { type: 'string' }, payment: { type: 'string' }
          }
        },
        Subcategory: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 21 }, name: { type: 'string', example: 'Кроватки' },
            slug: { type: 'string', example: 'krovatki' },
            description: { type: 'string', description: 'Описание подкатегории — своё у каждой из 37' },
            categoryId: { type: 'integer', example: 2 },
            categoryName: { type: 'string', example: 'Детская мебель' },
            productCount: { type: 'integer', example: 20 }
          }
        },
        SubcategoryInput: {
          type: 'object', required: ['name', 'categoryId'],
          properties: { name: { type: 'string' }, slug: { type: 'string' }, categoryId: { type: 'integer' } }
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 2 }, name: { type: 'string', example: 'Детская мебель' },
            slug: { type: 'string', example: 'detskaya-mebel' }, description: { type: 'string' },
            image: { type: 'string' }, productCount: { type: 'integer', example: 120 },
            info: { $ref: '#/components/schemas/CategoryInfo' },
            subcategories: { type: 'array', items: { $ref: '#/components/schemas/Subcategory' } }
          }
        },
        CategoryInput: {
          type: 'object', required: ['name'],
          properties: {
            name: { type: 'string' }, slug: { type: 'string' }, description: { type: 'string' },
            image: { type: 'string' }, subcategories: { type: 'array', items: { $ref: '#/components/schemas/Subcategory' } }
          }
        },
        Review: {
          type: 'object',
          properties: {
            id: { type: 'integer' }, author: { type: 'string', example: 'Мария Петрова' },
            date: { type: 'string', example: '2024-05-12' }, rating: { type: 'integer', minimum: 1, maximum: 5 },
            pros: { type: 'string' }, cons: { type: 'string' }, comment: { type: 'string' }
          }
        },
        ReviewInput: {
          type: 'object', required: ['author', 'comment'],
          properties: {
            author: { type: 'string' }, rating: { type: 'integer', minimum: 1, maximum: 5, default: 5 },
            pros: { type: 'string' }, cons: { type: 'string' }, comment: { type: 'string' }
          }
        },
        ReviewList: {
          type: 'object',
          properties: {
            productId: { type: 'integer' }, productName: { type: 'string' },
            reviewCount: { type: 'integer' }, averageRating: { type: 'string', example: '4.7' },
            reviews: { type: 'array', items: { $ref: '#/components/schemas/Review' } }
          }
        },
        ProductMini: {
          type: 'object',
          properties: {
            id: { type: 'integer' }, name: { type: 'string' }, slug: { type: 'string' },
            price: { type: 'number' }, oldPrice: { type: 'number', nullable: true },
            discount: { type: 'integer' }, image: { type: 'string' }, brand: { type: 'string' },
            rating: { type: 'number' }, inStock: { type: 'boolean' },
            categoryId: { type: 'integer' }, subcategoryId: { type: 'integer' }
          }
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 11 }, name: { type: 'string', example: 'Кроватка Erbesi Incanto, Италия' },
            slug: { type: 'string' }, price: { type: 'number', example: 42000 },
            oldPrice: { type: 'number', nullable: true, example: 52000 }, discount: { type: 'integer', example: 19 },
            categoryId: { type: 'integer', example: 2 }, categoryName: { type: 'string', example: 'Детская мебель' },
            categorySlug: { type: 'string' }, subcategoryId: { type: 'integer', example: 21 },
            subcategoryName: { type: 'string', example: 'Кроватки' }, subcategorySlug: { type: 'string' },
            article: { type: 'string' }, brand: { type: 'string' }, country: { type: 'string' },
            image: { type: 'string' }, images: { type: 'array', items: { type: 'string' } },
            description: { type: 'string' },
            characteristics: { type: 'object', additionalProperties: { type: 'string' } },
            colorOptions: { type: 'array', items: { type: 'string' } },
            materials: { type: 'array', items: { type: 'string' } },
            ageGroup: { type: 'string' }, rating: { type: 'number' }, reviewCount: { type: 'integer' },
            inStock: { type: 'boolean' }, isNew: { type: 'boolean' }, isPromo: { type: 'boolean' },
            reviews: { type: 'array', items: { $ref: '#/components/schemas/Review' } }
          }
        },
        ProductDetail: {
          allOf: [
            { $ref: '#/components/schemas/Product' },
            { type: 'object', properties: { similar: { type: 'array', items: { $ref: '#/components/schemas/ProductMini' } } } }
          ]
        },
        ProductInput: {
          type: 'object', required: ['name', 'price'],
          properties: {
            name: { type: 'string' }, price: { type: 'number' }, oldPrice: { type: 'number', nullable: true },
            categoryId: { type: 'integer' }, subcategoryId: { type: 'integer' }, brand: { type: 'string' },
            country: { type: 'string' }, image: { type: 'string' },
            images: { type: 'array', items: { type: 'string' } }, description: { type: 'string' },
            characteristics: { type: 'object', additionalProperties: { type: 'string' } },
            colorOptions: { type: 'array', items: { type: 'string' } },
            materials: { type: 'array', items: { type: 'string' } }, ageGroup: { type: 'string' },
            inStock: { type: 'boolean' }, isNew: { type: 'boolean' }, isPromo: { type: 'boolean' }
          }
        },
        Promotion: {
          type: 'object',
          properties: {
            id: { type: 'integer' }, slug: { type: 'string', example: 'akciya-kolyaski' },
            title: { type: 'string' }, description: { type: 'string' },
            content: { type: 'string', description: 'Полный текст акции — свой у каждой категории' },
            image: { type: 'string' }, discount: { type: 'integer', example: 30 },
            categoryId: { type: 'integer' }, categoryName: { type: 'string' },
            dateStart: { type: 'string' }, dateEnd: { type: 'string' }, isActive: { type: 'boolean' },
            productCount: { type: 'integer' }, products: { type: 'array', items: { type: 'integer' } },
            productDetails: { type: 'array', items: { $ref: '#/components/schemas/ProductMini' } }
          }
        },
        PromotionDetail: {
          allOf: [
            { $ref: '#/components/schemas/Promotion' },
            { type: 'object', properties: { productsPage: { $ref: '#/components/schemas/ProductPage' } } }
          ]
        },
        PromotionInput: {
          type: 'object', required: ['title'],
          properties: {
            title: { type: 'string' }, description: { type: 'string' }, content: { type: 'string' },
            image: { type: 'string' }, discount: { type: 'integer' }, categoryId: { type: 'integer' },
            dateStart: { type: 'string' }, dateEnd: { type: 'string' }, isActive: { type: 'boolean' },
            products: { type: 'array', items: { type: 'integer' } }
          }
        },
        BlogPost: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 10 },
            slug: { type: 'string', example: 'kak-vybrat-krovatku' },
            title: { type: 'string' }, excerpt: { type: 'string' },
            date: { type: 'string', example: '2026-03-05' },
            readingTime: { type: 'integer', description: 'Примерное время чтения, минут', example: 7 },
            categoryId: { type: 'integer', description: 'Категория каталога, с которой связана статья' },
            categoryName: { type: 'string' },
            image: { type: 'string' },
            content: { type: 'string', description: 'Полный текст статьи, абзацы разделены \\n\\n' },
            prevPost: { $ref: '#/components/schemas/BlogNeighbour' },
            nextPost: { $ref: '#/components/schemas/BlogNeighbour' }
          }
        },
        BlogNeighbour: {
          type: 'object', nullable: true,
          properties: {
            id: { type: 'integer' }, slug: { type: 'string' },
            title: { type: 'string' }, image: { type: 'string' }
          }
        },
        BlogInput: {
          type: 'object', required: ['title'],
          properties: {
            title: { type: 'string' }, slug: { type: 'string' }, excerpt: { type: 'string' },
            content: { type: 'string' }, image: { type: 'string' }, date: { type: 'string' },
            readingTime: { type: 'integer' }, categoryId: { type: 'integer' }
          }
        },
        CategoryFeed: {
          allOf: [{ $ref: '#/components/schemas/ProductPage' },
            { type: 'object', properties: {
              category: { $ref: '#/components/schemas/Category' },
              subcategories: { type: 'array', items: { $ref: '#/components/schemas/Subcategory' } }
            } }]
        },
        SubcategoryFeed: {
          allOf: [{ $ref: '#/components/schemas/ProductPage' },
            { type: 'object', properties: {
              subcategory: { $ref: '#/components/schemas/Subcategory' },
              category: { $ref: '#/components/schemas/Category' }
            } }]
        },
        ReviewFeed: {
          allOf: [{ $ref: '#/components/schemas/Pagination' },
            { type: 'object', properties: {
              data: { type: 'array', items: { $ref: '#/components/schemas/Review' } },
              product: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, slug: { type: 'string' } } },
              averageRating: { type: 'number', example: 4.7 }
            } }]
        },
        CategoryPage: {
          allOf: [{ $ref: '#/components/schemas/Pagination' },
            { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Category' } } } }]
        },
        CategoryDetail: { $ref: '#/components/schemas/CategoryFeed' },
        SubcategoryPage: {
          allOf: [{ $ref: '#/components/schemas/Pagination' },
            { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Subcategory' } } } }]
        },
        SubcategoryDetail: { $ref: '#/components/schemas/SubcategoryFeed' },
        ProductPage: {
          allOf: [{ $ref: '#/components/schemas/Pagination' },
            { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Product' } } } }]
        },
        PromotionPage: {
          allOf: [{ $ref: '#/components/schemas/Pagination' },
            { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Promotion' } } } }]
        },
        BlogPage: {
          allOf: [{ $ref: '#/components/schemas/Pagination' },
            { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/BlogPost' } } } }]
        }
      }
    }
  }));
};
