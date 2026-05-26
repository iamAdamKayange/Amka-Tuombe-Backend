const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // For local development, you can also use:
  // user: 'postgres',
  // host: 'localhost',
  // database: 'amka_tuombe',
  // password: 'password',
  // port: 5432,
});

pool.on('connect', () => console.log('✅ PostgreSQL connected'));
pool.on('error', (err) => console.error('❌ PostgreSQL error:', err));

module.exports = pool;