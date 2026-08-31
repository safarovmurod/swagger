const { promotions, products, categories, jsonRes, jsonData, jsonErr, paginate, getBody, miniProduct, nextId } = require('../_helpers');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonData(res, 200, null);

  // GET /api/promotions — список акций (по одной на каждую категорию)
  if (req.method === 'GET') {
    const q = req.query || {};
    let result = promotions.map(promo => {
      const item = {
        ...promo,
        productDetails: (promo.products || [])
          .map(id => products.find(p => p.id === id))
          .filter(Boolean)
          .map(miniProduct)
      };
      // в списке полный текст не отдаём, чтобы ответ оставался лёгким
      if (q.full !== 'true') delete item.content;
      return item;
    });

    if (q.categoryId) result = result.filter(p => p.categoryId === parseInt(q.categoryId));
    if (q.isActive === 'true') result = result.filter(p => p.isActive);
    if (q.isActive === 'false') result = result.filter(p => !p.isActive);
    if (q.discountMin) result = result.filter(p => p.discount >= parseInt(q.discountMin));
    if (q.search) {
      const s = String(q.search).toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(s) || p.description.toLowerCase().includes(s));
    }

    if (q.sortBy === 'discount') {
      const dir = q.sortDir === 'asc' ? 1 : -1;
      result.sort((a, b) => (a.discount - b.discount) * dir);
    }

    return jsonRes(res, 200, paginate(result, q.page, q.pageSize, 10));
  }

  // POST /api/promotions — создать акцию
  if (req.method === 'POST') {
    const body = await getBody(req);
    if (!body.title) return jsonErr(res, 400, 'Поле title обязательно');
    const cat = categories.find(c => c.id === parseInt(body.categoryId));
    const id = nextId(promotions);
    const newPromo = {
      id,
      slug: body.slug || `akciya-${id}`,
      title: body.title,
      description: body.description || '',
      content: body.content || '',
      image: body.image || (cat ? cat.image : ''),
      discount: body.discount || 0,
      categoryId: cat ? cat.id : (parseInt(body.categoryId) || 0),
      categoryName: cat ? cat.name : (body.categoryName || ''),
      dateStart: body.dateStart || new Date().toISOString().split('T')[0],
      dateEnd: body.dateEnd || '',
      date: body.dateStart || new Date().toISOString().split('T')[0],
      isActive: body.isActive !== false,
      productCount: (body.products || []).length,
      products: body.products || []
    };
    promotions.push(newPromo);
    return jsonData(res, 201, newPromo);
  }

  return jsonErr(res, 405, 'Метод не поддерживается');
};
