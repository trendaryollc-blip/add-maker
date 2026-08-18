/* ============================================================
   OMNI — Vercel-compatible serverless handler
   Alternative entry point that wraps the HTTP server for
   serverless environments. Each invocation reuses a cached
   server instance for warm starts.
   ============================================================ */
'use strict';

const http = require('http');
const { buildRoutes } = require('../backend/src/routes');
const { handleCors, isPreflight } = require('../backend/src/middleware/cors');
const { sendError } = require('../backend/src/utils/http');

let cachedHandler = null;

function getHandler() {
  if (cachedHandler) return cachedHandler;

  const router = buildRoutes();

  cachedHandler = async (req, res) => {
    handleCors(req, res);

    if (isPreflight(req)) {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      await router.handle(req, res);
    } catch (err) {
      if (!res.writableEnded) {
        sendError(res, err?.status || 500, 'Internal server error');
      }
    }
  };

  return cachedHandler;
}

module.exports = getHandler();
