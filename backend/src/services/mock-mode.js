/* ============================================================
   OMNI backend — src/services/mock-mode.js
   Central mock mode controller. Each service checks mockMode()
   before making external API calls. When true, realistic mock
   data is returned instead.
   ============================================================ */
'use strict';

const { env } = require('../config/env');

/**
 * Check if mock mode is active.
 * Returns true when MOCK_DATA=true (or no real API keys configured).
 */
function mockMode() {
  if (env.MOCK_DATA) return true;

  // If no real keys are configured, force mock mode
  const hasRealKeys = env.OPENAI_API_KEY ||
    env.ANTHROPIC_API_KEY ||
    env.STRIPE_SECRET_KEY ||
    env.META_ACCESS_TOKEN;

  return !hasRealKeys;
}

/**
 * Get which services have real API keys configured.
 * Useful for logging and status endpoints.
 */
function serviceStatus() {
  return {
    mockMode: mockMode(),
    openai: Boolean(env.OPENAI_API_KEY && env.OPENAI_API_KEY.length > 10),
    anthropic: Boolean(env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.length > 10),
    stripe: Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_SECRET_KEY.length > 10),
    meta: Boolean(env.META_ACCESS_TOKEN && env.META_ACCESS_TOKEN.length > 10),
    tiktok: Boolean(env.TIKTOK_ACCESS_TOKEN && env.TIKTOK_ACCESS_TOKEN.length > 10),
    googleAds: Boolean(env.GOOGLE_ADS_REFRESH_TOKEN && env.GOOGLE_ADS_REFRESH_TOKEN.length > 10),
    shopify: Boolean(env.SHOPIFY_ACCESS_TOKEN && env.SHOPIFY_ACCESS_TOKEN.length > 10),
    elevenlabs: Boolean(env.ELEVENLABS_API_KEY && env.ELEVENLABS_API_KEY.length > 10),
    stability: Boolean(env.STABILITY_API_KEY && env.STABILITY_API_KEY.length > 10),
    sendgrid: Boolean(env.SENDGRID_API_KEY && env.SENDGRID_API_KEY.length > 10),
    database: Boolean(env.DATABASE_URL),
    redis: Boolean(env.REDIS_URL)
  };
}

module.exports = { mockMode, serviceStatus };
