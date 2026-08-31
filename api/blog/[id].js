const { blog, jsonRes, getBody } = require('../_helpers');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonRes(res, 200, {});

  const id = parseInt(req.query.id);
  const post = blog.find(b => b.id === id);

  // GET /api/blog/:id
  if (req.method === 'GET') {
    if (!post) return jsonRes(res, 404, { message: `Blog post ${id} not found` });

    // Find next post for navigation
    const idx = blog.findIndex(b => b.id === id);
    const nextPost = idx < blog.length - 1 ? { id: blog[idx + 1].id, title: blog[idx + 1].title } : null;

    return jsonRes(res, 200, { ...post, nextPost });
  }

  // PUT /api/blog/:id
  if (req.method === 'PUT') {
    if (!post) return jsonRes(res, 404, { message: `Blog post ${id} not found` });
    const body = await getBody(req);
    if (body.title) post.title = body.title;
    if (body.excerpt) post.excerpt = body.excerpt;
    if (body.content) post.content = body.content;
    if (body.image) post.image = body.image;
    return jsonRes(res, 200, post);
  }

  // DELETE /api/blog/:id
  if (req.method === 'DELETE') {
    const idx = blog.findIndex(b => b.id === id);
    if (idx < 0) return jsonRes(res, 404, { message: `Blog post ${id} not found` });
    const deleted = blog.splice(idx, 1)[0];
    return jsonRes(res, 200, { message: `Blog post ${id} deleted`, deleted });
  }

  return jsonRes(res, 405, { message: 'Method not allowed' });
};
