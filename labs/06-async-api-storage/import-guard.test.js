import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_LINE, MAX_TEXT, importDiagram } from '../../site/js/utils/import-diagram.js';

test('a crafted text is refused at once, before any pattern runs on it', () => {
  const started = Date.now();
  assert.deepEqual(importDiagram(`graph TD\nA -- a${' '.repeat(MAX_LINE)}x`), { ok: false, reason: 'too-long' });
  assert.deepEqual(importDiagram('graph TD\n'.repeat(MAX_TEXT / 8 + 1)), { ok: false, reason: 'too-long' });
  assert.ok(Date.now() - started < 1000);
  assert.equal(importDiagram('graph TD\nA --> B').ok, true);
});
