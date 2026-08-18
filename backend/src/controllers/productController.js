/* ============================================================
   OMNI backend — src/controllers/productController.js
   Neural Product Scan endpoints.
   ============================================================ */
'use strict';

const { sendJSON, sendError, readBody } = require('../utils/http');
const productAnalysis = require('../services/product-analysis');
const openai = require('../services/openai-client');
const { mockMode } = require('../services/mock-mode');
const Scan = require('../models/Scan');

/** POST /api/scan — run a full product analysis */
async function scan(req, res) {
  let body;
  try { body = await readBody(req); } catch (e) { return sendError(res, e.status || 400, e.message); }

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  const productName = typeof body.productName === 'string' ? body.productName.trim() : '';

  if (!url && !productName) {
    return sendError(res, 400, 'A product URL or product name is required');
  }

  try {
    const result = await productAnalysis.scanProduct(url || `https://product/${encodeURIComponent(productName)}`, {
      productName,
      productData: body.productData || null,
      reviews: body.reviews || []
    });

    // Persist if authenticated
    if (req.user && req.user.sub) {
      try {
        await Scan.create(req.user.sub, {
          url: url || '',
          productName: result.product.name,
          productData: result.product,
          emotionalProfile: result.emotional_profile,
          targetAudience: result.target_audience,
          competitors: result.competitors,
          recommendedHooks: result.recommended_hooks
        });
      } catch (_e) { /* non-critical */ }
    }

    return sendJSON(res, 200, result);
  } catch (err) {
    return sendError(res, err.status || 500, err.message || 'Scan failed');
  }
}

/** GET /api/scan/history — list past scans */
async function history(req, res) {
  if (!req.user) return sendError(res, 401, 'Authentication required');
  try {
    const scans = await Scan.findByUserId(req.user.sub);
    return sendJSON(res, 200, { scans });
  } catch (err) {
    return sendError(res, 500, err.message || 'Failed to fetch scan history');
  }
}

/** GET /api/scan/:id — get a specific scan */
async function getById(req, res) {
  if (!req.user) return sendError(res, 401, 'Authentication required');
  const { id } = req.params || {};
  if (!id) return sendError(res, 400, 'Scan ID is required');
  try {
    const scan = await Scan.findById(id);
    if (!scan) return sendError(res, 404, 'Scan not found');
    if (scan.userId !== req.user.sub) return sendError(res, 403, 'Access denied');
    return sendJSON(res, 200, scan);
  } catch (err) {
    return sendError(res, 500, err.message || 'Failed to fetch scan');
  }
}

module.exports = { scan, history, getById };
