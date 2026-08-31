const { categories, products, jsonRes, jsonData, jsonErr, paginate, getBody, lightProduct } = require('../_helpers');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonData(res, 200, null);

  const q = req.query || {};
  const key = q.id;
  const cat = categories.find(c => c.id === parseInt(key) || c.slug === key);

  // GET /api/categories/:id — категория + подкатегории + товары (с пагинацией)
  if (req.method === 'GET') {
    if (!cat) return jsonErr(res, 404, `Категория ${key} не найдена`);
    let catProducts = products.filter(p => p.categoryId === cat.id);
    if (q.subcategoryId) catProducts = catProducts.filter(p => p.subcategoryId === parseInt(q.subcategoryId));
    if (q.light !== 'false') catProducts = catProducts.map(lightProduct);

    return jsonData(res, 200, {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      image: cat.image,
      productCount: products.filter(p => p.categoryId === cat.id).length,
      info: cat.info,
      subcategories: cat.subcategories.map(s => ({
        ...s,
        productCount: products.filter(p => p.subcategoryId === s.id).length
      })),
      products: paginate(catProducts, q.page, q.pageSize, 20)
    });
  }

  // PUT /api/categories/:id
  if (req.method === 'PUT') {
    if (!cat) return jsonErr(res, 404, `Категория ${key} не найдена`);
    const body = await getBody(req);
    ['name', 'slug', 'description', 'image'].forEach(f => { if (body[f] !== undefined) cat[f] = body[f]; });
    if (Array.isArray(body.subcategories)) cat.subcategories = body.subcategories;
    return jsonData(res, 200, cat);
  }

  // DELETE /api/categories/:id
  if (req.method === 'DELETE') {
    const idx = categories.findIndex(c => c.id === parseInt(key) || c.slug === key);
    if (idx < 0) return jsonErr(res, 404, `Категория ${key} не найдена`);
    const deleted = categories.splice(idx, 1)[0];
    return jsonData(res, 200, { message: `Категория ${deleted.id} удалена`, deleted });
  }

  return jsonErr(res, 405, 'Метод не поддерживается');
};
