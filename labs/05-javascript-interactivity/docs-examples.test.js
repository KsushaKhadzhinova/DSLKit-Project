import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DOCS as EN } from '../../site/js/docs/content.en.js';
import { DOCS as RU } from '../../site/js/docs/content.ru.js';
import { parseDiagram } from '../../site/js/notations/index.js';

const NEW_IDS = {
  project: ['auto-build', 'expert-system', 'decision-support'],
  guides: ['guide-build-from-description', 'guide-choose-notation', 'guide-ahp'],
  code: ['code-automation'],
};

test('Russian and English documentation have the same sections in the same order', () => {
  for (const kind of Object.keys(RU))
    assert.deepEqual(
      RU[kind].map((item) => item.id),
      EN[kind].map((item) => item.id),
      kind,
    );
});

test('the sections about the wizard, the expert system and decision support exist in both languages', () => {
  for (const [kind, ids] of Object.entries(NEW_IDS))
    for (const id of ids)
      for (const docs of [RU, EN])
        assert.ok(
          docs[kind].some((item) => item.id === id),
          id,
        );
  const text = JSON.stringify([RU, EN]);
  assert.match(text, /ANTHROPIC_API_KEY/);
  assert.doesNotMatch(text, /sk-ant/);
});

test('every example of a diagram in the documentation passes the parser without errors', () => {
  const fence = String.fromCharCode(96).repeat(3);
  let checked = 0;
  for (const docs of [RU, EN])
    for (const kind of Object.keys(docs))
      // The guide about fixing errors shows broken code on purpose.
      for (const section of docs[kind].filter((item) => item.id !== 'fix-errors')) {
        const blocks = section.body.split(fence).filter((_, index) => index % 2 === 1);
        for (const block of blocks.map((item) => item.replace(/^[^\n]*\n/, '').trim()).filter((item) => /^diagram /.test(item))) {
          const errors = parseDiagram(block).problems.filter((item) => item.severity === 'error');
          assert.deepEqual(errors, [], `${section.id}: ${block.split('\n')[0]}`);
          checked += 1;
        }
      }
  assert.ok(checked > 10);
});
