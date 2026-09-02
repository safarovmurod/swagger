// ============================================================
// Регистрация и вход.
//   POST /api/auth/register   multipart/form-data (или JSON) + файл avatar
//   POST /api/auth/login      email + password
//
// Это учебный тренажёр, поэтому проверок нет: любое имя, любая почта,
// любой пароль и пустые поля принимаются — форма должна отправляться
// с первого раза, а не спорить со студентом. Единственное, что сервер
// делает строго: не отдаёт наружу пароль и его хеш, а личные данные
// показывает неполными.
//
// Аватар принимается размером с фотографию с телефона и сжимается
// в квадрат 512×512 (lib/image.js) — в базе лежат килобайты, а не мегабайты.
// ============================================================
const {
  jsonData, jsonErr, config, security, store, readBody
} = require('./_helpers');
const image = require('../image');

// Ответ у регистрации и входа одинаковый: сам пользователь, а рядом токен.
// Токен нужен не всем — большинство эндпоинтов работает и без него.
function userResponse(user, extra) {
  const signed = security.signToken({ sub: user.id, role: user.role, email: user.email });
  return Object.assign(store.publicUser(user), {
    accessToken: signed.token,
    tokenType: 'Bearer',
    expiresIn: signed.expiresIn
  }, extra || {});
}

// Значения из формы: пустое поле — это не ошибка, а пустая строка
const field = (value, max) => security.clean(value, max || 200);

async function register(req, res) {
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

  await store.ready();
  const now = new Date().toISOString();
  const password = String(f.password == null ? '' : f.password);
  const passwordHash = password ? await security.hashPassword(password) : '';

  let user = await store.createUser({
    fullName: field(f.fullName, 120),
    tel: field(f.tel, 40),
    email: field(f.email, 160).toLowerCase(),
    passwordHash,
    address: field(f.address, 200),
    role: 'user',            // роль назначает сервер, из тела запроса не берётся
    avatar: '',
    createdAt: now,
    updatedAt: now
  });

  if (avatar) {
    await store.setAvatar(user.id, avatar);
    user = await store.updateUser(user.id, { avatar: `/api/users/${user.id}/avatar` });
  }

  // тренажёр не должен разрастаться: держим последние config.maxUsers регистраций
  const removed = await store.enforceLimit();

  return jsonData(res, 201, userResponse(user, removed.length ? { removedOldUsers: removed } : null));
}

async function login(req, res) {
  const body = await readBody(req);
  const f = body.fields || {};
  const email = String(f.email || '').trim().toLowerCase();
  const password = String(f.password == null ? '' : f.password);

  await store.ready();
  const user = email ? await store.findUserByEmail(email) : null;
  if (!user) {
    return jsonErr(res, 401, 'Пользователь с таким email не найден', 'INVALID_CREDENTIALS');
  }
  // у аккаунта без пароля вход свободный — это тренажёр
  if (user.passwordHash) {
    const ok = await security.verifyPassword(password, user.passwordHash);
    if (!ok) return jsonErr(res, 401, 'Неверный пароль', 'INVALID_CREDENTIALS');
  }

  return jsonData(res, 200, userResponse(user));
}

// Маршрут /api/auth/{action}: роутер кладёт действие в req.query.action
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return jsonData(res, 200, null);

  const action = String((req.query || {}).action || '').toLowerCase();

  if (action === 'register') {
    if (req.method !== 'POST') return jsonErr(res, 405, 'Регистрация — это POST /api/auth/register', 'METHOD_NOT_ALLOWED');
    return register(req, res);
  }

  if (action === 'login') {
    if (req.method !== 'POST') return jsonErr(res, 405, 'Вход — это POST /api/auth/login', 'METHOD_NOT_ALLOWED');
    return login(req, res);
  }

  return jsonErr(res, 404,
    `Раздел /api/auth/${action} не найден. Есть register и login, ` +
    'а профиль лежит в /api/users/{id}', 'NOT_FOUND');
};

module.exports.register = register;
module.exports.login = login;
