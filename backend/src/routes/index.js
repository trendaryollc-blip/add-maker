/* ============================================================
   OMNI backend — src/routes/index.js
   Registers all API routes on the shared router.
   ============================================================ */
'use strict';

const { createRouter } = require('../utils/router');
const { env } = require('../config/env');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const health = require('../controllers/healthController');
const auth = require('../controllers/authController');
const product = require('../controllers/productController');
const studio = require('../controllers/studioController');
const ghost = require('../controllers/ghostController');
const platform = require('../controllers/platformController');
const autopilot = require('../controllers/autopilotController');
const checkout = require('../controllers/checkoutController');

/** Build the fully-wired router. */
function buildRoutes() {
  const api = createRouter();
  const p = env.API_PREFIX;

  // Health
  api.get(`${p}/health`, health.health);
  api.get(`${p}/status`, health.status);

  // Auth
  api.post(`${p}/auth/signup`, auth.signup);
  api.post(`${p}/auth/login`, auth.login);
  api.post(`${p}/auth/refresh`, auth.refresh);
  api.post(`${p}/auth/logout`, requireAuth, auth.logout);
  api.get(`${p}/auth/me`, requireAuth, auth.me);

  // Neural Product Scan (optional auth — persists when logged in)
  api.post(`${p}/scan`, optionalAuth, product.scan);
  api.get(`${p}/scan/history`, requireAuth, product.history);
  api.get(`${p}/scan/:id`, requireAuth, product.getById);

  // Reality Studio
  api.get(`${p}/studio/environments`, studio.environments);
  api.post(`${p}/studio/environment`, studio.setEnvironment);
  api.post(`${p}/studio/export`, requireAuth, studio.exportAd);
  api.post(`${p}/studio/voiceover`, requireAuth, studio.voiceover);
  api.get(`${p}/studio/render/:jobId`, requireAuth, studio.renderStatus);

  // Ghost Users
  api.post(`${p}/ghost/simulate`, requireAuth, ghost.simulate);
  api.post(`${p}/ghost/personas`, requireAuth, ghost.personas);
  api.post(`${p}/ghost/heatmap`, requireAuth, ghost.heatmap);
  api.post(`${p}/ghost/metrics`, requireAuth, ghost.metrics);
  api.get(`${p}/ghost/environments`, ghost.environments);
  api.get(`${p}/ghost/history`, requireAuth, ghost.history);

  // Platform Alchemy
  api.get(`${p}/platform/adapt`, platform.adapt);
  api.get(`${p}/platform/adapt/all`, platform.adaptAll);
  api.get(`${p}/platform/list`, platform.list);
  api.post(`${p}/platform/captions`, platform.captions);
  api.get(`${p}/platform/hashtags`, platform.hashtags);
  api.get(`${p}/platform/schedule`, platform.schedule);
  api.post(`${p}/platform/brief`, requireAuth, platform.brief);

  // Live Autopilot (auth)
  api.get(`${p}/autopilot/campaigns`, requireAuth, autopilot.campaigns);
  api.post(`${p}/autopilot/campaigns`, requireAuth, autopilot.createCampaign);
  api.post(`${p}/autopilot/campaigns/:id/status`, requireAuth, autopilot.transitionCampaign);
  api.post(`${p}/autopilot/reallocate`, requireAuth, autopilot.reallocate);
  api.post(`${p}/autopilot/optimize`, requireAuth, autopilot.optimize);
  api.get(`${p}/autopilot/anomalies`, requireAuth, autopilot.anomalies);
  api.post(`${p}/autopilot/variant`, requireAuth, autopilot.variant);
  api.get(`${p}/autopilot/ab-tests`, requireAuth, autopilot.abTests);
  api.get(`${p}/autopilot/ab-tests/:id`, requireAuth, autopilot.abTestDetail);
  api.post(`${p}/autopilot/ab-tests/:id/conclude`, requireAuth, autopilot.abTestConclude);
  api.get(`${p}/autopilot/report`, requireAuth, autopilot.report);
  api.get(`${p}/autopilot/summary`, requireAuth, autopilot.summary);

  // Phantom Checkout (auth)
  api.post(`${p}/checkout`, requireAuth, checkout.process);
  api.get(`${p}/checkout/orders`, requireAuth, checkout.orders);
  api.get(`${p}/checkout/orders/:id`, requireAuth, checkout.orderDetail);
  api.post(`${p}/checkout/refund`, requireAuth, checkout.refund);
  api.post(`${p}/checkout/dispute`, requireAuth, checkout.dispute);
  api.get(`${p}/checkout/gateways`, checkout.gateways);
  api.get(`${p}/checkout/currencies`, checkout.currencies);
  api.post(`${p}/checkout/validate`, checkout.validate);

  return api;
}

module.exports = { buildRoutes };
