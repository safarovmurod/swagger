# Готовые ссылки — все GET-запросы

Адрес сервера: `https://swagger-wheat.vercel.app`. Локально замените его на `http://localhost:3000`.

Под каждой ссылкой две строки: что она возвращает и какие массивы лежат в ответе.
Массив, по которому идёт `.map()`, всегда в `data` — так во всех списках.
Из чего состоит один элемент каждого массива, показано в конце файла.

`page` и `pageSize` можно менять или убирать совсем — по умолчанию всё равно
первая страница по 20 записей. Файл собирается командой `npm run links`,
руками его править бессмысленно.

## Каталог

Главное, ради чего API писался: у каждой категории и подкатегории свой адрес.
Ответ у всех одинаковый по составу — меняются только сами товары.

### Акции

`https://swagger-wheat.vercel.app/api/akcii?page=1&pageSize=20`  
Акции — вся категория, 60 товаров  
Массивы: data — 20 товаров, subcategories — 3 подкатегории · Объекты: category

`https://swagger-wheat.vercel.app/api/akcii/skidki-nedeli?page=1&pageSize=20`  
Акции → Скидки недели  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/akcii/rasprodazha-ostatkov?page=1&pageSize=20`  
Акции → Распродажа остатков  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/akcii/nabory-k-vypiske?page=1&pageSize=20`  
Акции → Наборы к выписке  
Массивы: data — 20 товаров · Объекты: subcategory, category

### Детская мебель

`https://swagger-wheat.vercel.app/api/detskaya-mebel?page=1&pageSize=20`  
Детская мебель — вся категория, 120 товаров  
Массивы: data — 20 товаров, subcategories — 6 подкатегорий · Объекты: category

`https://swagger-wheat.vercel.app/api/detskaya-mebel/krovatki?page=1&pageSize=20`  
Детская мебель → Кроватки  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/detskaya-mebel/kolybeli?page=1&pageSize=20`  
Детская мебель → Колыбели  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/detskaya-mebel/lyulki?page=1&pageSize=20`  
Детская мебель → Люльки  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/detskaya-mebel/pelenalnye-komody?page=1&pageSize=20`  
Детская мебель → Пеленальные комоды  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/detskaya-mebel/shkafy?page=1&pageSize=20`  
Детская мебель → Шкафы  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/detskaya-mebel/aksessuary?page=1&pageSize=20`  
Детская мебель → Аксессуары  
Массивы: data — 20 товаров · Объекты: subcategory, category

### Коляски

`https://swagger-wheat.vercel.app/api/kolyaski?page=1&pageSize=20`  
Коляски — вся категория, 60 товаров  
Массивы: data — 20 товаров, subcategories — 3 подкатегории · Объекты: category

`https://swagger-wheat.vercel.app/api/kolyaski/progulochnye?page=1&pageSize=20`  
Коляски → Прогулочные  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/kolyaski/transformery?page=1&pageSize=20`  
Коляски → Трансформеры  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/kolyaski/dlya-dvoyni?page=1&pageSize=20`  
Коляски → Для двойни  
Массивы: data — 20 товаров · Объекты: subcategory, category

### Автокресла

`https://swagger-wheat.vercel.app/api/avtokresla?page=1&pageSize=20`  
Автокресла — вся категория, 120 товаров  
Массивы: data — 20 товаров, subcategories — 6 подкатегорий · Объекты: category

`https://swagger-wheat.vercel.app/api/avtokresla/gruppa-0-plus?page=1&pageSize=20`  
Автокресла → Группа 0+  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/avtokresla/gruppa-1?page=1&pageSize=20`  
Автокресла → Группа 1  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/avtokresla/gruppa-2-3?page=1&pageSize=20`  
Автокресла → Группа 2-3  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/avtokresla/gruppa-0-1?page=1&pageSize=20`  
Автокресла → Группа 0+/1  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/avtokresla/bustery?page=1&pageSize=20`  
Автокресла → Бустеры  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/avtokresla/aksessuary-avtokresla?page=1&pageSize=20`  
Автокресла → Аксессуары для автокресел  
Массивы: data — 20 товаров · Объекты: subcategory, category

### Одежда

`https://swagger-wheat.vercel.app/api/odezhda?page=1&pageSize=20`  
Одежда — вся категория, 60 товаров  
Массивы: data — 20 товаров, subcategories — 3 подкатегории · Объекты: category

`https://swagger-wheat.vercel.app/api/odezhda/dlya-novorozhdennyh?page=1&pageSize=20`  
Одежда → Для новорождённых  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/odezhda/malchikam?page=1&pageSize=20`  
Одежда → Мальчикам  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/odezhda/devochkam?page=1&pageSize=20`  
Одежда → Девочкам  
Массивы: data — 20 товаров · Объекты: subcategory, category

### Кормление

`https://swagger-wheat.vercel.app/api/kormlenie?page=1&pageSize=20`  
Кормление — вся категория, 120 товаров  
Массивы: data — 20 товаров, subcategories — 6 подкатегорий · Объекты: category

`https://swagger-wheat.vercel.app/api/kormlenie/butylochki?page=1&pageSize=20`  
Кормление → Бутылочки  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/kormlenie/soski-pustyshki?page=1&pageSize=20`  
Кормление → Соски и пустышки  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/kormlenie/molokootsosy?page=1&pageSize=20`  
Кормление → Молокоотсосы  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/kormlenie/stulchiki?page=1&pageSize=20`  
Кормление → Стульчики для кормления  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/kormlenie/detskaya-posuda?page=1&pageSize=20`  
Кормление → Детская посуда  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/kormlenie/detskoe-pitanie?page=1&pageSize=20`  
Кормление → Детское питание  
Массивы: data — 20 товаров · Объекты: subcategory, category

### Гигиена и уход

`https://swagger-wheat.vercel.app/api/gigiena-i-uhod?page=1&pageSize=20`  
Гигиена и уход — вся категория, 120 товаров  
Массивы: data — 20 товаров, subcategories — 6 подкатегорий · Объекты: category

`https://swagger-wheat.vercel.app/api/gigiena-i-uhod/podguzniki?page=1&pageSize=20`  
Гигиена и уход → Подгузники  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/gigiena-i-uhod/kupanie?page=1&pageSize=20`  
Гигиена и уход → Купание  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/gigiena-i-uhod/uhod-za-kozhey?page=1&pageSize=20`  
Гигиена и уход → Уход за кожей  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/gigiena-i-uhod/polotenca-halaty?page=1&pageSize=20`  
Гигиена и уход → Полотенца и халаты  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/gigiena-i-uhod/aptechka-gradusniki?page=1&pageSize=20`  
Гигиена и уход → Аптечка и градусники  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/gigiena-i-uhod/strizhka-manikur?page=1&pageSize=20`  
Гигиена и уход → Стрижка и маникюр  
Массивы: data — 20 товаров · Объекты: subcategory, category

### Умные игрушки

`https://swagger-wheat.vercel.app/api/umnye-igrushki?page=1&pageSize=20`  
Умные игрушки — вся категория, 120 товаров  
Массивы: data — 20 товаров, subcategories — 6 подкатегорий · Объекты: category

`https://swagger-wheat.vercel.app/api/umnye-igrushki/razvivayushchie?page=1&pageSize=20`  
Умные игрушки → Развивающие  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/umnye-igrushki/konstruktory?page=1&pageSize=20`  
Умные игрушки → Конструкторы  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/umnye-igrushki/muzykalnye?page=1&pageSize=20`  
Умные игрушки → Музыкальные  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/umnye-igrushki/interaktivnye?page=1&pageSize=20`  
Умные игрушки → Интерактивные  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/umnye-igrushki/obuchayushchie-planshety?page=1&pageSize=20`  
Умные игрушки → Обучающие планшеты  
Массивы: data — 20 товаров · Объекты: subcategory, category

`https://swagger-wheat.vercel.app/api/umnye-igrushki/myagkie-igrushki?page=1&pageSize=20`  
Умные игрушки → Мягкие игрушки  
Массивы: data — 20 товаров · Объекты: subcategory, category

## Категории

Список категорий и одна категория с товарами.

`https://swagger-wheat.vercel.app/api/categories?page=1&pageSize=20`  
Список категорий с подкатегориями  
Массивы: data — 8 категорий

`https://swagger-wheat.vercel.app/api/categories/kolyaski?page=1&pageSize=20`  
Категория по id или slug + её товары  
Массивы: data — 20 товаров, subcategories — 3 подкатегории · Объекты: category

`https://swagger-wheat.vercel.app/api/categories/kolyaski/products?page=1&pageSize=20`  
Товары категории  
Массивы: data — 20 товаров, subcategories — 3 подкатегории · Объекты: category

## Подкатегории

Подкатегории и массив товаров каждой из них.

`https://swagger-wheat.vercel.app/api/subcategories?page=1&pageSize=20`  
Список всех подкатегорий  
Массивы: data — 20 подкатегорий

`https://swagger-wheat.vercel.app/api/subcategories/krovatki?page=1&pageSize=20`  
Подкатегория + массив её товаров  
Массивы: data — 20 товаров · Объекты: subcategory, category

## Товары

Товары: фильтры, поиск, сортировка, CRUD.

`https://swagger-wheat.vercel.app/api/products?page=1&pageSize=20`  
Товары: фильтры, поиск, сортировка, пагинация  
Массивы: data — 20 товаров

`https://swagger-wheat.vercel.app/api/products/search?search=Feretti&page=1&pageSize=20`  
Поиск товаров  
Массивы: data — 7 товаров

`https://swagger-wheat.vercel.app/api/products/filter?onlyPromo=true&priceMax=20000&sortBy=price&sortDir=asc&page=1&pageSize=20`  
Фильтр товаров  
Массивы: data — 20 товаров

`https://swagger-wheat.vercel.app/api/products/slug/tovar-nedeli-nuovita-day-offer-1`  
Товар по slug  
Массивы: data.images — 1 картинка, data.colorOptions — 3 цвета, data.materials — 3 материала, data.reviews — 2 отзыва, data.similar — 8 товаров · Объекты: data

`https://swagger-wheat.vercel.app/api/products/1`  
Товар по id или slug (+ похожие)  
Массивы: data.images — 1 картинка, data.colorOptions — 3 цвета, data.materials — 3 материала, data.reviews — 2 отзыва, data.similar — 8 товаров · Объекты: data

## Отзывы

Отзывы покупателей на товары.

`https://swagger-wheat.vercel.app/api/reviews?page=1&pageSize=20`  
Все отзывы каталога  
Массивы: data — 20 отзывов

`https://swagger-wheat.vercel.app/api/reviews/1`  
Один отзыв  
Объекты: data

`https://swagger-wheat.vercel.app/api/products/1/reviews`  
Отзывы товара  
Массивы: data — 2 отзыва · Объекты: product

## Акции

Акции — по одной на каждую категорию, с полным текстом.

`https://swagger-wheat.vercel.app/api/promotions?page=1&pageSize=20`  
Список акций  
Массивы: data — 8 акций

`https://swagger-wheat.vercel.app/api/promotions/akciya-nabory-k-vypiske?page=1&pageSize=20`  
Одна акция: полный текст + её товары  
Массивы: data.products — 12 товаров, data.productDetails — 12 · Объекты: data

## Блог

Статьи блога магазина.

`https://swagger-wheat.vercel.app/api/blog?page=1&pageSize=20`  
Статьи блога  
Массивы: data — 20 статей

`https://swagger-wheat.vercel.app/api/blog/1`  
Статья по id или slug (+ соседние)  
Массивы: data.images — 2 картинки, data.tags — 3 тега, data.highlights — 3 тезиса, data.sections — 7 блоков, data.breadcrumbs — 4 шага, data.related — 3 статьи · Объекты: data

`https://swagger-wheat.vercel.app/api/blog/slug/pitanie-v-pervom-trimestre`  
Статья по slug  
Массивы: data.images — 2 картинки, data.tags — 3 тега, data.highlights — 3 тезиса, data.sections — 7 блоков, data.breadcrumbs — 4 шага, data.related — 3 статьи · Объекты: data

## Картинки

Картинки каталога рисует сам API.

`https://swagger-wheat.vercel.app/api/images/cat-akcii.svg`  
Картинка товара, категории или статьи  
Ответ — сама картинка (SVG), не JSON

## Аккаунт

Аккаунт создаётся одним `POST /api/users` — это не ссылка, её так не откроешь.
А вот загруженная фотография отдаётся обычным GET, её и вставляют в `<img src>`
(вместо `1` — тот `id`, что пришёл в ответе на регистрацию).

`https://swagger-wheat.vercel.app/api/users/1/avatar`  
Фотография пользователя 1 — квадрат 512×512 JPEG  
Ответ — сам файл JPEG, не JSON

## Из чего состоит один элемент

Массивы здесь показаны пустыми — важны имена полей. Что лежит внутри каждого
массива, смотрите в соседнем блоке: `reviews` — это отзывы, `subcategories` —
подкатегории, и так далее. Длинные тексты обрезаны многоточием.

### Конверт — он одинаковый у всех ответов

```json
{
  "data": "массив у списков, объект у одной записи, null у ошибки",
  "errors": [],
  "statusCode": 200,
  "page": 1,
  "pageSize": 20,
  "total": 780,
  "totalPages": 39
}
```

Поля `page`, `pageSize`, `total`, `totalPages` есть только у списков.
У ошибки рядом с `errors` приходит ещё `error` с полями `code`, `message`, `details`.

### Один товар — элемент массива `data`

```json
{
  "id": 1,
  "name": "Товар недели Nuovita Day Offer, Италия",
  "slug": "tovar-nedeli-nuovita-day-offer-1",
  "price": 9850,
  "oldPrice": 15150,
  "discount": 35,
  "categoryId": 1,
  "categoryName": "Акции",
  "categorySlug": "akcii",
  "subcategoryId": 11,
  "subcategoryName": "Скидки недели",
  "subcategorySlug": "skidki-nedeli",
  "article": "Арт. 100007-0001",
  "brand": "Nuovita",
  "country": "Италия",
  "image": "https://swagger-wheat.vercel.app/assets/products…",
  "images": [],
  "description": "Товар недели Nuovita Day Offer — цена…",
  "characteristics": {
    "Срок акции": "до конца недели",
    "Ограничение": "Не более 3 штук в руки",
    "Остаток на складе": "менее 25 шт",
    "Гарантия": "24 месяца",
    "Бренд": "Nuovita",
    "Страна производства": "Италия"
  },
  "colorOptions": [],
  "materials": [],
  "ageGroup": "0-3 года",
  "rating": 5,
  "reviewCount": 2,
  "inStock": true,
  "isNew": false,
  "isPromo": true,
  "reviews": [],
  "similar": []
}
```

### Одна категория — элемент массива `data` у `/api/categories`

```json
{
  "id": 1,
  "name": "Акции",
  "slug": "akcii",
  "description": "Скидки, распродажи и специальные пред…",
  "image": "https://swagger-wheat.vercel.app/api/images/cat-…",
  "productCount": 60,
  "info": {
    "note": "В разделе собрано всё, на что сейчас …",
    "howToChoose": "Смотрите на дату окончания акции — ча…",
    "delivery": "Акционные товары едут теми же сроками…",
    "warranty": "Скидка не влияет на гарантию: она так…",
    "payment": "Оплата картой онлайн или при получени…"
  },
  "subcategories": [],
  "url": "https://swagger-wheat.vercel.app/api/akcii",
  "subcategoryCount": 3
}
```

### Одна подкатегория — элемент массива `subcategories`

```json
{
  "id": 11,
  "name": "Скидки недели",
  "slug": "skidki-nedeli",
  "description": "Товары недели по сниженной цене: подб…",
  "image": "https://swagger-wheat.vercel.app/api/images/sub-…",
  "categoryId": 1,
  "categoryName": "Акции",
  "categorySlug": "akcii",
  "url": "https://swagger-wheat.vercel.app/api/akcii/skidk…",
  "productCount": 20
}
```

### Один отзыв — элемент массива `reviews`

```json
{
  "id": 1,
  "productId": 1,
  "author": "Диана Шарипова",
  "date": "2020-10-28",
  "rating": 5,
  "pros": "Комплектация полная",
  "cons": "Инструкция не очень понятная",
  "comment": "Брали по совету подруги, довольны. Ре…",
  "productName": "Товар недели Nuovita Day Offer, Италия",
  "productSlug": "tovar-nedeli-nuovita-day-offer-1"
}
```

### Одна акция — элемент массива `data` у `/api/promotions`

```json
{
  "id": 1,
  "slug": "akciya-nabory-k-vypiske",
  "title": "Неделя готовых наборов: собрали за вас",
  "description": "Наборы к выписке и первым месяцам — д…",
  "image": "https://swagger-wheat.vercel.app/api/images/cat-…",
  "discount": 35,
  "categoryId": 1,
  "categoryName": "Акции",
  "dateStart": "2026-02-02",
  "dateEnd": "2026-02-09",
  "date": "2026-02-02",
  "isActive": true,
  "productCount": 12,
  "products": [],
  "productDetails": []
}
```

### Одна статья блога — элемент массива `data` у `/api/blog`

```json
{
  "id": 1,
  "slug": "pitanie-v-pervom-trimestre",
  "title": "Питание в I триместре",
  "excerpt": "Что есть в первые месяцы беременности…",
  "description": "Разбираем рацион первого триместра бе…",
  "date": "2026-01-14",
  "createdAt": "2026-01-14T09:00:00.000Z",
  "updatedAt": "2026-01-14T09:00:00.000Z",
  "readingTime": 5,
  "isPublished": true,
  "categoryId": 6,
  "categoryName": "Кормление",
  "category": "Кормление",
  "categorySlug": "kormlenie",
  "categoryUrl": "https://swagger-wheat.vercel.app/api/kormlenie",
  "author": {
    "name": "Наталья Гафурова",
    "role": "акушер-гинеколог",
    "slug": "natalya-gafurova",
    "avatar": "https://swagger-wheat.vercel.app/api/images/auth…"
  },
  "image": "https://swagger-wheat.vercel.app/api/images/post…",
  "images": [],
  "imageAlt": "Питание в I триместре",
  "tags": [],
  "highlights": [],
  "quote": "Есть «за двоих» не нужно: прибавка в …",
  "wordCount": 181,
  "paragraphCount": 5
}
```

В списке у статьи нет самого текста. Одна статья (`/api/blog/1`) добавляет
`content`, готовые блоки страницы `sections`, `breadcrumbs`, `prevPost`, `nextPost`
и массив `related` — из них страница статьи собирается одним запросом.

### Аккаунт — ответ на `POST /api/users`

```json
{
  "id": 2,
  "fullName": "Ма*****",
  "tel": "+9929001*****",
  "email": "saf*****@gmail.com",
  "address": "Душ*****",
  "avatar": "",
  "role": "user",
  "createdAt": "2026-09-02T14:26:24.453Z",
  "updatedAt": "2026-09-02T14:26:24.453Z"
}
```

Личные данные закрыты звёздочками — так и задумано. `id` сохраните: он нужен,
чтобы потом сохранить изменения тем же `POST /api/users`.

---

Всего ссылок: 67. Полное описание каждой — на странице `https://swagger-wheat.vercel.app/`.
