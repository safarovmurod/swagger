const { categories, products } = require('../_lib/data');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const id = parseInt(req.query.id);
  const cat = categories.find(c => c.id === id);

  if (!cat) {
    return res.status(404).json({ message: `Категория ${id} не найдена` });
  }

  const catProducts = products.filter(p => p.categoryId === id);

  res.json({
    ...cat,
    productCount: catProducts.length,
    products: catProducts
  });
};
