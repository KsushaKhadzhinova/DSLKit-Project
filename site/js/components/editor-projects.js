// @ts-nocheck -- type-check debt: remove this line when the file passes npm run typecheck
import { readCode, showCode } from './code-lines.js';
import { notify } from './toast.js';
import { TEMPLATE_LANGS, parseDiagram, templateFor } from '../notations/index.js';
import { currentUser } from '../storage/accounts.js';
import { can } from '../auth/permissions.js';
import { starterProjects } from '../storage/seeds.js';
import { createProjectStore, createTemplateStore, showQuota, titleOf } from '../storage/projects.js';
import { pageLanguage } from '../utils/lang.js';

const TEXTS = {
  saved: { ru: 'Сохранено в «Мои проекты»: {title}', en: 'Saved to "My projects": {title}' },
  notFound: { ru: 'Проект не найден, открыта новая диаграмма.', en: 'The project is not found, a new diagram is open.' },
  templateSaved: { ru: 'Шаблон сохранён в «Мои шаблоны»: {title}', en: 'Template saved to "My templates": {title}' },
  templateDeleted: {
    ru: 'Этот шаблон удалён в другой вкладке. Правка не сохранена, сохраните её как новый шаблон или проект.',
    en: 'This template was deleted in another tab. The change is not saved; save it as a new template or project.',
  },
  editingTemplate: { ru: 'Шаблон (изменение)', en: 'Template (editing)' },
  limit: {
    ru: 'Лимит беты: 5 новых диаграмм в день. Проект не сохранён, завтра лимит обновится.',
    en: 'Beta limit: 5 new diagrams a day. The project is not saved, the limit renews tomorrow.',
  },
  fresh: { ru: 'Новая диаграмма (не сохранена)', en: 'New diagram (not saved)' },
  storage: {
    ru: 'Не сохранено: хранилище браузера переполнено или отключено. Освободите место (удалите ненужные проекты) и повторите.',
    en: 'Not saved: the browser storage is full or off. Free some space (delete projects you do not need) and try again.',
  },
  gone: {
    ru: 'Этот проект удалён в другой вкладке. Правка не сохранена, сохраните её как новый проект.',
    en: 'This project was deleted in another tab. The change is not saved; save it as a new project.',
  },
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
  const lang = pageLanguage(root);
  const user = currentUser(storage);
  const owner = user?.id ?? null;
  const store = createProjectStore({ storage, now, owner, unlimited: can(user, 'diagram.unlimited') });
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
    name(titleOf(project, lang));
    lastSaved = project.source;
  } else {
    const key = params.get('template');
    // templateFor looks only at own keys, so an address such as ?template=__proto__ or ?template=constructor does not reach an
    // inherited property, which is not a diagram source and breaks the rest of this component.
    // ?tl=<ru|en> picks the language of the starter, the language of the page is the default.
    const tl = TEMPLATE_LANGS.includes(params.get('tl')) ? params.get('tl') : lang;
    baseline = start?.source ?? templateFor(key, tl) ?? templateFor('idef0', tl);
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
    showQuota(quotaText, quotaBar, store.createdOn(), lang, can(user, 'diagram.unlimited'));
    if (!tree) return;
    const rows = store.list().map((item) => ({ id: item.id, label: fileName(titleOf(item, lang)), active: item.id === project?.id }));
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
    return { source, title: model.title, notation: model.notation ?? 'idef0' };
  };
  const saveTemplate = (id) => {
    const saved = templates.save({ id, ...describe() });
    if (!saved) {
      const saidDeleted = saved === false ? TEXTS.storage[lang] : TEXTS.templateDeleted[lang];
      if (note) note.textContent = saidDeleted;
      notify(root, saidDeleted, 'error');
      return null;
    }
    const saidTemplate = TEXTS.templateSaved[lang].replace('{title}', titleOf(saved, lang));
    if (note) note.textContent = saidTemplate;
    notify(root, saidTemplate, 'success');
    return saved;
  };
  const save = () => {
    if (template) {
      const saved = saveTemplate(template.id);
      if (saved === null) return null;
      template = saved;
      lastSaved = template.source;
      name(titleOf(template, lang));
      return template;
    }
    const { source, title, notation } = describe();
    const saved = store.save({ id: project?.id, title, notation, source });
    if (!saved) {
      const text = saved === null ? TEXTS.limit[lang] : saved === false ? TEXTS.storage[lang] : TEXTS.gone[lang];
      // One message: the plain "ready" note of the drawing must not stand next to "not saved".
      if (note) note.textContent = text;
      const canvasNote = page.querySelector('.canvas__status');
      if (canvasNote) {
        canvasNote.textContent = text;
        canvasNote.dataset.state = 'note';
      }
      notify(root, text, 'error');
      return null;
    }
    project = saved;
    lastSaved = source;
    name(titleOf(project, lang));
    params.set('p', project.id);
    params.delete('template');
    view.history.replaceState(null, '', `${view.location.pathname}?${params}`);
    carryQuery();
    renderTree();
    if (note) note.textContent = TEXTS.saved[lang].replace('{title}', titleOf(project, lang));
    return project;
  };

  const maybeSave = () => {
    if (readCode(codeLines) !== (lastSaved ?? baseline) && (!switchButton || switchButton.getAttribute('aria-checked') === 'true')) save();
  };
  const schedule = () => {
    if (timer !== null) clearTimer(timer);
    timer = setTimer(() => {
      timer = null;
      maybeSave();
    }, PROJECT_AUTOSAVE_MS);
  };
  new view.MutationObserver(schedule).observe(codeLines, { childList: true, subtree: true, characterData: true });
  page.addEventListener('dslkit:save', save);
  // Signing in or out in another tab changes the owner of the projects: the pending change is kept for the old owner, then the page opens again
  // for the new one, so a save never lands in the wrong account.
  view.addEventListener?.('storage', (event) => {
    if (event.key !== null && !/(^|\.)sessions?$/.test(event.key)) return;
    if ((currentUser(storage)?.id ?? null) === owner) return;
    if (timer !== null) clearTimer(timer);
    timer = null;
    maybeSave();
    go(view.location.pathname);
  });
  // A click on a language link or on "sign out" leaves the page before the autosave timer fires; pagehide
  // flushes the pending change first so the last second of editing is never lost.
  view.addEventListener?.('pagehide', () => {
    if (timer !== null) clearTimer(timer);
    timer = null;
    maybeSave();
  });
  page.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="save-template"]')) saveTemplate();
  });

  return { save, current: () => project, store };
};
