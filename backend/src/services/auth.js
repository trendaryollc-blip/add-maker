/* ============================================================
   OMNI backend — src/services/auth.js
   Authentication service: JWT access tokens + refresh tokens.
   Uses bcrypt for password hashing and jsonwebtoken for tokens.
   ============================================================ */
'use strict';

const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { env } = require('../config/env');
const User = require('../models/User');
const redis = require('../config/redis');

// In-memory refresh token store (fallback when Redis unavailable)
const refreshStore = new Map();

const ACCESS_TOKEN_EXPIRY = env.JWT_EXPIRES_IN || '1h';
const REFRESH_TOKEN_EXPIRY = env.REFRESH_EXPIRES_IN || '30d';

function parseExpiry(str) {
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return 3600;
  const n = parseInt(match[1], 10);
  switch (match[2]) {
    case 's': return n;
    case 'm': return n * 60;
    case 'h': return n * 3600;
    case 'd': return n * 86400;
    default: return 3600;
  }
}

function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name, tier: user.tier },
    env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

function generateRefreshToken() {
  return uuidv4() + '.' + uuidv4().replace(/-/g, '');
}

async function storeRefreshToken(userId, token) {
  const expirySeconds = parseExpiry(REFRESH_TOKEN_EXPIRY);
  const expiresAt = new Date(Date.now() + expirySeconds * 1000).toISOString();

  // Try Redis first
  const stored = await redis.set(`refresh:${userId}:${token}`, '1', expirySeconds);
  if (!stored) {
    // Fallback to in-memory
    refreshStore.set(`${userId}:${token}`, { expiresAt });
  }
}

async function verifyRefreshToken(userId, token) {
  // Try Redis first
  const cached = await redis.get(`refresh:${userId}:${token}`);
  if (cached) return true;

  // Fallback to in-memory
  const entry = refreshStore.get(`${userId}:${token}`);
  if (!entry) return false;
  if (new Date(entry.expiresAt) < new Date()) {
    refreshStore.delete(`${userId}:${token}`);
    return false;
  }
  return true;
}

async function revokeRefreshToken(userId, token) {
  await redis.del(`refresh:${userId}:${token}`);
  refreshStore.delete(`${userId}:${token}`);
}

const AuthService = {
  /** Register a new user. Returns { user, accessToken, refreshToken }. */
  async signup(email, password, name) {
    const existing = await User.findByEmail(email);
    if (existing) throw { status: 409, message: 'Email already registered' };

    const user = await User.create(email, password, name);
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    await storeRefreshToken(user.id, refreshToken);

    return { user, accessToken, refreshToken };
  },

  /** Login with email + password. Returns { user, accessToken, refreshToken }. */
  async login(email, password) {
    const user = await User.findByEmail(email);
    if (!user) throw { status: 401, message: 'Invalid email or password' };

    const valid = await User.verifyPassword(user, password);
    if (!valid) throw { status: 401, message: 'Invalid email or password' };

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    await storeRefreshToken(user.id, refreshToken);

    const safe = { id: user.id, email: user.email, name: user.name, tier: user.tier };
    return { user: safe, accessToken, refreshToken };
  },

  /** Refresh an access token using a valid refresh token. */
  async refresh(userId, refreshToken) {
    const valid = await verifyRefreshToken(userId, refreshToken);
    if (!valid) throw { status: 401, message: 'Invalid or expired refresh token' };

    // Rotate: revoke old, issue new
    await revokeRefreshToken(userId, refreshToken);

    const user = await User.findById(userId);
    if (!user) throw { status: 401, message: 'User not found' };

    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken();
    await storeRefreshToken(userId, newRefreshToken);

    return { accessToken, refreshToken: newRefreshToken };
  },

  /** Logout: revoke refresh token. */
  async logout(userId, refreshToken) {
    if (refreshToken) {
      await revokeRefreshToken(userId, refreshToken);
    }
  },

  /** Verify an access token. Returns decoded payload or null. */
  verifyToken(token) {
    try {
      return jwt.verify(token, env.JWT_SECRET);
    } catch {
      return null;
    }
  }
};

module.exports = AuthService;
