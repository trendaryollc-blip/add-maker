/* ============================================================
   OMNI — pages/ghost-users.js
   Hive-mind Ghost Users controller: runs a simulation and
   renders score, predicted metrics, emotional journey and the
   persona reaction grid.
   ============================================================= */
(function (global) {
  'use strict';

  function init() {
    const GH = global.GhostUsers;
    const btn = document.getElementById('sim-btn');
    if (!GH || !btn) return;

    btn.addEventListener('click', () => {
      const loading = document.getElementById('sim-loading');
      loading.classList.remove('hidden');
      btn.disabled = true;

      GH.simulateReactions({
        ghostCount: parseInt(document.getElementById('ghost-count').value, 10),
        duration: parseInt(document.getElementById('ad-duration').value, 10)
      }).then((result) => {
        render(result);
        loading.classList.add('hidden');
        btn.disabled = false;
        if (global.App && global.App.toast) {
          global.App.toast(`Simulation complete — ${result.positive_ratio}% engagement.`, 'success');
        }
      });
    });
  }

  function render(r) {
    const GH = window.GhostUsers;
    show('score-card', 'predict-card', 'journey-card', 'segments-card', 'ghost-grid-card');

    const m = r.predicted_metrics;
    setText('overall-score', r.overall_score);
    setStyle('score-bar', 'width', r.overall_score + '%');
    setText('seg-best', r.best_segment);
    setText('best-seg', r.best_segment);
    setText('worst-seg', r.worst_segment);
    setText('dropoff', `⏱ Optimal drop-off point: ~${r.drop_off_point}s — keep the CTA before this point.`);
    setText('journey-rec', GH && GH.analyzeEmotionalJourney
      ? GH.analyzeEmotionalJourney().recommendation : '');

    setHTML('predict-list',
      `<div class="flex justify-between"><span class="text-sm text-muted">CTR</span><b class="text-accent mono">${m.ctr}%</b></div>` +
      `<div class="flex justify-between"><span class="text-sm text-muted">CPC</span><b class="text-accent mono">$${m.cpc}</b></div>` +
      `<div class="flex justify-between"><span class="text-sm text-muted">Conversion</span><b class="text-success mono">${m.conversionRate}%</b></div>` +
      `<div class="flex justify-between"><span class="text-sm text-muted">ROAS</span><b class="text-success mono">${m.roas}x</b></div>`);

    // Emotional journey bars
    const jb = document.getElementById('journey-bars');
    jb.innerHTML = '';
    r.emotional_journey.slice(0, 14).forEach((p) => {
      const d = document.createElement('div');
      d.style.height = Math.max(8, p.intensity * 100) + '%';
      d.title = `${p.second}s · ${p.emotion} (${p.intensity})`;
      jb.appendChild(d);
    });

    // Avatar reaction grid (cap render for performance)
    const grid = document.getElementById('ghost-grid');
    grid.innerHTML = '';
    r.reactions.slice(0, 120).forEach((x) => {
      const g = document.createElement('div');
      g.className = 'ghost ' + (x.reaction === 'liked' ? 'like' : 'skip');
      g.textContent = x.reaction === 'liked' ? '👍' : '👎';
      g.title = x.segment;
      grid.appendChild(g);
    });
    setText('grid-count', `(${r.reactions.length} simulated)`);
  }

  /* Small DOM helpers (kept local to the controller) */
  function show(...ids) { ids.forEach((id) => setClass(id, 'hidden', false)); }
  function setClass(id, cls, on) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle(cls, on);
  }
  function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  }
  function setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }
  function setStyle(id, prop, val) {
    const el = document.getElementById(id);
    if (el) el.style[prop] = val;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);