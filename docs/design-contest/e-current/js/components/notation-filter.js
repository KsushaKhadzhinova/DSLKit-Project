const FILTERS = ['all', 'beta', 'planned'];

const LABELS = {
  ru: {
    group: 'Фильтр по статусу',
    chips: { all: 'Все', beta: 'В бете', planned: 'В планах' },
    shown: (count, total) => `Показано ${count} из ${total}`,
  },
  en: {
    group: 'Filter by status',
    chips: { all: 'All', beta: 'In beta', planned: 'Planned' },
    shown: (count, total) => `Showing ${count} of ${total}`,
  },
};

const createChip = (doc, name, text) => {
  const chip = doc.createElement('button');
  chip.type = 'button';
  chip.className = 'filter__chip';
  chip.dataset.filter = name;
  chip.textContent = text;
  return chip;
};

export const initNotationFilter = ({ root = document, storage } = {}) => {
  const list = root.querySelector('#notations-list');
  const items = list ? [...list.querySelectorAll('li[data-status]')] : [];
  if (items.length === 0) return null;

  const labels = LABELS[root.documentElement.lang === 'ru' ? 'ru' : 'en'];
  const doc = list.ownerDocument;

  const group = doc.createElement('div');
  group.className = 'filter';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', labels.group);
  const chips = FILTERS.map((name) => createChip(doc, name, labels.chips[name]));
  group.append(...chips);

  const status = doc.createElement('p');
  status.className = 'visually-hidden';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  list.before(group, status);

  let current = 'all';

  const select = (name) => {
    current = FILTERS.includes(name) ? name : 'all';
    let shown = 0;
    items.forEach((item) => {
      item.hidden = !(current === 'all' || item.dataset.status === current);
      if (!item.hidden) shown += 1;
    });
    chips.forEach((chip) => {
      const active = chip.dataset.filter === current;
      chip.setAttribute('aria-pressed', String(active));
      chip.classList.toggle('filter__chip--active', active);
    });
    status.textContent = labels.shown(shown, items.length);
    storage.set('notation-filter', current);
  };

  group.addEventListener('click', (event) => {
    const chip = event.target.closest('button[data-filter]');
    if (chip) select(chip.dataset.filter);
  });

  select(storage.get('notation-filter', 'all'));

  return { select, current: () => current };
};
