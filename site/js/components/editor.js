import { KEYWORDS, NOTATIONS, TEMPLATES } from '../notations/index.js';
import { ui } from '../notations/messages.js';

const VIEWS = ['code', 'canvas'];
const KEY_STEPS = { ArrowRight: 1, ArrowLeft: -1 };

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

// Settings live under one storage key, a damaged value is treated as "no settings".
const createSettings = (storage) => {
  const read = () => {
    const saved = storage.get('settings', {});
    return isPlainObject(saved) ? saved : {};
  };
  return { read, save: (key, value) => storage.set('settings', { ...read(), [key]: value }) };
};

const announceRun = (page, root) => page.dispatchEvent(new root.defaultView.CustomEvent('dslkit:run', { bubbles: true }));

// File tabs: selection, arrow-key navigation and the remembered tab.
const initTabs = ({ page, root, storage, tabs }) => {
  const panels = tabs.map((tab) => root.getElementById(tab.getAttribute('aria-controls')));
  const closeButton = page.querySelector('.editor-tabs__close');
  const tabName = (index) => tabs[index].querySelector('span').textContent.trim();
  const current = () => tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true');

  const select = (index, { focus = false } = {}) => {
    tabs.forEach((tab, position) => {
      const active = position === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      tab.classList.toggle('editor-tabs__tab--active', active);
      panels[position].hidden = !active;
    });
    if (focus) tabs[index].focus();
    closeButton?.setAttribute('aria-label', `Закрыть файл ${tabName(index)}`);
    storage.set('editor-tab', index);
  };

  const list = page.querySelector('.editor-tabs__list');
  list.addEventListener('click', (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (tab) select(tabs.indexOf(tab));
  });
  list.addEventListener('keydown', (event) => {
    const visible = tabs.filter((tab) => !tab.hidden);
    const position = visible.indexOf(event.target.closest('[role="tab"]'));
    if (position < 0) return;
    let next = position;
    if (event.key in KEY_STEPS) next = (position + KEY_STEPS[event.key] + visible.length) % visible.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = visible.length - 1;
    else return;
    event.preventDefault();
    select(tabs.indexOf(visible[next]), { focus: true });
  });

  const savedTab = storage.get('editor-tab', null);
  select(Number.isInteger(savedTab) && tabs[savedTab] ? savedTab : Math.max(0, current()));
  return { select, current, tabName, panels, closeButton };
};

// The dialog that asks what to do with unsaved changes when a tab is closed.
const initCloseDialog = ({ page, root, tabs, tabsApi }) => {
  const dialog = root.querySelector('#close-tab-modal');
  const dialogText = dialog?.querySelector('.modal__text');
  const { select, current, tabName, panels, closeButton } = tabsApi;

  const markSaved = () => {
    page.querySelectorAll('.editor-tabs__dot, .editor-topbar__dot').forEach((dot) => dot.remove());
    page.querySelectorAll('.visually-hidden').forEach((note) => {
      if (note.textContent.trim() === 'не сохранено') note.remove();
    });
  };

  const discard = () => {
    const index = current();
    tabs[index].hidden = true;
    panels[index].hidden = true;
    const next = tabs.findIndex((tab) => !tab.hidden);
    if (next >= 0) select(next);
    else if (closeButton) closeButton.hidden = true;
  };

  closeButton?.addEventListener('click', () => {
    if (!dialog) return;
    dialog.returnValue = '';
    if (dialogText) dialogText.textContent = `В файле ${tabName(current())} есть несохранённые изменения.`;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  });
  dialog?.addEventListener('close', () => {
    if (dialog.returnValue === 'save') markSaved();
    else if (dialog.returnValue === 'discard') discard();
    dialog.returnValue = '';
  });
};

const initAutosave = ({ page, settings }) => {
  const autosave = page.querySelector('.editor-toolbar__switch');
  if (!autosave) return;
  const status = page.querySelector('.editor-status__cursor');
  const apply = (on) => {
    autosave.setAttribute('aria-checked', String(on));
    if (status) status.textContent = status.textContent.replace(/Автосохранение: (?:вкл|выкл)/, `Автосохранение: ${on ? 'вкл' : 'выкл'}`);
  };
  const saved = settings.read().autosave;
  apply(typeof saved === 'boolean' ? saved : autosave.getAttribute('aria-checked') === 'true');
  autosave.addEventListener('click', () => {
    const on = autosave.getAttribute('aria-checked') !== 'true';
    apply(on);
    settings.save('autosave', on);
  });
};

// Code and canvas views (on a phone only one of them is shown).
const initViews = ({ page, storage }) => {
  const main = page.querySelector('.editor-main');
  const viewButtons = [...page.querySelectorAll('[data-view]')];
  const showView = (view) => {
    if (main) main.dataset.view = view;
    viewButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
    storage.set('editor-view', view);
  };
  viewButtons.forEach((button) => button.addEventListener('click', () => showView(button.dataset.view)));
  const savedView = storage.get('editor-view', null);
  showView(VIEWS.includes(savedView) ? savedView : 'canvas');
  return { showView, view: () => main?.dataset.view };
};

// The Run button and Ctrl+Enter ask the runner to draw, unless the code has errors: then focus goes to the first problem.
const initRun = ({ page, root }) => {
  const runButtons = [...page.querySelectorAll('.button--run')];
  const run = (event) => {
    event.preventDefault();
    if (runButtons.some((button) => button.getAttribute('aria-disabled') === 'true')) {
      page.querySelector('.problems__location')?.focus();
      return false;
    }
    announceRun(page, root);
    return true;
  };
  page.addEventListener('click', (event) => {
    if (event.target.closest('.button--run')) run(event);
  });
  page.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') run(event);
  });
};

// One line of code as the editor draws it: indentation, an optional keyword span, the rest.
const createCodeLine = (root, text) => {
  const item = root.createElement('li');
  item.className = 'code__line';
  const code = root.createElement('code');
  const [, indent, word, rest] = /^(\s*)([a-z]*)(.*)$/.exec(text);
  code.append(indent);
  if (KEYWORDS.has(word)) {
    const keyword = root.createElement('span');
    keyword.className = 'code__keyword';
    keyword.textContent = word;
    code.append(keyword, rest);
  } else code.append(word + rest);
  item.append(code);
  return item;
};

// Templates: the buttons and the notation list replace the code with a starter example and ask the runner to draw it.
const initTemplates = ({ page, root }) => {
  const lang = root.documentElement.lang === 'en' ? 'en' : 'ru';
  const codeLines = page.querySelector('.code__lines');
  const loadTemplate = (key) => {
    if (!codeLines || !(key in TEMPLATES)) return false;
    codeLines.replaceChildren(...TEMPLATES[key].split('\n').map((text) => createCodeLine(root, text)));
    announceRun(page, root);
    return true;
  };
  page.querySelectorAll('[data-template]').forEach((button) => button.addEventListener('click', () => loadTemplate(button.dataset.template)));
  const picker = page.querySelector('[data-notation-select]');
  if (picker) {
    picker.setAttribute('aria-label', ui('template', {}, lang));
    picker.replaceChildren(
      ...Object.entries(NOTATIONS).map(([key, notation]) => {
        const option = root.createElement('option');
        option.value = key;
        option.textContent = notation.name[lang];
        return option;
      }),
    );
    picker.addEventListener('change', () => loadTemplate(picker.value));
  }
  return loadTemplate;
};

export const initEditor = ({ root = document, storage } = {}) => {
  const page = root.querySelector('.app-page--editor');
  const tabs = page ? [...page.querySelectorAll('.editor-tabs__list [role="tab"]')] : [];
  if (tabs.length === 0) return null;

  const settings = createSettings(storage);
  const tabsApi = initTabs({ page, root, storage, tabs });
  initCloseDialog({ page, root, tabs, tabsApi });
  initAutosave({ page, settings });
  initRun({ page, root });
  const loadTemplate = initTemplates({ page, root });
  const { showView, view } = initViews({ page, storage });

  return { select: tabsApi.select, showView, loadTemplate, view };
};
