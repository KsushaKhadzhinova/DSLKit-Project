export const THEMES = ['light', 'dark'];

const STORAGE_KEY = 'theme';
const SAVED_VALUES = ['light', 'dark', 'auto'];
const DARK_QUERY = '(prefers-color-scheme: dark)';

export const applyTheme = (documentElement, theme) => {
  documentElement.dataset.theme = theme;
};

const readSaved = (storage) => {
  const value = storage.get(STORAGE_KEY, null);
  return SAVED_VALUES.includes(value) ? value : 'auto';
};

const systemPrefersDark = (matchMedia) => typeof matchMedia === 'function' && matchMedia(DARK_QUERY).matches;

const resolveTheme = (choice, matchMedia) => {
  if (choice !== 'auto') return choice;
  return systemPrefersDark(matchMedia) ? 'dark' : 'light';
};

const defaultMatchMedia = (root) => {
  const view = root.defaultView;
  return view && typeof view.matchMedia === 'function' ? view.matchMedia.bind(view) : undefined;
};

// Without a saved choice the theme follows the system; the choice 'auto' also follows later system changes.
export const initTheme = ({ root = document, storage, matchMedia = defaultMatchMedia(root) } = {}) => {
  const html = root.documentElement;
  const toggle = root.querySelector('.theme__input');
  let choice = readSaved(storage);
  let current = resolveTheme(choice, matchMedia);

  const apply = (nextChoice) => {
    choice = nextChoice;
    current = resolveTheme(choice, matchMedia);
    applyTheme(html, current);
    if (toggle) toggle.checked = current === 'dark';
    root.querySelectorAll('input[name="theme"]').forEach((radio) => {
      radio.checked = radio.value === choice;
    });
  };

  apply(choice);

  toggle?.addEventListener('change', () => {
    const value = toggle.checked ? 'dark' : 'light';
    storage.set(STORAGE_KEY, value);
    apply(value);
  });

  root.addEventListener('change', (event) => {
    const radio = event.target.closest('input[name="theme"]');
    if (!radio || !SAVED_VALUES.includes(radio.value)) return;
    storage.set(STORAGE_KEY, radio.value);
    apply(radio.value);
  });

  if (typeof matchMedia === 'function') {
    matchMedia(DARK_QUERY).addEventListener?.('change', () => {
      if (choice === 'auto') apply('auto');
    });
  }

  return { current: () => current, choice: () => choice };
};
