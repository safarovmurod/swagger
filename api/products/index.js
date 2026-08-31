const { categories, products } = require('../data');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const search = (req.query.search || '').toLowerCase();
  const categoryId = req.query.categoryId ? parseInt(req.query.categoryId) : null;
  const inStock = req.query.inStock;
  const sortBy = req.query.sortBy || 'id';
  const sortDir = req.query.sortDir || 'asc';

  let result = [...products];

  // SEARCH
  if (search) {
    result = result.filter(p =>
      p.name.toLowerCase().includes(search) ||
      p.description.toLowerCase().includes(search)
    );
  }

  // FILTER: categoryId
  if (categoryId) {
    result = result.filter(p => p.categoryId === categoryId);
  }

  // FILTER: inStock
  if (inStock === 'true') result = result.filter(p => p.inStock);
  if (inStock === 'false') result = result.filter(p => !p.inStock);

  // SORT
  result.sort((a, b) => {
    let av = a[sortBy], bv = b[sortBy];
    if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  // PAGINATION
  const totalCount = result.length;
  const start = (page - 1) * pageSize;
  const items = result.slice(start, start + pageSize).map(p => {
    const cat = categories.find(c => c.id === p.categoryId);
    return { ...p, categoryName: cat ? cat.name : null };
  });

  res.json({
    items,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
    hasPrevious: page > 1,
    hasNext: page < Math.ceil(totalCount / pageSize)
  });
};
