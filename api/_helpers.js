// Shared helpers for all API endpoints
const { categories, products, blog, promotions } = require('../lib/data');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function jsonRes(res, status, data) {
  setCors(res);
  res.statusCode = status;
  return res.json(data);
}

function paginate(items, page, pageSize) {
  page = parseInt(page) || 1;
  pageSize = parseInt(pageSize) || 10;
  const totalCount = items.length;
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);
  return {
    items: paged,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
    hasPrevious: page > 1,
    hasNext: page < Math.ceil(totalCount / pageSize)
  };
}

function getBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { resolve({}); }
    });
  });
}

module.exports = { categories, products, blog, promotions, setCors, jsonRes, paginate, getBody };
