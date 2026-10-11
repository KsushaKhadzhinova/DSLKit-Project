import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { build } from './build-report.js';

test('build expands code and include placeholders', () => {
  const read = (p) => `<${p}>\n`;
  assert.equal(build('A\n{{code:src/a.js}}\n{{include:gen/x.md}}\n', read), 'A\n```js\n<src/a.js>\n```\n<gen/x.md>\n');
});

test('build leaves text without placeholders unchanged', () => {
  assert.equal(
    build('plain', () => ''),
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
