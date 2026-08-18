/* ============================================================
   OMNI — pages/analytics.js
   Analytics Cockpit controller: renders the weekly revenue bars,
   the performance heatmap, the platform ROAS table and optimal
   posting times (via PlatformAlchemy).
   ============================================================= */
(function (global) {
  'use strict';

  const REVENUE = [320, 410, 650, 520, 780, 690, 540];

  function init() {
    const PA = global.PlatformAlchemy;
    const U = global.OMNI_UTILS;
    if (!PA || !U) return;

    renderWeeklyBars();
    renderHeatmap(U);
    renderPlatforms(PA, U);
    renderPostingTimes(PA);
  }

  function renderWeeklyBars() {
    const chart = document.getElementById('weekly-chart');
    if (!chart) return;
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    chart.innerHTML = '';
    days.forEach((d, i) => {
      const col = document.createElement('div');
      col.className = 'col';

      const bar = document.createElement('div');
      bar.className = 'bar';
      bar.style.height = '0%';

      const lbl = document.createElement('span');
      lbl.className = 'lbl';
      lbl.textContent = d;

      col.appendChild(bar);
      col.appendChild(lbl);
      chart.appendChild(col);

      // Animate bar into place
      setTimeout(() => { bar.style.height = (REVENUE[i] / 800) * 100 + '%'; }, 150 + i * 80);
    });
  }

  function renderHeatmap(U) {
    const heat = document.getElementById('heatmap');
    if (!heat) return;
    heat.innerHTML = '';
    ['h', 'm', 'm', 'l', 'h', 'h', 'm'].forEach((grade) => {
      const cell = document.createElement('div');
      cell.className = 'cell ' + grade;
      cell.textContent = U.rand(40, 98) + '%';
      heat.appendChild(cell);
    });
  }

  function renderPlatforms(PA, U) {
    const body = document.getElementById('platform-body');
    if (!body) return;
    body.innerHTML = '';
    Object.keys(PA.PLATFORMS).forEach((key) => {
      if (key === 'instaFeed' || key === 'amazon') return;
      const p = PA.PLATFORMS[key];
      const tr = document.createElement('tr');
      tr.innerHTML = `<td data-label="Platform" class="td-accent">${p.label}</td><td data-label="ROAS" class="mono">${U.round(1.2 + Math.random() * 2.6, 2)}x</td>`;
      body.appendChild(tr);
    });
  }

  function renderPostingTimes(PA) {
    const list = document.getElementById('posting-list');
    if (!list) return;
    list.innerHTML = '';
    ['tiktok', 'instagram', 'facebook', 'google'].forEach((platform) => {
      const o = PA.optimizePostingTime(platform); // 'google' gracefully falls back
      const label = platform.charAt(0).toUpperCase() + platform.slice(1);
      const div = document.createElement('div');
      div.className = 'flex justify-between items-center';
      div.innerHTML = `<span class="text-sm">${label}</span>` +
        `<span class="badge badge-accent mono">${o.times.start}–${o.times.end}</span>`;
      list.appendChild(div);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);