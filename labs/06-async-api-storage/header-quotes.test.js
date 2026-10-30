import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseDiagram } from '../../site/js/notations/index.js';
import { parseDsl } from '../../site/js/utils/dataParser.js';

test('quotes inside the title of the header do not turn the diagram into an untitled IDEF0', () => {
  const inner = 'My "quoted" title';
  assert.equal(parseDiagram(`diagram idef0 "${inner}"\nbox A1 "x" {\n}`).title, inner);
  const model = parseDiagram(`diagram uml class "${inner}"\nclass A`);
  assert.equal(model.notation, 'uml-class');
  assert.equal(model.title, inner);
  const dfd = parseDiagram('diagram dfd "T"\nentity E');
  assert.equal(dfd.notation, 'dfd');
  assert.equal(dfd.title, 'T');
  assert.equal(parseDiagram('diagram dfd "Esc \\"x\\""\nentity E').title, 'Esc "x"');
  assert.equal(parseDsl(`diagram idef0 "${inner}"`).title, inner);
  assert.equal(parseDiagram('diagram erd extra "A "b""\nentity E').notation, 'erd');
});
