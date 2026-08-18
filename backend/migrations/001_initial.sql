-- ============================================================
-- OMNI — Database Schema (PostgreSQL)
-- Run: psql -U omni -d omni_db -f migrations/001_initial.sql
-- ============================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(128) DEFAULT '',
  tier          VARCHAR(32)  DEFAULT 'starter',
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- Refresh tokens (for JWT rotation)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(512) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- Neural scan results
CREATE TABLE IF NOT EXISTS scans (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url              TEXT NOT NULL,
  product_name     VARCHAR(255) DEFAULT '',
  product_data     JSONB DEFAULT '{}',
  emotional_profile JSONB DEFAULT '[]',
  target_audience  JSONB DEFAULT '{}',
  competitors      JSONB DEFAULT '[]',
  recommended_hooks JSONB DEFAULT '[]',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_scans_user ON scans(user_id);

-- Generated ads
CREATE TABLE IF NOT EXISTS ads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scan_id     UUID REFERENCES scans(id) ON DELETE SET NULL,
  format      VARCHAR(32) NOT NULL DEFAULT 'tiktok',
  file_url    TEXT DEFAULT '',
  file_size   INTEGER DEFAULT 0,
  duration    INTEGER DEFAULT 0,
  platform    VARCHAR(32) DEFAULT '',
  metadata    JSONB DEFAULT '{}',
  status      VARCHAR(32) DEFAULT 'draft',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ads_user ON ads(user_id);

-- Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ad_id       UUID REFERENCES ads(id) ON DELETE SET NULL,
  name        VARCHAR(255) NOT NULL,
  platform    VARCHAR(32) NOT NULL,
  budget      NUMERIC(12,2) DEFAULT 0,
  spent       NUMERIC(12,2) DEFAULT 0,
  roas        NUMERIC(6,2) DEFAULT 0,
  ctr         NUMERIC(5,2) DEFAULT 0,
  cpc         NUMERIC(6,2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks      INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  status      VARCHAR(32) DEFAULT 'draft',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_campaigns_user ON campaigns(user_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- Ghost user simulations
CREATE TABLE IF NOT EXISTS simulations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ad_id             UUID REFERENCES ads(id) ON DELETE SET NULL,
  ghost_count       INTEGER DEFAULT 500,
  duration          INTEGER DEFAULT 15,
  overall_score     INTEGER DEFAULT 0,
  emotional_journey JSONB DEFAULT '[]',
  predicted_metrics JSONB DEFAULT '{}',
  best_segment      VARCHAR(255) DEFAULT '',
  worst_segment     VARCHAR(255) DEFAULT '',
  recommendations   JSONB DEFAULT '[]',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_simulations_user ON simulations(user_id);

-- Orders (checkout)
CREATE TABLE IF NOT EXISTS orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_charge_id VARCHAR(128) DEFAULT '',
  amount          NUMERIC(12,2) NOT NULL,
  currency        VARCHAR(8) DEFAULT 'USD',
  status          VARCHAR(32) DEFAULT 'pending',
  product_name    VARCHAR(255) DEFAULT '',
  email           VARCHAR(255) DEFAULT '',
  receipt_url     TEXT DEFAULT '',
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
