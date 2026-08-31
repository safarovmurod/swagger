const { products, jsonRes, jsonData, jsonErr, getBody, miniProduct } = require('../_helpers');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonData(res, 200, null);

  const q = req.query || {};
  const product = products.find(p => p.id === parseInt(q.id) || p.slug === q.id);

  // GET /api/products/:id — карточка товара + похожие товары
  if (req.method === 'GET') {
    if (!product) return jsonErr(res, 404, `Товар ${q.id} не найден`);
    const similar = products
      .filter(p => p.subcategoryId === product.subcategoryId && p.id !== product.id)
      .slice(0, 8)
      .map(miniProduct);
    return jsonData(res, 200, { ...product, similar });
  }

  // PUT /api/products/:id
  if (req.method === 'PUT') {
    if (!product) return jsonErr(res, 404, `Товар ${q.id} не найден`);
    const body = await getBody(req);
    Object.keys(body).forEach(key => {
      if (!['id', 'reviews', 'rating', 'reviewCount'].includes(key)) product[key] = body[key];
    });
    product.discount = product.oldPrice && product.oldPrice > product.price
      ? Math.round((1 - product.price / product.oldPrice) * 100)
      : 0;
    return jsonData(res, 200, product);
  }

  // DELETE /api/products/:id
  if (req.method === 'DELETE') {
    const idx = products.findIndex(p => p.id === parseInt(q.id) || p.slug === q.id);
    if (idx < 0) return jsonErr(res, 404, `Товар ${q.id} не найден`);
    const deleted = products.splice(idx, 1)[0];
    return jsonData(res, 200, { message: `Товар ${deleted.id} удалён`, deleted });
  }

  return jsonErr(res, 405, 'Метод не поддерживается');
};
