import { readCode, showCode } from './code-lines.js';
import { TEMPLATES, parseDiagram } from '../notations/index.js';
import { currentUser } from '../storage/accounts.js';
import { starterProjects } from '../storage/seeds.js';
import { createProjectStore, createTemplateStore, showQuota } from '../storage/projects.js';

const TEXTS = {
  saved: { ru: 'Сохранено в «Мои проекты»: {title}', en: 'Saved to "My projects": {title}' },
  notFound: { ru: 'Проект не найден, открыта новая диаграмма.', en: 'The project is not found, a new diagram is open.' },
  untitled: { ru: 'Без названия', en: 'Untitled' },
  templateSaved: { ru: 'Шаблон сохранён в «Мои шаблоны»: {title}', en: 'Template saved to "My templates": {title}' },
  editingTemplate: { ru: 'Шаблон (изменение)', en: 'Template (editing)' },
  fresh: { ru: 'Новая диаграмма (не сохранена)', en: 'New diagram (not saved)' },
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
// after that the autosave keeps it up to date; a new diagram becomes a project with the first change of its code. The project appears on the "My projects" page.
export const initEditorProjects = ({
  root = document,
  storage,
  now = () => Date.now(),
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  navigate,
  seed = true,
} = {}) => {
  const page = root.querySelector('.app-page--editor');
  const codeLines = page?.querySelector('.code__lines');
  if (!codeLines) return null;
  const view = root.defaultView;
  const lang = root.documentElement.lang === 'en' ? 'en' : 'ru';
  const owner = currentUser(storage)?.id ?? null;
  const store = createProjectStore({ storage, now, owner });
  const templates = createTemplateStore({ storage, now, owner });
  if (seed) store.seed(starterProjects());
  const note = page.querySelector('.editor-status__saved');
  const switchButton = page.querySelector('.editor-toolbar__switch');
  const params = new view.URLSearchParams(view.location.search);
  const run = () => page.dispatchEvent(new view.CustomEvent('dslkit:run', { bubbles: true }));
  const go = navigate ?? ((url) => view.location.assign(url));

  let project = params.has('p') ? store.get(params.get('p')) : null;
  // ?tpl=<id> changes a template of the user, ?my=<id> starts a new diagram from it.
  let template = params.has('tpl') ? templates.get(params.get('tpl')) : null;
  const start = template ?? (params.has('my') ? templates.get(params.get('my')) : null);
  let lastSaved = null;
  let baseline = null;
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
    baseline = start?.source ?? TEMPLATES[key] ?? TEMPLATES.idef0;
    showCode(root, codeLines, baseline);
    if ((params.has('p') || params.has('tpl') || params.has('my')) && !start && note) note.textContent = TEXTS.notFound[lang];
  }
  // The link to the other language keeps the project or the template of the address.
  const carryQuery = () =>
    page.querySelectorAll('a[hreflang]').forEach((link) => {
      link.href = `${link.getAttribute('href').split('?')[0]}${view.location.search}`;
    });
  carryQuery();
  run();

  // The explorer lists the saved projects of the user; pressing one opens it, the open one is marked.
  const tree = page.querySelector('.file-tree');
  const quotaText = page.querySelector('#quota-text');
  const quotaBar = page.querySelector('.editor-sidebar__beta progress');
  const renderTree = () => {
    showQuota(quotaText, quotaBar, store.createdOn(), lang);
    if (!tree) return;
    const rows = store.list().map((item) => ({ id: item.id, label: fileName(item.title), active: item.id === project?.id }));
    if (!project) rows.unshift({ id: '', label: (template ? TEXTS.editingTemplate : TEXTS.fresh)[lang], active: true });
    tree.replaceChildren(
      ...rows.map((row) => {
        const li = root.createElement('li');
        const button = root.createElement('button');
        button.type = 'button';
        button.className = `file-tree__item${row.active ? ' file-tree__item--active' : ''}`;
        button.dataset.project = row.id;
        if (row.active) button.setAttribute('aria-current', 'true');
        button.textContent = row.label;
        li.append(button);
        return li;
      }),
    );
  };
  tree?.addEventListener('click', (event) => {
    const id = event.target.closest('[data-project]')?.dataset.project;
    if (id && id !== project?.id) go(`${view.location.pathname}?p=${encodeURIComponent(id)}`);
  });
  renderTree();
  // Closing the last file leaves the editor for the list of projects.
  page.addEventListener('dslkit:close', () => go('dashboard.html'));

  // The code of the editor with its title and notation, the same for a project and for a template.
  const describe = () => {
    const source = readCode(codeLines);
    const model = parseDiagram(source);
    return { source, title: model.title || TEXTS.untitled[lang], notation: model.notation ?? 'idef0' };
  };
  const saveTemplate = (id) => {
    const saved = templates.save({ id, ...describe() });
    if (note) note.textContent = TEXTS.templateSaved[lang].replace('{title}', saved.title);
    return saved;
  };
  const save = () => {
    if (template) {
      template = saveTemplate(template.id);
      lastSaved = template.source;
      name(template.title);
      return template;
    }
    const { source, title, notation } = describe();
    project = store.save({ id: project?.id, title, notation, source });
    lastSaved = source;
    name(project.title);
    params.set('p', project.id);
    params.delete('template');
    view.history.replaceState(null, '', `${view.location.pathname}?${params}`);
    carryQuery();
    renderTree();
    if (note) note.textContent = TEXTS.saved[lang].replace('{title}', project.title);
    return project;
  };

  const schedule = () => {
    if (timer !== null) clearTimer(timer);
    timer = setTimer(() => {
      timer = null;
      if (readCode(codeLines) !== (lastSaved ?? baseline) && (!switchButton || switchButton.getAttribute('aria-checked') === 'true')) save();
    }, PROJECT_AUTOSAVE_MS);
  };
  new view.MutationObserver(schedule).observe(codeLines, { childList: true, subtree: true, characterData: true });
  page.addEventListener('dslkit:save', save);
  page.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="save-template"]')) saveTemplate();
  });

  return { save, current: () => project, store };
};
