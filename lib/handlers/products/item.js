const {
  products, categories, jsonData, jsonErr, readBody, miniProduct, requireAdmin
} = require('../_helpers');

// Поля, которые клиент менять не может: id — ключ записи, а рейтинг
// и число отзывов считаются по самим отзывам.
const READ_ONLY = ['id', 'reviews', 'rating', 'reviewCount'];

function findProduct(key, bySlugOnly) {
  if (bySlugOnly) return products.find(p => p.slug === key);
  return products.find(p => p.id === parseInt(key) || p.slug === key);
}

// Пересобираем связи с категорией, если её поменяли
function relink(product) {
  const category = categories.find(c => c.id === parseInt(product.categoryId));
  if (category) {
    product.categoryName = category.name;
    product.categorySlug = category.slug;
    const sub = category.subcategories.find(s => s.id === parseInt(product.subcategoryId));
    if (sub) {
      product.subcategoryName = sub.name;
      product.subcategorySlug = sub.slug;
    }
  }
  product.discount = product.oldPrice && product.oldPrice > product.price
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : 0;
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonData(res, 200, null);

  const q = req.query || {};
  const bySlug = q.by === 'slug';
  const product = findProduct(q.id, bySlug);

  // GET /api/products/{id} и /api/products/slug/{slug} — карточка + похожие
  if (req.method === 'GET') {
    if (!product) return jsonErr(res, 404, `Товар ${q.id} не найден`, 'NOT_FOUND');
    const similar = products
      .filter(p => p.subcategoryId === product.subcategoryId && p.id !== product.id)
      .slice(0, 8)
      .map(miniProduct);
    return jsonData(res, 200, { ...product, similar });
  }

  // PUT — заменить целиком, PATCH — поправить отдельные поля.
  // Разница в проверке: PUT требует name и price, PATCH берёт что прислали.
  if (req.method === 'PUT' || req.method === 'PATCH') {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (!product) return jsonErr(res, 404, `Товар ${q.id} не найден`, 'NOT_FOUND');

    const body = (await readBody(req)).fields;
    const keys = Object.keys(body).filter(k => !READ_ONLY.includes(k));

    if (req.method === 'PUT' && (!body.name || body.price === undefined)) {
      return jsonErr(res, 400, 'PUT заменяет товар целиком — нужны как минимум name и price', 'VALIDATION_ERROR', [
        !body.name ? { field: 'name', message: 'Обязательно' } : null,
        body.price === undefined ? { field: 'price', message: 'Обязательно' } : null
      ].filter(Boolean));
    }
    if (!keys.length) {
      return jsonErr(res, 400, 'Нечего менять: не передано ни одного поля', 'VALIDATION_ERROR');
    }
    if (body.price !== undefined) {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price <= 0) {
        return jsonErr(res, 400, 'Цена должна быть положительным числом', 'VALIDATION_ERROR', [{ field: 'price', message: 'Положительное число' }]);
      }
      body.price = price;
    }
    if (body.oldPrice !== undefined && body.oldPrice !== null && body.oldPrice !== '') {
      const oldPrice = Number(body.oldPrice);
      if (!Number.isFinite(oldPrice) || oldPrice <= 0) {
        return jsonErr(res, 400, 'Старая цена должна быть положительным числом', 'VALIDATION_ERROR', [{ field: 'oldPrice', message: 'Положительное число' }]);
      }
      body.oldPrice = oldPrice;
    }

    keys.forEach(key => { product[key] = body[key]; });
    relink(product);
    return jsonData(res, 200, product);
  }

  // DELETE /api/products/{id}
  if (req.method === 'DELETE') {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const idx = products.findIndex(p => p === product);
    if (idx < 0) return jsonErr(res, 404, `Товар ${q.id} не найден`, 'NOT_FOUND');
    const deleted = products.splice(idx, 1)[0];
    return jsonData(res, 200, { message: `Товар ${deleted.id} удалён`, deleted });
  }

  return jsonErr(res, 405, 'Метод не поддерживается', 'METHOD_NOT_ALLOWED');
};
