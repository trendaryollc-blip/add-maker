/* ============================================================
   OMNI — settings.js
   Settings modal for multi-provider API key management.
   Injects the modal + gear icon into every page automatically.
   ============================================================ */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'omni_api_keys';
  var PROVIDER_KEY = 'omni_preferred_provider';

  /* ---------- Provider definitions ---------- */
  var PROVIDERS = [
    { id: 'openai',    name: 'OpenAI',       placeholder: 'sk-...',           link: 'https://platform.openai.com/api-keys',                        models: 'GPT-4o, GPT-4o-mini' },
    { id: 'anthropic', name: 'Anthropic',     placeholder: 'sk-ant-...',       link: 'https://console.anthropic.com/settings/keys',                  models: 'Claude 4 Sonnet, Claude 3.5 Haiku' },
    { id: 'gemini',    name: 'Google Gemini', placeholder: 'AIza...',           link: 'https://aistudio.google.com/apikey',                           models: 'Gemini 2.5 Flash, Gemini 2.0 Pro' },
    { id: 'mistral',   name: 'Mistral AI',    placeholder: '',                  link: 'https://console.mistral.ai/api-keys/',                         models: 'Mistral Large, Codestral' },
    { id: 'groq',      name: 'Groq',          placeholder: 'gsk_...',           link: 'https://console.groq.com/keys',                                models: 'Llama 3.3 70B, Mixtral 8x7B' }
  ];

  /* ---------- Build modal HTML ---------- */
  function buildModal() {
    var keyFields = PROVIDERS.map(function (p) {
      return '' +
        '<div class="settings-key-row">' +
        '  <div class="settings-key-info">' +
        '    <label class="form-label" for="key-' + p.id + '">' + p.name + '</label>' +
        '    <span class="text-xs text-muted">' + p.models + '</span>' +
        '  </div>' +
        '  <div class="settings-key-input">' +
        '    <input class="form-control" id="key-' + p.id + '" type="password" placeholder="' + p.placeholder + '" autocomplete="off">' +
        '    <a href="' + p.link + '" target="_blank" rel="noopener" class="settings-key-link" title="Get key">↗</a>' +
        '  </div>' +
        '</div>';
    }).join('\n');

    return '' +
      '<div class="modal-overlay" id="settings-modal">' +
      '  <div class="modal" style="max-width:560px">' +
      '    <div class="modal-header">' +
      '      <span class="card-title"><span class="icon">⚙</span> API Keys</span>' +
      '      <button class="modal-close" data-close-modal>×</button>' +
      '    </div>' +
      '    <p class="text-sm text-muted mb-3">Add <b>any one</b> key — you don\'t need all of them. Keys stay in your browser only.</p>' +
      '    <p class="text-xs text-muted mb-4" style="padding:0.5rem 0.75rem;background:rgba(var(--warning-rgb),0.1);border:1px solid rgba(var(--warning-rgb),0.3);border-radius:8px;">⚠ <b>Not for production use.</b> Keys are stored in localStorage and visible to browser extensions.</p>' +
      '',
      '    <!-- Preferred provider -->',
      '    <div class="form-group mb-4">' +
      '      <label class="form-label" for="preferred-provider">Preferred provider</label>' +
      '      <select class="form-control" id="preferred-provider">' +
      PROVIDERS.map(function (p) {
        return '        <option value="' + p.id + '">' + p.name + '</option>';
      }).join('\n') +
      '      </select>' +
      '      <p class="form-hint">Which provider to use when multiple keys are saved.</p>' +
      '    </div>',
      '',
      '    <!-- Key fields -->',
      '    <div class="settings-keys-list mb-4">' + keyFields + '</div>',
      '',
      '    <!-- Status -->',
      '    <div class="flex gap-3 items-center mb-4" id="api-status">' +
      '      <span class="badge" id="key-status-badge">No keys saved</span>' +
      '    </div>',
      '',
      '    <!-- Actions -->',
      '    <div class="flex gap-3">' +
      '      <button class="btn btn-primary flex-1" id="save-keys-btn">💾 Save keys</button>' +
      '      <button class="btn btn-outline-danger" id="clear-keys-btn">Clear all</button>' +
      '    </div>' +
      '  </div>' +
      '</div>';
  }

  /* ---------- Load / Save ---------- */
  function getKeys() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveKeys(keys) { localStorage.setItem(STORAGE_KEY, JSON.stringify(keys)); }
  function clearKeys() { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(PROVIDER_KEY); }

  function getPreferred() {
    return localStorage.getItem(PROVIDER_KEY) || 'openai';
  }
  function setPreferred(id) {
    localStorage.setItem(PROVIDER_KEY, id);
  }

  /* ---------- Get the best available key ---------- */
  function getActiveKey() {
    var keys = getKeys();
    var preferred = getPreferred();
    // Try preferred first
    if (keys[preferred]) return { provider: preferred, key: keys[preferred] };
    // Fallback to any available
    for (var i = 0; i < PROVIDERS.length; i++) {
      if (keys[PROVIDERS[i].id]) return { provider: PROVIDERS[i].id, key: keys[PROVIDERS[i].id] };
    }
    return null;
  }

  /* ---------- Update status badge ---------- */
  function updateStatus() {
    var keys = getKeys();
    var badge = document.getElementById('key-status-badge');
    if (!badge) return;
    var count = PROVIDERS.filter(function (p) { return !!keys[p.id]; }).length;
    if (count === 0) {
      badge.className = 'badge';
      badge.textContent = 'No keys saved';
    } else {
      badge.className = 'badge badge-success';
      badge.textContent = count + ' key' + (count > 1 ? 's' : '') + ' saved';
    }
  }

  /* ---------- Inject modal + gear ---------- */
  function inject() {
    if (!document.getElementById('settings-modal')) {
      var temp = document.createElement('div');
      temp.innerHTML = buildModal();
      document.body.appendChild(temp.firstChild);
    }
    var topbars = document.querySelectorAll('header.topbar .actions');
    for (var i = 0; i < topbars.length; i++) {
      if (!topbars[i].querySelector('#open-settings')) {
        var gear = document.createElement('button');
        gear.className = 'settings-btn';
        gear.id = 'open-settings';
        gear.setAttribute('aria-label', 'Settings');
        gear.setAttribute('title', 'API Keys & Settings');
        gear.textContent = '⚙';
        var burger = topbars[i].querySelector('.burger');
        if (burger) topbars[i].insertBefore(gear, burger);
        else topbars[i].appendChild(gear);
      }
    }
  }

  /* ---------- Open modal & populate fields ---------- */
  function openModal() {
    var modal = document.getElementById('settings-modal');
    if (!modal) return;
    modal.classList.add('open');
    var keys = getKeys();
    PROVIDERS.forEach(function (p) {
      var input = document.getElementById('key-' + p.id);
      if (input && keys[p.id]) input.value = keys[p.id];
    });
    var sel = document.getElementById('preferred-provider');
    if (sel) sel.value = getPreferred();
    updateStatus();
  }

  /* ---------- Save from modal ---------- */
  function saveFromModal() {
    var keys = {};
    PROVIDERS.forEach(function (p) {
      var input = document.getElementById('key-' + p.id);
      if (input && input.value.trim()) keys[p.id] = input.value.trim();
    });
    saveKeys(keys);
    var sel = document.getElementById('preferred-provider');
    if (sel) setPreferred(sel.value);
    updateStatus();
    if (global.App && global.App.toast) global.App.toast('API keys saved.', 'success');
  }

  /* ---------- Clear from modal ---------- */
  function clearFromModal() {
    clearKeys();
    PROVIDERS.forEach(function (p) {
      var input = document.getElementById('key-' + p.id);
      if (input) input.value = '';
    });
    var sel = document.getElementById('preferred-provider');
    if (sel) sel.value = 'openai';
    updateStatus();
    if (global.App && global.App.toast) global.App.toast('All API keys cleared.', 'info');
  }

  /* ---------- Events ---------- */
  function bindEvents() {
    document.addEventListener('click', function (e) {
      if (e.target.id === 'open-settings' || e.target.closest('#open-settings')) openModal();
      if (e.target.id === 'save-keys-btn') saveFromModal();
      if (e.target.id === 'clear-keys-btn') clearFromModal();
    });
  }

  /* ---------- Public API ---------- */
  global.OMNI_SETTINGS = {
    getKeys: getKeys,
    saveKeys: saveKeys,
    clearKeys: clearKeys,
    getPreferred: getPreferred,
    getActiveKey: getActiveKey,
    getOpenAIKey: function () { return (getKeys() || {}).openai || ''; },
    hasOpenAIKey: function () { return !!getKeys().openai; },
    hasAnyKey: function () { return !!getActiveKey(); },
    PROVIDERS: PROVIDERS
  };

  /* ---------- Boot ---------- */
  function init() { inject(); bindEvents(); updateStatus(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
