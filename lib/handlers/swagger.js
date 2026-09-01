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

// защищённый метод: Swagger рисует замок и подставляет заголовок Authorization
const secured = { security: [{ bearerAuth: [] }] };

const errRef = { $ref: '#/components/schemas/Error' };
const errAt = (code, ru, en) => ({
  [String(code)]: { description: ru, 'x-en': { description: en }, content: { 'application/json': { schema: errRef } } }
});
const unauthorized = Object.assign({}, errAt(401, 'Нужен токен: заголовок Authorization: Bearer <токен>', 'Token required: Authorization: Bearer <token>'));
const forbidden = Object.assign({}, errAt(403, 'Недостаточно прав', 'Not enough rights'));
const authErrors = Object.assign({}, unauthorized, forbidden);
const conflict = Object.assign({}, errAt(409, 'Запись с такими данными уже есть', 'Such a record already exists'));
const tooLarge = Object.assign({}, errAt(413, 'Файл или тело запроса слишком большие', 'File or request body too large'));
const badType = Object.assign({}, errAt(415, 'Такой тип файла загружать нельзя', 'This file type is not allowed'));
const tooMany = Object.assign({}, errAt(429, 'Слишком много запросов', 'Too many requests'));

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
      version: '3.0.0',
      description:
        `REST API интернет-магазина детских товаров: ${categories.length} категорий, ` +
        `${subCount} подкатегорий, ${products.length} товаров, ${promotions.length} акций и ` +
        `${blog.length} статей блога. Полный CRUD, фильтры, поиск, сортировка и пагинация. ` +
        'Чтение открыто всем, изменение данных требует токена: получите его в POST /api/auth/login ' +
        '(демонстрационный администратор admin@karapuz.tj / Admin123!) и вставьте в кнопку Authorize. ' +
        'Каждый ответ приходит в конверте { data, errors, statusCode }. У списка data — это массив, ' +
        'готовый к перебору, рядом лежат totalCount, page, pageSize, totalPages, hasPrevious, hasNext. ' +
        'У ошибки data равен null, а текст лежит в errors.',
      'x-en': {
        title: 'Karapuz API — online store of children’s goods',
        description:
          `REST API for a children’s goods store: ${categories.length} categories, ` +
          `${subCount} subcategories, ${products.length} products, ${promotions.length} promotions and ` +
          `${blog.length} blog posts. Full CRUD with filtering, search, sorting and pagination. ` +
          'Reading is open to everyone, writing needs a token from POST /api/auth/login. ' +
          'Every response comes as { data, errors, statusCode }: ' +
          'for a list data is a ready-to-map array with totalCount, page, pageSize, totalPages, hasPrevious, ' +
          'hasNext beside it; for an error data is null and the text is in errors.'
      },
      contact: { name: 'safarovmurod', url: 'https://github.com/safarovmurod/swagger' },
      license: { name: 'MIT' }
    },
    servers: [{ url: baseUrl, description: 'Текущий сервер' }],
    tags: [
      { name: 'Authentication', description: 'Регистрация, вход, профиль и выход. Токен вставляется кнопкой Authorize.', 'x-en': { description: 'Register, log in, profile and log out. Paste the token into Authorize.' } },
      { name: 'Users', description: 'Пользователи: свой профиль каждому, список — администратору', 'x-en': { description: 'Users: own profile for everyone, the list for admins' } },
      { name: 'Catalog', description: 'Категории и подкатегории по читаемым адресам: /api/avtokresla/gruppa-1', 'x-en': { description: 'Categories and subcategories at readable URLs: /api/avtokresla/gruppa-1' } },
      { name: 'Categories', description: 'Категории каталога и их подкатегории', 'x-en': { description: 'Catalog categories and their subcategories' } },
      { name: 'Subcategories', description: 'Подкатегории и массив товаров каждой из них', 'x-en': { description: 'Subcategories and the product array of each' } },
      { name: 'Products', description: 'Товары: фильтры, поиск, сортировка, CRUD', 'x-en': { description: 'Products: filters, search, sorting, CRUD' } },
      { name: 'Reviews', description: 'Отзывы покупателей на товары', 'x-en': { description: 'Customer product reviews' } },
      { name: 'Promotions', description: 'Акции — по одной на каждую категорию, с полным текстом', 'x-en': { description: 'Promotions — one per category, with full text' } },
      { name: 'Blog', description: 'Статьи блога магазина', 'x-en': { description: 'Store blog posts' } }
    ],
    paths: {
      '/api/auth/register': {
        post: {
          tags: ['Authentication'],
          summary: 'Регистрация: поля формы + файл аватара',
          'x-en': { summary: 'Register: form fields + avatar file' },
          description: 'Тело отправляется как multipart/form-data: текстовые поля и файл avatar (кнопка «Choose File»). ' +
            'Разрешены jpg, png и webp не больше 256 КБ — тип проверяется по содержимому файла, а не по имени. ' +
            'Роль назначает сервер: новый пользователь всегда user, поле role в запросе не принимается. ' +
            'То же самое можно отправить обычным JSON, тогда аватара просто не будет.',
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: { $ref: '#/components/schemas/RegisterForm' },
                encoding: { avatar: { contentType: 'image/jpeg, image/png, image/webp' } }
              },
              'application/json': {
                schema: { $ref: '#/components/schemas/RegisterInput' },
                example: {
                  fullName: 'Мансур', tel: '+992900123456', email: 'safarov@gmail.com',
                  password: 'ExamplePassword123!', address: 'Душанбе'
                }
              }
            }
          },
          responses: Object.assign({
            '201': {
              description: 'Пользователь создан, вместе с ответом приходит токен',
              'x-en': { description: 'User created, the response already contains a token' },
              content: { 'application/json': { schema: envelope('AuthTokens') } }
            }
          }, badRequest, conflict, tooLarge, badType, tooMany)
        }
      },
      '/api/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'Вход — выдаёт настоящий JWT',
          'x-en': { summary: 'Log in — returns a real JWT' },
          description: 'Ответ содержит accessToken. Скопируйте его в кнопку Authorize наверху страницы — ' +
            'после этого защищённые методы будут работать. Демонстрационный администратор: admin@karapuz.tj / Admin123!',
          requestBody: body('LoginInput', { email: 'safarov@gmail.com', password: 'ExamplePassword123!' }),
          responses: Object.assign(
            ok('AuthTokens', 'Вход выполнен', 'Logged in'),
            badRequest, errAt(401, 'Неверный email или пароль', 'Wrong email or password'), tooMany)
        }
      },
      '/api/auth/me': {
        get: Object.assign({
          tags: ['Authentication'],
          summary: 'Профиль по токену',
          'x-en': { summary: 'Profile by token' },
          description: 'Требует заголовок Authorization: Bearer <токен>. В ответе нет ни пароля, ни его хеша, ' +
            'а телефон отдаётся неполным.',
          responses: Object.assign(ok('MeResponse', 'Профиль владельца токена', 'Profile of the token owner'), unauthorized)
        }, secured)
      },
      '/api/auth/logout': {
        post: Object.assign({
          tags: ['Authentication'],
          summary: 'Выход — токен отзывается',
          'x-en': { summary: 'Log out — the token is revoked' },
          description: 'Идентификатор токена (jti) попадает в список отозванных, и следующий запрос с этим же ' +
            'токеном получит 401. Список хранится до конца срока действия токена.',
          responses: Object.assign(ok('LogoutResult', 'Выход выполнен', 'Logged out'), unauthorized)
        }, secured)
      },
      '/api/users': {
        get: Object.assign({
          tags: ['Users'],
          summary: 'Список пользователей (только администратор)',
          'x-en': { summary: 'List users (admin only)' },
          parameters: [
            q('search', 'string', 'Поиск по имени, email и адресу', 'Search by name, email and address'),
            q('role', 'string', 'user или admin', 'user or admin', { enum: ['user', 'admin'] }),
            ...PAGING
          ],
          responses: Object.assign(ok('UserPage', 'Страница пользователей', 'A page of users'), authErrors)
        }, secured)
      },
      '/api/users/{id}': {
        get: Object.assign({
          tags: ['Users'], summary: 'Профиль пользователя', 'x-en': { summary: 'User profile' },
          description: 'Свой профиль видит каждый вошедший, чужой — только администратор.',
          parameters: [pathParam('id', 'id пользователя', 'User id', 'integer')],
          responses: Object.assign(ok('User', 'Профиль найден', 'Profile found'), authErrors, notFound)
        }, secured),
        patch: Object.assign({
          tags: ['Users'], summary: 'Изменить профиль', 'x-en': { summary: 'Update a profile' },
          description: 'Меняются имя, адрес, телефон и пароль. Поле role принимает только администратор — ' +
            'обычный пользователь получит 403 и админом не станет.',
          parameters: [pathParam('id', 'id пользователя', 'User id', 'integer')],
          requestBody: body('UserPatch', { fullName: 'Мансур Сафаров', address: 'Душанбе, Сино' }),
          responses: Object.assign(ok('User', 'Профиль обновлён', 'Profile updated'), badRequest, authErrors, notFound)
        }, secured),
        delete: Object.assign({
          tags: ['Users'], summary: 'Удалить профиль', 'x-en': { summary: 'Delete a profile' },
          parameters: [pathParam('id', 'id пользователя', 'User id', 'integer')],
          responses: Object.assign(ok(null, 'Профиль удалён', 'Profile deleted'), authErrors, notFound)
        }, secured)
      },
      '/api/users/{id}/avatar': {
        get: {
          tags: ['Users'], summary: 'Файл аватара', 'x-en': { summary: 'Avatar file' },
          description: 'Отдаёт саму картинку, а не конверт — ссылку можно вставить прямо в <img src>.',
          parameters: [pathParam('id', 'id пользователя', 'User id', 'integer')],
          responses: Object.assign({
            '200': {
              description: 'Изображение', 'x-en': { description: 'Image' },
              content: { 'image/jpeg': { schema: { type: 'string', format: 'binary' } }, 'image/png': { schema: { type: 'string', format: 'binary' } }, 'image/webp': { schema: { type: 'string', format: 'binary' } } }
            }
          }, notFound)
        }
      },
      '/api/reviews': {
        get: {
          tags: ['Reviews'], summary: 'Все отзывы каталога', 'x-en': { summary: 'All catalog reviews' },
          description: 'Отзывы всех товаров в одном списке — с названием товара у каждого.',
          parameters: [
            q('productId', 'integer', 'Отзывы одного товара', 'Reviews of a single product'),
            q('rating', 'integer', 'Ровно эта оценка', 'Exactly this rating', { minimum: 1, maximum: 5 }),
            q('minRating', 'number', 'Оценка не ниже', 'Minimum rating'),
            q('author', 'string', 'Поиск по автору', 'Search by author'),
            q('search', 'string', 'Поиск по тексту отзыва и названию товара', 'Search in review text and product name'),
            q('sortBy', 'string', 'date или rating', 'date or rating', { enum: ['date', 'rating'] }),
            q('sortDir', 'string', 'asc или desc', 'asc or desc', { enum: ['asc', 'desc'] }),
            ...PAGING
          ],
          responses: ok('ReviewPage', 'Страница отзывов', 'A page of reviews')
        }
      },
      '/api/reviews/{id}': {
        get: {
          tags: ['Reviews'], summary: 'Один отзыв', 'x-en': { summary: 'A single review' },
          parameters: [pathParam('id', 'id отзыва', 'Review id', 'integer')],
          responses: Object.assign(ok('Review', 'Отзыв найден', 'Review found'), notFound)
        },
        patch: Object.assign({
          tags: ['Reviews'], summary: 'Изменить отзыв', 'x-en': { summary: 'Update a review' },
          description: 'Свой отзыв правит автор, любой — администратор. Рейтинг товара пересчитывается сразу.',
          parameters: [pathParam('id', 'id отзыва', 'Review id', 'integer')],
          requestBody: body('ReviewPatch', { rating: 4, comment: 'Пользуемся полгода, всё нравится.' }),
          responses: Object.assign(ok('Review', 'Отзыв обновлён', 'Review updated'), badRequest, authErrors, notFound)
        }, secured),
        delete: Object.assign({
          tags: ['Reviews'], summary: 'Удалить отзыв', 'x-en': { summary: 'Delete a review' },
          parameters: [pathParam('id', 'id отзыва', 'Review id', 'integer')],
          responses: Object.assign(ok(null, 'Отзыв удалён', 'Review deleted'), authErrors, notFound)
        }, secured)
      },
      '/api/images/{slug}.svg': {
        get: {
          tags: ['Catalog'],
          summary: 'Картинка товара, категории или статьи',
          'x-en': { summary: 'Image of a product, category or post', description: 'The API draws images itself, so links never break. Product: its slug. Category: cat-<slug>. Subcategory: sub-<slug>. Post: post-<slug>.' },
          description: 'Картинки рисует сам API, поэтому ссылки не ломаются. Для товара — его slug, для категории — cat-<slug>, для подкатегории — sub-<slug>, для статьи — post-<slug>. Ответ отдаётся в формате SVG.',
          parameters: [
            pathParam('slug', 'slug товара, либо cat-/sub-/post- с нужным slug', 'Product slug, or cat-/sub-/post- prefix'),
            q('variant', 'string', '2 — второй ракурс той же карточки', '2 — a second variant of the same card', { enum: ['2'] })
          ],
          responses: {
            '200': {
              description: 'Изображение', 'x-en': { description: 'Image' },
              content: { 'image/svg+xml': { schema: { type: 'string' } } }
            }
          }
        }
      },
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
        post: Object.assign({
          tags: ['Categories'],
          summary: 'Создать категорию',
          'x-en': { summary: 'Create a category' },
          description: 'Только для администратора: нужен токен из /api/auth/login.',
          requestBody: body('CategoryInput', { name: 'Игрушки для ванной', slug: 'igrushki-dlya-vannoy', description: 'Резиновые и плавающие игрушки', image: '/api/images/cat-umnye-igrushki.svg' }),
          responses: Object.assign({ '201': { description: 'Категория создана', 'x-en': { description: 'Category created' }, content: { 'application/json': { schema: envelope('Category') } } } }, badRequest, authErrors, conflict)
        }, secured)
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
        put: Object.assign({
          tags: ['Categories'], summary: 'Заменить категорию целиком', 'x-en': { summary: 'Replace a category' },
          description: 'PUT требует поле name. Только для администратора: нужен токен из /api/auth/login.',
          parameters: [pathParam('id', 'id категории или slug', 'Category id or slug')],
          requestBody: body('CategoryInput', { name: 'Коляски и переноски', description: 'Обновлённое описание категории' }),
          responses: Object.assign(ok('Category', 'Категория обновлена', 'Category updated'), badRequest, authErrors, notFound)
        }, secured),
        patch: Object.assign({
          tags: ['Categories'], summary: 'Изменить поля категории', 'x-en': { summary: 'Update category fields' },
          description: 'PATCH меняет только присланные поля. Только для администратора: нужен токен из /api/auth/login.',
          parameters: [pathParam('id', 'id категории или slug', 'Category id or slug')],
          requestBody: body('CategoryInput', { description: 'Обновлённое описание категории' }),
          responses: Object.assign(ok('Category', 'Категория обновлена', 'Category updated'), badRequest, authErrors, notFound)
        }, secured),
        delete: Object.assign({
          tags: ['Categories'], summary: 'Удалить категорию', 'x-en': { summary: 'Delete a category' },
          parameters: [pathParam('id', 'id категории или slug', 'Category id or slug')],
          responses: Object.assign(ok(null, 'Категория удалена', 'Category deleted'), authErrors, notFound)
        }, secured)
      },
      '/api/categories/{id}/products': {
        get: {
          tags: ['Categories'], summary: 'Товары категории', 'x-en': { summary: 'Products of a category' },
          description: 'Только массив товаров категории — с фильтрами и сортировкой, как у /api/products.',
          parameters: [
            pathParam('id', 'id категории или slug', 'Category id or slug'),
            q('subcategoryId', 'integer', 'Только эта подкатегория', 'This subcategory only'),
            q('search', 'string', 'Поиск внутри категории', 'Search inside the category'),
            q('minPrice', 'integer', 'Цена от', 'Minimum price'),
            q('maxPrice', 'integer', 'Цена до', 'Maximum price'),
            q('sort', 'string', 'Сортировка', 'Sorting', { enum: ['price_asc', 'price_desc', 'name_asc', 'name_desc', 'newest', 'rating', 'discount'] }),
            ...PAGING
          ],
          responses: Object.assign(ok('CategoryFeed', 'Товары категории', 'Products of the category'), notFound)
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
        post: Object.assign({
          tags: ['Subcategories'], summary: 'Создать подкатегорию', 'x-en': { summary: 'Create a subcategory' },
          description: 'Только для администратора: нужен токен из /api/auth/login.',
          requestBody: body('SubcategoryInput', { name: 'Ходунки', slug: 'hodunki', categoryId: 8 }),
          responses: Object.assign({ '201': { description: 'Подкатегория создана', 'x-en': { description: 'Subcategory created' }, content: { 'application/json': { schema: envelope('Subcategory') } } } }, badRequest, authErrors, conflict, notFound)
        }, secured)
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
        put: Object.assign({
          tags: ['Subcategories'], summary: 'Заменить подкатегорию целиком', 'x-en': { summary: 'Replace a subcategory' },
          description: 'PUT требует поле name. Только для администратора: нужен токен из /api/auth/login.',
          parameters: [pathParam('id', 'id подкатегории или slug', 'Subcategory id or slug')],
          requestBody: body('SubcategoryInput', { name: 'Кроватки-трансформеры' }),
          responses: Object.assign(ok('Subcategory', 'Подкатегория обновлена', 'Subcategory updated'), badRequest, authErrors, notFound)
        }, secured),
        patch: Object.assign({
          tags: ['Subcategories'], summary: 'Изменить поля подкатегории', 'x-en': { summary: 'Update subcategory fields' },
          description: 'PATCH меняет только присланные поля. Только для администратора: нужен токен из /api/auth/login.',
          parameters: [pathParam('id', 'id подкатегории или slug', 'Subcategory id or slug')],
          requestBody: body('SubcategoryInput', { description: 'Новое описание подкатегории' }),
          responses: Object.assign(ok('Subcategory', 'Подкатегория обновлена', 'Subcategory updated'), badRequest, authErrors, notFound)
        }, secured),
        delete: Object.assign({
          tags: ['Subcategories'], summary: 'Удалить подкатегорию', 'x-en': { summary: 'Delete a subcategory' },
          parameters: [pathParam('id', 'id подкатегории или slug', 'Subcategory id or slug')],
          responses: Object.assign(ok(null, 'Подкатегория удалена', 'Subcategory deleted'), authErrors, notFound)
        }, secured)
      },
      '/api/products': {
        get: {
          tags: ['Products'],
          summary: 'Товары: фильтры, поиск, сортировка, пагинация',
          'x-en': { summary: 'Products: filters, search, sorting, pagination', description: 'The main catalog endpoint. All filters can be combined.' },
          description: 'Главный эндпоинт каталога. Все фильтры можно комбинировать между собой.',
          parameters: [
            q('search', 'string', 'Поиск по названию, описанию, бренду, артикулу, категории и подкатегории', 'Search by name, description, brand, article, category and subcategory'),
            q('q', 'string', 'То же, что search — короткая запись', 'Same as search, a shorter alias'),
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
            q('minPrice', 'integer', 'То же, что priceMin', 'Same as priceMin'),
            q('maxPrice', 'integer', 'То же, что priceMax', 'Same as priceMax'),
            q('minRating', 'number', 'То же, что ratingMin', 'Same as ratingMin'),
            q('ageGroup', 'string', 'Возрастные группы через запятую: 0-3 года', 'Comma-separated age groups'),
            q('isPromo', 'boolean', 'То же, что onlyPromo', 'Same as onlyPromo'),
            q('sort', 'string', 'Короткая сортировка одним параметром', 'Sorting in a single parameter',
              { enum: ['price_asc', 'price_desc', 'name_asc', 'name_desc', 'newest', 'rating', 'discount', 'popularity'] }),
            q('sortBy', 'string', 'popularity, price, name, rating, discount, new', 'popularity, price, name, rating, discount, new', { enum: ['popularity', 'price', 'name', 'rating', 'discount', 'new'], default: 'popularity' }),
            q('sortDir', 'string', 'asc — по возрастанию, desc — по убыванию', 'asc or desc', { enum: ['asc', 'desc'], default: 'desc' }),
            q('light', 'boolean', 'true — короткие карточки без отзывов и характеристик', 'true — short cards without reviews and characteristics'),
            ...PAGING
          ],
          responses: ok('ProductPage', 'Страница товаров', 'A page of products')
        },
        post: Object.assign({
          tags: ['Products'], summary: 'Создать товар', 'x-en': { summary: 'Create a product' },
          description: 'Только для администратора: нужен токен из /api/auth/login.',
          requestBody: body('ProductInput', {
            name: 'Кроватка Erbesi Sonia, Италия', price: 42000, oldPrice: 52000,
            categoryId: 2, subcategoryId: 21, brand: 'Erbesi', country: 'Италия',
            image: '/api/images/cat-detskaya-mebel.svg',
            description: 'Кроватка из массива бука с маятниковым механизмом.',
            characteristics: { 'Материал': 'Массив бука', 'Маятник': 'Продольный' },
            colorOptions: ['Белый', 'Слоновая кость'], materials: ['Бук'],
            ageGroup: '0-3 года', inStock: true, isNew: true, isPromo: true
          }),
          responses: Object.assign({ '201': { description: 'Товар создан', 'x-en': { description: 'Product created' }, content: { 'application/json': { schema: envelope('Product') } } } }, badRequest, authErrors)
        }, secured)
      },
      '/api/products/search': {
        get: {
          tags: ['Products'], summary: 'Поиск товаров', 'x-en': { summary: 'Search products' },
          description: 'Ищет без учёта регистра по названию, описанию, бренду, артикулу, названию категории и подкатегории. ' +
            'Те же фильтры и сортировки, что у /api/products.',
          parameters: [
            q('q', 'string', 'Строка поиска, например Nuovita', 'Search string, e.g. Nuovita'),
            q('sort', 'string', 'Сортировка одним параметром', 'Sorting in a single parameter',
              { enum: ['price_asc', 'price_desc', 'name_asc', 'name_desc', 'newest', 'rating', 'discount'] }),
            ...PAGING
          ],
          responses: ok('ProductPage', 'Найденные товары', 'Found products')
        }
      },
      '/api/products/filter': {
        get: {
          tags: ['Products'], summary: 'Фильтр товаров', 'x-en': { summary: 'Filter products' },
          description: 'Тот же набор фильтров, что у /api/products, отдельным адресом.',
          parameters: [
            q('categoryId', 'integer', 'Категория', 'Category'),
            q('subcategoryId', 'integer', 'Подкатегория', 'Subcategory'),
            q('brand', 'string', 'Бренды через запятую', 'Comma-separated brands'),
            q('country', 'string', 'Страны через запятую', 'Comma-separated countries'),
            q('minPrice', 'integer', 'Цена от', 'Minimum price'),
            q('maxPrice', 'integer', 'Цена до', 'Maximum price'),
            q('minRating', 'number', 'Рейтинг не ниже', 'Minimum rating'),
            q('ageGroup', 'string', 'Возрастная группа', 'Age group'),
            q('color', 'string', 'Цвета через запятую', 'Comma-separated colours'),
            q('material', 'string', 'Материалы через запятую', 'Comma-separated materials'),
            q('inStock', 'boolean', 'В наличии', 'In stock'),
            q('isNew', 'boolean', 'Новинки', 'New arrivals'),
            q('isPromo', 'boolean', 'Акционные', 'Promo items'),
            q('sort', 'string', 'Сортировка', 'Sorting', { enum: ['price_asc', 'price_desc', 'name_asc', 'name_desc', 'newest', 'rating', 'discount'] }),
            ...PAGING
          ],
          responses: ok('ProductPage', 'Отобранные товары', 'Filtered products')
        }
      },
      '/api/products/slug/{slug}': {
        get: {
          tags: ['Products'], summary: 'Товар по slug', 'x-en': { summary: 'Product by slug' },
          description: 'Строгий поиск по slug — на случай, когда slug состоит из одних цифр.',
          parameters: [pathParam('slug', 'slug товара', 'Product slug')],
          responses: Object.assign(ok('ProductDetail', 'Товар найден', 'Product found'), notFound)
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
        put: Object.assign({
          tags: ['Products'], summary: 'Заменить товар целиком', 'x-en': { summary: 'Replace a product' },
          description: 'PUT заменяет запись целиком, поэтому name и price обязательны. Только для администратора.',
          parameters: [pathParam('id', 'id товара или slug', 'Product id or slug')],
          requestBody: body('ProductInput', { name: 'Кроватка Erbesi Sonia, Италия', price: 38000, oldPrice: 52000, inStock: false }),
          responses: Object.assign(ok('Product', 'Товар обновлён', 'Product updated'), badRequest, authErrors, notFound)
        }, secured),
        patch: Object.assign({
          tags: ['Products'], summary: 'Изменить отдельные поля товара', 'x-en': { summary: 'Update product fields' },
          description: 'PATCH меняет только присланные поля, остальные остаются как были. Только для администратора.',
          parameters: [pathParam('id', 'id товара или slug', 'Product id or slug')],
          requestBody: body('ProductInput', { price: 38000, inStock: false }),
          responses: Object.assign(ok('Product', 'Товар обновлён', 'Product updated'), badRequest, authErrors, notFound)
        }, secured),
        delete: Object.assign({
          tags: ['Products'], summary: 'Удалить товар', 'x-en': { summary: 'Delete a product' },
          parameters: [pathParam('id', 'id товара или slug', 'Product id or slug')],
          responses: Object.assign(ok(null, 'Товар удалён', 'Product deleted'), authErrors, notFound)
        }, secured)
      },
      '/api/products/{id}/reviews': {
        get: {
          tags: ['Reviews'], summary: 'Отзывы товара', 'x-en': { summary: 'Product reviews' },
          description: 'Все отзывы товара и средний рейтинг.',
          parameters: [pathParam('id', 'id товара', 'Product id', 'integer')],
          responses: { ...ok('ReviewFeed', 'Отзывы товара', 'Product reviews'), ...notFound }
        },
        post: Object.assign({
          tags: ['Reviews'], summary: 'Добавить отзыв', 'x-en': { summary: 'Add a review' },
          description: 'Нужен вход: автор подставляется из профиля, подписаться чужим именем нельзя. ' +
            'Рейтинг товара пересчитывается сразу. Второй отзыв на тот же товар вернёт 409.',
          parameters: [pathParam('id', 'id товара', 'Product id', 'integer')],
          requestBody: body('ReviewInput', { rating: 5, pros: 'Качество, дизайн', cons: 'Не обнаружено', comment: 'Пользуемся месяц — всё отлично, рекомендую.' }),
          responses: Object.assign({ '201': { description: 'Отзыв добавлен', 'x-en': { description: 'Review added' }, content: { 'application/json': { schema: envelope('Review') } } } }, badRequest, unauthorized, conflict, notFound)
        }, secured)
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
        post: Object.assign({
          tags: ['Promotions'], summary: 'Создать акцию', 'x-en': { summary: 'Create a promotion' },
          description: 'Только для администратора: нужен токен из /api/auth/login.',
          requestBody: body('PromotionInput', {
            title: 'Чёрная пятница: коляски -40%', description: 'Скидка 40% на все коляски в течение недели.',
            content: 'Полный текст акции: условия, сроки и порядок получения скидки.',
            discount: 40, categoryId: 3, dateStart: '2026-11-24', dateEnd: '2026-11-30',
            isActive: true, products: [131, 132, 133]
          }),
          responses: Object.assign({ '201': { description: 'Акция создана', 'x-en': { description: 'Promotion created' }, content: { 'application/json': { schema: envelope('Promotion') } } } }, badRequest, authErrors)
        }, secured)
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
        put: Object.assign({
          tags: ['Promotions'], summary: 'Заменить акцию целиком', 'x-en': { summary: 'Replace a promotion' },
          description: 'PUT требует поле title. Только для администратора: нужен токен из /api/auth/login.',
          parameters: [pathParam('id', 'id акции или slug', 'Promotion id or slug')],
          requestBody: body('PromotionInput', { title: 'Чёрная пятница: коляски -25%', discount: 25, isActive: false }),
          responses: Object.assign(ok('Promotion', 'Акция обновлена', 'Promotion updated'), badRequest, authErrors, notFound)
        }, secured),
        patch: Object.assign({
          tags: ['Promotions'], summary: 'Изменить поля акции', 'x-en': { summary: 'Update promotion fields' },
          description: 'PATCH меняет только присланные поля. Только для администратора: нужен токен из /api/auth/login.',
          parameters: [pathParam('id', 'id акции или slug', 'Promotion id or slug')],
          requestBody: body('PromotionInput', { discount: 25, isActive: false }),
          responses: Object.assign(ok('Promotion', 'Акция обновлена', 'Promotion updated'), badRequest, authErrors, notFound)
        }, secured),
        delete: Object.assign({
          tags: ['Promotions'], summary: 'Удалить акцию', 'x-en': { summary: 'Delete a promotion' },
          parameters: [pathParam('id', 'id акции или slug', 'Promotion id or slug')],
          responses: Object.assign(ok(null, 'Акция удалена', 'Promotion deleted'), authErrors, notFound)
        }, secured)
      },
      '/api/blog': {
        get: {
          tags: ['Blog'], summary: 'Статьи блога', 'x-en': { summary: 'Blog posts' },
          description: 'По умолчанию возвращаются только анонсы. Полный текст — параметр full=true.',
          parameters: [
            q('search', 'string', 'Поиск по заголовку, анонсу и тексту статьи', 'Search by title, excerpt and body'),
            q('categoryId', 'integer', 'Статьи, связанные с этой категорией', 'Posts linked to this category'),
            q('categorySlug', 'string', 'То же самое, но по slug категории', 'Same, but by category slug'),
            q('tag', 'string', 'Статьи с этим тегом, например прикорм', 'Posts with this tag'),
            q('sortBy', 'string', 'date, title, readingTime', 'date, title, readingTime', { enum: ['date', 'title', 'readingTime'] }),
            q('sortDir', 'string', 'asc или desc', 'asc or desc', { enum: ['asc', 'desc'] }),
            q('full', 'boolean', 'true — включить полный текст статей', 'true — include full post text'),
            ...PAGING
          ],
          responses: ok('BlogPage', 'Список статей', 'List of posts')
        },
        post: Object.assign({
          tags: ['Blog'], summary: 'Создать статью', 'x-en': { summary: 'Create a post' },
          description: 'Только для администратора: нужен токен из /api/auth/login.',
          requestBody: body('BlogInput', {
            title: 'Как выбрать первую кроватку',
            slug: 'kak-vybrat-pervuyu-krovatku',
            excerpt: 'Разбираем виды кроваток и на что смотреть при покупке',
            content: 'Первый абзац статьи.\n\nВторой абзац статьи.',
            image: '/api/images/cat-detskaya-mebel.svg',
            date: '2026-08-31', readingTime: 6, categoryId: 2
          }),
          responses: Object.assign({ '201': { description: 'Статья создана', 'x-en': { description: 'Post created' }, content: { 'application/json': { schema: envelope('BlogPost') } } } }, badRequest, authErrors, conflict)
        }, secured)
      },
      '/api/blog/{id}': {
        get: {
          tags: ['Blog'], summary: 'Статья по id или slug (+ соседние)',
          'x-en': { summary: 'Post by id or slug (+ neighbours)', description: 'Accepts a numeric id or a slug, e.g. kak-vybrat-krovatku.' },
          description: 'Принимает id или slug, например kak-vybrat-krovatku. Возвращает полный текст и соседние статьи.',
          parameters: [pathParam('id', 'id статьи или slug', 'Post id or slug')],
          responses: { ...ok('BlogPost', 'Статья найдена', 'Post found'), ...notFound }
        },
        put: Object.assign({
          tags: ['Blog'], summary: 'Заменить статью целиком', 'x-en': { summary: 'Replace a post' },
          description: 'PUT требует поле title. Только для администратора: нужен токен из /api/auth/login.',
          parameters: [pathParam('id', 'id статьи или slug', 'Post id or slug')],
          requestBody: body('BlogInput', { title: 'Обновлённый заголовок', content: 'Новый текст статьи.' }),
          responses: Object.assign(ok('BlogPost', 'Статья обновлена', 'Post updated'), badRequest, authErrors, notFound)
        }, secured),
        patch: Object.assign({
          tags: ['Blog'], summary: 'Изменить поля статьи', 'x-en': { summary: 'Update post fields' },
          description: 'PATCH меняет только присланные поля. Только для администратора: нужен токен из /api/auth/login.',
          parameters: [pathParam('id', 'id статьи или slug', 'Post id or slug')],
          requestBody: body('BlogInput', { title: 'Обновлённый заголовок' }),
          responses: Object.assign(ok('BlogPost', 'Статья обновлена', 'Post updated'), badRequest, authErrors, notFound)
        }, secured),
        delete: Object.assign({
          tags: ['Blog'], summary: 'Удалить статью', 'x-en': { summary: 'Delete a post' },
          parameters: [pathParam('id', 'id статьи или slug', 'Post id or slug')],
          responses: Object.assign(ok(null, 'Статья удалена', 'Post deleted'), authErrors, notFound)
        }, secured)
      },
      '/api/blog/slug/{slug}': {
        get: {
          tags: ['Blog'], summary: 'Статья по slug', 'x-en': { summary: 'Post by slug' },
          description: 'Строгий поиск по slug: блоки страницы, хлебные крошки, соседние и похожие статьи.',
          parameters: [pathParam('slug', 'slug статьи, например pervyy-prikorm', 'Post slug, e.g. pervyy-prikorm')],
          responses: Object.assign(ok('BlogPost', 'Статья найдена', 'Post found'), notFound)
        }
      }
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Токен из POST /api/auth/login. Нажмите Authorize и вставьте его — ' +
            'Swagger сам добавит заголовок Authorization: Bearer <токен> ко всем защищённым методам.'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          description: 'Ошибка приходит в том же конверте: data всегда null, текст — в errors, ' +
            'а разбираемый код и подробности по полям — в error',
          properties: {
            data: { type: 'object', nullable: true, example: null },
            errors: { type: 'array', items: { type: 'string' }, example: ['Товар 999 не найден'] },
            statusCode: { type: 'integer', example: 404 },
            message: { type: 'string', example: 'Товар 999 не найден' },
            error: { $ref: '#/components/schemas/ErrorBody' }
          }
        },
        ErrorBody: {
          type: 'object',
          description: 'Код ошибки не зависит от языка сообщения — по нему удобно ветвить логику клиента',
          properties: {
            code: {
              type: 'string',
              enum: ['VALIDATION_ERROR', 'UNAUTHORIZED', 'INVALID_TOKEN', 'TOKEN_REVOKED', 'INVALID_CREDENTIALS',
                'FORBIDDEN', 'NOT_FOUND', 'METHOD_NOT_ALLOWED', 'CONFLICT', 'EMAIL_ALREADY_EXISTS',
                'TEL_ALREADY_EXISTS', 'REVIEW_ALREADY_EXISTS', 'PAYLOAD_TOO_LARGE', 'UNSUPPORTED_MEDIA_TYPE',
                'TOO_MANY_REQUESTS', 'INTERNAL_ERROR'],
              example: 'NOT_FOUND'
            },
            message: { type: 'string', example: 'Товар 999 не найден' },
            details: {
              type: 'array',
              description: 'Разбор по полям — заполняется при ошибке проверки данных',
              items: {
                type: 'object',
                properties: { field: { type: 'string', example: 'email' }, message: { type: 'string', example: 'Некорректный email' } }
              }
            }
          }
        },
        User: {
          type: 'object',
          description: 'Публичный профиль. Ни пароля, ни его хеша здесь нет и быть не может, ' +
            'а телефон всегда неполный: последние цифры закрыты звёздочками.',
          properties: {
            id: { type: 'integer', example: 1 },
            fullName: { type: 'string', example: 'Мансур' },
            tel: { type: 'string', example: '+992900******', description: 'Номер в маскированном виде' },
            email: { type: 'string', example: 'safarov@gmail.com' },
            address: { type: 'string', example: 'Душанбе' },
            avatar: { type: 'string', example: '/api/users/1/avatar', description: 'Пусто, если аватар не загружали' },
            role: { type: 'string', enum: ['user', 'admin'], example: 'user', description: 'Назначается сервером, из тела запроса не принимается' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        UserPage: {
          allOf: [{ $ref: '#/components/schemas/Pagination' },
            { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/User' } } } }]
        },
        UserPatch: {
          type: 'object',
          description: 'Что можно поменять в профиле. Поле role доступно только администратору, ' +
            'email не меняется — он служит логином.',
          properties: {
            fullName: { type: 'string', example: 'Мансур Сафаров' },
            tel: { type: 'string', example: '+992900123456' },
            address: { type: 'string', example: 'Душанбе, Сино' },
            password: { type: 'string', format: 'password', description: 'Новый пароль: минимум 8 символов, буквы и цифры' },
            role: { type: 'string', enum: ['user', 'admin'], description: 'Только для администратора' }
          }
        },
        RegisterForm: {
          type: 'object',
          required: ['fullName', 'tel', 'email', 'password'],
          description: 'Форма регистрации: текстовые поля и файл. Отправляется как multipart/form-data.',
          properties: {
            fullName: { type: 'string', example: 'Мансур' },
            tel: { type: 'string', example: '+992900123456' },
            email: { type: 'string', example: 'safarov@gmail.com' },
            password: { type: 'string', format: 'password', example: 'ExamplePassword123!', description: 'Минимум 8 символов, буквы и цифры' },
            address: { type: 'string', example: 'Душанбе' },
            avatar: {
              type: 'string', format: 'binary',
              description: 'Файл jpg, png или webp не больше 256 КБ. Тип проверяется по содержимому файла.'
            }
          }
        },
        RegisterInput: {
          type: 'object',
          required: ['fullName', 'tel', 'email', 'password'],
          description: 'То же самое обычным JSON — тогда аватар не загружается',
          properties: {
            fullName: { type: 'string' }, tel: { type: 'string' }, email: { type: 'string' },
            password: { type: 'string', format: 'password' }, address: { type: 'string' }
          }
        },
        LoginInput: {
          type: 'object', required: ['email', 'password'],
          properties: {
            email: { type: 'string', example: 'safarov@gmail.com' },
            password: { type: 'string', format: 'password', example: 'ExamplePassword123!' }
          }
        },
        AuthTokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string', description: 'JWT — вставьте его в кнопку Authorize', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            tokenType: { type: 'string', example: 'Bearer' },
            expiresIn: { type: 'integer', description: 'Срок действия, секунд', example: 7200 },
            expiresAt: { type: 'string', format: 'date-time' },
            user: { $ref: '#/components/schemas/User' }
          }
        },
        MeResponse: {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/User' },
            token: {
              type: 'object',
              properties: {
                issuedAt: { type: 'string', format: 'date-time' },
                expiresAt: { type: 'string', format: 'date-time' },
                jti: { type: 'string', description: 'Идентификатор токена — он же попадает в список отозванных при выходе' }
              }
            }
          }
        },
        LogoutResult: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Выход выполнен, токен отозван' },
            userId: { type: 'integer' },
            revokedJti: { type: 'string' },
            revokedUntil: { type: 'string', format: 'date-time' }
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
            id: { type: 'integer', description: 'Сквозной по всему каталогу — по нему работает /api/reviews/{id}' },
            productId: { type: 'integer' },
            productName: { type: 'string', description: 'Приходит в /api/reviews' },
            productSlug: { type: 'string' },
            userId: { type: 'integer', description: 'Есть у отзывов, оставленных через API' },
            author: { type: 'string', example: 'Мария Петрова' },
            date: { type: 'string', example: '2024-05-12' }, rating: { type: 'integer', minimum: 1, maximum: 5 },
            pros: { type: 'string' }, cons: { type: 'string' }, comment: { type: 'string' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        ReviewPage: {
          allOf: [{ $ref: '#/components/schemas/Pagination' },
            { type: 'object', properties: {
              data: { type: 'array', items: { $ref: '#/components/schemas/Review' } },
              averageRating: { type: 'number', example: 4.7 }
            } }]
        },
        ReviewInput: {
          type: 'object', required: ['comment'],
          description: 'Автор не передаётся: его подставляет сервер из профиля вошедшего пользователя',
          properties: {
            rating: { type: 'integer', minimum: 1, maximum: 5, default: 5 },
            pros: { type: 'string' }, cons: { type: 'string' }, comment: { type: 'string' }
          }
        },
        ReviewPatch: {
          type: 'object',
          properties: {
            rating: { type: 'integer', minimum: 1, maximum: 5 },
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
            title: { type: 'string' },
            excerpt: { type: 'string', description: 'Одна строка под заголовком в списке' },
            description: { type: 'string', description: 'Развёрнутое описание: два-три предложения, у каждой статьи своё' },
            date: { type: 'string', example: '2026-03-05' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            readingTime: { type: 'integer', description: 'Примерное время чтения, минут', example: 7 },
            isPublished: { type: 'boolean', example: true },
            categoryId: { type: 'integer', description: 'Категория каталога, с которой связана статья' },
            categoryName: { type: 'string' },
            category: { type: 'string', description: 'То же название категории — короткое имя поля' },
            categorySlug: { type: 'string' },
            categoryUrl: { type: 'string' },
            author: { $ref: '#/components/schemas/BlogAuthor' },
            image: { type: 'string', description: 'Обложка статьи' },
            imageAlt: { type: 'string' },
            images: { type: 'array', items: { type: 'string' }, description: 'Иллюстрации статьи: первая — обложка, остальные внутри текста' },
            tags: { type: 'array', items: { type: 'string' }, example: ['прикорм', 'питание'] },
            highlights: { type: 'array', items: { type: 'string' }, description: 'Коротко о главном — три тезиса, у каждой статьи свои' },
            quote: { type: 'string', description: 'Выделенная цитата статьи' },
            wordCount: { type: 'integer' },
            paragraphCount: { type: 'integer' },
            sections: {
              type: 'array',
              description: 'Готовые блоки страницы в нужном порядке: абзацы, иллюстрация и цитата. ' +
                'Резать content самостоятельно не нужно. В списке /api/blog не приходят — только в одной статье или при full=true.',
              items: { $ref: '#/components/schemas/BlogSection' }
            },
            content: { type: 'string', description: 'Полный текст статьи, абзацы разделены \\n\\n' },
            breadcrumbs: {
              type: 'array', description: 'Хлебные крошки для страницы статьи',
              items: { type: 'object', properties: { name: { type: 'string' }, url: { type: 'string' } } }
            },
            prevPost: { $ref: '#/components/schemas/BlogNeighbour' },
            nextPost: { $ref: '#/components/schemas/BlogNeighbour' },
            related: {
              type: 'array', description: 'Похожие статьи: сначала по общим тегам, потом по категории',
              items: { $ref: '#/components/schemas/BlogNeighbour' }
            }
          }
        },
        BlogAuthor: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Мадина Рахимова' },
            role: { type: 'string', example: 'педиатр' },
            slug: { type: 'string', example: 'madina-rahimova' },
            avatar: { type: 'string', example: '/api/images/author-madina-rahimova.svg' }
          }
        },
        BlogSection: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['paragraph', 'image', 'quote'] },
            text: { type: 'string', description: 'У абзаца и цитаты' },
            url: { type: 'string', description: 'У иллюстрации' },
            alt: { type: 'string', description: 'У иллюстрации' },
            author: { type: 'string', description: 'У цитаты' }
          }
        },
        BlogNeighbour: {
          type: 'object', nullable: true,
          properties: {
            id: { type: 'integer' }, slug: { type: 'string' },
            title: { type: 'string' }, image: { type: 'string' },
            excerpt: { type: 'string' }, readingTime: { type: 'integer' }, url: { type: 'string' }
          }
        },
        BlogInput: {
          type: 'object', required: ['title'],
          properties: {
            title: { type: 'string' }, slug: { type: 'string' }, excerpt: { type: 'string' },
            content: { type: 'string' }, image: { type: 'string' },
            images: { type: 'array', items: { type: 'string' } },
            tags: { type: 'array', items: { type: 'string' } },
            description: { type: 'string' },
            highlights: { type: 'array', items: { type: 'string' } },
            quote: { type: 'string' }, date: { type: 'string' },
            isPublished: { type: 'boolean' },
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
