export const initBurger = ({ root = document } = {}) => {
  const input = root.querySelector('.burger__input');
  if (!input) return null;

  const nav = root.querySelector('.nav');
  const isOpen = () => input.checked;

  // The menu panel disappears when it closes, so focus inside it moves to the burger button first.
  const close = () => {
    if (nav?.contains(root.activeElement)) input.focus();
    input.checked = false;
  };

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) close();
  });

  nav?.addEventListener('click', (event) => {
    if (event.target.closest('a.nav__link')) close();
  });

  return { close, isOpen };
};
