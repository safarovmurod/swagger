const { categories, products } = require('../_lib/data');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const id = parseInt(req.query.id);
  const product = products.find(p => p.id === id);

  if (!product) {
    return res.status(404).json({ message: `Товар ${id} не найден` });
  }

  const cat = categories.find(c => c.id === product.categoryId);

  res.json({
    ...product,
    categoryName: cat ? cat.name : null,
    category: cat
  });
};
