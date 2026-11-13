import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initLangSwitch } from '../../site/js/components/lang-switch.js';

const page = (url, body) => new JSDOM(`<!doctype html><html lang="ru"><body>${body}</body></html>`, { url }).window.document;

test('the link to the other language keeps the query and the hash of the page', () => {
  const root = page(
    'http://localhost/app/docs.html?kind=guides&id=ahp#top',
    '<a hreflang="en" href="../en/app/docs.html">English</a><a hreflang="en" href="../en/app/docs.html?old=1#x">again</a>',
  );
  assert.equal(initLangSwitch({ root }).length, 2);
  assert.deepEqual(
    [...root.querySelectorAll('a')].map((link) => link.getAttribute('href')),
    ['../en/app/docs.html?kind=guides&id=ahp#top', '../en/app/docs.html?kind=guides&id=ahp#top'],
  );
});

test('absolute addresses and pages without a language link are left alone', () => {
  const root = page('http://localhost/?a=1', '<a hreflang="en" href="https://example.com/en/">x</a><a href="en/">no hreflang</a>');
  assert.equal(initLangSwitch({ root }), null);
  assert.equal(root.querySelector('a').getAttribute('href'), 'https://example.com/en/');
});
