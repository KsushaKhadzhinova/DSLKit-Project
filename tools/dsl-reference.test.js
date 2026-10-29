import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { buildReference, writeReference } from './dsl-reference.js';

test('the reference lists every notation with its header, words and an example, in both languages', () => {
  const ru = buildReference('ru');
  const en = buildReference('en');
  assert.match(ru, /^# Справочник языка DSLKit/);
  assert.match(en, /^# DSLKit language reference/);
  assert.match(ru, /`diagram uml class`/);
  assert.match(ru, /\| POST \| `\/api\/render` \|/);
  assert.match(en, /Example:/);
  assert.equal(buildReference('xx'), ru);
  assert.ok((ru.match(/^### /gm) ?? []).length >= 30);
  assert.match(ru, /пишутся в коде/);
});

test('writeReference saves both files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ref-'));
  writeReference(dir);
  assert.match(readFileSync(join(dir, 'DSL-REFERENCE.md'), 'utf8'), /Справочник/);
  assert.match(readFileSync(join(dir, 'DSL-REFERENCE.en.md'), 'utf8'), /reference/);
});
