(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {

    /* Platform clicks → fill input */
    document.querySelectorAll('.clickable-item[data-url]').forEach(function (item) {
      item.addEventListener('click', function () {
        var url = this.getAttribute('data-url');
        var input = document.getElementById('scan-url');
        if (input) { input.value = url; input.focus(); }
        document.querySelectorAll('.clickable-item[data-url]').forEach(function (el) {
          el.style.background = '';
        });
        this.style.background = 'rgba(var(--accent-rgb), 0.18)';
      });
    });

    /* Capability clicks → show info banner */
    document.querySelectorAll('.clickable-item[data-info]').forEach(function (item) {
      item.addEventListener('click', function () {
        var info = this.getAttribute('data-info');
        var banner = document.getElementById('info-banner');
        var text = document.getElementById('info-text');
        if (banner && text) {
          text.textContent = info;
          banner.classList.remove('hidden');
          banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        document.querySelectorAll('.clickable-item[data-info]').forEach(function (el) {
          el.style.background = '';
        });
        this.style.background = 'rgba(var(--accent-2-rgb), 0.15)';
      });
    });

    /* Step clicks → highlight active step */
    document.querySelectorAll('.step-item').forEach(function (step) {
      step.addEventListener('click', function () {
        document.querySelectorAll('.step-item').forEach(function (s) {
          s.classList.remove('active');
        });
        this.classList.add('active');
      });
    });
  });
})();
