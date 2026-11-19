import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initDashboard } from '../../site/js/components/dashboard.js';
import { createDialogs } from '../../site/js/components/dialog.js';
import { initNativeValidation, validationMessage } from '../../site/js/components/native-validation.js';
import { createProjectStore, createTemplateStore } from '../../site/js/storage/projects.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';
import { contrast } from '../../tools/contrast.js';

// A browser storage that can be filled up: while `state.full` is true every write throws, like QuotaExceededError.
const fillable = () => {
  const backend = createMemoryBackend();
  const state = { full: false };
  const storage = createStorage({
    ...backend,
    setItem: (key, value) => {
      if (state.full) throw new Error('QuotaExceededError');
      backend.setItem(key, value);
    },
  });
  return { storage, state };
};
const clock = () => {
  let t = 1_700_000_000_000;
  return () => (t += 60_000);
};
const dashboardHtml = { ru: readFileSync('site/app/dashboard.html', 'utf8'), en: readFileSync('site/en/app/dashboard.html', 'utf8') };

const openDashboard = ({ storage, dialogs, lang = 'ru' }) => {
  const dom = new JSDOM(dashboardHtml[lang], { url: 'http://localhost/app/dashboard.html' });
  const moved = [];
  const api = initDashboard({ root: dom.window.document, storage, now: clock(), seed: false, dialogs, navigate: (url) => moved.push(url) });
  const { document } = dom.window;
  const act = (name) => {
    const item = document.querySelector('.project-list__item:not([hidden])');
    item.querySelector('.project-card__menu').click();
    item.querySelector(`[data-act="${name}"]`).click();
  };
  const toasts = [];
  document.addEventListener('dslkit:toast', (event) => toasts.push(event.detail));
  return { dom, document, api, act, moved, toasts };
};
const yes = { prompt: () => 'Named', confirm: () => true };
const failed = (t) => t.toasts.splice(0).every((item) => item.kind === 'error' && /хранилище/.test(item.text));

test('F3: the dashboard reports a full storage for every action instead of a success', () => {
  const { storage, state } = fillable();
  const store = createProjectStore({ storage, now: clock() });
  store.save({ title: 'Mine', notation: 'idef0', source: 's' });
  store.save({ title: 'Gone', notation: 'idef0', source: 's' });
  store.trash(store.list()[0].id);
  createTemplateStore({ storage, now: clock() }).save({ title: 'Tpl', notation: 'idef0', source: 's' });
  const t = openDashboard({ storage, dialogs: yes });
  state.full = true;
  t.act('rename');
  assert.ok(failed(t));
  t.act('remove');
  assert.ok(failed(t));
  t.act('template');
  assert.ok(failed(t));
  t.api.show('templates');
  t.act('rename');
  assert.ok(failed(t));
  t.act('remove-template');
  assert.ok(failed(t));
  t.api.show('trash');
  t.act('restore');
  assert.ok(failed(t));
  t.act('purge');
  assert.ok(failed(t));
  t.api.show('shared');
  t.act('copy');
  assert.ok(failed(t));
  t.act('copy-template');
  assert.ok(failed(t));
  t.api.show('templates');
  t.document.querySelector('[data-new-template]').click();
  assert.ok(failed(t));
  assert.equal(t.moved.length, 0);
  state.full = false;
  assert.equal(createProjectStore({ storage }).list().length, 1);
});

test('F3: emptying the trash on a full storage says so and keeps the projects', () => {
  const { storage, state } = fillable();
  const store = createProjectStore({ storage, now: clock() });
  store.trash(store.save({ title: 'A', notation: 'idef0', source: 's' }).id);
  const t = openDashboard({ storage, dialogs: yes });
  t.api.show('trash');
  state.full = true;
  t.document.querySelector('[data-empty-trash], #empty-trash, .dashboard__empty-trash, [data-act="empty"]')?.click();
  const button = [...t.document.querySelectorAll('button')].find((node) => /Очистить корзину|Empty the trash|Удалить все/.test(node.textContent));
  button.click();
  assert.ok(failed(t));
  state.full = false;
  assert.equal(createProjectStore({ storage, now: clock() }).listTrash().length, 1);
});

test('F5: the dashboard waits for a dialog that answers later, and a refusal changes nothing', async () => {
  const { storage } = fillable();
  createProjectStore({ storage, now: clock() }).save({ title: 'Mine', notation: 'idef0', source: 's' });
  const t = openDashboard({ storage, dialogs: { prompt: async () => 'Later', confirm: async () => false } });
  const settle = () => new Promise((resolve) => setTimeout(resolve, 5));
  t.act('rename');
  await settle();
  assert.equal(createProjectStore({ storage }).list()[0].title, 'Later');
  t.act('remove');
  await settle();
  assert.equal(createProjectStore({ storage }).list().length, 1);
  t.api.show('templates');
  t.document.querySelector('[data-new-template]').click();
  await settle();
  assert.equal(t.moved.length, 1);
});

const press = (window, node) => node.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
const key = (window, name, extra = {}) =>
  window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...extra }));
const submit = (window) => window.document.querySelector('.dialog__form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

test('F5: the own prompt and confirm dialogs speak the page language and work from the keyboard', async () => {
  for (const lang of ['ru', 'en']) {
    const { window } = new JSDOM(`<!doctype html><html lang="${lang}"><body><button id="opener">x</button></body></html>`);
    const { document } = window;
    const dialogs = createDialogs(document);
    document.querySelector('#opener').focus();
    let answer = dialogs.prompt('Name?', 'Old');
    const box = document.querySelector('.dialog__box');
    assert.equal(box.getAttribute('role'), 'dialog');
    assert.equal(box.getAttribute('aria-modal'), 'true');
    assert.equal(document.activeElement.className, 'dialog__input');
    assert.equal(document.querySelector('.dialog__input').value, 'Old');
    assert.equal(document.querySelector('.dialog__actions .button--primary').textContent, lang === 'ru' ? 'Сохранить' : 'Save');
    assert.equal(document.querySelector('.dialog__actions .button--quiet').textContent, lang === 'ru' ? 'Отмена' : 'Cancel');
    document.querySelector('.dialog__input').value = 'New';
    submit(window);
    assert.equal(await answer, 'New');
    assert.equal(document.querySelector('.dialog'), null);
    assert.equal(document.activeElement.id, 'opener');
    answer = dialogs.prompt('Name?');
    key(window, 'Escape');
    assert.equal(await answer, null);
    answer = dialogs.confirm('Sure?');
    assert.equal(document.activeElement.type, 'submit');
    assert.equal(document.querySelector('.dialog__actions .button--primary').textContent, lang === 'ru' ? 'Подтвердить' : 'Confirm');
    press(window, document.querySelector('.dialog__actions .button--quiet'));
    assert.equal(await answer, false);
    answer = dialogs.confirm('Sure?');
    press(window, document.querySelector('.dialog__box'));
    assert.ok(document.querySelector('.dialog'));
    press(window, document.querySelector('.dialog'));
    assert.equal(await answer, false);
    answer = dialogs.confirm('Sure?');
    const [cancel, ok] = document.querySelectorAll('.dialog__actions button');
    assert.equal(document.activeElement, ok);
    key(window, 'Tab');
    assert.equal(document.activeElement, cancel);
    key(window, 'Tab', { shiftKey: true });
    assert.equal(document.activeElement, ok);
    key(window, 'a');
    assert.ok(document.querySelector('.dialog'));
    submit(window);
    assert.equal(await answer, true);
  }
});

test('F5: the dialogs default to the global document', () => {
  assert.equal(typeof createDialogs, 'function');
  const saved = globalThis.document;
  const { window } = new JSDOM('<!doctype html><html lang="en"><body></body></html>');
  globalThis.document = window.document;
  try {
    const dialogs = createDialogs();
    const answer = dialogs.confirm('Sure?');
    assert.ok(window.document.querySelector('.dialog'));
    key(window, 'Escape');
    return answer.then((value) => assert.equal(value, false));
  } finally {
    if (saved === undefined) delete globalThis.document;
    else globalThis.document = saved;
  }
});

test('F7: the validation bubble of a form is worded in the language of the page', () => {
  assert.equal(initNativeValidation({ root: new JSDOM('<!doctype html><body></body>').window.document }), null);
  for (const [lang, missing, format] of [
    ['ru', 'Заполните это поле.', /формате/],
    ['en', 'Please fill out this field.', /right format/],
  ]) {
    const dom = new JSDOM(`<!doctype html><html lang="${lang}"><body><form><input id="a" required><input id="b" type="email" value="x"></form></body></html>`);
    const { document } = dom.window;
    assert.deepEqual(initNativeValidation({ root: document }), { lang });
    const [a, b] = document.querySelectorAll('input');
    assert.equal(a.checkValidity(), false);
    assert.equal(a.validationMessage, missing);
    assert.equal(b.checkValidity(), false);
    assert.match(b.validationMessage, format);
    a.value = 'now';
    a.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    assert.equal(a.checkValidity(), true);
    document.dispatchEvent(new dom.window.Event('input'));
  }
  assert.equal(validationMessage({}, 'ru'), '');
  for (const name of ['patternMismatch', 'tooShort', 'tooLong', 'rangeUnderflow', 'rangeOverflow', 'stepMismatch', 'badInput']) {
    assert.notEqual(validationMessage({ [name]: true }, 'en'), validationMessage({ [name]: true }, 'ru'));
  }
});

test('F6: no button, link, field or tab of an app page is left without an accessible name', () => {
  for (const dir of ['site/app', 'site/en/app']) {
    for (const file of readdirSync(dir).filter((name) => name.endsWith('.html'))) {
      const { document } = new JSDOM(readFileSync(`${dir}/${file}`, 'utf8')).window;
      const unnamed = [
        ...document.querySelectorAll('button, summary, a[href], [role="button"], [role="tab"], input:not([type="hidden"]), select, textarea'),
      ].filter((node) => {
        const text = [...node.childNodes]
          .map((child) => (child.nodeType === 3 ? child.textContent : child.getAttribute?.('aria-hidden') === 'true' ? '' : child.textContent))
          .join('')
          .trim();
        const labelled =
          node.getAttribute('aria-label') ||
          node.getAttribute('aria-labelledby') ||
          node.closest('label') ||
          (node.id && document.querySelector(`label[for="${node.id}"]`));
        return text === '' && !labelled;
      });
      assert.deepEqual(
        unnamed.map((node) => node.outerHTML.slice(0, 80)),
        [],
        `${dir}/${file}`,
      );
    }
  }
});

test('U4: the border of an input, a select and a text area is at least 3:1 against the page, in both themes', () => {
  const css = readdirSync('site/css')
    .filter((name) => name.endsWith('.css'))
    .map((name) => readFileSync(`site/css/${name}`, 'utf8'))
    .join('\n');
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const tokens = (name) => [...css.matchAll(new RegExp(`--color-${name}: (#[0-9a-f]{6})`, 'g'))].map((match) => match[1]);
  const [lightBorder, darkBorder] = tokens('border-strong');
  const [lightPage, darkPage] = tokens('background');
  assert.ok(contrast(lightBorder, lightPage) >= 3);
  assert.ok(contrast(darkBorder, darkPage) >= 3);
  const weak = [...stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(
    ([, selector, body]) =>
      /input|select|textarea|search/.test(selector) && !/switch|theme-option/.test(selector) && /border[^:;]*:[^;]*var\(--color-border\)/.test(body),
  );
  assert.deepEqual(
    weak.map(([, selector]) => selector.trim().slice(0, 60)),
    [],
  );
});
