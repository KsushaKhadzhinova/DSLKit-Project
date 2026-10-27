# Laboratory Work No. 5. Building an Interactive Interface with JavaScript

## 1 Purpose of the Work

To master the basics of JavaScript and DOM work, to learn to handle events, validate forms and store state in LocalStorage on the example of the DSLKit project, a web editor for diagrams as code that belongs to the SaaS direction and matches the future course project.

## 2 Brief Theoretical Background

**DOM.** The Document Object Model represents a page as a tree of nodes. A script finds nodes with `getElementById`, `querySelector` and `querySelectorAll`, changes text with `textContent`, attributes with `setAttribute`, classes with `classList`, and creates nodes with `createElement`.

**Events.** Handlers are attached with `addEventListener`. An event bubbles from the target element to its parents, so one handler on a container serves many elements: this technique is called delegation, and `event.target.closest` finds the needed element.

**Forms and validation.** The `submit` event is cancelled with `preventDefault`, values are checked by code, and error messages are shown next to the fields.

**LocalStorage.** Browser storage keeps strings under keys. Objects are saved with `JSON.stringify` and read with `JSON.parse`, and access and parsing errors are handled by a `try/catch` block.

**ES6+ and modules.** The code uses `const` and `let`, arrow functions, template literals, destructuring and `import` and `export` modules.

## 3 Work Progress

### 3.1 Branch and File Structure

The work is done in the branch `feature/javascript-interactivity`. The script structure matches the assignment and is shown in table 1. The main file `script.js` is connected at the end of `body` as a module: `type="module"`.

Table 1 – JavaScript structure of the DSLKit project

| File | Purpose |
|---|---|
| `js/script.js` | Entry point: starts the components that find their markup on the page |
| `js/utils/storage.js` | Safe LocalStorage wrapper with an in-memory fallback |
| `js/utils/validation.js` | Pure functions that check name, email, team size, notation and consent |
| `js/components/theme.js` | Theme switching and saving |
| `js/components/burger.js` | Closing the menu with Escape and after following a link |
| `js/components/accordion.js` | Collapsible questions with one open at a time |
| `js/components/notation-filter.js` | Filter of notation cards |
| `js/components/waitlist-form.js` | Beta signup form with validation |
| `js/components/dashboard.js` | Filter, search and sorting of projects |
| `js/components/settings.js` | Saving of settings |
| `js/components/editor.js` | Tabs, dialog, autosave, view switch |

### 3.2 Working with the DOM

Elements are found by identifiers and selectors, found nodes are checked for `null`, and repeated lookups in loops are replaced by references in variables. The notation filter builds buttons and a status area with `createElement` and sets text with `textContent`, so no user input reaches the markup. Card visibility changes with the `hidden` attribute, and button state with `aria-pressed` and the class `filter__chip--active`.

### 3.3 Events

Five event types are used: `click` (filters, tabs, buttons), `input` (search and field checks), `change` (sorting, settings, theme), `submit` (the form) and `keydown` (arrows on tabs, the Escape key, the Ctrl and Enter combination). The `toggle` event for questions and the `close` event for the dialog are applied too. Delegation serves the filter buttons, the tabs and the settings.

### 3.4 Interactive Components

Eight components are implemented, and each uses events and keeps state in LocalStorage.

The notation filter on the home page splits six cards into the groups "in beta" and "planned". The chosen filter is saved, and an `aria-live` area announces the number of shown cards. The result is shown in figure 1.

![Notation filter on the home page](figures/notation-filter.jpg)

Figure 1 – Notation filter: the status "In beta" is chosen and three cards are shown

The beta signup form cancels the default submit, checks all fields and shows error messages next to the fields. Wrong fields get `aria-invalid`, focus moves to the first of them, and an error disappears as soon as the value becomes valid. The result is shown in figure 2.

![Validation of the beta signup form](figures/form-validation.jpg)

Figure 2 – Form validation: an empty name and a wrong email are highlighted and messages appear under the fields

With valid data the request is added to a list in LocalStorage, a message goes to the console, and the browser opens the page `thanks.html`. The data never reaches the page address.

The project list on the dashboard screen supports a notation filter, search by title and sorting. The state is saved, and an `aria-live` area announces the number of found projects. The result is shown in figure 3.

![Filter and search of projects on the dashboard](figures/dashboard-filter.jpg)

Figure 3 – Dashboard: the IDEF0 filter, the search text "ord" and sorting by name give one project

The editor switches tabs with the mouse and arrows, shows an unsaved-changes dialog when a file is closed, toggles autosave and switches the Code and Canvas view on a phone. The dialog is shown in figure 4.

![Unsaved-changes dialog in the editor](figures/editor-dialog.jpg)

Figure 4 – Editor: the native dialog when closing a file with unsaved changes

The remaining components: the theme switch remembers the choice and applies it on every page, the FAQ accordion keeps one answer open and remembers it, the settings keep the position of switches and lists, and the menu closes with the Escape key.

### 3.5 Saving State

State lives in LocalStorage under keys with the prefix `dslkit.`: the theme, the notation filter, the open question, requests, the dashboard state, settings, and the editor tab and view. The module `storage.js` wraps reads and writes in `try/catch` and returns a fallback value on an access error or corrupted data. When LocalStorage is unavailable, in-memory storage is used.

### 3.6 Error Handling and ES6+

Reading and writing data is protected by `try/catch` blocks, and the entry point starts each component separately: the error of one component goes to the console and does not stop the others. The code uses `const` and `let`, arrow functions, template literals, destructuring and modules. Handlers are attached with `addEventListener`, and `onclick` attributes are not used.

### 3.7 Testing

Automated jsdom tests are written for every module and parse the real pages of the site. The tests check filters, the form with valid and invalid data, state restoration after a reload, storage errors and missing markup. Coverage of all JavaScript files is 100 percent for lines, branches and functions. The components are additionally checked in Chrome: the console has no errors, a request lands in LocalStorage, and the theme persists between pages. Testing in Firefox and Edge and a screenshot of the Event Listeners tab of the developer tools remain a task for the acceptance stage.

### 3.8 Committing the Changes

The commit with the implementation: https://github.com/KsushaKhadzhinova/DSLKit-Project/commit/39efd4f. The commit message: `feat: add JavaScript interactivity for a SaaS diagram editor`.

### 3.9 Checking in DevTools

The page was checked in Chrome 155: the Elements panel shows the event handlers and the Application panel shows the saved data.

The event handlers are shown in Figure 5: the click, change and keydown listeners of the notation filter button are attached to the common container, so delegation is used.

![DevTools screenshot](figures/devtools-01-event-listeners.png)

Figure 5 – The Elements panel, the Event Listeners tab for a filter button

The console check is shown in Figure 6: getEventListeners returns the listeners of the container, and the notation list holds six cards.

![DevTools screenshot](figures/devtools-02-console.png)

Figure 6 – Console: the listeners of the filter container and the card count

The saved state is shown in Figure 7: after the form is submitted, LocalStorage holds keys with the dslkit prefix, among them dslkit.notation-filter and dslkit.waitlist.

![DevTools screenshot](figures/devtools-03-local-storage.png)

Figure 7 – The Application panel: site LocalStorage

## Conclusion

Modular JavaScript is written for the DSLKit project: an entry point, storage and validation utilities and eight interactive components. Five event types and delegation are used, the form is validated with clear messages, and state is saved in LocalStorage and restored after a reload. Automated tests cover all the code, and the components are confirmed in a browser. What remains is to check the pages in Firefox and Edge.

## Appendix A – Listing of script.js

```js
import { initAccordion } from './components/accordion.js';
import { initBurger } from './components/burger.js';
import { initCanvasDrag } from './components/canvas-drag.js';
import { initDashboard } from './components/dashboard.js';
import { initDiagramRunner } from './components/diagram-runner.js';
import { initEditor } from './components/editor.js';
import { initEditorActions } from './components/editor-actions.js';
import { initEditorTools } from './components/editor-tools.js';
import { initExport } from './components/export-menu.js';
import { initImport } from './components/import-menu.js';
import { registerServiceWorker } from './components/pwa.js';
import { initNotationFilter } from './components/notation-filter.js';
import { initSettings } from './components/settings.js';
import { initTheme } from './components/theme.js';
import { initTour } from './components/tour.js';
import { initWaitlistForm } from './components/waitlist-form.js';
import { getStorage } from './utils/storage.js';

export const COMPONENTS = [
  initTheme,
  initBurger,
  initAccordion,
  initNotationFilter,
  initWaitlistForm,
  initDashboard,
  initSettings,
  initEditor,
  initEditorActions,
  initEditorTools,
  initExport,
  initImport,
  initTour,
  initCanvasDrag,
  initDiagramRunner,
];

// Starts every component that finds its markup on the page; a failing component is reported and does not stop the others.
export const boot = (root, { components = COMPONENTS, logger = console } = {}) => {
  const storage = getStorage(root.defaultView);
  const started = [];
  components.forEach((init) => {
    try {
      if (init({ root, storage })) started.push(init.name);
    } catch (error) {
      logger.error(`DSLKit: component ${init.name} failed`, error);
    }
  });
  return started;
};

/* node:coverage disable */
if (typeof document !== 'undefined') {
  boot(document);
  registerServiceWorker({ navigator: document.defaultView.navigator });
}
/* node:coverage enable */
```

## Appendix B – Listing of storage.js

```js
export function createMemoryBackend() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

export function createStorage(backend, prefix = 'dslkit.') {
  const fullKey = (key) => `${prefix}${key}`;

  return {
    get(key, fallback = null) {
      try {
        const raw = backend.getItem(fullKey(key));
        if (raw === null) {
          return fallback;
        }
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        backend.setItem(fullKey(key), JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try {
        backend.removeItem(fullKey(key));
        return true;
      } catch {
        return false;
      }
    },
  };
}

export function getStorage(win = globalThis) {
  try {
    const local = win.localStorage;
    if (local === undefined || local === null) {
      return createStorage(createMemoryBackend());
    }
    return createStorage(local);
  } catch {
    return createStorage(createMemoryBackend());
  }
}
```

## Appendix C – Listing of validation.js

```js
export const NOTATIONS = ['idef0', 'dfd', 'erd', 'bpmn', 'uml', 'petri'];

const NAME_PATTERN = /^\p{L}[\p{L}' ’-]{1,59}$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)*\.[^\s@.]{2,}$/;
const MAX_EMAIL_LENGTH = 120;
const MAX_COMMENT_LENGTH = 500;
const MAX_TEAM_SIZE = 500;

export function isValidName(value) {
  if (value === undefined || value === null) {
    return false;
  }
  return NAME_PATTERN.test(String(value).trim());
}

export function isValidEmail(value) {
  const trimmed = String(value).trim();
  return trimmed.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(trimmed);
}

export function isValidTeamSize(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 0 && value <= MAX_TEAM_SIZE;
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const number = Number(value.trim());
    return number <= MAX_TEAM_SIZE;
  }
  return false;
}

export function isValidNotation(value) {
  return NOTATIONS.includes(value);
}

export function isValidComment(value = '') {
  return String(value).length <= MAX_COMMENT_LENGTH;
}

export function validateWaitlist({ name, email, notation, team, comment, consent } = {}) {
  const invalid = [];
  if (!isValidName(name)) {
    invalid.push('name');
  }
  if (!isValidEmail(email)) {
    invalid.push('email');
  }
  if (!isValidNotation(notation)) {
    invalid.push('notation');
  }
  if (!isValidTeamSize(team)) {
    invalid.push('team');
  }
  if (!isValidComment(comment)) {
    invalid.push('comment');
  }
  if (consent !== true) {
    invalid.push('consent');
  }
  return invalid;
}
```

## Appendix D – Listing of notation-filter.js

```js
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
```

## Appendix E – Listing of waitlist-form.js

```js
import { validateWaitlist } from '../utils/validation.js';

const FIELDS = ['name', 'email', 'notation', 'team', 'comment', 'consent'];

const readValues = (form) => {
  const field = (id) => form.querySelector(`#${id}`);
  return {
    name: field('name').value,
    email: field('email').value,
    notation: field('notation').value,
    team: field('team').value,
    comment: field('comment').value,
    consent: field('consent').checked,
  };
};

const showState = (form, id, invalid) => {
  const field = form.querySelector(`#${id}`);
  const error = form.querySelector(`#${id}-error`);
  if (error) error.hidden = !invalid;
  if (invalid) field.setAttribute('aria-invalid', 'true');
  else field.removeAttribute('aria-invalid');

  const ids = (field.getAttribute('aria-describedby') ?? '').split(/\s+/).filter((value) => value && value !== `${id}-error`);
  if (invalid && error) ids.push(`${id}-error`);
  if (ids.length > 0) field.setAttribute('aria-describedby', ids.join(' '));
  else field.removeAttribute('aria-describedby');
};

export const initWaitlistForm = ({
  root = document,
  storage,
  now = () => new Date(),
  navigate = (url) => root.defaultView.location.assign(url),
  logger = console,
} = {}) => {
  const form = root.querySelector('#waitlist-form');
  if (!form) return null;

  const validateField = (id) => showState(form, id, validateWaitlist(readValues(form)).includes(id));

  let submitting = false;

  const submit = () => {
    if (submitting) return false;
    const values = readValues(form);
    const invalid = validateWaitlist(values);
    FIELDS.forEach((id) => showState(form, id, invalid.includes(id)));
    if (invalid.length > 0) {
      form.querySelector(`#${invalid[0]}`).focus();
      return false;
    }

    const record = {
      name: values.name.trim(),
      email: values.email.trim(),
      notation: values.notation,
      team: Number(values.team),
      comment: values.comment.trim(),
      createdAt: now().toISOString(),
    };
    const saved = storage.get('waitlist', []);
    const records = Array.isArray(saved) ? saved : [];
    records.push(record);
    storage.set('waitlist', records);
    submitting = true;
    logger.info('DSLKit: заявка сохранена в LocalStorage', record.notation);
    navigate('thanks.html');
    return true;
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submit();
  });

  form.noValidate = true;

  // While typing only fields already marked invalid are rechecked, so the first error appears on leaving the field.
  const revalidate = (event) => {
    const { id } = event.target;
    if (!FIELDS.includes(id)) return;
    if (event.type === 'change' || event.target.getAttribute('aria-invalid') === 'true') validateField(id);
  };
  form.addEventListener('input', revalidate);
  form.addEventListener('change', revalidate);

  return { validateField, submit };
};
```

## Appendix F – Listing of dashboard.js

```js
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
```

## Appendix G – Listing of editor.js

```js
import { NOTATIONS, TEMPLATES } from '../notations/index.js';
import { ui } from '../notations/messages.js';
import { showCode } from './code-lines.js';
import { initSourceAutosave } from './source-autosave.js';

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
  return { markSaved };
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

// Templates: the buttons and the notation list replace the code with a starter example and ask the runner to draw it.
const initTemplates = ({ page, root }) => {
  const lang = root.documentElement.lang === 'en' ? 'en' : 'ru';
  const codeLines = page.querySelector('.code__lines');
  const loadTemplate = (key) => {
    if (!codeLines || !(key in TEMPLATES)) return false;
    showCode(root, codeLines, TEMPLATES[key]);
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

export const initEditor = ({ root = document, storage, ...timing } = {}) => {
  const page = root.querySelector('.app-page--editor');
  const tabs = page ? [...page.querySelectorAll('.editor-tabs__list [role="tab"]')] : [];
  if (tabs.length === 0) return null;

  const settings = createSettings(storage);
  const tabsApi = initTabs({ page, root, storage, tabs });
  const { markSaved } = initCloseDialog({ page, root, tabs, tabsApi });
  initAutosave({ page, settings });
  initRun({ page, root });
  const sourceAutosave = initSourceAutosave({ page, root, storage, onSaved: markSaved, ...timing });
  const loadTemplate = initTemplates({ page, root });
  const { showView, view } = initViews({ page, storage });

  return { select: tabsApi.select, showView, loadTemplate, view, sourceAutosave };
};
```
