export const initBurger = ({ root = document } = {}) => {
  const input = root.querySelector('.burger__input');
  if (!input) {
    return null;
  }

  const close = () => {
    input.checked = false;
  };

  const isOpen = () => input.checked;

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && input.checked) {
      close();
    }
  });

  const nav = root.querySelector('.nav');
  if (nav) {
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a.nav__link')) {
        close();
      }
    });
  }

  return { close, isOpen };
};
