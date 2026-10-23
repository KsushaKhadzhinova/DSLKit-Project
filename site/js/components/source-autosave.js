import { readCode, showCode } from './code-lines.js';

export const AUTOSAVE_DELAY_MS = 1000;
const SOURCE_KEY = 'editor-source';

const clock = (ms) => new Date(ms).toTimeString().slice(0, 5);

// Saves the code of the editor one second after the last change, when the autosave switch is on.
// The saved text comes back when the page is opened again. A damaged value is ignored.
export const initSourceAutosave = ({
  page,
  root,
  storage,
  onSaved = () => {},
  delay = AUTOSAVE_DELAY_MS,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  now = () => Date.now(),
}) => {
  const codeLines = page.querySelector('.code__lines');
  if (!codeLines) return null;
  const switchButton = page.querySelector('.editor-toolbar__switch');
  const note = page.querySelector('.editor-status__saved');
  const lang = root.documentElement.lang === 'en' ? 'en' : 'ru';

  const saved = storage.get(SOURCE_KEY, null);
  if (typeof saved === 'string' && saved.trim() !== '' && saved !== readCode(codeLines)) {
    showCode(root, codeLines, saved);
    onSaved();
  }

  let timer = null;
  const save = () => {
    timer = null;
    if (switchButton && switchButton.getAttribute('aria-checked') !== 'true') return false;
    storage.set(SOURCE_KEY, readCode(codeLines));
    if (note) note.textContent = `${lang === 'en' ? 'Saved' : 'Сохранено'} ${clock(now())}`;
    onSaved();
    return true;
  };
  const schedule = () => {
    if (timer !== null) clearTimer(timer);
    timer = setTimer(save, delay);
  };
  new root.defaultView.MutationObserver(schedule).observe(codeLines, { childList: true, subtree: true, characterData: true });
  return { save, pending: () => timer !== null };
};
