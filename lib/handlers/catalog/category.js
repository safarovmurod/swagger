// GET /api/{category} — например /api/avtokresla
// Категория целиком: описание, справка info, список подкатегорий и все её товары.
const {
  categories, products, jsonRes, jsonData, jsonErr, paginate, queryProducts
} = require('../_helpers');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonData(res, 200, null);

  const q = req.query || {};
  const key = String(q.category || '');

  if (req.method !== 'GET') return jsonErr(res, 405, 'Метод не поддерживается', 'METHOD_NOT_ALLOWED');
  const cat = categories.find(c => c.slug === key || c.id === parseInt(key));
  if (!cat) return jsonErr(res, 404, `Категория «${key}» не найдена`, 'NOT_FOUND');

  const list = queryProducts(products.filter(p => p.categoryId === cat.id), q);

  // data — сам массив товаров, чтобы его можно было сразу .map(),
  // а описание категории лежит рядом в том же ответе
  const page = paginate(list, q.page, q.pageSize, 20);
  return jsonRes(res, 200, Object.assign({}, page, {
    category: {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      image: cat.image,
      info: cat.info,
      url: `/api/${cat.slug}`,
      productCount: products.filter(p => p.categoryId === cat.id).length,
      subcategoryCount: cat.subcategories.length
    },
    subcategories: cat.subcategories.map(s => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      description: s.description,
      image: s.image,
      url: `/api/${cat.slug}/${s.slug}`,
      productCount: products.filter(p => p.subcategoryId === s.id).length
    }))
  }));
};
