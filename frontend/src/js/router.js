/* ============================================================
   OMNI — router.js
   Hash-based SPA router.
   - Routes live in the URL hash:  #/neural-scan
   - navigate(path) loads target content into the page (via a
     #app container when present) or navigates to the HTML file.
   - Supports back/forward via the History API + hashchange.
   - Highlights the active nav link on every page.
   - Gracefully degrades under file:// (falls back to full loads).
   ============================================================= */
(function (global) {
  'use strict';

  /* ---------- Route table ----------
     key  : route path (after '#/')
     value: { page: 'file.html', title: 'Page title',
              section: '#someId' (optional in-page anchor) }   */
  var routes = {};
  var listeners = {};

  var DEFAULT_ROUTE = '/';
  var current = null;

  function currentPageName() {
    var p = global.location.pathname.split('/').pop();
    return p || 'index.html';
  }

  /* Normalize a path to look like '/name' (no trailing slash) */
  function normalize(path) {
    if (!path) path = DEFAULT_ROUTE;
    if (path[0] !== '/') path = '/' + path;
    path = path.replace(/\/+$/, '') || '/';
    return path;
  }

  function pathToFile(path) {
    path = normalize(path);
    var r = routes[path];
    if (r && r.page) return r.page;
    // infer from basename
    var name = path.replace(/^\//, '');
    return name ? name + '.html' : 'index.html';
  }

  function pageFromLocation() {
    var hash = global.location.hash || '';
    var raw = hash.replace(/^#\/?/, '');      // strip '#/' prefix
    var section = null;
    if (raw.indexOf('&') !== -1) {
      var parts = raw.split('&');
      raw = parts[0];
      section = parts.slice(1).find(function (p) { return p.indexOf('=') === 0; });
      if (section) section = section.slice(1);
    }
    return { path: normalize(raw || DEFAULT_ROUTE), section: section };
  }

  /* ---------- Dynamic content loading ---------- */
  function loadIntoContainer(file, containerSel, path) {
    return new Promise(function (resolve, reject) {
      if (typeof fetch !== 'function') return reject(new Error('no fetch'));
      fetch(file)
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.text();
        })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var container = document.querySelector(containerSel);
          if (!container) return reject(new Error('no container'));
          // Replace only the app region: everything after the css link block
          // Simplest robust approach: inject body content + scripts.
          container.innerHTML = doc.body.innerHTML;
          // re-run app-level init so dynamic pages bind their logic
          emit('content:loaded', path, doc);
          resolve(doc);
        })
        .catch(reject);
    });
  }

    /* ---------- Public API ---------- */
  var Router = {
    routes: routes,

    register: function (map) {
      Object.keys(map).forEach(function (k) {
        routes[normalize(k)] = map[k];
      });
      return this;
    },

    current: function () { return current || pageFromLocation(); },

    getFileName: function (path) { return pathToFile(path); },

    /* programmatic navigation — the heart of the router */
    navigate: function (path, opts) {
      opts = opts || {};
      path = normalize(path);
      var file = pathToFile(path);
      var samePage = file === currentPageName() || opts.force;

      // Update the hash (triggers hashchange -> handle())
      var targetHash = '#/' + path.replace(/^\//, '');
      if (global.location.hash === targetHash) { this.handle(); return this; }
      global.location.hash = targetHash;

      if (!samePage && !opts.force) {
        // Cross-page: attempt SPA-injection if a #app shell exists,
        // otherwise fall back to a real navigation.
        if (document.querySelector('#app') && typeof fetch === 'function') {
          loadIntoContainer(file, '#app', path)
            .catch(function () { global.location.assign(file + targetHash); });
        } else {
          global.location.assign(file + targetHash);
        }
      }
      return this;
    },

    /* evaluate the current hash and render/highlight */
    handle: function () {
      var loc = pageFromLocation();
      current = loc;
      var file = pathToFile(loc.path);
      if (routes[loc.path] && routes[loc.path].title) {
        document.title = routes[loc.path].title;
      }
      highlightActive(loc.path);
      emit('route', loc);
      emit('route:' + loc.path, loc);

      if (typeof global.App !== 'undefined' && global.App.onRoute) {
        global.App.onRoute(loc);
      }

      if (loc.section) {
        var el = document.querySelector(loc.section);
        var wait = global.setTimeout || setTimeout;
        wait(function () { if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 120);
      }
      return loc;
    },

    back: function () { if (global.history.length > 1) global.history.back(); else this.navigate('/'); },

    on: function (name, fn) {
      if (!listeners[name]) listeners[name] = [];
      listeners[name].push(fn);
    },

    start: function () {
      if (global.location.hash === '' || global.location.hash === '#') {
        global.history.replaceState(null, '', '#/' + currentPageName().replace('.html', ''));
      }
      this.handle();

      global.addEventListener('hashchange', function () { Router.handle(); });
      global.addEventListener('popstate', function () { Router.handle(); });
      // Delegated click handling for [data-route] links
      document.addEventListener('click', function (e) {
        var link = e.target.closest('[data-route]');
        if (link) {
          e.preventDefault();
          Router.navigate(link.getAttribute('data-route'));
        }
        var themeBtn = e.target.closest('[data-theme-toggle]');
        if (themeBtn) {
          e.preventDefault();
          global.OmniTheme && global.OmniTheme.toggle();
        }
      });
      return this;
    }
  };

  function highlightActive(path) {
    var name = path.replace(/\//g, '');
    var fileNow = pathToFile(path);
    document.querySelectorAll('.nav a[data-page], [data-page]').forEach(function (a) {
      var target = a.getAttribute('data-page') ||
        (a.getAttribute('href') || '').replace(/\.html$/, '').replace(/^.*\//, '');
      var isActive = target === name || (fileNow.indexOf(target) !== -1 && target);
      a.classList.toggle('active', isActive);
    });
    // also match generic nav links by href basename
    document.querySelectorAll('.nav a[href]').forEach(function (a) {
      var h = (a.getAttribute('href') || '').split('#')[0].replace(/\.html$/, '');
      if (h && fileNow.indexOf(h) !== -1) a.classList.add('active');
    });
  }

  function emit(name) {
    var args = Array.prototype.slice.call(arguments, 1);
    (listeners[name] || []).slice().forEach(function (fn) { fn.apply(null, args); });
  }

  global.OMNI_ROUTER = Router;
})(window);