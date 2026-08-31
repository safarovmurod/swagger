// OpenAPI / Swagger specification
// Ин файл-ро Swagger UI мехонад ва ҳамаи endpointҳоро нишон медиҳад

const { categories, products } = require('./_lib/data');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const spec = {
    openapi: "3.0.0",
    info: {
      title: "Kids Shop API — Интернет-магазин товаров для детей",
      version: "1.0.0",
      description: "REST API для интернет-магазина детских товаров. Возвращает категории, товары, описания, цены и изображения. Любой может использовать GET-запросы для получения данных.",
      contact: {
        name: "safarovmurod",
        url: "https://github.com/safarovmurod"
      }
    },
    servers: [
      { url: req.headers['x-forwarded-proto'] + '://' + req.headers['x-forwarded-host'] || 'https://your-app.vercel.app', description: "Production" }
    ],
    paths: {
      "/api/categories": {
        get: {
          tags: ["Category"],
          summary: "Получить все категории товаров",
          description: "Возвращает список категорий с пагинацией и поиском",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 }, description: "Номер страницы" },
            { name: "pageSize", in: "query", schema: { type: "integer", default: 10 }, description: "Количество на странице" },
            { name: "search", in: "query", schema: { type: "string" }, description: "Поиск по названию" }
          ],
          responses: {
            "200": {
              description: "Список категорий",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      items: { type: "array", items: { $ref: "#/components/schemas/Category" } },
                      totalCount: { type: "integer" },
                      page: { type: "integer" },
                      pageSize: { type: "integer" },
                      totalPages: { type: "integer" }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/api/categories/{id}": {
        get: {
          tags: ["Category"],
          summary: "Получить категорию по ID",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "integer" } }
          ],
          responses: {
            "200": { description: "Категория найдена" },
            "404": { description: "Не найдена" }
          }
        }
      },
      "/api/products": {
        get: {
          tags: ["Product"],
          summary: "Получить все товары",
          description: "Возвращает список товаров с пагинацией, поиском, фильтрацией и сортировкой",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "pageSize", in: "query", schema: { type: "integer", default: 10 } },
            { name: "search", in: "query", schema: { type: "string" }, description: "Поиск по названию и описанию" },
            { name: "categoryId", in: "query", schema: { type: "integer" }, description: "Фильтр по категории" },
            { name: "inStock", in: "query", schema: { type: "boolean" }, description: "Только в наличии" },
            { name: "sortBy", in: "query", schema: { type: "string", default: "id" }, description: "Сортировка: id, name, price, rating" },
            { name: "sortDir", in: "query", schema: { type: "string", default: "asc" }, description: "asc или desc" }
          ],
          responses: {
            "200": {
              description: "Список товаров",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      items: { type: "array", items: { $ref: "#/components/schemas/Product" } },
                      totalCount: { type: "integer" },
                      page: { type: "integer" },
                      pageSize: { type: "integer" },
                      totalPages: { type: "integer" }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/api/products/{id}": {
        get: {
          tags: ["Product"],
          summary: "Получить товар по ID",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "integer" } }
          ],
          responses: {
            "200": { description: "Товар найден" },
            "404": { description: "Не найден" }
          }
        }
      }
    },
    components: {
      schemas: {
        Category: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "Игрушки" },
            description: { type: "string", example: "Развивающие игры и игрушки для всех возрастов" },
            image: { type: "string", example: "https://images.unsplash.com/..." },
            slug: { type: "string", example: "toys" },
            productCount: { type: "integer", example: 5 }
          }
        },
        Product: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "Конструктор «Город» 120 деталей" },
            description: { type: "string", example: "Развивающий конструктор с 120 яркими деталями" },
            price: { type: "number", example: 145 },
            oldPrice: { type: "number", nullable: true, example: 180 },
            categoryId: { type: "integer", example: 1 },
            categoryName: { type: "string", example: "Игрушки" },
            image: { type: "string", example: "https://images.unsplash.com/..." },
            rating: { type: "number", example: 4.8 },
            inStock: { type: "boolean", example: true },
            ageGroup: { type: "string", example: "3-7 лет" }
          }
        }
      }
    }
  };

  res.json(spec);
};
