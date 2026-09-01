// ============================================================
// Пользователи.
//   GET    /api/users              список — только администратор
//   GET    /api/users/{id}         свой профиль или любой — администратору
//   PATCH  /api/users/{id}         правка своего профиля (роль — только админ)
//   DELETE /api/users/{id}         удаление своего профиля или любого — админом
//   GET    /api/users/{id}/avatar  сам файл аватара, отдаётся всем
//
// Ни в одном ответе нет passwordHash: наружу уходит только store.publicUser.
// ============================================================
const {
  jsonData, jsonErr, jsonRes, paginate, readBody, store, security, multipart,
  requireUser, requireAdmin, setCors, setSecurityHeaders
} = require('./_helpers');

const same = (user, id) => String(user.id) === String(id);

// Аватар — двоичный ответ, а не конверт: браузер вставляет его в <img>.
async function sendAvatar(req, res, id) {
  await store.ready();
  const user = await store.findUserById(id);
  if (!user) return jsonErr(res, 404, `Пользователь ${id} не найден`, 'NOT_FOUND');
  const avatar = await store.getAvatar(user.id);
  if (!avatar) return jsonErr(res, 404, `У пользователя ${user.id} нет аватара`, 'NOT_FOUND');

  setCors(res);
  setSecurityHeaders(res);
  res.statusCode = 200;
  res.setHeader('Content-Type', avatar.contentType);
  res.setHeader('Content-Length', avatar.data.length);
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.end(avatar.data);
}

async function list(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const q = req.query || {};
  let rows = (await store.listUsers()).map(store.publicUser);

  if (q.search) {
    const s = String(q.search).toLowerCase();
    rows = rows.filter(u =>
      u.fullName.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s) ||
      (u.address || '').toLowerCase().includes(s));
  }
  if (q.role) rows = rows.filter(u => u.role === String(q.role).toLowerCase());

  return jsonRes(res, 200, paginate(rows, q.page, q.pageSize, 20));
}

async function item(req, res, id) {
  const me = await requireUser(req, res);
  if (!me) return;
  if (me.role !== 'admin' && !same(me, id)) {
    return jsonErr(res, 403, 'Можно смотреть только свой профиль', 'FORBIDDEN');
  }
  const user = await store.findUserById(id);
  if (!user) return jsonErr(res, 404, `Пользователь ${id} не найден`, 'NOT_FOUND');
  return jsonData(res, 200, store.publicUser(user));
}

async function patch(req, res, id) {
  const me = await requireUser(req, res);
  if (!me) return;
  if (me.role !== 'admin' && !same(me, id)) {
    return jsonErr(res, 403, 'Можно менять только свой профиль', 'FORBIDDEN');
  }
  const target = await store.findUserById(id);
  if (!target) return jsonErr(res, 404, `Пользователь ${id} не найден`, 'NOT_FOUND');

  const body = await readBody(req);
  if (body.tooLarge) return jsonErr(res, 413, 'Тело запроса слишком большое', 'PAYLOAD_TOO_LARGE');
  const f = body.fields || {};
  const patchData = {};
  const details = [];

  if (f.fullName !== undefined) {
    const value = security.clean(f.fullName, 120);
    if (value.length < 2) details.push({ field: 'fullName', message: 'Минимум 2 символа' });
    else patchData.fullName = value;
  }
  if (f.address !== undefined) patchData.address = security.clean(f.address, 200);
  if (f.tel !== undefined) {
    const tel = security.checkTel(f.tel);
    if (!tel.ok) details.push({ field: 'tel', message: tel.message });
    else {
      const busy = await store.findUserByTel(tel.value);
      if (busy && !same(busy, target.id)) details.push({ field: 'tel', message: 'Номер занят' });
      else patchData.tel = tel.value;
    }
  }
  if (f.password !== undefined) {
    const password = security.checkPassword(f.password);
    if (!password.ok) details.push({ field: 'password', message: password.message });
    else patchData.passwordHash = await security.hashPassword(password.value);
  }
  // Роль меняет только администратор. Обычный пользователь, приславший
  // { "role": "admin" }, получает 403 — сам себе прав не выдаст.
  if (f.role !== undefined) {
    if (me.role !== 'admin') {
      return jsonErr(res, 403, 'Роль может менять только администратор', 'FORBIDDEN',
        [{ field: 'role', message: 'Недоступно' }]);
    }
    const role = String(f.role).toLowerCase();
    if (role !== 'user' && role !== 'admin') details.push({ field: 'role', message: 'Допустимы user и admin' });
    else patchData.role = role;
  }
  if (f.email !== undefined && String(f.email).toLowerCase() !== target.email) {
    details.push({ field: 'email', message: 'Email менять нельзя — он служит логином' });
  }

  if (details.length) return jsonErr(res, 400, 'Некорректные данные', 'VALIDATION_ERROR', details);

  // Аватар можно заменить тем же запросом, если он multipart
  const avatarFile = (body.files || {}).avatar;
  if (avatarFile) {
    const check = multipart.checkAvatar(avatarFile);
    if (!check.ok) {
      return jsonErr(res, check.status, check.message,
        check.status === 413 ? 'PAYLOAD_TOO_LARGE' : 'UNSUPPORTED_MEDIA_TYPE');
    }
    await store.setAvatar(target.id, { contentType: check.kind.mime, ext: check.kind.ext, data: avatarFile.data });
    patchData.avatar = `/api/users/${target.id}/avatar`;
  }

  if (!Object.keys(patchData).length) {
    return jsonErr(res, 400, 'Нечего менять: не передано ни одного поля', 'VALIDATION_ERROR');
  }

  const updated = await store.updateUser(target.id, patchData);
  return jsonData(res, 200, store.publicUser(updated));
}

async function remove(req, res, id) {
  const me = await requireUser(req, res);
  if (!me) return;
  if (me.role !== 'admin' && !same(me, id)) {
    return jsonErr(res, 403, 'Можно удалить только свой профиль', 'FORBIDDEN');
  }
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
    return jsonErr(res, 405, 'Создание пользователя — это POST /api/auth/register', 'METHOD_NOT_ALLOWED');
  }

  if (req.method === 'GET') return item(req, res, id);
  if (req.method === 'PATCH' || req.method === 'PUT') return patch(req, res, id);
  if (req.method === 'DELETE') return remove(req, res, id);

  return jsonErr(res, 405, 'Метод не поддерживается', 'METHOD_NOT_ALLOWED');
};
