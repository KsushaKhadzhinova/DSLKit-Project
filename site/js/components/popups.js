// Only one menu is open at a time: a press outside an open menu, or on another menu, closes it, and so does Escape.
const MENUS = [
  { box: '.editor-menu', open: 'details.editor-menu[open]', close: (node) => node.removeAttribute('open') },
  {
    box: '.board-tools',
    open: '.board-tools__pop:not([hidden])',
    close: (node) => {
      node.hidden = true;
      node.parentElement.querySelector('[aria-expanded]')?.setAttribute('aria-expanded', 'false');
    },
  },
  {
    box: '.project-card',
    open: '.project-card__actions:not([hidden])',
    close: (node) => {
      node.hidden = true;
      node.parentElement.querySelector('.project-card__menu')?.setAttribute('aria-expanded', 'false');
    },
  },
];

export const initPopups = ({ root = document } = {}) => {
  if (!root.querySelector(MENUS.map((menu) => menu.box).join(','))) return null;
  const closeAll = (except = null) => {
    let closed = 0;
    MENUS.forEach((menu) =>
      root.querySelectorAll(menu.open).forEach((node) => {
        if (except && except.contains(node)) return;
        menu.close(node);
        closed += 1;
      }),
    );
    return closed;
  };
  // The capture phase runs before the menu handles its own press, so a menu opened by this press is never closed by it.
  root.addEventListener(
    'pointerdown',
    (event) => {
      const inside = event.target.closest?.(MENUS.map((menu) => menu.box).join(','));
      closeAll(inside);
    },
    true,
  );
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAll();
  });
  // Opening the menu of the toolbar closes the drawers of the activity bar (search, Git) as well.
  root.addEventListener(
    'toggle',
    (event) => {
      if (event.target.matches?.('details.editor-menu[open]'))
        root.querySelectorAll('.editor-tools:not([hidden]) .editor-tools__close').forEach((button) => button.click());
    },
    true,
  );
  return { closeAll };
};
