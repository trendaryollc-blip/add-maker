/* ============================================================
   OMNI backend — src/controllers/autopilotController.js
   Live Autopilot endpoints (auth required).
   ============================================================ */
'use strict';

const { sendJSON, sendError, readBody } = require('../utils/http');
const autopilot = require('../services/autopilot');
const campaignManager = require('../services/campaign-manager');
const abTestEngine = require('../services/ab-test-engine');
const Campaign = require('../models/Campaign');

/** GET /api/autopilot/campaigns — list campaigns */
async function campaigns(req, res) {
  if (!req.user) return sendError(res, 401, 'Authentication required');
  try {
    const result = await autopilot.monitorCampaigns(req.user.sub);
    return sendJSON(res, 200, result);
  } catch (err) {
    return sendError(res, 500, err.message || 'Failed to fetch campaigns');
  }
}

/** POST /api/autopilot/campaigns — create a new campaign */
async function createCampaign(req, res) {
  if (!req.user) return sendError(res, 401, 'Authentication required');
  let body;
  try { body = await readBody(req); } catch (e) { return sendError(res, e.status || 400, e.message); }

  try {
    const campaign = await campaignManager.createCampaign(req.user.sub, {
      name: body.name,
      platform: body.platform,
      budget: body.budget,
      adId: body.adId,
      targetAudience: body.targetAudience,
      objective: body.objective,
      dailyBudget: body.dailyBudget,
      bidStrategy: body.bidStrategy
    });
    return sendJSON(res, 201, campaign);
  } catch (err) {
    return sendError(res, 400, err.message || 'Failed to create campaign');
  }
}

/** POST /api/autopilot/campaigns/:id/status — transition status */
async function transitionCampaign(req, res) {
  if (!req.user) return sendError(res, 401, 'Authentication required');
  let body;
  try { body = await readBody(req); } catch (e) { return sendError(res, e.status || 400, e.message); }

  const campaignId = req.path.split('/').pop();
  if (!body.status) return sendError(res, 400, 'status is required');

  try {
    const campaign = await campaignManager.transitionStatus(campaignId, body.status);
    return sendJSON(res, 200, campaign);
  } catch (err) {
    return sendError(res, 400, err.message || 'Status transition failed');
  }
}

/** POST /api/autopilot/reallocate — auto-reallocate budgets */
async function reallocate(req, res) {
  if (!req.user) return sendError(res, 401, 'Authentication required');
  let body = {};
  try { body = await readBody(req); } catch (_e) { /* optional body */ }

  try {
    const result = await autopilot.reallocateBudget(req.user.sub, {
      dryRun: body.dryRun || false,
      strategy: body.strategy
    });
    return sendJSON(res, 200, result);
  } catch (err) {
    return sendError(res, 500, err.message || 'Reallocation failed');
  }
}

/** POST /api/autopilot/optimize — optimize budget allocation */
async function optimize(req, res) {
  if (!req.user) return sendError(res, 401, 'Authentication required');
  let body = {};
  try { body = await readBody(req); } catch (_e) { /* optional body */ }

  try {
    const result = await autopilot.optimizeBudget(req.user.sub, {
      totalBudget: body.totalBudget,
      strategy: body.strategy
    });
    return sendJSON(res, 200, result);
  } catch (err) {
    return sendError(res, 500, err.message || 'Optimization failed');
  }
}

/** GET /api/autopilot/anomalies — detect anomalies */
async function anomalies(req, res) {
  if (!req.user) return sendError(res, 401, 'Authentication required');
  try {
    const result = await autopilot.detectAnomalies(req.user.sub);
    return sendJSON(res, 200, result);
  } catch (err) {
    return sendError(res, 500, err.message || 'Anomaly detection failed');
  }
}

/** POST /api/autopilot/variant — generate new A/B test variant */
async function variant(req, res) {
  if (!req.user) return sendError(res, 401, 'Authentication required');
  let body = {};
  try { body = await readBody(req); } catch (_e) { /* optional body */ }

  try {
    const result = autopilot.generateVariant({
      productName: body.productName,
      filename: body.filename
    });
    return sendJSON(res, 200, result);
  } catch (err) {
    return sendError(res, 500, err.message || 'Variant generation failed');
  }
}

/** GET /api/autopilot/ab-tests — list active A/B tests */
function abTests(_req, res) {
  const tests = abTestEngine.getActiveTests();
  return sendJSON(res, 200, { tests, total: tests.length });
}

/** GET /api/autopilot/ab-tests/:id — get test details */
function abTestDetail(req, res) {
  const testId = req.path.split('/').pop();
  const test = abTestEngine.getTest(testId);
  if (!test) return sendError(res, 404, 'Test not found');

  const significance = abTestEngine.checkSignificance(testId);
  return sendJSON(res, 200, { test, significance });
}

/** POST /api/autopilot/ab-tests/:id/conclude — conclude a test */
function abTestConclude(req, res) {
  const testId = req.path.split('/').pop();
  const result = abTestEngine.concludeTest(testId);
  if (result.error) return sendError(res, 404, result.error);
  return sendJSON(res, 200, result);
}

/** GET /api/autopilot/report — generate performance report */
async function report(req, res) {
  if (!req.user) return sendError(res, 401, 'Authentication required');
  const period = req.query.get('period') || 'last_7_days';
  try {
    const result = await autopilot.generateReport(req.user.sub, { period });
    return sendJSON(res, 200, result);
  } catch (err) {
    return sendError(res, 500, err.message || 'Report generation failed');
  }
}

/** GET /api/autopilot/summary — get campaign summary */
async function summary(req, res) {
  if (!req.user) return sendError(res, 401, 'Authentication required');
  try {
    const result = await autopilot.getSummary(req.user.sub);
    return sendJSON(res, 200, result);
  } catch (err) {
    return sendError(res, 500, err.message || 'Summary failed');
  }
}

module.exports = {
  campaigns, createCampaign, transitionCampaign,
  reallocate, optimize, anomalies, variant,
  abTests, abTestDetail, abTestConclude,
  report, summary
};
