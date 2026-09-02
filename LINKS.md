# Готовые ссылки — все GET-запросы

Адрес сервера: `https://swagger-wheat.vercel.app`. Локально замените его на `http://localhost:3000`.

Под каждой ссылкой написано, что она возвращает. `page` и `pageSize` можно
менять или убирать совсем — по умолчанию всё равно первая страница по 20 записей.
Файл собирается командой `npm run links`, руками его править бессмысленно.

## Каталог

Главное, ради чего API писался: у каждой категории и подкатегории свой адрес.
В ответе — сами товары в `data`, описание раздела рядом.

### Акции

`https://swagger-wheat.vercel.app/api/akcii?page=1&pageSize=20`  
Акции — вся категория, 60 товаров

`https://swagger-wheat.vercel.app/api/akcii/skidki-nedeli?page=1&pageSize=20`  
Акции → Скидки недели

`https://swagger-wheat.vercel.app/api/akcii/rasprodazha-ostatkov?page=1&pageSize=20`  
Акции → Распродажа остатков

`https://swagger-wheat.vercel.app/api/akcii/nabory-k-vypiske?page=1&pageSize=20`  
Акции → Наборы к выписке

### Детская мебель

`https://swagger-wheat.vercel.app/api/detskaya-mebel?page=1&pageSize=20`  
Детская мебель — вся категория, 120 товаров

`https://swagger-wheat.vercel.app/api/detskaya-mebel/krovatki?page=1&pageSize=20`  
Детская мебель → Кроватки

`https://swagger-wheat.vercel.app/api/detskaya-mebel/kolybeli?page=1&pageSize=20`  
Детская мебель → Колыбели

`https://swagger-wheat.vercel.app/api/detskaya-mebel/lyulki?page=1&pageSize=20`  
Детская мебель → Люльки

`https://swagger-wheat.vercel.app/api/detskaya-mebel/pelenalnye-komody?page=1&pageSize=20`  
Детская мебель → Пеленальные комоды

`https://swagger-wheat.vercel.app/api/detskaya-mebel/shkafy?page=1&pageSize=20`  
Детская мебель → Шкафы

`https://swagger-wheat.vercel.app/api/detskaya-mebel/aksessuary?page=1&pageSize=20`  
Детская мебель → Аксессуары

### Коляски

`https://swagger-wheat.vercel.app/api/kolyaski?page=1&pageSize=20`  
Коляски — вся категория, 60 товаров

`https://swagger-wheat.vercel.app/api/kolyaski/progulochnye?page=1&pageSize=20`  
Коляски → Прогулочные

`https://swagger-wheat.vercel.app/api/kolyaski/transformery?page=1&pageSize=20`  
Коляски → Трансформеры

`https://swagger-wheat.vercel.app/api/kolyaski/dlya-dvoyni?page=1&pageSize=20`  
Коляски → Для двойни

### Автокресла

`https://swagger-wheat.vercel.app/api/avtokresla?page=1&pageSize=20`  
Автокресла — вся категория, 120 товаров

`https://swagger-wheat.vercel.app/api/avtokresla/gruppa-0-plus?page=1&pageSize=20`  
Автокресла → Группа 0+

`https://swagger-wheat.vercel.app/api/avtokresla/gruppa-1?page=1&pageSize=20`  
Автокресла → Группа 1

`https://swagger-wheat.vercel.app/api/avtokresla/gruppa-2-3?page=1&pageSize=20`  
Автокресла → Группа 2-3

`https://swagger-wheat.vercel.app/api/avtokresla/gruppa-0-1?page=1&pageSize=20`  
Автокресла → Группа 0+/1

`https://swagger-wheat.vercel.app/api/avtokresla/bustery?page=1&pageSize=20`  
Автокресла → Бустеры

`https://swagger-wheat.vercel.app/api/avtokresla/aksessuary-avtokresla?page=1&pageSize=20`  
Автокресла → Аксессуары для автокресел

### Одежда

`https://swagger-wheat.vercel.app/api/odezhda?page=1&pageSize=20`  
Одежда — вся категория, 60 товаров

`https://swagger-wheat.vercel.app/api/odezhda/dlya-novorozhdennyh?page=1&pageSize=20`  
Одежда → Для новорождённых

`https://swagger-wheat.vercel.app/api/odezhda/malchikam?page=1&pageSize=20`  
Одежда → Мальчикам

`https://swagger-wheat.vercel.app/api/odezhda/devochkam?page=1&pageSize=20`  
Одежда → Девочкам

### Кормление

`https://swagger-wheat.vercel.app/api/kormlenie?page=1&pageSize=20`  
Кормление — вся категория, 120 товаров

`https://swagger-wheat.vercel.app/api/kormlenie/butylochki?page=1&pageSize=20`  
Кормление → Бутылочки

`https://swagger-wheat.vercel.app/api/kormlenie/soski-pustyshki?page=1&pageSize=20`  
Кормление → Соски и пустышки

`https://swagger-wheat.vercel.app/api/kormlenie/molokootsosy?page=1&pageSize=20`  
Кормление → Молокоотсосы

`https://swagger-wheat.vercel.app/api/kormlenie/stulchiki?page=1&pageSize=20`  
Кормление → Стульчики для кормления

`https://swagger-wheat.vercel.app/api/kormlenie/detskaya-posuda?page=1&pageSize=20`  
Кормление → Детская посуда

`https://swagger-wheat.vercel.app/api/kormlenie/detskoe-pitanie?page=1&pageSize=20`  
Кормление → Детское питание

### Гигиена и уход

`https://swagger-wheat.vercel.app/api/gigiena-i-uhod?page=1&pageSize=20`  
Гигиена и уход — вся категория, 120 товаров

`https://swagger-wheat.vercel.app/api/gigiena-i-uhod/podguzniki?page=1&pageSize=20`  
Гигиена и уход → Подгузники

`https://swagger-wheat.vercel.app/api/gigiena-i-uhod/kupanie?page=1&pageSize=20`  
Гигиена и уход → Купание

`https://swagger-wheat.vercel.app/api/gigiena-i-uhod/uhod-za-kozhey?page=1&pageSize=20`  
Гигиена и уход → Уход за кожей

`https://swagger-wheat.vercel.app/api/gigiena-i-uhod/polotenca-halaty?page=1&pageSize=20`  
Гигиена и уход → Полотенца и халаты

`https://swagger-wheat.vercel.app/api/gigiena-i-uhod/aptechka-gradusniki?page=1&pageSize=20`  
Гигиена и уход → Аптечка и градусники

`https://swagger-wheat.vercel.app/api/gigiena-i-uhod/strizhka-manikur?page=1&pageSize=20`  
Гигиена и уход → Стрижка и маникюр

### Умные игрушки

`https://swagger-wheat.vercel.app/api/umnye-igrushki?page=1&pageSize=20`  
Умные игрушки — вся категория, 120 товаров

`https://swagger-wheat.vercel.app/api/umnye-igrushki/razvivayushchie?page=1&pageSize=20`  
Умные игрушки → Развивающие

`https://swagger-wheat.vercel.app/api/umnye-igrushki/konstruktory?page=1&pageSize=20`  
Умные игрушки → Конструкторы

`https://swagger-wheat.vercel.app/api/umnye-igrushki/muzykalnye?page=1&pageSize=20`  
Умные игрушки → Музыкальные

`https://swagger-wheat.vercel.app/api/umnye-igrushki/interaktivnye?page=1&pageSize=20`  
Умные игрушки → Интерактивные

`https://swagger-wheat.vercel.app/api/umnye-igrushki/obuchayushchie-planshety?page=1&pageSize=20`  
Умные игрушки → Обучающие планшеты

`https://swagger-wheat.vercel.app/api/umnye-igrushki/myagkie-igrushki?page=1&pageSize=20`  
Умные игрушки → Мягкие игрушки

## Категории

Список категорий и одна категория с товарами.

`https://swagger-wheat.vercel.app/api/categories?page=1&pageSize=20`  
Список категорий с подкатегориями

`https://swagger-wheat.vercel.app/api/categories/kolyaski?page=1&pageSize=20`  
Категория по id или slug + её товары

`https://swagger-wheat.vercel.app/api/categories/kolyaski/products?page=1&pageSize=20`  
Товары категории

## Подкатегории

Подкатегории и массив товаров каждой из них.

`https://swagger-wheat.vercel.app/api/subcategories?page=1&pageSize=20`  
Список всех подкатегорий

`https://swagger-wheat.vercel.app/api/subcategories/krovatki?page=1&pageSize=20`  
Подкатегория + массив её товаров

## Товары

Товары: фильтры, поиск, сортировка, CRUD.

`https://swagger-wheat.vercel.app/api/products?page=1&pageSize=20`  
Товары: фильтры, поиск, сортировка, пагинация

`https://swagger-wheat.vercel.app/api/products/search?search=Feretti&page=1&pageSize=20`  
Поиск товаров

`https://swagger-wheat.vercel.app/api/products/filter?onlyPromo=true&priceMax=20000&sortBy=price&sortDir=asc&page=1&pageSize=20`  
Фильтр товаров

`https://swagger-wheat.vercel.app/api/products/slug/tovar-nedeli-nuovita-day-offer-1`  
Товар по slug

`https://swagger-wheat.vercel.app/api/products/1`  
Товар по id или slug (+ похожие)

## Отзывы

Отзывы покупателей на товары.

`https://swagger-wheat.vercel.app/api/reviews?page=1&pageSize=20`  
Все отзывы каталога

`https://swagger-wheat.vercel.app/api/reviews/1`  
Один отзыв

`https://swagger-wheat.vercel.app/api/products/1/reviews`  
Отзывы товара

## Акции

Акции — по одной на каждую категорию, с полным текстом.

`https://swagger-wheat.vercel.app/api/promotions?page=1&pageSize=20`  
Список акций

`https://swagger-wheat.vercel.app/api/promotions/akciya-nabory-k-vypiske?page=1&pageSize=20`  
Одна акция: полный текст + её товары

## Блог

Статьи блога магазина.

`https://swagger-wheat.vercel.app/api/blog?page=1&pageSize=20`  
Статьи блога

`https://swagger-wheat.vercel.app/api/blog/1`  
Статья по id или slug (+ соседние)

`https://swagger-wheat.vercel.app/api/blog/slug/pitanie-v-pervom-trimestre`  
Статья по slug

## Картинки

Картинки каталога рисует сам API.

`https://swagger-wheat.vercel.app/api/images/cat-akcii.svg`  
Картинка товара, категории или статьи

## Аккаунт

Аккаунт создаётся одним `POST /api/users` — это не ссылка, её так не откроешь.
А вот загруженная фотография отдаётся обычным GET, её и вставляют в `<img src>`
(вместо `1` — тот `id`, что пришёл в ответе на регистрацию).

`https://swagger-wheat.vercel.app/api/users/1/avatar`  
Фотография пользователя 1 — квадрат 512×512 JPEG

---

Всего ссылок: 67. Полное описание каждой — на странице `https://swagger-wheat.vercel.app/`.
