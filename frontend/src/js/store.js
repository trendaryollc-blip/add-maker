/* ============================================================
   OMNI — store.js
   Minimal reactive state container (listenable store + localStorage
   persistence for a subset of keys). Used by app.js and modules.
   ============================================================= */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'omni-state';
  var PERSIST = ['user', 'theme', 'campaigns', 'cart', 'settings'];

  var state = {};
  var listeners = {};

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function loadPersisted() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) state = Object.assign(state, JSON.parse(raw));
    } catch (e) { state = {}; }
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms || 200);
    };
  }
  var persist = debounce(function () {
    try {
      var slim = {};
      PERSIST.forEach(function (k) { if (state[k] !== undefined) slim[k] = state[k]; });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
    } catch (e) {}
  });

  loadPersisted();

  var Store = {
    /* get(key) -> deep-cloned value (safe to mutate copies) */
    get: function (key) { return state[key] === undefined ? undefined : clone(state[key]); },
    getRaw: function (key) { return state[key]; },

    /* set(key, value) -> merge top level, notify */
    set: function (key, value) {
      state[key] = clone(value);
      persist();
      this.emit(key, value);
      this.emit('*', key, value);
      return value;
    },

    /* update(key, patch) -> shallow merge into existing object */
    update: function (key, patch) {
      var cur = state[key] || {};
      return this.set(key, Object.assign({}, cur, patch));
    },

    /* remove(key) */
    remove: function (key) {
      delete state[key];
      persist();
      this.emit(key);
      return true;
    },

    /* ---------- pub / sub ---------- */
    on: function (key, fn) {
      if (!listeners[key]) listeners[key] = [];
      listeners[key].push(fn);
      return function off() {
        listeners[key] = listeners[key].filter(function (f) { return f !== fn; });
      };
    },
    emit: function (key) {
      var args = Array.prototype.slice.call(arguments, 1);
      (listeners[key] || []).slice().forEach(function (fn) { fn.apply(null, args); });
    },

    /* convenience initial state reset (not persisted) */
    hydrate: function (obj) { state = Object.assign({}, obj); },

    dump: function () { return clone(state); }
  };

  global.OMNI_STORE = Store;
})(window);