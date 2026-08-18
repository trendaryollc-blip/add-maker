/* ============================================================
   OMNI backend — src/controllers/authController.js
   Authentication endpoints: signup, login, refresh, logout.
   ============================================================ */
'use strict';

const { sendJSON, sendError, readBody } = require('../utils/http');
const AuthService = require('../services/auth');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST /api/auth/signup */
async function signup(req, res) {
  let body;
  try { body = await readBody(req); } catch (e) { return sendError(res, e.status || 400, e.message); }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';

  if (!EMAIL_RE.test(email)) {
    return sendError(res, 400, 'A valid email is required');
  }
  if (password.length < 6) {
    return sendError(res, 400, 'Password must be at least 6 characters');
  }

  try {
    const result = await AuthService.signup(email, password, name);
    return sendJSON(res, 201, {
      token: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
      expiresInSeconds: 3600
    });
  } catch (err) {
    return sendError(res, err.status || 500, err.message || 'Signup failed');
  }
}

/** POST /api/auth/login */
async function login(req, res) {
  let body;
  try { body = await readBody(req); } catch (e) { return sendError(res, e.status || 400, e.message); }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!EMAIL_RE.test(email)) {
    return sendError(res, 400, 'A valid email is required');
  }
  if (!password) {
    return sendError(res, 400, 'Password is required');
  }

  try {
    const result = await AuthService.login(email, password);
    return sendJSON(res, 200, {
      token: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
      expiresInSeconds: 3600
    });
  } catch (err) {
    return sendError(res, err.status || 401, err.message || 'Login failed');
  }
}

/** POST /api/auth/refresh */
async function refresh(req, res) {
  let body;
  try { body = await readBody(req); } catch (e) { return sendError(res, e.status || 400, e.message); }

  const { userId, refreshToken } = body;
  if (!userId || !refreshToken) {
    return sendError(res, 400, 'userId and refreshToken are required');
  }

  try {
    const result = await AuthService.refresh(userId, refreshToken);
    return sendJSON(res, 200, {
      token: result.accessToken,
      refreshToken: result.refreshToken,
      expiresInSeconds: 3600
    });
  } catch (err) {
    return sendError(res, err.status || 401, err.message || 'Refresh failed');
  }
}

/** POST /api/auth/logout */
async function logout(req, res) {
  let body;
  try { body = await readBody(req); } catch (e) { body = {}; }

  const userId = req.user ? req.user.sub : (body.userId || null);
  const refreshToken = body.refreshToken || null;

  if (userId) {
    await AuthService.logout(userId, refreshToken);
  }

  return sendJSON(res, 200, { message: 'Logged out' });
}

/** GET /api/auth/me — returns current user from token */
async function me(req, res) {
  if (!req.user) return sendError(res, 401, 'Not authenticated');
  return sendJSON(res, 200, {
    user: {
      id: req.user.sub,
      email: req.user.email,
      name: req.user.name || '',
      tier: req.user.tier || 'starter'
    }
  });
}

module.exports = { signup, login, refresh, logout, me };
