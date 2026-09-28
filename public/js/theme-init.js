// Runs before the page paints, so a saved theme never flashes the wrong colours.
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  try {
    var saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);
  } catch (e) {
    // Storage blocked (private mode, etc.): fall back to the device setting.
  }

  // KS loading screen: first visit in a session only, never with reduced motion.
  // It hides itself with a CSS animation, so it can't get stuck even if later scripts fail.
  try {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce && !sessionStorage.getItem('ks-loaded')) {
      root.classList.add('show-loader');
      sessionStorage.setItem('ks-loaded', '1');
      // Second failsafe, in case main.js fails to load at all.
      setTimeout(function () { root.classList.remove('show-loader'); }, 2500);
    }
  } catch (e) { /* no storage: skip the loader */ }
})();
