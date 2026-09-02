// ============================================================
// Пользователи — то, из чего собирается страница «Личные данные».
//   GET    /api/users              все учебные аккаунты
//   GET    /api/users/{id}         один аккаунт — им заполняют форму
//   PATCH  /api/users/{id}         «Сохранить изменения»
//   PUT    /api/users/{id}         то же самое, если привычнее PUT
//   DELETE /api/users/{id}         удалить аккаунт
//   GET    /api/users/{id}/avatar  сам файл аватара для <img src>
//
// Токен не нужен: это тренажёр. Пароль и его хеш наружу не уходят,
// личные поля отдаются неполными (Ма*****, saf*****@gmail.com,
// +9929001*****). Поэтому в форму «Личные данные» они попадают уже
// со звёздочками — и если такое значение вернуть обратно, сервер его
// не запишет, а оставит прежнее. Меняется только то, что реально ввели.
// ============================================================
const {
  jsonData, jsonErr, jsonRes, paginate, readBody, store, security,
  setCors, setSecurityHeaders
} = require('./_helpers');
const image = require('../image');

// Аватар — двоичный ответ, а не конверт: браузер вставляет его в <img>
async function sendAvatar(req, res, id) {
  const user = await store.findUserById(id);
  if (!user) return jsonErr(res, 404, `Пользователь ${id} не найден`, 'NOT_FOUND');
  const avatar = await store.getAvatar(user.id);
  if (!avatar) return jsonErr(res, 404, `У пользователя ${user.id} нет аватара`, 'NOT_FOUND');

  setCors(res);
  setSecurityHeaders(res);
  res.statusCode = 200;
  res.setHeader('Content-Type', avatar.contentType);
  res.setHeader('Content-Length', avatar.data.length);
  res.setHeader('Cache-Control', 'public, max-age=60');
  return res.end(avatar.data);
}

async function list(req, res) {
  const q = req.query || {};
  let rows = (await store.listUsers()).map(store.publicUser);

  if (q.search) {
    const s = String(q.search).toLowerCase();
    rows = rows.filter(u =>
      u.fullName.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s));
  }
  if (q.role) rows = rows.filter(u => u.role === String(q.role).toLowerCase());

  return jsonRes(res, 200, Object.assign(paginate(rows, q.page, q.pageSize, 20), {
    limit: store.maxUsers,
    note: `Тренажёр хранит последние ${store.maxUsers} регистраций — старые удаляются сами`
  }));
}

async function item(req, res, id) {
  const user = await store.findUserById(id);
  if (!user) return jsonErr(res, 404, `Пользователь ${id} не найден`, 'NOT_FOUND');
  return jsonData(res, 200, store.publicUser(user));
}

// «Сохранить изменения»: приходит FormData или JSON, меняем только то,
// что прислали и что не является замаскированным значением
async function patch(req, res, id) {
  const target = await store.findUserById(id);
  if (!target) return jsonErr(res, 404, `Пользователь ${id} не найден`, 'NOT_FOUND');

  const body = await readBody(req);
  if (body.tooLarge) return jsonErr(res, 413, 'Запрос слишком большой', 'PAYLOAD_TOO_LARGE');
  const f = body.fields || {};
  const patchData = {};
  const skipped = [];

  const take = (name, column, max) => {
    if (f[name] === undefined) return;
    const value = String(f[name]);
    if (security.isMasked(value)) { skipped.push(name); return; }
    patchData[column] = security.clean(value, max);
  };

  take('fullName', 'fullName', 120);
  take('tel', 'tel', 40);
  take('address', 'address', 200);

  if (f.password !== undefined && String(f.password) && !security.isMasked(String(f.password))) {
    patchData.passwordHash = await security.hashPassword(String(f.password));
  }

  const picked = (body.files || {}).avatar;
  const avatarFile = (picked && picked.data && picked.data.length) ? picked : null;
  if (avatarFile) {
    const prepared = await image.prepareAvatar(avatarFile);
    if (!prepared.ok) {
      return jsonErr(res, prepared.status, prepared.message,
        prepared.status === 413 ? 'PAYLOAD_TOO_LARGE' : 'UNSUPPORTED_MEDIA_TYPE');
    }
    await store.setAvatar(target.id, prepared.avatar);
    patchData.avatar = `/api/users/${target.id}/avatar`;
  }

  const updated = Object.keys(patchData).length
    ? await store.updateUser(target.id, patchData)
    : target;

  const result = store.publicUser(updated);
  if (skipped.length) {
    // честно говорим, что скрытые звёздочками поля мы не тронули
    result.unchanged = skipped;
  }
  return jsonData(res, 200, result);
}

async function remove(req, res, id) {
  const deleted = await store.deleteUser(id);
  if (!deleted) return jsonErr(res, 404, `Пользователь ${id} не найден`, 'NOT_FOUND');
  return jsonData(res, 200, {
    message: `Пользователь ${deleted.id} удалён`,
    deleted: store.publicUser(deleted)
  });
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonData(res, 200, null);

  const q = req.query || {};
  const id = q.id;

  await store.ready();

  if (q.sub === 'avatar') {
    if (req.method !== 'GET') return jsonErr(res, 405, 'Аватар отдаётся только по GET', 'METHOD_NOT_ALLOWED');
    return sendAvatar(req, res, id);
  }

  if (id === undefined) {
    if (req.method === 'GET') return list(req, res);
    return jsonErr(res, 405, 'Новый аккаунт создаёт POST /api/auth/register', 'METHOD_NOT_ALLOWED');
  }

  if (req.method === 'GET') return item(req, res, id);
  if (req.method === 'PATCH' || req.method === 'PUT') return patch(req, res, id);
  if (req.method === 'DELETE') return remove(req, res, id);

  return jsonErr(res, 405, 'Метод не поддерживается', 'METHOD_NOT_ALLOWED');
};
