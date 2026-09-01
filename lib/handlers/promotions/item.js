const {
  promotions, products, jsonRes, jsonData, jsonErr, paginate, readBody, miniProduct, requireAdmin
} = require('../_helpers');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonData(res, 200, null);

  const q = req.query || {};
  const promo = promotions.find(p => p.id === parseInt(q.id) || p.slug === q.id);

  // GET /api/promotions/:id — одна акция: полный текст + её товары
  if (req.method === 'GET') {
    if (!promo) return jsonErr(res, 404, `Акция ${q.id} не найдена`, 'NOT_FOUND');
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

  // PUT заменяет акцию целиком, PATCH правит отдельные поля
  if (req.method === 'PUT' || req.method === 'PATCH') {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (!promo) return jsonErr(res, 404, `Акция ${q.id} не найдена`, 'NOT_FOUND');
    const body = (await readBody(req)).fields;
    if (req.method === 'PUT' && !body.title) {
      return jsonErr(res, 400, 'PUT заменяет акцию целиком — поле title обязательно', 'VALIDATION_ERROR', [{ field: 'title', message: 'Обязательно' }]);
    }
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
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const idx = promotions.findIndex(p => p.id === parseInt(q.id) || p.slug === q.id);
    if (idx < 0) return jsonErr(res, 404, `Акция ${q.id} не найдена`, 'NOT_FOUND');
    const deleted = promotions.splice(idx, 1)[0];
    return jsonData(res, 200, { message: `Акция ${deleted.id} удалена`, deleted });
  }

  return jsonErr(res, 405, 'Метод не поддерживается', 'METHOD_NOT_ALLOWED');
};
