import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NOTATION_KEYS, TEMPLATES, parseDiagram } from '../../site/js/notations/index.js';
import { ROUND_TRIP, SUPPORTED_NOTATIONS, TEXT_FORMATS, exportText } from '../../site/js/export/text-formats.js';
import { importDiagram } from '../../site/js/utils/import-diagram.js';

const FORMATS = Object.keys(TEXT_FORMATS);

test('the formats have the file extensions .puml and .mmd', () => {
  assert.equal(TEXT_FORMATS.plantuml.extension, 'puml');
  assert.equal(TEXT_FORMATS.mermaid.extension, 'mmd');
});

test('every supported notation exports to both languages from its own template', () => {
  for (const key of SUPPORTED_NOTATIONS) {
    for (const format of FORMATS) {
      const result = exportText(TEMPLATES[key], format);
      assert.equal(result.ok, true, `${key} ${format}`);
      assert.equal(result.notation, key);
      assert.equal(result.extension, TEXT_FORMATS[format].extension);
      assert.ok(result.text.endsWith('\n'));
      assert.ok(format === 'plantuml' ? result.text.startsWith('@startuml') : /^(flowchart|sequenceDiagram|classDiagram|erDiagram|stateDiagram)/.test(result.text), `${key} ${format}`);
    }
  }
});

test('every other notation is refused with the reason "notation", never with a guessed file', () => {
  for (const key of NOTATION_KEYS.filter((item) => !SUPPORTED_NOTATIONS.includes(item))) {
    for (const format of FORMATS) assert.deepEqual(exportText(TEMPLATES[key], format), { ok: false, reason: 'notation', notation: key }, `${key} ${format}`);
  }
});

test('an unknown format, an empty code and a code with errors are refused', () => {
  assert.deepEqual(exportText(TEMPLATES.gost, 'pdf'), { ok: false, reason: 'format' });
  assert.deepEqual(exportText('', 'mermaid'), { ok: false, reason: 'empty' });
  assert.deepEqual(exportText('diagram uml sequence "Empty"', 'plantuml'), { ok: false, reason: 'empty' });
  assert.deepEqual(exportText('diagram nothing "x"', 'plantuml'), { ok: false, reason: 'empty' });
  const broken = `${TEMPLATES['uml-sequence']}\nghost -> nobody : lost`;
  assert.equal(parseDiagram(broken).problems.some((item) => item.severity === 'error'), true);
  assert.deepEqual(exportText(broken, 'mermaid'), { ok: false, reason: 'errors', notation: 'uml-sequence' });
});

test('IDEF1X and IDEF1 are refused: dependent entities and categories have no counterpart in the languages', () => {
  for (const key of ['idef1x', 'idef1']) assert.deepEqual(exportText(TEMPLATES[key], 'mermaid'), { ok: false, reason: 'notation', notation: key });
});

test('the Mermaid text of a flowchart keeps every node and link, and the importer reads it back', () => {
  for (const key of ROUND_TRIP.mermaid.filter((item) => !['uml-sequence', 'uml-state'].includes(item))) {
    const model = parseDiagram(TEMPLATES[key]);
    const result = importDiagram(exportText(TEMPLATES[key], 'mermaid').text);
    assert.equal(result.ok, true, key);
    assert.equal(result.kind, 'flowchart');
    const back = parseDiagram(result.dsl);
    assert.deepEqual(back.problems.filter((item) => item.severity === 'error'), [], key);
    assert.equal(back.vertices.length, model.nodes.length, `${key} nodes`);
    assert.equal(back.edges.length, model.edges.length, `${key} edges`);
    assert.deepEqual(back.vertices.map((vertex) => vertex.label ?? vertex.id).sort(), model.nodes.map((node) => node.label).sort(), `${key} labels`);
  }
});

test('sequence diagrams come back from both languages with the same participants and messages', () => {
  const model = parseDiagram(TEMPLATES['uml-sequence']);
  for (const format of FORMATS) {
    const result = importDiagram(exportText(TEMPLATES['uml-sequence'], format).text);
    assert.equal(result.ok, true, format);
    assert.equal(result.kind, 'sequence');
    const back = parseDiagram(result.dsl);
    assert.deepEqual(back.problems.filter((item) => item.severity === 'error'), [], format);
    assert.deepEqual(back.participants.map((item) => item.label), model.participants.map((item) => item.label), format);
    assert.deepEqual(back.messages.map((item) => [item.kind, item.text]), model.messages.map((item) => [item.kind, item.text]), format);
  }
});

test('state diagrams come back from both languages with the same states and transitions', () => {
  const model = parseDiagram(TEMPLATES['uml-state']);
  for (const format of FORMATS) {
    const result = importDiagram(exportText(TEMPLATES['uml-state'], format).text);
    assert.equal(result.ok, true, format);
    assert.equal(result.kind, 'state');
    const back = parseDiagram(result.dsl);
    assert.deepEqual(back.problems.filter((item) => item.severity === 'error'), [], format);
    const states = (nodes) => nodes.filter((node) => node.kind === 'state').map((node) => node.label).sort();
    assert.deepEqual(states(back.nodes), states(model.nodes), format);
    assert.equal(back.nodes.length, model.nodes.length, format);
    assert.equal(back.edges.length, model.edges.length, format);
  }
});

test('the round trip table lists only exported notations; the importer refuses a class diagram instead of guessing', () => {
  for (const keys of Object.values(ROUND_TRIP)) keys.forEach((key) => assert.ok(SUPPORTED_NOTATIONS.includes(key), key));
  for (const format of FORMATS) {
    assert.equal(ROUND_TRIP[format].includes('uml-class'), false);
    assert.deepEqual(importDiagram(exportText(TEMPLATES['uml-class'], format).text), { ok: false, reason: 'unsupported', name: 'class' });
  }
});
