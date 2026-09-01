// ============================================================
// GET /api/images/{slug}.svg — картинка товара, категории или статьи.
//
// Раньше в данных стояли ссылки на внешний фотосток, и часть из них
// отдавала 404 — в карточках висели битые изображения. Теперь картинки
// рисует сам API: SVG всегда доступен, не зависит от чужого сервиса
// и подписан названием товара.
// ============================================================
const { categories, products, blog, setCors } = require('./_helpers');

const COLOR = {
  akcii: '#e07a3f', 'detskaya-mebel': '#bd843f', kolyaski: '#3f7bc0',
  avtokresla: '#c05252', odezhda: '#8a6bc0', kormlenie: '#4e9c6b',
  'gigiena-i-uhod': '#3f9fa8', 'umnye-igrushki': '#b8558f'
};

const ICON = {
  akcii: '<path d="M20.6 13.4 11 3.8H4v7l9.6 9.6a2 2 0 0 0 2.8 0l4.2-4.2a2 2 0 0 0 0-2.8z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
  'detskaya-mebel': '<path d="M3 18V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10"/><path d="M3 13h18M7 6V3M12 6V3M17 6V3M4 18v3M20 18v3"/>',
  kolyaski: '<path d="M4 4h2l2 8h9a5 5 0 0 0 0-8H8"/><circle cx="9" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  avtokresla: '<path d="M7 21V9a4 4 0 0 1 4-4h3l3 6"/><path d="M7 15h9a3 3 0 0 1 0 6H7z"/>',
  odezhda: '<path d="M9 3 5 6l2 4-2 1v10h14V11l-2-1 2-4-4-3-3 2z"/>',
  kormlenie: '<path d="M9 3h6l-1 4H10z"/><path d="M8.5 7h7l.8 12a2 2 0 0 1-2 2.2h-4.6a2 2 0 0 1-2-2.2z"/><path d="M9 12h6"/>',
  'gigiena-i-uhod': '<path d="M12 3s6 5.4 6 10a6 6 0 0 1-12 0c0-4.6 6-10 6-10z"/>',
  'umnye-igrushki': '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/>',
  blog: '<path d="M5 3h11l3 3v15H5z"/><path d="M9 9h7M9 13h7M9 17h4"/>'
};

const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// разбивает подпись на строки, чтобы она помещалась по ширине
function wrap(text, max, maxLines) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if (!line) { line = w; continue; }
    if ((line + ' ' + w).length <= max) line += ' ' + w;
    else { lines.push(line); line = w; }
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (words.join(' ').length > lines.join(' ').length) lines[maxLines - 1] = last.replace(/[,\s]+$/, '') + '…';
  }
  return lines;
}

// slug вида "krovatka-erbesi-11" → сам товар, "cat-kolyaski" → категория, "post-<slug>" → статья
function lookup(slug) {
  if (slug.indexOf('cat-') === 0) {
    const cat = categories.find(c => c.slug === slug.slice(4));
    if (cat) return { title: cat.name, sub: cat.description, catSlug: cat.slug, icon: cat.slug };
  }
  if (slug.indexOf('sub-') === 0) {
    for (const cat of categories) {
      const s = cat.subcategories.find(x => x.slug === slug.slice(4));
      if (s) return { title: s.name, sub: cat.name, catSlug: cat.slug, icon: cat.slug };
    }
  }
  if (slug.indexOf('post-') === 0) {
    const post = blog.find(b => b.slug === slug.slice(5));
    if (post) return { title: post.title, sub: post.categoryName || 'Блог', catSlug: 'blog', icon: 'blog' };
  }
  const p = products.find(x => x.slug === slug);
  if (p) return { title: p.name, sub: `${p.brand} · ${p.country}`, catSlug: p.categorySlug, icon: p.categorySlug };
  return null;
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') { res.statusCode = 200; return res.end(); }

  const q = req.query || {};
  const slug = String(q.slug || '').replace(/\.svg$/i, '');
  const found = lookup(slug) || { title: 'Карапуз', sub: 'изображение недоступно', catSlug: 'akcii', icon: 'akcii' };

  const color = COLOR[found.catSlug] || '#446b80';
  const icon = ICON[found.icon] || ICON.akcii;
  const variant = q.variant === '2' ? 2 : 1;
  const tint = variant === 2 ? 0.13 : 0.07;
  const angle = variant === 2 ? 8 : -6;

  const lines = wrap(found.title, 24, 2);
  const startY = 452 - (lines.length - 1) * 16;
  const text = lines
    .map((l, i) => `<tspan x="300" y="${startY + i * 32}">${esc(l)}</tspan>`)
    .join('');

  const svg =
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" role="img" aria-label="${esc(found.title)}">
  <rect width="600" height="600" fill="#ffffff"/>
  <rect width="600" height="600" fill="${color}" opacity="${tint}"/>
  <circle cx="300" cy="255" r="170" fill="${color}" opacity="0.09"/>
  <g transform="translate(300 255) rotate(${angle}) scale(11) translate(-12 -12)"
     fill="none" stroke="${color}" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" opacity="0.8">
    ${icon}
  </g>
  <text text-anchor="middle" font-family="-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
        font-size="27" font-weight="600" fill="#1d2530">${text}</text>
  <text x="300" y="${startY + lines.length * 32 + 6}" text-anchor="middle"
        font-family="-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
        font-size="19" fill="${color}">${esc(found.sub)}</text>
</svg>`;

  res.statusCode = 200;
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
  return res.end(svg);
};
