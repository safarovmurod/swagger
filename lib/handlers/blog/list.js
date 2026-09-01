const {
  blog, categories, jsonRes, jsonData, jsonErr, paginate, readBody, nextId, requireAdmin
} = require('../_helpers');

// В списке отдаём всё, кроме тяжёлого: полный текст и блоки страницы
// приходят по ?full=true или в ответе одной статьи. Описание, автор,
// теги и «коротко о главном» остаются — по ним уже можно собрать карточку.
const forList = ({ content, sections, ...rest }) => rest;

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonData(res, 200, null);

  // GET /api/blog — статьи блога
  if (req.method === 'GET') {
    const q = req.query || {};
    let result = [...blog];

    const term = q.search || q.q;
    if (term) {
      const s = String(term).toLowerCase();
      result = result.filter(b =>
        b.title.toLowerCase().includes(s) ||
        b.excerpt.toLowerCase().includes(s) ||
        (b.description || '').toLowerCase().includes(s) ||
        b.content.toLowerCase().includes(s) ||
        (b.author && b.author.name.toLowerCase().includes(s)) ||
        (b.tags || []).some(t => t.toLowerCase().includes(s)));
    }
    if (q.categoryId) result = result.filter(b => b.categoryId === parseInt(q.categoryId));
    if (q.tag) {
      const t = String(q.tag).toLowerCase();
      result = result.filter(b => (b.tags || []).some(x => x.toLowerCase() === t));
    }
    if (q.author) {
      const a = String(q.author).toLowerCase();
      result = result.filter(b => b.author && (b.author.name.toLowerCase().includes(a) || b.author.slug === a));
    }
    if (q.categorySlug) {
      const cat = categories.find(c => c.slug === q.categorySlug);
      result = cat ? result.filter(b => b.categoryId === cat.id) : [];
    }
    if (q.isPublished === 'true') result = result.filter(b => b.isPublished);
    if (q.isPublished === 'false') result = result.filter(b => !b.isPublished);

    const dir = q.sortDir === 'asc' ? 1 : -1;
    const sort = String(q.sort || q.sortBy || '').toLowerCase();
    if (sort === 'date' || sort === 'newest') result.sort((a, b) => a.date.localeCompare(b.date) * (sort === 'newest' ? -1 : dir));
    else if (sort === 'title') result.sort((a, b) => a.title.localeCompare(b.title, 'ru') * dir);
    else if (sort === 'readingtime') result.sort((a, b) => (a.readingTime - b.readingTime) * dir);

    if (q.full !== 'true') result = result.map(forList);

    return jsonRes(res, 200, paginate(result, q.page, q.pageSize, 12));
  }

  // POST /api/blog — создать статью (только администратор)
  if (req.method === 'POST') {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const body = (await readBody(req)).fields;
    if (!body.title) return jsonErr(res, 400, 'Поле title обязательно', 'VALIDATION_ERROR', [{ field: 'title', message: 'Обязательно' }]);
    const cat = categories.find(c => c.id === parseInt(body.categoryId));
    const id = nextId(blog);
    const slug = body.slug || `statya-${id}`;
    if (blog.some(b => b.slug === slug)) {
      return jsonErr(res, 409, `Статья со slug «${slug}» уже есть`, 'CONFLICT', [{ field: 'slug', message: 'Занят' }]);
    }
    const date = body.date || new Date().toISOString().split('T')[0];
    const content = String(body.content || '');
    const paragraphs = content.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
    const author = body.author && typeof body.author === 'object'
      ? body.author
      : { name: String(body.author || admin.fullName || 'Редакция «Карапуз»'), role: 'редакция', slug: 'redakciya', avatar: '' };

    const newPost = {
      id,
      slug,
      title: body.title,
      excerpt: body.excerpt || '',
      description: body.description || body.excerpt || '',
      date,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      readingTime: parseInt(body.readingTime, 10) || Math.max(1, Math.round(content.length / 900)),
      isPublished: body.isPublished !== false && body.isPublished !== 'false',
      categoryId: cat ? cat.id : (parseInt(body.categoryId) || 0),
      categoryName: cat ? cat.name : (body.categoryName || ''),
      category: cat ? cat.name : (body.categoryName || ''),
      categorySlug: cat ? cat.slug : '',
      categoryUrl: cat ? `/api/${cat.slug}` : '',
      author,
      image: body.image || '',
      images: body.images || (body.image ? [body.image] : []),
      imageAlt: body.title,
      tags: body.tags || [],
      highlights: body.highlights || [],
      quote: body.quote || '',
      wordCount: paragraphs.join(' ').split(/\s+/).filter(Boolean).length,
      paragraphCount: paragraphs.length,
      sections: paragraphs.map(text => ({ type: 'paragraph', text })),
      content
    };
    blog.push(newPost);
    return jsonData(res, 201, newPost);
  }

  return jsonErr(res, 405, 'Метод не поддерживается', 'METHOD_NOT_ALLOWED');
};
