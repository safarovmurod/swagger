const {
  categories, products, jsonRes, jsonData, jsonErr, paginate, readBody,
  queryProducts, requireAdmin
} = require('../_helpers');

function find(key) {
  for (const cat of categories) {
    const sub = cat.subcategories.find(s => s.id === parseInt(key) || s.slug === key);
    if (sub) return { cat, sub };
  }
  return null;
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonData(res, 200, null);

  const q = req.query || {};
  const found = find(q.id);

  // GET /api/subcategories/{id} — подкатегория + её массив товаров
  if (req.method === 'GET') {
    if (!found) return jsonErr(res, 404, `Подкатегория ${q.id} не найдена`, 'NOT_FOUND');
    const { cat, sub } = found;
    const list = queryProducts(products.filter(p => p.subcategoryId === sub.id), q);

    // data — массив товаров подкатегории
    const page = paginate(list, q.page, q.pageSize, 20);
    return jsonRes(res, 200, Object.assign({}, page, {
      subcategory: {
        id: sub.id,
        name: sub.name,
        slug: sub.slug,
        description: sub.description,
        image: sub.image,
        url: `/api/${cat.slug}/${sub.slug}`,
        productCount: products.filter(p => p.subcategoryId === sub.id).length
      },
      category: { id: cat.id, name: cat.name, slug: cat.slug, url: `/api/${cat.slug}` }
    }));
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (!found) return jsonErr(res, 404, `Подкатегория ${q.id} не найдена`, 'NOT_FOUND');

    const body = (await readBody(req)).fields;
    if (req.method === 'PUT' && !body.name) {
      return jsonErr(res, 400, 'PUT заменяет подкатегорию целиком — поле name обязательно', 'VALIDATION_ERROR', [{ field: 'name', message: 'Обязательно' }]);
    }
    const touched = ['name', 'slug', 'description', 'image'].filter(f => body[f] !== undefined);
    if (!touched.length) return jsonErr(res, 400, 'Нечего менять: не передано ни одного поля', 'VALIDATION_ERROR');
    if (body.slug !== undefined && found.cat.subcategories.some(s => s !== found.sub && s.slug === body.slug)) {
      return jsonErr(res, 409, `В категории «${found.cat.name}» уже есть подкатегория со slug «${body.slug}»`, 'CONFLICT');
    }
    touched.forEach(f => { found.sub[f] = body[f]; });
    return jsonData(res, 200, { ...found.sub, categoryName: found.cat.name, categorySlug: found.cat.slug });
  }

  if (req.method === 'DELETE') {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (!found) return jsonErr(res, 404, `Подкатегория ${q.id} не найдена`, 'NOT_FOUND');
    const idx = found.cat.subcategories.indexOf(found.sub);
    const deleted = found.cat.subcategories.splice(idx, 1)[0];
    return jsonData(res, 200, { message: `Подкатегория ${deleted.id} удалена`, deleted });
  }

  return jsonErr(res, 405, 'Метод не поддерживается', 'METHOD_NOT_ALLOWED');
};
