import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initEditor } from '../../site/js/components/editor.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const html = readFileSync('site/en/app/editor.html', 'utf8');
const setup = () => {
  const window = new JSDOM(html, { url: 'http://localhost/en/app/editor.html' }).window;
  initEditor({ root: window.document, storage: createStorage(createMemoryBackend()) });
  return window;
};

test('the English editor speaks English: the close button, the saved marks and the autosave status', () => {
  const window = setup();
  const { document } = window;
  assert.equal(document.querySelector('.editor-tabs__close').getAttribute('aria-label'), 'Close the file order.dsl');
  const status = document.querySelector('.editor-status__cursor');
  assert.match(status.textContent, /Autosave: on/);
  document.querySelector('.editor-toolbar__switch').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.match(status.textContent, /Autosave: off/);
  const dialog = document.querySelector('#close-tab-modal');
  const hasUnsavedNote = () => [...document.querySelectorAll('.visually-hidden')].some((note) => note.textContent.trim() === 'unsaved');
  assert.equal(hasUnsavedNote(), true);
  dialog.returnValue = 'save';
  dialog.dispatchEvent(new window.Event('close'));
  assert.equal(hasUnsavedNote(), false);
});
