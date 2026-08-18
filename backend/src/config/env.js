/* ============================================================
   OMNI backend — src/config/env.js
   Central environment access with safe defaults.
   Reads from process.env (populated by .env via dotenv).
   ============================================================ */
'use strict';

// Load .env file if present (no-op if dotenv not installed or no .env)
try { require('dotenv').config(); } catch (_e) {}

const env = {
  NODE_ENV:     process.env.NODE_ENV || 'development',
  PORT:         Number(process.env.PORT) || 3001,
  API_PREFIX:   process.env.API_PREFIX || '/api',
  CORS_ORIGIN:  process.env.CORS_ORIGIN || '*',

  // Auth
  JWT_SECRET:       process.env.JWT_SECRET || 'omni-dev-secret-change-me-in-production',
  JWT_EXPIRES_IN:   process.env.JWT_EXPIRES_IN || '1h',
  REFRESH_EXPIRES_IN: process.env.REFRESH_EXPIRES_IN || '30d',

  // Mock mode — when true, services return realistic mock data
  MOCK_DATA: process.env.MOCK_DATA !== 'false',

  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',

  // Redis
  REDIS_URL: process.env.REDIS_URL || '',

  // AI Services
  OPENAI_API_KEY:    process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL:      process.env.OPENAI_MODEL || 'gpt-4o',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  STABILITY_API_KEY: process.env.STABILITY_API_KEY || '',
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || '',

  // Payment
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',

  // Ad Platforms
  META_ACCESS_TOKEN:  process.env.META_ACCESS_TOKEN || '',
  META_APP_ID:        process.env.META_APP_ID || '',
  META_APP_SECRET:    process.env.META_APP_SECRET || '',
  TIKTOK_ACCESS_TOKEN: process.env.TIKTOK_ACCESS_TOKEN || '',
  GOOGLE_ADS_REFRESH_TOKEN: process.env.GOOGLE_ADS_REFRESH_TOKEN || '',
  GOOGLE_ADS_CLIENT_ID:     process.env.GOOGLE_ADS_CLIENT_ID || '',
  GOOGLE_ADS_CLIENT_SECRET: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
  GOOGLE_ADS_DEVELOPER_TOKEN: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',

  // E-commerce
  SHOPIFY_STORE_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN || '',
  SHOPIFY_ACCESS_TOKEN: process.env.SHOPIFY_ACCESS_TOKEN || '',

  // Email
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
  EMAIL_FROM:       process.env.EMAIL_FROM || 'noreply@omni.ai',

  // Storage
  S3_BUCKET:   process.env.S3_BUCKET || '',
  S3_REGION:   process.env.S3_REGION || 'us-east-1',
  S3_ACCESS_KEY:    process.env.S3_ACCESS_KEY || '',
  S3_SECRET_KEY:    process.env.S3_SECRET_KEY || '',

  // Computed
  isProduction: false
};

env.isProduction = env.NODE_ENV === 'production';

module.exports = { env };
