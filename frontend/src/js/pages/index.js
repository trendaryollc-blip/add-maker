/* ============================================================
   OMNI — pages/index.js
   Mission-Control dashboard controller.
   - Renders the live metric snapshot from the shared store.
   - Adds the hero typewriter effect.
   Runs after app.js on DOM ready. Safe no-op if elements/modules
   are missing (guard against partial script loading).
   ============================================================= */
(function (global) {
  'use strict';

  function init() {
    renderDashboard();
    const U = global.OMNI_UTILS;
    if (U && U.typewriter) {
      const line = document.getElementById('type-line');
      if (line) U.typewriter(line, 'from product to profit in 60 seconds...', 40);
    }
  }

  /* Fill the Mission Control metric grid from OMNI_STORE.campaigns. */
  function renderDashboard() {
    const grid = document.getElementById('metric-grid');
    if (!grid) return;

    const Store = global.OMNI_STORE;
    const campaigns = (Store && Store.get('campaigns')) || [];
    if (!campaigns.length) return;

    const spend = campaigns.reduce((a, c) => a + c.spent, 0);
    const revenue = campaigns.reduce((a, c) => a + c.spent * c.roas, 0);
    const roas = spend > 0 ? revenue / spend : 0;

    const cards = [
      { label: 'Total spend', value: '$' + Math.round(spend), cls: '' },
      { label: 'Revenue', value: '$' + Math.round(revenue), cls: 'up' },
      { label: 'ROAS', value: roas.toFixed(2) + 'x', cls: 'up' },
      { label: 'Active ads', value: String(campaigns.length), cls: '' }
    ];

    grid.innerHTML = cards.map((c) =>
      `<div class="card metric"><div class="metric-label">${c.label}</div>` +
      `<div class="metric-value ${c.cls}">${c.value}</div></div>`
    ).join('');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);