// Runs in the head, before the first paint: the theme is set and a guest is sent away from a closed page, so the page never flashes in the wrong state.
(function () {
  try {
    const root = document.documentElement;
    root.classList.add('js');
    const read = function (key) {
      try {
        return JSON.parse(localStorage.getItem('dslkit.' + key));
      } catch (error) {
        return null;
      }
    };
    const session = read('session');
    const owner = session && typeof session.userId === 'string' ? session.userId : null;
    // The theme is kept per account ("theme.<id>"); a guest, or an account that never chose, uses the plain key.
    const saved = (owner && read('theme.' + owner)) || read('theme');
    const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = saved === 'light' || saved === 'dark' ? saved : dark ? 'dark' : 'light';
    if (/\/dashboard\.html\/?$/i.test(location.pathname)) {
      const accounts = read('accounts');
      const known =
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
