/* ============================================================
   OMNI — pages/neural-scan.js
   Neural Product Scan controller: wires the input form to
   NeuralScan.scanProduct and renders the analysis results.
   ============================================================= */
(function (global) {
  'use strict';

  function init() {
    const NS = global.NeuralScan;
    const U = global.OMNI_UTILS;
    const btn = document.getElementById('scan-btn');
    if (!NS || !U || !btn) return;

    btn.addEventListener('click', () => {
      const urlEl = document.getElementById('scan-url');
      const url = (urlEl && urlEl.value) ? urlEl.value : 'https://demo.store/product';

      const card = document.getElementById('progress-card');
      const bar = document.getElementById('progress-bar');
      const pct = document.getElementById('progress-pct');
      const label = document.getElementById('progress-label');

      card.classList.remove('hidden');

      let elapsed = 0;
      const ticker = setInterval(() => {
        elapsed = Math.min(96, elapsed + U.rand(6, 14));
        bar.style.width = elapsed + '%';
        pct.textContent = elapsed + '%';
      }, 120);

      NS.scanProduct(url).then((result) => {
        clearInterval(ticker);
        bar.style.width = '100%';
        pct.textContent = '100%';
        label.textContent = 'Analysis complete';
        render(result);
      });
    });
  }

  function render(r) {
    const U = window.OMNI_UTILS;
    const P = r.product;

    setText('res-name', P.name);
    setText('res-url', P.url);
    setText('res-category', P.category);
    setText('res-price', P.priceRange);
    setText('res-rating', `★ ${P.rating} (${P.reviews} reviews)`);
    setText('res-confidence', 'Confidence 92%');

    // Emotional triggers
    const emo = document.getElementById('emotion-list');
    emo.innerHTML = '';
    r.emotional_profile.forEach((e) => {
      emo.appendChild(U.el('span', { class: 'hook-chip mb-2' }, [e]));
      emo.appendChild(document.createElement('br'));
    });

    // Audience
    setHTML('audience-list',
      `<b>${r.target_audience.age}</b> · ${r.target_audience.income}<br>` +
      `Interests: ${r.target_audience.interests.join(', ')}<br>` +
      `Pain: ${r.target_audience.pain_points.join(', ')}`);

    // Competitors table
    const body = document.getElementById('comp-body');
    body.innerHTML = '';
    r.competitors.forEach((c) => {
      const tr = U.el('tr', {}, []);
      tr.appendChild(U.el('td', { class: 'td-accent', 'data-label': 'Competitor' }, [c.name]));
      tr.appendChild(U.el('td', { 'data-label': 'Strength' }, [c.strength]));
      tr.appendChild(U.el('td', { class: 'text-danger', 'data-label': 'Weakness' }, [c.weakness]));
      tr.appendChild(U.el('td', { 'data-label': 'Price' }, [c.price]));
      tr.appendChild(U.el('td', { 'data-label': 'Ads seen' }, [c.adsSpotted]));
      body.appendChild(tr);
    });

    // Recommended hooks
    const hooks = document.getElementById('hook-list');
    hooks.innerHTML = '';
    r.recommended_hooks.forEach((hook, i) => {
      hooks.appendChild(U.el('div', { class: `hook-chip animate-slide-left delay-${i + 1}` }, [`${i + 1}. ${hook}`]));
    });

    // Reveal result blocks with a stagger
    document.querySelectorAll('#results-area [style*="display: none"], #results-area [style*="display:none"]').forEach((b, i) => {
      setTimeout(() => { b.style.display = ''; b.classList.add('show'); }, i * 90);
    });
    if (global.App && global.App.toast) global.App.toast('Neural scan complete.', 'info');
  }

  function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  }
  function setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);