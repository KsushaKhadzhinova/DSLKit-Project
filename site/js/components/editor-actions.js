import { applyTheme } from './theme.js';
import { readCode, showCode } from './code-lines.js';
import { clearPositions, formatCode } from '../utils/format-code.js';

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 3;
export const ZOOM_STEP = 0.25;
const HISTORY_LIMIT = 100;

const TEXTS = {
  checked: { ru: 'Проверка выполнена.', en: 'Check done.' },
  clean: { ru: 'Проверка выполнена: проблем нет.', en: 'Check done: no problems.' },
  formatted: { ru: 'Код отформатирован.', en: 'Code formatted.' },
  unchanged: { ru: 'Код уже отформатирован.', en: 'The code is already formatted.' },
  copied: { ru: 'Код скопирован в буфер обмена.', en: 'The code is copied to the clipboard.' },
  copyFailed: { ru: 'Не удалось скопировать код.', en: 'The code could not be copied.' },
  layout: { ru: 'Ручное расположение блоков сброшено.', en: 'The manual place of the blocks is reset.' },
  noLayout: { ru: 'В коде нет ручного расположения блоков.', en: 'The code has no manual place of the blocks.' },
  undone: { ru: 'Изменение отменено.', en: 'Change undone.' },
  redone: { ru: 'Изменение возвращено.', en: 'Change redone.' },
  nothingUndo: { ru: 'Отменять нечего.', en: 'Nothing to undo.' },
  nothingRedo: { ru: 'Возвращать нечего.', en: 'Nothing to redo.' },
  noFile: { ru: 'Файл {name} пока нельзя открыть.', en: 'The file {name} cannot be opened yet.' },
};

// Wires the buttons of the editor that work on the code and the drawing: undo and redo, save, check, format, share, auto layout, theme, zoom and the side panels.
export const initEditorActions = ({ root = document, storage, clipboard = root.defaultView.navigator.clipboard } = {}) => {
  const page = root.querySelector('.app-page--editor');
  const codeLines = page?.querySelector('.code__lines');
  if (!codeLines) return null;
  const lang = root.documentElement.lang === 'en' ? 'en' : 'ru';
  const note = page.querySelector('.editor-status__saved');
  const remote = page.querySelector('.canvas__remote');
  const sidebar = page.querySelector('.editor-sidebar');
  const say = (key, params = {}) => {
    const text = TEXTS[key][lang].replace(/\{(\w+)\}/g, (_, name) => params[name]);
    if (note) note.textContent = text;
    return text;
  };
  const run = () => page.dispatchEvent(new root.defaultView.CustomEvent('dslkit:run', { bubbles: true }));
  const write = (text) => {
    showCode(root, codeLines, text);
    run();
  };

  // Every state of the code is remembered, so undo and redo work for typing, templates, format and moving blocks alike.
  const states = [readCode(codeLines)];
  let at = 0;
  new root.defaultView.MutationObserver(() => {
    const text = readCode(codeLines);
    if (text === states[at]) return;
    states.splice(at + 1, states.length, text);
    if (states.length > HISTORY_LIMIT) states.shift();
    at = states.length - 1;
  }).observe(codeLines, { childList: true, subtree: true, characterData: true });
  const go = (step, done, nothing) => {
    const target = at + step;
    if (target < 0 || target >= states.length) return say(nothing);
    at = target;
    write(states[at]);
    return say(done);
  };

  const check = () => {
    run();
    const first = page.querySelector('.problems__location');
    if (first) {
      first.focus();
      return say('checked');
    }
    return say('clean');
  };
  const format = () => {
    const current = readCode(codeLines);
    const next = formatCode(current);
    if (next === current) return say('unchanged');
    write(next);
    return say('formatted');
  };
  const share = async () => {
    try {
      await clipboard.writeText(readCode(codeLines));
      return say('copied');
    } catch {
      return say('copyFailed');
    }
  };
  const layout = () => {
    const current = readCode(codeLines);
    const next = clearPositions(current);
    if (next === current) return say('noLayout');
    write(next);
    return say('layout');
  };
  const theme = () => {
    const next = root.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    storage.set('theme', next);
    applyTheme(root.documentElement, next);
    return next;
  };

  let zoom = 1;
  const setZoom = (value) => {
    zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
    if (!remote) return zoom;
    if (zoom === 1) {
      delete remote.dataset.zoom;
      remote.style.removeProperty('--canvas-zoom');
    } else {
      remote.dataset.zoom = String(zoom);
      remote.style.setProperty('--canvas-zoom', String(zoom));
    }
    return zoom;
  };

  const toggleSidebar = () => {
    if (!sidebar) return false;
    const open = sidebar.classList.toggle('editor-sidebar--open');
    page.querySelectorAll('[data-action="sidebar"]').forEach((button) => button.setAttribute('aria-pressed', String(open)));
    return open;
  };

  const ACTIONS = {
    undo: () => go(-1, 'undone', 'nothingUndo'),
    redo: () => go(1, 'redone', 'nothingRedo'),
    save: () => page.dispatchEvent(new root.defaultView.CustomEvent('dslkit:save', { bubbles: true })),
    check,
    format,
    share,
    layout,
    theme,
    sidebar: toggleSidebar,
    problems: () => {
      const button = page.querySelector('.editor-banner [data-action="problems"]');
      const expanded = button?.getAttribute('aria-expanded') !== 'true';
      button?.setAttribute('aria-expanded', String(expanded));
      page.querySelector('.problems')?.classList.toggle('problems--open', expanded);
      if (expanded) page.querySelector('.problems__location')?.focus();
      return expanded;
    },
    'zoom-in': () => setZoom(zoom + ZOOM_STEP),
    'zoom-out': () => setZoom(zoom - ZOOM_STEP),
    'zoom-fit': () => setZoom(1),
  };

  page.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (button && Object.hasOwn(ACTIONS, button.dataset.action)) ACTIONS[button.dataset.action]();
  });
  page.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      ACTIONS.save();
    }
  });

  // The activity bar: Files opens the explorer, search, Git and the assistant are in editor-tools.js.
  page.querySelectorAll('[data-panel="files"]').forEach((button) =>
    button.addEventListener('click', () => {
      const open = toggleSidebar();
      button.setAttribute('aria-pressed', String(open));
    }),
  );

  // The explorer opens a file as a tab, a file without a tab says so.
  const files = [...page.querySelectorAll('[data-file]')];
  files.forEach((button) =>
    button.addEventListener('click', () => {
      const tab = root.getElementById(`tab-${button.dataset.file}`);
      if (!tab) {
        say('noFile', { name: button.textContent.trim() });
        return;
      }
      tab.click();
      files.forEach((item) => {
        const active = item === button;
        item.classList.toggle('file-tree__item--active', active);
        if (active) item.setAttribute('aria-current', 'true');
        else item.removeAttribute('aria-current');
      });
    }),
  );

  return { states: () => [...states], position: () => at, zoom: () => zoom, actions: ACTIONS };
};
