import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { initBurger } from '../../site/js/components/burger.js';

const makeDom = (body = '') =>
  new JSDOM(`<!doctype html><html><body>${body}</body></html>`, {
    url: 'http://localhost/',
  });

const header = `
  <header class="header">
    <input class="burger__input" type="checkbox" id="burger-toggle" />
    <label class="burger__button" for="burger-toggle">Menu</label>
    <nav class="nav" aria-label="Main navigation">
      <ul>
        <li class="nav__item"><a class="nav__link" href="#how">How</a></li>
        <li class="nav__item"><span class="nav__note">note</span></li>
      </ul>
    </nav>
  </header>
  <main><p id="content">text</p></main>`;

const pressKey = (window, target, key) => target.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true }));

const click = (window, target) => target.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

describe('initBurger', () => {
  it('returns null when the burger checkbox is missing', () => {
    const { window } = makeDom('<nav class="nav"></nav>');
    assert.equal(initBurger({ root: window.document }), null);
  });

  it('reports open state from the checkbox and closes it', () => {
    const { window } = makeDom(header);
    const input = window.document.querySelector('.burger__input');
    const burger = initBurger({ root: window.document });
    assert.equal(burger.isOpen(), false);
    input.checked = true;
    assert.equal(burger.isOpen(), true);
    burger.close();
    assert.equal(input.checked, false);
    assert.equal(burger.isOpen(), false);
  });

  it('closes the open menu on Escape', () => {
    const { window } = makeDom(header);
    const input = window.document.querySelector('.burger__input');
    initBurger({ root: window.document });
    input.checked = true;
    pressKey(window, window.document, 'Escape');
    assert.equal(input.checked, false);
  });

  it('does nothing on Escape when the menu is already closed', () => {
    const { window } = makeDom(header);
    const input = window.document.querySelector('.burger__input');
    const burger = initBurger({ root: window.document });
    pressKey(window, window.document, 'Escape');
    assert.equal(input.checked, false);
    assert.equal(burger.isOpen(), false);
  });

  it('keeps the menu open for other keys', () => {
    const { window } = makeDom(header);
    const input = window.document.querySelector('.burger__input');
    initBurger({ root: window.document });
    input.checked = true;
    pressKey(window, window.document, 'Enter');
    assert.equal(input.checked, true);
  });

  it('closes the menu when a navigation link is clicked', () => {
    const { window } = makeDom(header);
    const input = window.document.querySelector('.burger__input');
    initBurger({ root: window.document });
    input.checked = true;
    click(window, window.document.querySelector('a.nav__link'));
    assert.equal(input.checked, false);
  });

  it('keeps the menu open when a non-link inside the navigation is clicked', () => {
    const { window } = makeDom(header);
    const input = window.document.querySelector('.burger__input');
    initBurger({ root: window.document });
    input.checked = true;
    click(window, window.document.querySelector('.nav__note'));
    assert.equal(input.checked, true);
  });

  it('keeps working without a navigation element', () => {
    const { window } = makeDom(`
      <input class="burger__input" type="checkbox" id="burger-toggle" />
      <p>no nav here</p>`);
    const input = window.document.querySelector('.burger__input');
    const burger = initBurger({ root: window.document });
    input.checked = true;
    pressKey(window, window.document, 'Escape');
    assert.equal(burger.isOpen(), false);
  });

  it('moves focus to the burger button when Escape closes the menu while focus is inside it', () => {
    const { window } = makeDom(header);
    const input = window.document.querySelector('.burger__input');
    initBurger({ root: window.document });
    input.checked = true;
    window.document.querySelector('a.nav__link').focus();
    pressKey(window, window.document, 'Escape');
    assert.equal(input.checked, false);
    assert.equal(window.document.activeElement, input);
  });

  it('leaves focus alone when it is outside the navigation', () => {
    const { window } = makeDom(`${header}<button id="other">other</button>`);
    const input = window.document.querySelector('.burger__input');
    const other = window.document.querySelector('#other');
    const burger = initBurger({ root: window.document });
    input.checked = true;
    other.focus();
    burger.close();
    assert.equal(window.document.activeElement, other);
  });
});
