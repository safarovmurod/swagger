const { products, jsonRes, paginate, getBody } = require('../_helpers');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonRes(res, 200, {});

  // GET /api/products — with filters, search, sort, pagination
  if (req.method === 'GET') {
    const q = req.query;
    let result = [...products];

    // SEARCH
    if (q.search) {
      const s = q.search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(s) ||
        p.description.toLowerCase().includes(s) ||
        p.brand.toLowerCase().includes(s)
      );
    }

    // FILTER: categoryId
    if (q.categoryId) result = result.filter(p => p.categoryId === parseInt(q.categoryId));

    // FILTER: subcategoryId (match subcategory name)
    if (q.subcategory) result = result.filter(p => p.categoryName === q.subcategory);

    // FILTER: onlyPromo (Только акции)
    if (q.onlyPromo === 'true') result = result.filter(p => p.isPromo && p.oldPrice);

    // FILTER: isNew
    if (q.isNew === 'true') result = result.filter(p => p.isNew);

    // FILTER: inStock
    if (q.inStock === 'true') result = result.filter(p => p.inStock);
    if (q.inStock === 'false') result = result.filter(p => !p.inStock);

    // FILTER: brand (comma-separated)
    if (q.brand) {
      const brands = q.brand.split(',').map(b => b.trim().toLowerCase());
      result = result.filter(p => brands.includes(p.brand.toLowerCase()));
    }

    // FILTER: color (comma-separated)
    if (q.color) {
      const colors = q.color.split(',').map(c => c.trim().toLowerCase());
      result = result.filter(p => p.colorOptions.some(c => colors.includes(c.toLowerCase())));
    }

    // FILTER: material (comma-separated)
    if (q.material) {
      const mats = q.material.split(',').map(m => m.trim().toLowerCase());
      result = result.filter(p => p.materials.some(m => mats.includes(m.toLowerCase())));
    }

    // FILTER: price range
    if (q.priceMin) result = result.filter(p => p.price >= parseInt(q.priceMin));
    if (q.priceMax) result = result.filter(p => p.price <= parseInt(q.priceMax));

    // SORT
    const sortBy = q.sortBy || 'popularity';
    const sortDir = q.sortDir || 'desc';
    if (sortBy === 'price') {
      result.sort((a, b) => sortDir === 'asc' ? a.price - b.price : b.price - a.price);
    } else if (sortBy === 'name') {
      result.sort((a, b) => sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
    } else if (sortBy === 'rating') {
      result.sort((a, b) => sortDir === 'asc' ? a.rating - b.rating : b.rating - a.rating);
    } else if (sortBy === 'new') {
      result.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
    }
    // popularity = default order

    return jsonRes(res, 200, paginate(result, q.page, q.pageSize));
  }

  // POST /api/products — create
  if (req.method === 'POST') {
    const body = await getBody(req);
    if (!body.name) return jsonRes(res, 400, { message: 'Name is required' });
    if (!body.price) return jsonRes(res, 400, { message: 'Price is required' });
    const newProduct = {
      id: Math.max(...products.map(p => p.id)) + 1,
      name: body.name,
      price: body.price,
      oldPrice: body.oldPrice || null,
      categoryId: body.categoryId || 0,
      categoryName: body.categoryName || '',
      article: body.article || 'Арт. ' + Date.now(),
      brand: body.brand || '',
      country: body.country || '',
      image: body.image || '',
      images: body.images || [body.image || ''],
      description: body.description || '',
      characteristics: body.characteristics || {},
      colorOptions: body.colorOptions || [],
      materials: body.materials || [],
      ageGroup: body.ageGroup || '',
      rating: 0,
      reviewCount: 0,
      inStock: body.inStock !== false,
      isNew: body.isNew || false,
      isPromo: body.isPromo || false,
      reviews: []
    };
    products.push(newProduct);
    return jsonRes(res, 201, newProduct);
  }

  return jsonRes(res, 405, { message: 'Method not allowed' });
};
