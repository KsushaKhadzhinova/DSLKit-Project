// Runs before the first paint: sets the theme, the language and the title from storage, so the page does not flash.
// It is a separate file (not an inline script), so a strict Content-Security-Policy with script-src 'self' accepts it.
(function () {
  var root = document.documentElement;
  var read = function (key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  };
  var theme = read('dslkit.theme');
  if (theme !== 'light' && theme !== 'dark') {
    theme = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  root.setAttribute('data-theme', theme);
  if (read('dslkit.language') === 'en') {
    root.lang = 'en';
    document.title = 'DSLKit: application state';
  }
})();
