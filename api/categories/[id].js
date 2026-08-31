const { categories, products, jsonRes, paginate, getBody, lightProduct } = require('../_helpers');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonRes(res, 200, {});

  const q = req.query || {};
  const key = q.id;
  const cat = categories.find(c => c.id === parseInt(key) || c.slug === key);

  // GET /api/categories/:id — категория + подкатегории + товары (с пагинацией)
  if (req.method === 'GET') {
    if (!cat) return jsonRes(res, 404, { message: `Категория ${key} не найдена` });
    let catProducts = products.filter(p => p.categoryId === cat.id);
    if (q.subcategoryId) catProducts = catProducts.filter(p => p.subcategoryId === parseInt(q.subcategoryId));
    if (q.light !== 'false') catProducts = catProducts.map(lightProduct);

    return jsonRes(res, 200, {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      image: cat.image,
      productCount: products.filter(p => p.categoryId === cat.id).length,
      subcategories: cat.subcategories.map(s => ({
        ...s,
        productCount: products.filter(p => p.subcategoryId === s.id).length
      })),
      products: paginate(catProducts, q.page, q.pageSize, 20)
    });
  }

  // PUT /api/categories/:id
  if (req.method === 'PUT') {
    if (!cat) return jsonRes(res, 404, { message: `Категория ${key} не найдена` });
    const body = await getBody(req);
    ['name', 'slug', 'description', 'image'].forEach(f => { if (body[f] !== undefined) cat[f] = body[f]; });
    if (Array.isArray(body.subcategories)) cat.subcategories = body.subcategories;
    return jsonRes(res, 200, cat);
  }

  // DELETE /api/categories/:id
  if (req.method === 'DELETE') {
    const idx = categories.findIndex(c => c.id === parseInt(key) || c.slug === key);
    if (idx < 0) return jsonRes(res, 404, { message: `Категория ${key} не найдена` });
    const deleted = categories.splice(idx, 1)[0];
    return jsonRes(res, 200, { message: `Категория ${deleted.id} удалена`, deleted });
  }

  return jsonRes(res, 405, { message: 'Метод не поддерживается' });
};
