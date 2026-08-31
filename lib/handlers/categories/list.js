const { categories, products, jsonRes, jsonData, jsonErr, paginate, getBody, nextId } = require('../_helpers');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonData(res, 200, null);

  // GET /api/categories — все категории с подкатегориями
  if (req.method === 'GET') {
    const q = req.query || {};
    let result = categories.map(c => ({
      ...c,
      url: `/api/${c.slug}`,
      productCount: products.filter(p => p.categoryId === c.id).length,
      subcategories: c.subcategories.map(s => ({
        ...s,
        url: `/api/${c.slug}/${s.slug}`,
        productCount: products.filter(p => p.subcategoryId === s.id).length
      }))
    }));

    if (q.search) {
      const s = String(q.search).toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(s) || c.description.toLowerCase().includes(s));
    }

    return jsonRes(res, 200, paginate(result, q.page, q.pageSize, 20));
  }

  // POST /api/categories — создать категорию
  if (req.method === 'POST') {
    const body = await getBody(req);
    if (!body.name) return jsonErr(res, 400, 'Поле name обязательно');
    const newCat = {
      id: nextId(categories),
      name: body.name,
      slug: body.slug || String(body.name).toLowerCase().replace(/\s+/g, '-'),
      description: body.description || '',
      image: body.image || '',
      productCount: 0,
      subcategories: body.subcategories || []
    };
    categories.push(newCat);
    return jsonData(res, 201, newCat);
  }

  return jsonErr(res, 405, 'Метод не поддерживается');
};
