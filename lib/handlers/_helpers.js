// Общие помощники для всех эндпоинтов
const { categories, products, blog, promotions, subcategories } = require('../data');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// Единый конверт ответа — тот же, что у остальных сервисов Softclub:
//   { data, errors, statusCode }
// Список  → data: [...] плюс поля пагинации рядом
// Объект  → data: {...}
// Ошибка  → data: null, errors: ['текст ошибки']
// На фронтенде это даёт один и тот же разбор:
//   const { data } = await axios.get(url);  data.data.map(...)
// Ссылки внутри данных хранятся относительными (/api/images/…, /api/kolyaski),
// а наружу отдаются абсолютными: фронтенд живёт на другом домене, и относительный
// путь у него разрешился бы в его собственный адрес.
function absolutize(value, origin) {
  if (typeof value === 'string') {
    return (value.indexOf('/api/') === 0 || value.indexOf('/assets/') === 0) ? origin + value : value;
  }
  if (Array.isArray(value)) return value.map(v => absolutize(v, origin));
  if (value && typeof value === 'object') {
    const out = {};
    for (const key in value) out[key] = absolutize(value[key], origin);
    return out;
  }
  return value;
}

function jsonRes(res, status, payload) {
  setCors(res);
  res.statusCode = status;
  const body = Object.assign({ data: null, errors: [], statusCode: status }, payload);
  return res.json(res._origin ? absolutize(body, res._origin) : body);
}

// объект или массив в конверте
function jsonData(res, status, payload) {
  return jsonRes(res, status, { data: payload === undefined ? null : payload });
}

// ошибка в том же конверте
function jsonErr(res, status, message) {
  return jsonRes(res, status, { data: null, errors: [message], message });
}

function paginate(items, page, pageSize, defaultSize = 10) {
  page = Math.max(1, parseInt(page) || 1);
  pageSize = Math.min(200, Math.max(1, parseInt(pageSize) || defaultSize));
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = (page - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    totalCount,
    page,
    pageSize,
    totalPages,
    hasPrevious: page > 1,
    hasNext: page < totalPages
  };
}

// Короткая карточка товара — без отзывов и характеристик (?light=true)
function lightProduct(p) {
  const { reviews, characteristics, images, description, ...rest } = p;
  return rest;
}

// Краткая карточка для вложенных списков (акции, связанные товары)
function miniProduct(p) {
  return {
    id: p.id, name: p.name, slug: p.slug, price: p.price, oldPrice: p.oldPrice,
    discount: p.discount, image: p.image, brand: p.brand, rating: p.rating,
    inStock: p.inStock, categoryId: p.categoryId, subcategoryId: p.subcategoryId
  };
}

function getBody(req) {
  // Vercel уже разбирает JSON-тело в req.body — читаем поток только если его нет
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  if (typeof req.body === 'string') {
    try { return Promise.resolve(JSON.parse(req.body)); } catch { return Promise.resolve({}); }
  }
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

function nextId(list) {
  return list.length ? Math.max(...list.map(x => x.id)) + 1 : 1;
}

module.exports = {
  categories, products, blog, promotions, subcategories,
  setCors, jsonRes, jsonData, jsonErr, absolutize, paginate, getBody, lightProduct, miniProduct, nextId
};
