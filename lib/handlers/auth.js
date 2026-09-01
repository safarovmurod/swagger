// ============================================================
// Регистрация, вход, «кто я» и выход.
//   POST /api/auth/register   multipart/form-data (или JSON) + файл avatar
//   POST /api/auth/login      JSON, отдаёт настоящий JWT
//   GET  /api/auth/me         требует Authorization: Bearer <токен>
//   POST /api/auth/logout     отзывает текущий токен
//
// Наружу не уходит ни passwordHash, ни пароль, ни секреты, ни настройки
// окружения: ответ собирается функцией store.publicUser.
// ============================================================
const {
  jsonData, jsonErr, config, security, store, multipart, readBody, requireUser
} = require('./_helpers');

// Ответ на успешный вход и регистрацию — одинаковой формы
function tokenResponse(user) {
  const signed = security.signToken({ sub: user.id, role: user.role, email: user.email });
  return {
    accessToken: signed.token,
    tokenType: 'Bearer',
    expiresIn: signed.expiresIn,
    expiresAt: new Date(signed.payload.exp * 1000).toISOString(),
    user: store.publicUser(user)
  };
}

// Хеш-пустышка: сравниваем с ним, когда пользователь не найден, чтобы
// по времени ответа нельзя было понять, существует ли такой email.
const DUMMY_HASH = 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';

async function register(req, res) {
  const body = await readBody(req);
  if (body.tooLarge) {
    return jsonErr(res, 413, `Тело запроса больше ${Math.round(config.maxBodyBytes / 1024)} КБ`, 'PAYLOAD_TOO_LARGE');
  }
  const f = body.fields || {};
  const details = [];

  const fullName = security.clean(f.fullName, 120);
  if (fullName.length < 2) details.push({ field: 'fullName', message: 'Имя обязательно, минимум 2 символа' });

  const email = security.checkEmail(f.email);
  if (!email.ok) details.push({ field: 'email', message: email.message });

  const tel = security.checkTel(f.tel);
  if (!tel.ok) details.push({ field: 'tel', message: tel.message });

  const password = security.checkPassword(f.password);
  if (!password.ok) details.push({ field: 'password', message: password.message });

  const address = security.clean(f.address, 200);

  // Роль назначает только сервер. Что бы ни прислали в теле —
  // новый пользователь всегда обычный.
  if (f.role && String(f.role) !== 'user') {
    details.push({ field: 'role', message: 'Роль назначает сервер, в запросе её передавать нельзя' });
  }

  let avatarFile = (body.files || {}).avatar || null;
  let avatarCheck = null;
  if (avatarFile) {
    avatarCheck = multipart.checkAvatar(avatarFile);
    if (!avatarCheck.ok) {
      return jsonErr(res, avatarCheck.status, avatarCheck.message,
        avatarCheck.status === 413 ? 'PAYLOAD_TOO_LARGE' : 'UNSUPPORTED_MEDIA_TYPE',
        [{ field: 'avatar', message: avatarCheck.message }]);
    }
  }

  if (details.length) {
    return jsonErr(res, 400, 'Некорректные данные', 'VALIDATION_ERROR', details);
  }

  await store.ready();
  if (await store.findUserByEmail(email.value)) {
    return jsonErr(res, 409, 'Пользователь с таким email уже зарегистрирован', 'EMAIL_ALREADY_EXISTS',
      [{ field: 'email', message: 'Занят' }]);
  }
  if (await store.findUserByTel(tel.value)) {
    return jsonErr(res, 409, 'Пользователь с таким номером телефона уже зарегистрирован', 'TEL_ALREADY_EXISTS',
      [{ field: 'tel', message: 'Занят' }]);
  }

  const now = new Date().toISOString();
  const passwordHash = await security.hashPassword(password.value);
  let user = await store.createUser({
    fullName, tel: tel.value, email: email.value, passwordHash,
    address, role: 'user', avatar: '', createdAt: now, updatedAt: now
  });

  if (avatarFile) {
    await store.setAvatar(user.id, {
      contentType: avatarCheck.kind.mime,
      ext: avatarCheck.kind.ext,
      data: avatarFile.data
    });
    user = await store.updateUser(user.id, { avatar: `/api/users/${user.id}/avatar` });
  }

  return jsonData(res, 201, tokenResponse(user));
}

async function login(req, res) {
  const body = await readBody(req);
  const f = body.fields || {};
  const email = String(f.email || '').trim().toLowerCase();
  const password = String(f.password == null ? '' : f.password);

  if (!email || !password) {
    return jsonErr(res, 400, 'Нужны email и password', 'VALIDATION_ERROR', [
      !email ? { field: 'email', message: 'Обязательно' } : null,
      !password ? { field: 'password', message: 'Обязательно' } : null
    ].filter(Boolean));
  }

  await store.ready();
  const user = await store.findUserByEmail(email);
  const ok = await security.verifyPassword(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) {
    return jsonErr(res, 401, 'Неверный email или пароль', 'INVALID_CREDENTIALS');
  }

  const payload = tokenResponse(user);
  // Честно предупреждаем: без JWT_SECRET подпись живёт до перезапуска функции
  if (!config.hasJwtSecret()) {
    payload.notice = 'JWT_SECRET не задан — токены действительны до перезапуска сервера';
  }
  return jsonData(res, 200, payload);
}

async function me(req, res, user) {
  return jsonData(res, 200, {
    user: store.publicUser(user),
    token: {
      issuedAt: new Date(req._token.iat * 1000).toISOString(),
      expiresAt: new Date(req._token.exp * 1000).toISOString(),
      jti: req._token.jti
    }
  });
}

// Выход настоящий, а не «200 и ничего»: идентификатор токена (jti)
// попадает в список отозванных, и следующий запрос с ним получит 401.
// Список живёт до истечения самого токена — дольше держать нечего.
async function logout(req, res, user) {
  const payload = req._token;
  await store.revokeToken(payload.jti, payload.exp);
  return jsonData(res, 200, {
    message: 'Выход выполнен, токен отозван',
    userId: user.id,
    revokedJti: payload.jti,
    revokedUntil: new Date(payload.exp * 1000).toISOString()
  });
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

  if (action === 'me') {
    if (req.method !== 'GET') return jsonErr(res, 405, 'Профиль — это GET /api/auth/me', 'METHOD_NOT_ALLOWED');
    const user = await requireUser(req, res);
    if (!user) return;
    return me(req, res, user);
  }

  if (action === 'logout') {
    if (req.method !== 'POST') return jsonErr(res, 405, 'Выход — это POST /api/auth/logout', 'METHOD_NOT_ALLOWED');
    const user = await requireUser(req, res);
    if (!user) return;
    return logout(req, res, user);
  }

  return jsonErr(res, 404, `Раздел /api/auth/${action} не найден`, 'NOT_FOUND');
};

module.exports.register = register;
module.exports.login = login;
module.exports.me = me;
module.exports.logout = logout;
