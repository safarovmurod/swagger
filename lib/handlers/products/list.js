const { products, categories, jsonRes, jsonData, jsonErr, paginate, getBody, lightProduct, nextId } = require('../_helpers');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonData(res, 200, null);

  // GET /api/products — фильтры, поиск, сортировка, пагинация
  if (req.method === 'GET') {
    const q = req.query || {};
    let result = [...products];

    if (q.search) {
      const s = String(q.search).toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(s) ||
        p.description.toLowerCase().includes(s) ||
        p.brand.toLowerCase().includes(s) ||
        p.article.toLowerCase().includes(s)
      );
    }

    if (q.categoryId) result = result.filter(p => p.categoryId === parseInt(q.categoryId));
    if (q.categorySlug) result = result.filter(p => p.categorySlug === q.categorySlug);
    if (q.subcategoryId) result = result.filter(p => p.subcategoryId === parseInt(q.subcategoryId));
    if (q.subcategorySlug) result = result.filter(p => p.subcategorySlug === q.subcategorySlug);
    // обратная совместимость: ?subcategory= принимает и название, и slug
    if (q.subcategory) {
      const s = String(q.subcategory).toLowerCase();
      result = result.filter(p =>
        p.subcategoryName.toLowerCase() === s || p.subcategorySlug === s);
    }

    if (q.onlyPromo === 'true') result = result.filter(p => p.isPromo && p.oldPrice);
    if (q.isNew === 'true') result = result.filter(p => p.isNew);
    if (q.inStock === 'true') result = result.filter(p => p.inStock);
    if (q.inStock === 'false') result = result.filter(p => !p.inStock);

    const listFilter = (value, getValues) => {
      const wanted = String(value).split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
      if (!wanted.length) return;
      result = result.filter(p => getValues(p).some(v => wanted.includes(String(v).toLowerCase())));
    };
    if (q.brand) listFilter(q.brand, p => [p.brand]);
    if (q.country) listFilter(q.country, p => [p.country]);
    if (q.color) listFilter(q.color, p => p.colorOptions);
    if (q.material) listFilter(q.material, p => p.materials);

    if (q.priceMin) result = result.filter(p => p.price >= parseInt(q.priceMin));
    if (q.priceMax) result = result.filter(p => p.price <= parseInt(q.priceMax));
    if (q.ratingMin) result = result.filter(p => p.rating >= parseFloat(q.ratingMin));

    const sortBy = q.sortBy || 'popularity';
    const dir = q.sortDir === 'asc' ? 1 : -1;
    if (sortBy === 'price') result.sort((a, b) => (a.price - b.price) * dir);
    else if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name, 'ru') * dir);
    else if (sortBy === 'rating') result.sort((a, b) => (a.rating - b.rating) * dir);
    else if (sortBy === 'discount') result.sort((a, b) => (a.discount - b.discount) * dir);
    else if (sortBy === 'new') result.sort((a, b) => ((a.isNew ? 1 : 0) - (b.isNew ? 1 : 0)) * dir);
    // popularity — порядок каталога

    if (q.light === 'true') result = result.map(lightProduct);

    return jsonRes(res, 200, paginate(result, q.page, q.pageSize, 20));
  }

  // POST /api/products — создать товар
  if (req.method === 'POST') {
    const body = await getBody(req);
    if (!body.name) return jsonErr(res, 400, 'Поле name обязательно');
    if (body.price === undefined || body.price === null) return jsonErr(res, 400, 'Поле price обязательно');

    const category = categories.find(c => c.id === parseInt(body.categoryId));
    const subcategory = category && body.subcategoryId
      ? category.subcategories.find(s => s.id === parseInt(body.subcategoryId))
      : null;

    const id = nextId(products);
    const newProduct = {
      id,
      name: body.name,
      slug: body.slug || `product-${id}`,
      price: body.price,
      oldPrice: body.oldPrice || null,
      discount: body.oldPrice ? Math.round((1 - body.price / body.oldPrice) * 100) : 0,
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
      inStock: body.inStock !== false,
      isNew: body.isNew === true,
      isPromo: body.isPromo === true,
      reviews: []
    };
    products.push(newProduct);
    if (category) category.productCount = products.filter(p => p.categoryId === category.id).length;
    return jsonData(res, 201, newProduct);
  }

  return jsonErr(res, 405, 'Метод не поддерживается');
};
