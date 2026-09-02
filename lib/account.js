// Данные аккаунта доступны после регистрации или проверки пароля.
const { jsonData, jsonErr, authenticate, security, store } = require('./handlers/_helpers');

function accountUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    tel: user.tel,
    email: user.email,
    address: user.address,
    avatar: user.avatar ? `${user.avatar}?v=${encodeURIComponent(user.updatedAt)}` : '',
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function sendSession(res, status, user) {
  const session = security.signToken({ sub: user.id });
  return jsonData(res, status, {
    user: accountUser(user),
    token: session.token,
    expiresIn: session.expiresIn
  });
}

async function requireOwner(req, res, id) {
  const auth = await authenticate(req);
  if (auth.error || !auth.user) {
    jsonErr(res, 401, 'Войдите в аккаунт заново', 'UNAUTHORIZED');
    return false;
  }
  if (auth.user.id !== Number(id)) {
    jsonErr(res, 403, 'Можно менять только свой аккаунт', 'FORBIDDEN');
    return false;
  }
  return true;
}

async function login(req, res) {
  if (req.method !== 'GET') return jsonErr(res, 405, 'Используйте GET', 'METHOD_NOT_ALLOWED');
  // Пароль идёт в Authorization, а не в URL или истории браузера.
  const match = /^Basic\s+(.+)$/i.exec(req.headers.authorization || '');
  const credentials = match ? Buffer.from(match[1], 'base64').toString('utf8') : '';
  const separator = credentials.indexOf(':');
  const email = separator >= 0 ? credentials.slice(0, separator).trim().toLowerCase() : '';
  const password = separator >= 0 ? credentials.slice(separator + 1) : '';
  if (!email || !password || password.length > 128) {
    return jsonErr(res, 401, 'Неверный email или пароль', 'INVALID_CREDENTIALS');
  }
  const user = await store.findUserByEmail(email);
  if (!user || !(await security.verifyPassword(password, user.passwordHash))) {
    return jsonErr(res, 401, 'Неверный email или пароль', 'INVALID_CREDENTIALS');
  }
  return sendSession(res, 200, user);
}

module.exports = { accountUser, sendSession, requireOwner, login };
