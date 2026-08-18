/* ============================================================
   OMNI backend — src/config/redis.js
   Redis client for caching, sessions, rate limiting.
   Falls back gracefully when no REDIS_URL is set.
   ============================================================ */
'use strict';

const { env } = require('./env');

let client = null;

function getClient() {
  if (client) return client;
  if (!env.REDIS_URL) return null;

  try {
    const { createClient } = require('redis');
    client = createClient({ url: env.REDIS_URL });
    client.on('error', (err) => console.error('[Redis] Error:', err.message));
    client.connect().catch(() => {});
    return client;
  } catch (_e) {
    return null;
  }
}

async function get(key) {
  const c = getClient();
  if (!c) return null;
  try { return await c.get(key); } catch { return null; }
}

async function set(key, value, ttlSeconds) {
  const c = getClient();
  if (!c) return false;
  try {
    if (ttlSeconds) await c.setEx(key, ttlSeconds, value);
    else await c.set(key, value);
    return true;
  } catch { return false; }
}

async function del(key) {
  const c = getClient();
  if (!c) return false;
  try { await c.del(key); return true; } catch { return false; }
}

function isConfigured() {
  return Boolean(env.REDIS_URL);
}

async function close() {
  if (client) { await client.quit(); client = null; }
}

module.exports = { get, set, del, isConfigured, getClient, close };
