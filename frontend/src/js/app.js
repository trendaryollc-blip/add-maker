/* ============================================================
   OMNI — app.js (CORE APPLICATION)
   Bootstraps the whole frontend:
   - initializes shared services (config, store, router, utils)
   - registers SPA routes
   - sets up global event listeners (theme, modals, toasts)
   - manages user session + loads initial data
   Requirements: load AFTER config.js, store.js, utils/helpers.js,
   router.js and the six modules (in that order).
   ============================================================= */
(function (global) {
  'use strict';

  var CONFIG = global.OMNI_CONFIG || {};
  var Store = global.OMNI_STORE;
  var Router = global.OMNI_ROUTER;

  /* ---------- Toast helper (notifications) ---------- */
  function toast(message, type) {
    var c = document.querySelector('.toast-container');
    if (!c) {
      c = document.createElement('div');
      c.className = 'toast-container';
      document.body.appendChild(c);
    }
    var t = document.createElement('div');
    t.className = 'toast';
    var icon = { success: '✅', error: '⚠️', info: 'ℹ️' }[type] || 'ℹ️';
    t.innerHTML = '<span>' + icon + '</span><span>' + message + '</span>';
    c.appendChild(t);
    setTimeout(function () {
      t.classList.add('out');
      setTimeout(function () { t.remove(); }, 320);
    }, 3200);
  }

  /* ---------- Session management ---------- */
  var Session = {
    login: function (user) {
      Store.set('user', {
        name: user.name || 'Operator',
        email: user.email || 'operator@omni.ai',
        tier: user.tier || 'pro',
        loggedInAt: new Date().toISOString()
      });
      return Store.get('user');
    },
    logout: function () {
      Store.remove('user');
      if (Router) Router.navigate('/login');
    },
    current: function () { return Store.get('user'); },
    isAuthenticated: function () { return !!Store.get('user'); }
  };

  /* ---------- Initial mock data (dashboard) ---------- */
  function loadInitialData() {
    if (Store.get('campaigns')) return;
    Store.set('campaigns', [
      { id: 'c_01', name: 'Launch — TikTok', platform: 'tiktok', budget: 400, spent: 210, roas: 3.4, ctr: 2.1, status: 'healthy' },
      { id: 'c_02', name: 'Retarget — IG', platform: 'instagram', budget: 300, spent: 250, roas: 1.2, ctr: 0.5, status: 'stalled' },
      { id: 'c_03', name: 'Scale — Facebook', platform: 'facebook', budget: 500, spent: 130, roas: 2.8, ctr: 1.8, status: 'healthy' }
    ]);
    Store.set('settings', {
      defaultPlatform: CONFIG.APP ? CONFIG.APP.defaultPlatform : 'tiktok',
      currency: CONFIG.APP ? CONFIG.APP.currencySymbol : '$'
    });
  }

  /* ---------- Route table ---------- */
  function registerRoutes() {
    if (!Router) return;
    Router.register({
      '/':            { page: 'index.html',        title: 'OMNI — Autonomous Ad Engine' },
      '/index':       { page: 'index.html',        title: 'OMNI — Autonomous Ad Engine' },
      '/login':       { page: 'login.html',        title: 'Sign in to OMNI' },
      '/neural-scan': { page: 'neural-scan.html',  title: 'Neural Product Scan | OMNI' },
      '/reality-studio': { page: 'reality-studio.html', title: '4D Reality Studio | OMNI' },
      '/ghost-users': { page: 'ghost-users.html',  title: 'Ghost Users | OMNI' },
      '/autopilot':   { page: 'autopilot.html',    title: 'Live Autopilot | OMNI' },
      '/analytics':   { page: 'analytics.html',    title: 'Analytics | OMNI' },
      '/checkout':    { page: 'checkout.html',     title: 'Checkout | OMNI' }
    });
  }

  /* ---------- Global event wiring ---------- */
  function setupEvents() {
    // NOTE: theme-toggle buttons are handled centrally by the router's
    // delegated click listener (see router.js). No per-button binding needed.

    // Reusable modal open/close
    document.addEventListener('click', function (e) {
      var opener = e.target.closest('[data-open-modal]');
      var closer = e.target.closest('[data-close-modal]');
      if (opener) {
        var m = document.getElementById(opener.getAttribute('data-open-modal'));
        if (m) m.classList.add('open');
      }
      if (closer) {
        var overlay = closer.closest('.modal-overlay');
        if (overlay) overlay.classList.remove('open');
      }
    });

    // Autopilot master switch
    document.addEventListener('change', function (e) {
      var t = e.target;
      if (t.id === 'autopilot-master') {
        Store.set('autopilotEnabled', t.checked);
        toast(t.checked ? 'Autopilot activated — Omni is working while you sleep.' : 'Autopilot paused.', 'info');
      }
    });
  }

  /* ---------- Route lifecycle hook ---------- */
  function onRoute(loc) {
    global.dispatchEvent(new CustomEvent('omni:route', { detail: loc }));
  }

  /* ---------- Boot ---------- */
  function init() {
    loadInitialData();
    registerRoutes();
    if (Router && Router.start) Router.start();
    setupEvents();
    // expose globals used by router + pages
    var MODULES = {
      neuralScan: global.NeuralScan,
      realityStudio: global.RealityStudio,
      ghostUsers: global.GhostUsers,
      platformAlchemy: global.PlatformAlchemy,
      liveAutopilot: global.LiveAutopilot,
      phantomCheckout: global.PhantomCheckout
    };
    // preserve any modules registered into OMNI at load time
    Object.assign(MODULES, (global.OMNI && global.OMNI.modules) || {});
    global.App = global.OMNI = {
      config: CONFIG,
      store: Store,
      router: Router,
      session: Session,
      modules: MODULES,
      toast: toast,
      onRoute: onRoute,
      isAuthenticated: Session.isAuthenticated,
      currentUser: Session.current,
      version: CONFIG.ENV ? CONFIG.ENV.version : '1.0.0'
    };
    global.App.theme = global.OmniTheme;
    global.dispatchEvent(new CustomEvent('omni:ready', { detail: global.App }));
    console.info('[OMNI] v' + ((CONFIG.ENV && CONFIG.ENV.version) || '1.0.0') + ' ready — ' +
      ((CONFIG.ENV && CONFIG.ENV.name) || 'development'));
    return global.App;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);