/* ============================================================
   OMNI backend — server.js
   HTTP entry point. Boots the router, adds CORS + rate limiting
   + central error handling and starts listening.
     - run directly:  node server.js   (or: npm start)
     - import for tests: const { createApp } = require('./server')
   ============================================================ */
'use strict';

const http = require('http');
const { buildRoutes } = require('./src/routes');
const { env } = require('./src/config/env');
const { handleCors, isPreflight } = require('./src/middleware/cors');
const { sendError } = require('./src/utils/http');
const pkg = require('./package.json');

/** Build the HTTP server (routes + middleware + error handling). */
function createApp() {
  const router = buildRoutes();

  const server = http.createServer(async (req, res) => {
    // CORS headers on every response
    handleCors(req, res);

    // Short-circuit preflight
    if (isPreflight(req)) {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      await router.handle(req, res);
    } catch (err) {
      if (!res.writableEnded) {
        sendError(res, err && err.status ? err.status : 500, 'Internal server error');
      }
    }
  });

  return server;
}

/** Start listening; resolves with the running server instance. */
function start(port = env.PORT) {
  const server = createApp();
  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

// Run directly: `node server.js`
if (require.main === module) {
  start().then((server) => {
    const address = server.address();
    console.log(`\n  OMNI API v${pkg.version}`);
    console.log(`  Env:       ${env.NODE_ENV}`);
    console.log(`  Mock data: ${env.MOCK_DATA ? 'ON' : 'OFF'}`);
    console.log(`  Database:  ${env.DATABASE_URL ? 'configured' : 'not set (memory mode)'}`);
    console.log(`  Listening: http://localhost:${address.port}${env.API_PREFIX}\n`);
  });
}

module.exports = { createApp, start };
