/* ============================================================
   OMNI backend — src/config/database.js
   PostgreSQL connection pool. Falls back gracefully when no
   DATABASE_URL is set (mock mode).
   ============================================================ */
'use strict';

const { env } = require('./env');

let pool = null;

function getPool() {
  if (pool) return pool;
  if (!env.DATABASE_URL) return null;

  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: env.isProduction ? { rejectUnauthorized: false } : false
  });

  pool.on('error', (err) => {
    console.error('[DB] Unexpected pool error:', err.message);
  });

  return pool;
}

/** Run a single query. Returns { rows, rowCount }. */
async function query(text, params) {
  const p = getPool();
  if (!p) throw new Error('Database not configured — set DATABASE_URL');
  return p.query(text, params);
}

/** Run a function inside a transaction. */
async function transaction(fn) {
  const p = getPool();
  if (!p) throw new Error('Database not configured — set DATABASE_URL');
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Check if database is available. */
function isConfigured() {
  return Boolean(env.DATABASE_URL);
}

/** Graceful shutdown. */
async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { query, transaction, isConfigured, getPool, close };
