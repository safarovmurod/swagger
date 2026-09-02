const {
  products, jsonRes, jsonData, jsonErr, paginate, readBody, requireUser
} = require('../_helpers');

// Сквозной id по всему каталогу — чтобы отзыв можно было найти
// по /api/reviews/{id}, не зная товара
function nextReviewId() {
  let max = 0;
  products.forEach(p => (p.reviews || []).forEach(r => { if (r.id > max) max = r.id; }));
  return max + 1;
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonData(res, 200, null);

  const key = req.query.id;
  const product = products.find(p => p.id === parseInt(key) || p.slug === key);
  if (!product) return jsonErr(res, 404, `Товар ${key} не найден`, 'NOT_FOUND');

  // GET /api/products/{id}/reviews — data это массив отзывов, готовый к .map()
  if (req.method === 'GET') {
    const q = req.query || {};
    let list = product.reviews.slice();
    if (q.minRating) list = list.filter(r => r.rating >= parseFloat(q.minRating));
    const dir = q.sortDir === 'asc' ? 1 : -1;
    if (q.sortBy === 'rating') list.sort((a, b) => (a.rating - b.rating) * dir);
    else if (q.sortBy === 'date') list.sort((a, b) => a.date.localeCompare(b.date) * dir);

    const page = paginate(list, q.page, q.pageSize, 20);
    return jsonRes(res, 200, Object.assign({}, page, {
      product: { id: product.id, name: product.name, slug: product.slug },
      averageRating: product.reviews.length
        ? Math.round((product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length) * 10) / 10
        : 0
    }));
  }

  // POST /api/products/{id}/reviews — отзыв оставляет кто угодно.
  // Если студент вошёл, имя подставляется из профиля, иначе берётся из тела.
  if (req.method === 'POST') {
    const user = await requireUser(req, res);
    if (!user) return;

    const body = (await readBody(req)).fields;
    const author = String(body.author || '').trim() ||
      (user.id ? user.fullName : '') || 'Покупатель';
    const comment = String(body.comment || '').trim();
    if (!comment) {
      return jsonErr(res, 400, 'Поле comment обязательно', 'VALIDATION_ERROR', [{ field: 'comment', message: 'Обязательно' }]);
    }
    const rating = body.rating === undefined ? 5 : parseInt(body.rating, 10);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return jsonErr(res, 400, 'Оценка должна быть числом от 1 до 5', 'VALIDATION_ERROR', [{ field: 'rating', message: 'от 1 до 5' }]);
    }
    const review = {
      id: nextReviewId(),
      productId: product.id,
      userId: user.id || null,
      author,
      date: new Date().toISOString().split('T')[0],
      rating,
      pros: String(body.pros || '').slice(0, 500),
      cons: String(body.cons || '').slice(0, 500),
      comment: comment.slice(0, 2000)
    };

    product.reviews.push(review);
    product.reviewCount = product.reviews.length;
    product.rating = Math.round((product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length) * 10) / 10;

    return jsonData(res, 201, review);
  }

  return jsonErr(res, 405, 'Метод не поддерживается', 'METHOD_NOT_ALLOWED');
};
