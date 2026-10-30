// Toasts: a short note in the corner after an action of the user, so the system always answers.
// Any module reports through notify(root, text, kind); the component listens, shows the toast, and clears it after a few seconds.
const EVENT = 'dslkit:toast';
const FLASH = 'flash';
const KINDS = ['success', 'info', 'error'];
const MAX_VISIBLE = 4;
const SHOW_MS = { success: 3500, info: 3500, error: 7000 };
const ERROR_WORDS =
  /не удалось|не сохранен|не добавлен|отклонен|ошибк|лимит|нельзя|неверн|не может|failed|not saved|not added|refused|error|limit|cannot|wrong|could not/i;

// The kind of a message that has none: words of refusal make an error, everything else is a success.
export const kindOf = (text) => (ERROR_WORDS.test(text) ? 'error' : 'success');

export const notify = (root, text, kind) => {
  const message = String(text ?? '').trim();
  if (message === '') return false;
  root.dispatchEvent(new root.defaultView.CustomEvent(EVENT, { detail: { text: message, kind: KINDS.includes(kind) ? kind : kindOf(message) } }));
  return true;
};

// A note for the next page: it is shown there once (sign in, sign out, registration).
export const flash = (storage, text, kind) => storage.set(FLASH, { text, kind });

export const initToasts = ({ root = document, storage, setTimer = setTimeout, clearTimer = clearTimeout } = {}) => {
  if (!root.body) return null;
  const lang = root.documentElement.lang === 'en' ? 'en' : 'ru';
  const region = root.createElement('div');
  region.className = 'toasts';
  region.setAttribute('role', 'region');
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-label', lang === 'en' ? 'Notifications' : 'Уведомления');
  root.body.append(region);

  const close = (toast, timer) => {
    clearTimer(timer);
    toast.classList.add('toast--leaving');
    toast.remove();
  };
  const show = (text, kind = 'success') => {
    const same = [...region.children].find((node) => node.dataset.text === text);
    if (same) same.remove();
    const toast = root.createElement('div');
    toast.className = `toast toast--${kind}`;
    toast.dataset.text = text;
    toast.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    const mark = root.createElement('span');
    mark.className = 'toast__mark';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = kind === 'error' ? '!' : kind === 'info' ? 'i' : '✓';
    const body = root.createElement('span');
    body.className = 'toast__text';
    body.textContent = text;
    const button = root.createElement('button');
    button.type = 'button';
    button.className = 'toast__close';
    button.setAttribute('aria-label', lang === 'en' ? 'Close the notification' : 'Закрыть уведомление');
    button.textContent = '×';
    toast.append(mark, body, button);
    region.append(toast);
    while (region.children.length > MAX_VISIBLE) region.firstChild.remove();
    const timer = setTimer(() => close(toast, timer), SHOW_MS[kind]);
    button.addEventListener('click', () => close(toast, timer));
    return toast;
  };

  root.addEventListener(EVENT, (event) => show(event.detail.text, event.detail.kind));
  // Every explicit save (the Save button, Ctrl+S) answers with a toast that repeats the note of the status bar, after the page has written it.
  root.addEventListener('dslkit:save', () => setTimer(() => notify(root, root.querySelector('.editor-status__saved')?.textContent), 0));

  const pending = storage?.get(FLASH, null);
  if (pending !== null && typeof pending?.text === 'string') {
    storage.remove(FLASH);
    show(pending.text, KINDS.includes(pending.kind) ? pending.kind : 'success');
  }
  return { show, count: () => region.children.length };
};
