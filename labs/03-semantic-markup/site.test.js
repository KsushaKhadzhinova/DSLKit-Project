import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  alternateProblems,
  bemProblems,
  documentProblems,
  duplicateIds,
  headingProblems,
  imagesWithoutAlt,
  microdataProblems,
  missingIdReferences,
  parityProblems,
  parse,
  skipLinkProblems,
  unlabeledFields,
  unnamedControls,
  usedSemanticTags,
  vagueLinks,
} from './site-checks.js';

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'site');
const walk = (dir) =>
  readdirSync(dir)
    .filter((name) => name !== 'design')
    .flatMap((name) => (statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)) : [join(dir, name)]));
const files = walk(SITE);
const pages = Object.fromEntries(
  files.filter((file) => file.endsWith('.html')).map((file) => [relative(SITE, file).replaceAll('\\', '/'), parse(readFileSync(file, 'utf8'))]),
);
const names = Object.keys(pages);
const landing = ['index.html', 'en/index.html'];

const eachPage = (title, check, subset = names) =>
  test(title, () => {
    for (const name of subset) assert.deepEqual(check(pages[name]), [], name);
  });

test('the site has the landing pages in both languages, error pages and application screens', () => {
  for (const page of [
    'index.html',
    'en/index.html',
    'thanks.html',
    'privacy.html',
    'errors/404.html',
    'app/editor.html',
    'en/app/editor.html',
    'app/dashboard.html',
    'en/app/dashboard.html',
    'app/settings.html',
    'en/app/settings.html',
    'app/welcome.html',
    'en/app/welcome.html',
  ])
    assert.ok(names.includes(page), page);
  assert.equal(names.length, 19);
});

eachPage('every page has lang, title, charset and viewport', documentProblems);
eachPage('every page has one h1 and no skipped heading levels', headingProblems);
eachPage('every image has an alt attribute', imagesWithoutAlt);
eachPage('every page starts with a skip-link to main#main', skipLinkProblems);
eachPage('ids are unique on every page', duplicateIds);
eachPage('anchors, labels and aria references point to existing ids', missingIdReferences);
eachPage('every form field has a label or an aria name', unlabeledFields);
eachPage('every link and button has an accessible name', unnamedControls);
eachPage('link texts are descriptive', vagueLinks);
eachPage('class names follow the BEM naming scheme', bemProblems);
eachPage('microdata has an itemtype and the required properties', microdataProblems);

test('the main pages use at least eight different semantic tags', () => {
  for (const name of landing) assert.ok(usedSemanticTags(pages[name]).length >= 8, name);
});

test('the main pages use the tags the assignment lists', () => {
  for (const name of landing)
    for (const tag of ['header', 'nav', 'main', 'article', 'section', 'aside', 'footer', 'figure', 'figcaption', 'time'])
      assert.ok(usedSemanticTags(pages[name]).includes(tag), `${name}: ${tag}`);
});

test('the landing title and description keep the lengths recommended by the course', () => {
  for (const name of landing) {
    const title = pages[name].querySelector('title').textContent.length;
    const description = pages[name].querySelector('meta[name="description"]').getAttribute('content').length;
    assert.ok(title >= 50 && title <= 60, `${name} title ${title}`);
    assert.ok(description >= 150 && description <= 160, `${name} description ${description}`);
  }
});

test('the landing pages declare canonical and ru, en, x-default alternates', () => {
  for (const name of landing) assert.deepEqual(alternateProblems(pages[name]), [], name);
});

test('the Russian and English versions have the same element structure', () => {
  for (const [ru, en] of [
    ['index.html', 'en/index.html'],
    ['thanks.html', 'en/thanks.html'],
    ['privacy.html', 'en/privacy.html'],
    ['app/dashboard.html', 'en/app/dashboard.html'],
    ['app/settings.html', 'en/app/settings.html'],
    ['app/welcome.html', 'en/app/welcome.html'],
  ])
    assert.deepEqual(parityProblems(pages[ru], pages[en]), [], ru);
});

test('the Russian pages declare lang ru and the English pages declare lang en', () => {
  for (const name of names.filter((page) => page.startsWith('en/'))) assert.equal(pages[name].documentElement.lang, 'en', name);
  for (const name of names.filter((page) => !page.startsWith('en/') && !page.startsWith('errors/'))) assert.equal(pages[name].documentElement.lang, 'ru', name);
});

test('the sitemap lists existing indexable pages and robots.txt points to it', () => {
  const sitemap = readFileSync(join(SITE, 'sitemap.xml'), 'utf8');
  const locations = [...sitemap.matchAll(/<loc>https:\/\/dslkit\.io\/([^<]*)<\/loc>/g)].map((match) => match[1] || 'index.html');
  assert.ok(locations.length >= 4);
  for (const location of locations) assert.ok(names.includes(location.endsWith('/') ? `${location}index.html` : location), location);
  for (const noindex of names.filter((name) => pages[name].querySelector('meta[name="robots"][content="noindex"]')))
    assert.ok(!locations.includes(noindex), noindex);
  assert.match(readFileSync(join(SITE, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/dslkit\.io\/sitemap\.xml/);
});

test('every local href and src resolves to an existing file', () => {
  const missing = [];
  for (const file of files.filter((name) => name.endsWith('.html'))) {
    const html = readFileSync(file, 'utf8');
    for (const [, url] of html.matchAll(/\b(?:href|src)="([^"#?]*)(?:[?#][^"]*)?"/g)) {
      if (!url || /^(https?:|mailto:)/.test(url)) continue;
      const target = url.startsWith('/') ? join(SITE, url) : join(dirname(file), url);
      const resolved = statSync(target, { throwIfNoEntry: false })?.isDirectory() ? join(target, 'index.html') : target;
      if (!statSync(resolved, { throwIfNoEntry: false })) missing.push(`${relative(SITE, file)} -> ${url}`);
    }
  }
  assert.deepEqual(missing, []);
});
