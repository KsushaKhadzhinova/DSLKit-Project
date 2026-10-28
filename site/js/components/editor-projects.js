import { readCode, showCode } from './code-lines.js';
import { TEMPLATES, parseDiagram } from '../notations/index.js';
import { createProjectStore } from '../storage/projects.js';

const TEXTS = {
  saved: { ru: 'Сохранено в «Мои проекты»: {title}', en: 'Saved to "My projects": {title}' },
  notFound: { ru: 'Проект не найден, открыта новая диаграмма.', en: 'The project is not found, a new diagram is open.' },
  untitled: { ru: 'Без названия', en: 'Untitled' },
};
export const PROJECT_AUTOSAVE_MS = 1000;

const fileName = (title) =>
  `${
    title
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'diagram'
  }.dsl`;

// Connects the editor to the list of projects. The address says what to open: ?p=<id> is a saved project,
// ?template=<name> a starter, nothing is a new diagram. The Save button and Ctrl+S create the project,
// after that the autosave keeps it up to date. The project appears on the "My projects" page.
export const initEditorProjects = ({ root = document, storage, now = () => Date.now(), setTimer = setTimeout, clearTimer = clearTimeout } = {}) => {
  const page = root.querySelector('.app-page--editor');
  const codeLines = page?.querySelector('.code__lines');
  if (!codeLines) return null;
  const view = root.defaultView;
  const lang = root.documentElement.lang === 'en' ? 'en' : 'ru';
  const store = createProjectStore({ storage, now });
  const note = page.querySelector('.editor-status__saved');
  const switchButton = page.querySelector('.editor-toolbar__switch');
  const params = new view.URLSearchParams(view.location.search);
  const run = () => page.dispatchEvent(new view.CustomEvent('dslkit:run', { bubbles: true }));

  let project = params.has('p') ? store.get(params.get('p')) : null;
  let lastSaved = null;
  let timer = null;

  const name = (title) => {
    page.querySelectorAll('.editor-topbar__title').forEach((node) => (node.textContent = fileName(title)));
    const tab = page.querySelector('.editor-tabs__tab--active span');
    if (tab) tab.textContent = fileName(title);
  };

  if (project) {
    showCode(root, codeLines, project.source);
    name(project.title);
    lastSaved = project.source;
  } else {
    const key = params.get('template');
    showCode(root, codeLines, TEMPLATES[key] ?? TEMPLATES.idef0);
    if (params.has('p') && note) note.textContent = TEXTS.notFound[lang];
  }
  run();

  const save = () => {
    const source = readCode(codeLines);
    const model = parseDiagram(source);
    const title = model.title || TEXTS.untitled[lang];
    project = store.save({ id: project?.id, title, notation: model.notation ?? 'idef0', source });
    lastSaved = source;
    name(project.title);
    params.set('p', project.id);
    params.delete('template');
    view.history.replaceState(null, '', `${view.location.pathname}?${params}`);
    if (note) note.textContent = TEXTS.saved[lang].replace('{title}', project.title);
    return project;
  };

  const schedule = () => {
    if (timer !== null) clearTimer(timer);
    timer = setTimer(() => {
      timer = null;
      if (project && readCode(codeLines) !== lastSaved && (!switchButton || switchButton.getAttribute('aria-checked') === 'true')) save();
    }, PROJECT_AUTOSAVE_MS);
  };
  new view.MutationObserver(schedule).observe(codeLines, { childList: true, subtree: true, characterData: true });
  page.addEventListener('dslkit:save', save);

  return { save, current: () => project, store };
};
