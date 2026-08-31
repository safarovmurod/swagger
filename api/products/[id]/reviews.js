const { products, jsonRes, getBody } = require('../../_helpers');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonRes(res, 200, {});

  const productId = parseInt(req.query.id);
  const product = products.find(p => p.id === productId);
  if (!product) return jsonRes(res, 404, { message: `Товар ${productId} не найден` });

  // GET /api/products/:id/reviews
  if (req.method === 'GET') {
    return jsonRes(res, 200, {
      productId: product.id,
      productName: product.name,
      reviews: product.reviews,
      reviewCount: product.reviews.length,
      averageRating: product.reviews.length
        ? (product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length).toFixed(1)
        : 0
    });
  }

  // POST /api/products/:id/reviews — add review
  if (req.method === 'POST') {
    const body = await getBody(req);
    if (!body.author) return jsonRes(res, 400, { message: 'Поле author обязательно' });
    if (!body.comment) return jsonRes(res, 400, { message: 'Поле comment обязательно' });

    const review = {
      id: product.reviews.length > 0 ? Math.max(...product.reviews.map(r => r.id)) + 1 : 1,
      author: body.author,
      date: new Date().toISOString().split('T')[0],
      rating: body.rating || 5,
      pros: body.pros || '',
      cons: body.cons || '',
      comment: body.comment
    };

    product.reviews.push(review);
    product.reviewCount = product.reviews.length;
    product.rating = Math.round((product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length) * 10) / 10;

    return jsonRes(res, 201, review);
  }

  return jsonRes(res, 405, { message: 'Метод не поддерживается' });
};
