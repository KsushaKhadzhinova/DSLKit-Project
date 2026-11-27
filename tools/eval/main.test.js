import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as adapters from './adapters.js';
import { main } from './main.js';
import { renderReport } from './report.js';

const files = {
  'descriptions.ru.json': {
    lang: 'ru',
    cases: [{ id: 'r1', text: 'У клиента много заказов.', notation: 'erd', level: 'easy', el: ['a:Клиент', 'a:Заказ'], rel: '0-1' }],
  },
  'descriptions.en.json': {
    lang: 'en',
    cases: [{ id: 'e1', text: 'A customer has many orders.', notation: 'erd', level: 'easy', el: ['a:Customer', 'a:Order'], rel: '0-1' }],
  },
  'check.json': {
    cases: [
      { id: 's1', kind: 'seeded', category: 'dangling', notation: 'bpmn', line: 3, askable: false, code: 'diagram bpmn "T"\nstart s\nflow s -> t9' },
      { id: 's2', kind: 'seeded', category: 'unreachable', notation: 'bpmn', line: 1, askable: false, code: 'diagram bpmn "T"' },
      { id: 'c1', kind: 'clean', notation: 'bpmn', code: 'diagram bpmn "T"\nstart s\ntask a "A"\nend e\nflow s -> a\nflow a -> e' },
    ],
  },
  'import.json': { cases: [{ id: 'i1', format: 'mermaid', code: 'graph TD\nA[One] --> B[Two]', el: ['One', 'Two'], rel: '0-1' }] },
  'ratchet.json': { tolerance: 0.01 },
};

const setup = (argv) => {
  const written = {};
  const logs = [];
  const io = {
    readJson: (name) => (name === 'baseline.json' && written['baseline.json'] ? JSON.parse(written['baseline.json']) : files[name]),
    writeText: (name, text) => {
      written[name] = text;
    },
    log: (text) => logs.push(text),
  };
  return { written, logs, run: () => main({ argv, io, adapters, clock: () => 0 }) };
};

test('main prints a summary and writes nothing by default', () => {
  const { written, logs, run } = setup([]);
  assert.equal(run(), 0);
  assert.deepEqual(written, {});
  assert.match(logs[0], /descriptions: ru=1 en=1, seeded=2, clean=1, imports=1/);
  assert.match(logs[0], /check: recall=0.5 falseAlarms=0/);
});

test('--write stores the baseline and both reports, without the time', () => {
  const { written, logs, run } = setup(['--write']);
  assert.equal(run(), 0);
  assert.deepEqual(Object.keys(written).sort(), ['BASELINE.en.md', 'BASELINE.md', 'baseline.json']);
  assert.equal(JSON.parse(written['baseline.json']).timing, undefined);
  assert.match(written['BASELINE.md'], /^# Базовая линия/);
  assert.match(written['BASELINE.en.md'], /^# Accuracy baseline/);
  assert.equal(logs.at(-1), 'baseline written');
});

test('--check passes against a baseline written by the same run and fails against a better one', () => {
  const first = setup(['--write']);
  first.run();
  const same = setup(['--check']);
  same.written['baseline.json'] = first.written['baseline.json'];
  assert.equal(same.run(), 0);
  assert.match(same.logs.at(-1), /no metric is worse/);

  const better = JSON.parse(first.written['baseline.json']);
  better.import.elements.f1 = 2;
  const failing = setup(['--check']);
  failing.written['baseline.json'] = JSON.stringify(better);
  assert.equal(failing.run(), 1);
  assert.match(failing.logs.at(-1), /WORSE/);
});

test('the report renders in both languages with the same sections', () => {
  const first = setup(['--write']);
  first.run();
  const report = JSON.parse(first.written['baseline.json']);
  assert.equal(first.written['BASELINE.md'], renderReport(report, 'ru'));
  assert.equal((first.written['BASELINE.md'].match(/^## /gm) ?? []).length, (first.written['BASELINE.en.md'].match(/^## /gm) ?? []).length);
});
