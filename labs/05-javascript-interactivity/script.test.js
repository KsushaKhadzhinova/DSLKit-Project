import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mock, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { COMPONENTS, boot } from '../../site/js/script.js';

const load = (page) => new JSDOM(readFileSync(`site/${page}`, 'utf8'), { url: 'http://localhost/' }).window.document;

test('the landing page starts the theme, burger, FAQ, filter and form components', () => {
  assert.deepEqual(boot(load('index.html')), [
    'initTheme',
    'initToasts',
    'initBurger',
    'initAuthMenu',
    'initAccordion',
    'initNotationFilter',
    'initWaitlistForm',
  ]);
});

test('the English landing page starts the same components', () => {
  assert.equal(boot(load('en/index.html')).length, 7);
});

test('the dashboard, the settings and the editor start their own components', () => {
  assert.deepEqual(boot(load('app/dashboard.html')), [
    'initTheme',
    'initToasts',
    'initAuthGate',
    'initAuthMenu',
    'initDashboard',
    'initQuota',
    'initAppSearch',
    'initPopups',
  ]);
  assert.deepEqual(boot(load('app/settings.html')), ['initTheme', 'initToasts', 'initAuthMenu', 'initQuota', 'initAppSearch', 'initSettings']);
  assert.deepEqual(boot(load('app/editor.html')), [
    'initTheme',
    'initToasts',
    'initAuthMenu',
    'initEditor',
    'initEditorProjects',
    'initCodeInput',
    'initEditorActions',
    'initEditorTools',
    'initAutomation',
    'initEditorPalette',
    'initExport',
    'initImport',
    'initTour',
    'initCanvasDrag',
    'initDiagramRunner',
    'initPopups',
  ]);
});

test('the welcome page lists templates and shows the quota', () => {
  assert.deepEqual(boot(load('app/welcome.html')), ['initTheme', 'initToasts', 'initAuthMenu', 'initQuota', 'initWelcome', 'initAppSearch']);
});

test('the sign-in and registration pages start the form', () => {
  for (const page of ['app/login.html', 'app/register.html', 'en/app/login.html', 'en/app/register.html'])
    assert.deepEqual(boot(load(page)), ['initTheme', 'initToasts', 'initAuthForm'], page);
});

test('a page without interactive markup starts only the theme', () => {
  assert.deepEqual(boot(load('errors/404.html')), ['initTheme', 'initToasts']);
});

test('a failing component is reported and the others still start', () => {
  const logger = { error: mock.fn() };
  const broken = function brokenComponent() {
    throw new Error('boom');
  };
  const started = boot(load('index.html'), { components: [broken, ...COMPONENTS], logger });
  assert.equal(logger.error.mock.callCount(), 1);
  assert.match(logger.error.mock.calls[0].arguments[0], /brokenComponent failed/);
  assert.equal(started.length, 7);
});

test('the expert and decision pages start their own components', () => {
  assert.deepEqual(boot(load('app/expert.html')), ['initTheme', 'initToasts', 'initAuthMenu', 'initQuota', 'initExpert', 'initAppSearch']);
  assert.deepEqual(boot(load('en/app/decision.html')), ['initTheme', 'initToasts', 'initAuthMenu', 'initQuota', 'initDecision', 'initAppSearch']);
});
