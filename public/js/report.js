// Test report page: theme toggle and phone menu (same behaviour as the homepage).
(function () {
  'use strict';

  var root = document.documentElement;
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  var themeBtn = document.getElementById('theme-toggle');
  var themeLabel = document.getElementById('theme-label');
  var metaTheme = document.querySelector('meta[name="theme-color"]');

  function currentMode() { return root.getAttribute('data-theme') || 'auto'; }
  function renderTheme() {
    var mode = currentMode();
    var device = darkQuery.matches ? 'dark' : 'light';
    var resolved = mode === 'auto' ? device : mode;
    themeLabel.textContent = mode === 'auto' ? 'Auto · ' + device : (mode === 'light' ? 'Light' : 'Dark');
    themeBtn.setAttribute('aria-label', mode === 'auto'
      ? 'Theme: following your device (' + device + '). Switch to light.'
      : 'Theme: ' + mode + '. Switch to ' + (mode === 'light' ? 'dark' : 'follow your device') + '.');
    if (metaTheme) metaTheme.setAttribute('content', resolved === 'dark' ? '#121417' : '#f1f0eb');
  }
  themeBtn.addEventListener('click', function () {
    var next = { auto: 'light', light: 'dark', dark: 'auto' }[currentMode()];
    if (next === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', next);
    try { if (next === 'auto') localStorage.removeItem('theme'); else localStorage.setItem('theme', next); } catch (e) {}
    renderTheme();
  });
  darkQuery.addEventListener('change', renderTheme);
  renderTheme();

  var menuBtn = document.getElementById('menu-toggle');
  var nav = document.getElementById('site-nav');
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.textContent = open ? 'Close' : 'Menu';
  }
  menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); }
  });

  /* ---------- Motion (skipped entirely when the visitor prefers reduced motion) ---------- */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;

  function onView(els, fn, threshold, margin) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { fn(en.target); io.unobserve(en.target); } });
    }, { threshold: threshold == null ? 0.2 : threshold, rootMargin: margin || '0px' });  // 0 is a valid threshold, so no `||`
    els.forEach(function (el) { io.observe(el); });
  }

  // Cards that share a row or grid come in one after another (at most 4 steps of 90ms).
  function stagger(els) {
    els.forEach(function (el) {
      var sibs = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.classList.contains('reveal'); });
      var i = sibs.indexOf(el);
      if (i > 0) el.style.setProperty('--reveal-delay', Math.min(i, 4) * 90 + 'ms');
    });
  }

  // Fade content in as it scrolls into view (and draw the headings' calibration marks).
  // Tables inside the collapsible test-case sections are left out, so expanding one is instant.
  var reveal = Array.prototype.filter.call(
    document.querySelectorAll('.section-head, .method, .table-wrap, .finding, .evidence, .lessons li, details.area'),
    function (el) { return !el.closest('details'); });
  reveal.forEach(function (el) { el.classList.add('reveal'); });
  try {
    stagger(reveal);
    onView(reveal, function (el) { el.classList.add('is-in'); }, 0, '0px 0px -15% 0px');
  } catch (err) {
    // Safety net: if the reveal setup fails for any reason, never leave content invisible.
    reveal.forEach(function (el) { el.classList.add('is-in'); });
  }

  // Count numbers up. The real value stays in the HTML until counting actually starts.
  onView(Array.prototype.slice.call(document.querySelectorAll('[data-count]')), function (el) {
    var end = Number(el.getAttribute('data-count'));
    var start = performance.now();
    el.textContent = '0';
    (function step(now) {
      var t = Math.min(1, (now - start) / 1000);
      el.textContent = Math.round(end * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(step);
    })(start);
  }, 0.5);

  // Issue lifecycle: each fixed issue briefly shows FAIL, then flips to its real status.
  // FAIL is drawn by CSS over the real text, so screen readers always read the true status.
  var stamps = Array.prototype.slice.call(document.querySelectorAll('.finding .chip[data-stamp]'));
  stamps.forEach(function (chip) { chip.classList.add('is-failing'); });
  onView(stamps, function (chip) {
    setTimeout(function () {
      chip.classList.remove('is-failing');
      chip.classList.add('is-stamping');
    }, 650);
  }, 0.9);
  // Failsafe: never leave a FAIL stamp showing (printing, or a card that never quite enters view).
  window.addEventListener('beforeprint', function () { stamps.forEach(function (c) { c.classList.remove('is-failing'); }); });
})();
