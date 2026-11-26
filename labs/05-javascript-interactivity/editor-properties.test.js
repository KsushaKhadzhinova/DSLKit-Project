import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { readCode, showCode } from '../../site/js/components/code-lines.js';
import { initEditorProperties } from '../../site/js/components/editor-properties.js';
import { TEMPLATES } from '../../site/js/notations/index.js';
import { kindName } from '../../site/js/utils/palette.js';

const pages = { ru: readFileSync('site/app/editor.html', 'utf8'), en: readFileSync('site/en/app/editor.html', 'utf8') };

const setup = ({ lang = 'ru', template = 'dfd' } = {}) => {
  const window = new JSDOM(pages[lang], { url: 'http://localhost/', pretendToBeVisual: true }).window;
  const { document } = window;
  showCode(document, document.querySelector('.code__lines'), TEMPLATES[template]);
  const api = initEditorProperties({ root: document });
  const $ = (selector) => document.querySelector(selector);
  const page = $('.app-page--editor');
  const code = () => readCode($('.code__lines'));
  const pick = (id) => page.dispatchEvent(new window.CustomEvent('dslkit:pick', { bubbles: true, detail: { id } }));
  const run = () => page.dispatchEvent(new window.CustomEvent('dslkit:run', { bubbles: true }));
  const runs = [];
  page.addEventListener('dslkit:run', () => runs.push(1));
  const type = (input, value) => {
    input.value = value;
    input.dispatchEvent(new window.Event('change', { bubbles: true }));
  };
  return { window, document, api, $, page, code, pick, run, runs, type };
};

test('a page without the board returns null', () => {
  const bare = new JSDOM('<!doctype html><html><body><div class="app-page--editor"></div></body></html>').window;
  assert.equal(initEditorProperties({ root: bare.document }), null);
});

test('the panel is hidden until a block is picked, and is a labelled region', () => {
  const t = setup();
  assert.equal(t.$('.props').hidden, true);
  assert.equal(t.$('.props').getAttribute('aria-labelledby'), 'props-heading');
  assert.equal(t.$('#props-heading').textContent, 'Свойства блока');
  assert.equal(t.$('.props__message').getAttribute('role'), 'status');
});

test('picking a block shows its identifier, label and kind, in both languages', () => {
  const ru = setup();
  ru.pick('2');
  assert.equal(ru.$('.props').hidden, false);
  assert.equal(ru.$('#props-id').textContent, '2');
  assert.equal(ru.$('#props-label').value, 'Take payment');
  assert.equal(ru.$('#props-kind').value, 'process');
  assert.deepEqual(
    [...ru.$('#props-kind').options].map((option) => option.value),
    ['entity', 'process', 'store'],
  );
  assert.equal(ru.$('label[for="props-label"]').textContent, 'Подпись');
  const en = setup({ lang: 'en' });
  en.pick('2');
  assert.equal(en.$('#props-heading').textContent, 'Block properties');
  assert.equal(en.$('label[for="props-kind"]').textContent, 'Block kind');
});

test('a block without a label hides the label field; a block with one kind hides the kind field', () => {
  const t = setup();
  t.pick('Customer');
  assert.equal(t.$('#props-label').closest('.props__field').hidden, true);
  assert.equal(t.$('#props-label').value, '');
  assert.equal(t.$('#props-kind').closest('.props__field').hidden, false);
  const dag = setup({ template: 'dag' });
  dag.pick('fetch');
  assert.equal(dag.$('#props-kind').closest('.props__field').hidden, true);
  assert.equal(dag.$('#props-label').value, 'Fetch');
});

test('the position of a placed block is shown as text; a block without one hides the field', () => {
  const t = setup({ lang: 'en' });
  t.pick('2');
  assert.equal(t.$('#props-position').closest('.props__field').hidden, true);
  showCode(t.document, t.$('.code__lines'), TEMPLATES.dfd.replace('process 2 "Take payment"', 'process 2 "Take payment" pos=120x40'));
  t.run();
  assert.equal(t.$('#props-position').closest('.props__field').hidden, false);
  assert.equal(t.$('#props-position').textContent, '120x40');
  assert.equal(t.$('#props-position').closest('.props__field').querySelector('.props__label').textContent, 'Position');
});

test('dropping the selection, or picking a block with nothing to edit, hides the panel', () => {
  const t = setup();
  t.pick('2');
  t.pick(null);
  assert.equal(t.$('.props').hidden, true);
  assert.equal(t.api.current(), null);
  t.pick('2');
  t.pick('nobody');
  assert.equal(t.$('.props').hidden, true);
  t.pick('2');
  t.page.dispatchEvent(new t.window.CustomEvent('dslkit:pick', { bubbles: true }));
  assert.equal(t.api.current(), null);
});

test('a multi-line label is shown on one line', () => {
  const t = setup();
  showCode(t.document, t.$('.code__lines'), 'diagram dfd "T"\nprocess 1 "Two\\nlines"');
  t.pick('1');
  assert.equal(t.$('#props-label').value, 'Two lines');
});

test('changing the label rewrites the code, runs the drawing and says so', () => {
  const t = setup();
  const toasts = [];
  t.document.addEventListener('dslkit:toast', (event) => toasts.push(event.detail.text));
  t.pick('2');
  t.type(t.$('#props-label'), '  Charge card ');
  assert.match(t.code(), /^process 2 "Charge card"$/m);
  assert.equal(t.runs.length, 1);
  assert.equal(t.$('.props__message').textContent, 'Подпись блока 2 изменена.');
  assert.equal(t.$('#props-label').value, 'Charge card');
  assert.deepEqual(toasts, ['Подпись блока 2 изменена.']);
});

test('the same label again changes nothing and runs nothing', () => {
  const t = setup();
  t.pick('2');
  assert.equal(t.api.changeLabel(), false);
  assert.equal(t.runs.length, 0);
  assert.equal(t.code(), TEMPLATES.dfd);
});

test('an empty label is refused and the field gets the old label back', () => {
  const t = setup({ lang: 'en' });
  t.pick('2');
  t.type(t.$('#props-label'), '   ');
  assert.equal(t.code(), TEMPLATES.dfd);
  assert.equal(t.$('.props__message').textContent, 'The label cannot be empty.');
  assert.equal(t.$('#props-label').value, 'Take payment');
});

test('changing the kind rewrites the keyword of the declaration', () => {
  const t = setup({ lang: 'en' });
  t.pick('Bank');
  t.type(t.$('#props-kind'), 'store');
  assert.match(t.code(), /^store Bank "Payment bank"$/m);
  assert.equal(t.$('.props__message').textContent, 'The kind of Bank is changed: store.');
  assert.equal(t.runs.length, 1);
});

test('a kind that the notation does not offer is refused', () => {
  const t = setup({ lang: 'en' });
  t.pick('Bank');
  t.$('#props-kind').selectedIndex = -1;
  assert.equal(t.api.changeKind(), false);
  assert.equal(t.code(), TEMPLATES.dfd);
  assert.match(t.$('.props__message').textContent, /^Not changed: the notation does not read the block as/);
});

test('a kind change that the gate refuses leaves the code, says why and restores the field', () => {
  const t = setup();
  t.pick('1');
  t.type(t.$('#props-kind'), 'entity');
  assert.equal(t.code(), TEMPLATES.dfd);
  assert.match(t.$('.props__message').textContent, /^Не изменено: /);
  assert.equal(t.$('#props-kind').value, 'process');
  assert.equal(t.runs.length, 0);
});

test('a label typed after the code lost the label of the block changes nothing', () => {
  const t = setup();
  t.pick('2');
  showCode(t.document, t.$('.code__lines'), TEMPLATES.dfd.replace(' "Take payment"', ''));
  t.type(t.$('#props-label'), 'Charge card');
  assert.equal(t.code(), TEMPLATES.dfd.replace(' "Take payment"', ''));
  assert.equal(t.runs.length, 0);
});

test('the actions do nothing when no block is selected', () => {
  const t = setup();
  assert.equal(t.api.changeLabel(), false);
  assert.equal(t.api.changeKind(), false);
});

test('a run re-reads the fields, and a run with nothing selected keeps the panel hidden', () => {
  const t = setup();
  t.run();
  assert.equal(t.$('.props').hidden, true);
  t.pick('2');
  showCode(t.document, t.$('.code__lines'), TEMPLATES.dfd.replace('Take payment', 'Pay'));
  t.run();
  assert.equal(t.$('#props-label').value, 'Pay');
});

test('Escape in the panel gives the focus back to the picked block on the board; other keys do nothing', () => {
  const t = setup();
  t.$('.canvas__remote').hidden = false;
  t.$('.canvas__remote').innerHTML = '<div class="notation__node notation__node--picked" tabindex="0" data-id="2"></div>';
  t.pick('2');
  const node = t.$('.canvas__remote .notation__node');
  t.$('#props-label').dispatchEvent(new t.window.KeyboardEvent('keydown', { key: 'a', bubbles: true }));
  assert.notEqual(t.document.activeElement, node);
  t.$('#props-label').dispatchEvent(new t.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(t.document.activeElement, node);
});

test('foreign text goes into the panel as text, never as markup', () => {
  const t = setup();
  showCode(t.document, t.$('.code__lines'), 'diagram dfd "T"\nprocess 1 "<img src=x onerror=alert(1)>"');
  t.pick('1');
  assert.equal(t.$('#props-label').value, '<img src=x onerror=alert(1)>');
  assert.equal(t.$('.props img'), null);
});

test('the kinds are named in the language of the page, and a keyword without a name stays as written', () => {
  const ru = setup();
  ru.pick('2');
  assert.deepEqual(
    [...ru.$('#props-kind').options].map((option) => option.textContent),
    ['Сущность', 'Процесс', 'Хранилище данных'],
  );
  assert.deepEqual(
    [...ru.$('#props-kind').options].map((option) => option.value),
    ['entity', 'process', 'store'],
  );
  const en = setup({ lang: 'en' });
  en.pick('2');
  assert.equal(en.$('#props-kind').options[1].textContent, 'Process');
  assert.equal(kindName('nonsense', 'en'), 'nonsense');
});

test('the colour field shows the colour of the block and a note where the notation has none', () => {
  const t = setup({ lang: 'en' });
  t.pick('2');
  assert.equal(t.$('#props-color').closest('.props__field').hidden, false);
  assert.equal(t.$('#props-color').value, '#ffffff');
  showCode(t.document, t.$('.code__lines'), TEMPLATES.dfd.replace('process 2 "Take payment"', 'process 2 "Take payment" color=#ABC'));
  t.run();
  assert.equal(t.$('#props-color').value, '#aabbcc');
  const sequence = setup({ lang: 'en', template: 'erd' });
  showCode(sequence.document, sequence.$('.code__lines'), 'diagram erd "T"\nentity A "a"');
  sequence.pick('A');
  assert.equal(sequence.$('#props-color').closest('.props__field').hidden, true);
  assert.equal(sequence.$('.props__colornote').hidden, false);
  assert.equal(sequence.$('.props__colornote').textContent, 'Blocks of this notation are not coloured.');
});

test('choosing a colour writes color=#rrggbb into the code, runs the drawing and says so; the clear button removes it', () => {
  const t = setup({ lang: 'en' });
  t.pick('2');
  t.type(t.$('#props-color'), '#336699');
  assert.match(t.code(), /^process 2 "Take payment" color=#336699$/m);
  assert.equal(t.runs.length, 1);
  assert.equal(t.$('.props__message').textContent, 'The colour of 2 is changed: #336699.');
  t.$('.props__clear').click();
  assert.equal(t.code(), TEMPLATES.dfd);
  assert.equal(t.$('.props__message').textContent, 'The colour of 2 is cleared.');
  assert.equal(t.api.clearColor(), false);
});

test('a colour that is not valid is refused and the field gets the old colour back', () => {
  const t = setup({ lang: 'en' });
  t.pick('2');
  t.$('#props-color').value = '#336699';
  t.$('#props-color').dispatchEvent(new t.window.Event('change', { bubbles: true }));
  const set = t.code();
  assert.equal(t.api.changeColor('red;background:url(x)'), false);
  assert.equal(t.code(), set);
  assert.equal(t.$('.props__message').textContent, 'This is not a colour: the form is #ff8800 or #f80.');
  assert.equal(t.$('#props-color').value, '#336699');
});

test('the colour actions do nothing with no block selected', () => {
  const t = setup();
  assert.equal(t.api.changeColor('#fff'), false);
  assert.equal(t.api.clearColor(), false);
});

test('the colour is refused when the gate refuses the change', () => {
  const t = setup();
  showCode(t.document, t.$('.code__lines'), TEMPLATES.dfd);
  t.pick('2');
  assert.equal(t.api.changeColor('#102030'), true);
});
