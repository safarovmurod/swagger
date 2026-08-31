const { categories, products, jsonRes, paginate, getBody, lightProduct } = require('../_helpers');

function find(key) {
  for (const cat of categories) {
    const sub = cat.subcategories.find(s => s.id === parseInt(key) || s.slug === key);
    if (sub) return { cat, sub };
  }
  return null;
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonRes(res, 200, {});

  const q = req.query || {};
  const found = find(q.id);

  // GET /api/subcategories/:id — подкатегория + её массив товаров
  if (req.method === 'GET') {
    if (!found) return jsonRes(res, 404, { message: `Подкатегория ${q.id} не найдена` });
    const { cat, sub } = found;
    let list = products.filter(p => p.subcategoryId === sub.id);

    if (q.onlyPromo === 'true') list = list.filter(p => p.isPromo);
    if (q.isNew === 'true') list = list.filter(p => p.isNew);
    if (q.inStock === 'true') list = list.filter(p => p.inStock);
    if (q.priceMin) list = list.filter(p => p.price >= parseInt(q.priceMin));
    if (q.priceMax) list = list.filter(p => p.price <= parseInt(q.priceMax));

    const dir = q.sortDir === 'asc' ? 1 : -1;
    if (q.sortBy === 'price') list.sort((a, b) => (a.price - b.price) * dir);
    else if (q.sortBy === 'rating') list.sort((a, b) => (a.rating - b.rating) * dir);
    else if (q.sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'ru') * dir);

    if (q.light === 'true') list = list.map(lightProduct);

    return jsonRes(res, 200, {
      id: sub.id,
      name: sub.name,
      slug: sub.slug,
      categoryId: cat.id,
      categoryName: cat.name,
      categorySlug: cat.slug,
      productCount: products.filter(p => p.subcategoryId === sub.id).length,
      products: paginate(list, q.page, q.pageSize, 20)
    });
  }

  // PUT /api/subcategories/:id
  if (req.method === 'PUT') {
    if (!found) return jsonRes(res, 404, { message: `Подкатегория ${q.id} не найдена` });
    const body = await getBody(req);
    ['name', 'slug'].forEach(f => { if (body[f] !== undefined) found.sub[f] = body[f]; });
    return jsonRes(res, 200, { ...found.sub, categoryName: found.cat.name });
  }

  // DELETE /api/subcategories/:id
  if (req.method === 'DELETE') {
    if (!found) return jsonRes(res, 404, { message: `Подкатегория ${q.id} не найдена` });
    const idx = found.cat.subcategories.indexOf(found.sub);
    const deleted = found.cat.subcategories.splice(idx, 1)[0];
    return jsonRes(res, 200, { message: `Подкатегория ${deleted.id} удалена`, deleted });
  }

  return jsonRes(res, 405, { message: 'Метод не поддерживается' });
};
