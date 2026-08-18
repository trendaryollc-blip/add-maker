/* ============================================================
   OMNI — pages/autopilot.js
   Live Autopilot Engine controller: live campaign polling,
   master switch, budget reallocation, variant generation and
   report rendering.
   ============================================================= */
(function (global) {
  'use strict';

  let monitor = null;

  function init() {
    const LA = global.LiveAutopilot;
    const U = global.OMNI_UTILS;
    if (!LA || !U) return;

    pump(LA, U);
    bindMaster(LA, U);

    bind('realloc-btn', LA, 'realloc');
    bind('variant-btn', LA, 'variant');
    bind('report-btn', LA, 'report');
  }

  function pump(LA, U) {
    // (re)start the live polling loop
    if (monitor) monitor.stop();
    monitor = LA.monitorCampaigns().start((list, ts) => {
      renderCampaigns(list, U);
      setText('last-updated', new Date(ts).toLocaleTimeString());
    });
  }

  function renderCampaigns(list, U) {
    const body = document.getElementById('campaign-body');
    if (!body) return;
    body.innerHTML = '';

    list.forEach((c) => {
      const tr = document.createElement('tr');
      tr.innerHTML =
        `<td data-label="Campaign" class="td-accent">${c.name}</td>` +
        `<td data-label="Platform">${c.platform}</td>` +
        `<td data-label="Budget" class="mono">$${c.budget}</td>` +
        `<td data-label="Spent" class="mono">$${c.spent}</td>` +
        `<td data-label="CTR" class="mono">${c.ctr}%</td>` +
        `<td data-label="ROAS" class="mono">${c.roas}x</td>` +
        `<td data-label="Status"><span class="status-dot ${c.status}"></span>${c.status}</td>`;
      body.appendChild(tr);
    });

    const spend = list.reduce((a, c) => a + c.spent, 0);
    const revenue = list.reduce((a, c) => a + c.spent * c.roas, 0);
    setText('m-spend', '$' + Math.round(spend));
    setText('m-rev', '$' + Math.round(revenue));
    setText('m-roas', U.round(revenue / (spend || 1), 2) + 'x');
    setText('m-ads', list.length);
  }

  function bindMaster(LA, U) {
    const master = document.getElementById('autopilot-master');
    if (!master) return;
    master.addEventListener('change', (e) => {
      if (monitor) monitor.stop();
      if (e.target.checked) {
        setText('auto-status', 'Running — monitoring live');
        pump(LA, U);
      } else {
        setText('auto-status', 'Paused');
      }
    });
  }

  function bind(id, LA, action) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', () => {
      if (action === 'reallocate') {
        const res = LA.reallocateBudget();
        setText('realloc-result',
          `Moved $${res.totalReclaimed} → ${res.moves[0].to} (${res.moves.length} transfers)`);
        toast('Budget reallocated.', 'success');
      } else if (action === 'variant') {
        const v = LA.generateNewVariant({ filename: 'master-v1', productName: 'your product' });
        setText('variant-result', `Hook: "${v.hook}" · score ${v.guessScore}/100`);
      } else if (action === 'report') {
        renderReport(LA.generateReport());
      }
    });
  }

  function renderReport(rep) {
    const s = rep.summary;
    setText('report-body',
      `OMNI AUTOPILOT REPORT — ${rep.period}\n` +
      '------------------------------------\n' +
      `Total spend  : $${s.totalSpend}\n` +
      `Total revenue: $${s.totalRevenue}\n` +
      `ROAS         : ${s.roas}x\n` +
      `Active ads   : ${s.activeAds}\n` +
      `Anomalies    : ${rep.anomalies.anomalies.length}\n` +
      '------------------------------------\nRecommendations:\n' +
      rep.recommendations.map((x) => ' - ' + x).join('\n'));
    setClass('report-card', 'hidden', false);
  }

  function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  }
  function setClass(id, cls, on) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle(cls, on);
  }
  function toast(msg, kind) {
    if (global.App && global.App.toast) global.App.toast(msg, kind);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);