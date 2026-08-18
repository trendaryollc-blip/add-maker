/* ============================================================
   OMNI backend — src/middleware/auth.js
   JWT authentication middleware using jsonwebtoken library.
   Supports access tokens + optional refresh token verification.
   ============================================================ */
'use strict';

const jwt = require('jsonwebtoken');
const { sendError, getBearer } = require('../utils/http');
const { env } = require('../config/env');

/**
 * Issue a signed JWT access token for a user.
 */
function createToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name || '', tier: user.tier || 'starter' },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN || '1h' }
  );
}

/**
 * Verify and decode a JWT access token. Returns the payload or null.
 */
function verifyToken(token) {
  if (typeof token !== 'string') return null;
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch (_e) {
    return null;
  }
}

/**
 * Route-handler middleware. If no valid token, responds 401.
 * On success it sets req.user with the decoded payload.
 */
function requireAuth(req, res) {
  const token = getBearer(req);
  if (!token) {
    return sendError(res, 401, 'Missing authentication token');
  }
  const payload = verifyToken(token);
  if (!payload) {
    return sendError(res, 401, 'Invalid or expired token');
  }
  req.user = payload;
  return undefined; // allow the next handler to run
}

/**
 * Optional auth: sets req.user if a valid token is present, but
 * does NOT reject unauthenticated requests.
 */
function optionalAuth(req, _res) {
  const token = getBearer(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) req.user = payload;
  }
}

module.exports = { createToken, verifyToken, requireAuth, optionalAuth };
