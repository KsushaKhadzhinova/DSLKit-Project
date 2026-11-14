import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initEditor } from '../../site/js/components/editor.js';
import { TEMPLATES, TEMPLATES_RU } from '../../site/js/notations/index.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const pages = { ru: readFileSync('site/app/editor.html', 'utf8'), en: readFileSync('site/en/app/editor.html', 'utf8') };

const open = (lang = 'ru', search = '') => {
  const window = new JSDOM(pages[lang], { url: `http://localhost/app/editor.html${search}` }).window;
  const { document } = window;
  const editor = initEditor({ root: document, storage: createStorage(createMemoryBackend()) });
  const choice = document.querySelector('[data-template-lang]');
  const second = () => document.querySelectorAll('.code__line')[1].textContent;
  const choose = (value) => {
    choice.value = value;
    choice.dispatchEvent(new window.Event('change'));
  };
  return { window, document, editor, choice, second, choose, firstLine: () => document.querySelector('.code__line').textContent };
};

test('the Russian page offers the template in Russian first and in English next to it', () => {
  const { choice, editor, second, choose, firstLine } = open('ru');
  assert.deepEqual(
    [...choice.options].map((option) => [option.value, option.textContent]),
    [
      ['ru', 'Шаблон: русский'],
      ['en', 'Шаблон: English'],
    ],
  );
  assert.equal(choice.value, 'ru');
  assert.equal(choice.getAttribute('aria-label'), 'Язык шаблона');
  editor.loadTemplate('dfd');
  assert.equal(second(), 'entity Клиент');
  // Nothing was edited, so the same template is shown again in the other language.
  choose('en');
  assert.equal(second(), 'entity Customer');
  assert.equal(firstLine(), TEMPLATES.dfd.split('\n')[0]);
  choose('ru');
  assert.equal(firstLine(), TEMPLATES_RU.dfd.split('\n')[0]);
});

test('an edited text is never replaced by a change of the template language, the next template follows the choice', () => {
  const { editor, document, second, choose, firstLine } = open('ru');
  editor.loadTemplate('erd');
  document.querySelector('.code__line code').textContent = 'diagram erd "Мой текст"';
  choose('en');
  assert.equal(firstLine(), 'diagram erd "Мой текст"');
  editor.loadTemplate('dfd');
  assert.equal(second(), 'entity Customer');
});

test('a change of the language before any template was loaded only remembers the choice', () => {
  const { editor, second, choose } = open('ru');
  choose('en');
  editor.loadTemplate('dfd');
  assert.equal(second(), 'entity Customer');
});

test('the English page starts with English and offers Russian', () => {
  const { choice, editor, second, choose } = open('en');
  assert.equal(choice.value, 'en');
  assert.equal(choice.getAttribute('aria-label'), 'Template language');
  assert.equal(choice.options[0].textContent, 'Template: Russian');
  editor.loadTemplate('dfd');
  assert.equal(second(), 'entity Customer');
  choose('ru');
  assert.equal(second(), 'entity Клиент');
});

test('?tl= in the address picks the template language and a wrong value is ignored', () => {
  const ru = open('en', '?tl=ru');
  assert.equal(ru.choice.value, 'ru');
  ru.editor.loadTemplate('dfd');
  assert.equal(ru.second(), 'entity Клиент');
  assert.equal(open('en', '?tl=xx').choice.value, 'en');
});
