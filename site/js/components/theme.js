export const THEMES = ['light', 'dark'];

const STORAGE_KEY = 'theme';
const SAVED_VALUES = ['light', 'dark', 'auto'];
const DARK_QUERY = '(prefers-color-scheme: dark)';

export const applyTheme = (documentElement, theme) => {
  documentElement.dataset.theme = theme;
};

const readSaved = (storage) => {
  const value = storage.get(STORAGE_KEY, null);
  return SAVED_VALUES.includes(value) ? value : null;
};

const systemPrefersDark = (matchMedia) => typeof matchMedia === 'function' && matchMedia(DARK_QUERY).matches;

const resolveTheme = (choice, matchMedia) => {
  if (choice !== 'auto') {
    return choice;
  }
  return systemPrefersDark(matchMedia) ? 'dark' : 'light';
};

const pageChoice = (toggle) => (toggle && toggle.checked ? 'dark' : 'light');

const defaultMatchMedia = (root) => {
  const view = root.defaultView;
  return view && typeof view.matchMedia === 'function' ? view.matchMedia.bind(view) : undefined;
};

export const initTheme = ({ root = document, storage, matchMedia = defaultMatchMedia(root) } = {}) => {
  const html = root.documentElement;
  const toggle = root.querySelector('.theme__input');
  const saved = readSaved(storage);
  let current = saved === null ? pageChoice(toggle) : resolveTheme(saved, matchMedia);

  const sync = (choice) => {
    if (toggle) {
      toggle.checked = current === 'dark';
    }
    root.querySelectorAll('input[name="theme"]').forEach((radio) => {
      radio.checked = radio.value === choice;
    });
  };

  const apply = (theme, choice) => {
    current = theme;
    applyTheme(html, current);
    sync(choice);
  };

  if (saved !== null) {
    applyTheme(html, current);
  }
  sync(saved ?? 'light');

  if (toggle) {
    toggle.addEventListener('change', () => {
      const value = toggle.checked ? 'dark' : 'light';
      storage.set(STORAGE_KEY, value);
      apply(value, value);
    });
  }

  root.addEventListener('change', (event) => {
    const radio = event.target.closest('input[name="theme"]');
    if (!radio || !SAVED_VALUES.includes(radio.value)) {
      return;
    }
    storage.set(STORAGE_KEY, radio.value);
    apply(resolveTheme(radio.value, matchMedia), radio.value);
  });

  return {
    current: () => current,
  };
};
