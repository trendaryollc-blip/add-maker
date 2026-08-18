/* ============================================================
   OMNI backend — src/middleware/rateLimit.js
   Simple in-memory rate limiter. Falls back gracefully when
   Redis is unavailable.
   ============================================================ */
'use strict';

const redis = require('../config/redis');

// In-memory store for rate limiting (fallback)
const hits = new Map();

/**
 * Create a rate limiter middleware.
 * @param {object} opts
 * @param {number} opts.windowMs - Time window in milliseconds (default: 60000)
 * @param {number} opts.max - Max requests per window (default: 100)
 * @param {string} opts.keyPrefix - Key prefix for Redis (default: 'rl')
 * @param {string} opts.message - Error message
 */
function rateLimit(opts = {}) {
  const windowMs = opts.windowMs || 60000;
  const max = opts.max || 100;
  const keyPrefix = opts.keyPrefix || 'rl';
  const message = opts.message || 'Too many requests, please try again later';
  const windowSeconds = Math.ceil(windowMs / 1000);

  return async function rateLimitMiddleware(req, res, next) {
    const key = getApiKey(req, keyPrefix);
    const now = Date.now();

    // In-memory rate limiting (always available)
    const entry = hits.get(key);

    if (!entry || now - entry.start > windowMs) {
      hits.set(key, { start: now, count: 1 });
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(max - 1));
      if (next) next();
      return;
    }

    entry.count++;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.start + windowMs - now) / 1000);
      res.writeHead(429, {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(max),
        'X-RateLimit-Remaining': '0'
      });
      res.end(JSON.stringify({ error: true, message }));
      return; // stop chain
    }

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(max - entry.count));
    if (next) next();
  };
}

function getApiKey(req, prefix) {
  const ip = req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
  const auth = req.headers.authorization || '';
  return `${prefix}:${ip}:${auth.slice(0, 20)}`;
}

// Pre-built limiters
const generalLimiter = rateLimit({ windowMs: 60000, max: 200, keyPrefix: 'rl:gen' });
const authLimiter = rateLimit({ windowMs: 60000, max: 20, keyPrefix: 'rl:auth', message: 'Too many authentication attempts' });
const scanLimiter = rateLimit({ windowMs: 60000, max: 30, keyPrefix: 'rl:scan', message: 'Too many scan requests' });
const apiLimiter = rateLimit({ windowMs: 60000, max: 100, keyPrefix: 'rl:api' });

module.exports = { rateLimit, generalLimiter, authLimiter, scanLimiter, apiLimiter };
