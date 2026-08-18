/* ============================================================
   OMNI — config.js
   Central configuration for the OMNI Autonomous Ad Engine.
   ------------------------------------------------------------
   SECURITY: API keys live ONLY on the backend (see backend/.env).
   Frontend communicates with backend via API_BASE_URL.
   ============================================================= */
(function (global) {
  'use strict';

  /* ---------- 1. API CONFIGURATION ---------- */
  var ENV = (global.process && global.process.env) || {};

  // Backend API base URL — all API calls go through the backend
  var API_BASE = ENV.OMNI_API_URL || '';

  /* ---------- 2. ENVIRONMENT ---------- */
  var ENVIRONMENT = {
    name: ENV.OMNI_ENV || 'development',
    debug: (ENV.OMNI_DEBUG || 'true') === 'true',
    version: '1.0.0',
    isProduction: false,
    allowMock: true,
    baseURL: API_BASE,
    useMocks: false
  };

  var qp = new URLSearchParams(global.location ? global.location.search : '');
  if (qp.has('env')) ENVIRONMENT.name = qp.get('env');
  ENVIRONMENT.isProduction = ENVIRONMENT.name === 'production';
  if (qp.has('mocks') && qp.get('mocks') === '1') ENVIRONMENT.useMocks = true;

  /* ---------- 3. APP SETTINGS ---------- */
  var AppSettings = {
    name: 'OMNI',
    tagline: 'The Autonomous Ad Engine',
    defaultPlatform: 'tiktok',
    defaultCurrency: 'USD',
    currencySymbol: '$',
    defaultBudget: 500,
    locale: 'en-US',
    timezone: 'UTC',
    ghostUsersDefault: 500,
    animationsEnabled: true,
    particleCount: 40,
    pollIntervalMs: 5000,
    sessionTimeoutMin: 60
  };

  /* ---------- 4. FEATURE FLAGS ---------- */
  var Features = {
    NEURAL_SCAN:         true,
    REALITY_STUDIO:      true,
    GHOST_USERS:         true,
    PLATFORM_ALCHEMY:    true,
    LIVE_AUTOPILOT:      true,
    PHANTOM_CHECKOUT:    true,
    THEME_TOGGLE:        true,
    EXPORT_REPORTS:      true,
    COMPETITOR_SPY:      true,
    REVIEW_MINING:       true,
    VOICEOVER_SYNTH:     false,
    AI_VIDEO_GENERATION: false,
    HEATMAPS:            true,
    MULTI_BRAND:         false,
    DARK_MODE:           true,
    BETA_3D:             true
  };

  /* ---------- 5. PLATFORM PROFILES ---------- */
  var Platforms = {
    tiktok:     { label: 'TikTok',      w: 1080, h: 1920, ratio: '9:16',    tone: 'Trendy, Authentic', cta: 'Shop Now', cap: 30 },
    instagram:  { label: 'Instagram',   w: 1080, h: 1920, ratio: '9:16',    tone: 'Aesthetic, Polished', cta: 'Link in Bio', cap: 30 },
    instaFeed:  { label: 'IG Feed',     w: 1080, h: 1080, ratio: '1:1',     tone: 'High Quality', cta: 'Shop Now', cap: 30 },
    facebook:   { label: 'Facebook',    w: 1080, h: 1080, ratio: '1:1',     tone: 'Relatable', cta: 'Learn More', cap: 60 },
    youtube:    { label: 'YouTube',     w: 1920, h: 1080, ratio: '16:9',    tone: 'Informative', cta: 'Buy / Subscribe', cap: 120 },
    amazon:     { label: 'Amazon',      w: 1600, h: 1600, ratio: 'carousel',tone: 'Benefit-focused', cta: 'See Details', cap: 0 },
    linkedin:   { label: 'LinkedIn',    w: 1200, h: 1200, ratio: '1:1',     tone: 'Professional', cta: 'Learn More', cap: 60 }
  };

  /* ---------- 6. TIERS / BUSINESS ---------- */
  var Tiers = [
    { id: 'starter',    name: 'Starter',   priceUSD: 49,  ghostUsers: 10,  autopilot: false },
    { id: 'pro',        name: 'Pro',       priceUSD: 149, ghostUsers: 500, autopilot: true },
    { id: 'agency',     name: 'Agency',    priceUSD: 499, ghostUsers: -1,  autopilot: true },
    { id: 'enterprise', name: 'Enterprise',priceUSD: 0,   ghostUsers: -1,  autopilot: true }
  ];

  /* ---------- 7. EXPORT ---------- */
  var CONFIG = {
    ENV: ENVIRONMENT,
    APP: AppSettings,
    FEATURES: Features,
    PLATFORMS: Platforms,
    TIERS: Tiers,
    isConfigured: function () { return false; },
    key: function () { return ''; }
  };

  global.OMNI_CONFIG = CONFIG;
})(window);
