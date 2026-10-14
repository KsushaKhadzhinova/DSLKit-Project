import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';
import { initAccordion } from '../../site/js/components/accordion.js';

const makeDom = (body = '') =>
  new JSDOM(`<!doctype html><html><body>${body}</body></html>`, {
    url: 'http://localhost/',
  });

const faqItem = (n) => `
  <details class="faq__item">
    <summary class="faq__question">Question ${n}</summary>
    <div class="faq__answer">Answer ${n}</div>
  </details>`;

const faq = `<main><section class="section" id="faq">
  <h2>FAQ</h2>${faqItem(1)}${faqItem(2)}${faqItem(3)}
</section></main>`;

const throwingStorage = () =>
  createStorage({
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
    removeItem: () => {
      throw new Error('blocked');
    },
  });

const items = (window) => Array.from(window.document.querySelectorAll('.faq__item'));

// Opens an item the way a user would and fires the non-bubbling toggle event.
const openItem = (window, item) => {
  item.open = true;
  item.dispatchEvent(new window.Event('toggle'));
};

const closeItem = (window, item) => {
  item.open = false;
  item.dispatchEvent(new window.Event('toggle'));
};

describe('initAccordion', () => {
  it('returns null when the FAQ container is missing', () => {
    const { window } = makeDom('<main><section id="other"></section></main>');
    const storage = createStorage(createMemoryBackend());
    assert.equal(initAccordion({ root: window.document, storage }), null);
  });

  it('returns null when the FAQ container has no items', () => {
    const { window } = makeDom('<section id="faq"><h2>Empty</h2></section>');
    const storage = createStorage(createMemoryBackend());
    assert.equal(initAccordion({ root: window.document, storage }), null);
  });

  it('reports no open item when nothing is saved', () => {
    const { window } = makeDom(faq);
    const storage = createStorage(createMemoryBackend());
    const accordion = initAccordion({ root: window.document, storage });
    assert.equal(accordion.openIndex(), null);
    assert.ok(items(window).every((item) => item.open === false));
  });

  it('restores the saved open item', () => {
    const { window } = makeDom(faq);
    const storage = createStorage(createMemoryBackend());
    storage.set('faq-open', 1);
    const accordion = initAccordion({ root: window.document, storage });
    assert.equal(accordion.openIndex(), 1);
    assert.deepEqual(
      items(window).map((item) => item.open),
      [false, true, false],
    );
  });

  it('ignores saved values that are not valid item indexes', () => {
    const invalid = ['second', -1, 3, 1.5, null, { index: 0 }];
    invalid.forEach((value) => {
      const { window } = makeDom(faq);
      const storage = createStorage(createMemoryBackend());
      storage.set('faq-open', value);
      const accordion = initAccordion({ root: window.document, storage });
      assert.equal(accordion.openIndex(), null, `value ${JSON.stringify(value)}`);
    });
  });

  it('treats a storage backend that throws as nothing saved', () => {
    const { window } = makeDom(faq);
    const accordion = initAccordion({ root: window.document, storage: throwingStorage() });
    assert.equal(accordion.openIndex(), null);
    openItem(window, items(window)[0]);
    assert.equal(accordion.openIndex(), 0);
  });

  it('keeps only one item open and saves its index when one is opened', () => {
    const { window } = makeDom(faq);
    const storage = createStorage(createMemoryBackend());
    const accordion = initAccordion({ root: window.document, storage });
    openItem(window, items(window)[0]);
    assert.equal(storage.get('faq-open'), 0);
    openItem(window, items(window)[2]);
    assert.deepEqual(
      items(window).map((item) => item.open),
      [false, false, true],
    );
    assert.equal(storage.get('faq-open'), 2);
    assert.equal(accordion.openIndex(), 2);
  });

  it('clears the saved index when the saved item is closed', () => {
    const { window } = makeDom(faq);
    const storage = createStorage(createMemoryBackend());
    storage.set('faq-open', 1);
    initAccordion({ root: window.document, storage });
    closeItem(window, items(window)[1]);
    assert.equal(storage.get('faq-open'), null);
  });

  it('keeps the saved index when a different item is closed', () => {
    const { window } = makeDom(faq);
    const storage = createStorage(createMemoryBackend());
    const accordion = initAccordion({ root: window.document, storage });
    openItem(window, items(window)[0]);
    items(window)[2].open = true;
    closeItem(window, items(window)[2]);
    assert.equal(storage.get('faq-open'), 0);
    assert.equal(accordion.openIndex(), 0);
  });

  it('does nothing when closing an item while nothing is saved', () => {
    const { window } = makeDom(faq);
    const storage = createStorage(createMemoryBackend());
    initAccordion({ root: window.document, storage });
    items(window)[1].open = true;
    closeItem(window, items(window)[1]);
    assert.equal(storage.get('faq-open'), null);
  });

  it('ignores toggle events that do not come from an FAQ item', () => {
    const { window } = makeDom(faq);
    const storage = createStorage(createMemoryBackend());
    const accordion = initAccordion({ root: window.document, storage });
    window.document.querySelector('#faq').dispatchEvent(new window.Event('toggle'));
    assert.equal(storage.get('faq-open'), null);
    assert.equal(accordion.openIndex(), null);
  });
});
