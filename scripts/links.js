#!/usr/bin/env node
// ============================================================
// Собирает LINKS.md: готовые ссылки на все GET-запросы, а под каждой —
// что она возвращает и какие массивы лежат в ответе.
//
//   npm run links
//   BASE_URL=http://localhost:3000 npm run links
//
// Список строится по спецификации и каталогу, а состав ответа — не по
// описанию, а по живому запросу: скрипт сам поднимает локальный сервер,
// дёргает каждую ссылку и пишет в файл то, что реально пришло.
// Добавили категорию → npm run links, и строка появилась сама.
// ============================================================
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { categories, products, blog, promotions } = require('../lib/data');

const BASE = (process.env.BASE_URL || 'https://swagger-wheat.vercel.app').replace(/\/+$/, '');
const PORT = process.env.PORT || 3113;
const LOCAL = `http://localhost:${PORT}`;

// спецификацию берём у того же обработчика, что отдаёт /api/swagger.json
let spec = null;
require('../lib/handlers/swagger.js')(
  { headers: { host: 'localhost:3000' } },
  { setHeader() {}, end(json) { spec = JSON.parse(json); } }
);

// примеры для путей со скобками — только настоящие id и slug из каталога
const sample = products.find(p => p.reviews && p.reviews.length) || products[0];
const SAMPLES = {
  '/api/categories/{id}': { id: 'kolyaski' },
  '/api/categories/{id}/products': { id: 'kolyaski' },
  '/api/subcategories/{id}': { id: 'krovatki' },
  '/api/products/{id}': { id: sample.id },
  '/api/products/slug/{slug}': { slug: sample.slug },
  '/api/products/{id}/reviews': { id: sample.id },
  '/api/reviews/{id}': { id: sample.reviews[0].id },
  '/api/promotions/{id}': { id: promotions[0].slug },
  '/api/blog/{id}': { id: blog[0].id },
  '/api/blog/slug/{slug}': { slug: blog[0].slug },
  '/api/images/{slug}.svg': { slug: 'cat-' + categories[0].slug }
};

// У поиска и фильтра пустая ссылка вернула бы весь каталог — подставляем пример.
// Слово латиницей намеренно: русское в ссылке пришлось бы кодировать в %D0%BA…,
// и строку стало бы не прочитать (в самом запросе кириллица работает).
const EXTRA = {
  '/api/products/search': 'search=Feretti',
  '/api/products/filter': 'onlyPromo=true&priceMax=20000&sortBy=price&sortDir=asc'
};

// имя параметра — хоть он описан на месте, хоть ссылкой на components
const nameOf = (p) => (p.$ref ? p.$ref.split('/').pop() : p.name);

function pathFor(specPath, op) {
  const values = SAMPLES[specPath] || {};
  let url = specPath.replace(/\{(\w+)\}/g, (m, key) => {
    if (values[key] === undefined) throw new Error(`нет примера для ${specPath} ({${key}})`);
    return values[key];
  });
  const names = (op.parameters || []).map(nameOf);
  const query = [];
  if (EXTRA[specPath]) query.push(EXTRA[specPath]);
  if (names.includes('page') && names.includes('pageSize')) query.push('page=1&pageSize=20');
  return url + (query.length ? '?' + query.join('&') : '');
}

// ---------- локальный сервер: по нему смотрим состав ответов ----------
let server = null;
async function startServer() {
  server = spawn(process.execPath, [path.join(__dirname, 'dev-server.js')], {
    env: Object.assign({}, process.env, { PORT: String(PORT) }),
    stdio: ['ignore', 'ignore', 'inherit']
  });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${LOCAL}/api`)).ok) return; } catch (e) { /* ещё не поднялся */ }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Локальный сервер не поднялся');
}

// служебные поля конверта в списке массивов только мешают
const SERVICE = ['errors', 'statusCode', 'page', 'pageSize', 'total', 'totalPages',
  'hasNext', 'hasPrev', 'count', 'message'];

// подпись «20 товаров» вместо «20»: по набору полей видно, что за запись
const FORMS = {
  товар: ['товар', 'товара', 'товаров'],
  категория: ['категория', 'категории', 'категорий'],
  подкатегория: ['подкатегория', 'подкатегории', 'подкатегорий'],
  отзыв: ['отзыв', 'отзыва', 'отзывов'],
  акция: ['акция', 'акции', 'акций'],
  статья: ['статья', 'статьи', 'статей'],
  картинка: ['картинка', 'картинки', 'картинок'],
  цвет: ['цвет', 'цвета', 'цветов'],
  материал: ['материал', 'материала', 'материалов'],
  тег: ['тег', 'тега', 'тегов'],
  тезис: ['тезис', 'тезиса', 'тезисов'],
  блок: ['блок', 'блока', 'блоков'],
  шаг: ['шаг', 'шага', 'шагов']
};

// «1 товар», «2 товара», «20 товаров» — иначе подписи режут глаз
function plural(n, key) {
  const f = FORMS[key];
  if (!f) return key;
  const ten = n % 10, hundred = n % 100;
  if (ten === 1 && hundred !== 11) return f[0];
  if (ten >= 2 && ten <= 4 && (hundred < 10 || hundred >= 20)) return f[1];
  return f[2];
}

function kindOf(el) {
  if (!el || typeof el !== 'object') return '';
  if ('price' in el && 'brand' in el) return 'товар';
  if ('rating' in el && 'comment' in el) return 'отзыв';
  if ('subcategories' in el) return 'категория';
  if ('readingTime' in el) return 'статья';
  if ('dateEnd' in el) return 'акция';
  if ('categoryId' in el && 'productCount' in el) return 'подкатегория';
  return '';
}

// имена вложенных массивов, которые встречаются в ответах
const KNOWN = {
  subcategories: 'подкатегория', reviews: 'отзыв', products: 'товар',
  images: 'картинка', related: 'статья', similar: 'товар', breadcrumbs: 'шаг',
  highlights: 'тезис', sections: 'блок', tags: 'тег',
  colorOptions: 'цвет', materials: 'материал', promotions: 'акция'
};

// «Массивы: data — 20, subcategories — 3 · Объекты: category»
async function shapeOf(urlPath) {
  const res = await fetch(LOCAL + urlPath);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) { /* картинка, не JSON */ }
  if (!json) return { line: 'Ответ — сама картинка (SVG), не JSON', body: null };
  if (res.status !== 200) throw new Error(`${urlPath} → ${res.status}`);

  const arrays = [], objects = [];
  const walk = (obj, prefix) => {
    Object.entries(obj).forEach(([k, v]) => {
      if (SERVICE.includes(k)) return;
      const name = prefix ? `${prefix}.${k}` : k;
      if (Array.isArray(v)) {
        const what = k === 'data' ? kindOf(v[0]) : (KNOWN[k] || '');
        arrays.push(`${name} — ${v.length}${what ? ' ' + plural(v.length, what) : ''}`);
      }
      else if (v && typeof v === 'object') {
        objects.push(name);
        if (!prefix) { // на второй уровень заглядываем: там лежат массивы категории
          Object.entries(v).forEach(([k2, v2]) => {
            if (Array.isArray(v2) && v2.length) {
              arrays.push(`${name}.${k2} — ${v2.length}${KNOWN[k2] ? ' ' + plural(v2.length, KNOWN[k2]) : ''}`);
            }
          });
        }
      }
    });
  };
  walk(json, '');
  const parts = [];
  if (arrays.length) parts.push('Массивы: ' + arrays.join(', '));
  if (objects.length) parts.push('Объекты: ' + objects.join(', '));
  return { line: parts.join(' · ') || 'Массивов нет', body: json };
}

// один объект: массивы пустые, длинные тексты обрезаны — видны только ключи
function skeleton(v) {
  if (Array.isArray(v)) return [];
  if (v && typeof v === 'object') {
    const out = {};
    Object.entries(v).forEach(([k, val]) => { out[k] = skeleton(val); });
    return out;
  }
  if (typeof v === 'string' && v.length > 40) return v.slice(0, 37) + '…';
  return v;
}

(async () => {
  await startServer();
  try {
    const lines = [];
    const push = (url, title, shape) => lines.push('`' + BASE + url + '`  ', title + '  ', shape, '');

    lines.push('# Готовые ссылки — все GET-запросы', '',
      `Адрес сервера: \`${BASE}\`. Локально замените его на \`http://localhost:3000\`.`, '',
      'Под каждой ссылкой две строки: что она возвращает и какие массивы лежат в ответе.',
      'Массив, по которому идёт `.map()`, всегда в `data` — так во всех списках.',
      'Из чего состоит один элемент каждого массива, показано в конце файла.', '',
      '`page` и `pageSize` можно менять или убирать совсем — по умолчанию всё равно',
      'первая страница по 20 записей. Файл собирается командой `npm run links`,',
      'руками его править бессмысленно.', '');

    // ---------- каталог: по категориям ----------
    lines.push('## Каталог', '',
      'Главное, ради чего API писался: у каждой категории и подкатегории свой адрес.',
      'Ответ у всех одинаковый по составу — меняются только сами товары.', '');

    let count = 0;
    for (const c of categories) {
      lines.push(`### ${c.name}`, '');
      const p = pathFor(`/api/${c.slug}`, spec.paths[`/api/${c.slug}`].get);
      push(p, `${c.name} — вся категория, ${c.productCount} товаров`, (await shapeOf(p)).line);
      count++;
      for (const sc of c.subcategories) {
        const sp = pathFor(`/api/${c.slug}/${sc.slug}`, spec.paths[`/api/${c.slug}/${sc.slug}`].get);
        push(sp, `${c.name} → ${sc.name}`, (await shapeOf(sp)).line);
        count++;
      }
    }

    // ---------- остальные разделы, в порядке тегов спецификации ----------
    const catalogPaths = new Set();
    categories.forEach(c => {
      catalogPaths.add(`/api/${c.slug}`);
      c.subcategories.forEach(sc => catalogPaths.add(`/api/${c.slug}/${sc.slug}`));
    });
    const TITLES = ['Категории', 'Подкатегории', 'Товары', 'Отзывы', 'Акции', 'Блог', 'Картинки'];

    for (const tag of spec.tags) {
      if (!TITLES.includes(tag.name)) continue;
      const rows = Object.entries(spec.paths)
        .filter(([p, ops]) => !catalogPaths.has(p) && ops.get && ops.get.tags[0] === tag.name);
      if (!rows.length) continue;
      lines.push(`## ${tag.name}`, '', tag.description + '.', '');
      for (const [p, ops] of rows) {
        const url = pathFor(p, ops.get);
        push(url, ops.get.summary, (await shapeOf(url)).line);
        count++;
      }
    }

    // ---------- фотография аккаунта ----------
    lines.push('## Аккаунт', '',
      'Аккаунт создаётся одним `POST /api/users` — это не ссылка, её так не откроешь.',
      'А вот загруженная фотография отдаётся обычным GET, её и вставляют в `<img src>`',
      '(вместо `1` — тот `id`, что пришёл в ответе на регистрацию).', '');
    push('/api/users/1/avatar', 'Фотография пользователя 1 — квадрат 512×512 JPEG',
      'Ответ — сам файл JPEG, не JSON');
    count++;

    // ---------- из чего состоит один элемент ----------
    const one = async (title, url, pick) => {
      const { body } = await shapeOf(url);
      const value = pick(body);
      lines.push(`### ${title}`, '', '```json', JSON.stringify(skeleton(value), null, 2), '```', '');
    };

    lines.push('## Из чего состоит один элемент', '',
      'Массивы здесь показаны пустыми — важны имена полей. Что лежит внутри каждого',
      'массива, смотрите в соседнем блоке: `reviews` — это отзывы, `subcategories` —',
      'подкатегории, и так далее. Длинные тексты обрезаны многоточием.', '');

    lines.push('### Конверт — он одинаковый у всех ответов', '', '```json',
      JSON.stringify({
        data: 'массив у списков, объект у одной записи, null у ошибки',
        errors: [], statusCode: 200,
        page: 1, pageSize: 20, total: 780, totalPages: 39
      }, null, 2), '```', '',
      'Поля `page`, `pageSize`, `total`, `totalPages` есть только у списков.',
      'У ошибки рядом с `errors` приходит ещё `error` с полями `code`, `message`, `details`.', '');

    await one('Один товар — элемент массива `data`', pathFor('/api/products/{id}', spec.paths['/api/products/{id}'].get), b => b.data);
    await one('Одна категория — элемент массива `data` у `/api/categories`', '/api/categories?page=1&pageSize=1', b => b.data[0]);
    await one('Одна подкатегория — элемент массива `subcategories`', '/api/subcategories?page=1&pageSize=1', b => b.data[0]);
    await one('Один отзыв — элемент массива `reviews`', pathFor('/api/reviews/{id}', spec.paths['/api/reviews/{id}'].get), b => b.data);
    await one('Одна акция — элемент массива `data` у `/api/promotions`', '/api/promotions?page=1&pageSize=1', b => b.data[0]);
    await one('Одна статья блога — элемент массива `data` у `/api/blog`', '/api/blog?page=1&pageSize=1', b => b.data[0]);
    lines.push('В списке у статьи нет самого текста. Одна статья (`/api/blog/1`) добавляет',
      '`content`, готовые блоки страницы `sections`, `breadcrumbs`, `prevPost`, `nextPost`',
      'и массив `related` — из них страница статьи собирается одним запросом.', '');

    // аккаунт: регистрируем на локальном сервере, чтобы показать настоящий ответ
    const form = new FormData();
    form.append('fullName', 'Мансур');
    form.append('tel', '+992900123456');
    form.append('email', 'safarov@gmail.com');
    form.append('password', 'ExamplePassword123!');
    form.append('address', 'Душанбе');
    const reg = await (await fetch(`${LOCAL}/api/users`, { method: 'POST', body: form })).json();
    lines.push('### Аккаунт — ответ на `POST /api/users`', '', '```json',
      JSON.stringify(skeleton(reg.data), null, 2), '```', '',
      'Личные данные закрыты звёздочками — так и задумано. `id` сохраните: он нужен,',
      'чтобы потом сохранить изменения тем же `POST /api/users`.', '');

    lines.push('---', '',
      `Всего ссылок: ${count}. Полное описание каждой — на странице \`${BASE}/\`.`, '');

    // в примерах ответов ссылки приходят от локального сервера — меняем на рабочий адрес
    const out = lines.join('\n').split(LOCAL).join(BASE);
    fs.writeFileSync(path.join(__dirname, '..', 'LINKS.md'), out);
    console.log(`LINKS.md готов: ссылок ${count}, адрес ${BASE}`);
  } finally {
    if (server) server.kill();
  }
})().catch(err => { if (server) server.kill(); console.error(err); process.exit(1); });
