import { TEMPLATES } from '../notations/index.js';
import { createProjectStore } from '../storage/projects.js';

const FILTERS = ['all', 'bpmn', 'erd', 'dfd', 'idef0'];
const SORTS = ['newest', 'oldest', 'name'];

const LABELS = {
  ru: {
    found: (count) => `Найдено проектов: ${count}`,
    none: 'Проектов не найдено',
    changed: (time) => `Изменён ${time}`,
    rename: 'Переименовать',
    remove: 'Удалить',
    copy: 'Сохранить копию в «Мои проекты»',
    askName: 'Новое название проекта',
    askRemove: (title) => `Удалить проект «${title}»?`,
    actions: (title) => `Действия с проектом ${title}`,
  },
  en: {
    found: (count) => `Projects found: ${count}`,
    none: 'No projects found',
    changed: (time) => `Changed ${time}`,
    rename: 'Rename',
    remove: 'Delete',
    copy: 'Save a copy to "My projects"',
    askName: 'New project name',
    askRemove: (title) => `Delete the project "${title}"?`,
    actions: (title) => `Actions for the project ${title}`,
  },
};

const normalize = (saved) => ({
  filter: FILTERS.includes(saved?.filter) ? saved.filter : 'all',
  query: typeof saved?.query === 'string' ? saved.query : '',
  sort: SORTS.includes(saved?.sort) ? saved.sort : 'newest',
});

export const initDashboard = ({ root = document, storage, now = () => Date.now() } = {}) => {
  const list = root.querySelector('#project-list');
  if (!list) return null;

  const view = root.defaultView;
  const lang = root.documentElement.lang === 'ru' ? 'ru' : 'en';
  const labels = LABELS[lang];
  const store = createProjectStore({ storage, now });
  const chips = [...root.querySelectorAll('.filter__chip[data-filter]')];
  const search = root.querySelector('.app-topbar__search-input');
  const sortSelect = root.querySelector('#project-sort');
  const count = root.querySelector('#project-count');
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

  // A card of a saved project, built like the sample cards of the page.
  const card = (project) => {
    const item = el('li', 'project-list__item');
    item.dataset.project = project.id;
    item.dataset.notation = FILTERS.includes(project.notation) ? project.notation : 'other';
    const article = el('article', 'project-card');
    const heading = el('h2', 'project-card__title');
    const link = el('a', 'project-card__link', project.title);
    link.href = `editor.html?p=${encodeURIComponent(project.id)}`;
    heading.append(link);
    const tag = el('p', 'project-card__notation');
    tag.append(el('span', 'project-card__tag', project.notation.toUpperCase()));
    article.append(el('div', 'project-card__preview'), heading, tag, el('p', 'project-card__updated', labels.changed(time(project.updated))));
    item.append(article);
    return item;
  };

  // Every card gets a menu: a saved project can be renamed and deleted, a sample can be copied to the saved ones.
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
    if (item.dataset.project) actions.append(button('rename', labels.rename), button('remove', labels.remove));
    else actions.append(button('copy', labels.copy));
    article.append(actions);
  };

  let original = [];
  const collect = () => {
    original = [...list.querySelectorAll('.project-list__item')];
    original.filter((item) => !item.querySelector('.project-card__actions')).forEach(addMenu);
  };
  const rebuild = () => {
    list.querySelectorAll('[data-project]').forEach((item) => item.remove());
    store
      .list()
      .reverse()
      .forEach((project) => list.prepend(card(project)));
    collect();
  };
  rebuild();

  let state = normalize(storage.get('dashboard'));

  const sorted = () => {
    if (state.sort === 'oldest') return [...original].reverse();
    if (state.sort === 'name') return [...original].sort((a, b) => title(a).localeCompare(title(b)));
    return original;
  };

  const render = () => {
    const query = state.query.trim().toLowerCase();
    let shown = 0;
    original.forEach((item) => {
      const matches = (state.filter === 'all' || item.dataset.notation === state.filter) && title(item).toLowerCase().includes(query);
      item.hidden = !matches;
      if (matches) shown += 1;
    });
    sorted().forEach((item) => list.append(item));
    chips.forEach((chip) => {
      const active = chip.dataset.filter === state.filter;
      chip.setAttribute('aria-pressed', String(active));
      chip.classList.toggle('filter__chip--active', active);
    });
    if (search) search.value = state.query;
    if (sortSelect) sortSelect.value = state.sort;
    if (count) count.textContent = shown > 0 ? labels.found(shown) : labels.none;
    storage.set('dashboard', state);
  };

  const update = (change) => {
    state = normalize({ ...state, ...change });
    render();
  };

  chips[0]?.parentElement.addEventListener('click', (event) => {
    const chip = event.target.closest('.filter__chip[data-filter]');
    if (chip) update({ filter: chip.dataset.filter });
  });
  search?.addEventListener('input', () => update({ query: search.value }));
  sortSelect?.addEventListener('change', () => update({ sort: sortSelect.value }));

  const act = (action, item) => {
    const id = item.dataset.project;
    if (action === 'rename') {
      const name = view.prompt(labels.askName, title(item));
      if (name === null || store.rename(id, name) === null) return false;
    } else if (action === 'remove') {
      if (!view.confirm(labels.askRemove(title(item)))) return false;
      store.remove(id);
    } else {
      const key = new view.URL(item.querySelector('.project-card__link').href).searchParams.get('template');
      store.save({ title: title(item), notation: item.dataset.notation, source: TEMPLATES[key] ?? TEMPLATES.idef0 });
    }
    rebuild();
    render();
    return true;
  };
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

  return { state: () => ({ ...state }), update, store };
};
