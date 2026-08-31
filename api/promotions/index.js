const { promotions, products, jsonRes, paginate, getBody } = require('../_helpers');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonRes(res, 200, {});

  // GET /api/promotions
  if (req.method === 'GET') {
    const q = req.query;
    let result = promotions.map(promo => ({
      ...promo,
      productDetails: (promo.products || []).map(pid => {
        const p = products.find(pr => pr.id === pid);
        return p ? { id: p.id, name: p.name, price: p.price, image: p.image } : null;
      }).filter(Boolean)
    }));

    if (q.search) {
      const s = q.search.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(s) || p.description.toLowerCase().includes(s));
    }

    return jsonRes(res, 200, paginate(result, q.page, q.pageSize));
  }

  // POST /api/promotions — create
  if (req.method === 'POST') {
    const body = await getBody(req);
    if (!body.title) return jsonRes(res, 400, { message: 'Title is required' });
    const newPromo = {
      id: Math.max(...promotions.map(p => p.id)) + 1,
      title: body.title,
      description: body.description || '',
      image: body.image || '',
      discount: body.discount || 0,
      date: body.date || new Date().toISOString().split('T')[0],
      products: body.products || []
    };
    promotions.push(newPromo);
    return jsonRes(res, 201, newPromo);
  }

  return jsonRes(res, 405, { message: 'Method not allowed' });
};
