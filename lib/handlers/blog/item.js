const { blog, jsonRes, getBody } = require('../_helpers');

const short = (p) => (p ? { id: p.id, slug: p.slug, title: p.title, image: p.image } : null);

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonRes(res, 200, {});

  const key = (req.query || {}).id;
  const idx = blog.findIndex(b => b.id === parseInt(key) || b.slug === key);
  const post = idx >= 0 ? blog[idx] : null;

  // GET /api/blog/:id — статья по id или slug, с соседними статьями
  if (req.method === 'GET') {
    if (!post) return jsonRes(res, 404, { message: `Статья ${key} не найдена` });
    return jsonRes(res, 200, {
      ...post,
      prevPost: short(blog[idx - 1]),
      nextPost: short(blog[idx + 1])
    });
  }

  // PUT /api/blog/:id
  if (req.method === 'PUT') {
    if (!post) return jsonRes(res, 404, { message: `Статья ${key} не найдена` });
    const body = await getBody(req);
    ['title', 'slug', 'excerpt', 'content', 'image', 'date', 'readingTime', 'categoryId', 'categoryName']
      .forEach(f => { if (body[f] !== undefined) post[f] = body[f]; });
    return jsonRes(res, 200, post);
  }

  // DELETE /api/blog/:id
  if (req.method === 'DELETE') {
    if (!post) return jsonRes(res, 404, { message: `Статья ${key} не найдена` });
    const deleted = blog.splice(idx, 1)[0];
    return jsonRes(res, 200, { message: `Статья ${deleted.id} удалена`, deleted });
  }

  return jsonRes(res, 405, { message: 'Метод не поддерживается' });
};
