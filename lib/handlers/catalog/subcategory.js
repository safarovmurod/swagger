// GET /api/{category}/{subcategory} — например /api/avtokresla/gruppa-1
// Подкатегория: своё описание + её массив товаров. Родительская категория
// с описанием и справкой info возвращается здесь же, отдельный запрос не нужен.
const {
  categories, products, jsonRes, jsonData, jsonErr, paginate, queryProducts
} = require('../_helpers');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonData(res, 200, null);

  const q = req.query || {};
  const catKey = String(q.category || '');
  const subKey = String(q.subcategory || '');

  if (req.method !== 'GET') return jsonErr(res, 405, 'Метод не поддерживается', 'METHOD_NOT_ALLOWED');

  const cat = categories.find(c => c.slug === catKey || c.id === parseInt(catKey));
  if (!cat) return jsonErr(res, 404, `Категория «${catKey}» не найдена`, 'NOT_FOUND');

  const sub = cat.subcategories.find(s => s.slug === subKey || s.id === parseInt(subKey));
  if (!sub) return jsonErr(res, 404, `Подкатегория «${subKey}» не найдена в категории «${cat.name}»`, 'NOT_FOUND');

  // фильтр по подкатегории здесь уже задан адресом — из запроса его убираем,
  // иначе ?subcategory= из строки запроса переопределил бы путь
  const query = Object.assign({}, q);
  delete query.subcategory;
  const list = queryProducts(products.filter(p => p.subcategoryId === sub.id), query);

  // data — массив товаров подкатегории; подкатегория и её категория рядом
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
    category: {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      image: cat.image,
      info: cat.info,
      url: `/api/${cat.slug}`
    }
  }));
};
