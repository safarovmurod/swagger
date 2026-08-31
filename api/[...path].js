// Единственная serverless-функция: обслуживает все /api/* маршруты.
// Разбор пути и выбор обработчика — в lib/router.js.
const { resolve } = require('../lib/router');
const { jsonRes } = require('../lib/handlers/_helpers');

module.exports = async (req, res) => {
  const q = req.query || {};
  // Vercel кладёт сегменты пути в query.path, локальный сервер — тоже
  const raw = q.path;
  const segments = Array.isArray(raw) ? raw : (typeof raw === 'string' ? raw.split('/') : []);

  const match = resolve(segments);
  if (!match) {
    return jsonRes(res, 404, { message: `Маршрут /api/${segments.join('/')} не найден` });
  }

  req.query = Object.assign({}, q, match.params);
  delete req.query.path;
  return match.handler(req, res);
};
