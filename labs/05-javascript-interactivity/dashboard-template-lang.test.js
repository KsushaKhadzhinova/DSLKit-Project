import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initDashboard } from '../../site/js/components/dashboard.js';
import { TEMPLATES, TEMPLATES_RU } from '../../site/js/notations/index.js';
import { createProjectStore } from '../../site/js/storage/projects.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const pages = { ru: readFileSync('site/app/dashboard.html', 'utf8'), en: readFileSync('site/en/app/dashboard.html', 'utf8') };

const open = (lang = 'ru') => {
  const window = new JSDOM(pages[lang], { url: 'http://localhost/app/dashboard.html' }).window;
  const storage = createStorage(createMemoryBackend());
  const api = initDashboard({ root: window.document, storage, seed: false });
  api.show('shared');
  const { document } = window;
  const choice = document.querySelector('.templates__lang');
  const card = (key) => document.querySelector(`.project-list__item:not([data-project])[data-notation="${key}"]`);
  const link = (key) => card(key).querySelector('.project-card__link');
  const press = (node) => node.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  const choose = (value) => {
    choice.value = value;
    choice.dispatchEvent(new window.Event('change', { bubbles: true }));
  };
  return { window, document, api, storage, choice, card, link, press, choose };
};

test('the examples are in the language of the page and the other language is one choice away', () => {
  const ru = open('ru');
  assert.deepEqual(
    [...ru.choice.options].map((option) => [option.value, option.textContent]),
    [
      ['ru', 'Шаблон: русский'],
      ['en', 'Шаблон: English'],
    ],
  );
  assert.equal(ru.choice.getAttribute('aria-label'), 'Язык шаблонов');
  assert.equal(ru.choice.hidden, false);
  assert.equal(ru.link('dfd').textContent, 'Заказ в интернет-магазине');
  assert.equal(ru.link('dfd').getAttribute('href'), 'editor.html?template=dfd&tl=ru');
  ru.choose('en');
  assert.equal(ru.link('dfd').textContent, 'Online order');
  assert.equal(ru.link('dfd').getAttribute('href'), 'editor.html?template=dfd&tl=en');
  assert.match(ru.card('dfd').querySelector('.project-card__menu').getAttribute('aria-label'), /Online order/);
  ru.choose('ru');
  assert.equal(ru.link('dfd').textContent, 'Заказ в интернет-магазине');

  const en = open('en');
  assert.equal(en.choice.value, 'en');
  assert.equal(en.choice.getAttribute('aria-label'), 'Template language');
  assert.equal(en.choice.options[0].textContent, 'Template: Russian');
  assert.equal(en.link('dfd').textContent, 'Online order');
  en.choose('ru');
  assert.equal(en.link('dfd').textContent, 'Заказ в интернет-магазине');
});

test('the choice is shown only among the shared examples', () => {
  const { api, choice } = open('ru');
  assert.equal(choice.hidden, false);
  api.show('mine');
  assert.equal(choice.hidden, true);
  api.show('shared');
  assert.equal(choice.hidden, false);
});

test('the example is copied in the language of its card, a tampered or missing language is the language of the page', () => {
  const { storage, press, card, choose, link } = open('ru');
  const copyOf = (key) => {
    press(card(key).querySelector('.project-card__menu'));
    press(card(key).querySelector('[data-act="copy"]'));
    return createProjectStore({ storage }).list()[0];
  };
  assert.equal(copyOf('dfd').source, TEMPLATES_RU.dfd);
  choose('en');
  assert.equal(copyOf('dfd').source, TEMPLATES.dfd);
  link('erd').setAttribute('href', 'editor.html?template=erd&tl=xx');
  assert.equal(copyOf('erd').source, TEMPLATES_RU.erd);
  link('erd').setAttribute('href', 'editor.html?template=erd');
  assert.equal(copyOf('erd').source, TEMPLATES_RU.erd);
});
