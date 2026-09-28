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
})();
