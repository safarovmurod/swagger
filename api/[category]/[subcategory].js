// GET /api/{category}/{subcategory} — например /api/avtokresla/gruppa-1
// Подкатегория: своё описание + её массив товаров. Родительская категория
// с описанием и справкой info возвращается здесь же, отдельный запрос не нужен.
const { categories, products, jsonRes, paginate, lightProduct } = require('../_helpers');

// Та же страховка: /api/products/12, /api/blog/3 и подобные всегда попадают
// в свой обработчик, даже если хостинг сопоставит их с динамическим маршрутом.
const DELEGATE = {
  products: '../products/[id].js',
  categories: '../categories/[id].js',
  subcategories: '../subcategories/[id].js',
  promotions: '../promotions/[id].js',
  blog: '../blog/[id].js'
};

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonRes(res, 200, {});

  const q = req.query || {};
  const catKey = String(q.category || '');
  const subKey = String(q.subcategory || '');
  if (DELEGATE[catKey]) {
    req.query = Object.assign({}, q, { id: subKey });
    return require(DELEGATE[catKey])(req, res);
  }

  if (req.method !== 'GET') return jsonRes(res, 405, { message: 'Метод не поддерживается' });

  const cat = categories.find(c => c.slug === catKey || c.id === parseInt(catKey));
  if (!cat) return jsonRes(res, 404, { message: `Категория «${catKey}» не найдена` });

  const sub = cat.subcategories.find(s => s.slug === subKey || s.id === parseInt(subKey));
  if (!sub) return jsonRes(res, 404, { message: `Подкатегория «${subKey}» не найдена в категории «${cat.name}»` });

  let list = products.filter(p => p.subcategoryId === sub.id);

  if (q.search) {
    const s = String(q.search).toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(s) ||
      p.brand.toLowerCase().includes(s) || p.description.toLowerCase().includes(s));
  }
  if (q.onlyPromo === 'true') list = list.filter(p => p.isPromo);
  if (q.isNew === 'true') list = list.filter(p => p.isNew);
  if (q.inStock === 'true') list = list.filter(p => p.inStock);
  if (q.inStock === 'false') list = list.filter(p => !p.inStock);
  if (q.brand) {
    const brands = String(q.brand).split(',').map(b => b.trim().toLowerCase());
    list = list.filter(p => brands.includes(p.brand.toLowerCase()));
  }
  if (q.priceMin) list = list.filter(p => p.price >= parseInt(q.priceMin));
  if (q.priceMax) list = list.filter(p => p.price <= parseInt(q.priceMax));

  const dir = q.sortDir === 'asc' ? 1 : -1;
  if (q.sortBy === 'price') list.sort((a, b) => (a.price - b.price) * dir);
  else if (q.sortBy === 'rating') list.sort((a, b) => (a.rating - b.rating) * dir);
  else if (q.sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'ru') * dir);
  else if (q.sortBy === 'discount') list.sort((a, b) => (a.discount - b.discount) * dir);

  if (q.light === 'true') list = list.map(lightProduct);

  return jsonRes(res, 200, {
    id: sub.id,
    name: sub.name,
    slug: sub.slug,
    description: sub.description,
    url: `/api/${cat.slug}/${sub.slug}`,
    category: {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      image: cat.image,
      info: cat.info
    },
    productCount: products.filter(p => p.subcategoryId === sub.id).length,
    products: paginate(list, q.page, q.pageSize, 20)
  });
};
