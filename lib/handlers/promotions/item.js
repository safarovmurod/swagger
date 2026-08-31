const { promotions, products, jsonRes, jsonData, jsonErr, paginate, getBody, miniProduct } = require('../_helpers');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonData(res, 200, null);

  const q = req.query || {};
  const promo = promotions.find(p => p.id === parseInt(q.id) || p.slug === q.id);

  // GET /api/promotions/:id — одна акция: полный текст + её товары
  if (req.method === 'GET') {
    if (!promo) return jsonErr(res, 404, `Акция ${q.id} не найдена`);
    const list = (promo.products || [])
      .map(id => products.find(p => p.id === id))
      .filter(Boolean)
      .map(miniProduct);

    return jsonData(res, 200, {
      ...promo,
      productCount: list.length,
      productDetails: list,
      productsPage: paginate(list, q.page, q.pageSize, 20)
    });
  }

  // PUT /api/promotions/:id
  if (req.method === 'PUT') {
    if (!promo) return jsonErr(res, 404, `Акция ${q.id} не найдена`);
    const body = await getBody(req);
    ['title', 'description', 'content', 'image', 'discount', 'dateStart', 'dateEnd', 'isActive', 'slug']
      .forEach(f => { if (body[f] !== undefined) promo[f] = body[f]; });
    if (Array.isArray(body.products)) {
      promo.products = body.products;
      promo.productCount = body.products.length;
    }
    return jsonData(res, 200, promo);
  }

  // DELETE /api/promotions/:id
  if (req.method === 'DELETE') {
    const idx = promotions.findIndex(p => p.id === parseInt(q.id) || p.slug === q.id);
    if (idx < 0) return jsonErr(res, 404, `Акция ${q.id} не найдена`);
    const deleted = promotions.splice(idx, 1)[0];
    return jsonData(res, 200, { message: `Акция ${deleted.id} удалена`, deleted });
  }

  return jsonErr(res, 405, 'Метод не поддерживается');
};
