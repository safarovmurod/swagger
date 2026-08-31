// Общие помощники для всех эндпоинтов
const { categories, products, blog, promotions, subcategories } = require('../data');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function jsonRes(res, status, data) {
  setCors(res);
  res.statusCode = status;
  return res.json(data);
}

function paginate(items, page, pageSize, defaultSize = 10) {
  page = Math.max(1, parseInt(page) || 1);
  pageSize = Math.min(200, Math.max(1, parseInt(pageSize) || defaultSize));
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
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
  setCors, jsonRes, paginate, getBody, lightProduct, miniProduct, nextId
};
