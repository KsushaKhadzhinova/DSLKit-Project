const CONTROLS = 'input.switch__input[type="checkbox"], select.settings-row__select';

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

export const initSettings = ({ root = document, storage } = {}) => {
  const container = root.querySelector('.settings');
  const controls = container ? [...container.querySelectorAll(CONTROLS)] : [];
  if (controls.length === 0) return null;

  const saved = storage.get('settings', {});
  const state = isPlainObject(saved) ? saved : {};

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
    state[control.id] = control.type === 'checkbox' ? control.checked : control.value;
    storage.set('settings', state);
  });

  return { values: () => ({ ...state }) };
};
