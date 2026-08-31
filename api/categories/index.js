const { categories, products } = require('../data');

module.exports = (req, res) => {
  // CORS — ҳар кас метавонад дархост кунад
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Pagination + search
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const search = (req.query.search || '').toLowerCase();

  let result = [...categories];

  if (search) {
    result = result.filter(c =>
      c.name.toLowerCase().includes(search) ||
      c.description.toLowerCase().includes(search)
    );
  }

  const totalCount = result.length;
  const start = (page - 1) * pageSize;
  const items = result.slice(start, start + pageSize);

  // product count барои ҳар категория
  const itemsWithCount = items.map(c => ({
    ...c,
    productCount: products.filter(p => p.categoryId === c.id).length
  }));

  res.json({
    items: itemsWithCount,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
    hasPrevious: page > 1,
    hasNext: page < Math.ceil(totalCount / pageSize)
  });
};
