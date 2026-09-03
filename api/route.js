// Запасной маршрут на случай, если хостинг не разберёт catch-all:
// vercel.json перенаправляет сюда /api/:path* и передаёт путь в ?path=
module.exports = require('../lib/api-entry');
