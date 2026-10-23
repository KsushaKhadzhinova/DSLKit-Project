import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initImport } from '../../site/js/components/import-menu.js';

const html = readFileSync('site/app/editor.html', 'utf8');
const htmlEn = readFileSync('site/en/app/editor.html', 'utf8');
const MERMAID = 'sequenceDiagram\n  participant A as Alice\n  A->>B: hello\n  loop x\n  end';

const setup = (page = html, options = {}) => {
  const window = new JSDOM(page, { url: 'http://localhost/' }).window;
  const document = window.document;
  const runs = [];
  document.querySelector('.app-page--editor').addEventListener('dslkit:run', () => runs.push('run'));
  const api = initImport({ root: document, ...options });
  const code = () => [...document.querySelectorAll('.code__line code')].map((line) => line.textContent).join('\n');
  return { window, document, api, runs, code, status: document.querySelector('.canvas__status') };
};

test('a page without import buttons or without code lines gets no import', () => {
  const plain = new JSDOM('<!doctype html><html><body></body></html>').window;
  assert.equal(initImport({ root: plain.document }), null);
  const noCode = new JSDOM('<!doctype html><html><body><div class="app-page--editor"><button data-import="file"></button></div></body></html>').window;
  assert.equal(initImport({ root: noCode.document }), null);
});

test('text from the clipboard replaces the code, asks for a run and reports what was left out', async () => {
  const context = setup(html, { readClipboard: async () => MERMAID });
  context.document.querySelector('[data-import="clipboard"]').click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.match(context.code(), /^diagram uml sequence "Imported sequence"\nparticipant A "Alice"\nparticipant B\nA -> B : hello$/);
  assert.deepEqual(context.runs, ['run']);
  assert.equal(context.status.textContent, 'Импортировано: диаграмма последовательности. Не перенесено: loop.');
});

test('a clean import says only what was imported', async () => {
  const context = setup(html);
  assert.equal(context.api.load('graph LR\nA --> B'), true);
  assert.equal(context.status.textContent, 'Импортировано: блок-схема.');
  assert.equal(context.api.load('diagram graph "Mine"\nvertex A'), true);
  assert.equal(context.status.textContent, 'Импортировано: код DSLKit.');
});

test('every refusal has its own message and leaves the code alone', () => {
  const context = setup(html);
  const before = context.code();
  const cases = [
    ['', 'В тексте нет диаграммы для импорта.'],
    ['hello', 'Формат не распознан: нужен текст Mermaid или PlantUML.'],
    ['erDiagram\nA ||--o{ B : has', 'Диаграмма «erDiagram» пока не поддерживается: импортируются блок-схемы, диаграммы последовательности и состояний.'],
  ];
  for (const [text, message] of cases) {
    assert.equal(context.api.load(text), false);
    assert.equal(context.status.textContent, message);
  }
  assert.equal(context.code(), before);
  assert.deepEqual(context.runs, []);
});

test('the English page answers in English', async () => {
  const context = setup(htmlEn);
  context.api.load('stateDiagram-v2\n[*] --> A\nA --> [*]\nnote x');
  assert.equal(context.status.textContent, 'Imported: state diagram. Not carried over: note.');
  context.api.load('');
  assert.equal(context.status.textContent, 'There is no diagram to import in the text.');
  context.api.load('gantt\n x');
  assert.match(context.status.textContent, /^The diagram "gantt" is not supported yet/);
  assert.equal(
    await context.api.importFrom(async () => {
      throw new Error('denied');
    }),
    false,
  );
  assert.equal(context.status.textContent, 'The file or the clipboard could not be read.');
});

test('a clipboard that cannot be read is reported', async () => {
  const denied = setup(html, {
    readClipboard: async () => {
      throw new Error('denied');
    },
  });
  denied.document.querySelector('[data-import="clipboard"]').click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(denied.status.textContent, 'Не удалось прочитать файл или буфер обмена.');
  const missing = setup(html);
  missing.document.querySelector('[data-import="clipboard"]').click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(missing.status.textContent, 'Не удалось прочитать файл или буфер обмена.', 'a browser without the clipboard API');
});

test('the file button opens the file dialog and a chosen file is imported, then forgotten', async () => {
  const context = setup(html);
  const input = context.document.querySelector('.editor-import__file');
  let opened = 0;
  input.click = () => opened++;
  context.document.querySelector('[data-import="file"]').click();
  assert.equal(opened, 1);
  Object.defineProperty(input, 'files', { value: [{ text: async () => '@startuml\nactor A\nA -> B : hi\n@enduml' }], configurable: true });
  input.dispatchEvent(new context.window.Event('change'));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.match(context.code(), /^diagram uml sequence/);
  assert.equal(input.value, '');
  Object.defineProperty(input, 'files', { value: [], configurable: true });
  context.status.textContent = 'x';
  input.dispatchEvent(new context.window.Event('change'));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(context.status.textContent, 'x', 'no file, nothing happens');
});

test('the import works on a page without the status line, the file field and the buttons of the other kind', async () => {
  const window = new JSDOM(
    '<!doctype html><html lang="ru"><body><div class="app-page--editor"><button data-import="clipboard"></button><ol class="code__lines"><li class="code__line"><code>old</code></li></ol></div></body></html>',
  ).window;
  const api = initImport({ root: window.document, readClipboard: async () => 'graph TD\nA-->B' });
  assert.equal(await api.importFrom(async () => 'graph TD\nA-->B'), true);
  assert.equal(window.document.querySelector('.code__line code').textContent, 'diagram graph "Imported flowchart"');
  assert.equal(api.load('hello'), false);
  window.document.querySelector('[data-import="clipboard"]').click();
});
