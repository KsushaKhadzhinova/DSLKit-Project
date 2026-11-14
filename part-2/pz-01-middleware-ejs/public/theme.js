// Theme switch like in Part 1: the choice is kept in localStorage, without it the system setting decides.
(() => {
  const KEY = 'theme';
  const root = document.documentElement;
  let saved = null;
  try {
    saved = localStorage.getItem(KEY);
  } catch {
    // Storage can be blocked (private window); the page still works with the system theme.
  }
  const systemDark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved === 'light' || saved === 'dark' ? saved : systemDark ? 'dark' : 'light';
  root.dataset.theme = theme;
  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.querySelector('.theme__input');
    if (!toggle) return;
    toggle.checked = theme === 'dark';
    toggle.addEventListener('change', () => {
      const next = toggle.checked ? 'dark' : 'light';
      root.dataset.theme = next;
      try {
        localStorage.setItem(KEY, next);
      } catch {
        // Not saved, but the switch still works for this page.
      }
    });
  });
})();
