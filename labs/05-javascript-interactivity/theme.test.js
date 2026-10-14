import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';
import { THEMES, applyTheme, initTheme } from '../../site/js/components/theme.js';

const makeDom = (body = '') =>
  new JSDOM(`<!doctype html><html><body>${body}</body></html>`, {
    url: 'http://localhost/',
  });

const landing = `
  <input class="theme__input" type="checkbox" id="theme-toggle" />
  <label class="theme__button" for="theme-toggle">Dark</label>`;

const settings = `
  <input type="radio" name="theme" value="light" />
  <input type="radio" name="theme" value="dark" />
  <input type="radio" name="theme" value="auto" />
  <input type="radio" name="theme" value="sepia" />
  <input type="text" id="other" />`;

const throwingStorage = () =>
  createStorage({
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
    removeItem: () => {
      throw new Error('blocked');
    },
  });

const change = (window, element) => element.dispatchEvent(new window.Event('change', { bubbles: true }));

const matchMediaStub = (matches) => (query) => ({ matches, query });

describe('applyTheme', () => {
  it('sets data-theme on the root element', () => {
    const { window } = makeDom();
    applyTheme(window.document.documentElement, 'dark');
    assert.equal(window.document.documentElement.dataset.theme, 'dark');
  });

  it('exposes the two supported themes', () => {
    assert.deepEqual(THEMES, ['light', 'dark']);
  });
});

describe('initTheme', () => {
  it('leaves the page untouched and reports light when nothing is saved and there are no controls', () => {
    const { window } = makeDom();
    const storage = createStorage(createMemoryBackend());
    const theme = initTheme({ root: window.document, storage });
    assert.equal(theme.current(), 'light');
    assert.equal(window.document.documentElement.dataset.theme, undefined);
  });

  it('uses the landing checkbox state when nothing is saved', () => {
    const { window } = makeDom(landing + settings);
    const toggle = window.document.querySelector('.theme__input');
    toggle.checked = true;
    const storage = createStorage(createMemoryBackend());
    const theme = initTheme({ root: window.document, storage });
    assert.equal(theme.current(), 'dark');
    assert.equal(window.document.documentElement.dataset.theme, undefined);
    assert.equal(toggle.checked, true);
    assert.equal(window.document.querySelector('input[value="light"]').checked, true);
  });

  it('applies a saved dark theme and checks the matching controls', () => {
    const { window } = makeDom(landing + settings);
    const storage = createStorage(createMemoryBackend());
    storage.set('theme', 'dark');
    const theme = initTheme({ root: window.document, storage });
    assert.equal(theme.current(), 'dark');
    assert.equal(window.document.documentElement.dataset.theme, 'dark');
    assert.equal(window.document.querySelector('.theme__input').checked, true);
    assert.equal(window.document.querySelector('input[value="dark"]').checked, true);
  });

  it('applies a saved light theme', () => {
    const { window } = makeDom();
    const storage = createStorage(createMemoryBackend());
    storage.set('theme', 'light');
    const theme = initTheme({ root: window.document, storage });
    assert.equal(theme.current(), 'light');
    assert.equal(window.document.documentElement.dataset.theme, 'light');
  });

  it('resolves a saved auto value to dark when the system prefers dark', () => {
    const { window } = makeDom(landing + settings);
    const storage = createStorage(createMemoryBackend());
    storage.set('theme', 'auto');
    const queries = [];
    const matchMedia = (query) => {
      queries.push(query);
      return { matches: true };
    };
    const theme = initTheme({ root: window.document, storage, matchMedia });
    assert.equal(theme.current(), 'dark');
    assert.equal(window.document.documentElement.dataset.theme, 'dark');
    assert.deepEqual(queries, ['(prefers-color-scheme: dark)']);
    assert.equal(window.document.querySelector('.theme__input').checked, true);
    assert.equal(window.document.querySelector('input[value="auto"]').checked, true);
  });

  it('resolves a saved auto value to light when the system prefers light', () => {
    const { window } = makeDom(landing + settings);
    const storage = createStorage(createMemoryBackend());
    storage.set('theme', 'auto');
    const theme = initTheme({
      root: window.document,
      storage,
      matchMedia: matchMediaStub(false),
    });
    assert.equal(theme.current(), 'light');
    assert.equal(window.document.documentElement.dataset.theme, 'light');
  });

  it('falls back to light for auto when matchMedia is missing', () => {
    const { window } = makeDom();
    const storage = createStorage(createMemoryBackend());
    storage.set('theme', 'auto');
    const theme = initTheme({ root: window.document, storage, matchMedia: undefined });
    assert.equal(theme.current(), 'light');
  });

  it('uses the window matchMedia by default', () => {
    const { window } = makeDom();
    window.matchMedia = matchMediaStub(true);
    const storage = createStorage(createMemoryBackend());
    storage.set('theme', 'auto');
    const theme = initTheme({ root: window.document, storage });
    assert.equal(theme.current(), 'dark');
  });

  it('falls back to light for auto when the document has no default view', () => {
    const { window } = makeDom();
    Object.defineProperty(window.document, 'defaultView', {
      get: () => null,
      configurable: true,
    });
    const storage = createStorage(createMemoryBackend());
    storage.set('theme', 'auto');
    const theme = initTheme({ root: window.document, storage });
    assert.equal(theme.current(), 'light');
  });

  it('ignores unknown saved values', () => {
    const { window } = makeDom();
    const storage = createStorage(createMemoryBackend());
    storage.set('theme', 'sepia');
    const theme = initTheme({ root: window.document, storage });
    assert.equal(theme.current(), 'light');
    assert.equal(window.document.documentElement.dataset.theme, undefined);
  });

  it('treats a storage backend that throws as nothing saved', () => {
    const { window } = makeDom(landing);
    const storage = throwingStorage();
    const theme = initTheme({ root: window.document, storage });
    assert.equal(theme.current(), 'light');
    assert.equal(window.document.documentElement.dataset.theme, undefined);
  });

  it('still applies the chosen theme when storage cannot save it', () => {
    const { window } = makeDom(landing);
    const theme = initTheme({ root: window.document, storage: throwingStorage() });
    const toggle = window.document.querySelector('.theme__input');
    toggle.checked = true;
    change(window, toggle);
    assert.equal(theme.current(), 'dark');
    assert.equal(window.document.documentElement.dataset.theme, 'dark');
  });

  it('saves and applies dark when the landing checkbox is switched on', () => {
    const { window } = makeDom(landing + settings);
    const storage = createStorage(createMemoryBackend());
    const theme = initTheme({ root: window.document, storage });
    const toggle = window.document.querySelector('.theme__input');
    toggle.checked = true;
    change(window, toggle);
    assert.equal(storage.get('theme'), 'dark');
    assert.equal(theme.current(), 'dark');
    assert.equal(window.document.documentElement.dataset.theme, 'dark');
    assert.equal(window.document.querySelector('input[value="dark"]').checked, true);
  });

  it('saves and applies light when the landing checkbox is switched off', () => {
    const { window } = makeDom(landing);
    const storage = createStorage(createMemoryBackend());
    storage.set('theme', 'dark');
    const theme = initTheme({ root: window.document, storage });
    const toggle = window.document.querySelector('.theme__input');
    toggle.checked = false;
    change(window, toggle);
    assert.equal(storage.get('theme'), 'light');
    assert.equal(theme.current(), 'light');
    assert.equal(window.document.documentElement.dataset.theme, 'light');
  });

  it('saves the chosen settings radio and applies its effective theme', () => {
    const { window } = makeDom(landing + settings);
    const storage = createStorage(createMemoryBackend());
    const theme = initTheme({
      root: window.document,
      storage,
      matchMedia: matchMediaStub(true),
    });
    const auto = window.document.querySelector('input[value="auto"]');
    auto.checked = true;
    change(window, auto);
    assert.equal(storage.get('theme'), 'auto');
    assert.equal(theme.current(), 'dark');
    assert.equal(window.document.documentElement.dataset.theme, 'dark');
    assert.equal(window.document.querySelector('.theme__input').checked, true);
  });

  it('saves a fixed dark radio choice without consulting matchMedia', () => {
    const { window } = makeDom(settings);
    const storage = createStorage(createMemoryBackend());
    const theme = initTheme({ root: window.document, storage });
    const dark = window.document.querySelector('input[value="dark"]');
    dark.checked = true;
    change(window, dark);
    assert.equal(storage.get('theme'), 'dark');
    assert.equal(theme.current(), 'dark');
  });

  it('ignores a radio with an unknown value', () => {
    const { window } = makeDom(settings);
    const storage = createStorage(createMemoryBackend());
    const theme = initTheme({ root: window.document, storage });
    change(window, window.document.querySelector('input[value="sepia"]'));
    assert.equal(storage.get('theme'), null);
    assert.equal(theme.current(), 'light');
    assert.equal(window.document.documentElement.dataset.theme, undefined);
  });

  it('ignores change events from unrelated controls', () => {
    const { window } = makeDom(landing + settings);
    const storage = createStorage(createMemoryBackend());
    initTheme({ root: window.document, storage });
    change(window, window.document.querySelector('#other'));
    assert.equal(storage.get('theme'), null);
    assert.equal(window.document.documentElement.dataset.theme, undefined);
  });

  it('works with radios only and no landing checkbox', () => {
    const { window } = makeDom(settings);
    const storage = createStorage(createMemoryBackend());
    const theme = initTheme({ root: window.document, storage });
    const dark = window.document.querySelector('input[value="dark"]');
    dark.checked = true;
    change(window, dark);
    assert.equal(theme.current(), 'dark');
    assert.equal(window.document.documentElement.dataset.theme, 'dark');
  });

  it('works with the landing checkbox only and no radios', () => {
    const { window } = makeDom(landing);
    const storage = createStorage(createMemoryBackend());
    const theme = initTheme({ root: window.document, storage });
    const toggle = window.document.querySelector('.theme__input');
    toggle.checked = true;
    change(window, toggle);
    assert.equal(theme.current(), 'dark');
  });
});
