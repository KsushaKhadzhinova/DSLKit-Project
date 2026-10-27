import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mock, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { COMPONENTS, boot } from '../../site/js/script.js';

const load = (page) => new JSDOM(readFileSync(`site/${page}`, 'utf8'), { url: 'http://localhost/' }).window.document;

test('the landing page starts the theme, burger, FAQ, filter and form components', () => {
  assert.deepEqual(boot(load('index.html')), ['initTheme', 'initBurger', 'initAccordion', 'initNotationFilter', 'initWaitlistForm']);
});

test('the English landing page starts the same components', () => {
  assert.equal(boot(load('en/index.html')).length, 5);
});

test('the dashboard, the settings and the editor start their own components', () => {
  assert.deepEqual(boot(load('app/dashboard.html')), ['initTheme', 'initDashboard']);
  assert.deepEqual(boot(load('app/settings.html')), ['initTheme', 'initSettings']);
  assert.deepEqual(boot(load('app/editor.html')), ['initTheme', 'initEditor', 'initEditorActions', 'initEditorTools', 'initExport', 'initImport', 'initTour', 'initCanvasDrag', 'initDiagramRunner']);
});

test('a page without interactive markup starts only the theme', () => {
  assert.deepEqual(boot(load('errors/404.html')), ['initTheme']);
});

test('a failing component is reported and the others still start', () => {
  const logger = { error: mock.fn() };
  const broken = function brokenComponent() {
    throw new Error('boom');
  };
  const started = boot(load('index.html'), { components: [broken, ...COMPONENTS], logger });
  assert.equal(logger.error.mock.callCount(), 1);
  assert.match(logger.error.mock.calls[0].arguments[0], /brokenComponent failed/);
  assert.equal(started.length, 5);
});
