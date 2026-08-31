const { categories, products, jsonRes, jsonData, jsonErr, paginate, getBody } = require('../_helpers');

// Плоский список подкатегорий, собирается из категорий на каждый запрос,
// чтобы отражать изменения, внесённые через POST/PUT/DELETE.
function flatten() {
  return categories.flatMap(c => c.subcategories.map(s => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description || '',
    categoryId: c.id,
    categoryName: c.name,
    categorySlug: c.slug,
    productCount: products.filter(p => p.subcategoryId === s.id).length
  })));
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonData(res, 200, null);

  // GET /api/subcategories — все подкатегории (фильтр по категории, поиск)
  if (req.method === 'GET') {
    const q = req.query || {};
    let result = flatten();
    if (q.categoryId) result = result.filter(s => s.categoryId === parseInt(q.categoryId));
    if (q.categorySlug) result = result.filter(s => s.categorySlug === q.categorySlug);
    if (q.search) {
      const s = String(q.search).toLowerCase();
      result = result.filter(x => x.name.toLowerCase().includes(s));
    }
    return jsonRes(res, 200, paginate(result, q.page, q.pageSize, 40));
  }

  // POST /api/subcategories — создать подкатегорию внутри категории
  if (req.method === 'POST') {
    const body = await getBody(req);
    if (!body.name) return jsonErr(res, 400, 'Поле name обязательно');
    if (!body.categoryId) return jsonErr(res, 400, 'Поле categoryId обязательно');
    const cat = categories.find(c => c.id === parseInt(body.categoryId));
    if (!cat) return jsonErr(res, 404, `Категория ${body.categoryId} не найдена`);

    const all = flatten();
    const newSub = {
      id: all.length ? Math.max(...all.map(s => s.id)) + 1 : cat.id * 10 + 1,
      name: body.name,
      slug: body.slug || String(body.name).toLowerCase().replace(/\s+/g, '-'),
      categoryId: cat.id,
      productCount: 0
    };
    cat.subcategories.push(newSub);
    return jsonData(res, 201, { ...newSub, categoryName: cat.name, categorySlug: cat.slug });
  }

  return jsonErr(res, 405, 'Метод не поддерживается');
};
