// @ts-nocheck -- type-check debt: remove this line when the file passes npm run typecheck
import { scopedKey } from '../storage/scope.js';
import { notify } from './toast.js';
import { pageLanguage, pick } from '../utils/lang.js';

const TEXTS = {
  saved: { ru: 'Настройка сохранена.', en: 'The setting is saved.' },
  full: { ru: 'Не сохранено: хранилище браузера переполнено или отключено.', en: 'Not saved: the browser storage is full or off.' },
};

const CONTROLS = 'input.switch__input[type="checkbox"], select.settings-row__select';

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

export const initSettings = ({ root = document, storage } = {}) => {
  const container = root.querySelector('.settings');
  const controls = container ? [...container.querySelectorAll(CONTROLS)] : [];
  if (controls.length === 0) return null;

  // Other components (the editor keeps autosave here) write to the same key, so the stored value is read again before every write.
  const readState = () => {
    const saved = storage.get(scopedKey(storage, 'settings'), {});
    return isPlainObject(saved) ? saved : {};
  };
  const state = readState();

  controls.forEach((control) => {
    if (!(control.id in state)) return;
    if (control.type === 'checkbox') {
      control.checked = state[control.id] === true;
    } else if ([...control.options].some((option) => option.value === state[control.id])) {
      control.value = state[control.id];
    }
  });

  container.addEventListener('change', (event) => {
    const control = event.target.closest(CONTROLS);
    if (!control) return;
    Object.assign(state, readState());
    state[control.id] = control.type === 'checkbox' ? control.checked : control.value;
    if (!storage.set(scopedKey(storage, 'settings'), state)) {
      notify(root, pick(TEXTS.full, pageLanguage(root)), 'error');
      return;
    }
    notify(root, pick(TEXTS.saved, pageLanguage(root)), 'success');
  });

  return { values: () => ({ ...state }) };
};
