const { categories, products, jsonRes, paginate } = require('../_helpers');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonRes(res, 200, {});

  // GET /api/categories
  if (req.method === 'GET') {
    const { page, pageSize, search } = req.query;
    let result = categories.map(c => ({
      ...c,
      productCount: products.filter(p => p.categoryId === c.id).length
    }));
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(s) || c.description.toLowerCase().includes(s));
    }
    return jsonRes(res, 200, paginate(result, page, pageSize));
  }

  // POST /api/categories — create
  if (req.method === 'POST') {
    const { getBody } = require('../_helpers');
    const body = await getBody(req);
    if (!body.name) return jsonRes(res, 400, { message: 'Name is required' });
    const newCat = {
      id: Math.max(...categories.map(c => c.id)) + 1,
      name: body.name,
      slug: body.slug || body.name.toLowerCase().replace(/\s+/g, '-'),
      description: body.description || '',
      image: body.image || '',
      subcategories: body.subcategories || []
    };
    categories.push(newCat);
    return jsonRes(res, 201, newCat);
  }

  return jsonRes(res, 405, { message: 'Method not allowed' });
};
