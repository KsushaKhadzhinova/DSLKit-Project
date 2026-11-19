import { pageLanguage, pick } from '../utils/lang.js';

// Own dialogs instead of the system prompt() and confirm(): they do not block the page, speak the language of the page, look like the rest of the
// interface and work from the keyboard (Enter accepts, Escape or a press outside cancels, Tab stays inside, the focus returns to where it was).
const TEXTS = {
  ok: { ru: 'Подтвердить', en: 'Confirm' },
  save: { ru: 'Сохранить', en: 'Save' },
  cancel: { ru: 'Отмена', en: 'Cancel' },
};

const open = (root, { message, value = null, accept }) =>
  new Promise((resolve) => {
    const lang = pageLanguage(root);
    const opener = root.activeElement;
    const overlay = root.createElement('div');
    overlay.className = 'dialog';
    const box = root.createElement('div');
    box.className = 'dialog__box';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-labelledby', 'dialog-message');
    const text = root.createElement('p');
    text.className = 'dialog__message';
    text.id = 'dialog-message';
    text.textContent = message;
    const form = root.createElement('form');
    form.className = 'dialog__form';
    form.noValidate = true;
    let field = null;
    if (value !== null) {
      field = root.createElement('input');
      field.type = 'text';
      field.className = 'dialog__input';
      field.value = value;
      field.setAttribute('aria-labelledby', 'dialog-message');
      form.append(field);
    }
    const actions = root.createElement('div');
    actions.className = 'dialog__actions';
    const cancel = root.createElement('button');
    cancel.type = 'button';
    cancel.className = 'button button--quiet';
    cancel.textContent = pick(TEXTS.cancel, lang);
    const ok = root.createElement('button');
    ok.type = 'submit';
    ok.className = 'button button--primary';
    ok.textContent = pick(field ? TEXTS.save : TEXTS.ok, lang);
    actions.append(cancel, ok);
    form.append(actions);
    box.append(text, form);
    overlay.append(box);

    const finish = (answer) => {
      root.removeEventListener('keydown', onKey, true);
      overlay.remove();
      opener?.focus?.();
      resolve(answer);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(accept(null, false));
      } else if (event.key === 'Tab') {
        const stops = [...box.querySelectorAll('input, button')];
        const at = stops.indexOf(root.activeElement);
        const next = stops[(at + (event.shiftKey ? -1 : 1) + stops.length) % stops.length];
        event.preventDefault();
        next.focus();
      }
    };
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      finish(accept(field ? field.value : null, true));
    });
    cancel.addEventListener('click', () => finish(accept(null, false)));
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) finish(accept(null, false));
    });
    root.addEventListener('keydown', onKey, true);
    root.body.append(overlay);
    (field ?? ok).focus();
    field?.select?.();
  });

// prompt(message, value) answers with the text or null, confirm(message) with true or false.
export const createDialogs = (root = document) => ({
  prompt: (message, value = '') => open(root, { message, value, accept: (text, yes) => (yes ? text : null) }),
  confirm: (message) => open(root, { message, accept: (_, yes) => yes }),
});
