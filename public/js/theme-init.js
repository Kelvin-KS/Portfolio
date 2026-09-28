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
})();
