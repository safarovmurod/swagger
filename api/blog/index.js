const { blog, jsonRes, paginate, getBody, nextId } = require('../_helpers');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonRes(res, 200, {});

  // GET /api/blog
  if (req.method === 'GET') {
    const q = req.query;
    let result = [...blog];

    if (q.search) {
      const s = q.search.toLowerCase();
      result = result.filter(b => b.title.toLowerCase().includes(s) || b.excerpt.toLowerCase().includes(s));
    }

    // Return full content for list or just excerpts
    if (q.full !== 'true') {
      result = result.map(({ content, ...rest }) => rest);
    }

    return jsonRes(res, 200, paginate(result, q.page, q.pageSize, 12));
  }

  // POST /api/blog — create
  if (req.method === 'POST') {
    const body = await getBody(req);
    if (!body.title) return jsonRes(res, 400, { message: 'Поле title обязательно' });
    const newPost = {
      id: nextId(blog),
      title: body.title,
      excerpt: body.excerpt || '',
      date: body.date || new Date().toISOString().split('T')[0],
      image: body.image || '',
      content: body.content || ''
    };
    blog.push(newPost);
    return jsonRes(res, 201, newPost);
  }

  return jsonRes(res, 405, { message: 'Метод не поддерживается' });
};
