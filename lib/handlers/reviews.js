// ============================================================
// Отзывы как самостоятельный раздел.
//   GET    /api/reviews         все отзывы каталога, с фильтрами
//   GET    /api/reviews/{id}    один отзыв
//   PATCH  /api/reviews/{id}    правит автор отзыва или администратор
//   DELETE /api/reviews/{id}    удаляет автор отзыва или администратор
//
// Сами отзывы лежат внутри товаров, поэтому id у них сквозной по каталогу
// (см. scripts/generate-dataset.js). Добавление отзыва осталось там же,
// где было: POST /api/products/{id}/reviews.
// ============================================================
const {
  products, jsonRes, jsonData, jsonErr, paginate, readBody, requireUser
} = require('./_helpers');

// Пересчитываем рейтинг товара после любой правки его отзывов
function recount(product) {
  product.reviewCount = product.reviews.length;
  product.rating = product.reviews.length
    ? Math.round((product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length) * 10) / 10
    : 0;
}

function find(id) {
  const key = parseInt(id, 10);
  if (!Number.isFinite(key)) return null;
  for (const product of products) {
    const index = (product.reviews || []).findIndex(r => r.id === key);
    if (index >= 0) return { product, review: product.reviews[index], index };
  }
  return null;
}

// Отзыв в ответе всегда с товаром, к которому относится
const withProduct = (review, product) => Object.assign({}, review, {
  productId: product.id,
  productName: product.name,
  productSlug: product.slug
});

function list(req, res) {
  const q = req.query || {};
  let rows = [];
  products.forEach(p => (p.reviews || []).forEach(r => rows.push(withProduct(r, p))));

  if (q.productId) rows = rows.filter(r => r.productId === parseInt(q.productId, 10));
  if (q.rating) rows = rows.filter(r => r.rating === parseInt(q.rating, 10));
  if (q.minRating) rows = rows.filter(r => r.rating >= parseFloat(q.minRating));
  if (q.author) {
    const s = String(q.author).toLowerCase();
    rows = rows.filter(r => r.author.toLowerCase().includes(s));
  }
  if (q.search) {
    const s = String(q.search).toLowerCase();
    rows = rows.filter(r =>
      r.comment.toLowerCase().includes(s) ||
      r.author.toLowerCase().includes(s) ||
      r.productName.toLowerCase().includes(s));
  }

  const dir = q.sortDir === 'asc' ? 1 : -1;
  if (q.sortBy === 'rating') rows.sort((a, b) => (a.rating - b.rating) * dir);
  else if (q.sortBy === 'date') rows.sort((a, b) => a.date.localeCompare(b.date) * dir);

  return jsonRes(res, 200, Object.assign({}, paginate(rows, q.page, q.pageSize, 20), {
    averageRating: rows.length
      ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / rows.length) * 10) / 10
      : 0
  }));
}

// Свой отзыв правит и удаляет сам автор, чужой — только администратор.
// У отзывов из каталога автора-пользователя нет, поэтому их трогает админ.
function mayEdit(user, review) {
  if (user.role === 'admin') return true;
  return review.userId !== undefined && review.userId === user.id;
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonData(res, 200, null);

  const q = req.query || {};

  if (q.id === undefined) {
    if (req.method === 'GET') return list(req, res);
    return jsonErr(res, 405, 'Отзыв добавляется через POST /api/products/{id}/reviews', 'METHOD_NOT_ALLOWED');
  }

  const found = find(q.id);
  if (!found) return jsonErr(res, 404, `Отзыв ${q.id} не найден`, 'NOT_FOUND');

  if (req.method === 'GET') {
    return jsonData(res, 200, withProduct(found.review, found.product));
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!mayEdit(user, found.review)) {
      return jsonErr(res, 403, 'Править можно только свой отзыв', 'FORBIDDEN');
    }
    const body = await readBody(req);
    const f = body.fields || {};

    if (f.rating !== undefined) {
      const rating = parseInt(f.rating, 10);
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        return jsonErr(res, 400, 'Оценка должна быть числом от 1 до 5', 'VALIDATION_ERROR',
          [{ field: 'rating', message: 'от 1 до 5' }]);
      }
      found.review.rating = rating;
    }
    ['comment', 'pros', 'cons'].forEach(field => {
      if (f[field] !== undefined) found.review[field] = String(f[field]).slice(0, 2000);
    });
    if (!found.review.comment) {
      return jsonErr(res, 400, 'Текст отзыва не может быть пустым', 'VALIDATION_ERROR');
    }
    found.review.updatedAt = new Date().toISOString();
    recount(found.product);
    return jsonData(res, 200, withProduct(found.review, found.product));
  }

  if (req.method === 'DELETE') {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!mayEdit(user, found.review)) {
      return jsonErr(res, 403, 'Удалить можно только свой отзыв', 'FORBIDDEN');
    }
    const deleted = found.product.reviews.splice(found.index, 1)[0];
    recount(found.product);
    return jsonData(res, 200, {
      message: `Отзыв ${deleted.id} удалён`,
      deleted: withProduct(deleted, found.product)
    });
  }

  return jsonErr(res, 405, 'Метод не поддерживается', 'METHOD_NOT_ALLOWED');
};
