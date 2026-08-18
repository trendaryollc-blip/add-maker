/* ============================================================
   OMNI — mobile-menu.js
   Shared hamburger menu toggle for all pages.
   Nav is now a sibling of .topbar, not a child.
   ============================================================ */
(function () {
  'use strict';

  function initMobileMenu() {
    var burger = document.querySelector('.burger');
    var nav = document.querySelector('.nav');
    var overlay = document.querySelector('.nav-overlay');
    var body = document.body;

    if (!burger || !nav) return;

    function openMenu() {
      burger.classList.add('active');
      nav.classList.add('open');
      if (overlay) overlay.classList.add('open');
      body.style.overflow = 'hidden';
      body.style.position = 'fixed';
      body.style.top = '-' + window.scrollY + 'px';
      body.style.width = '100%';
    }

    function closeMenu() {
      burger.classList.remove('active');
      nav.classList.remove('open');
      if (overlay) overlay.classList.remove('open');
      var scrollY = body.style.top ? -parseInt(body.style.top, 10) : 0;
      body.style.overflow = '';
      body.style.position = '';
      body.style.top = '';
      body.style.width = '';
      window.scrollTo(0, scrollY);
    }

    burger.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (nav.classList.contains('open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    if (overlay) {
      overlay.addEventListener('click', closeMenu);
    }

    // Close on nav link click
    var navLinks = nav.querySelectorAll('a');
    for (var i = 0; i < navLinks.length; i++) {
      navLinks[i].addEventListener('click', closeMenu);
    }

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        closeMenu();
      }
    });

    // Close on resize to desktop
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (window.innerWidth > 768) {
          closeMenu();
        }
      }, 100);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileMenu);
  } else {
    initMobileMenu();
  }
})();
