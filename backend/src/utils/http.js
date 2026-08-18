/* ============================================================
   OMNI backend — src/utils/http.js
   Small HTTP helpers shared by controllers and the router.
   ============================================================ */
'use strict';

const MAX_BODY = 1_000_000; // 1 MB

/** Write a JSON response and end it. */
function sendJSON(res, status, data) {
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  if (!res.headersSent) {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
  }
  res.end(body);
}

/** Write a standard { error: true, message } envelope. */
function sendError(res, status, message) {
  sendJSON(res, status, { error: true, message });
}

/**
 * Read and parse a JSON request body into an object.
 * Rejects with a 400-flavoured Error on invalid JSON.
 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > MAX_BODY) {
        const err = new Error('Request body too large');
        err.status = 413;
        req.destroy();
        reject(err);
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        const err = new Error('Invalid JSON body');
        err.status = 400;
        reject(err);
      }
    });
    req.on('error', (e) => {
      if (!e.status) e.status = 400;
      reject(e);
    });
  });
}

/** Extract a Bearer token from the Authorization header. */
function getBearer(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  if (auth.startsWith('bearer ')) return auth.slice(7).trim();
  return null;
}

module.exports = { sendJSON, sendError, readBody, getBearer };