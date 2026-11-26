'use strict';

const { Pool } = require('pg');
const { getConfig } = require('./config');

let pool;

function getPool() {
  if (pool) return pool;
  const config = getConfig();
  if (!config.databaseUrl) throw new Error('DATABASE_URL wajib diisi.');
  pool = new Pool({
    connectionString: config.databaseUrl,
    max: Number(process.env.PGPOOL_MAX || 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000,
    ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined
  });
  pool.on('error', error => console.error('PG_POOL_ERROR', error.message));
  return pool;
}

async function closePool() {
  if (!pool) return;
  const current = pool;
  pool = undefined;
  await current.end();
}

module.exports = { getPool, closePool };
