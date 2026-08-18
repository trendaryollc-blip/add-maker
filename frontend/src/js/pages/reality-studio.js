/* ============================================================
   OMNI — pages/reality-studio.js
   4D Reality Studio controller: initializes the 3D/canvas scene,
   handles environment changes, animation toggle, voiceover
   generation and per-platform export.
   ============================================================= */
(function (global) {
  'use strict';

  function init() {
    const RS = global.RealityStudio;
    const preview = document.getElementById('studio-preview');
    if (!RS || !preview) return;

    RS.initThreeJS(preview);

    const envSelect = document.getElementById('env-select');
    if (envSelect) {
      envSelect.addEventListener('change', (e) => {
        RS.generateEnvironment(e.target.value);
        preview.classList.add('animate-gradient-shift');
      });
    }

    const rotBtn = document.getElementById('toggle-rotate');
    if (rotBtn) {
      rotBtn.addEventListener('click', () => {
        const on = RS.animateProduct();
        rotBtn.textContent = on ? '⏸ Pause rotation' : '▶ Resume rotation';
      });
    }

    const voiceBtn = document.getElementById('voice-btn');
    if (voiceBtn) {
      voiceBtn.addEventListener('click', () => {
        const text = document.getElementById('voice-text').value;
        const style = document.getElementById('voice-style').value;
        RS.generateVoiceover(text, style).then((v) => {
          const card = document.getElementById('voice-result');
          card.classList.remove('hidden');
          setText('voice-detail',
            `Voice: ${v.voice} · Style: ${v.style} · ~${v.duration}s — "${v.text}"`);
          if (global.App && global.App.toast) global.App.toast('Voiceover generated.', 'success');
        });
      });
    }

    document.querySelectorAll('[data-format]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const format = btn.getAttribute('data-format');
        btn.disabled = true;
        btn.innerHTML = '<span class="text-sm">Rendering…</span>';
        RS.exportAd(format).then((f) => {
          btn.disabled = false;
          const title = format === 'gif' ? 'Display GIF' : format;
          btn.innerHTML =
            `<div><div class="text-lg mb-2">✅</div><b>${title}</b>` +
            `<p class="text-xs text-muted mt-1">${f.filename}</p></div>`;
          if (global.App && global.App.toast) {
            global.App.toast(`Exported: ${f.filename} (${f.spec})`, 'success');
          }
        });
      });
    });
  }

  function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);