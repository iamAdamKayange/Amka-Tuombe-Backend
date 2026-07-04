const { Pool } = require('pg');

function resolveSsl() {
  if (process.env.DB_SSL === 'true') return { rejectUnauthorized: false };
  if (process.env.DB_SSL === 'false') return false;

  try {
    const hostname = new URL(process.env.DATABASE_URL).hostname;
    const isPrivate =
      ['localhost', '127.0.0.1', '::1'].includes(hostname) ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
    return process.env.NODE_ENV === 'production' && !isPrivate
      ? { rejectUnauthorized: false }
      : false;
  } catch (_) {
    return process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false;
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: resolveSsl(),
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
  connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS || 10000),
});

pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'test') {
    console.log('PostgreSQL connected');
  }
});

pool.on('error', (err) => {
  console.error('Database pool error:', err.message);
});

module.exports = pool;
