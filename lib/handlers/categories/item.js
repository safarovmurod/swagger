const {
  categories, products, jsonRes, jsonData, jsonErr, paginate, readBody, lightProduct,
  queryProducts, requireAdmin, ownerBlocks
} = require('../_helpers');

const describe = (cat) => ({
  id: cat.id,
  name: cat.name,
  slug: cat.slug,
  description: cat.description,
  image: cat.image,
  info: cat.info,
  url: `/api/${cat.slug}`,
  productCount: products.filter(p => p.categoryId === cat.id).length,
  subcategoryCount: cat.subcategories.length
});

const describeSubs = (cat) => cat.subcategories.map(s => ({
  ...s,
  url: `/api/${cat.slug}/${s.slug}`,
  productCount: products.filter(p => p.subcategoryId === s.id).length
}));

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonData(res, 200, null);

  const q = req.query || {};
  const key = q.id;
  const cat = categories.find(c => c.id === parseInt(key) || c.slug === key);

  // GET /api/categories/{id}/products — только товары категории,
  // с теми же фильтрами и сортировкой, что и /api/products
  if (q.sub === 'products') {
    if (req.method !== 'GET') return jsonErr(res, 405, 'Метод не поддерживается', 'METHOD_NOT_ALLOWED');
    if (!cat) return jsonErr(res, 404, `Категория ${key} не найдена`, 'NOT_FOUND');
    const list = queryProducts(products.filter(p => p.categoryId === cat.id), q);
    return jsonRes(res, 200, Object.assign({}, paginate(list, q.page, q.pageSize, 20), {
      category: describe(cat),
      subcategories: describeSubs(cat)
    }));
  }

  // GET /api/categories/{id} — категория + подкатегории + товары (с пагинацией)
  if (req.method === 'GET') {
    if (!cat) return jsonErr(res, 404, `Категория ${key} не найдена`, 'NOT_FOUND');
    let catProducts = queryProducts(products.filter(p => p.categoryId === cat.id), q);
    if (q.light !== 'false' && q.light !== 'true') catProducts = catProducts.map(lightProduct);

    // data — массив товаров категории, описание категории рядом
    const page = paginate(catProducts, q.page, q.pageSize, 20);
    return jsonRes(res, 200, Object.assign({}, page, {
      category: describe(cat),
      subcategories: describeSubs(cat)
    }));
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (!cat) return jsonErr(res, 404, `Категория ${key} не найдена`, 'NOT_FOUND');

    const body = (await readBody(req)).fields;
    const denied = ownerBlocks(cat, req, body);
    if (denied) return jsonErr(res, 403, denied, 'FORBIDDEN');
    if (req.method === 'PUT' && !body.name) {
      return jsonErr(res, 400, 'PUT заменяет категорию целиком — поле name обязательно', 'VALIDATION_ERROR', [{ field: 'name', message: 'Обязательно' }]);
    }
    const touched = ['name', 'slug', 'description', 'image', 'info']
      .filter(f => body[f] !== undefined);
    if (!touched.length && !Array.isArray(body.subcategories)) {
      return jsonErr(res, 400, 'Нечего менять: не передано ни одного поля', 'VALIDATION_ERROR');
    }
    if (body.slug !== undefined && categories.some(c => c !== cat && c.slug === body.slug)) {
      return jsonErr(res, 409, `Категория со slug «${body.slug}» уже есть`, 'CONFLICT');
    }
    touched.forEach(f => { cat[f] = body[f]; });
    if (Array.isArray(body.subcategories)) cat.subcategories = body.subcategories;
    return jsonData(res, 200, cat);
  }

  if (req.method === 'DELETE') {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const idx = categories.findIndex(c => c === cat);
    if (idx < 0) return jsonErr(res, 404, `Категория ${key} не найдена`, 'NOT_FOUND');
    const denied = ownerBlocks(cat, req, null);
    if (denied) return jsonErr(res, 403, denied, 'FORBIDDEN');
    const deleted = categories.splice(idx, 1)[0];
    return jsonData(res, 200, { message: `Категория ${deleted.id} удалена`, deleted });
  }

  return jsonErr(res, 405, 'Метод не поддерживается', 'METHOD_NOT_ALLOWED');
};
