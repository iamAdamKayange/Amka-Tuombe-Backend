require('dotenv').config();

const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const pool = require('../config/db');

const migrationsDirectory = path.join(__dirname, 'migrations');
const migrationLockId = 2026070401;

async function loadMigrations() {
  const files = (await fs.readdir(migrationsDirectory))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  return Promise.all(
    files.map(async (name) => {
      const sql = await fs.readFile(path.join(migrationsDirectory, name), 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      return { name, sql, checksum };
    }),
  );
}

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query('SELECT pg_advisory_lock($1)', [migrationLockId]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrations = await loadMigrations();
    const { rows } = await client.query(
      'SELECT name, checksum FROM schema_migrations ORDER BY name',
    );
    const applied = new Map(rows.map((row) => [row.name, row.checksum]));

    for (const migration of migrations) {
      const previousChecksum = applied.get(migration.name);
      if (previousChecksum) {
        if (previousChecksum !== migration.checksum) {
          throw new Error(`Applied migration was modified: ${migration.name}`);
        }
        continue;
      }

      console.log(`Applying database migration: ${migration.name}`);
      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query(
          'INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)',
          [migration.name, migration.checksum],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    console.log('Database schema is up to date');
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [migrationLockId]).catch(() => {});
    client.release();
  }
}

if (require.main === module) {
  migrate()
    .then(() => pool.end())
    .catch(async (error) => {
      console.error('Database migration failed:', error);
      await pool.end().catch(() => {});
      process.exitCode = 1;
    });
}

module.exports = migrate;
