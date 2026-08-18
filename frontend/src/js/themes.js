/* ============================================================
   OMNI — themes.js
   Theme toggle runtime. Mirrors themes.css variables.
   - Applies stored preference (localStorage 'omni-theme')
   - Falls back to prefers-color-scheme when nothing is stored
   - Exposes window.OmniTheme.toggle() for [data-theme-toggle]
   Load BEFORE footer scripts so theme applies before paint.
   ============================================================= */
(function (global) {
  'use strict';
  var KEY = 'omni-theme';
  var root = global.document.documentElement;

  function current() {
    return (root.getAttribute('class') || '').indexOf('theme-light') !== -1 ? 'light' : 'dark';
  }
  function apply(theme) {
    root.classList.remove('theme-light', 'theme-dark');
    if (theme === 'light') root.classList.add('theme-light');
    else root.classList.add('theme-dark');
    try { localStorage.setItem(KEY, theme); } catch (e) {}
  }
  function system() {
    return global.matchMedia && global.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light' : 'dark';
  }
  function init() {
    var stored = null;
    try { stored = localStorage.getItem(KEY); } catch (e) {}
    apply(stored || system());
  }

  // Apply as early as possible (before first paint)
  init();

  global.OmniTheme = {
    current: current,
    apply: apply,
    toggle: function () { apply(current() === 'dark' ? 'light' : 'dark'); },
    init: init
  };

  // Live system-preference switching only when user hasn't chosen manually
  if (global.matchMedia) {
    var mq = global.matchMedia('(prefers-color-scheme: light)');
    var listener = function () {
      var stored = null;
      try { stored = localStorage.getItem(KEY); } catch (e) {}
      if (!stored) apply(system());
    };
    if (mq.addEventListener) mq.addEventListener('change', listener);
    else if (mq.addListener) mq.addListener(listener);
  }
})(window);