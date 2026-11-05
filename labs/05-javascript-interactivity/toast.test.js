import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { flash, initToasts, kindOf, notify } from '../../site/js/components/toast.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const memory = () => createStorage(createMemoryBackend());
const open = ({ html = '<!doctype html><html lang="ru"><body></body></html>', storage = memory() } = {}) => {
  const window = new JSDOM(html, { url: 'http://localhost/' }).window;
  const timers = [];
  const api = initToasts({
    root: window.document,
    storage,
    setTimer: (fn, ms) => timers.push({ fn, ms }) - 1,
    clearTimer: () => {},
  });
  return { window, document: window.document, api, timers, storage, toasts: () => [...window.document.querySelectorAll('.toast')] };
};

test('words of refusal make an error toast, other messages a success one', () => {
  assert.equal(kindOf('Не удалось сохранить.'), 'error');
  assert.equal(kindOf('Beta limit: 5 new diagrams a day'), 'error');
  assert.equal(kindOf('Сохранено 10:05'), 'success');
});

test('a message of any module becomes a toast with its kind, and an empty one does not', () => {
  const t = open();
  assert.equal(notify(t.document, '   ', 'success'), false);
  assert.equal(notify(t.document, undefined), false);
  assert.equal(t.toasts().length, 0);
  assert.equal(notify(t.document, 'Готово', 'info'), true);
  assert.equal(notify(t.document, 'Не удалось', 'unknown-kind'), true);
  assert.deepEqual(
    t.toasts().map((node) => node.className),
    ['toast toast--info', 'toast toast--error'],
  );
  assert.equal(t.toasts()[0].getAttribute('role'), 'status');
  assert.equal(t.toasts()[1].getAttribute('role'), 'alert');
  assert.equal(t.document.querySelector('.toasts').getAttribute('aria-live'), 'polite');
  assert.equal(t.document.querySelector('.toasts').getAttribute('aria-label'), 'Уведомления');
  assert.equal(t.api.count(), 2);
});

test('a toast closes by its button and by the timer, errors stay longer, the same text is shown once, four at most', () => {
  const t = open({ html: '<!doctype html><html lang="en"><body></body></html>' });
  assert.equal(t.document.querySelector('.toasts').getAttribute('aria-label'), 'Notifications');
  notify(t.document, 'Saved', 'success');
  notify(t.document, 'Wrong thing', 'error');
  assert.deepEqual(
    t.timers.map((timer) => timer.ms),
    [3500, 7000],
  );
  assert.equal(t.document.querySelector('.toast__close').getAttribute('aria-label'), 'Close the notification');
  t.document.querySelector('.toast__close').click();
  assert.equal(t.toasts().length, 1);
  t.timers[1].fn();
  assert.equal(t.toasts().length, 0);
  notify(t.document, 'Same', 'success');
  notify(t.document, 'Same', 'success');
  assert.equal(t.toasts().length, 1);
  for (const text of ['a', 'b', 'c', 'd', 'e']) notify(t.document, text, 'info');
  assert.equal(t.toasts().length, 4);
  assert.equal(t.toasts().at(-1).querySelector('.toast__text').textContent, 'e');
});

test('an explicit save answers with the note of the status bar', () => {
  const t = open({ html: '<!doctype html><html lang="ru"><body><p class="editor-status__saved">Сохранено 10:05</p></body></html>' });
  t.document.dispatchEvent(new t.window.CustomEvent('dslkit:save', { bubbles: true }));
  t.timers.at(-1).fn();
  assert.equal(t.toasts().at(-1).querySelector('.toast__text').textContent, 'Сохранено 10:05');
  const plain = open();
  plain.document.dispatchEvent(new plain.window.CustomEvent('dslkit:save', { bubbles: true }));
  plain.timers.at(-1).fn();
  assert.equal(plain.toasts().length, 0);
});

test('a note left by the previous page is shown once, a damaged one is ignored', () => {
  const storage = memory();
  flash(storage, 'Вы вошли в аккаунт.', 'success');
  const first = open({ storage });
  assert.equal(first.toasts().length, 1);
  assert.equal(storage.get('flash', null), null);
  assert.equal(open({ storage }).toasts().length, 0);
  storage.set('flash', { text: 5 });
  assert.equal(open({ storage }).toasts().length, 0);
  flash(storage, 'Odd kind', 'weird');
  assert.equal(open({ storage }).toasts()[0].className, 'toast toast--success');
  const bare = new JSDOM('<!doctype html><body></body>').window.document;
  bare.body.remove();
  assert.equal(initToasts({ root: bare, storage }), null);
  assert.equal(initToasts({ root: new JSDOM('<!doctype html><body></body>').window.document }).count(), 0);
});

test('actions of the editor and the dashboard answer with toasts', () => {
  const page = new JSDOM(readFileSync('site/app/settings.html', 'utf8'), { url: 'http://localhost/app/settings.html' }).window;
  const storage = memory();
  initToasts({ root: page.document, storage });
  notify(page.document, 'Настройка сохранена.', 'success');
  assert.equal(page.document.querySelectorAll('.toast').length, 1);
});
