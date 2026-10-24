import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initNodePanel } from '../../site/js/components/node-panel.js';
import { TEMPLATES, parseDiagram, renderNotation } from '../../site/js/notations/index.js';
import { editNode, readNode } from '../../site/js/utils/node-edit.js';

const html = readFileSync('site/app/editor.html', 'utf8');
const htmlEn = readFileSync('site/en/app/editor.html', 'utf8');
const FLOW = 'diagram bpmn "Flow"\nstart s "Go"\ntask t "Work" duration=2\nend e\nflow s -> t\nflow t -> e';

test('the line of a node is read: keyword, label and colour', () => {
  assert.deepEqual(readNode(FLOW, 't'), { keyword: 'task', label: 'Work', color: null });
  assert.deepEqual(readNode('task t color=#ff0 pos=1x1', 't'), { keyword: 'task', label: '', color: '#ff0' });
  assert.deepEqual(readNode('  task t "A \\"B\\" \\\\ C\\nD" color=#abcdef', 't'), { keyword: 'task', label: 'A "B" \\ C\nD', color: '#abcdef' });
  assert.equal(readNode(FLOW, 'missing'), null);
  assert.equal(readNode(FLOW, 'bpmn'), null, 'the header is not a node');
});

test('label, colour, kind and place are written into the line and everything else stays', () => {
  assert.equal(editNode(FLOW, 't', { label: 'Do it' }), FLOW.replace('"Work"', '"Do it"'));
  assert.equal(editNode(FLOW, 't', { label: ' t ' }), FLOW.replace(' "Work"', ''), 'a label equal to the id is the default one');
  assert.equal(editNode(FLOW, 't', { label: '' }), FLOW.replace(' "Work"', ''));
  assert.equal(editNode(FLOW, 't', { label: 'He said "hi"\\\nok' }), FLOW.replace('"Work"', '"He said \\"hi\\"\\\\\\nok"'));
  assert.equal(editNode(FLOW, 't', { kind: 'intermediate' }), FLOW.replace('task t', 'intermediate t'));
  assert.equal(editNode(FLOW, 't', { color: '#ffcc00' }), FLOW.replace('duration=2', 'duration=2 color=#ffcc00'));
  const coloured = editNode(FLOW, 't', { color: '#ffcc00' });
  assert.equal(editNode(coloured, 't', { color: '#00f' }), FLOW.replace('duration=2', 'duration=2 color=#00f'), 'the old colour is replaced, not repeated');
  assert.equal(editNode(coloured, 't', { color: null }), FLOW, 'null removes the colour');
  assert.equal(editNode(FLOW, 't', { color: null }), FLOW);
  assert.equal(editNode('task t bgcolor=1 color=#fff', 't', { color: null }), 'task t bgcolor=1');
  assert.equal(editNode(FLOW, 't', { x: 100, y: 50 }), FLOW.replace('duration=2', 'duration=2 pos=100x50'));
  assert.equal(
    editNode(FLOW, 't', { label: 'L', kind: 'task', color: '#abc', x: 1, y: 2 }),
    FLOW.replace('"Work" duration=2', '"L" duration=2 color=#abc pos=1x2'),
    'all fields at once',
  );
  assert.equal(editNode('task t duration=2 "x"', 't', { label: 'L' }), 'task t "L" duration=2 "x"', 'text after the attributes is kept');
});

test('values that could damage the code are refused', () => {
  assert.equal(editNode(FLOW, 'missing', { label: 'x' }), null);
  assert.equal(editNode(FLOW, 't', { label: 5 }), null);
  assert.equal(editNode(FLOW, 't', { kind: 'two words' }), null);
  assert.equal(editNode(FLOW, 't', { kind: undefined }), null);
  for (const color of ['red', '#12', '#ggg', '#ff00ff00', 'url(x)', '#fff" onload="x', undefined])
    assert.equal(editNode(FLOW, 't', { color }), null, String(color));
  assert.equal(editNode(FLOW, 't', { x: Number.NaN, y: 1 }), null);
  assert.equal(editNode(FLOW, 't', { x: 1 }), null, 'a place needs both numbers');
});

const setup = ({ source = FLOW, page = html, tabbed = false } = {}) => {
  const window = new JSDOM(page, { url: 'http://localhost/' }).window;
  const { document } = window;
  const pageEl = document.querySelector('.app-page--editor');
  const codeLines = document.querySelector('.code__lines');
  const remote = document.querySelector('.canvas__remote');
  const runs = [];
  const write = (text) =>
    codeLines.replaceChildren(
      ...text.split('\n').map((line) => {
        const item = document.createElement('li');
        item.className = 'code__line';
        item.innerHTML = '<code></code>';
        item.firstChild.textContent = line;
        return item;
      }),
    );
  const draw = () => {
    const code = [...codeLines.querySelectorAll('code')].map((line) => line.textContent).join('\n');
    remote.innerHTML = renderNotation(parseDiagram(code));
    remote.hidden = false;
  };
  write(source);
  draw();
  if (tabbed) remote.querySelector('[data-id="s"]').setAttribute('tabindex', '-1');
  pageEl.addEventListener('dslkit:run', () => {
    runs.push('run');
    draw();
  });
  const api = initNodePanel({ root: document });
  const form = document.querySelector('.node-panel');
  const code = () => [...codeLines.querySelectorAll('code')].map((line) => line.textContent).join('\n');
  const node = (id) => remote.querySelector(`[data-id="${id}"]`);
  const change = (name, value) => {
    form.elements[name].value = value;
    form.elements[name].dispatchEvent(new window.Event('change', { bubbles: true }));
  };
  const key = (target, name) => target.dispatchEvent(new window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
  return { window, document, api, form, remote, code, node, change, key, runs, write, draw };
};
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

test('a page without the panel, the canvas or the code gets none', () => {
  const plain = new JSDOM('<!doctype html><html><body></body></html>').window;
  assert.equal(initNodePanel({ root: plain.document }), null);
  const half = new JSDOM('<!doctype html><html><body><div class="app-page--editor"><div class="canvas__remote"></div></div></body></html>').window;
  assert.equal(initNodePanel({ root: half.document }), null);
});

test('a click on a block opens the panel with its values, the block is marked and reachable with the keyboard', () => {
  const { node, form, api, remote, window } = setup();
  assert.equal(form.hidden, true);
  assert.equal(node('t').getAttribute('tabindex'), '0');
  assert.equal(node('t').getAttribute('role'), 'button');
  node('t').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.equal(form.hidden, false);
  assert.equal(api.selected(), 't');
  assert.equal(form.querySelector('[data-node-id]').textContent, 't');
  assert.equal(form.elements.label.value, 'Work');
  assert.equal(form.elements.color.value, '#ffffff');
  assert.equal(form.elements.kind.value, 'task');
  assert.ok([...form.elements.kind.options].some((option) => option.value === 'exclusive'));
  assert.equal(form.querySelector('[data-node-position]').hidden, false);
  assert.match(form.elements.x.value, /^\d+$/);
  assert.ok(node('t').classList.contains('notation__node--selected'));
  assert.equal(remote.querySelectorAll('.notation__node--selected').length, 1);
  remote.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.equal(api.selected(), 't', 'a click on the empty canvas changes nothing');
});

test('a block without a label shows its id, and a block that already has a tab stop keeps it', () => {
  const { api, form, node } = setup({ source: 'diagram bpmn\nstart s\ntask t\nflow s -> t', tabbed: true });
  api.select('t');
  assert.equal(form.elements.label.value, 't');
  assert.equal(node('s').getAttribute('tabindex'), '-1');
  assert.equal(node('s').getAttribute('role'), null, 'the drag component has already prepared it');
});

test('Enter and Space on a block open the panel, other keys and other targets do not', () => {
  const { node, form, key, remote, api } = setup();
  key(node('t'), 'a');
  assert.equal(form.hidden, true);
  key(remote, 'Enter');
  assert.equal(form.hidden, true);
  key(node('s'), 'Enter');
  assert.equal(api.selected(), 's');
  key(node('t'), ' ');
  assert.equal(api.selected(), 't');
});

test('every field writes into the code and the diagram is drawn again', async () => {
  const { node, form, change, code, runs, api } = setup();
  api.select('t');
  change('label', 'Do the work');
  assert.match(code(), /^task t "Do the work" duration=2$/m);
  assert.deepEqual(runs, ['run']);
  await settle();
  assert.equal(form.elements.label.value, 'Do the work', 'the panel follows the new drawing');
  assert.ok(node('t').classList.contains('notation__node--selected'), 'the new drawing keeps the mark');
  change('color', '#ffcc00');
  assert.match(code(), /^task t "Do the work" duration=2 color=#ffcc00$/m);
  assert.match(node('t').innerHTML, /fill="#ffcc00"/, 'the block is drawn in its colour');
  await settle();
  assert.equal(form.elements.color.value, '#ffcc00');
  change('kind', 'intermediate');
  assert.match(code(), /^intermediate t "Do the work"/m);
  await settle();
  assert.equal(form.elements.kind.value, 'intermediate');
  change('x', '400');
  assert.match(code(), /pos=400x\d+$/m);
  change('y', '300');
  assert.match(code(), /pos=400x300$/m);
  await settle();
  assert.equal(form.elements.x.value, '400');
  assert.equal(runs.length, 5);
});

test('the colour can be reset, a bad number or an unchanged value changes nothing', async () => {
  const { form, change, code, runs, api, document } = setup({ source: `${FLOW.replace('duration=2', 'duration=2 color=#ff0000')}` });
  api.select('t');
  assert.equal(form.elements.color.value, '#ff0000');
  form.querySelector('[data-node-reset-colour]').click();
  assert.doesNotMatch(code(), /color=/);
  assert.equal(runs.length, 1);
  change('label', 'Work');
  assert.equal(runs.length, 1, 'the same label is not a change');
  form.elements.x.value = '';
  form.elements.x.dispatchEvent(new document.defaultView.Event('change', { bubbles: true }));
  assert.equal(runs.length, 1);
  assert.match(form.elements.x.value, /^\d+$/, 'the field gets the real value back');
  form.dispatchEvent(new document.defaultView.Event('change', { bubbles: true }));
  assert.equal(api.apply({ label: 'x' }) && runs.length, 2);
  api.close();
  assert.equal(api.apply({ label: 'y' }), false, 'nothing is chosen');
  form.querySelector('[data-node-reset-colour]').click();
  assert.equal(runs.length, 2);
});

test('the form never reloads the page and closes with the button or Escape', () => {
  const { form, window, api, key, node } = setup();
  api.select('s');
  const submit = new window.Event('submit', { cancelable: true, bubbles: true });
  form.dispatchEvent(submit);
  assert.equal(submit.defaultPrevented, true);
  key(form.elements.label, 'a');
  assert.equal(form.hidden, false);
  key(form.elements.label, 'Escape');
  assert.equal(form.hidden, true);
  assert.equal(api.selected(), null);
  assert.ok(!node('s').classList.contains('notation__node--selected'));
  api.select('s');
  form.querySelector('[data-node-close]').click();
  assert.equal(form.hidden, true);
});

test('the panel closes when its block disappears from the code or from the drawing', async () => {
  const { form, api, write, draw, remote } = setup();
  api.select('t');
  write('diagram bpmn "Flow"\nstart s "Go"\nend e\nflow s -> e');
  draw();
  await settle();
  assert.equal(form.hidden, true);
  api.select('s');
  assert.equal(form.hidden, false);
  remote.replaceChildren();
  await settle();
  assert.equal(form.hidden, true, 'a drawing by another engine has no blocks to choose');
  api.select('s');
  assert.equal(form.hidden, true, 'a block that is not on the canvas cannot be chosen');
});

test('notations without block lines of the form keyword-id-label offer no panel', () => {
  const { api, form } = setup({ source: TEMPLATES['uml-class'] });
  const id = parseDiagram(TEMPLATES['uml-class']).classes[0].id;
  api.select(id);
  assert.equal(form.hidden, true);
});

test('a Gantt bar has no place to drag, but its label, colour and type can be edited', async () => {
  const { api, form, change, code, node, remote } = setup({ source: TEMPLATES.gantt });
  assert.equal(node('build').getAttribute('tabindex'), '0');
  assert.equal(node('build').getAttribute('aria-label'), 'build');
  api.select('build');
  assert.equal(form.hidden, false);
  assert.equal(form.querySelector('[data-node-position]').hidden, true);
  assert.deepEqual(
    [...form.elements.kind.options].map((option) => option.value),
    ['task', 'milestone'],
  );
  change('color', '#aa3366');
  assert.match(code(), /^task build "Build" days=10 done=40 color=#aa3366$/m);
  await settle();
  assert.match(remote.innerHTML, /#aa3366/);
  change('kind', 'milestone');
  assert.match(code(), /^milestone build "Build"/m);
});

test('the English page has the same panel', () => {
  const { form } = setup({ page: htmlEn });
  assert.equal(form.getAttribute('aria-label'), 'Block properties');
  assert.deepEqual(
    [...form.querySelectorAll('input, select')].map((field) => field.name),
    ['label', 'color', 'kind', 'x', 'y'],
  );
});

test('the Russian and English pages have the same panel markup apart from the words', () => {
  const names = (page) =>
    [...new JSDOM(page).window.document.querySelectorAll('.node-panel *')].map((element) => `${element.tagName}${element.getAttribute('name') ?? ''}`);
  assert.deepEqual(names(html), names(htmlEn));
});
