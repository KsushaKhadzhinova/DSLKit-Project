import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mock, test } from 'node:test';
import { JSDOM, VirtualConsole } from 'jsdom';
import { initWaitlistForm } from '../../site/js/components/waitlist-form.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const html = readFileSync('site/index.html', 'utf8');
const load = () => {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', () => {});
  return new JSDOM(html, { url: 'http://localhost/', virtualConsole }).window;
};
const memory = () => createStorage(createMemoryBackend());
const field = (document, id) => document.querySelector(`#${id}`);
const fill = (document, values = {}) => {
  const data = { name: 'Ксения', email: 'k@example.com', notation: 'idef0', team: '3', comment: ' привет ', consent: true, ...values };
  field(document, 'name').value = data.name;
  field(document, 'email').value = data.email;
  field(document, 'notation').value = data.notation;
  field(document, 'team').value = data.team;
  field(document, 'comment').value = data.comment;
  field(document, 'consent').checked = data.consent;
};
const submit = (window) => window.document.querySelector('#waitlist-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
const setup = (options = {}) => {
  const window = load();
  const navigate = mock.fn();
  const logger = { info: mock.fn() };
  const storage = memory();
  const api = initWaitlistForm({ root: window.document, storage, navigate, logger, now: () => new Date('2026-10-14T10:00:00.000Z'), ...options });
  return { window, document: window.document, navigate, logger, storage, api };
};

test('without the form nothing happens', () => {
  const { document } = new JSDOM('<!doctype html><html><body></body></html>').window;
  assert.equal(initWaitlistForm({ root: document, storage: memory() }), null);
});

test('an empty submit shows every error, marks the fields and focuses the first one', () => {
  const { window, document, navigate } = setup();
  const event = new window.Event('submit', { bubbles: true, cancelable: true });
  document.querySelector('#waitlist-form').dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  for (const id of ['name', 'email', 'notation', 'consent']) {
    assert.equal(field(document, `${id}-error`).hidden, false, id);
    assert.equal(field(document, id).getAttribute('aria-invalid'), 'true', id);
    assert.match(field(document, id).getAttribute('aria-describedby'), new RegExp(`${id}-error`));
  }
  assert.match(field(document, 'name').getAttribute('aria-describedby'), /name-hint/);
  assert.equal(document.activeElement, field(document, 'name'));
  assert.equal(navigate.mock.callCount(), 0);
});

test('a partly valid submit keeps only the wrong fields marked and focuses the first of them', () => {
  const { window, document } = setup();
  fill(document, { email: 'not-an-email', notation: '' });
  submit(window);
  assert.equal(field(document, 'name-error').hidden, true);
  assert.equal(field(document, 'name').hasAttribute('aria-invalid'), false);
  assert.equal(field(document, 'email-error').hidden, false);
  assert.equal(document.activeElement, field(document, 'email'));
});

test('a long comment without an error element is still marked as invalid', () => {
  const { window, document } = setup();
  fill(document, { comment: 'x'.repeat(501) });
  submit(window);
  assert.equal(field(document, 'comment').getAttribute('aria-invalid'), 'true');
  assert.equal(field(document, 'comment').getAttribute('aria-describedby'), 'comment-hint');
  assert.equal(document.activeElement, field(document, 'comment'));
});

test('a valid submit saves the record, logs it and goes to the thank-you page', () => {
  const { window, document, navigate, logger, storage } = setup();
  fill(document);
  submit(window);
  assert.deepEqual(storage.get('waitlist'), [
    { name: 'Ксения', email: 'k@example.com', notation: 'idef0', team: 3, comment: 'привет', createdAt: '2026-10-14T10:00:00.000Z' },
  ]);
  assert.equal(logger.info.mock.callCount(), 1);
  assert.deepEqual(navigate.mock.calls[0].arguments, ['thanks.html']);
});

test('new records are appended to the saved ones', () => {
  const { window, document, storage } = setup();
  storage.set('waitlist', [{ email: 'old@example.com' }]);
  fill(document);
  submit(window);
  assert.equal(storage.get('waitlist').length, 2);
  assert.equal(storage.get('waitlist')[0].email, 'old@example.com');
});

test('a corrupted saved value is replaced by a fresh list', () => {
  const { window, document, storage } = setup();
  storage.set('waitlist', 'broken');
  fill(document);
  submit(window);
  assert.equal(storage.get('waitlist').length, 1);
});

test('the API submit returns false for bad data and true for good data', () => {
  const { document, api } = setup();
  assert.equal(api.submit(), false);
  fill(document);
  assert.equal(api.submit(), true);
});

test('an error disappears as soon as the changed field becomes valid, untouched fields stay quiet', () => {
  const { window, document } = setup();
  submit(window);
  fill(document, { email: 'k@example.com' });
  field(document, 'email').dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(field(document, 'email-error').hidden, true);
  assert.equal(field(document, 'email').hasAttribute('aria-invalid'), false);
  assert.equal(field(document, 'email').getAttribute('aria-describedby'), 'email-hint');
  assert.equal(field(document, 'name-error').hidden, false);
  field(document, 'consent').checked = true;
  field(document, 'consent').dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(field(document, 'consent-error').hidden, true);
});

test('typing in an untouched field stays quiet, leaving it shows the error and unrelated targets are ignored', () => {
  const { window, document } = setup();
  field(document, 'name').value = '1';
  field(document, 'name').dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(field(document, 'name-error').hidden, true);
  field(document, 'name').dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(field(document, 'name-error').hidden, false);
  document.querySelector('.form__legend').dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(field(document, 'email-error').hidden, true);
});

test('the form disables the browser bubbles and a second submit after success is ignored', () => {
  const { window, document, navigate, storage, api } = setup();
  assert.equal(document.querySelector('#waitlist-form').noValidate, true);
  fill(document);
  submit(window);
  assert.equal(api.submit(), false);
  submit(window);
  assert.equal(storage.get('waitlist').length, 1);
  assert.equal(navigate.mock.callCount(), 1);
});

test('the log line carries the notation and not the email address', () => {
  const { window, document, logger } = setup();
  fill(document);
  submit(window);
  assert.deepEqual(logger.info.mock.calls[0].arguments, ['DSLKit: заявка сохранена в LocalStorage', 'idef0']);
});

test('the default logger and navigation work on a real window', () => {
  const window = load();
  const info = mock.method(console, 'info', () => {});
  const storage = memory();
  initWaitlistForm({ root: window.document, storage });
  fill(window.document);
  submit(window);
  assert.equal(info.mock.callCount(), 1);
  assert.equal(storage.get('waitlist').length, 1);
  info.mock.restore();
});
