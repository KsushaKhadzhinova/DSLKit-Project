import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { build, metaOf } from './build-report.js';

test('build expands code and include placeholders', () => {
  const read = (p) => `<${p}>\n`;
  assert.equal(build('A\n{{code:src/a.js}}\n{{include:gen/x.md}}\n', read, 1), 'A\n```js\n<src/a.js>\n```\n<gen/x.md>\n');
});

test('build takes a range of lines and normalises line endings', () => {
  const read = () => 'one\r\ntwo\r\nthree\r\nfour\r\n';
  assert.equal(build('{{code:a.js#2-3}}', read, 1), '```js\ntwo\nthree\n```');
  assert.equal(build('{{include:a.md#4-4}}', read, 1), 'four');
});

test('build fills {{meta:key}} from the meta file and fails on a missing value', () => {
  assert.equal(
    build('on {{meta:branch}}', () => '', 1, { branch: 'pz21' }),
    'on pz21',
  );
  assert.throws(() => build('{{meta:branch}}', () => '', 1, {}), /no value for "branch"/);
  assert.throws(() => build('{{meta:branch}}', () => '', 1, { branch: '' }), /no value/);
});

test('metaOf reads the meta file or gives an empty object', () => {
  assert.deepEqual(
    metaOf('d', (p) => (p === 'd/report.meta.json' ? '{"a":"b"}' : ''), 1),
    { a: 'b' },
  );
  assert.deepEqual(
    metaOf('d', () => {
      throw new Error('missing');
    }),
    {},
  );
});

test('build leaves text without placeholders unchanged', () => {
  assert.equal(
    build('plain', () => '', 1),
    'plain',
  );
});

test('build script writes both reports', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'rep-'));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'report.tpl.md'), 'RU {{include:' + join(dir, 'part.md') + '}}');
  writeFileSync(join(dir, 'report.en.tpl.md'), 'EN {{include:' + join(dir, 'part.md') + '}}');
  writeFileSync(join(dir, 'part.md'), 'part');
  process.argv[2] = dir;
  await import('./build.js');
  assert.equal(readFileSync(join(dir, 'report.md'), 'utf8'), 'RU part');
  assert.equal(readFileSync(join(dir, 'report.en.md'), 'utf8'), 'EN part');
});
