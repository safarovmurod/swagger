const { categories, products, jsonRes, getBody } = require('../_helpers');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonRes(res, 200, {});

  const id = parseInt(req.query.id);

  // GET /api/categories/:id
  if (req.method === 'GET') {
    const cat = categories.find(c => c.id === id);
    if (!cat) return jsonRes(res, 404, { message: `Category ${id} not found` });
    const catProducts = products.filter(p => p.categoryId === id);
    return jsonRes(res, 200, { ...cat, productCount: catProducts.length, products: catProducts });
  }

  // PUT /api/categories/:id
  if (req.method === 'PUT') {
    const cat = categories.find(c => c.id === id);
    if (!cat) return jsonRes(res, 404, { message: `Category ${id} not found` });
    const body = await getBody(req);
    if (body.name) cat.name = body.name;
    if (body.description) cat.description = body.description;
    if (body.image) cat.image = body.image;
    return jsonRes(res, 200, cat);
  }

  // DELETE /api/categories/:id
  if (req.method === 'DELETE') {
    const idx = categories.findIndex(c => c.id === id);
    if (idx < 0) return jsonRes(res, 404, { message: `Category ${id} not found` });
    const deleted = categories.splice(idx, 1)[0];
    return jsonRes(res, 200, { message: `Category ${id} deleted`, deleted });
  }

  return jsonRes(res, 405, { message: 'Method not allowed' });
};
