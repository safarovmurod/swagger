# Kids Shop API — Интернет-магазин товаров для детей

REST API с категориями, товарами, ценами, описаниями и изображениями. Готово к деплою на Vercel.

## 🚀 Deploy to Vercel (2 минуты)

### Способ 1 — Через CLI

```bash
cd kids-shop-api
npm i -g vercel        # установить Vercel CLI
vercel                 # deploy (первый раз — вход)
vercel --prod          # production deploy
```

### Способ 2 — Через GitHub

1. Загрузи папку `kids-shop-api` на GitHub
2. Зайди на [vercel.com](https://vercel.com) → New Project
3. Выбери репозиторий → Deploy

### Способ 3 — Перетаскивание

1. Зайди на [vercel.com/new](https://vercel.com/new)
2. Перетащи папку `kids-shop-api`

---

## 📋 Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/categories` | Все категории (pagination, search) |
| GET | `/api/categories/{id}` | Категория по ID + товары |
| GET | `/api/products` | Все товары (pagination, search, filter, sort) |
| GET | `/api/products/{id}` | Товар по ID |
| GET | `/api/swagger.json` | OpenAPI спецификация |
| GET | `/swagger` | Swagger UI (документация) |

---

## 🔍 Примеры запросов

```bash
# Все категории
GET https://your-app.vercel.app/api/categories

# Категории с поиском
GET https://your-app.vercel.app/api/categories?search=игрушки

# Товары с пагинацией
GET https://your-app.vercel.app/api/products?page=1&pageSize=5

# Товары по категории
GET https://your-app.vercel.app/api/products?categoryId=1

# Поиск товаров
GET https://your-app.vercel.app/api/products?search=конструктор

# Сортировка по цене
GET https://your-app.vercel.app/api/products?sortBy=price&sortDir=asc

# Только в наличии
GET https://your-app.vercel.app/api/products?inStock=true

# Swagger UI
https://your-app.vercel.app/swagger
```

---

## 📊 Данные

- **8 категорий**: Игрушки, Одежда, Обувь, Книги, Детская комната, Гигиена, Питание, Спорт
- **25 товаров** с: name, description, price, oldPrice, image, rating, inStock, ageGroup
- Все изображения — Unsplash (бесплатные)

---

## 🎨 Использование с Figma

1. Открой Swagger UI: `https://your-app.vercel.app/swagger`
2. Нажми на любой endpoint → Try it out → Execute
3. Получи JSON-ответ с данными
4. В Figma используй данные для заполнения дизайна:
   - Категории → секции на главной
   - Товары → карточки товаров
   - Изображения → `<img src="...">` или Image fill
