/* ============================================================
   OMNI — utils/api.js
   Centralized API client for frontend-backend communication.
   Handles auth headers, error handling, retry logic, and
   automatic token refresh.
   ============================================================= */
(function (global) {
  'use strict';

  var CONFIG = global.OMNI_CONFIG || {};
  var Store = global.OMNI_STORE;
  var BASE = (CONFIG.ENV && CONFIG.ENV.baseURL) || '';

  var REFRESH_IN_PROGRESS = false;

  /** Get the current access token from the store. */
  function getToken() {
    var user = Store && Store.getRaw('user');
    return user && user.token ? user.token : null;
  }

  /** Get the current refresh token. */
  function getRefreshToken() {
    var user = Store && Store.getRaw('user');
    return user && user.refreshToken ? user.refreshToken : null;
  }

  /** Get the user ID. */
  function getUserId() {
    var user = Store && Store.getRaw('user');
    return user && user.id ? user.id : null;
  }

  /** Save tokens to the store. */
  function saveTokens(accessToken, refreshToken) {
    if (!Store) return;
    var user = Store.getRaw('user') || {};
    user.token = accessToken;
    user.refreshToken = refreshToken;
    Store.set('user', user);
  }

  /** Attempt to refresh the access token. */
  async function tryRefresh() {
    var refreshToken = getRefreshToken();
    var userId = getUserId();
    if (!refreshToken || !userId) return false;

    if (REFRESH_IN_PROGRESS) return false;
    REFRESH_IN_PROGRESS = true;

    try {
      var resp = await fetch(BASE + '/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId, refreshToken: refreshToken })
      });
      if (!resp.ok) return false;
      var data = await resp.json();
      saveTokens(data.token, data.refreshToken);
      return true;
    } catch (_e) {
      return false;
    } finally {
      REFRESH_IN_PROGRESS = false;
    }
  }

  /**
   * Make an API request.
   * @param {string} path - API path (e.g. '/scan')
   * @param {object} opts - { method, body, headers, noAuth, retry }
   * @returns {Promise<object>} - { status, data, ok }
   */
  async function api(path, opts) {
    opts = opts || {};
    var method = (opts.method || 'GET').toUpperCase();
    var headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});

    // Add auth token
    if (!opts.noAuth) {
      var token = getToken();
      if (token) {
        headers['Authorization'] = 'Bearer ' + token;
      }
    }

    var fetchOpts = { method: method, headers: headers };
    if (opts.body && method !== 'GET') {
      fetchOpts.body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
    }

    try {
      var resp = await fetch(BASE + path, fetchOpts);
      var text = await resp.text();
      var data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (_e) { data = { raw: text }; }

      // If 401 and we have a refresh token, try refreshing once
      if (resp.status === 401 && !opts.noAuth && opts.retry !== false) {
        var refreshed = await tryRefresh();
        if (refreshed) {
          return api(path, Object.assign({}, opts, { retry: false }));
        }
        // Refresh failed — clear session
        if (Store) Store.remove('user');
      }

      return { status: resp.status, data: data, ok: resp.ok };
    } catch (err) {
      return { status: 0, data: { error: true, message: err.message }, ok: false };
    }
  }

  /** Convenience methods */
  api.get = function (path, headers) { return api(path, { method: 'GET', headers: headers }); };
  api.post = function (path, body, headers) { return api(path, { method: 'POST', body: body, headers: headers }); };
  api.put = function (path, body, headers) { return api(path, { method: 'PUT', body: body, headers: headers }); };
  api.del = function (path, headers) { return api(path, { method: 'DELETE', headers: headers }); };

  /** Set the base URL (e.g. after config loads). */
  api.setBase = function (url) { BASE = url; };

  /** Get the current base URL. */
  api.getBase = function () { return BASE; };

  global.OMNI_API = api;
})(window);
