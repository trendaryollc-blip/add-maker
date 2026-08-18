/* ============================================================
   OMNI backend — src/controllers/healthController.js
   Health check + service status endpoints.
   ============================================================ */
'use strict';

const { sendJSON } = require('../utils/http');
const { env } = require('../config/env');
const { mockMode, serviceStatus } = require('../services/mock-mode');
const db = require('../config/database');
const pkg = require('../../package.json');

/** GET /api/health — basic liveness probe */
function health(_req, res) {
  sendJSON(res, 200, {
    status: 'ok',
    version: pkg.version,
    environment: env.NODE_ENV,
    mockData: mockMode(),
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
}

/** GET /api/status — detailed service connectivity */
async function status(_req, res) {
  const services = serviceStatus();
  let dbStatus = 'not configured';
  let dbError = null;

  if (db.isConfigured()) {
    try {
      await db.query('SELECT 1');
      dbStatus = 'connected';
    } catch (err) {
      dbStatus = 'error';
      dbError = err.message;
    }
  }

  sendJSON(res, 200, {
    version: pkg.version,
    environment: env.NODE_ENV,
    mockMode: mockMode(),
    services: {
      ...services,
      database: dbStatus,
      databaseError: dbError
    },
    timestamp: new Date().toISOString()
  });
}

module.exports = { health, status };
