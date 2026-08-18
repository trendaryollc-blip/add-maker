/* ============================================================
   OMNI backend — src/middleware/cors.js
   Permissive CORS for development/demo. Restrict origins in prod.
   ============================================================ */
'use strict';

/** Attach CORS headers to every response. */
function handleCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24h
}

/** Short-circuit preflight requests. Returns true when handled. */
function isPreflight(req) {
  return req.method === 'OPTIONS';
}

module.exports = { handleCors, isPreflight };