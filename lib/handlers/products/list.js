const {
  products, categories, jsonRes, jsonData, jsonErr, paginate, readBody, nextId, queryProducts, requireAdmin
} = require('../_helpers');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonData(res, 200, null);

  // GET /api/products — фильтры, поиск, сортировка, пагинация.
  // Сюда же приходят /api/products/search и /api/products/filter:
  // это те же правила отбора, просто короткие адреса под конкретную задачу.
  if (req.method === 'GET') {
    const q = req.query || {};
    const result = queryProducts(products, q);
    const page = paginate(result, q.page, q.pageSize, 20);
    if (q.q || q.search) page.query = String(q.q || q.search);
    return jsonRes(res, 200, page);
  }

  // POST /api/products — создать товар (только администратор)
  if (req.method === 'POST') {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const body = (await readBody(req)).fields;
    if (!body.name) return jsonErr(res, 400, 'Поле name обязательно', 'VALIDATION_ERROR', [{ field: 'name', message: 'Обязательно' }]);
    if (body.price === undefined || body.price === null) {
      return jsonErr(res, 400, 'Поле price обязательно', 'VALIDATION_ERROR', [{ field: 'price', message: 'Обязательно' }]);
    }
    const price = Number(body.price);
    if (!Number.isFinite(price) || price <= 0) {
      return jsonErr(res, 400, 'Цена должна быть положительным числом', 'VALIDATION_ERROR', [{ field: 'price', message: 'Положительное число' }]);
    }
    const oldPrice = body.oldPrice === undefined || body.oldPrice === null || body.oldPrice === ''
      ? null : Number(body.oldPrice);
    if (oldPrice !== null && (!Number.isFinite(oldPrice) || oldPrice <= 0)) {
      return jsonErr(res, 400, 'Старая цена должна быть положительным числом', 'VALIDATION_ERROR', [{ field: 'oldPrice', message: 'Положительное число' }]);
    }

    const category = categories.find(c => c.id === parseInt(body.categoryId));
    const subcategory = category && body.subcategoryId
      ? category.subcategories.find(s => s.id === parseInt(body.subcategoryId))
      : null;

    const id = nextId(products);
    const newProduct = {
      id,
      name: body.name,
      slug: body.slug || `product-${id}`,
      price,
      oldPrice,
      discount: oldPrice && oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0,
      categoryId: category ? category.id : (parseInt(body.categoryId) || 0),
      categoryName: category ? category.name : (body.categoryName || ''),
      categorySlug: category ? category.slug : '',
      subcategoryId: subcategory ? subcategory.id : (parseInt(body.subcategoryId) || 0),
      subcategoryName: subcategory ? subcategory.name : (body.subcategoryName || ''),
      subcategorySlug: subcategory ? subcategory.slug : '',
      article: body.article || `Арт. ${100000 + id}-${String(id).padStart(4, '0')}`,
      brand: body.brand || '',
      country: body.country || '',
      image: body.image || '',
      images: body.images || (body.image ? [body.image] : []),
      description: body.description || '',
      characteristics: body.characteristics || {},
      colorOptions: body.colorOptions || [],
      materials: body.materials || [],
      ageGroup: body.ageGroup || '',
      rating: 0,
      reviewCount: 0,
      inStock: body.inStock !== false && body.inStock !== 'false',
      isNew: body.isNew === true || body.isNew === 'true',
      isPromo: body.isPromo === true || body.isPromo === 'true',
      reviews: []
    };
    products.push(newProduct);
    if (category) category.productCount = products.filter(p => p.categoryId === category.id).length;
    return jsonData(res, 201, newProduct);
  }

  return jsonErr(res, 405, 'Метод не поддерживается', 'METHOD_NOT_ALLOWED');
};
