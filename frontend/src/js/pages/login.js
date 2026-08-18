/* ============================================================
   OMNI — pages/login.js — authentication controller.
   Handles the login form: validates, authenticates the demo
   session via App.session and navigates to the dashboard.
   ============================================================= */
(function (global) {
  'use strict';

  function init() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const btn = document.getElementById('login-btn');
      const emailEl = document.getElementById('email');
      if (!emailEl || !emailEl.value) {
        alert('Please enter your email');
        return;
      }

      const email = emailEl.value;
      const name = (email.split('@')[0] || 'Operator')
        .replace(/[^a-zA-Z0-9 ]/g, ' ').trim() || 'Operator';

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Authenticating…';

      setTimeout(() => {
        const App = global.App;
        if (App && App.session) App.session.login({ name, email, tier: 'pro' });
        if (App && App.toast) App.toast(`Welcome, ${name}!`, 'success');
        if (global.OMNI_ROUTER) global.OMNI_ROUTER.navigate('/');
        else global.location.href = 'index.html';
      }, 900);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);