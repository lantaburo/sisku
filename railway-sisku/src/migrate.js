'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { getPool, closePool } = require('./db');

const MIGRATION_DIR = path.join(__dirname, '..', 'migrations');
const LOCK_ID = 724_193_001;

function checksum(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function migrate() {
  const files = (await fs.readdir(MIGRATION_DIR)).filter(name => /^\d+.*\.sql$/.test(name)).sort();
  const client = await getPool().connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);

    for (const file of files) {
      const sql = await fs.readFile(path.join(MIGRATION_DIR, file), 'utf8');
      const digest = checksum(sql);
      const existing = await client.query('SELECT checksum FROM schema_migrations WHERE version = $1', [file]);
      if (existing.rowCount) {
        if (existing.rows[0].checksum !== digest) {
          throw new Error(`Migration ${file} berubah setelah diterapkan.`);
        }
        continue;
      }

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations(version, checksum) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
          [file, digest]
        );
        await client.query('COMMIT');
        console.log(`MIGRATED ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    try { await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]); } catch (_) {}
    client.release();
  }
}

if (require.main === module) {
  migrate()
    .then(() => console.log('Database siap.'))
    .catch(error => {
      console.error('MIGRATION_FAILED', error.message);
      process.exitCode = 1;
    })
    .finally(closePool);
}

module.exports = { migrate, checksum };
