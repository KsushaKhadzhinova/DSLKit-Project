import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { TOUR_KEY, TOUR_STEPS, initTour } from '../../site/js/components/tour.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const html = readFileSync('site/app/editor.html', 'utf8');
const htmlEn = readFileSync('site/en/app/editor.html', 'utf8');
const memory = () => createStorage(createMemoryBackend());
const setup = ({ page = html, storage = memory() } = {}) => {
  const window = new JSDOM(page, { url: 'http://localhost/' }).window;
  const document = window.document;
  const api = initTour({ root: document, storage });
  return { window, document, storage, api };
};
const card = (document) => document.querySelector('.tour');
const buttons = (document) => [...card(document).querySelectorAll('button')].map((button) => button.textContent);
const press = (document, label) => [...card(document).querySelectorAll('button')].find((button) => button.textContent === label).click();

test('the tour has five steps', () => {
  assert.equal(TOUR_STEPS, 5);
});

test('a page without the editor or without the parts of the tour has no tour', () => {
  const plain = new JSDOM('<!doctype html><html><body></body></html>').window;
  assert.equal(initTour({ root: plain.document, storage: memory() }), null);
  const empty = new JSDOM('<!doctype html><html><body><div class="app-page--editor"></div></body></html>').window;
  assert.equal(initTour({ root: empty.document, storage: memory() }), null);
});

test('a new visitor sees the first step and the part it talks about is outlined', () => {
  const { document, api } = setup();
  assert.equal(api.isOpen(), true);
  assert.equal(card(document).getAttribute('role'), 'dialog');
  assert.equal(card(document).querySelector('.tour__title').textContent, 'Код диаграммы');
  assert.equal(card(document).querySelector('.tour__count').textContent, 'Шаг 1 из 5');
  assert.deepEqual(buttons(document), ['Пропустить', 'Далее']);
  assert.equal(document.querySelectorAll('.tour__target').length, 1);
  assert.ok(document.querySelector('.code').classList.contains('tour__target'));
  assert.equal(document.activeElement.textContent, 'Далее');
});

test('Next and Back walk through all five steps, the last one says Done and remembers it', () => {
  const { document, storage, api } = setup();
  const titles = [];
  for (let step = 0; step < 4; step += 1) {
    titles.push(card(document).querySelector('.tour__title').textContent);
    press(document, 'Далее');
  }
  titles.push(card(document).querySelector('.tour__title').textContent);
  assert.deepEqual(titles, ['Код диаграммы', 'Запуск', 'Холст', 'Шаблоны', 'Экспорт и настройки']);
  assert.deepEqual(buttons(document), ['Назад', 'Пропустить', 'Готово']);
  assert.equal(api.step(), 4);
  press(document, 'Назад');
  assert.equal(api.step(), 3);
  assert.equal(document.querySelectorAll('.tour__target').length, 1);
  press(document, 'Далее');
  press(document, 'Готово');
  assert.equal(api.isOpen(), false);
  assert.equal(card(document), null);
  assert.equal(document.querySelector('.tour__target'), null);
  assert.equal(storage.get(TOUR_KEY), true);
});

test('Skip and Escape close the tour for good', () => {
  const skipped = setup();
  press(skipped.document, 'Пропустить');
  assert.equal(skipped.api.isOpen(), false);
  assert.equal(skipped.storage.get(TOUR_KEY), true);
  const escaped = setup();
  escaped.document.dispatchEvent(new escaped.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  assert.equal(escaped.api.isOpen(), true, 'other keys do nothing');
  escaped.document.dispatchEvent(new escaped.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(escaped.api.isOpen(), false);
  assert.equal(escaped.storage.get(TOUR_KEY), true);
  escaped.document.dispatchEvent(new escaped.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(escaped.api.isOpen(), false, 'the key listener is gone');
});

test('a visitor who has seen the tour is not interrupted, the menu opens it again', () => {
  const storage = memory();
  storage.set(TOUR_KEY, true);
  const { document, api } = setup({ storage });
  assert.equal(api.isOpen(), false);
  document.querySelector('[data-tour-start]').click();
  assert.equal(api.isOpen(), true);
  assert.equal(card(document).querySelector('.tour__count').textContent, 'Шаг 1 из 5');
  press(document, 'Далее');
  document.querySelector('[data-tour-start]').click();
  assert.equal(document.querySelectorAll('.tour').length, 1, 'there is never more than one card');
  assert.equal(api.step(), 0);
});

test('the API can go on and close the tour', () => {
  const { document, api } = setup();
  api.next();
  assert.equal(api.step(), 1);
  api.close();
  assert.equal(api.isOpen(), false);
  api.next();
  assert.equal(api.isOpen(), false, 'there is nothing to go on with');
  api.start();
  for (let step = 0; step < 4; step += 1) api.next();
  assert.equal(api.step(), 4);
  api.next();
  assert.equal(api.isOpen(), false, 'after the last step the tour ends');
  assert.equal(document.querySelector('.tour'), null);
});

test('the English page has the tour in English', () => {
  const { document } = setup({ page: htmlEn });
  assert.equal(card(document).querySelector('.tour__title').textContent, 'Diagram code');
  assert.equal(card(document).querySelector('.tour__count').textContent, 'Step 1 of 5');
  assert.deepEqual(buttons(document), ['Skip', 'Next']);
  press(document, 'Next');
  assert.deepEqual(buttons(document), ['Back', 'Skip', 'Next']);
});

test('the outlined part is scrolled into view where the browser can do it', () => {
  const window = new JSDOM(html, { url: 'http://localhost/' }).window;
  const scrolled = [];
  window.HTMLElement.prototype.scrollIntoView = function scrollIntoView(options) {
    scrolled.push([this.className, options]);
  };
  initTour({ root: window.document, storage: memory() });
  assert.deepEqual(scrolled, [[scrolled[0][0], { block: 'nearest' }]]);
  assert.match(scrolled[0][0], /tour__target/);
});
