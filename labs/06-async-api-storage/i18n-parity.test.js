import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { DEFAULT_LANGUAGE, LANGUAGES, pageLanguage } from '../../site/js/utils/lang.js';
import { createTranslator } from '../../site/js/utils/i18n.js';
import { DOCS as DOCS_EN } from '../../site/js/docs/content.en.js';
import { DOCS as DOCS_RU } from '../../site/js/docs/content.ru.js';
import { ENGINES } from '../../site/js/engines/engines.js';

// Guards of the multilingual support. Every dictionary of the site has the same keys in every language of LANGUAGES,
// the pages of all languages have the same structure, and the documentation has the same sections. Adding a language to
// LANGUAGES makes these tests ask for its dictionaries and pages.

const SITE = resolve('site');
const CYRILLIC = /[А-Яа-яЁё]/;
const [SOURCE, ...OTHERS] = LANGUAGES;
const walk = (dir) => readdirSync(dir).flatMap((name) => (statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)) : [join(dir, name)]));
const posix = (path) => relative(SITE, path).replaceAll('\\', '/');

test('the language module knows the source language and falls back to it', () => {
  assert.equal(DEFAULT_LANGUAGE, 'ru');
  assert.ok(LANGUAGES.includes('en'));
  assert.equal(pageLanguage({ documentElement: { lang: 'en' } }), 'en');
  assert.equal(pageLanguage({ documentElement: { lang: 'de' } }), 'ru');
  assert.equal(pageLanguage({}), 'ru');
});

test('every Russian source text of the engines has an English translation', () => {
  const english = createTranslator({ documentElement: { lang: 'en' } });
  const russian = createTranslator({ documentElement: { lang: 'ru' } });
  for (const engine of ENGINES) {
    for (const text of [engine.label, engine.action]) {
      assert.equal(russian(text), text);
      if (CYRILLIC.test(text)) assert.doesNotMatch(english(text), CYRILLIC, text);
    }
  }
});

// ---- dictionaries written inside the components ----

// The top-level constants of a source file that are object or array literals, found by counting brackets outside of strings.
const literals = (source) => {
  const found = [];
  for (const match of source.matchAll(/^(?:export )?const (\w+) = ([{[])/gm)) {
    const open = match[2];
    const close = open === '{' ? '}' : ']';
    const from = match.index + match[0].length - 1;
    let depth = 0;
    let quote = null;
    let end = from;
    for (; end < source.length; end += 1) {
      const char = source[end];
      if (quote) {
        if (char === '\\') end += 1;
        else if (char === quote) quote = null;
      } else if (char === "'" || char === '"' || char === '`') quote = char;
      else if (char === open) depth += 1;
      else if (char === close && (depth -= 1) === 0) break;
    }
    found.push([match[1], source.slice(from, end + 1)]);
  }
  return found;
};

const isLanguageTable = (value) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).length > 0 &&
  Object.keys(value).every((key) => LANGUAGES.includes(key));

const placeholders = (text) => (String(text).match(/\{\w+\}|\$\{\w+\}/g) ?? []).sort().join();

// Compares the texts of every language with the source language; the problems are returned as lines.
const compare = (table, path, problems) => {
  const source = table[SOURCE];
  for (const code of OTHERS) {
    if (!(code in table)) problems.push(`${path}: no ${code}`);
    else diff(source, table[code], `${path}.${code}`, code, problems);
  }
  for (const code of Object.keys(table)) if (!LANGUAGES.includes(code)) problems.push(`${path}: unknown language ${code}`);
};

const diff = (source, other, path, code, problems) => {
  if (typeof source === 'function' || typeof other === 'function') {
    if (typeof source !== typeof other) problems.push(`${path}: a function and a text`);
  } else if (source && typeof source === 'object') {
    if (!other || typeof other !== 'object' || Array.isArray(source) !== Array.isArray(other)) problems.push(`${path}: different kind of value`);
    else {
      for (const key of Object.keys(source)) {
        if (!(key in other)) problems.push(`${path}.${key}: missing`);
        else diff(source[key], other[key], `${path}.${key}`, code, problems);
      }
      for (const key of Object.keys(other)) if (!(key in source)) problems.push(`${path}.${key}: extra`);
    }
  } else if (typeof source !== typeof other) problems.push(`${path}: different type`);
  else if (typeof source === 'string') {
    if (placeholders(source) !== placeholders(other)) problems.push(`${path}: different {placeholders}`);
    if (code === 'en' && CYRILLIC.test(other)) problems.push(`${path}: Cyrillic in the English text`);
    if (other.trim() === '' && source.trim() !== '') problems.push(`${path}: empty`);
  }
};

// Dictionaries are either { ru: {...}, en: {...} } or { key: { ru, en }, ... }; both are found at any depth.
const collect = (value, path, problems, seen = new Set()) => {
  if (value === null || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  // The lists of search words and base forms are lexicons, not translations: each language has the words people use in it.
  if (path.endsWith(':LEMMAS')) return;
  if (isLanguageTable(value)) return compare(value, path, problems);
  for (const [key, child] of Object.entries(value)) if (key !== 'keywords') collect(child, `${path}.${key}`, problems, seen);
};

const modules = walk(join(SITE, 'js')).filter((file) => file.endsWith('.js') && !/docs[\\/]content|early\.js|script\.js/.test(file));

test('every dictionary written in a component or a module has the same keys in every language', () => {
  const problems = [];
  const tables = [];
  for (const file of modules) {
    for (const [name, text] of literals(readFileSync(file, 'utf8'))) {
      let value;
      try {
        value = new Function(`return ${text}`)();
      } catch {
        continue; // refers to other constants of its file; its exported form is checked below
      }
      const before = problems.length;
      collect(value, `${posix(file)}:${name}`, problems);
      if (JSON.stringify(value).length > 2 && /\b(?:ru|en)\b/.test(text) && problems.length >= before) tables.push(`${posix(file)}:${name}`);
    }
  }
  assert.deepEqual(problems, []);
  // The scan must keep finding the tables, otherwise a change of style would silently turn the guard off.
  for (const expected of [
    'automation.js:TEXTS',
    'decision.js:TEXTS',
    'docs.js:TEXTS',
    'editor-actions.js:TEXTS',
    'editor-palette.js:TEXTS',
    'editor-projects.js:TEXTS',
    'editor-tools.js:TEXTS',
    'expert-panel.js:TEXTS',
    'expert.js:TEXTS',
    'dashboard.js:LABELS',
    'tour.js:LABELS',
    'auth.js:MESSAGES',
    'export-menu.js:TEXT',
    'import-menu.js:TEXT',
  ])
    assert.ok(
      tables.some((name) => name.endsWith(expected)),
      expected,
    );
});

test('the dictionaries of the panels, the toasts, the report and the quota are found by the scan', () => {
  const found = new Set();
  for (const file of modules) for (const [name] of literals(readFileSync(file, 'utf8'))) found.add(`${posix(file)}:${name}`);
  for (const expected of [
    'js/components/review-panel.js:TEXTS',
    'js/components/clarify-panel.js:TEXTS',
    'js/components/toast.js:TEXTS',
    'js/components/theme.js:TEXTS',
    'js/components/settings.js:TEXTS',
    'js/components/welcome.js:TEXTS',
    'js/components/editor.js:TEXTS',
    'js/components/auth.js:TEXTS',
    'js/components/source-autosave.js:TEXTS',
    'js/decision/report.js:TEXTS',
    'js/decision/methods.js:EXPLAIN',
    'js/storage/projects.js:TEXTS',
    'js/utils/diagram-file-import.js:WORDS',
    'js/utils/exporters.js:CODE_TITLE',
    'js/utils/palette.js:BOX',
  ])
    assert.ok(found.has(expected), expected);
});

// ---- the language is chosen in one place ----

const withoutComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('no module of the site chooses a text or a language by comparing a language code', () => {
  const found = [];
  for (const file of modules.filter((name) => !name.endsWith(join('utils', 'lang.js')))) {
    withoutComments(readFileSync(file, 'utf8'))
      .split('\n')
      .forEach((line, at) => {
        // a ternary or a comparison on a code of a language, and a direct read of the lang attribute of a page
        if (/[!=]==?\s*['"](?:ru|en)['"]|['"](?:ru|en)['"]\s*[!=]==?|documentElement\??\.lang|\.lang\s*[!=]==?/.test(line))
          found.push(`${posix(file)}:${at + 1}: ${line.trim()}`);
      });
  }
  assert.deepEqual(found, []);
});

test('every component takes the language of the page from pageLanguage and never from the lang attribute', () => {
  const without = [];
  for (const file of modules.filter((name) => /components/.test(name))) {
    const source = withoutComments(readFileSync(file, 'utf8'));
    if (/\blang\b/.test(source) && /\bconst lang = /.test(source) && !/const lang = pageLanguage\(/.test(source)) without.push(posix(file));
    if (/documentElement/.test(source) && /\.lang\b/.test(source)) without.push(posix(file));
  }
  assert.deepEqual(without, []);
});

test('dates and numbers shown to the user are not written as ISO text', () => {
  const found = [];
  for (const file of modules) {
    withoutComments(readFileSync(file, 'utf8'))
      .split('\n')
      .forEach((line, at) => {
        if (/toISOString\(\)\.(?:slice|substr)|toTimeString|toLocale(?:Date|Time)?String/.test(line)) found.push(`${posix(file)}:${at + 1}`);
      });
  }
  assert.deepEqual(found, []);
});

test('the title of a project is stored without a language: the store writes an empty title, not a word', () => {
  for (const file of ['js/storage/projects.js', 'js/components/editor-projects.js']) {
    const source = withoutComments(readFileSync(join(SITE, file), 'utf8'));
    assert.doesNotMatch(source.replace(/untitled:\s*\{[^}]*\}/, ''), /\|\|\s*['"](?:Без названия|Untitled)['"]/, file);
  }
});

test('every { ru, en } text exported by the modules of the site is complete in every language', async () => {
  const problems = [];
  for (const file of modules.filter((name) => !/components/.test(name))) {
    const exported = await import(pathToFileURL(file).href);
    for (const [name, value] of Object.entries(exported)) collect(value, `${posix(file)}:${name}`, problems);
  }
  assert.deepEqual(problems, []);
});

// ---- the documentation ----

const shape = (body) => ({
  headings: (body.match(/^#{2,3} /gm) ?? []).length,
  fences: (body.match(/^```/gm) ?? []).length,
  items: (body.match(/^(?:- |\d+\. )/gm) ?? []).length,
  links: (body.match(/\]\([^)]*\)/g) ?? []).length,
  code: (body.match(/`[^`\n]+`/g) ?? []).length,
  bold: (body.match(/\*\*[^*]+\*\*/g) ?? []).length,
});

test('the Russian and English documentation have the same sections with the same structure', () => {
  assert.deepEqual(Object.keys(DOCS_RU), Object.keys(DOCS_EN));
  for (const kind of Object.keys(DOCS_RU)) {
    assert.equal(DOCS_RU[kind].length, DOCS_EN[kind].length, kind);
    DOCS_RU[kind].forEach((section, index) => {
      const english = DOCS_EN[kind][index];
      assert.equal(english.id, section.id);
      assert.deepEqual(Object.keys(english), Object.keys(section), section.id);
      assert.deepEqual(shape(english.body), shape(section.body), section.id);
      assert.match(section.title, CYRILLIC, section.id);
      assert.doesNotMatch(english.title, CYRILLIC, section.id);
    });
  }
});

test('the English documentation has Russian words only inside code and in quoted examples of Russian names', () => {
  const fence = String.fromCharCode(96).repeat(3);
  const stripped = (body) =>
    body
      .split(fence)
      .filter((_, index) => index % 2 === 0)
      .join('')
      .replace(/`[^`\n]+`/g, '')
      .replace(/"[^"\n]*[А-Яа-яЁё][^"\n]*"/g, '');
  for (const kind of Object.keys(DOCS_EN)) for (const section of DOCS_EN[kind]) assert.doesNotMatch(stripped(section.body), CYRILLIC, section.id);
});

// ---- the pages ----

const htmlFiles = walk(SITE)
  .filter((file) => file.endsWith('.html') && !posix(file).startsWith('design/'))
  .map(posix);
const documents = new Map(htmlFiles.map((name) => [name, new JSDOM(readFileSync(join(SITE, name), 'utf8')).window.document]));
const englishPages = htmlFiles.filter((name) => name.startsWith('en/'));
const counterpart = (name) => name.slice('en/'.length);

const elementsOf = (document) => [...document.querySelectorAll('html, head *, body *')].filter((element) => !/^(?:SCRIPT|STYLE)$/.test(element.tagName));
const TRANSLATED = ['aria-label', 'title', 'placeholder', 'alt', 'data-tip', 'aria-description', 'aria-valuetext'];
const ownText = (element) =>
  [...element.childNodes]
    .filter((node) => node.nodeType === 3)
    .map((node) => node.textContent.trim())
    .join('');

test('every page of the first language has an English copy and the other way round', () => {
  for (const name of englishPages) assert.ok(documents.has(counterpart(name)), `${name} has no source page`);
  const pages = htmlFiles.filter((name) => !name.startsWith('en/') && !name.startsWith('errors/'));
  for (const name of pages) assert.ok(documents.has(`en/${name}`), `${name} has no English copy`);
});

test('the pages of both languages have the same elements, attributes and texts to translate', () => {
  for (const name of englishPages) {
    const [source, english] = [documents.get(counterpart(name)), documents.get(name)];
    const [a, b] = [elementsOf(source), elementsOf(english)];
    assert.equal(a.length, b.length, name);
    a.forEach((element, index) => {
      const twin = b[index];
      const where = `${name} element ${index} <${element.tagName.toLowerCase()}>`;
      assert.equal(element.tagName, twin.tagName, where);
      assert.deepEqual(element.getAttributeNames().sort(), twin.getAttributeNames().sort(), where);
      for (const attribute of TRANSLATED) {
        const [x, y] = [element.getAttribute(attribute), twin.getAttribute(attribute)];
        if (x === null) continue;
        assert.ok(y !== null && (y !== '' || x === ''), `${where} ${attribute}`);
        if (CYRILLIC.test(x)) assert.doesNotMatch(y, CYRILLIC, `${where} ${attribute}`);
      }
      assert.equal(ownText(element) === '', ownText(twin) === '', `${where} text`);
    });
  }
});

test('the English pages have no Russian text, attribute or title except the marked Russian names', () => {
  for (const name of englishPages) {
    const document = documents.get(name);
    assert.equal(document.documentElement.lang, 'en', name);
    for (const element of document.querySelectorAll('*')) {
      if (element.closest('[lang="ru"]') || /^(?:SCRIPT|STYLE)$/.test(element.tagName)) continue;
      assert.doesNotMatch(ownText(element), CYRILLIC, `${name} <${element.tagName.toLowerCase()}>`);
      for (const attribute of [...TRANSLATED, 'content']) assert.doesNotMatch(element.getAttribute(attribute) ?? '', CYRILLIC, `${name} ${attribute}`);
    }
  }
});

test('the language of every page is declared and the other-language links lead to the copy of the same page', () => {
  for (const [name, document] of documents) {
    if (name.startsWith('errors/')) continue;
    const english = name.startsWith('en/');
    assert.equal(document.documentElement.lang, english ? 'en' : 'ru', name);
    const links = [...document.querySelectorAll('a[hreflang]')];
    assert.ok(links.length > 0, `${name} has no link to the other language`);
    for (const link of links) {
      assert.equal(link.getAttribute('hreflang'), english ? 'ru' : 'en', name);
      assert.equal(link.getAttribute('lang'), link.getAttribute('hreflang'), `${name}: the link names its own language`);
      const path = resolve(SITE, dirname(name), link.getAttribute('href').split(/[?#]/)[0]);
      const target = posix(statSync(path).isDirectory() ? join(path, 'index.html') : path);
      assert.equal(target, english ? counterpart(name) : `en/${name}`, name);
    }
  }
});

test('the indexed pages describe themselves in their language: title, description, canonical, hreflang and Open Graph', () => {
  for (const name of ['index.html', 'privacy.html']) {
    const pair = [documents.get(name), documents.get(`en/${name}`)];
    assert.notEqual(pair[0].title, pair[1].title, name);
    pair.forEach((document, index) => {
      const code = LANGUAGES[index];
      const meta = (selector) => document.querySelector(selector)?.getAttribute('content');
      assert.ok(meta('meta[name="description"]'), `${name} ${code} description`);
      assert.equal(meta('meta[property="og:title"]'), document.title);
      assert.equal(meta('meta[property="og:description"]'), meta('meta[name="description"]'));
      assert.equal(meta('meta[property="og:url"]'), document.querySelector('link[rel="canonical"]').getAttribute('href'));
      assert.equal(meta('meta[property="og:locale"]'), code === 'ru' ? 'ru_RU' : 'en_US');
      assert.equal(meta('meta[property="og:locale:alternate"]'), code === 'ru' ? 'en_US' : 'ru_RU');
      assert.equal(CYRILLIC.test(document.title), code === 'ru', `${name} ${code} title language`);
      assert.equal(CYRILLIC.test(meta('meta[name="description"]')), code === 'ru', `${name} ${code} description language`);
    });
  }
});

test('the error pages carry both languages in the title, the skip link and the footer', () => {
  for (const name of htmlFiles.filter((file) => file.startsWith('errors/'))) {
    const document = documents.get(name);
    assert.match(document.title, CYRILLIC, name);
    assert.match(document.title, /\/ Error \d+/, name);
    assert.ok(document.querySelector('.skip-link [lang="en"]'), `${name} skip link`);
    assert.ok(document.querySelector('.footer [lang="en"]'), `${name} footer`);
    assert.ok(document.querySelector('section[lang="ru"]') && document.querySelector('section[lang="en"]'), name);
  }
});

test('the sitemap lists both versions of every indexed page with the hreflang links, and the manifests match the languages', () => {
  const sitemap = readFileSync(join(SITE, 'sitemap.xml'), 'utf8');
  for (const name of ['', 'privacy.html']) {
    assert.ok(sitemap.includes(`<loc>https://dslkit.io/${name}</loc>`), name);
    assert.ok(sitemap.includes(`<loc>https://dslkit.io/en/${name}</loc>`), name);
  }
  assert.equal(JSON.parse(readFileSync(join(SITE, 'manifest.webmanifest'), 'utf8')).lang, 'ru');
  assert.equal(JSON.parse(readFileSync(join(SITE, 'en', 'manifest.webmanifest'), 'utf8')).lang, 'en');
  for (const [name, document] of documents) {
    const link = document.querySelector('link[rel="manifest"]');
    if (!link || name.startsWith('errors/')) continue;
    const target = posix(resolve(SITE, dirname(name), link.getAttribute('href')));
    assert.equal(target, name.startsWith('en/') ? 'en/manifest.webmanifest' : 'manifest.webmanifest', name);
    assert.ok(existsSync(join(SITE, target)));
  }
});
