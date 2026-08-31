const { products, jsonRes, getBody } = require('../_helpers');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonRes(res, 200, {});

  const id = parseInt(req.query.id);
  const product = products.find(p => p.id === id);

  // GET /api/products/:id
  if (req.method === 'GET') {
    if (!product) return jsonRes(res, 404, { message: `Product ${id} not found` });
    return jsonRes(res, 200, product);
  }

  // PUT /api/products/:id
  if (req.method === 'PUT') {
    if (!product) return jsonRes(res, 404, { message: `Product ${id} not found` });
    const body = await getBody(req);
    Object.keys(body).forEach(key => {
      if (key !== 'id' && key !== 'reviews') product[key] = body[key];
    });
    return jsonRes(res, 200, product);
  }

  // DELETE /api/products/:id
  if (req.method === 'DELETE') {
    const idx = products.findIndex(p => p.id === id);
    if (idx < 0) return jsonRes(res, 404, { message: `Product ${id} not found` });
    const deleted = products.splice(idx, 1)[0];
    return jsonRes(res, 200, { message: `Product ${id} deleted`, deleted });
  }

  return jsonRes(res, 405, { message: 'Method not allowed' });
};
