/* ============================================================
   OMNI backend — src/utils/router.js
   A tiny, dependency-free router. Routes are `method` + path with
   optional `:param` segments. Multiple handlers per route act as
   middleware: they run in order until the response is ended.
   ============================================================ */
'use strict';

const { sendJSON } = require('./http');

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

/** Compile a route path like '/api/items/:id' into a regex + params. */
function compile(path) {
  const paramNames = [];
  const pattern = path.replace(/:[^/]+/g, (m) => {
    paramNames.push(m.slice(1));
    return '([^/]+)';
  });
  return { paramNames, rx: new RegExp('^' + pattern + '/?$') };
}

function createRouter() {
  const routes = [];

  /** Route a request through the matching route's handler chain. */
  async function handle(req, res) {
    const url = new URL(req.url || '/', 'http://localhost');
    const pathname = url.pathname;

    for (const route of routes) {
      if (route.method !== req.method) continue;

      const match = pathname.match(route.path.rx);
      if (!match) continue;

      req.params = {};
      route.path.paramNames.forEach((name, i) => {
        req.params[name] = decodeURIComponent(match[i + 1]);
      });
      req.query = url.searchParams;

      for (const handler of route.handlers) {
        await handler(req, res);
        if (res.writableEnded) return;
      }
      return;
    }

    return sendJSON(res, 404, { error: true, message: 'Route not found' });
  }

  const api = { handle };

  METHODS.forEach((method) => {
    api[method.toLowerCase()] = (path, ...handlers) => {
      routes.push({ method, path: compile(path), handlers });
      return api;
    };
  });

  return api;
}

module.exports = { createRouter };