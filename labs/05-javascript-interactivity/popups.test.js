import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initPopups } from '../../site/js/components/popups.js';

const page = () => new JSDOM(readFileSync('site/app/editor.html', 'utf8'), { url: 'http://localhost/' }).window;
const down = (window, node) => node.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true }));

test('a page without menus starts nothing', () => {
  assert.equal(initPopups({ root: new JSDOM('<!doctype html><p>x</p>').window.document }), null);
});

test('a press outside the open menu, Escape, or another menu closes it', () => {
  const window = page();
  const { document } = window;
  const api = initPopups({ root: document });
  const menu = document.querySelector('details.editor-menu');
  menu.open = true;
  down(window, menu.querySelector('.editor-menu__panel button'));
  assert.equal(menu.open, true);
  down(window, document.body);
  assert.equal(menu.open, false);
  menu.open = true;
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(menu.open, false);
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'a', bubbles: true }));
  assert.equal(api.closeAll(), 0);
});

test('a card menu and a board menu close when another one is pressed', () => {
  const window = new JSDOM(
    `<!doctype html><body>
    <div class="board-tools"><button aria-expanded="true" id="add"></button><div class="board-tools__pop"></div></div>
    <ul><li class="project-card" id="a"><button class="project-card__menu" aria-expanded="true"></button><div class="project-card__actions"></div></li>
    <li class="project-card" id="b"><button class="project-card__menu" aria-expanded="true"></button><div class="project-card__actions"></div></li></ul></body>`,
  ).window;
  const { document } = window;
  initPopups({ root: document });
  down(window, document.querySelector('#b .project-card__menu'));
  assert.equal(document.querySelector('#a .project-card__actions').hidden, true);
  assert.equal(document.querySelector('#a .project-card__menu').getAttribute('aria-expanded'), 'false');
  assert.equal(document.querySelector('#b .project-card__actions').hidden, false);
  assert.equal(document.querySelector('.board-tools__pop').hidden, true);
  assert.equal(document.querySelector('#add').getAttribute('aria-expanded'), 'false');
});

test('opening the toolbar menu closes an open drawer of the activity bar', () => {
  const window = page();
  const { document } = window;
  initPopups({ root: document });
  const drawer = document.createElement('aside');
  drawer.className = 'editor-tools';
  const close = document.createElement('button');
  close.className = 'editor-tools__close';
  let pressed = 0;
  close.addEventListener('click', () => (pressed += 1));
  drawer.append(close);
  document.body.append(drawer);
  const menu = document.querySelector('details.editor-menu');
  menu.open = true;
  menu.dispatchEvent(new window.Event('toggle'));
  assert.equal(pressed, 1);
  document.body.dispatchEvent(new window.Event('toggle'));
  assert.equal(pressed, 1);
});
