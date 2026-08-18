/* ============================================================
   OMNI backend — src/controllers/platformController.js
   Platform Alchemy endpoints: adapt, captions, hashtags, schedule.
   ============================================================ */
'use strict';

const pa = require('../services/platform-adaptation');
const { sendJSON, sendError, readBody } = require('../utils/http');

/** GET /api/platform/adapt — adapt ad for a platform */
function adapt(req, res) {
  const platform = req.query.get('platform') || 'tiktok';
  sendJSON(res, 200, pa.adaptForPlatform(null, platform));
}

/** GET /api/platform/adapt/all — adapt for all platforms */
function adaptAll(_req, res) {
  const results = pa.adaptForAllPlatforms(null);
  sendJSON(res, 200, { adaptations: results, total: results.length });
}

/** GET /api/platform/list — list all supported platforms */
function list(_req, res) {
  sendJSON(res, 200, { platforms: pa.listPlatforms() });
}

/** POST /api/platform/captions — generate captions */
async function captions(req, res) {
  let body;
  try { body = await readBody(req); } catch (e) { return sendError(res, e.status || 400, e.message); }

  const platform = req.query.get('platform') || body.platform || 'tiktok';
  try {
    const result = await pa.generateCaptions({
      productName: body.productName || body.product,
      productCategory: body.productCategory || body.category,
      platform,
      tone: body.tone,
      benefits: body.benefits,
      count: body.count || 5
    });
    return sendJSON(res, 200, result);
  } catch (err) {
    return sendError(res, 500, err.message || 'Caption generation failed');
  }
}

/** GET /api/platform/hashtags — generate hashtags */
function hashtags(req, res) {
  const product = req.query.get('product') || '';
  const category = req.query.get('category') || '';
  const platform = req.query.get('platform') || 'tiktok';
  const count = parseInt(req.query.get('count'), 10) || 15;

  const result = pa.generateHashtags({
    productName: product,
    productCategory: category,
    platform,
    count
  });
  return sendJSON(res, 200, result);
}

/** GET /api/platform/schedule — get posting schedule */
function schedule(req, res) {
  const platform = req.query.get('platform') || 'tiktok';
  const timezone = req.query.get('timezone') || 'UTC';
  const count = parseInt(req.query.get('count'), 10) || 3;

  const result = pa.optimizePostingTime(platform, { timezone, count });
  return sendJSON(res, 200, result);
}

/** POST /api/platform/brief — generate full content brief */
async function brief(req, res) {
  let body;
  try { body = await readBody(req); } catch (e) { return sendError(res, e.status || 400, e.message); }

  try {
    const result = await pa.generateFullBrief({
      productName: body.productName || body.product,
      productCategory: body.productCategory || body.category,
      benefits: body.benefits
    });
    return sendJSON(res, 200, result);
  } catch (err) {
    return sendError(res, 500, err.message || 'Brief generation failed');
  }
}

module.exports = { adapt, adaptAll, list, captions, hashtags, schedule, brief };
