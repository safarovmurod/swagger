// ============================================================
// Постоянное хранилище пользователей в PostgreSQL.
//
// Включается само, когда задана переменная DATABASE_URL — например,
// строка подключения Neon или Vercel Postgres. Пока её нет, работает
// lib/store/memory.js и этот файл даже не загружается (require ниже —
// внутри функции, а не наверху).
//
// Схема создаётся при первом обращении, отдельной миграции не нужно.
// Пароли лежат только в виде хеша, аватар — двоичным полем.
// ============================================================
const config = require('../config');

// email и телефон намеренно без UNIQUE: это тренажёр, студенты
// регистрируются с одинаковыми test@test.com, и падать на этом не должно.
// ALTER ниже нужен для баз, созданных прежней версией схемы.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  full_name     TEXT NOT NULL DEFAULT '',
  tel           TEXT NOT NULL DEFAULT '',
  tel_digits    TEXT NOT NULL DEFAULT '',
  email         TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL DEFAULT '',
  address       TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL DEFAULT 'user',
  avatar        TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS user_avatars (
  user_id      INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  ext          TEXT NOT NULL,
  data         BYTEA NOT NULL
);
CREATE TABLE IF NOT EXISTS revoked_tokens (
  jti        TEXT PRIMARY KEY,
  expires_at BIGINT NOT NULL
);
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tel_digits_key;
ALTER TABLE users ALTER COLUMN full_name SET DEFAULT '';
ALTER TABLE users ALTER COLUMN tel SET DEFAULT '';
ALTER TABLE users ALTER COLUMN tel_digits SET DEFAULT '';
ALTER TABLE users ALTER COLUMN email SET DEFAULT '';
ALTER TABLE users ALTER COLUMN password_hash SET DEFAULT '';
`;

let pool = null;
let ready = null;

function getPool() {
  if (pool) return pool;
  // require здесь, а не наверху файла: без DATABASE_URL модуль pg
  // вообще не нужен, и его отсутствие не должно ронять API.
  let pg;
  try {
    pg = require('pg');
  } catch (err) {
    throw new Error('Задан DATABASE_URL, но пакет pg не установлен — выполните npm install');
  }
  const url = config.databaseUrl;
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  // У Neon и Vercel Postgres сертификаты обычные, проверку не отключаем.
  // DATABASE_SSL=no-verify — запасной вариант для самоподписанных серверов.
  let ssl = false;
  if (!local) {
    ssl = process.env.DATABASE_SSL === 'no-verify' ? { rejectUnauthorized: false } : { rejectUnauthorized: true };
  }
  pool = new pg.Pool({ connectionString: url, ssl, max: 3, idleTimeoutMillis: 10000, connectionTimeoutMillis: 8000 });
  pool.on('error', (err) => console.error('postgres pool:', err.message));
  return pool;
}

const query = (text, params) => getPool().query(text, params);

// строка таблицы → та же форма записи, что и в памяти
function toUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    tel: row.tel,
    email: row.email,
    passwordHash: row.password_hash,
    address: row.address || '',
    role: row.role,
    avatar: row.avatar || '',
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

const digitsOf = (tel) => String(tel || '').replace(/\D/g, '');

// Поля, которые вообще можно менять. role сюда входит, но приходит
// не из тела запроса — его ставит только сервер (см. handlers/users.js).
const UPDATABLE = {
  fullName: 'full_name', tel: 'tel', address: 'address',
  role: 'role', avatar: 'avatar', passwordHash: 'password_hash'
};

module.exports = {
  name: 'postgres',

  async init() {
    if (!ready) {
      ready = query(SCHEMA).catch((err) => { ready = null; throw err; });
    }
    return ready;
  },

  async createUser(record) {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      // Один email регистрируется последовательно даже на разных инстансах.
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [record.email]);
      const existing = await client.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [record.email]);
      if (existing.rows.length) {
        const error = new Error('duplicate email');
        error.code = '23505';
        throw error;
      }
      const { rows } = await client.query(
        `INSERT INTO users (full_name, tel, tel_digits, email, password_hash, address, role, avatar)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [record.fullName, record.tel, digitsOf(record.tel), record.email,
          record.passwordHash, record.address || '', record.role || 'user', record.avatar || '']
      );
      await client.query('COMMIT');
      return toUser(rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async findUserById(id) {
    const key = parseInt(id, 10);
    if (!Number.isFinite(key)) return null;
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [key]);
    return toUser(rows[0]);
  },

  // при одинаковых адресах берём того, кто зарегистрировался раньше
  async findUserByEmail(email) {
    const key = String(email || '').toLowerCase();
    if (!key) return null;
    const { rows } = await query('SELECT * FROM users WHERE email = $1 ORDER BY id LIMIT 1', [key]);
    return toUser(rows[0]);
  },

  async findUserByTel(tel) {
    const key = digitsOf(tel);
    if (!key) return null;
    const { rows } = await query('SELECT * FROM users WHERE tel_digits = $1 ORDER BY id LIMIT 1', [key]);
    return toUser(rows[0]);
  },

  async listUsers() {
    const { rows } = await query('SELECT * FROM users ORDER BY id');
    return rows.map(toUser);
  },

  async updateUser(id, patch) {
    const sets = [];
    const values = [];
    Object.keys(patch || {}).forEach((key) => {
      const column = UPDATABLE[key];
      if (!column) return;
      values.push(patch[key]);
      sets.push(`${column} = $${values.length}`);
      if (key === 'tel') {
        values.push(digitsOf(patch[key]));
        sets.push(`tel_digits = $${values.length}`);
      }
    });
    if (!sets.length) return this.findUserById(id);
    values.push(parseInt(id, 10));
    const { rows } = await query(
      `UPDATE users SET ${sets.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
      values
    );
    return toUser(rows[0]);
  },

  async deleteUser(id) {
    const { rows } = await query('DELETE FROM users WHERE id = $1 RETURNING *', [parseInt(id, 10)]);
    return toUser(rows[0]);
  },

  async setAvatar(id, avatar) {
    await query(
      `INSERT INTO user_avatars (user_id, content_type, ext, data) VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id) DO UPDATE SET content_type = EXCLUDED.content_type,
         ext = EXCLUDED.ext, data = EXCLUDED.data`,
      [parseInt(id, 10), avatar.contentType, avatar.ext, avatar.data]
    );
  },

  async getAvatar(id) {
    const { rows } = await query('SELECT content_type, ext, data FROM user_avatars WHERE user_id = $1', [parseInt(id, 10)]);
    if (!rows[0]) return null;
    return { contentType: rows[0].content_type, ext: rows[0].ext, data: rows[0].data };
  },

  async revokeToken(jti, expiresAt) {
    await query(
      'INSERT INTO revoked_tokens (jti, expires_at) VALUES ($1,$2) ON CONFLICT (jti) DO NOTHING',
      [String(jti), expiresAt]
    );
    await query('DELETE FROM revoked_tokens WHERE expires_at < $1', [Math.floor(Date.now() / 1000)]);
  },

  async isRevoked(jti) {
    const { rows } = await query(
      'SELECT 1 FROM revoked_tokens WHERE jti = $1 AND expires_at >= $2',
      [String(jti), Math.floor(Date.now() / 1000)]
    );
    return rows.length > 0;
  }
};
