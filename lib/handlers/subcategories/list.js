const {
  categories, products, jsonRes, jsonData, jsonErr, paginate, readBody, requireAdmin, withOwner
} = require('../_helpers');

// Плоский список подкатегорий, собирается из категорий на каждый запрос,
// чтобы отражать изменения, внесённые через POST/PUT/PATCH/DELETE.
function flatten() {
  return categories.flatMap(c => c.subcategories.map(s => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description || '',
    image: s.image || '',
    categoryId: c.id,
    categoryName: c.name,
    categorySlug: c.slug,
    url: `/api/${c.slug}/${s.slug}`,
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
      result = result.filter(x => x.name.toLowerCase().includes(s) || x.description.toLowerCase().includes(s));
    }
    return jsonRes(res, 200, paginate(result, q.page, q.pageSize, 40));
  }

  // POST /api/subcategories — создать подкатегорию внутри категории
  if (req.method === 'POST') {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const body = (await readBody(req)).fields;
    if (!body.name) return jsonErr(res, 400, 'Поле name обязательно', 'VALIDATION_ERROR', [{ field: 'name', message: 'Обязательно' }]);
    if (!body.categoryId) return jsonErr(res, 400, 'Поле categoryId обязательно', 'VALIDATION_ERROR', [{ field: 'categoryId', message: 'Обязательно' }]);
    const cat = categories.find(c => c.id === parseInt(body.categoryId));
    if (!cat) return jsonErr(res, 404, `Категория ${body.categoryId} не найдена`, 'NOT_FOUND');

    const slug = body.slug || String(body.name).toLowerCase().replace(/\s+/g, '-');
    if (cat.subcategories.some(s => s.slug === slug)) {
      return jsonErr(res, 409, `В категории «${cat.name}» уже есть подкатегория со slug «${slug}»`, 'CONFLICT');
    }

    const all = flatten();
    const newSub = {
      id: all.length ? Math.max(...all.map(s => s.id)) + 1 : cat.id * 10 + 1,
      name: body.name,
      slug,
      description: body.description || '',
      image: body.image || '',
      categoryId: cat.id,
      productCount: 0
    };
    withOwner(newSub, req, body);
    cat.subcategories.push(newSub);
    return jsonData(res, 201, { ...newSub, categoryName: cat.name, categorySlug: cat.slug });
  }

  return jsonErr(res, 405, 'Метод не поддерживается', 'METHOD_NOT_ALLOWED');
};
