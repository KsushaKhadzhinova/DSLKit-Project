import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JSDOM } from 'jsdom';
import { initOrientation } from '../../site/js/components/orientation.js';

const PAGE = `<!doctype html><html lang="ru"><body>
<details class="editor-menu" open><summary>menu</summary></details>
<main class="editor-main">
  <div class="editor-tabs"></div>
  <div class="editor-panel"><section class="code"><ol class="code__lines"></ol><textarea class="code__input">one
two
three
four</textarea></section></div>
<figure class="canvas"><div class="canvas__remote"></div></figure>
</main></body></html>`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A window whose matchMedia answers from a table that the test can change, and an optional visualViewport.
const setup = ({ viewport = true, lang = 'ru', matchMedia = true, html = PAGE } = {}) => {
  const dom = new JSDOM(html.replace('lang="ru"', `lang="${lang}"`), { url: 'http://localhost/' });
  const { window } = dom;
  const table = { portrait: true, short: false, square: false, ultrawide: false, tall: false };
  const names = {
    '(orientation: portrait)': 'portrait',
    '(max-height: 499.98px)': 'short',
    '(min-aspect-ratio: 9/10) and (max-aspect-ratio: 11/10)': 'square',
    '(min-aspect-ratio: 2/1)': 'ultrawide',
    '(max-aspect-ratio: 9/20)': 'tall',
  };
  const listeners = [];
  if (matchMedia) {
    window.matchMedia = (query) => ({
      get matches() {
        return table[names[query]];
      },
      addEventListener: (type, fn) => listeners.push(fn),
    });
  }
  const vv = new window.EventTarget();
  vv.height = 800;
  if (viewport) Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
  const doc = window.document;
  const api = initOrientation({ root: doc });
  return {
    window,
    doc,
    api,
    table,
    listeners,
    vv,
    input: doc.querySelector('.code__input'),
    panel: doc.querySelector('.editor-panel'),
    canvas: doc.querySelector('.canvas'),
    main: doc.querySelector('.editor-main'),
  };
};

const size = (element, props) => Object.entries(props).forEach(([name, value]) => Object.defineProperty(element, name, { value, configurable: true }));

describe('initOrientation setup', () => {
  it('does nothing without the editor, the code input or matchMedia', () => {
    assert.equal(initOrientation({ root: new JSDOM('<main></main>').window.document }), null);
    assert.equal(setup({ matchMedia: false }).api, null);
    assert.equal(initOrientation({ root: new JSDOM('<main class="editor-main"><div class="editor-panel"></div></main>').window.document }), null);
  });

  it('uses the document as the default root', () => {
    const dom = new JSDOM('<main></main>');
    globalThis.document = dom.window.document;
    assert.equal(initOrientation(), null);
    delete globalThis.document;
  });

  it('tags the page with the orientation, the height and the aspect classes', () => {
    const { api, doc, table } = setup();
    assert.equal(api.mode(), 'portrait/regular/regular');
    assert.deepEqual({ ...doc.documentElement.dataset }, { orientation: 'portrait', height: 'regular', aspect: 'regular' });
    Object.assign(table, { portrait: false, short: true, square: true });
    assert.equal(api.classify(), 'landscape/short/square');
    Object.assign(table, { square: false, ultrawide: true });
    assert.equal(api.classify(), 'landscape/short/ultrawide');
    Object.assign(table, { ultrawide: false, tall: true });
    assert.equal(api.classify(), 'landscape/short/tall');
    Object.assign(table, { square: true, ultrawide: true });
    assert.equal(api.classify(), 'landscape/short/square');
  });

  it('labels the splitter in the language of the page', () => {
    assert.equal(setup().api.splitter.getAttribute('aria-label'), 'Размер кода и холста');
    assert.equal(setup({ lang: 'en' }).api.splitter.getAttribute('aria-label'), 'Resize the code and the canvas');
    const { api, panel } = setup();
    assert.equal(panel.nextElementSibling, api.splitter);
    assert.equal(api.splitter.getAttribute('role'), 'separator');
    assert.equal(api.splitter.tabIndex, 0);
  });
});

describe('the splitter', () => {
  it('starts at the golden ratio and describes itself to assistive technology', () => {
    const { api, main } = setup();
    assert.equal(api.ratio(), 38.2);
    assert.equal(main.style.getPropertyValue('--split-ratio'), '38.2');
    assert.equal(api.splitter.getAttribute('aria-valuenow'), '38');
    assert.equal(api.splitter.getAttribute('aria-orientation'), 'vertical');
    assert.equal(api.splitter.getAttribute('aria-valuemin'), '20');
  });

  it('keeps both panes at least 192 px wide or high and reports the axis', () => {
    const { api, main } = setup();
    size(main, { clientWidth: 800, clientHeight: 1000 });
    api.splitter.style.setProperty('--split-axis', 'x');
    assert.equal(api.setRatio(1), 24);
    assert.equal(api.setRatio(99), 76);
    api.splitter.style.setProperty('--split-axis', 'y');
    assert.equal(api.setRatio(1), 19.2);
    assert.equal(api.splitter.getAttribute('aria-orientation'), 'horizontal');
    size(main, { clientWidth: 300, clientHeight: 300 });
    assert.equal(api.setRatio(1), 45);
  });

  it('follows the pointer along the axis, with and without pointer capture', () => {
    const { api, main, panel, window } = setup();
    size(main, { clientWidth: 1000, clientHeight: 600 });
    panel.getBoundingClientRect = () => ({ left: 50, top: 100 });
    const fire = (type, init = {}) => {
      const event = new window.MouseEvent(type, { bubbles: true, cancelable: true, ...init });
      api.splitter.dispatchEvent(event);
      return event;
    };
    fire('pointermove', { clientX: 400 });
    assert.equal(api.ratio(), 38.2, 'not dragging');
    assert.equal(fire('pointerdown').defaultPrevented, true);
    api.splitter.style.setProperty('--split-axis', 'x');
    fire('pointermove', { clientX: 450 });
    assert.equal(api.ratio(), 40);
    api.splitter.style.setProperty('--split-axis', 'y');
    fire('pointermove', { clientY: 400 });
    assert.equal(api.ratio(), 50);
    let captured = 0;
    api.splitter.setPointerCapture = () => {
      captured += 1;
    };
    fire('pointerup');
    fire('pointermove', { clientY: 100 });
    assert.equal(api.ratio(), 50, 'released');
    fire('pointerdown');
    assert.equal(captured, 1);
    fire('pointercancel');
    fire('pointermove', { clientY: 100 });
    assert.equal(api.ratio(), 50);
    fire('pointerdown');
    size(main, { clientWidth: 0, clientHeight: 0 });
    fire('pointermove', { clientY: 300 });
    assert.equal(api.ratio(), 50, 'a hidden splitter does not move');
  });

  it('works from the keyboard and resets on a double click', () => {
    const { api, main, window } = setup();
    size(main, { clientWidth: 1000, clientHeight: 1000 });
    const press = (key) => {
      const event = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      api.splitter.dispatchEvent(event);
      return event.defaultPrevented;
    };
    assert.equal(press('ArrowRight'), true);
    assert.equal(api.ratio(), 40.2);
    press('ArrowUp');
    assert.equal(api.ratio(), 38.2);
    press('ArrowLeft');
    press('ArrowDown');
    press('Home');
    assert.equal(api.ratio(), 19.2);
    press('End');
    assert.equal(api.ratio(), 80.8);
    press('Enter');
    assert.equal(api.ratio(), 38.2);
    press('End');
    api.splitter.dispatchEvent(new window.MouseEvent('dblclick'));
    assert.equal(api.ratio(), 38.2);
    assert.equal(press('x'), false);
  });
});

describe('rotation', () => {
  it('keeps the cursor, the selection, the scroll positions and the focus', async () => {
    const { api, input, panel, window, doc, listeners } = setup();
    input.focus();
    input.setSelectionRange(4, 7, 'backward');
    input.scrollTop = 30;
    input.scrollLeft = 5;
    panel.scrollTop = 40;
    panel.scrollLeft = 6;
    window.dispatchEvent(new window.Event('orientationchange'));
    input.blur();
    input.setSelectionRange(0, 0);
    input.scrollTop = 0;
    panel.scrollTop = 0;
    window.dispatchEvent(new window.Event('resize'));
    let heard = null;
    doc.addEventListener('dslkit:orientation', (event) => {
      heard = event.detail.mode;
    });
    await sleep(160);
    assert.equal(doc.activeElement, input);
    assert.deepEqual([input.selectionStart, input.selectionEnd], [4, 7]);
    assert.equal(panel.scrollLeft, 6);
    assert.equal(heard, 'portrait/regular/regular');
    listeners[0]();
    listeners[1]();
    await sleep(160);
    assert.equal(api.mode(), 'portrait/regular/regular');
  });

  it('does not steal the focus and does not touch an unchanged selection', async () => {
    const { input, window, doc } = setup();
    input.setSelectionRange(2, 2);
    window.dispatchEvent(new window.Event('resize'));
    await sleep(160);
    assert.notEqual(doc.activeElement, input);
    assert.equal(input.selectionStart, 2);
  });

  it('closes the open menu only when the mode changed', async () => {
    const { window, doc, table } = setup();
    const menu = doc.querySelector('.editor-menu');
    window.dispatchEvent(new window.Event('resize'));
    await sleep(160);
    assert.equal(menu.open, true);
    table.portrait = false;
    window.dispatchEvent(new window.Event('resize'));
    window.dispatchEvent(new window.Event('resize'));
    await sleep(160);
    assert.equal(menu.open, false);
    assert.equal(doc.documentElement.dataset.orientation, 'landscape');
  });

  it('fits a fitted drawing again and keeps the centre of a zoomed one', async () => {
    const { window, canvas, doc } = setup();
    size(canvas, { clientWidth: 400, clientHeight: 300, scrollWidth: 1000, scrollHeight: 600 });
    canvas.scrollLeft = 300;
    canvas.scrollTop = 150;
    window.dispatchEvent(new window.Event('resize'));
    await sleep(160);
    assert.deepEqual([canvas.scrollLeft, canvas.scrollTop], [0, 0]);
    doc.querySelector('.canvas__remote').dataset.zoom = '2';
    canvas.scrollLeft = 300;
    canvas.scrollTop = 150;
    window.dispatchEvent(new window.Event('resize'));
    size(canvas, { scrollWidth: 2000, scrollHeight: 1200 });
    await sleep(160);
    assert.deepEqual([canvas.scrollLeft, canvas.scrollTop], [800, 450]);
    size(canvas, { scrollWidth: 0, scrollHeight: 0 });
    window.dispatchEvent(new window.Event('resize'));
    await sleep(160);
  });
});

describe('the on-screen keyboard', () => {
  it('tells CSS the visual height and flags an open keyboard', () => {
    const { doc, vv, window } = setup();
    assert.equal(doc.documentElement.style.getPropertyValue('--vv-height'), '800px');
    assert.equal(doc.documentElement.dataset.keyboard, undefined);
    vv.height = 420;
    vv.dispatchEvent(new window.Event('scroll'));
    assert.equal(doc.documentElement.dataset.keyboard, 'open');
    assert.equal(doc.documentElement.style.getPropertyValue('--vv-height'), '420px');
    vv.height = 800;
    vv.dispatchEvent(new window.Event('scroll'));
    assert.equal(doc.documentElement.dataset.keyboard, undefined);
  });

  it('works without visualViewport', async () => {
    const { doc, api, input, window } = setup({ viewport: false });
    assert.equal(doc.documentElement.style.getPropertyValue('--vv-height'), '');
    assert.equal(doc.documentElement.dataset.keyboard, undefined);
    input.focus();
    assert.equal(api.revealCaret(), true);
    window.dispatchEvent(new window.Event('resize'));
    await sleep(160);
  });

  it('scrolls the caret line above the keyboard', async () => {
    const { api, input, panel, vv, window, doc } = setup();
    doc.querySelector('.code__lines').style.lineHeight = '20px';
    size(panel, { clientHeight: 100 });
    panel.getBoundingClientRect = () => ({ bottom: 300 });
    assert.equal(api.revealCaret(), false, 'the input has no focus');
    input.focus();
    input.setSelectionRange(0, 0);
    assert.equal(api.revealCaret(), true);
    assert.equal(panel.scrollTop, 0);
    vv.height = 250;
    vv.dispatchEvent(new window.Event('resize'));
    input.setSelectionRange(input.value.length, input.value.length);
    api.revealCaret();
    assert.equal(panel.scrollTop, 4 * 20 - (100 - 50));
    input.setSelectionRange(0, 0);
    panel.scrollTop = 40;
    input.dispatchEvent(new window.Event('input'));
    assert.equal(panel.scrollTop, 0);
    vv.height = 800;
    panel.scrollTop = 0;
    input.setSelectionRange(0, 0);
    input.dispatchEvent(new window.Event('focus'));
    await sleep(160);
    assert.equal(panel.scrollTop, 0);
  });

  it('falls back to a line height of 24 px when the style has none', () => {
    const { api, input, panel } = setup({ viewport: false });
    size(panel, { clientHeight: 30 });
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    api.revealCaret();
    assert.equal(panel.scrollTop, 4 * 24 - 30);
  });
});
