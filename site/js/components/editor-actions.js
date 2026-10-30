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
  linkCopied: { ru: 'Ссылка на диаграмму скопирована: по ней откроется этот код.', en: 'The link to the diagram is copied: it opens this code.' },
  copyFailed: { ru: 'Не удалось скопировать код.', en: 'The code could not be copied.' },
  layout: { ru: 'Ручное расположение блоков сброшено.', en: 'The manual place of the blocks is reset.' },
  noLayout: { ru: 'В коде нет ручного расположения блоков.', en: 'The code has no manual place of the blocks.' },
  undone: { ru: 'Изменение отменено.', en: 'Change undone.' },
  redone: { ru: 'Изменение возвращено.', en: 'Change redone.' },
  nothingUndo: { ru: 'Отменять нечего.', en: 'Nothing to undo.' },
  nothingRedo: { ru: 'Возвращать нечего.', en: 'Nothing to redo.' },
};

// Wires the buttons of the editor that work on the code and the drawing: undo and redo, save, check, format, share, auto layout, theme, zoom and the side panels.
const SHARE_KEY = 's=';
const SHARE_LIMIT = 6000;

// The code of a link made by the Share button, or null when the address holds none.
export const codeFromHash = (hash) => {
  if (!hash.startsWith(`#${SHARE_KEY}`)) return null;
  try {
    const packed = hash
      .slice(SHARE_KEY.length + 1)
      .replaceAll('-', '+')
      .replaceAll('_', '/');
    const text = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(packed), (char) => char.charCodeAt(0)));
    return text.trim() === '' || text.length > 100000 ? null : text;
  } catch {
    return null;
  }
};

export const initEditorActions = ({ root = document, storage, clipboard = root.defaultView.navigator.clipboard } = {}) => {
  const page = root.querySelector('.app-page--editor');
  const codeLines = page?.querySelector('.code__lines');
  if (!codeLines) return null;
  const lang = root.documentElement.lang === 'en' ? 'en' : 'ru';
  const note = page.querySelector('.editor-status__saved');
  const remote = page.querySelector('.canvas__remote');
  const sidebar = page.querySelector('.editor-sidebar');
  const say = (key) => {
    const text = TEXTS[key][lang];
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
  // Undo and redo are switched off where there is nothing to undo or redo, so a wrong order of presses is not possible.
  const syncHistory = () => {
    page.querySelectorAll('[data-action="undo"]').forEach((button) => button.setAttribute('aria-disabled', String(at === 0)));
    page.querySelectorAll('[data-action="redo"]').forEach((button) => button.setAttribute('aria-disabled', String(at === states.length - 1)));
  };
  new root.defaultView.MutationObserver(() => {
    const text = readCode(codeLines);
    if (text === states[at]) return;
    states.splice(at + 1, states.length, text);
    if (states.length > HISTORY_LIMIT) states.shift();
    at = states.length - 1;
    syncHistory();
  }).observe(codeLines, { childList: true, subtree: true, characterData: true });
  syncHistory();
  const go = (step, done, nothing) => {
    const target = at + step;
    if (target < 0 || target >= states.length) return say(nothing);
    at = target;
    syncHistory();
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
  // The code is packed into the address after the # (it never goes to a server): whoever opens the link gets the same code in the editor.
  // A code too long for an address is copied as text instead.
  const shareLink = (text) => {
    const bytes = new TextEncoder().encode(text);
    const packed = btoa(String.fromCharCode(...bytes))
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replace(/=+$/, '');
    const { origin, pathname } = root.defaultView.location;
    return packed.length <= SHARE_LIMIT ? `${origin}${pathname}#${SHARE_KEY}${packed}` : null;
  };
  const share = async () => {
    try {
      const text = readCode(codeLines);
      const link = shareLink(text);
      await clipboard.writeText(link ?? text);
      return say(link === null ? 'copied' : 'linkCopied');
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

  // The Templates tab of the activity bar swaps the explorer for the list of templates in the same side panel.
  const templatesButton = page.querySelector('[data-panel="templates"]');
  const showView = (view) => {
    if (!sidebar) return;
    sidebar.dataset.view = view;
    templatesButton?.setAttribute('aria-pressed', String(view === 'templates'));
    if (view === 'templates') page.querySelectorAll('[data-panel="files"]').forEach((button) => button.setAttribute('aria-pressed', 'false'));
  };
  templatesButton?.addEventListener('click', () => {
    const showing = sidebar?.dataset.view === 'templates' && sidebar.classList.contains('editor-sidebar--open');
    showView('templates');
    if (!showing && !sidebar?.classList.contains('editor-sidebar--open')) toggleSidebar();
    else if (showing) toggleSidebar();
  });
  page.querySelectorAll('[data-panel="files"]').forEach((button) => button.addEventListener('click', () => showView('files')));

  const shared = codeFromHash(root.defaultView.location.hash);
  if (shared !== null) write(shared);

  return { states: () => [...states], position: () => at, zoom: () => zoom, actions: ACTIONS };
};
