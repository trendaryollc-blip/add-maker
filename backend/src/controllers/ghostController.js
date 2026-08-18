/* ============================================================
   OMNI backend — src/controllers/ghostController.js
   Ghost Users simulation endpoints.
   ============================================================ */
'use strict';

const { sendJSON, sendError, readBody } = require('../utils/http');
const ghostSim = require('../services/ghost-simulation');
const { generatePersonas, summarizePersonas } = require('../services/persona-engine');
const { generateHeatmap } = require('../services/heatmap-generator');
const { calculateMetrics } = require('../services/predictive-metrics');
const Simulation = require('../models/Simulation');

/** POST /api/ghost/simulate — run a ghost user simulation */
async function simulate(req, res) {
  let body;
  try { body = await readBody(req); } catch (e) { return sendError(res, e.status || 400, e.message); }

  const ghostCount = Math.min(10000, Math.max(10, parseInt(body.ghostCount, 10) || 500));
  const duration = Math.min(120, Math.max(5, parseInt(body.duration, 10) || 15));

  try {
    const result = await ghostSim.simulateReactions({
      ghostCount,
      duration,
      productName: body.productName,
      productCategory: body.productCategory,
      targetAudience: body.targetAudience,
      dailyBudget: body.dailyBudget,
      industry: body.industry,
      platform: body.platform
    });

    if (req.user && req.user.sub) {
      try {
        await Simulation.create(req.user.sub, {
          ghostCount,
          duration,
          overallScore: result.overall_score,
          emotionalJourney: result.emotional_journey,
          predictedMetrics: result.predicted_metrics,
          bestSegment: result.best_segment,
          worstSegment: result.worst_segment,
          recommendations: result.recommendations || []
        });
      } catch (_e) { /* non-critical */ }
    }

    return sendJSON(res, 200, result);
  } catch (err) {
    return sendError(res, 500, err.message || 'Simulation failed');
  }
}

/** POST /api/ghost/personas — generate personas only */
async function personas(req, res) {
  let body;
  try { body = await readBody(req); } catch (e) { return sendError(res, e.status || 400, e.message); }

  const count = Math.min(10000, Math.max(10, parseInt(body.count, 10) || 500));

  try {
    const personas = await generatePersonas({
      count,
      productName: body.productName,
      productCategory: body.productCategory,
      targetAudience: body.targetAudience
    });
    const summary = summarizePersonas(personas);
    return sendJSON(res, 200, { personas: personas.slice(0, 200), summary });
  } catch (err) {
    return sendError(res, 500, err.message || 'Persona generation failed');
  }
}

/** POST /api/ghost/heatmap — generate attention heatmap */
async function heatmap(req, res) {
  let body;
  try { body = await readBody(req); } catch (e) { return sendError(res, e.status || 400, e.message); }

  const ghostCount = Math.min(10000, Math.max(10, parseInt(body.ghostCount, 10) || 500));
  const duration = Math.min(120, Math.max(5, parseInt(body.duration, 10) || 15));
  const gridSize = Math.min(20, Math.max(5, parseInt(body.gridSize, 10) || 10));

  try {
    const personas = await generatePersonas({
      count: ghostCount,
      productName: body.productName,
      productCategory: body.productCategory,
      targetAudience: body.targetAudience
    });

    const { simulateBatch } = require('../services/reaction-model');
    const reactions = simulateBatch(personas, duration).reactions;
    const heatmap = generateHeatmap(reactions, { gridSize, duration });

    return sendJSON(res, 200, heatmap);
  } catch (err) {
    return sendError(res, 500, err.message || 'Heatmap generation failed');
  }
}

/** POST /api/ghost/metrics — calculate predictive metrics */
async function metrics(req, res) {
  let body;
  try { body = await readBody(req); } catch (e) { return sendError(res, e.status || 400, e.message); }

  const ghostCount = Math.min(10000, Math.max(10, parseInt(body.ghostCount, 10) || 500));
  const duration = Math.min(120, Math.max(5, parseInt(body.duration, 10) || 15));

  try {
    const result = await ghostSim.simulateReactions({
      ghostCount,
      duration,
      productName: body.productName,
      productCategory: body.productCategory,
      dailyBudget: body.dailyBudget,
      industry: body.industry,
      platform: body.platform
    });

    return sendJSON(res, 200, result.predicted_metrics);
  } catch (err) {
    return sendError(res, 500, err.message || 'Metrics calculation failed');
  }
}

/** GET /api/ghost/environments — list available environments */
async function environments(_req, res) {
  return sendJSON(res, 200, { environments: ghostSim.getEnvironments() });
}

/** GET /api/ghost/history — list past simulations */
async function history(req, res) {
  if (!req.user) return sendError(res, 401, 'Authentication required');

  try {
    const simulations = await Simulation.findByUserId(req.user.sub);
    return sendJSON(res, 200, { simulations });
  } catch (err) {
    return sendError(res, 500, err.message || 'Failed to fetch simulation history');
  }
}

module.exports = { simulate, personas, heatmap, metrics, environments, history };
