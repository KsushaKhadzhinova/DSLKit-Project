// Same behaviour as the Part 1 site: the saved choice wins, otherwise the system theme decides.
(function () {
  var root = document.documentElement;
  var saved = null;
  try {
    saved = localStorage.getItem('theme');
  } catch (e) {
    saved = null;
  }
  if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;
  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.getElementById('theme-toggle');
    var dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    toggle.checked = dark;
    toggle.addEventListener('change', function () {
      var value = toggle.checked ? 'dark' : 'light';
      root.dataset.theme = value;
      try {
        localStorage.setItem('theme', value);
      } catch (e) {
        // storage may be blocked, the theme then lasts for this visit only
      }
    });
  });
})();
