// ============================================================
// Выбор хранилища пользователей.
//
//   есть DATABASE_URL → PostgreSQL (записи переживают деплой);
//   нет               → память инстанса (работает сразу, без настройки).
//
// Обработчики про это не знают: у обоих хранилищ одинаковый набор методов.
// ============================================================
const config = require('../config');
const security = require('../security');

const backend = config.databaseUrl ? require('./postgres') : require('./memory');

let readyPromise = null;

// Демонстрационный администратор заводится один раз при первом обращении:
// без него нечем проверить методы, требующие роль admin.
async function seedAdmin() {
  const demo = config.demoAdmin;
  const existing = await backend.findUserByEmail(demo.email);
  if (existing) return;
  const passwordHash = await security.hashPassword(demo.password);
  const now = new Date().toISOString();
  try {
    await backend.createUser({
      fullName: demo.fullName,
      tel: demo.tel,
      email: demo.email.toLowerCase(),
      passwordHash,
      address: demo.address,
      role: 'admin',
      avatar: '',
      createdAt: now,
      updatedAt: now
    });
  } catch (err) {
    // гонка двух параллельных запросов — второй просто ничего не делает
    if (!/duplicate key|unique/i.test(String(err && err.message))) throw err;
  }
}

// Готовим хранилище один раз на инстанс; при ошибке следующий запрос
// попробует снова, а не будет вечно падать на старом промисе.
function ready() {
  if (!readyPromise) {
    readyPromise = backend.init()
      .then(seedAdmin)
      .catch((err) => { readyPromise = null; throw err; });
  }
  return readyPromise;
}

// Публичное представление пользователя. Здесь нет и не должно быть
// passwordHash: наружу уходит только то, что перечислено ниже.
// Телефон всегда неполный — полный номер остаётся внутри системы.
function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    fullName: user.fullName,
    tel: security.maskPhone(user.tel),
    email: user.email,
    address: user.address || '',
    avatar: user.avatar || '',
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

module.exports = {
  ready,
  publicUser,
  backendName: backend.name,
  isPersistent: backend.name !== 'memory',
  createUser: (...a) => backend.createUser(...a),
  findUserById: (...a) => backend.findUserById(...a),
  findUserByEmail: (...a) => backend.findUserByEmail(...a),
  findUserByTel: (...a) => backend.findUserByTel(...a),
  listUsers: (...a) => backend.listUsers(...a),
  updateUser: (...a) => backend.updateUser(...a),
  deleteUser: (...a) => backend.deleteUser(...a),
  setAvatar: (...a) => backend.setAvatar(...a),
  getAvatar: (...a) => backend.getAvatar(...a),
  revokeToken: (...a) => backend.revokeToken(...a),
  isRevoked: (...a) => backend.isRevoked(...a)
};
