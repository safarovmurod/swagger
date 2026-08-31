const { categories, products, blog, promotions } = require('../lib/data');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const baseUrl = (req.headers['x-forwarded-proto'] || 'https') + '://' + (req.headers['x-forwarded-host'] || 'localhost');

  res.json({
    openapi: "3.0.0",
    info: {
      title: "Карапуз API — Интернет-магазин товаров для детей",
      version: "2.0.0",
      description: "REST API для интернет-магазина детских товаров. CRUD для категорий, товаров, отзывов, блога и акций. С фильтрами, поиском, пагинацией и сортировкой.",
      contact: { name: "safarovmurod", url: "https://github.com/safarovmurod" }
    },
    servers: [{ url: baseUrl, description: "Production" }],
    paths: {
      "/api/categories": {
        get: { tags: ["Category"], summary: "Все категории (pagination, search)", parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 10 } },
          { name: "search", in: "query", schema: { type: "string" } }
        ], responses: { "200": { description: "OK" } } },
        post: { tags: ["Category"], summary: "Создать категорию", responses: { "201": { description: "Created" } } }
      },
      "/api/categories/{id}": {
        get: { tags: ["Category"], summary: "Категория по ID + товары", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "OK" } } },
        put: { tags: ["Category"], summary: "Обновить категорию", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "OK" } } },
        delete: { tags: ["Category"], summary: "Удалить категорию", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "OK" } } }
      },
      "/api/products": {
        get: { tags: ["Product"], summary: "Все товары (filter, search, sort, pagination)", parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 10 } },
          { name: "search", in: "query", schema: { type: "string" }, description: "Поиск по названию, описанию, бренду" },
          { name: "categoryId", in: "query", schema: { type: "integer" }, description: "Фильтр по категории" },
          { name: "onlyPromo", in: "query", schema: { type: "boolean" }, description: "Только акции" },
          { name: "isNew", in: "query", schema: { type: "boolean" }, description: "Только новинки" },
          { name: "inStock", in: "query", schema: { type: "boolean" } },
          { name: "brand", in: "query", schema: { type: "string" }, description: "Бренды через запятую" },
          { name: "color", in: "query", schema: { type: "string" }, description: "Цвета через запятую" },
          { name: "material", in: "query", schema: { type: "string" }, description: "Материалы через запятую" },
          { name: "priceMin", in: "query", schema: { type: "integer" } },
          { name: "priceMax", in: "query", schema: { type: "integer" } },
          { name: "sortBy", in: "query", schema: { type: "string", default: "popularity" }, description: "popularity, price, name, rating, new" },
          { name: "sortDir", in: "query", schema: { type: "string", default: "desc" }, description: "asc или desc" }
        ], responses: { "200": { description: "OK" } } },
        post: { tags: ["Product"], summary: "Создать товар", responses: { "201": { description: "Created" } } }
      },
      "/api/products/{id}": {
        get: { tags: ["Product"], summary: "Товар по ID (с характеристиками и отзывами)", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "OK" } } },
        put: { tags: ["Product"], summary: "Обновить товар", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "OK" } } },
        delete: { tags: ["Product"], summary: "Удалить товар", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "OK" } } }
      },
      "/api/products/{id}/reviews": {
        get: { tags: ["Reviews"], summary: "Отзывы товара", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "OK" } } },
        post: { tags: ["Reviews"], summary: "Добавить отзыв", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "201": { description: "Created" } } }
      },
      "/api/blog": {
        get: { tags: ["Blog"], summary: "Все статьи (pagination, search)", parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 12 } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "full", in: "query", schema: { type: "boolean" }, description: "Включить полный текст" }
        ], responses: { "200": { description: "OK" } } },
        post: { tags: ["Blog"], summary: "Создать статью", responses: { "201": { description: "Created" } } }
      },
      "/api/blog/{id}": {
        get: { tags: ["Blog"], summary: "Статья по ID (+ следующая статья)", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "OK" } } },
        put: { tags: ["Blog"], summary: "Обновить статью", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "OK" } } },
        delete: { tags: ["Blog"], summary: "Удалить статью", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "OK" } } }
      },
      "/api/promotions": {
        get: { tags: ["Promotions"], summary: "Все акции (pagination, search)", parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 10 } },
          { name: "search", in: "query", schema: { type: "string" } }
        ], responses: { "200": { description: "OK" } } },
        post: { tags: ["Promotions"], summary: "Создать акцию", responses: { "201": { description: "Created" } } }
      },
      "/api/promotions/{id}": {
        get: { tags: ["Promotions"], summary: "Акция по ID", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "OK" } } },
        put: { tags: ["Promotions"], summary: "Обновить акцию", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "OK" } } },
        delete: { tags: ["Promotions"], summary: "Удалить акцию", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "OK" } } }
      }
    },
    components: {
      schemas: {
        Product: { type: "object", properties: {
          id: { type: "integer" }, name: { type: "string" }, price: { type: "number" }, oldPrice: { type: "number", nullable: true },
          categoryId: { type: "integer" }, categoryName: { type: "string" }, article: { type: "string" },
          brand: { type: "string" }, country: { type: "string" }, image: { type: "string" },
          description: { type: "string" }, characteristics: { type: "object" },
          colorOptions: { type: "array", items: { type: "string" } }, materials: { type: "array", items: { type: "string" } },
          ageGroup: { type: "string" }, rating: { type: "number" }, reviewCount: { type: "integer" },
          inStock: { type: "boolean" }, isNew: { type: "boolean" }, isPromo: { type: "boolean" },
          reviews: { type: "array", items: { type: "object" } }
        }},
        Review: { type: "object", properties: {
          id: { type: "integer" }, author: { type: "string" }, date: { type: "string" },
          rating: { type: "integer" }, pros: { type: "string" }, cons: { type: "string" }, comment: { type: "string" }
        }},
        BlogPost: { type: "object", properties: {
          id: { type: "integer" }, title: { type: "string" }, excerpt: { type: "string" },
          date: { type: "string" }, image: { type: "string" }, content: { type: "string" }
        }},
        Promotion: { type: "object", properties: {
          id: { type: "integer" }, title: { type: "string" }, description: { type: "string" },
          image: { type: "string" }, discount: { type: "integer" }, date: { type: "string" }, products: { type: "array", items: { type: "integer" } }
        }}
      }
    }
  });
};
