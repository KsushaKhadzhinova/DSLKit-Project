const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Diagram } = require('../src/models');
const { ROWS } = require('../scripts/seed-diagrams');

test('the seed has 30 or more rows over every notation, with unique titles', () => {
  assert.ok(ROWS.length >= 30);
  assert.equal(new Set(ROWS.map((row) => row.title)).size, ROWS.length);
  assert.deepEqual([...new Set(ROWS.map((row) => row.notation))].sort(), ['BPMN', 'DFD', 'ERD', 'IDEF0', 'Petri', 'UML']);
  assert.deepEqual([...new Set(ROWS.map((row) => row.priority))].sort(), [0, 1, 2]);
});

test('every seed row passes the model validation, awkward ones included', () => {
  for (const row of ROWS) assert.equal(new Diagram(row).validateSync(), undefined, row.title);
});

test('the seed keeps markup and injection text as plain data', () => {
  const titles = ROWS.map((row) => row.title);
  assert.ok(titles.includes('<img src=x onerror=alert(1)>'));
  assert.ok(titles.includes("'; DROP TABLE Diagrams; --"));
});
