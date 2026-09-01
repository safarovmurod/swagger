const {
  blog, categories, jsonData, jsonErr, readBody, requireAdmin
} = require('../_helpers');

const short = (p) => (p ? {
  id: p.id, slug: p.slug, title: p.title, image: p.image,
  excerpt: p.excerpt, readingTime: p.readingTime, url: `/api/blog/${p.slug}`
} : null);

// Похожие статьи: сначала с общими тегами, потом из той же категории.
// Хватает на блок «читайте также» без второго запроса.
function related(post, limit) {
  const tags = new Set((post.tags || []).map(t => t.toLowerCase()));
  const scored = blog
    .filter(b => b.id !== post.id)
    .map(b => ({
      post: b,
      score: (b.tags || []).filter(t => tags.has(t.toLowerCase())).length * 2 +
        (b.categoryId === post.categoryId ? 1 : 0)
    }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || a.post.id - b.post.id);
  return scored.slice(0, limit).map(x => short(x.post));
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonData(res, 200, null);

  const q = req.query || {};
  const key = q.id;
  const bySlug = q.by === 'slug';
  const idx = bySlug
    ? blog.findIndex(b => b.slug === key)
    : blog.findIndex(b => b.id === parseInt(key) || b.slug === key);
  const post = idx >= 0 ? blog[idx] : null;

  // GET /api/blog/{id} и /api/blog/slug/{slug} — статья целиком:
  // блоки страницы, хлебные крошки, соседние и похожие статьи
  if (req.method === 'GET') {
    if (!post) return jsonErr(res, 404, `Статья ${key} не найдена`, 'NOT_FOUND');
    const cat = categories.find(c => c.id === post.categoryId);
    return jsonData(res, 200, {
      ...post,
      url: `/api/blog/${post.slug}`,
      breadcrumbs: [
        { name: 'Главная', url: '/api' },
        { name: 'Блог', url: '/api/blog' },
        cat ? { name: cat.name, url: `/api/blog?categorySlug=${cat.slug}` } : null,
        { name: post.title, url: `/api/blog/${post.slug}` }
      ].filter(Boolean),
      prevPost: short(blog[idx - 1]),
      nextPost: short(blog[idx + 1]),
      related: related(post, 3)
    });
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (!post) return jsonErr(res, 404, `Статья ${key} не найдена`, 'NOT_FOUND');

    const body = (await readBody(req)).fields;
    if (req.method === 'PUT' && !body.title) {
      return jsonErr(res, 400, 'PUT заменяет статью целиком — поле title обязательно', 'VALIDATION_ERROR', [{ field: 'title', message: 'Обязательно' }]);
    }
    const fields = ['title', 'slug', 'excerpt', 'description', 'content', 'image', 'images', 'imageAlt',
      'tags', 'highlights', 'quote', 'date', 'readingTime', 'isPublished', 'author',
      'categoryId', 'categoryName'];
    const touched = fields.filter(f => body[f] !== undefined);
    if (!touched.length) return jsonErr(res, 400, 'Нечего менять: не передано ни одного поля', 'VALIDATION_ERROR');
    if (body.slug !== undefined && blog.some(b => b !== post && b.slug === body.slug)) {
      return jsonErr(res, 409, `Статья со slug «${body.slug}» уже есть`, 'CONFLICT');
    }

    touched.forEach(f => { post[f] = body[f]; });

    if (body.categoryId !== undefined) {
      const cat = categories.find(c => c.id === parseInt(body.categoryId));
      if (cat) {
        post.categoryName = cat.name;
        post.category = cat.name;
        post.categorySlug = cat.slug;
        post.categoryUrl = `/api/${cat.slug}`;
      }
    }
    if (body.content !== undefined) {
      const paragraphs = String(body.content).split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
      post.paragraphCount = paragraphs.length;
      post.wordCount = paragraphs.join(' ').split(/\s+/).filter(Boolean).length;
      post.sections = paragraphs.map(text => ({ type: 'paragraph', text }));
      if (post.quote) post.sections.push({ type: 'quote', text: post.quote, author: post.author && post.author.name });
    }
    post.updatedAt = new Date().toISOString();
    return jsonData(res, 200, post);
  }

  if (req.method === 'DELETE') {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (!post) return jsonErr(res, 404, `Статья ${key} не найдена`, 'NOT_FOUND');
    const deleted = blog.splice(idx, 1)[0];
    return jsonData(res, 200, { message: `Статья ${deleted.id} удалена`, deleted });
  }

  return jsonErr(res, 405, 'Метод не поддерживается', 'METHOD_NOT_ALLOWED');
};
