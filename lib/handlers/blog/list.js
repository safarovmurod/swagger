const { blog, categories, jsonRes, paginate, getBody, nextId } = require('../_helpers');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonRes(res, 200, {});

  // GET /api/blog — статьи блога
  if (req.method === 'GET') {
    const q = req.query || {};
    let result = [...blog];

    if (q.search) {
      const s = String(q.search).toLowerCase();
      result = result.filter(b =>
        b.title.toLowerCase().includes(s) ||
        b.excerpt.toLowerCase().includes(s) ||
        b.content.toLowerCase().includes(s));
    }
    if (q.categoryId) result = result.filter(b => b.categoryId === parseInt(q.categoryId));
    if (q.categorySlug) {
      const cat = categories.find(c => c.slug === q.categorySlug);
      result = cat ? result.filter(b => b.categoryId === cat.id) : [];
    }

    const dir = q.sortDir === 'asc' ? 1 : -1;
    if (q.sortBy === 'date') result.sort((a, b) => a.date.localeCompare(b.date) * dir);
    else if (q.sortBy === 'title') result.sort((a, b) => a.title.localeCompare(b.title, 'ru') * dir);
    else if (q.sortBy === 'readingTime') result.sort((a, b) => (a.readingTime - b.readingTime) * dir);

    // по умолчанию в списке отдаём анонсы, полный текст — по full=true
    if (q.full !== 'true') result = result.map(({ content, ...rest }) => rest);

    return jsonRes(res, 200, paginate(result, q.page, q.pageSize, 12));
  }

  // POST /api/blog — создать статью
  if (req.method === 'POST') {
    const body = await getBody(req);
    if (!body.title) return jsonRes(res, 400, { message: 'Поле title обязательно' });
    const cat = categories.find(c => c.id === parseInt(body.categoryId));
    const id = nextId(blog);
    const newPost = {
      id,
      slug: body.slug || `statya-${id}`,
      title: body.title,
      excerpt: body.excerpt || '',
      date: body.date || new Date().toISOString().split('T')[0],
      readingTime: body.readingTime || Math.max(1, Math.round(String(body.content || '').length / 900)),
      categoryId: cat ? cat.id : (parseInt(body.categoryId) || 0),
      categoryName: cat ? cat.name : (body.categoryName || ''),
      image: body.image || '',
      content: body.content || ''
    };
    blog.push(newPost);
    return jsonRes(res, 201, newPost);
  }

  return jsonRes(res, 405, { message: 'Метод не поддерживается' });
};
