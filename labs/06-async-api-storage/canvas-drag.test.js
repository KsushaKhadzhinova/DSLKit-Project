import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initCanvasDrag, pointInDrawing } from '../../site/js/components/canvas-drag.js';
import { parseDiagram, renderNotation } from '../../site/js/notations/index.js';
import { parsePosition } from '../../site/js/notations/svg.js';
import { setNodePosition } from '../../site/js/utils/node-position.js';

const html = readFileSync('site/app/editor.html', 'utf8');

test('a position is written to the line of the node: added, replaced, kept apart from strings', () => {
  const source = 'diagram bpmn "pos=1x1"\nstart s "Go pos=2x2"\ntask t "Work" duration=2\nflow s -> t\nflow t -> s "t"';
  assert.equal(setNodePosition(source, 't', 120.04, 80.06), source.replace('task t "Work" duration=2', 'task t "Work" duration=2 pos=120x80.1'));
  const again = setNodePosition(setNodePosition(source, 's', 10, 20), 's', 30, 40);
  assert.match(again, /^start s "Go pos=2x2" pos=30x40$/m);
  assert.match(again, /^diagram bpmn "pos=1x1"$/m, 'the header is never changed');
  assert.match(setNodePosition('task t "A"  \n', 't', 1, 2), /^task t "A" pos=1x2$/m);
  assert.match(setNodePosition('task t pos=5x5 duration=1', 't', -3, 4), /^task t pos=-3x4 duration=1$/);
  assert.equal(setNodePosition(source, 'missing', 1, 2), null);
  assert.equal(setNodePosition(source, 'bpmn', 1, 2), null, 'a word of the header is not a node');
  assert.equal(setNodePosition('task a.b "x"', 'a.b', 1, 2), 'task a.b "x" pos=1x2', 'dots in ids are not patterns');
  assert.equal(setNodePosition('task ab "x"\ntask a "y"', 'a', 1, 2), 'task ab "x"\ntask a "y" pos=1x2', 'only the whole id counts');
});

test('a position attribute is read only in the form XxY', () => {
  assert.deepEqual(parsePosition('120x80'), { x: 120, y: 80 });
  assert.deepEqual(parsePosition('-5.5x0.25'), { x: -5.5, y: 0.25 });
  for (const value of [undefined, true, 'abc', '12x', '1,2', 'x5']) assert.equal(parsePosition(value), null);
});

const flow = (pos = '') => 'diagram bpmn "Flow"\nstart s "Go"\ntask t "Work"' + (pos ? ` ${pos}` : '') + '\nend e\nflow s -> t\nflow t -> e';
const centreOf = (svg, id) => {
  const found = new RegExp(`data-id="${id}" data-cx="([-0-9.]+)" data-cy="([-0-9.]+)"`).exec(svg);
  return found.slice(1).map(Number);
};
const sizeOfSvg = (svg) => /width="([0-9.]+)" height="([0-9.]+)"/.exec(svg).slice(1).map(Number);

test('the layout puts a node where the code says and the drawing grows to hold it', () => {
  const plain = renderNotation(parseDiagram(flow()));
  const [autoX, autoY] = centreOf(plain, 't');
  const moved = renderNotation(parseDiagram(flow('pos=900x700')));
  assert.deepEqual(centreOf(moved, 't'), [900, 700]);
  assert.notDeepEqual([autoX, autoY], [900, 700]);
  assert.deepEqual(centreOf(moved, 's'), centreOf(plain, 's'), 'other nodes stay');
  const [width, height] = sizeOfSvg(moved);
  assert.ok(width > 900 && height > 700);
  const small = renderNotation(parseDiagram(flow('pos=-50x-50')));
  const [smallX, smallY] = centreOf(small, 't');
  assert.ok(smallX >= 8 && smallY >= 8, 'a node cannot leave the page');
  assert.deepEqual(centreOf(renderNotation(parseDiagram(flow('pos=wrong'))), 't'), [autoX, autoY], 'a damaged position is ignored');
});

test('the moved node is the end of its arrows', () => {
  const near = renderNotation(parseDiagram(flow('pos=300x200')));
  assert.match(near, /class="notation__edge"/);
  assert.notEqual(near, renderNotation(parseDiagram(flow())));
});

const rectOf = (element, rect = { left: 0, top: 0, width: 200, height: 100 }) => {
  element.getBoundingClientRect = () => rect;
};

const setup = ({ withCapture = false } = {}) => {
  const window = new JSDOM(html, { url: 'http://localhost/' }).window;
  const { document } = window;
  const page = document.querySelector('.app-page--editor');
  const runs = [];
  page.addEventListener('dslkit:run', () => runs.push('run'));
  const codeLines = document.querySelector('.code__lines');
  codeLines.replaceChildren(
    ...flow()
      .split('\n')
      .map((text) => {
        const item = document.createElement('li');
        item.className = 'code__line';
        item.innerHTML = '<code></code>';
        item.firstChild.textContent = text;
        return item;
      }),
  );
  const remote = document.querySelector('.canvas__remote');
  const draw = () => {
    remote.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><g class="notation__node" data-id="t" data-cx="100" data-cy="50"></g><g class="notation__node" data-id="gone" data-cx="10" data-cy="10"></g><g class="other" data-id="s"></g></svg>';
    rectOf(remote.querySelector('svg'));
    remote.hidden = false;
  };
  draw();
  const api = initCanvasDrag({ root: document });
  const node = () => remote.querySelector('[data-id="t"]');
  const send = (target, type, init = {}) => {
    const Kind = type.startsWith('key') ? window.KeyboardEvent : window.MouseEvent;
    const event = new Kind(type, { bubbles: true, cancelable: true, ...init });
    if (withCapture) target.setPointerCapture = (id) => (target.captured = id);
    target.dispatchEvent(event);
    return event;
  };
  const code = () => [...codeLines.querySelectorAll('code')].map((line) => line.textContent).join('\n');
  return { window, document, remote, api, node, send, code, runs, draw };
};
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

test('without a canvas or code the drag is not started', () => {
  const plain = new JSDOM('<!doctype html><html><body></body></html>').window;
  assert.equal(initCanvasDrag({ root: plain.document }), null);
  const half = new JSDOM('<!doctype html><html><body><div class="app-page--editor"><div class="canvas__remote"></div></div></body></html>').window;
  assert.equal(initCanvasDrag({ root: half.document }), null);
});

test('a screen point is converted into the units of the drawing', () => {
  const window = new JSDOM('<svg viewBox="0 0 400 200"></svg>').window;
  const svg = window.document.querySelector('svg');
  rectOf(svg, { left: 10, top: 20, width: 200, height: 100 });
  assert.deepEqual(pointInDrawing(svg, 60, 70), { x: 100, y: 100 });
  svg.removeAttribute('viewBox');
  assert.deepEqual(pointInDrawing(svg, 60, 70), { x: 50, y: 50 });
  rectOf(svg, { left: 0, top: 0, width: 0, height: 0 });
  assert.deepEqual(pointInDrawing(svg, 5, 5), { x: 0, y: 0 });
});

test('dragging a block moves it on the screen and writes the new place into the code', () => {
  const { send, node, code, runs, api } = setup({ withCapture: true });
  const start = send(node(), 'pointerdown', { clientX: 50, clientY: 25, button: 0 });
  assert.equal(start.defaultPrevented, true);
  assert.equal(api.isDragging(), true);
  assert.ok(node().classList.contains('notation__node--dragging'));
  send(node(), 'pointermove', { clientX: 60, clientY: 35 });
  assert.equal(node().getAttribute('transform'), 'translate(20 20)');
  send(node(), 'pointerup');
  assert.equal(api.isDragging(), false);
  assert.equal(node().getAttribute('transform'), null);
  assert.ok(!node().classList.contains('notation__node--dragging'));
  assert.match(code(), /^task t "Work" pos=120x70$/m);
  assert.deepEqual(runs, ['run']);
});

test('a click without a real move, a cancelled drag and a node that is not in the code change nothing', () => {
  const { send, node, code, runs, remote } = setup();
  const before = code();
  send(node(), 'pointerdown', { clientX: 50, clientY: 25 });
  send(node(), 'pointermove', { clientX: 51, clientY: 25 });
  send(node(), 'pointerup');
  assert.equal(code(), before, 'a move of one unit is a click');
  send(node(), 'pointerdown', { clientX: 50, clientY: 25 });
  send(node(), 'pointermove', { clientX: 90, clientY: 80 });
  send(node(), 'pointercancel');
  assert.equal(code(), before);
  assert.equal(node().getAttribute('transform'), null);
  const ghost = remote.querySelector('[data-id="gone"]');
  send(ghost, 'pointerdown', { clientX: 5, clientY: 5 });
  send(ghost, 'pointermove', { clientX: 60, clientY: 60 });
  send(ghost, 'pointerup');
  assert.equal(code(), before);
  assert.deepEqual(runs, []);
});

test('only the main button on a block starts a drag, moves and releases without a drag are ignored', () => {
  const { send, node, remote, api } = setup();
  send(node(), 'pointerdown', { button: 2 });
  assert.equal(api.isDragging(), false);
  send(remote.querySelector('.other'), 'pointerdown', { button: 0 });
  assert.equal(api.isDragging(), false);
  send(remote, 'pointerdown', { button: 0 });
  assert.equal(api.isDragging(), false);
  send(node(), 'pointermove', { clientX: 5, clientY: 5 });
  send(node(), 'pointerup');
  send(node(), 'pointercancel');
  assert.equal(node().getAttribute('transform'), null);
});

test('arrow keys move a focused block by 10 units, with Shift by 50', () => {
  const { send, node, code, runs } = setup();
  assert.equal(node().getAttribute('tabindex'), '0');
  assert.equal(node().getAttribute('role'), 'button');
  assert.equal(node().getAttribute('aria-label'), 't');
  const right = send(node(), 'keydown', { key: 'ArrowRight' });
  assert.equal(right.defaultPrevented, true);
  assert.match(code(), /^task t "Work" pos=110x50$/m);
  send(node(), 'keydown', { key: 'ArrowDown', shiftKey: true });
  assert.match(code(), /^task t "Work" pos=100x100$/m, 'the keys move from the place of the drawing');
  const other = send(node(), 'keydown', { key: 'a' });
  assert.equal(other.defaultPrevented, false);
  assert.equal(runs.length, 2);
  const outside = setup();
  send(outside.remote, 'keydown', { key: 'ArrowLeft' });
  assert.deepEqual(outside.runs, []);
});

test('after the diagram is drawn again the focus returns to the moved block', async () => {
  const { send, node, remote, draw, document } = setup();
  node().focus();
  send(node(), 'keydown', { key: 'ArrowLeft' });
  draw();
  await settle();
  assert.equal(document.activeElement, node());
  assert.equal(node().getAttribute('tabindex'), '0');
  draw();
  await settle();
  assert.notEqual(document.activeElement, node(), 'the focus is returned once');
  assert.ok(remote.querySelector('svg'));
});
