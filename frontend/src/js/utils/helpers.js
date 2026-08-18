/* ============================================================
   OMNI — utils/helpers.js
   Shared utilities used across modules and UI wiring.
   ============================================================= */
(function (global) {
  'use strict';

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function randFloat(min, max) { return Math.random() * (max - min) + min; }
  function pick(arr) { return arr[rand(0, arr.length - 1)]; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function round(v, d) { var p = Math.pow(10, d || 0); return Math.round(v * p) / p; }

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + rand(1000, 9999).toString(36);
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms || 200);
    };
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else if (k in node) node[k] = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function toCamel(str) { return str.replace(/[-_ ](\w)/g, function (_, c) { return c.toUpperCase(); }); }

  function waveText(node) {
    var text = node.textContent;
    node.textContent = '';
    node.classList.add('wave-text');
    Array.prototype.forEach.call(text, function (ch, i) {
      var s = document.createElement('span');
      s.innerHTML = ch === ' ' ? '&nbsp;' : ch;
      s.style.setProperty('--w-delay', (i * 0.04) + 's');
      node.appendChild(s);
    });
  }

  function typewriter(node, text, speed, cb) {
    var i = 0;
    node.textContent = '';
    node.classList.add('typewriter');
    (function step() {
      if (i <= text.length) {
        node.textContent = text.slice(0, i++);
        setTimeout(step, speed || 45);
      } else if (cb) { cb(); }
    })();
  }

  var Utils = {
    rand: rand, randFloat: randFloat, pick: pick, clamp: clamp,
    round: round, uid: uid, debounce: debounce, el: el,
    escape: escapeHtml, toCamel: toCamel, waveText: waveText, typewriter: typewriter
  };

  global.OMNI_UTILS = Utils;
})(window);