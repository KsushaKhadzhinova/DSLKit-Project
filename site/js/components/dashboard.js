import { NOTATIONS, NOTATION_KEYS, TEMPLATES, parseDiagram } from '../notations/index.js';
import { currentUser } from '../storage/accounts.js';
import { createProjectStore, createTemplateStore, showQuota } from '../storage/projects.js';

const FILTERS = ['all', ...NOTATION_KEYS];
const SORTS = ['newest', 'oldest', 'name'];
const SECTIONS = ['mine', 'templates', 'shared', 'trash'];

const LABELS = {
  ru: {
    found: (count) => `Найдено проектов: ${count}`,
    none: 'Проектов не найдено',
    changed: (time) => `Изменён ${time}`,
    sample: 'Общий пример',
    published: 'опубликован',
    saveTemplate: 'Сохранить как шаблон',
    edit: 'Изменить шаблон',
    removeTemplate: 'Удалить шаблон',
    askNewTemplate: 'Название нового шаблона',
    askRemoveTemplate: (title) => `Удалить шаблон «${title}»? Это нельзя отменить.`,
    foundTemplates: (count) => `Найдено шаблонов: ${count}`,
    noneTemplates: 'Шаблонов не найдено. Сохраните проект как шаблон или создайте новый.',
    trashed: (time) => `Удалён ${time}`,
    rename: 'Переименовать',
    remove: 'В корзину',
    restore: 'Восстановить',
    purge: 'Удалить навсегда',
    copy: 'Сохранить копию в «Мои проекты»',
    askName: 'Новое название проекта',
    askTrash: (title) => `Переместить проект «${title}» в корзину?`,
    askPurge: (title) => `Удалить проект «${title}» навсегда? Это нельзя отменить.`,
    actions: (title) => `Действия с проектом ${title}`,
    titles: { mine: 'Мои проекты', templates: 'Мои шаблоны', shared: 'Общие примеры', trash: 'Корзина' },
  },
  en: {
    found: (count) => `Projects found: ${count}`,
    none: 'No projects found',
    changed: (time) => `Changed ${time}`,
    sample: 'Shared example',
    published: 'published',
    saveTemplate: 'Save as a template',
    edit: 'Edit the template',
    removeTemplate: 'Delete the template',
    askNewTemplate: 'Name of the new template',
    askRemoveTemplate: (title) => `Delete the template "${title}"? This cannot be undone.`,
    foundTemplates: (count) => `Templates found: ${count}`,
    noneTemplates: 'No templates found. Save a project as a template or create a new one.',
    trashed: (time) => `Deleted ${time}`,
    rename: 'Rename',
    remove: 'Move to trash',
    restore: 'Restore',
    purge: 'Delete forever',
    copy: 'Save a copy to "My projects"',
    askName: 'New project name',
    askTrash: (title) => `Move the project "${title}" to the trash?`,
    askPurge: (title) => `Delete the project "${title}" forever? This cannot be undone.`,
    actions: (title) => `Actions for the project ${title}`,
    titles: { mine: 'My projects', templates: 'My templates', shared: 'Shared examples', trash: 'Trash' },
  },
};

const normalize = (saved) => ({
  filter: FILTERS.includes(saved?.filter) ? saved.filter : 'all',
  query: typeof saved?.query === 'string' ? saved.query : '',
  sort: SORTS.includes(saved?.sort) ? saved.sort : 'newest',
});

const HOUR = 3600000;
// The diagrams of the first visit: one of the first notations each, changed at different times, some of them published.
const SEED_PLAN = [
  ['idef0', 2 * HOUR, true],
  ['bpmn', 26 * HOUR, false],
  ['uml-class', 3 * 24 * HOUR, true],
  ['erd', 6 * 24 * HOUR, false],
  ['dfd', 12 * 24 * HOUR, true],
  ['petri', 30 * 24 * HOUR, false],
];

export const initDashboard = ({ root = document, storage, now = () => Date.now(), seed = true, navigate } = {}) => {
  const list = root.querySelector('#project-list');
  if (!list) return null;

  const view = root.defaultView;
  const lang = root.documentElement.lang === 'ru' ? 'ru' : 'en';
  const labels = LABELS[lang];
  const owner = currentUser(storage)?.id ?? null;
  const store = createProjectStore({ storage, now, owner });
  const templates = createTemplateStore({ storage, now, owner });
  const go = navigate ?? ((url) => view.location.assign(url));
  if (seed) {
    store.seed(
      SEED_PLAN.map(([key, age, published]) => ({
        title: parseDiagram(TEMPLATES[key]).title,
        notation: key,
        source: TEMPLATES[key],
        age,
        published,
      })),
    );
  }
  const chips = [...root.querySelectorAll('.filter__chip[data-filter]')];
  const others = root.querySelector('#notation-filter');
  const search = root.querySelector('.app-topbar__search-input');
  const sortSelect = root.querySelector('#project-sort');
  const count = root.querySelector('#project-count');
  const heading = root.querySelector('.dashboard__title');
  const newTemplate = root.querySelector('[data-new-template]');
  const navigation = [...root.querySelectorAll('[data-section]')];
  const quotaText = root.querySelector('.app-nav__quota-text');
  const quotaBar = root.querySelector('.app-nav__progress');
  const title = (item) => item.querySelector('.project-card__link').textContent.trim();
  const el = (tag, className, text) => {
    const node = root.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (act, text) => {
    const node = el('button', 'button button--quiet', text);
    node.type = 'button';
    node.dataset.act = act;
    return node;
  };
  const time = (ms) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ');

  // A card of a saved project, built like the sample cards of the page. A project in the trash cannot be opened.
  const card = (project, kind = 'project') => {
    const trashed = kind === 'trash';
    const item = el('li', 'project-list__item');
    if (kind === 'template') item.dataset.template = project.id;
    else item.dataset.project = project.id;
    if (trashed) item.dataset.trashed = 'yes';
    item.dataset.notation = FILTERS.includes(project.notation) ? project.notation : 'other';
    const article = el('article', 'project-card');
    const headingBox = el('h2', 'project-card__title');
    const link = el('a', 'project-card__link', project.title);
    if (trashed) link.setAttribute('aria-disabled', 'true');
    else link.href = `editor.html?${kind === 'template' ? 'my' : 'p'}=${encodeURIComponent(project.id)}`;
    headingBox.append(link);
    const tag = el('p', 'project-card__notation');
    tag.append(el('span', 'project-card__tag', NOTATIONS[project.notation]?.short ?? project.notation.toUpperCase()));
    if (project.published) tag.append(' ', el('span', 'badge', labels.published));
    const stamp = trashed ? labels.trashed(time(project.trashedAt)) : labels.changed(time(project.updated));
    article.append(el('div', 'project-card__preview'), headingBox, tag, el('p', 'project-card__updated', stamp));
    item.append(article);
    return item;
  };

  // Every card gets a menu: a saved project can be renamed and moved to the trash, a project in the trash restored or deleted for good,
  // a shared example copied to the saved projects.
  const addMenu = (item) => {
    const article = item.querySelector('.project-card');
    let menu = article.querySelector('.project-card__menu');
    if (!menu) {
      menu = el('button', 'project-card__menu');
      menu.type = 'button';
      menu.textContent = '⋯';
      article.append(menu);
    }
    menu.setAttribute('aria-label', labels.actions(title(item)));
    menu.setAttribute('aria-expanded', 'false');
    const actions = el('div', 'project-card__actions');
    actions.hidden = true;
    if (item.dataset.trashed) actions.append(button('restore', labels.restore), button('purge', labels.purge));
    else if (item.dataset.project) actions.append(button('rename', labels.rename), button('template', labels.saveTemplate), button('remove', labels.remove));
    else if (item.dataset.template)
      actions.append(button('rename', labels.rename), button('edit', labels.edit), button('remove-template', labels.removeTemplate));
    else actions.append(button('copy', labels.copy));
    article.append(actions);
  };

  // One shared example for every notation of the editor, the page asks for them with the attribute data-examples.
  const examples = () => {
    if (list.dataset.examples === undefined) return;
    NOTATION_KEYS.forEach((key) => {
      const item = el('li', 'project-list__item');
      item.dataset.notation = key;
      const article = el('article', 'project-card');
      const headingBox = el('h2', 'project-card__title');
      const link = el('a', 'project-card__link', parseDiagram(TEMPLATES[key]).title);
      link.href = `editor.html?template=${key}`;
      headingBox.append(link);
      const tag = el('p', 'project-card__notation');
      tag.append(el('span', 'project-card__tag', NOTATIONS[key].short));
      article.append(el('div', 'project-card__preview'), headingBox, tag, el('p', 'project-card__updated'));
      item.append(article);
      list.append(item);
    });
  };
  examples();

  let original = [];
  const collect = () => {
    original = [...list.querySelectorAll('.project-list__item')];
    original
      .filter((item) => !item.querySelector('.project-card__actions'))
      .forEach((item) => {
        const stamp = item.querySelector('.project-card__updated');
        if (stamp && !item.dataset.project) stamp.textContent = labels.sample;
        addMenu(item);
      });
  };
  const rebuild = () => {
    list.querySelectorAll('[data-project], [data-template]').forEach((item) => item.remove());
    store
      .listTrash()
      .reverse()
      .forEach((project) => list.prepend(card(project, 'trash')));
    templates
      .list()
      .reverse()
      .forEach((template) => list.prepend(card(template, 'template')));
    store
      .list()
      .reverse()
      .forEach((project) => list.prepend(card(project)));
    collect();
  };
  rebuild();

  // The notations without a chip are chosen from a list.
  const chipKeys = new Set(chips.map((chip) => chip.dataset.filter));
  if (others) {
    NOTATION_KEYS.filter((key) => !chipKeys.has(key)).forEach((key) => {
      const option = el('option', '', NOTATIONS[key].name[lang === 'ru' ? 'ru' : 'en']);
      option.value = key;
      others.append(option);
    });
    others.addEventListener('change', () => update({ filter: others.value === '' ? 'all' : others.value }));
  }

  const fromAddress = new view.URLSearchParams(view.location.search).get('q');
  let state = normalize(storage.get('dashboard'));
  if (fromAddress !== null) state.query = fromAddress;
  let section = 'mine';
  const sectionOf = (item) => {
    if (item.dataset.trashed) return 'trash';
    if (item.dataset.template) return 'templates';
    return item.dataset.project ? 'mine' : 'shared';
  };

  const sorted = () => {
    if (state.sort === 'oldest') return [...original].reverse();
    if (state.sort === 'name') return [...original].sort((a, b) => title(a).localeCompare(title(b)));
    return original;
  };

  const render = () => {
    const query = state.query.trim().toLowerCase();
    let shown = 0;
    original.forEach((item) => {
      const matches =
        sectionOf(item) === section && (state.filter === 'all' || item.dataset.notation === state.filter) && title(item).toLowerCase().includes(query);
      item.hidden = !matches;
      if (matches) shown += 1;
    });
    sorted().forEach((item) => list.append(item));
    chips.forEach((chip) => {
      const active = chip.dataset.filter === state.filter;
      chip.setAttribute('aria-pressed', String(active));
      chip.classList.toggle('filter__chip--active', active);
    });
    navigation.forEach((node) => {
      if (node.dataset.section === section) node.setAttribute('aria-current', 'page');
      else node.removeAttribute('aria-current');
    });
    if (heading) heading.textContent = labels.titles[section];
    if (others) others.value = chipKeys.has(state.filter) ? '' : state.filter;
    if (search) search.value = state.query;
    if (sortSelect) sortSelect.value = state.sort;
    if (newTemplate) newTemplate.hidden = section !== 'templates';
    if (count) {
      const own = section === 'templates';
      if (shown > 0) count.textContent = own ? labels.foundTemplates(shown) : labels.found(shown);
      else count.textContent = own ? labels.noneTemplates : labels.none;
    }
    showQuota(quotaText, quotaBar, store.createdOn(), lang);
    storage.set('dashboard', state);
  };

  const update = (change) => {
    state = normalize({ ...state, ...change });
    render();
  };
  const show = (name) => {
    if (!SECTIONS.includes(name)) return false;
    section = name;
    render();
    return true;
  };

  chips[0]?.parentElement.addEventListener('click', (event) => {
    const chip = event.target.closest('.filter__chip[data-filter]');
    if (chip) update({ filter: chip.dataset.filter });
  });
  search?.addEventListener('input', () => update({ query: search.value }));
  sortSelect?.addEventListener('change', () => update({ sort: sortSelect.value }));
  navigation.forEach((node) =>
    node.addEventListener('click', (event) => {
      event.preventDefault();
      show(node.dataset.section);
    }),
  );

  const act = (action, item) => {
    const id = item.dataset.project ?? item.dataset.template;
    if (action === 'rename') {
      const name = view.prompt(labels.askName, title(item));
      const done = item.dataset.template ? templates.rename(id, name ?? '') : store.rename(id, name ?? '');
      if (done === null) return false;
    } else if (action === 'template') {
      const project = store.get(id);
      templates.save({ title: project.title, notation: project.notation, source: project.source });
    } else if (action === 'edit') {
      go(`editor.html?tpl=${encodeURIComponent(id)}`);
      return true;
    } else if (action === 'remove-template') {
      if (!view.confirm(labels.askRemoveTemplate(title(item)))) return false;
      templates.remove(id);
    } else if (action === 'remove') {
      if (!view.confirm(labels.askTrash(title(item)))) return false;
      store.trash(id);
    } else if (action === 'restore') store.restore(id);
    else if (action === 'purge') {
      if (!view.confirm(labels.askPurge(title(item)))) return false;
      store.remove(id);
    } else {
      const key = new view.URL(item.querySelector('.project-card__link').href).searchParams.get('template');
      store.save({ title: title(item), notation: item.dataset.notation, source: TEMPLATES[key] ?? TEMPLATES.idef0 });
    }
    rebuild();
    render();
    return true;
  };
  newTemplate?.addEventListener('click', () => {
    const name = view.prompt(labels.askNewTemplate, '');
    if (name === null || name.trim() === '') return;
    const template = templates.save({ title: name, notation: 'idef0', source: TEMPLATES.idef0 });
    go(`editor.html?tpl=${encodeURIComponent(template.id)}`);
  });
  list.addEventListener('click', (event) => {
    const menu = event.target.closest('.project-card__menu');
    if (menu) {
      const actions = menu.closest('.project-card').querySelector('.project-card__actions');
      actions.hidden = !actions.hidden;
      menu.setAttribute('aria-expanded', String(!actions.hidden));
      return;
    }
    const target = event.target.closest('[data-act]');
    if (target) act(target.dataset.act, target.closest('.project-list__item'));
  });

  render();

  return { state: () => ({ ...state }), update, store, templates, show, section: () => section };
};
