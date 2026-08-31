const { promotions, jsonRes, getBody } = require('../_helpers');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonRes(res, 200, {});

  const id = parseInt(req.query.id);
  const promo = promotions.find(p => p.id === id);

  // GET /api/promotions/:id
  if (req.method === 'GET') {
    if (!promo) return jsonRes(res, 404, { message: `Promotion ${id} not found` });
    return jsonRes(res, 200, promo);
  }

  // PUT /api/promotions/:id
  if (req.method === 'PUT') {
    if (!promo) return jsonRes(res, 404, { message: `Promotion ${id} not found` });
    const body = await getBody(req);
    if (body.title) promo.title = body.title;
    if (body.description) promo.description = body.description;
    if (body.discount) promo.discount = body.discount;
    if (body.image) promo.image = body.image;
    return jsonRes(res, 200, promo);
  }

  // DELETE /api/promotions/:id
  if (req.method === 'DELETE') {
    const idx = promotions.findIndex(p => p.id === id);
    if (idx < 0) return jsonRes(res, 404, { message: `Promotion ${id} not found` });
    const deleted = promotions.splice(idx, 1)[0];
    return jsonRes(res, 200, { message: `Promotion ${id} deleted`, deleted });
  }

  return jsonRes(res, 405, { message: 'Method not allowed' });
};
