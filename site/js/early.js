// Runs in the head, before the first paint: the theme is set and a guest is sent away from a closed page, so the page never flashes in the wrong state.
(function () {
  try {
    var root = document.documentElement;
    root.classList.add('js');
    var read = function (key) {
      try {
        return JSON.parse(localStorage.getItem('dslkit.' + key));
      } catch (error) {
        return null;
      }
    };
    var saved = read('theme');
    var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = saved === 'light' || saved === 'dark' ? saved : dark ? 'dark' : 'light';
    if (/\/dashboard\.html\/?$/i.test(location.pathname)) {
      var session = read('session');
      var accounts = read('accounts');
      var known =
        session &&
        Array.isArray(accounts) &&
        accounts.some(function (account) {
          return account && account.id === session.userId;
        });
      if (!known) location.replace('login.html');
    }
  } catch (error) {
    /* the page still works without this script */
  }
})();
