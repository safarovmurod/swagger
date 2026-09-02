// ============================================================
// Аккаунты — всё, что нужно для практики, в двух запросах.
//
//   POST   /api/users              создать аккаунт (регистрация)
//   POST   /api/users/{id}         сохранить изменения («Личные данные»)
//   DELETE /api/users/{id}         удалить аккаунт
//   GET    /api/users/{id}/avatar  сам файл фотографии для <img src>
//
// Один и тот же POST делает обе вещи: без id — создаёт новый аккаунт,
// с id — обновляет существующий. Владелец просил именно так: студент
// пишет одну функцию с FormData и переиспользует её на обеих страницах.
// id можно прислать и в адресе, и в теле запроса — работает одинаково.
//
// Токен не нужен, проверок нет: любая почта, любой пароль, пустые поля.
// Наружу уходят только неполные значения — Ма*****, +9929001*****,
// saf*****@gmail.com, Душ*****. Пароля и его хеша в ответе нет.
// Форма «Личные данные» заполняется этими же закрытыми значениями и
// присылает их обратно: такие поля сервер не записывает, оставляет
// прежние. Меняется только то, что ввели заново (см. unchanged).
// ============================================================
const {
  jsonData, jsonErr, config, readBody, store, security,
  setCors, setSecurityHeaders
} = require('./_helpers');
const image = require('../image');

// Аватар — двоичный ответ, а не конверт: браузер вставляет его в <img>
async function sendAvatar(req, res, id) {
  const user = await store.findUserById(id);
  if (!user) return jsonErr(res, 404, `Пользователь ${id} не найден`, 'NOT_FOUND');
  const avatar = await store.getAvatar(user.id);
  if (!avatar) return jsonErr(res, 404, `У пользователя ${user.id} нет фотографии`, 'NOT_FOUND');

  setCors(res);
  setSecurityHeaders(res);
  res.statusCode = 200;
  res.setHeader('Content-Type', avatar.contentType);
  res.setHeader('Content-Length', avatar.data.length);
  res.setHeader('Cache-Control', 'public, max-age=60');
  return res.end(avatar.data);
}

// Значение из формы: пустое поле — не ошибка, а пустая строка
const field = (value, max) => security.clean(value, max || 200);

async function save(req, res, idFromPath) {
  const body = await readBody(req);
  if (body.tooLarge) {
    return jsonErr(res, 413,
      `Запрос больше ${Math.round(config.maxBodyBytes / 1024 / 1024)} МБ`, 'PAYLOAD_TOO_LARGE');
  }
  const f = body.fields || {};

  // Swagger UI кладёт поле avatar в запрос, даже когда файл не выбран —
  // приходит пустая часть. Это «фото нет», а не ошибка.
  const picked = (body.files || {}).avatar || null;
  const avatarFile = (picked && picked.data && picked.data.length) ? picked : null;
  let avatar = null;
  if (avatarFile) {
    const prepared = await image.prepareAvatar(avatarFile);
    if (!prepared.ok) {
      return jsonErr(res, prepared.status, prepared.message,
        prepared.status === 413 ? 'PAYLOAD_TOO_LARGE' : 'UNSUPPORTED_MEDIA_TYPE',
        [{ field: 'avatar', message: prepared.message }]);
    }
    avatar = prepared.avatar;
  }

  // id считается указанным, только если это положительное число: Swagger UI
  // подставляет 0 в незаполненное числовое поле, и это «id не прислали»
  const rawId = idFromPath !== undefined ? idFromPath : f.id;
  const askedId = parseInt(rawId, 10);
  const hasId = Number.isFinite(askedId) && askedId > 0;
  const existing = hasId ? await store.findUserById(askedId) : null;

  if (hasId && !existing) {
    return jsonErr(res, 404, `Пользователь ${askedId} не найден`, 'NOT_FOUND');
  }

  // ---------- сохранение изменений ----------
  if (existing) {
    const patch = {};
    const skipped = [];
    const take = (name, column, max) => {
      if (f[name] === undefined) return;
      const value = String(f[name]);
      // пришло закрытое звёздочками значение — оставляем прежнее
      if (security.isMasked(value)) { skipped.push(name); return; }
      patch[column] = field(value, max);
    };
    take('fullName', 'fullName', 120);
    take('tel', 'tel', 40);
    take('address', 'address', 200);

    if (f.password !== undefined && String(f.password) && !security.isMasked(String(f.password))) {
      patch.passwordHash = await security.hashPassword(String(f.password));
    }
    if (avatar) {
      await store.setAvatar(existing.id, avatar);
      patch.avatar = `/api/users/${existing.id}/avatar`;
    }

    const updated = Object.keys(patch).length
      ? await store.updateUser(existing.id, patch)
      : existing;

    const result = store.publicUser(updated);
    if (skipped.length) result.unchanged = skipped;
    return jsonData(res, 200, result);
  }

  // ---------- новый аккаунт ----------
  const now = new Date().toISOString();
  const password = String(f.password == null ? '' : f.password);
  let user = await store.createUser({
    fullName: field(f.fullName, 120),
    tel: field(f.tel, 40),
    email: field(f.email, 160).toLowerCase(),
    passwordHash: password ? await security.hashPassword(password) : '',
    address: field(f.address, 200),
    role: 'user',           // роль назначает сервер, из тела запроса не берётся
    avatar: '',
    createdAt: now,
    updatedAt: now
  });

  if (avatar) {
    await store.setAvatar(user.id, avatar);
    user = await store.updateUser(user.id, { avatar: `/api/users/${user.id}/avatar` });
  }

  // тренажёр не должен разрастаться: держим последние config.maxUsers аккаунтов
  const removed = await store.enforceLimit();
  const result = store.publicUser(user);
  if (removed.length) result.removedOldUsers = removed;

  return jsonData(res, 201, result);
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
    if (req.method !== 'GET') return jsonErr(res, 405, 'Фотография отдаётся только по GET', 'METHOD_NOT_ALLOWED');
    return sendAvatar(req, res, id);
  }

  if (req.method === 'POST') return save(req, res, id);
  if (req.method === 'DELETE') {
    if (id === undefined) return jsonErr(res, 405, 'Нужен адрес вида DELETE /api/users/{id}', 'METHOD_NOT_ALLOWED');
    return remove(req, res, id);
  }

  return jsonErr(res, 405,
    'В этом разделе два запроса: POST /api/users — создать аккаунт или сохранить изменения, ' +
    'DELETE /api/users/{id} — удалить', 'METHOD_NOT_ALLOWED');
};
