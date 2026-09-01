// ============================================================
// Хранилище в памяти инстанса — работает без единой переменной окружения.
//
// Это режим по умолчанию: клонировали репозиторий, запустили — регистрация
// и вход работают сразу. Плата за это одна: после перезапуска функции
// (или холодного старта на Vercel) созданные пользователи пропадают.
// Чтобы они жили постоянно, задайте DATABASE_URL — тогда включится
// lib/store/postgres.js, а этот файл не понадобится.
// ============================================================
const users = new Map();       // id → запись пользователя
const avatars = new Map();     // id → { contentType, data, ext }
const revoked = new Map();     // jti → срок, до которого держим запись
let nextId = 1;

const clone = (row) => (row ? Object.assign({}, row) : null);

module.exports = {
  name: 'memory',

  async init() { /* ничего готовить не нужно */ },

  async createUser(record) {
    const row = Object.assign({}, record, { id: nextId++ });
    users.set(row.id, row);
    return clone(row);
  },

  async findUserById(id) {
    return clone(users.get(parseInt(id, 10)));
  },

  async findUserByEmail(email) {
    const key = String(email || '').toLowerCase();
    for (const row of users.values()) if (row.email === key) return clone(row);
    return null;
  },

  async findUserByTel(tel) {
    const key = String(tel || '').replace(/\D/g, '');
    if (!key) return null;
    for (const row of users.values()) {
      if (String(row.tel || '').replace(/\D/g, '') === key) return clone(row);
    }
    return null;
  },

  async listUsers() {
    return Array.from(users.values()).map(clone).sort((a, b) => a.id - b.id);
  },

  async updateUser(id, patch) {
    const row = users.get(parseInt(id, 10));
    if (!row) return null;
    Object.assign(row, patch, { updatedAt: new Date().toISOString() });
    return clone(row);
  },

  async deleteUser(id) {
    const key = parseInt(id, 10);
    const row = users.get(key);
    if (!row) return null;
    users.delete(key);
    avatars.delete(key);
    return clone(row);
  },

  async setAvatar(id, avatar) {
    avatars.set(parseInt(id, 10), avatar);
  },

  async getAvatar(id) {
    return avatars.get(parseInt(id, 10)) || null;
  },

  // Выход из системы: id токена попадает сюда и больше не принимается,
  // пока не истечёт его собственный срок.
  async revokeToken(jti, expiresAt) {
    revoked.set(String(jti), expiresAt);
    const now = Math.floor(Date.now() / 1000);
    if (revoked.size > 5000) {
      for (const [key, exp] of revoked) if (exp < now) revoked.delete(key);
    }
  },

  async isRevoked(jti) {
    const exp = revoked.get(String(jti));
    if (exp === undefined) return false;
    if (exp < Math.floor(Date.now() / 1000)) {
      revoked.delete(String(jti));
      return false;
    }
    return true;
  }
};
