/* ==========================================================================
   Ndalem AI Tech — shared behaviour
   - Mobile menu toggle
   - Scroll reveal (IntersectionObserver, reduced-motion aware)
   - Contact form: client-side validation + success feedback (FR-09, FR-10)
   ========================================================================== */
(function () {
  'use strict';

  /* ---- Dark mode toggle -------------------------------------------------- */
  // Initial class is set by an inline script in <head> to avoid flash.
  var themeToggles = document.querySelectorAll('[data-theme-toggle]');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function commitTheme(isDark) {
    try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch (e) {}
    themeToggles.forEach(function (b) { b.setAttribute('aria-pressed', String(isDark)); });
  }

  themeToggles.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var rect = btn.getBoundingClientRect();
      var cx = Math.round(rect.left + rect.width / 2);
      var cy = Math.round(rect.top + rect.height / 2);

      /* --- Modern path: View Transitions circular reveal --- */
      if (!reduceMotion && document.startViewTransition) {
        var vt = document.startViewTransition(function () {
          var isDark = document.documentElement.classList.toggle('dark');
          commitTheme(isDark);
        });
        vt.ready.then(function () {
          var maxR = Math.hypot(
            Math.max(cx, window.innerWidth - cx),
            Math.max(cy, window.innerHeight - cy)
          );
          document.documentElement.animate(
            { clipPath: ['circle(0px at ' + cx + 'px ' + cy + 'px)', 'circle(' + maxR + 'px at ' + cx + 'px ' + cy + 'px)'] },
            { duration: 480, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' }
          );
        });
        return;
      }

      /* --- Fallback: smooth colour transition via class --- */
      if (!reduceMotion) {
        document.documentElement.classList.add('theme-switching');
        setTimeout(function () { document.documentElement.classList.remove('theme-switching'); }, 500);
      }
      var isDark = document.documentElement.classList.toggle('dark');
      commitTheme(isDark);
    });
  });

  /* ---- Mobile menu (FR-02) ---------------------------------------------- */
  var toggle = document.getElementById('menu-toggle');
  var menu = document.getElementById('mobile-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      var openIcon = toggle.querySelector('[data-icon="open"]');
      var closeIcon = toggle.querySelector('[data-icon="close"]');
      if (openIcon && closeIcon) {
        openIcon.classList.toggle('hidden', open);
        closeIcon.classList.toggle('hidden', !open);
      }
    });
    // Close after choosing a destination
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---- Scroll reveal ----------------------------------------------------- */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealEls = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---- Footer year ------------------------------------------------------- */
  var yearEl = document.getElementById('year');
  if (yearEl) { yearEl.textContent = new Date().getFullYear(); }

  /* ---- Contact form ------------------------------------------------------ */
  var form = document.getElementById('inquiry-form');
  if (!form) return;

  var WA_NUMBER = '6282135222635';

  function showError(field, msg) {
    field.setAttribute('aria-invalid', 'true');
    var err = document.getElementById(field.id + '-error');
    if (err) { err.textContent = msg; err.classList.add('show'); }
  }
  function clearError(field) {
    field.removeAttribute('aria-invalid');
    var err = document.getElementById(field.id + '-error');
    if (err) { err.classList.remove('show'); }
  }

  form.querySelectorAll('.field').forEach(function (f) {
    f.addEventListener('input', function () { clearError(f); });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Honeypot anti-spam (FR-11)
    var hp = form.querySelector('[name="company_website"]');
    if (hp && hp.value.trim() !== '') { return; }

    var ok = true;
    var firstInvalid = null;

    function check(id, test, msg) {
      var field = document.getElementById(id);
      if (!field) return;
      if (!test(field.value.trim())) {
        showError(field, msg);
        ok = false;
        if (!firstInvalid) firstInvalid = field;
      } else {
        clearError(field);
      }
    }

    check('nama', function (v) { return v.length >= 2; }, 'Mohon isi nama lengkap anda.');
    check('penginapan', function (v) { return v.length >= 2; }, 'Mohon isi nama penginapan anda.');
    check('whatsapp', function (v) { return /^[0-9+\s\-()]{8,}$/.test(v); }, 'Masukkan nomor WhatsApp yang valid.');
    check('layanan', function (v) { return v !== ''; }, 'Silakan pilih layanan yang diminati.');

    if (!ok) {
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    // Success feedback (FR-10). In production, POST to Formspree / API route.
    var btn = document.getElementById('submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Mengirim…'; }

    setTimeout(function () {
      form.classList.add('hidden');
      var success = document.getElementById('form-success');
      if (success) {
        success.classList.remove('hidden');
        success.setAttribute('tabindex', '-1');
        success.focus();
      }
    }, 600);
  });
})();
