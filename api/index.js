/* ============================================================
   OMNI — Vercel Serverless Function Entry Point
   This file adapts the Express-like HTTP server to work as
   a Vercel serverless function. It handles the cold start,
   routes requests through the existing router, and manages
   the serverless lifecycle.
   ============================================================ */
'use strict';

const { createApp } = require('../server');

let app;

function getApp() {
  if (!app) {
    app = createApp();
  }
  return app;
}

module.exports = async (req, res) => {
  const server = getApp();

  // Delegate to the HTTP server's request handler
  server.emit('request', req, res);
};
