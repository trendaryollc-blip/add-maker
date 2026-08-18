(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {

    /* Steps and persona clicks → show info banner */
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
        document.querySelectorAll('.clickable-item').forEach(function (el) {
          el.style.background = '';
        });
        this.style.background = 'rgba(var(--accent-rgb), 0.15)';
      });
    });

    /* Persona cards → highlight and show info */
    document.querySelectorAll('[data-info].card').forEach(function (card) {
      card.addEventListener('mouseenter', function () {
        this.style.borderColor = 'var(--accent)';
        this.style.boxShadow = '0 0 12px rgba(var(--accent-rgb), 0.3)';
      });
      card.addEventListener('mouseleave', function () {
        this.style.borderColor = '';
        this.style.boxShadow = '';
      });
    });
  });
})();
