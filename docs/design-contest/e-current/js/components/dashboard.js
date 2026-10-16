const FILTERS = ['all', 'bpmn', 'erd', 'dfd', 'idef0'];
const SORTS = ['newest', 'oldest', 'name'];

const LABELS = {
  ru: { found: (count) => `Найдено проектов: ${count}`, none: 'Проектов не найдено' },
  en: { found: (count) => `Projects found: ${count}`, none: 'No projects found' },
};

const normalize = (saved) => ({
  filter: FILTERS.includes(saved?.filter) ? saved.filter : 'all',
  query: typeof saved?.query === 'string' ? saved.query : '',
  sort: SORTS.includes(saved?.sort) ? saved.sort : 'newest',
});

export const initDashboard = ({ root = document, storage } = {}) => {
  const list = root.querySelector('#project-list');
  if (!list) return null;

  const labels = LABELS[root.documentElement.lang === 'ru' ? 'ru' : 'en'];
  const original = [...list.querySelectorAll('.project-list__item')];
  const chips = [...root.querySelectorAll('.filter__chip[data-filter]')];
  const search = root.querySelector('.app-topbar__search-input');
  const sortSelect = root.querySelector('#project-sort');
  const count = root.querySelector('#project-count');
  const title = (item) => item.querySelector('.project-card__link').textContent.trim();

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

  render();

  return { state: () => ({ ...state }), update };
};
