import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DIRS, EXTENSIONS, FILES, checkEnv, formatResults } from './check-env.js';
import { HELP, WORDS } from './help.js';

const GOOD_FILES = {
  ...Object.fromEntries([...DIRS, ...FILES].map((p) => [`site/${p}`, ''])),
  'site/design/figma-link.txt': 'https://www.figma.com/design/abc/DSLKit\n',
  '.gitignore': 'node_modules/\r\n.DS_Store\n*.log\n',
  '.prettierrc': '{"semi":true,"singleQuote":true}',
  'package.json': '{"dependencies":{"lodash":"^4"},"devDependencies":{"nodemon":"^3"}}',
  '.vscode/settings.json': '{"editor.formatOnSave":true}',
  '.vscode/extensions.json': JSON.stringify({ recommendations: EXTENSIONS.map((e) => e.toUpperCase()) }),
  'README.md': '# DSLKit\n\n## Технологии\n\nhttps://github.com/x/y https://www.figma.com/design/abc\n',
};
const GOOD_CMDS = {
  'node --version': 'v24.1.0\n',
  'npm --version': '11.0.0\n',
  'git --version': 'git version 2.50.0\n',
  'git config user.name': 'Ксения\n',
  'git config user.email': 'k@example.com\n',
  'git remote get-url origin': 'https://github.com/x/y.git\n',
  'git rev-list --count HEAD': '5\n',
};

const env = (files = GOOD_FILES, cmds = GOOD_CMDS) => ({
  run: (c, a) => {
    const key = [c, ...a].join(' ');
    if (!(key in cmds)) throw new Error(`missing ${key}`);
    return cmds[key];
  },
  exists: (p) => p in files,
  read: (p) => {
    if (!(p in files)) throw new Error('ENOENT');
    return files[p];
  },
});
const failed = (e) =>
  checkEnv(e)
    .filter((r) => !r.pass)
    .map((r) => r.id);
const without = (obj, key) => Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key));

test('a complete environment passes every check', () => {
  assert.deepEqual(failed(env()), []);
});

test('tool checks fail when commands are missing or old', () => {
  assert.deepEqual(failed(env(GOOD_FILES, {})), ['node', 'npm', 'git', 'gitName', 'gitEmail', 'remote', 'commits']);
  assert.deepEqual(failed(env(GOOD_FILES, { ...GOOD_CMDS, 'node --version': 'v18.0.0' })), ['node']);
  assert.deepEqual(failed(env(GOOD_FILES, { ...GOOD_CMDS, 'git remote get-url origin': 'https://example.com/x.git', 'git rev-list --count HEAD': '2' })), [
    'remote',
    'commits',
  ]);
});

test('file checks fail with details', () => {
  assert.deepEqual(failed(env(without(GOOD_FILES, 'site/js/script.js'))), ['structure']);
  assert.deepEqual(failed(env({ ...GOOD_FILES, '.gitignore': 'node_modules/\n' })), ['gitignore']);
  assert.deepEqual(failed(env({ ...GOOD_FILES, '.prettierrc': '{"semi":false}' })), ['prettier']);
  assert.deepEqual(failed(env({ ...GOOD_FILES, 'package.json': '{}' })), ['packages']);
  assert.deepEqual(failed(env({ ...GOOD_FILES, '.vscode/settings.json': '{}' })), ['format']);
  assert.deepEqual(failed(env({ ...GOOD_FILES, '.vscode/extensions.json': '{"recommendations":[]}' })), ['extensions']);
  assert.deepEqual(failed(env({ ...GOOD_FILES, 'README.md': '# only title' })), ['readme']);
  assert.deepEqual(failed(env({ ...GOOD_FILES, 'site/design/figma-link.txt': 'https://example.com' })), ['figma']);
});

test('unreadable or broken files do not crash the checks', () => {
  const broken = { ...without(GOOD_FILES, 'package.json'), '.prettierrc': '{oops', '.vscode/extensions.json': '{}' };
  assert.deepEqual(failed(env(broken)), ['prettier', 'packages', 'extensions']);
  assert.deepEqual(failed(env({})).length, 8);
});

test('formatResults lists failures with explanations in both languages', () => {
  const bad = checkEnv(env(without(GOOD_FILES, 'README.md')));
  const ru = formatResults(bad);
  assert.match(ru, /\| Файл README\.md \| не пройдена \|/);
  assert.match(ru, /\*\*Файл README\.md\.\*\*/);
  assert.match(ru, /Зачем это нужно: README объясняет/);
  assert.match(ru, /Как исправить: Добавьте описание/);
  const en = formatResults(bad, 'en');
  assert.match(en, /Checks failed: 1\./);
  assert.match(en, /How to fix: Add a project description/);
  assert.match(formatResults(checkEnv(env())), /Все проверки пройдены\./);
});

test('every check has help text in both languages', () => {
  const ids = checkEnv(env()).map((r) => r.id);
  assert.deepEqual(Object.keys(HELP.ru), ids);
  assert.deepEqual(Object.keys(HELP.en), ids);
  assert.deepEqual(Object.keys(WORDS.ru), Object.keys(WORDS.en));
  for (const lang of ['ru', 'en']) for (const id of ids) assert.equal(HELP[lang][id].length, 3);
});

test('cli prints the check table and exposes the number of failures as exit code', async () => {
  const lines = [];
  const log = console.log;
  console.log = (s) => lines.push(s);
  process.argv[2] = 'en';
  try {
    await import('./check.js');
  } finally {
    console.log = log;
  }
  assert.match(lines[0], /Table 1 – Environment check results/);
  assert.equal(process.exitCode, (lines[0].match(/\| failed \|/g) ?? []).length);
  process.exitCode = 0;
});
